import { describe, expect, it, vi } from 'vitest'
import { MIDI_JOG_RADIANS_PER_TICK } from '../../src/domain/midi'
import { genericMidiBindings } from '../../src/midi/mappings/generic'
import { MidiMapper } from '../../src/midi/MidiMapper'
import { midiContext } from './midiContext'

describe('MidiMapper', () => {
  it('maps generic channel-1 play and fader without touching deck 2', () => {
    const mapper = new MidiMapper(genericMidiBindings())
    const context = midiContext()

    expect(mapper.map({ kind: 'note', channel: 1, number: 60, value: 127, pressed: true }, context)).toEqual([
      { type: 'DECK_TOGGLE_PLAY', deck: 1 },
    ])
    expect(mapper.map({ kind: 'note', channel: 2, number: 60, value: 127, pressed: true }, context)).toEqual([
      { type: 'DECK_TOGGLE_PLAY', deck: 2 },
    ])
    expect(mapper.map({ kind: 'cc', channel: 1, number: 7, value: 0, pressed: false }, context)).toEqual([
      { type: 'SET_CHANNEL_FADER', deck: 1, value: 0 },
    ])
    expect(mapper.map({ kind: 'cc', channel: 16, number: 10, value: 127, pressed: true }, context)).toEqual([
      { type: 'SET_CROSSFADER', value: 1 },
    ])
    expect(mapper.map({ kind: 'note', channel: 1, number: 1, value: 127, pressed: true }, context)).toEqual([])
  })

  it('emits cue press/release and relative jog ticks', () => {
    const mapper = new MidiMapper(genericMidiBindings())
    const context = midiContext()

    expect(mapper.map({ kind: 'note', channel: 1, number: 62, value: 127, pressed: true }, context)).toEqual([
      { type: 'DECK_CUE', deck: 1 },
    ])
    expect(mapper.map({ kind: 'note', channel: 1, number: 62, value: 0, pressed: false }, context)).toEqual([
      { type: 'DECK_CUE_RELEASE', deck: 1 },
    ])
    expect(mapper.map({ kind: 'cc', channel: 1, number: 14, value: 65, pressed: true }, context)).toEqual([
      { type: 'JOG_TOUCH_MOVE', deck: 1, deltaRadians: MIDI_JOG_RADIANS_PER_TICK },
    ])
    expect(mapper.map({ kind: 'cc', channel: 1, number: 14, value: 64, pressed: true }, context)).toEqual([])
  })

  it('maps generic beat-jump notes', () => {
    const mapper = new MidiMapper(genericMidiBindings())
    expect(
      mapper.map({ kind: 'note', channel: 1, number: 45, value: 127, pressed: true }, midiContext()),
    ).toEqual([{ type: 'BEAT_JUMP', deck: 1, beats: 1 }])
    expect(
      mapper.map({ kind: 'note', channel: 2, number: 41, value: 127, pressed: true }, midiContext()),
    ).toEqual([{ type: 'BEAT_JUMP', deck: 2, beats: -4 }])
  })

  it('toggles mixer flags from context and ignores note-off for play', () => {
    const mapper = new MidiMapper(genericMidiBindings())
    const enabled = midiContext({
      beatFxEnabled: () => true,
      recording: () => true,
      channelCue: vi.fn(() => true),
    })

    expect(mapper.map({ kind: 'note', channel: 16, number: 62, value: 127, pressed: true }, enabled)).toEqual([
      { type: 'SET_BEAT_FX_ENABLED', enabled: false },
    ])
    expect(mapper.map({ kind: 'note', channel: 16, number: 60, value: 127, pressed: true }, enabled)).toEqual([
      { type: 'RECORD_STOP' },
    ])
    expect(mapper.map({ kind: 'note', channel: 1, number: 69, value: 127, pressed: true }, enabled)).toEqual([
      { type: 'SET_CHANNEL_CUE', deck: 1, enabled: false },
    ])
    expect(mapper.map({ kind: 'note', channel: 1, number: 60, value: 0, pressed: false }, midiContext())).toEqual([])
  })

  it('learns a new source without keeping the previous one', () => {
    const mapper = new MidiMapper(genericMidiBindings())
    mapper.bind({ kind: 'play', deck: 1 }, { kind: 'note', channel: 3, number: 36 }, 'absolute')

    expect(
      mapper.map({ kind: 'note', channel: 3, number: 36, value: 127, pressed: true }, midiContext()),
    ).toEqual([{ type: 'DECK_TOGGLE_PLAY', deck: 1 }])
    expect(
      mapper.map({ kind: 'note', channel: 1, number: 60, value: 127, pressed: true }, midiContext()),
    ).toEqual([])
  })
})
