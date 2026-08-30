/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'
import { CommandBus } from '../../src/commands/CommandBus'
import type { AudioEngineApi, DeckController, DeckId, MixerController } from '../../src/commands/DJCommand'
import { emptyDeckState } from '../../src/domain/DeckState'
import { emptyMixerState } from '../../src/domain/MixerState'
import { KeyboardController } from '../../src/io/KeyboardController'

function mockDeck(deckId: DeckId): DeckController {
  const snapshot = emptyDeckState(deckId)
  snapshot.durationSeconds = 60
  return {
    play: vi.fn(),
    pause: vi.fn(),
    cue: vi.fn(),
    seek: vi.fn(),
    getSnapshot: vi.fn(() => snapshot),
  }
}

describe('KeyboardController', () => {
  it('sends transport commands to the focused deck', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    let focused: DeckId = 1
    const mixer: MixerController = {
      setTrim: vi.fn(),
      setEq: vi.fn(),
      setChannelFader: vi.fn(),
      setCrossfader: vi.fn(),
      setCrossfaderCurve: vi.fn(),
      setMasterGain: vi.fn(),
      getSnapshot: vi.fn(() => emptyMixerState()),
    }
    const engine: AudioEngineApi = {
      ensureStarted: vi.fn(async () => undefined),
      load: vi.fn(async () => undefined),
      getDeck: vi.fn((id: DeckId) => (id === 1 ? deck1 : deck2)),
      tryGetDeck: vi.fn((id: DeckId) => (id === 1 ? deck1 : deck2)),
      getMixer: vi.fn(() => mixer),
      tryGetMixer: vi.fn(() => mixer),
    }
    const bus = new CommandBus(engine)
    const keyboard = new KeyboardController(bus, engine, {
      get: () => focused,
      set: (deck) => {
        focused = deck
      },
    })
    const target = new EventTarget()
    keyboard.attach(target)

    focused = 2
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck2.play).toHaveBeenCalledOnce()
    })
    expect(deck1.play).not.toHaveBeenCalled()
  })
})
