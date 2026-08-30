import { TrackAnalyzer } from '../analysis/TrackAnalyzer'
import type { AudioEngineApi, DeckId } from '../commands/DJCommand'
import type { Track } from '../domain/Track'
import { beatFxBpmFromDecks } from '../domain/beatFx'
import { fileAnalysisKey } from '../library/fileAnalysisKey'
import { AudioClock } from './AudioClock'
import { DeckEngine } from './deck/DeckEngine'
import { MixerEngine } from './mixer/MixerEngine'
import { MixRecorder } from './recorder/MixRecorder'
import { SyncEngine } from './sync/SyncEngine'
import { COLOR_PITCH_WORKLET_URL } from './worklets/colorPitchWorklet'
import { STRETCH_WORKLET_URL } from './worklets/stretchWorklet'

/**
 * Owns the AudioContext, decks, and mixer. Vue may not create or
 * clock this context; it only sends commands and reads snapshots.
 */
export class AudioEngine implements AudioEngineApi {
  private context: AudioContext | null = null
  private deck1: DeckEngine | null = null
  private deck2: DeckEngine | null = null
  private mixer: MixerEngine | null = null
  private mixRecorder: MixRecorder | null = null
  private sync: SyncEngine | null = null
  private startPromise: Promise<void> | null = null
  private readonly analyzer: TrackAnalyzer
  private readonly analysisEpoch: { 1: number; 2: number } = { 1: 0, 2: 0 }

  constructor(analyzer: TrackAnalyzer = new TrackAnalyzer()) {
    this.analyzer = analyzer
  }

  async ensureStarted(): Promise<void> {
    if (!this.startPromise) {
      // Concurrent load/play must share one graph; do not construct a second
      // AudioContext while the worklet module is still loading.
      this.startPromise = this.createGraph()
    }
    await this.startPromise
    const context = this.requireContext()
    if (context.state === 'suspended') {
      await context.resume()
    }
  }

  private async createGraph(): Promise<void> {
    const context = new AudioContext()
    const clock = new AudioClock(context)
    const mixer = new MixerEngine(context, clock)
    const deck1 = new DeckEngine(1, context, clock)
    const deck2 = new DeckEngine(2, context, clock)
    deck1.connect(mixer.input(1))
    deck2.connect(mixer.input(2))
    mixer.connect(context.destination)
    const capture = context.createMediaStreamDestination()
    mixer.masterTap.connect(capture)
    this.mixRecorder = new MixRecorder(capture.stream)
    try {
      await addWorkletModule(context, STRETCH_WORKLET_URL)
      deck1.attachStretch()
      deck2.attachStretch()
    } catch {
      // Master tempo falls back to playbackRate if the worklet cannot load.
    }
    try {
      await addWorkletModule(context, COLOR_PITCH_WORKLET_URL)
      mixer.attachColorPitch()
    } catch {
      // Color pitch degrades to dry if the worklet cannot load.
    }
    this.context = context
    this.mixer = mixer
    this.deck1 = deck1
    this.deck2 = deck2
    this.sync = new SyncEngine(deck1, deck2)
  }

  async load(deck: DeckId, file: File): Promise<void> {
    await this.ensureStarted()
    const context = this.requireContext()
    const target = this.getDeck(deck)
    this.analysisEpoch[deck] += 1
    const epoch = this.analysisEpoch[deck]

    const bytes = await file.arrayBuffer()
    const audioBuffer = await context.decodeAudioData(bytes.slice(0))
    const track: Track = {
      id: fileAnalysisKey(file),
      title: file.name,
      duration: audioBuffer.duration,
    }
    target.load(audioBuffer, track)

    const cached = await this.analyzer.readCache(file)
    if (cached) {
      if (this.analysisEpoch[deck] !== epoch) {
        return
      }
      target.applyAnalysis(cached)
      return
    }

    void this.analyzeLoadedTrack(deck, epoch, file, audioBuffer)
  }

  getDeck(deck: DeckId): DeckEngine {
    const instance = this.tryGetDeck(deck)
    if (!instance) {
      throw new Error('Audio engine is not started')
    }
    return instance
  }

  tryGetDeck(deck: DeckId): DeckEngine | undefined {
    switch (deck) {
      case 1:
        return this.deck1 ?? undefined
      case 2:
        return this.deck2 ?? undefined
      default: {
        const neverDeck: never = deck
        return neverDeck
      }
    }
  }

  getMixer(): MixerEngine {
    const mixer = this.tryGetMixer()
    if (!mixer) {
      throw new Error('Audio engine is not started')
    }
    return mixer
  }

  tryGetMixer(): MixerEngine | undefined {
    return this.mixer ?? undefined
  }

  startRecording(): void {
    this.requireRecorder().start()
  }

  async stopRecording(): Promise<Blob> {
    return this.requireRecorder().stop()
  }

  isRecording(): boolean {
    return this.mixRecorder?.recording ?? false
  }

  setMasterDeck(deck: DeckId): void {
    this.requireSync().setMaster(deck)
  }

  setSync(deck: DeckId, enabled: boolean): void {
    this.requireSync().setSync(deck, enabled)
  }

  ensureMaster(deck: DeckId): void {
    this.sync?.ensureMaster(deck)
  }

  maintainSync(): void {
    this.deck1?.applyDueActions()
    this.deck2?.applyDueActions()
    this.sync?.follow()
    this.mixer?.setBeatFxBpm(
      beatFxBpmFromDecks(this.deck1?.getSnapshot(), this.deck2?.getSnapshot()),
    )
  }

  private async analyzeLoadedTrack(
    deck: DeckId,
    epoch: number,
    file: File,
    buffer: AudioBuffer,
  ): Promise<void> {
    try {
      const channels: Float32Array[] = []
      for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
        channels.push(buffer.getChannelData(channel).slice())
      }
      const result = await this.analyzer.analyzeFile(file, {
        sampleRate: buffer.sampleRate,
        duration: buffer.duration,
        channels,
      })
      if (this.analysisEpoch[deck] !== epoch) {
        return
      }
      this.getDeck(deck).applyAnalysis(result)
    } catch {
      if (this.analysisEpoch[deck] !== epoch) {
        return
      }
      this.getDeck(deck).markAnalysisFailed()
    }
  }

  private requireContext(): AudioContext {
    if (!this.context) {
      throw new Error('AudioContext is not available')
    }
    return this.context
  }

  private requireSync(): SyncEngine {
    if (!this.sync) {
      throw new Error('Audio engine is not started')
    }
    return this.sync
  }

  private requireRecorder(): MixRecorder {
    if (!this.mixRecorder) {
      throw new Error('Audio engine is not started')
    }
    return this.mixRecorder
  }
}

const WORKLET_LOAD_MS = 5_000

function addWorkletModule(context: AudioContext, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Audio worklet load timed out'))
    }, WORKLET_LOAD_MS)
    context.audioWorklet.addModule(url).then(
      () => {
        clearTimeout(timer)
        resolve()
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
