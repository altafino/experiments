import type { AnalysisResult } from '../../analysis/types'
import type { DeckController } from '../../commands/DJCommand'
import type { DeckState, HotCueId } from '../../domain/DeckState'
import { beatLoopEnd, minLoopSeconds, type BeatLoopLength } from '../../domain/loop'
import {
  isAtCue,
  nearestBeatSeconds,
  secondsUntilNextBeat,
} from '../../domain/quantize'
import { effectiveBpm, type PitchBend, type TempoRange } from '../../domain/tempo'
import type { AnalysisStatus, Track } from '../../domain/Track'
import type { Clock } from '../AudioClock'
import { rampParam } from '../mixer/rampParam'
import { STRETCH_PROCESSOR_NAME, type StretchFromWorklet, type StretchToWorklet } from '../worklets/stretchMessages'
import { CueEngine } from './CueEngine'
import { DeckTransport } from './DeckTransport'
import { LoopEngine } from './LoopEngine'
import { TempoEngine } from './TempoEngine'

/**
 * Realtime deck: owns the decoded buffer and output node. Transport position
 * is derived from the injected Clock. Master-tempo DSP runs in AudioWorklet.
 */
export class DeckEngine implements DeckController {
  readonly deckId: 1 | 2
  private readonly context: BaseAudioContext
  private readonly clock: Clock
  private readonly output: GainNode
  private readonly transport: DeckTransport
  private readonly tempo: TempoEngine
  private readonly cues: CueEngine
  private readonly loops: LoopEngine
  private buffer: AudioBuffer | null = null
  private track: Track | null = null
  private source: AudioBufferSourceNode | null = null
  private stretchNode: AudioWorkletNode | null = null
  private sourceGeneration = 0
  private stretchPlayId = 0
  private stretchActive = false
  private analysisStatus: AnalysisStatus = 'idle'
  private masterDeck = false
  private syncEnabled = false
  private phaseMul = 1

