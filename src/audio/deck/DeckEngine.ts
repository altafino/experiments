import type { Clock } from '../AudioClock'
import type { DeckController } from '../../commands/DJCommand'
import type { DeckState } from '../../domain/DeckState'
import type { AnalysisStatus, Track } from '../../domain/Track'
import type { AnalysisResult } from '../../analysis/types'
import { DeckTransport } from './DeckTransport'

/**
 * Realtime deck: owns the decoded buffer and AudioBufferSourceNode, while
 * transport position is derived from the injected Clock (AudioContext).
 */
export class DeckEngine implements DeckController {
  private readonly deckId: 1 | 2
  private readonly context: BaseAudioContext
  private readonly clock: Clock
  private readonly output: GainNode
  private readonly transport: DeckTransport
  private buffer: AudioBuffer | null = null
  private track: Track | null = null
  private source: AudioBufferSourceNode | null = null
  private sourceGeneration = 0
  private analysisStatus: AnalysisStatus = 'idle'

  constructor(deckId: 1 | 2, context: BaseAudioContext, clock: Clock) {
    this.deckId = deckId
    this.context = context
    this.clock = clock
    this.output = context.createGain()
    this.transport = new DeckTransport()
  }

  connect(destination: AudioNode): void {
    this.output.connect(destination)
  }

  load(buffer: AudioBuffer, track: Track): void {
    this.stopSource()
    this.buffer = buffer
    this.track = track
    this.transport.reset(buffer.duration)
    this.analysisStatus = track.waveform ? 'ready' : 'pending'
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
    if (!this.buffer) {
      return
    }
    if (!this.transport.play(now)) {
      return
    }
    this.startSource(this.transport.getPosition(now))
  }

  pause(): void {
    const now = this.clock.currentTime
    this.transport.pause(now)
    this.stopSource()
  }

  cue(): void {
    this.transport.cue(this.clock.currentTime)
    this.stopSource()
  }

  seek(positionSeconds: number): void {
    const now = this.clock.currentTime
    const next = this.transport.seek(positionSeconds, now)
    if (this.transport.isPlaying()) {
      this.startSource(next)
    }
  }

  getSnapshot(): DeckState {
    const now = this.clock.currentTime
    const track = this.track
    return {
      deckId: this.deckId,
      trackId: track?.id,
      trackTitle: track?.title,
      playing: this.transport.isPlaying(),
      positionSeconds: this.transport.getPosition(now),
      durationSeconds: this.transport.duration(),
      originalBpm: track?.bpm,
      effectiveBpm: track?.bpm,
      tempoPercent: 0,
      masterTempo: false,
      syncEnabled: false,
      masterDeck: false,
      vinylMode: false,
      jogVelocity: 0,
      cuePoint: this.transport.cuePoint(),
      hotCues: [],
      slipEnabled: false,
      quantizeEnabled: false,
      waveformPeaks: track?.waveform?.peaks,
      analysisStatus: this.analysisStatus,
    }
  }

  private startSource(offsetSeconds: number): void {
    if (!this.buffer) {
      return
    }
    this.stopSource()
    const generation = this.sourceGeneration + 1
    this.sourceGeneration = generation
    const source = this.context.createBufferSource()
    source.buffer = this.buffer
    source.connect(this.output)
    source.onended = () => {
      if (generation !== this.sourceGeneration) {
        return
      }
      this.transport.notifyEnded()
      this.source = null
    }
    source.start(this.context.currentTime, offsetSeconds)
    this.source = source
  }

  private stopSource(): void {
    this.sourceGeneration += 1
    const source = this.source
    if (!source) {
      return
    }
    source.onended = null
    try {
      source.stop()
    } catch {
      // Already stopped.
    }
    source.disconnect()
    this.source = null
  }
}
