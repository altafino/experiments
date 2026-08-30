import { describe, expect, it, vi } from 'vitest'
import { CommandBus } from '../../src/commands/CommandBus'
import type { AudioEngineApi, DeckController, DeckId, MixerController } from '../../src/commands/DJCommand'
import { emptyDeckState } from '../../src/domain/DeckState'
import { emptyMixerState } from '../../src/domain/MixerState'
import { emptyMidiState } from '../../src/domain/midi'
import { fileAnalysisKey } from '../../src/library/fileAnalysisKey'
import { LibraryService } from '../../src/library/LibraryService'
import type { MidiController } from '../../src/midi/MidiService'

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

function mockDeck(deckId: DeckId, playing = false): DeckController {
  const snapshot = emptyDeckState(deckId)
  snapshot.playing = playing
  snapshot.durationSeconds = 120
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
    startRecording: vi.fn(),
    stopRecording: vi.fn(async () => new Blob()),
    isRecording: vi.fn(() => false),
    setMasterDeck: vi.fn(),
    setSync: vi.fn(),
    ensureMaster: vi.fn(),
    maintainSync: vi.fn(),
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
      startRecording: vi.fn(),
      stopRecording: vi.fn(async () => new Blob()),
      isRecording: vi.fn(() => false),
      setMasterDeck: vi.fn(),
      setSync: vi.fn(),
      ensureMaster: vi.fn(),
      maintainSync: vi.fn(),
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
    await bus.dispatch({ type: 'SET_COLOR_FX', deck: 1, fx: 'noise' })
    await bus.dispatch({ type: 'SET_COLOR', deck: 2, value: 0.8 })
    await bus.dispatch({ type: 'SET_CHANNEL_FADER', deck: 1, value: 0.1 })
    await bus.dispatch({ type: 'SET_CROSSFADER', value: 0.8 })
    await bus.dispatch({ type: 'SET_CROSSFADER_CURVE', curve: 'sharp' })
    await bus.dispatch({ type: 'SET_MASTER_GAIN', value: 0.6 })
    await bus.dispatch({ type: 'SET_BEAT_FX', fx: 'reverb' })
    await bus.dispatch({ type: 'SET_BEAT_FX_BEAT', beats: 1 })
    await bus.dispatch({ type: 'SET_BEAT_FX_LEVEL', value: 0.8 })
    await bus.dispatch({ type: 'SET_BEAT_FX_ENABLED', enabled: true })
    await bus.dispatch({ type: 'SET_CHANNEL_CUE', deck: 1, enabled: true })
    await bus.dispatch({ type: 'SET_CUE_MIX', value: 0.25 })
    await bus.dispatch({ type: 'SET_PHONES_LEVEL', value: 0.7 })

    expect(mixer.setTrim).toHaveBeenCalledWith(1, 0.25)
    expect(mixer.setEq).toHaveBeenCalledWith(2, 'low', 0)
    expect(mixer.setColorFx).toHaveBeenCalledWith(1, 'noise')
    expect(mixer.setColor).toHaveBeenCalledWith(2, 0.8)
    expect(mixer.setChannelFader).toHaveBeenCalledWith(1, 0.1)
    expect(mixer.setCrossfader).toHaveBeenCalledWith(0.8)
    expect(mixer.setCrossfaderCurve).toHaveBeenCalledWith('sharp')
    expect(mixer.setMasterGain).toHaveBeenCalledWith(0.6)
    expect(mixer.setBeatFx).toHaveBeenCalledWith('reverb')
    expect(mixer.setBeatFxBeats).toHaveBeenCalledWith(1)
    expect(mixer.setBeatFxLevel).toHaveBeenCalledWith(0.8)
    expect(mixer.setBeatFxEnabled).toHaveBeenCalledWith(true)
    expect(mixer.setChannelCue).toHaveBeenCalledWith(1, true)
    expect(mixer.setCueMix).toHaveBeenCalledWith(0.25)
    expect(mixer.setPhonesLevel).toHaveBeenCalledWith(0.7)
    expect(deck.play).not.toHaveBeenCalled()
  })

  it('applies tempo commands to the deck without touching the mixer', async () => {
    const { bus, deck, mixer } = createHarness()

    await bus.dispatch({ type: 'SET_TEMPO', deck: 1, percent: 6 })
    await bus.dispatch({ type: 'SET_TEMPO_RANGE', deck: 1, range: 16 })
    await bus.dispatch({ type: 'PITCH_BEND_START', deck: 1, direction: 1 })
    await bus.dispatch({ type: 'PITCH_BEND_END', deck: 1 })

    expect(deck.setTempoPercent).toHaveBeenCalledWith(6)
    expect(deck.setTempoRange).toHaveBeenCalledWith(16)
    expect(deck.setPitchBend).toHaveBeenNthCalledWith(1, 1)
    expect(deck.setPitchBend).toHaveBeenNthCalledWith(2, 0)
    expect(mixer.setMasterGain).not.toHaveBeenCalled()
  })

  it('toggles master tempo on the deck', async () => {
    const { bus, deck, mixer } = createHarness()

    await bus.dispatch({ type: 'SET_MASTER_TEMPO', deck: 1, enabled: true })

    expect(deck.setMasterTempo).toHaveBeenCalledWith(true)
    expect(mixer.setMasterGain).not.toHaveBeenCalled()
    expect(deck.play).not.toHaveBeenCalled()
  })

  it('assigns a master when a deck starts playing', async () => {
    const { bus, engine } = createHarness()

    await bus.dispatch({ type: 'DECK_PLAY', deck: 1 })

    expect(engine.ensureMaster).toHaveBeenCalledWith(1)
    expect(engine.maintainSync).toHaveBeenCalled()
  })

  it('does not assign a master when pausing', async () => {
    const { bus, engine } = createHarness(true)

    await bus.dispatch({ type: 'DECK_TOGGLE_PLAY', deck: 1 })

    expect(engine.ensureMaster).not.toHaveBeenCalled()
    expect(engine.maintainSync).toHaveBeenCalled()
  })

  it('routes sync and master-deck commands to the engine, not the deck controller', async () => {
    const { bus, engine, deck } = createHarness()

    await bus.dispatch({ type: 'SET_MASTER_DECK', deck: 1 })
    await bus.dispatch({ type: 'SET_SYNC', deck: 2, enabled: true })

    expect(engine.setMasterDeck).toHaveBeenCalledWith(1)
    expect(engine.setSync).toHaveBeenCalledWith(2, true)
    expect(deck.setTempoPercent).not.toHaveBeenCalled()
  })

  it('routes hot cue and quantize commands to the deck', async () => {
    const { bus, deck } = createHarness()

    await bus.dispatch({ type: 'SET_QUANTIZE', deck: 1, enabled: true })
    await bus.dispatch({ type: 'HOT_CUE', deck: 1, id: 'A' })
    await bus.dispatch({ type: 'CLEAR_HOT_CUE', deck: 1, id: 'B' })
    await bus.dispatch({ type: 'DECK_CUE_RELEASE', deck: 1 })

    expect(deck.setQuantize).toHaveBeenCalledWith(true)
    expect(deck.hotCue).toHaveBeenCalledWith('A')
    expect(deck.clearHotCue).toHaveBeenCalledWith('B')
    expect(deck.cueRelease).toHaveBeenCalledOnce()
  })

  it('locks in playback when play is pressed during cue preview', async () => {
    const { bus, deck, engine } = createHarness(true)
    deck.getSnapshot().cuePreviewing = true

    await bus.dispatch({ type: 'DECK_TOGGLE_PLAY', deck: 1 })

    expect(deck.play).toHaveBeenCalledOnce()
    expect(deck.pause).not.toHaveBeenCalled()
    expect(engine.ensureMaster).toHaveBeenCalledWith(1)
  })

  it('routes loop commands to the deck', async () => {
    const { bus, deck } = createHarness()

    await bus.dispatch({ type: 'LOOP_IN', deck: 1 })
    await bus.dispatch({ type: 'LOOP_OUT', deck: 1 })
    await bus.dispatch({ type: 'BEAT_LOOP', deck: 1, beats: 4 })
    await bus.dispatch({ type: 'LOOP_HALVE', deck: 1 })
    await bus.dispatch({ type: 'LOOP_DOUBLE', deck: 1 })
    await bus.dispatch({ type: 'LOOP_RELOOP', deck: 1 })

    expect(deck.loopIn).toHaveBeenCalledOnce()
    expect(deck.loopOut).toHaveBeenCalledOnce()
    expect(deck.beatLoop).toHaveBeenCalledWith(4)
    expect(deck.loopHalve).toHaveBeenCalledOnce()
    expect(deck.loopDouble).toHaveBeenCalledOnce()
    expect(deck.reloop).toHaveBeenCalledOnce()
  })

  it('routes beat jump to the deck', async () => {
    const { bus, deck } = createHarness()

    await bus.dispatch({ type: 'BEAT_JUMP', deck: 1, beats: 4 })

    expect(deck.beatJump).toHaveBeenCalledWith(4)
  })

  it('routes slip and hot-cue release to the deck', async () => {
    const { bus, deck } = createHarness()

    await bus.dispatch({ type: 'SET_SLIP', deck: 1, enabled: true })
    await bus.dispatch({ type: 'HOT_CUE_RELEASE', deck: 1, id: 'A' })

    expect(deck.setSlip).toHaveBeenCalledWith(true)
    expect(deck.hotCueRelease).toHaveBeenCalledWith('A')
  })

  it('routes vinyl and jog touch to the deck', async () => {
    const { bus, deck } = createHarness()

    await bus.dispatch({ type: 'SET_VINYL', deck: 1, enabled: true })
    await bus.dispatch({ type: 'JOG_TOUCH_START', deck: 1 })
    await bus.dispatch({ type: 'JOG_TOUCH_MOVE', deck: 1, deltaRadians: 0.5 })
    await bus.dispatch({ type: 'JOG_TOUCH_END', deck: 1 })

    expect(deck.setVinyl).toHaveBeenCalledWith(true)
    expect(deck.jogTouchStart).toHaveBeenCalledOnce()
    expect(deck.jogTouchMove).toHaveBeenCalledWith(0.5)
    expect(deck.jogTouchEnd).toHaveBeenCalledOnce()
  })

  it('imports library files and loads a playable row onto a deck', async () => {
    const { bus, engine } = createHarness()
    const file = new File([new Uint8Array([1, 2, 3])], 'Autechre - Fold.wav', { type: 'audio/wav' })

    await bus.dispatch({ type: 'LIBRARY_IMPORT', files: [file] })
    await bus.dispatch({ type: 'LIBRARY_LOAD', deck: 1, trackId: fileAnalysisKey(file) })

    expect(engine.load).toHaveBeenCalledWith(1, file)
  })

  it('starts and stops mix recording on the engine', async () => {
    const { bus, engine } = createHarness()

    await bus.dispatch({ type: 'RECORD_START' })
    await bus.dispatch({ type: 'RECORD_STOP' })

    expect(engine.startRecording).toHaveBeenCalledOnce()
    expect(engine.stopRecording).toHaveBeenCalledOnce()
    expect(engine.getDeck).not.toHaveBeenCalled()
  })

  it('routes MIDI session commands to the MIDI controller, not the decks', async () => {
    const { engine, deck } = createHarness()
    const midi: MidiController = {
      connect: vi.fn(async () => undefined),
      disconnect: vi.fn(),
      startLearn: vi.fn(),
      unmap: vi.fn(),
      resetMap: vi.fn(async () => undefined),
      getSnapshot: vi.fn(() => emptyMidiState()),
    }
    const bus = new CommandBus(engine, new LibraryService(), midi)

    await bus.dispatch({ type: 'MIDI_CONNECT' })
    await bus.dispatch({ type: 'MIDI_LEARN', actionId: 'play:1' })
    await bus.dispatch({ type: 'MIDI_UNMAP', actionId: 'play:1' })
    await bus.dispatch({ type: 'MIDI_RESET_MAP' })
    await bus.dispatch({ type: 'MIDI_DISCONNECT' })

    expect(midi.connect).toHaveBeenCalledOnce()
    expect(midi.startLearn).toHaveBeenCalledWith('play:1')
    expect(midi.unmap).toHaveBeenCalledWith('play:1')
    expect(midi.resetMap).toHaveBeenCalledOnce()
    expect(midi.disconnect).toHaveBeenCalledOnce()
    expect(deck.play).not.toHaveBeenCalled()
  })
})
