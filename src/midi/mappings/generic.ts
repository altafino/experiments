import type { DeckId } from '../../commands/DJCommand'
import {
  MIDI_GENERIC_MIXER_CHANNEL,
  type MidiBinding,
  type MidiTarget,
} from '../../domain/midi'

/**
 * Generic GM-style layout: MIDI channel 1 = deck 1, channel 2 = deck 2,
 * channel 16 = mixer. Not a Pioneer XDJ/DDJ map — those belong in a
 * separate file under mappings/ if added later.
 */
const DECK_NOTE = {
  play: 60,
  cue: 62,
  hotA: 64,
  hotB: 65,
  hotC: 66,
  sync: 67,
  channelCue: 69,
  slip: 71,
  vinyl: 72,
  loopIn: 74,
  loopOut: 75,
  reloop: 76,
  loopHalve: 77,
  loopDouble: 78,
  quantize: 79,
  jumpBack4: 41,
  jumpBack1: 43,
  jumpFwd1: 45,
  jumpFwd4: 47,
  masterTempo: 81,
  masterDeck: 83,
  jogTouch: 48,
  pitchDown: 56,
  pitchUp: 58,
} as const

const DECK_CC = {
  tempo: 1,
  fader: 7,
  trim: 8,
  jog: 14,
  eqLow: 16,
  eqMid: 17,
  eqHigh: 18,
  color: 19,
} as const

const MIXER_CC = {
  cueMix: 1,
  master: 7,
  crossfader: 10,
  phones: 11,
  beatFxLevel: 91,
} as const

const MIXER_NOTE = {
  record: 60,
  beatFx: 62,
} as const

function deckBindings(deck: DeckId, channel: 1 | 2): MidiBinding[] {
  const note = (number: number, target: MidiTarget): MidiBinding => ({
    target,
    source: { kind: 'note', channel, number },
    encoding: 'absolute',
  })
  const cc = (number: number, target: MidiTarget, encoding: MidiBinding['encoding'] = 'absolute'): MidiBinding => ({
    target,
    source: { kind: 'cc', channel, number },
    encoding,
  })
  return [
    note(DECK_NOTE.play, { kind: 'play', deck }),
    note(DECK_NOTE.cue, { kind: 'cue', deck }),
    note(DECK_NOTE.hotA, { kind: 'hotCue', deck, pad: 'A' }),
    note(DECK_NOTE.hotB, { kind: 'hotCue', deck, pad: 'B' }),
    note(DECK_NOTE.hotC, { kind: 'hotCue', deck, pad: 'C' }),
    note(DECK_NOTE.sync, { kind: 'sync', deck }),
    note(DECK_NOTE.channelCue, { kind: 'channelCue', deck }),
    note(DECK_NOTE.slip, { kind: 'slip', deck }),
    note(DECK_NOTE.vinyl, { kind: 'vinyl', deck }),
    note(DECK_NOTE.loopIn, { kind: 'loopIn', deck }),
    note(DECK_NOTE.loopOut, { kind: 'loopOut', deck }),
    note(DECK_NOTE.reloop, { kind: 'reloop', deck }),
    note(DECK_NOTE.loopHalve, { kind: 'loopHalve', deck }),
    note(DECK_NOTE.loopDouble, { kind: 'loopDouble', deck }),
    note(DECK_NOTE.quantize, { kind: 'quantize', deck }),
    note(DECK_NOTE.jumpBack4, { kind: 'beatJump', deck, beats: -4 }),
    note(DECK_NOTE.jumpBack1, { kind: 'beatJump', deck, beats: -1 }),
    note(DECK_NOTE.jumpFwd1, { kind: 'beatJump', deck, beats: 1 }),
    note(DECK_NOTE.jumpFwd4, { kind: 'beatJump', deck, beats: 4 }),
    note(DECK_NOTE.masterTempo, { kind: 'masterTempo', deck }),
    note(DECK_NOTE.masterDeck, { kind: 'masterDeck', deck }),
    note(DECK_NOTE.jogTouch, { kind: 'jogTouch', deck }),
    note(DECK_NOTE.pitchDown, { kind: 'pitchBend', deck, direction: -1 }),
    note(DECK_NOTE.pitchUp, { kind: 'pitchBend', deck, direction: 1 }),
    cc(DECK_CC.tempo, { kind: 'tempo', deck }),
    cc(DECK_CC.fader, { kind: 'channelFader', deck }),
    cc(DECK_CC.trim, { kind: 'trim', deck }),
    cc(DECK_CC.eqLow, { kind: 'eq', deck, band: 'low' }),
    cc(DECK_CC.eqMid, { kind: 'eq', deck, band: 'mid' }),
    cc(DECK_CC.eqHigh, { kind: 'eq', deck, band: 'high' }),
    cc(DECK_CC.color, { kind: 'color', deck }),
    cc(DECK_CC.jog, { kind: 'jog', deck }, 'relativeOffset64'),
  ]
}

export function genericMidiBindings(): MidiBinding[] {
  const mixer = MIDI_GENERIC_MIXER_CHANNEL
  return [
    ...deckBindings(1, 1),
    ...deckBindings(2, 2),
    {
      target: { kind: 'crossfader' },
      source: { kind: 'cc', channel: mixer, number: MIXER_CC.crossfader },
      encoding: 'absolute',
    },
    {
      target: { kind: 'masterGain' },
      source: { kind: 'cc', channel: mixer, number: MIXER_CC.master },
      encoding: 'absolute',
    },
    {
      target: { kind: 'cueMix' },
      source: { kind: 'cc', channel: mixer, number: MIXER_CC.cueMix },
      encoding: 'absolute',
    },
    {
      target: { kind: 'phonesLevel' },
      source: { kind: 'cc', channel: mixer, number: MIXER_CC.phones },
      encoding: 'absolute',
    },
    {
      target: { kind: 'beatFxLevel' },
      source: { kind: 'cc', channel: mixer, number: MIXER_CC.beatFxLevel },
      encoding: 'absolute',
    },
    {
      target: { kind: 'beatFxEnabled' },
      source: { kind: 'note', channel: mixer, number: MIXER_NOTE.beatFx },
      encoding: 'absolute',
    },
    {
      target: { kind: 'record' },
      source: { kind: 'note', channel: mixer, number: MIXER_NOTE.record },
      encoding: 'absolute',
    },
  ]
}
