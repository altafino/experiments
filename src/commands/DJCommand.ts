import type { DeckState } from '../domain/DeckState'
import type { CrossfaderCurve, EqBand, MixerState } from '../domain/MixerState'

export type DeckId = 1 | 2

export type DJCommand =
  | { type: 'DECK_LOAD'; deck: DeckId; file: File }
  | { type: 'DECK_PLAY'; deck: DeckId }
  | { type: 'DECK_PAUSE'; deck: DeckId }
  | { type: 'DECK_TOGGLE_PLAY'; deck: DeckId }
  | { type: 'DECK_CUE'; deck: DeckId }
  | { type: 'DECK_SEEK'; deck: DeckId; position: number }
  | { type: 'SET_TRIM'; deck: DeckId; value: number }
  | { type: 'SET_EQ'; deck: DeckId; band: EqBand; value: number }
  | { type: 'SET_CHANNEL_FADER'; deck: DeckId; value: number }
  | { type: 'SET_CROSSFADER'; value: number }
  | { type: 'SET_CROSSFADER_CURVE'; curve: CrossfaderCurve }
  | { type: 'SET_MASTER_GAIN'; value: number }

export interface DeckController {
  play(): void
  pause(): void
  cue(): void
  seek(positionSeconds: number): void
  getSnapshot(): DeckState
}

export interface MixerController {
  setTrim(deck: DeckId, value: number): void
  setEq(deck: DeckId, band: EqBand, value: number): void
  setChannelFader(deck: DeckId, value: number): void
  setCrossfader(value: number): void
  setCrossfaderCurve(curve: CrossfaderCurve): void
  setMasterGain(value: number): void
  getSnapshot(): MixerState
}

export interface AudioEngineApi {
  ensureStarted(): Promise<void>
  load(deck: DeckId, file: File): Promise<void>
  getDeck(deck: DeckId): DeckController
  tryGetDeck(deck: DeckId): DeckController | undefined
  getMixer(): MixerController
  tryGetMixer(): MixerController | undefined
}
