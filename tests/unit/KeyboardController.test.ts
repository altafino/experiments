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
    hotCueRelease: vi.fn(),
    clearHotCue: vi.fn(),
    setSlip: vi.fn(),
    setVinyl: vi.fn(),
    jogTouchStart: vi.fn(),
    jogTouchMove: vi.fn(),
    jogTouchEnd: vi.fn(),
    loopIn: vi.fn(),
    loopOut: vi.fn(),
    reloop: vi.fn(),
    beatLoop: vi.fn(),
    loopHalve: vi.fn(),
    loopDouble: vi.fn(),
    beatJump: vi.fn(),
    getSnapshot: vi.fn(() => snapshot),
  }
}

function mockMixer(): MixerController {
  return {
    setTrim: vi.fn(),
    setEq: vi.fn(),
    setColorFx: vi.fn(),
    setColor: vi.fn(),
    setChannelFader: vi.fn(),
    setCrossfader: vi.fn(),
    setCrossfaderCurve: vi.fn(),
    setMasterGain: vi.fn(),
    setBeatFx: vi.fn(),
    setBeatFxBeats: vi.fn(),
    setBeatFxLevel: vi.fn(),
    setBeatFxEnabled: vi.fn(),
    setChannelCue: vi.fn(),
    setCueMix: vi.fn(),
    setPhonesLevel: vi.fn(),
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
    startRecording: vi.fn(),
    stopRecording: vi.fn(async () => new Blob()),
    isRecording: vi.fn(() => false),
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

  it('sends beat jump for the focused deck', async () => {
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

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyK', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.beatJump).toHaveBeenCalledWith(1)
    })
    focused = 2
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyJ', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck2.beatJump).toHaveBeenCalledWith(-1)
    })
    expect(deck1.beatJump).not.toHaveBeenCalledWith(-1)
  })

  it('toggles slip and releases hot cues for the focused deck', async () => {
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

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyY', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.setSlip).toHaveBeenCalledWith(true)
    })
    target.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyQ', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.hotCueRelease).toHaveBeenCalledWith('A')
    })
    expect(deck2.setSlip).not.toHaveBeenCalled()
  })

  it('toggles vinyl on the focused deck', async () => {
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

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV', bubbles: true }))
    await vi.waitFor(() => {
      expect(deck1.setVinyl).toHaveBeenCalledWith(true)
    })
    expect(deck2.setVinyl).not.toHaveBeenCalled()
  })

  it('cycles color FX on the focused mixer channel', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    let focused: DeckId = 2
    const engine = mockEngine(deck1, deck2)
    const mixer = engine.tryGetMixer()
    const target = attachKeyboard(
      engine,
      () => focused,
      (deck) => {
        focused = deck
      },
    )

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', bubbles: true }))
    await vi.waitFor(() => {
      expect(mixer?.setColorFx).toHaveBeenCalledWith(2, 'noise')
    })
    expect(mixer?.setColorFx).not.toHaveBeenCalledWith(1, expect.anything())
    expect(deck1.play).not.toHaveBeenCalled()
  })

  it('toggles and cycles beat FX on the mixer', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    let focused: DeckId = 1
    const engine = mockEngine(deck1, deck2)
    const mixer = engine.tryGetMixer()
    const target = attachKeyboard(
      engine,
      () => focused,
      (deck) => {
        focused = deck
      },
    )

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyB', bubbles: true }))
    await vi.waitFor(() => {
      expect(mixer?.setBeatFxEnabled).toHaveBeenCalledWith(true)
    })
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyN', bubbles: true }))
    await vi.waitFor(() => {
      expect(mixer?.setBeatFx).toHaveBeenCalledWith('reverb')
    })
    expect(deck1.play).not.toHaveBeenCalled()
  })

  it('toggles channel cue on the focused mixer channel', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    let focused: DeckId = 1
    const engine = mockEngine(deck1, deck2)
    const mixer = engine.tryGetMixer()
    const target = attachKeyboard(
      engine,
      () => focused,
      (deck) => {
        focused = deck
      },
    )

    focused = 2
    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH', bubbles: true }))
    await vi.waitFor(() => {
      expect(mixer?.setChannelCue).toHaveBeenCalledWith(2, true)
    })
    expect(mixer?.setChannelCue).not.toHaveBeenCalledWith(1, expect.anything())
    expect(deck1.play).not.toHaveBeenCalled()
  })

  it('toggles mix recording without a loaded track', async () => {
    const deck1 = mockDeck(1)
    const deck2 = mockDeck(2)
    const engine = mockEngine(deck1, deck2)
    const target = attachKeyboard(
      engine,
      () => 1,
      () => undefined,
    )

    target.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyR', bubbles: true }))
    await vi.waitFor(() => {
      expect(engine.startRecording).toHaveBeenCalledOnce()
    })
    expect(deck1.play).not.toHaveBeenCalled()
  })
})
