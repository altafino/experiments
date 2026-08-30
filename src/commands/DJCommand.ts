import type { DeckState } from '../domain/DeckState'

export type DeckId = 1 | 2

export type DJCommand =
  | { type: 'DECK_LOAD'; deck: DeckId; file: File }
  | { type: 'DECK_PLAY'; deck: DeckId }
  | { type: 'DECK_PAUSE'; deck: DeckId }
  | { type: 'DECK_TOGGLE_PLAY'; deck: DeckId }
  | { type: 'DECK_CUE'; deck: DeckId }
  | { type: 'DECK_SEEK'; deck: DeckId; position: number }

export interface DeckController {
  play(): void
  pause(): void
  cue(): void
  seek(positionSeconds: number): void
  getSnapshot(): DeckState
}

export interface AudioEngineApi {
  ensureStarted(): Promise<void>
  load(deck: DeckId, file: File): Promise<void>
  getDeck(deck: DeckId): DeckController
  tryGetDeck(deck: DeckId): DeckController | undefined
}
