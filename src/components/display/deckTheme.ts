import type { DeckId } from '../../commands/DJCommand'

export interface DeckTheme {
  /** Upcoming audio. */
  wave: string
  /** Audio already behind the playhead. */
  wavePast: string
  /** Text and badge colour for deck labels. */
  text: string
}

export const DECK_THEMES: Record<DeckId, DeckTheme> = {
  1: { wave: '#4aa7c2', wavePast: '#2b5a69', text: '#7ec9dd' },
  2: { wave: '#e879a6', wavePast: '#7c4159', text: '#f0a2c2' },
}
