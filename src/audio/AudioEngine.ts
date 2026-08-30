import type { AudioEngineApi, DeckId } from '../commands/DJCommand'
import type { Track } from '../domain/Track'
import { AudioClock } from './AudioClock'
import { DeckEngine } from './deck/DeckEngine'
import { extractPeaks } from './waveform/extractPeaks'

/**
 * Owns the AudioContext and deck instances. Vue may not create or
 * clock this context; it only sends commands and reads snapshots.
 */
export class AudioEngine implements AudioEngineApi {
  private context: AudioContext | null = null
  private deck1: DeckEngine | null = null

  async ensureStarted(): Promise<void> {
    if (!this.context) {
      const context = new AudioContext()
      const clock = new AudioClock(context)
      const deck1 = new DeckEngine(1, context, clock)
      deck1.connect(context.destination)
      this.context = context
      this.deck1 = deck1
    }
    if (this.context.state === 'suspended') {
      await this.context.resume()
    }
  }

  async load(deck: DeckId, file: File): Promise<void> {
    await this.ensureStarted()
    const context = this.requireContext()
    const target = this.getDeck(deck)
    const bytes = await file.arrayBuffer()
    const audioBuffer = await context.decodeAudioData(bytes.slice(0))
    const peaks = extractPeaks(audioBuffer)
    const track: Track = {
      id: crypto.randomUUID(),
      title: file.name,
      duration: audioBuffer.duration,
      waveform: {
        peaks,
        bucketCount: peaks.length,
      },
    }
    target.load(audioBuffer, track)
  }

  getDeck(deck: DeckId): DeckEngine {
    const instance = this.tryGetDeck(deck)
    if (!instance) {
      throw new Error(deck === 1 ? 'Audio engine is not started' : 'Deck 2 is not implemented yet')
    }
    return instance
  }

  tryGetDeck(deck: DeckId): DeckEngine | undefined {
    if (deck !== 1) {
      return undefined
    }
    return this.deck1 ?? undefined
  }

  private requireContext(): AudioContext {
    if (!this.context) {
      throw new Error('AudioContext is not available')
    }
    return this.context
  }
}
