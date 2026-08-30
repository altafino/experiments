import { TrackAnalyzer } from '../analysis/TrackAnalyzer'
import type { AudioEngineApi, DeckId } from '../commands/DJCommand'
import type { Track } from '../domain/Track'
import { AudioClock } from './AudioClock'
import { DeckEngine } from './deck/DeckEngine'
import { MixerEngine } from './mixer/MixerEngine'
import { fileAnalysisKey } from '../library/fileAnalysisKey'

/**
 * Owns the AudioContext, decks, and mixer. Vue may not create or
 * clock this context; it only sends commands and reads snapshots.
 */
export class AudioEngine implements AudioEngineApi {
  private context: AudioContext | null = null
  private deck1: DeckEngine | null = null
  private deck2: DeckEngine | null = null
  private mixer: MixerEngine | null = null
  private readonly analyzer: TrackAnalyzer
  private readonly analysisEpoch: { 1: number; 2: number } = { 1: 0, 2: 0 }

  constructor(analyzer: TrackAnalyzer = new TrackAnalyzer()) {
    this.analyzer = analyzer
  }

  async ensureStarted(): Promise<void> {
    if (!this.context) {
      const context = new AudioContext()
      const clock = new AudioClock(context)
      const mixer = new MixerEngine(context, clock)
      const deck1 = new DeckEngine(1, context, clock)
      const deck2 = new DeckEngine(2, context, clock)
      deck1.connect(mixer.input(1))
      deck2.connect(mixer.input(2))
      mixer.connect(context.destination)
      this.context = context
      this.mixer = mixer
      this.deck1 = deck1
      this.deck2 = deck2
    }
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
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
}
