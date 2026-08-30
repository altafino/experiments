import { describe, expect, it, vi } from 'vitest'
import { CommandBus } from '../../src/commands/CommandBus'
import type { AudioEngineApi, DeckController, DeckId, MixerController } from '../../src/commands/DJCommand'
import { emptyDeckState } from '../../src/domain/DeckState'
import { emptyMixerState } from '../../src/domain/MixerState'

function mockMixer(): MixerController {
  return {
    setTrim: vi.fn(),
    setEq: vi.fn(),
    setChannelFader: vi.fn(),
    setCrossfader: vi.fn(),
    setCrossfaderCurve: vi.fn(),
    setMasterGain: vi.fn(),
    getSnapshot: vi.fn(() => emptyMixerState()),
  }
}

function mockDeck(deckId: DeckId, playing = false): DeckController {
  const snapshot = emptyDeckState(deckId)
  snapshot.playing = playing
  snapshot.durationSeconds = 120
  return {
    play: vi.fn(),
    pause: vi.fn(),
    cue: vi.fn(),
    seek: vi.fn(),
    getSnapshot: vi.fn(() => snapshot),
  }
}

function createHarness(playing = false): {
  bus: CommandBus
  engine: AudioEngineApi
  deck: DeckController
  mixer: MixerController
} {
  const deck = mockDeck(1, playing)
  const mixer = mockMixer()
  const engine: AudioEngineApi = {
    ensureStarted: vi.fn(async () => undefined),
    load: vi.fn(async () => undefined),
    getDeck: vi.fn(() => deck),
    tryGetDeck: vi.fn(() => deck),
    getMixer: vi.fn(() => mixer),
    tryGetMixer: vi.fn(() => mixer),
  }

  return { bus: new CommandBus(engine), engine, deck, mixer }
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

  it('routes play to deck 2 without touching deck 1', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    const mixer = mockMixer()
    const engine: AudioEngineApi = {
      ensureStarted: vi.fn(async () => undefined),
      load: vi.fn(async () => undefined),
      getDeck: vi.fn((id: DeckId) => (id === 1 ? deck1 : deck2)),
      tryGetDeck: vi.fn((id: DeckId) => (id === 1 ? deck1 : deck2)),
      getMixer: vi.fn(() => mixer),
      tryGetMixer: vi.fn(() => mixer),
    }
    const bus = new CommandBus(engine)

    await bus.dispatch({ type: 'DECK_PLAY', deck: 2 })

    expect(engine.getDeck).toHaveBeenCalledWith(2)
    expect(deck2.play).toHaveBeenCalledOnce()
    expect(deck1.play).not.toHaveBeenCalled()
  })

  it('applies mixer commands to the mixer, not the decks', async () => {
    const { bus, mixer, deck } = createHarness()

    await bus.dispatch({ type: 'SET_TRIM', deck: 1, value: 0.25 })
    await bus.dispatch({ type: 'SET_EQ', deck: 2, band: 'low', value: 0 })
    await bus.dispatch({ type: 'SET_CHANNEL_FADER', deck: 1, value: 0.1 })
    await bus.dispatch({ type: 'SET_CROSSFADER', value: 0.8 })
    await bus.dispatch({ type: 'SET_CROSSFADER_CURVE', curve: 'sharp' })
    await bus.dispatch({ type: 'SET_MASTER_GAIN', value: 0.6 })

    expect(mixer.setTrim).toHaveBeenCalledWith(1, 0.25)
    expect(mixer.setEq).toHaveBeenCalledWith(2, 'low', 0)
    expect(mixer.setChannelFader).toHaveBeenCalledWith(1, 0.1)
    expect(mixer.setCrossfader).toHaveBeenCalledWith(0.8)
    expect(mixer.setCrossfaderCurve).toHaveBeenCalledWith('sharp')
    expect(mixer.setMasterGain).toHaveBeenCalledWith(0.6)
    expect(deck.play).not.toHaveBeenCalled()
  })
})
