import { describe, expect, it, vi } from 'vitest'
import { CommandBus } from '../../src/commands/CommandBus'
import type { AudioEngineApi, DeckController } from '../../src/commands/DJCommand'
import { emptyDeckState } from '../../src/domain/DeckState'

function createHarness(playing = false): {
  bus: CommandBus
  engine: AudioEngineApi
  deck: DeckController
} {
  const snapshot = emptyDeckState(1)
  snapshot.playing = playing
  snapshot.durationSeconds = 120

  const deck: DeckController = {
    play: vi.fn(),
    pause: vi.fn(),
    cue: vi.fn(),
    seek: vi.fn(),
    getSnapshot: vi.fn(() => snapshot),
  }

  const engine: AudioEngineApi = {
    ensureStarted: vi.fn(async () => undefined),
    load: vi.fn(async () => undefined),
    getDeck: vi.fn(() => deck),
    tryGetDeck: vi.fn(() => deck),
  }

  return { bus: new CommandBus(engine), engine, deck }
}

describe('CommandBus', () => {
  it('loads a file onto the requested deck', async () => {
    const { bus, engine } = createHarness()
    const file = new File([new Uint8Array([1, 2, 3])], 'track.wav', { type: 'audio/wav' })

    await bus.dispatch({ type: 'DECK_LOAD', deck: 1, file })

    expect(engine.load).toHaveBeenCalledWith(1, file)
  })

  it('toggles pause when the deck is already playing', async () => {
    const { bus, deck } = createHarness(true)

    await bus.dispatch({ type: 'DECK_TOGGLE_PLAY', deck: 1 })

    expect(deck.pause).toHaveBeenCalledOnce()
    expect(deck.play).not.toHaveBeenCalled()
  })

  it('toggles play when the deck is paused', async () => {
    const { bus, deck } = createHarness(false)

    await bus.dispatch({ type: 'DECK_TOGGLE_PLAY', deck: 1 })

    expect(deck.play).toHaveBeenCalledOnce()
    expect(deck.pause).not.toHaveBeenCalled()
  })

  it('forwards cue and seek without the UI supplying a clock', async () => {
    const { bus, deck } = createHarness()

    await bus.dispatch({ type: 'DECK_CUE', deck: 1 })
    await bus.dispatch({ type: 'DECK_SEEK', deck: 1, position: 33.5 })

    expect(deck.cue).toHaveBeenCalledOnce()
    expect(deck.seek).toHaveBeenCalledWith(33.5)
  })
})
