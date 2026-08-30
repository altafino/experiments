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
    cueRelease: vi.fn(),
    seek: vi.fn(),
    setTempoPercent: vi.fn(),
    setTempoRange: vi.fn(),
    setPitchBend: vi.fn(),
    setMasterTempo: vi.fn(),
    setQuantize: vi.fn(),
    hotCue: vi.fn(),
    clearHotCue: vi.fn(),
    loopIn: vi.fn(),
    loopOut: vi.fn(),
    reloop: vi.fn(),
    beatLoop: vi.fn(),
    loopHalve: vi.fn(),
    loopDouble: vi.fn(),
    getSnapshot: vi.fn(() => snapshot),
  }
}

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

function mockEngine(deck1: DeckController, deck2: DeckController): AudioEngineApi {
  const mixer = mockMixer()
  return {
    ensureStarted: vi.fn(async () => undefined),
    load: vi.fn(async () => undefined),
    getDeck: vi.fn((id: DeckId) => (id === 1 ? deck1 : deck2)),
    tryGetDeck: vi.fn((id: DeckId) => (id === 1 ? deck1 : deck2)),
    getMixer: vi.fn(() => mixer),
    tryGetMixer: vi.fn(() => mixer),
    setMasterDeck: vi.fn(),
    setSync: vi.fn(),
    ensureMaster: vi.fn(),
    maintainSync: vi.fn(),
  }
}

function attachKeyboard(
  engine: AudioEngineApi,
  getFocus: () => DeckId,
  setFocus: (deck: DeckId) => void,
): EventTarget {
  const bus = new CommandBus(engine)
  const keyboard = new KeyboardController(bus, engine, {
    get: getFocus,
    set: setFocus,
  })
  const target = new EventTarget()
  keyboard.attach(target)
  return target
}

describe('KeyboardController', () => {
  it('sends transport commands to the focused deck', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    let focused: DeckId = 1
    const engine = mockEngine(deck1, deck2)
    const target = attachKeyboard(
      engine,
      () => focused,
      (deck) => {
        focused = deck
      },
    )

    focused = 2
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck2.play).toHaveBeenCalledOnce()
    })
    expect(deck1.play).not.toHaveBeenCalled()
  })

  it('holds pitch bend on the focused deck until keyup', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    let focused: DeckId = 1
    const engine = mockEngine(deck1, deck2)
    const target = attachKeyboard(
      engine,
      () => focused,
      (deck) => {
        focused = deck
      },
    )

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'BracketRight', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.setPitchBend).toHaveBeenCalledWith(1)
    })
    target.dispatchEvent(new KeyboardEvent('keyup', { code: 'BracketRight', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.setPitchBend).toHaveBeenLastCalledWith(0)
    })
    expect(deck2.setPitchBend).not.toHaveBeenCalled()
  })

  it('sends sync and master-deck commands for the focused deck', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    let focused: DeckId = 2
    const engine = mockEngine(deck1, deck2)
    const target = attachKeyboard(
      engine,
      () => focused,
      (deck) => {
        focused = deck
      },
    )

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyS', bubbles: true }))
    await vi.waitFor(() => {
      expect(engine.setSync).toHaveBeenCalledWith(2, true)
    })
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyG', bubbles: true }))
    await vi.waitFor(() => {
      expect(engine.setMasterDeck).toHaveBeenCalledWith(2)
    })
    expect(engine.setSync).not.toHaveBeenCalledWith(1, expect.anything())
    expect(engine.setMasterDeck).not.toHaveBeenCalledWith(1)
  })

  it('sends hot cue, clear, and quantize commands for the focused deck', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    let focused: DeckId = 1
    const engine = mockEngine(deck1, deck2)
    const target = attachKeyboard(
      engine,
      () => focused,
      (deck) => {
        focused = deck
      },
    )

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.hotCue).toHaveBeenCalledWith('A')
    })
    target.dispatchEvent(
      new KeyboardEvent('keydown', { code: 'KeyW', bubbles: true, shiftKey: true }),
    )
    await vi.waitFor(() => {
      expect(deck1.clearHotCue).toHaveBeenCalledWith('B')
    })
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.setQuantize).toHaveBeenCalledWith(true)
    })
    expect(deck2.hotCue).not.toHaveBeenCalled()
  })

  it('sends loop commands for the focused deck', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    let focused: DeckId = 1
    const engine = mockEngine(deck1, deck2)
    const target = attachKeyboard(
      engine,
      () => focused,
      (deck) => {
        focused = deck
      },
    )

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyI', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.loopIn).toHaveBeenCalledOnce()
    })
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyO', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.loopOut).toHaveBeenCalledOnce()
    })
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyL', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.reloop).toHaveBeenCalledOnce()
    })
    expect(deck2.loopIn).not.toHaveBeenCalled()
  })
})