  constructor(deckId: 1 | 2, context: BaseAudioContext, clock: Clock) {
    this.deckId = deckId
    this.context = context
    this.clock = clock
    this.output = context.createGain()
    this.transport = new DeckTransport()
    this.tempo = new TempoEngine()
    this.cues = new CueEngine()
    this.loops = new LoopEngine()
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination)
  }

  attachStretch(): void {
    if (this.stretchNode || typeof AudioWorkletNode === 'undefined') {
      return
    }
    try {
      const node = new AudioWorkletNode(this.context, STRETCH_PROCESSOR_NAME, {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      })
      node.connect(this.output)
      node.port.addEventListener('message', (event: MessageEvent<StretchFromWorklet>) => {
        this.onStretchMessage(event.data)
      })
      node.port.start()
      this.stretchNode = node
      this.sendBufferToStretch()
    } catch {
      this.stretchNode = null
    }
  }

  load(buffer: AudioBuffer, track: Track): void {
    this.stopSource()
    this.buffer = buffer
    this.track = track
    this.cues.reset()
    this.loops.reset()
    this.transport.reset(buffer.duration)
    this.transport.setPlaybackRate(this.tempo.playbackRate(), this.clock.currentTime)
    this.analysisStatus = track.waveform ? 'ready' : 'pending'
    this.sendBufferToStretch()
  }

  applyAnalysis(result: AnalysisResult): void {
    if (!this.track) {
      return
    }
    this.track = {
      ...this.track,
      bpm: result.bpm,
      loudness: result.loudness,
      waveform: result.waveform,
      beatGrid: result.beatGrid,
    }
    this.analysisStatus = 'ready'
  }

  markAnalysisFailed(): void {
    this.analysisStatus = 'failed'
  }

  play(): void {
    const now = this.clock.currentTime
    if (this.cues.isPreviewing() && this.transport.isPlaying()) {
      this.cues.confirmPreview()
      return
    }
    this.cues.clearPending()
    if (!this.buffer) {
      return
    }
    this.syncTransportLoop()
    const loop = this.loops.activeRegion()
    if (loop) {
      const position = this.transport.getPosition(now)
      if (position < loop.startSeconds || position >= loop.endSeconds) {
        this.transport.seek(loop.startSeconds, now)
      }
    }
    if (!this.transport.play(now)) {
      return
    }
    this.startSource(this.transport.getPosition(now))
  }

  pause(): void {
    const now = this.clock.currentTime
    this.cues.confirmPreview()
    this.cues.clearPending()
    this.transport.pause(now)
    this.stopSource()
  }

  cue(): void {
    this.cuePress()
  }

  cuePress(): void {
    if (!this.buffer) {
      return
    }
    this.cues.clearPending()
    const now = this.clock.currentTime
    if (this.transport.isPlaying()) {
      if (this.cues.isPreviewing()) {
        return
      }
      this.transport.cue(now)
      this.stopSource()
      return
    }
    const position = this.transport.getPosition(now)
    if (isAtCue(position, this.transport.cuePoint())) {
      this.cues.beginPreview()
      this.play()
      return
    }
    this.transport.setCuePoint(this.quantizeSetPosition(position))
  }

  cueRelease(): void {
    if (!this.cues.endPreview()) {
      return
    }
    const now = this.clock.currentTime
    this.transport.pause(now)
    this.transport.seek(this.transport.cuePoint(), now)
    this.stopSource()
  }

  seek(positionSeconds: number): void {
    const now = this.clock.currentTime
    this.cues.confirmPreview()
    this.cues.clearPending()
    const next = this.transport.seek(positionSeconds, now)
    if (this.transport.isPlaying()) {
      this.startSource(next)
    }
  }

  setQuantize(enabled: boolean): void {
    this.cues.setQuantize(enabled)
  }

  hotCue(id: HotCueId): void {
    if (!this.buffer) {
      return
    }
    const existing = this.cues.hotCue(id)
    if (existing === undefined) {
      this.cues.setHotCue(id, this.quantizeSetPosition(this.transport.getPosition(this.clock.currentTime)))
      return
    }
    this.jumpTo(existing, true)
  }

  clearHotCue(id: HotCueId): void {
    this.cues.clearHotCue(id)
  }

  loopIn(): void {
    if (!this.buffer) {
      return
    }
    const position = this.quantizeSetPosition(this.transport.getPosition(this.clock.currentTime))
    this.loops.setIn(position, this.minLoopLength())
    this.applyLoopToGraph()
  }

  loopOut(): void {
    if (!this.buffer) {
      return
    }
    const position = this.quantizeSetPosition(this.transport.getPosition(this.clock.currentTime))
    if (!this.loops.setOut(position, this.minLoopLength())) {
      return
    }
    this.applyLoopToGraph()
  }

  reloop(): void {
    if (!this.buffer) {
      return
    }
    const action = this.loops.toggle()
    switch (action) {
      case 'none':
        return
      case 'engage':
      case 'exit':
        this.applyLoopToGraph()
        if (action === 'engage' && !this.transport.isPlaying()) {
          this.play()
        }
        return
      default: {
        const neverAction: never = action
        void neverAction
      }
    }
  }

  beatLoop(beats: BeatLoopLength): void {
    if (!this.buffer) {
      return
    }
    const bpm = this.track?.bpm ?? this.track?.beatGrid?.bpm
    if (bpm === undefined) {
      return
    }
    const start = this.quantizeSetPosition(this.transport.getPosition(this.clock.currentTime))
    const end = beatLoopEnd(start, beats, bpm, this.transport.duration())
    if (!this.loops.setBeatLoop(start, end, beats, this.minLoopLength())) {
      return
    }
    this.applyLoopToGraph()
    if (!this.transport.isPlaying()) {
      this.play()
    }
  }

  loopHalve(): void {
    if (!this.loops.halve(this.minLoopLength())) {
      return
    }
    this.applyLoopToGraph()
  }

  loopDouble(): void {
    if (!this.loops.double(this.transport.duration())) {
      return
    }
    this.applyLoopToGraph()
  }

  applyDueActions(): void {
    const position = this.cues.takeDueJump(this.clock.currentTime)
    if (position === undefined) {
      return
    }
    this.applyJump(position)
  }

  setTempoPercent(percent: number): void {
    this.syncEnabled = false
    this.phaseMul = 1
    this.tempo.setPercent(percent)
    this.applyTempo()
  }

  setTempoRange(range: TempoRange): void {
    if (this.tempo.tempoRange() === range) {
      return
    }
    this.tempo.setRange(range)
    this.applyTempo()
  }

  setPitchBend(direction: PitchBend): void {
    this.tempo.setBend(direction)
    this.applyTempo()
  }

  setMasterTempo(enabled: boolean): void {
    const wasOn = this.tempo.masterTempo()
    this.tempo.setMasterTempo(enabled)
    if (wasOn === enabled) {
      return
    }
    if (this.transport.isPlaying()) {
      this.startSource(this.transport.getPosition(this.clock.currentTime))
    }
  }

  setMasterDeck(enabled: boolean): void {
    this.masterDeck = enabled
    if (enabled) {
      this.syncEnabled = false
      this.phaseMul = 1
      this.applyTempo()
    }
  }

  setSyncEnabled(enabled: boolean): void {
    this.syncEnabled = enabled
    if (!enabled) {
      this.phaseMul = 1
      this.applyTempo()
    }
  }

  setSyncTempoPercent(percent: number): void {
    if (Math.abs(this.tempo.tempoPercent() - percent) < 0.005) {
      return
    }
    this.tempo.setPercent(percent)
    this.applyTempo()
  }

  applyPhaseMultiplier(multiplier: number): void {
    const next = multiplier > 0 ? multiplier : 1
    if (Math.abs(this.phaseMul - next) < 0.0005) {
      return
    }
    this.phaseMul = next
    this.applyTempo()
  }

  originalBpm(): number | undefined {
    return this.track?.bpm
  }

  firstBeatSeconds(): number | undefined {
    return this.track?.beatGrid?.firstBeatSeconds
  }

  tempoRange(): TempoRange {
    return this.tempo.tempoRange()
  }

  getSnapshot(): DeckState {
    const now = this.clock.currentTime
    const track = this.track
    const rate = this.tempo.playbackRate() * this.phaseMul
    return {
      deckId: this.deckId,
      trackId: track?.id,
      trackTitle: track?.title,
      playing: this.transport.isPlaying(),
      positionSeconds: this.transport.getPosition(now),
      durationSeconds: this.transport.duration(),
      originalBpm: track?.bpm,
      effectiveBpm: effectiveBpm(track?.bpm, rate),
      tempoPercent: this.tempo.tempoPercent(),
      tempoRange: this.tempo.tempoRange(),
      pitchBend: this.tempo.pitchBend(),
      masterTempo: this.tempo.masterTempo(),
      syncEnabled: this.syncEnabled,
      masterDeck: this.masterDeck,
      vinylMode: false,
      jogVelocity: 0,
      cuePoint: this.transport.cuePoint(),
      hotCues: this.cues.list(),
      cuePreviewing: this.cues.isPreviewing(),
      loopInSeconds: this.loops.pendingInPoint(),
      activeLoop: this.loops.snapshot(),
      slipEnabled: false,
      quantizeEnabled: this.cues.quantizeEnabled(),
      waveformPeaks: track?.waveform?.peaks,
      analysisStatus: this.analysisStatus,
    }
  }

  private quantizeSetPosition(positionSeconds: number): number {
    if (!this.cues.quantizeEnabled()) {
      return positionSeconds
    }
    const grid = this.track?.beatGrid
    const bpm = this.track?.bpm ?? grid?.bpm
    if (!grid || bpm === undefined) {
      return positionSeconds
    }
    return nearestBeatSeconds(
      positionSeconds,
      grid.firstBeatSeconds,
      bpm,
      this.transport.duration(),
    )
  }

  private jumpTo(positionSeconds: number, quantizeTrigger: boolean): void {
    const now = this.clock.currentTime
    this.cues.confirmPreview()
    if (quantizeTrigger && this.cues.quantizeEnabled() && this.transport.isPlaying()) {
      const grid = this.track?.beatGrid
      const bpm = this.track?.bpm ?? grid?.bpm
      if (grid && bpm !== undefined) {
        const position = this.transport.getPosition(now)
        const wait = secondsUntilNextBeat(
          position,
          grid.firstBeatSeconds,
          bpm,
          this.transport.duration(),
        )
        const delay = wait / this.transport.rate()
        if (delay > 0.008) {
          this.cues.scheduleJump(now + delay, positionSeconds)
          return
        }
      }
    }
    this.applyJump(positionSeconds)
  }

  private applyJump(positionSeconds: number): void {
    const now = this.clock.currentTime
    this.cues.clearPending()
    this.cues.confirmPreview()
    this.transport.seek(positionSeconds, now)
    if (!this.transport.play(now)) {
      this.stopSource()
      return
    }
    this.startSource(positionSeconds)
  }

  private minLoopLength(): number {
    return minLoopSeconds(this.track?.bpm ?? this.track?.beatGrid?.bpm)
  }

  private syncTransportLoop(): void {
    this.transport.setLoop(this.loops.activeRegion(), this.clock.currentTime)
  }

  private applyLoopToGraph(): void {
    this.syncTransportLoop()
    this.sendLoopToStretch()
    if (this.transport.isPlaying()) {
      this.startSource(this.transport.getPosition(this.clock.currentTime))
    }
  }

  private sendLoopToStretch(): void {
    const node = this.stretchNode
    const buffer = this.buffer
    if (!node || !buffer) {
      return
    }
    const region = this.loops.activeRegion()
    if (!region) {
      const clear: StretchToWorklet = { type: 'clearLoop' }
      node.port.postMessage(clear)
      return
    }
    const setLoop: StretchToWorklet = {
      type: 'setLoop',
      startSamples: region.startSeconds * buffer.sampleRate,
      endSamples: region.endSeconds * buffer.sampleRate,
    }
    node.port.postMessage(setLoop)
  }

  private applyTempo(): void {
    const now = this.clock.currentTime
    const rate = this.tempo.playbackRate() * this.phaseMul
    this.transport.setPlaybackRate(rate, now)
    if (this.source) {
      rampParam(this.source.playbackRate, rate, this.context.currentTime)
    }
    const stretchRate = this.stretchNode?.parameters.get('rate')
    if (stretchRate) {
      rampParam(stretchRate, rate, this.context.currentTime)
    }
  }

  private startSource(offsetSeconds: number): void {
    if (!this.buffer) {
      return
    }
    if (this.tempo.masterTempo() && this.stretchNode) {
      this.startStretch(offsetSeconds)
      return
    }
    this.startBufferSource(offsetSeconds)
  }

  private startBufferSource(offsetSeconds: number): void {
    this.stopSource()
    if (!this.buffer) {
      return
    }
    const generation = this.sourceGeneration + 1
    this.sourceGeneration = generation
    const source = this.context.createBufferSource()
    source.buffer = this.buffer
    source.playbackRate.value = this.transport.rate()
    const loop = this.loops.activeRegion()
    let offset = offsetSeconds
    if (loop) {
      source.loop = true
      source.loopStart = loop.startSeconds
      source.loopEnd = loop.endSeconds
      if (offset < loop.startSeconds || offset >= loop.endSeconds) {
        offset = loop.startSeconds
      }
    }
    source.connect(this.output)
    source.onended = () => {
      if (generation !== this.sourceGeneration) {
        return
      }
      this.transport.notifyEnded()
      this.source = null
    }
    source.start(this.context.currentTime, offset)
    this.source = source
  }

  private startStretch(offsetSeconds: number): void {
    const node = this.stretchNode
    const buffer = this.buffer
    if (!node || !buffer) {
      this.startBufferSource(offsetSeconds)
      return
    }
    this.stopSource()
    this.stretchPlayId += 1
    const playId = this.stretchPlayId
    this.stretchActive = true
    const rateParam = node.parameters.get('rate')
    if (rateParam) {
      rateParam.setValueAtTime(this.transport.rate(), this.context.currentTime)
    }
    const start: Extract<StretchToWorklet, { type: 'start' }> = {
      type: 'start',
      offsetSamples: offsetSeconds * buffer.sampleRate,
      playId,
    }
    const loop = this.loops.activeRegion()
    if (loop) {
      start.loopStartSamples = loop.startSeconds * buffer.sampleRate
      start.loopEndSamples = loop.endSeconds * buffer.sampleRate
    }
    node.port.postMessage(start)
  }

  private stopSource(): void {
    this.sourceGeneration += 1
    this.stretchPlayId += 1
    this.stretchActive = false
    const source = this.source
    if (source) {
      source.onended = null
      try {
        source.stop()
      } catch {
        // Already stopped.
      }
      source.disconnect()
      this.source = null
    }
    const stop: StretchToWorklet = { type: 'stop' }
    this.stretchNode?.port.postMessage(stop)
  }

  private sendBufferToStretch(): void {
    const node = this.stretchNode
    const buffer = this.buffer
    if (!node || !buffer) {
      return
    }
    const channels: Float32Array[] = []
    const transfers: Transferable[] = []
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const copy = buffer.getChannelData(channel).slice()
      channels.push(copy)
      transfers.push(copy.buffer)
    }
    const load: StretchToWorklet = { type: 'load', channels }
    node.port.postMessage(load, transfers)
  }

  private onStretchMessage(message: StretchFromWorklet): void {
    if (message.type !== 'ended') {
      return
    }
    if (!this.stretchActive || message.playId !== this.stretchPlayId) {
      return
    }
    this.stretchActive = false
    this.transport.notifyEnded()
  }
}
