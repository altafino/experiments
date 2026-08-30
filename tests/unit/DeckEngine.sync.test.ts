import { describe, expect, it } from 'vitest'
import type { Clock } from '../../src/audio/AudioClock'
import { DeckEngine } from '../../src/audio/deck/DeckEngine'

function stubContext(): BaseAudioContext {
  return {
    currentTime: 0,
    createGain: () => ({
      connect: () => undefined,
      disconnect: () => undefined,
      gain: { value: 1 },
    }),
  } as unknown as BaseAudioContext
}

describe('DeckEngine sync contract', () => {
  it('clears sync when the user sets tempo', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.setSyncEnabled(true)
    deck.applyPhaseMultiplier(0.99)

    deck.setTempoPercent(3)

    const snap = deck.getSnapshot()
    expect(snap.syncEnabled).toBe(false)
    expect(snap.tempoPercent).toBe(3)
  })

  it('keeps sync when tempo is set by the sync engine', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(2, stubContext(), clock)
    deck.setSyncEnabled(true)

    deck.setSyncTempoPercent(-1.56)

    const snap = deck.getSnapshot()
    expect(snap.syncEnabled).toBe(true)
    expect(snap.tempoPercent).toBeCloseTo(-1.56, 5)
  })
})
