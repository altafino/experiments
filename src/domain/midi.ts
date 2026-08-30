import type { DeckId } from '../commands/DJCommand'
import type { BeatJumpLength } from './beatJump'
import { BEAT_JUMP_LENGTHS } from './beatJump'
import type { HotCueId } from './DeckState'
import { JOG_NUDGE_RADIANS } from './jog'
import type { EqBand } from './MixerState'
import type { TempoRange } from './tempo'

export const MIDI_CHANNELS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16] as const
export type MidiChannel = (typeof MIDI_CHANNELS)[number]

export const MIDI_GENERIC_MIXER_CHANNEL = 16 as const satisfies MidiChannel

export const MIDI_JOG_RADIANS_PER_TICK = JOG_NUDGE_RADIANS
export const MIDI_CC_MAX = 127
export const MIDI_BUTTON_THRESHOLD = 64

export type MidiStatus =
  | 'idle'
  | 'connecting'
  | 'open'
  | 'denied'
  | 'unsupported'
  | 'error'

export type MidiMessageKind = 'note' | 'cc'

export type MidiCcEncoding = 'absolute' | 'relativeOffset64'

export interface MidiSource {
  kind: MidiMessageKind
  channel: MidiChannel
  number: number
}

export interface MidiMessage extends MidiSource {
  value: number
  pressed: boolean
}

export type MidiTarget =
  | { kind: 'play'; deck: DeckId }
  | { kind: 'cue'; deck: DeckId }
  | { kind: 'hotCue'; deck: DeckId; pad: HotCueId }
  | { kind: 'channelFader'; deck: DeckId }
  | { kind: 'trim'; deck: DeckId }
  | { kind: 'eq'; deck: DeckId; band: EqBand }
  | { kind: 'tempo'; deck: DeckId }
  | { kind: 'color'; deck: DeckId }
  | { kind: 'channelCue'; deck: DeckId }
  | { kind: 'sync'; deck: DeckId }
  | { kind: 'masterDeck'; deck: DeckId }
  | { kind: 'quantize'; deck: DeckId }
  | { kind: 'slip'; deck: DeckId }
  | { kind: 'vinyl'; deck: DeckId }
  | { kind: 'masterTempo'; deck: DeckId }
  | { kind: 'loopIn'; deck: DeckId }
  | { kind: 'loopOut'; deck: DeckId }
  | { kind: 'reloop'; deck: DeckId }
  | { kind: 'loopHalve'; deck: DeckId }
  | { kind: 'loopDouble'; deck: DeckId }
  | { kind: 'beatJump'; deck: DeckId; beats: BeatJumpLength }
  | { kind: 'jog'; deck: DeckId }
  | { kind: 'jogTouch'; deck: DeckId }
  | { kind: 'pitchBend'; deck: DeckId; direction: -1 | 1 }
  | { kind: 'crossfader' }
  | { kind: 'masterGain' }
  | { kind: 'cueMix' }
  | { kind: 'phonesLevel' }
  | { kind: 'beatFxLevel' }
  | { kind: 'beatFxEnabled' }
  | { kind: 'record' }

export interface MidiBinding {
  target: MidiTarget
  source: MidiSource
  encoding: MidiCcEncoding
}

export interface MidiDeviceInfo {
  id: string
  name: string
}

export interface MidiState {
  status: MidiStatus
  error?: string
  devices: MidiDeviceInfo[]
  lastMessage: string | null
  learnActionId: string | null
  bindings: MidiBinding[]
}

export function emptyMidiState(): MidiState {
  return {
    status: 'idle',
    devices: [],
    lastMessage: null,
    learnActionId: null,
    bindings: [],
  }
}

export function parseMidiBytes(data: ArrayLike<number>): MidiMessage | undefined {
  if (data.length < 2) {
    return undefined
  }
  const status = data[0] ?? 0
  if (status >= 0xf0) {
    return undefined
  }
  const type = status & 0xf0
  const channel = midiChannelFromStatus(status)
  if (channel === undefined) {
    return undefined
  }
  const number = data[1] ?? 0
  const value = data[2] ?? 0
  switch (type) {
    case 0x80:
      return { kind: 'note', channel, number, value: 0, pressed: false }
    case 0x90:
      return { kind: 'note', channel, number, value, pressed: value > 0 }
    case 0xb0:
      return {
        kind: 'cc',
        channel,
        number,
        value,
        pressed: value >= MIDI_BUTTON_THRESHOLD,
      }
    default:
      return undefined
  }
}

export function midiChannelFromStatus(status: number): MidiChannel | undefined {
  const channel = (status & 0x0f) + 1
  return MIDI_CHANNELS.find((entry) => entry === channel)
}

export function midiSourceKey(source: MidiSource): string {
  return `${source.kind}:${source.channel}:${source.number}`
}

export function formatMidiSource(source: MidiSource): string {
  const kind = source.kind === 'note' ? 'N' : 'CC'
  return `Ch${source.channel} ${kind}${source.number}`
}

export function formatMidiMessage(message: MidiMessage): string {
  return `${formatMidiSource(message)} ${message.value}`
}

export function ccToUnit(value: number): number {
  return Math.min(1, Math.max(0, value / MIDI_CC_MAX))
}

export function ccToTempoPercent(value: number, range: TempoRange): number {
  if (value === MIDI_BUTTON_THRESHOLD) {
    return 0
  }
  return (ccToUnit(value) * 2 - 1) * range
}

export function relativeOffset64(value: number): number {
  return value - MIDI_BUTTON_THRESHOLD
}

export function midiTargetKey(target: MidiTarget): string {
  switch (target.kind) {
    case 'play':
      return `play:${target.deck}`
    case 'cue':
      return `cue:${target.deck}`
    case 'hotCue':
      return `hotCue:${target.deck}:${target.pad}`
    case 'channelFader':
      return `channelFader:${target.deck}`
    case 'trim':
      return `trim:${target.deck}`
    case 'eq':
      return `eq:${target.deck}:${target.band}`
    case 'tempo':
      return `tempo:${target.deck}`
    case 'color':
      return `color:${target.deck}`
    case 'channelCue':
      return `channelCue:${target.deck}`
    case 'sync':
      return `sync:${target.deck}`
    case 'masterDeck':
      return `masterDeck:${target.deck}`
    case 'quantize':
      return `quantize:${target.deck}`
    case 'slip':
      return `slip:${target.deck}`
    case 'vinyl':
      return `vinyl:${target.deck}`
    case 'masterTempo':
      return `masterTempo:${target.deck}`
    case 'loopIn':
      return `loopIn:${target.deck}`
    case 'loopOut':
      return `loopOut:${target.deck}`
    case 'reloop':
      return `reloop:${target.deck}`
    case 'loopHalve':
      return `loopHalve:${target.deck}`
    case 'loopDouble':
      return `loopDouble:${target.deck}`
    case 'beatJump':
      return `beatJump:${target.deck}:${target.beats}`
    case 'jog':
      return `jog:${target.deck}`
    case 'jogTouch':
      return `jogTouch:${target.deck}`
    case 'pitchBend':
      return `pitchBend:${target.deck}:${target.direction}`
    case 'crossfader':
      return 'crossfader'
    case 'masterGain':
      return 'masterGain'
    case 'cueMix':
      return 'cueMix'
    case 'phonesLevel':
      return 'phonesLevel'
    case 'beatFxLevel':
      return 'beatFxLevel'
    case 'beatFxEnabled':
      return 'beatFxEnabled'
    case 'record':
      return 'record'
    default: {
      const neverTarget: never = target
      return String(neverTarget)
    }
  }
}

export function midiTargetLabel(target: MidiTarget): string {
  switch (target.kind) {
    case 'play':
      return `Deck ${target.deck} play`
    case 'cue':
      return `Deck ${target.deck} cue`
    case 'hotCue':
      return `Deck ${target.deck} hot cue ${target.pad}`
    case 'channelFader':
      return `Deck ${target.deck} fader`
    case 'trim':
      return `Deck ${target.deck} trim`
    case 'eq':
      return `Deck ${target.deck} EQ ${target.band}`
    case 'tempo':
      return `Deck ${target.deck} tempo`
    case 'color':
      return `Deck ${target.deck} color`
    case 'channelCue':
      return `Deck ${target.deck} headphones`
    case 'sync':
      return `Deck ${target.deck} sync`
    case 'masterDeck':
      return `Deck ${target.deck} master`
    case 'quantize':
      return `Deck ${target.deck} quantize`
    case 'slip':
      return `Deck ${target.deck} slip`
    case 'vinyl':
      return `Deck ${target.deck} vinyl`
    case 'masterTempo':
      return `Deck ${target.deck} master tempo`
    case 'loopIn':
      return `Deck ${target.deck} loop in`
    case 'loopOut':
      return `Deck ${target.deck} loop out`
    case 'reloop':
      return `Deck ${target.deck} reloop`
    case 'loopHalve':
      return `Deck ${target.deck} loop half`
    case 'loopDouble':
      return `Deck ${target.deck} loop double`
    case 'beatJump':
      return `Deck ${target.deck} jump ${target.beats > 0 ? '+' : ''}${target.beats}`
    case 'jog':
      return `Deck ${target.deck} jog`
    case 'jogTouch':
      return `Deck ${target.deck} jog touch`
    case 'pitchBend':
      return `Deck ${target.deck} pitch bend ${target.direction < 0 ? 'down' : 'up'}`
    case 'crossfader':
      return 'Crossfader'
    case 'masterGain':
      return 'Master gain'
    case 'cueMix':
      return 'Cue mix'
    case 'phonesLevel':
      return 'Phones level'
    case 'beatFxLevel':
      return 'Beat FX level'
    case 'beatFxEnabled':
      return 'Beat FX'
    case 'record':
      return 'Record'
    default: {
      const neverTarget: never = target
      return String(neverTarget)
    }
  }
}

function parseDeckId(value: string | undefined): DeckId | undefined {
  if (value === '1') {
    return 1
  }
  if (value === '2') {
    return 2
  }
  return undefined
}

function parseHotCue(value: string | undefined): HotCueId | undefined {
  if (value === 'A' || value === 'B' || value === 'C') {
    return value
  }
  return undefined
}

function parseEqBand(value: string | undefined): EqBand | undefined {
  if (value === 'low' || value === 'mid' || value === 'high') {
    return value
  }
  return undefined
}

function parseBeatJump(value: string | undefined): BeatJumpLength | undefined {
  if (value === undefined) {
    return undefined
  }
  const beats = Number(value)
  return BEAT_JUMP_LENGTHS.find((entry) => entry === beats)
}

export function midiTargetFromKey(key: string): MidiTarget | undefined {
  const parts = key.split(':')
  const kind = parts[0]
  switch (kind) {
    case 'play': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'play', deck }
    }
    case 'cue': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'cue', deck }
    }
    case 'hotCue': {
      const deck = parseDeckId(parts[1])
      const pad = parseHotCue(parts[2])
      return deck === undefined || pad === undefined ? undefined : { kind: 'hotCue', deck, pad }
    }
    case 'channelFader': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'channelFader', deck }
    }
    case 'trim': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'trim', deck }
    }
    case 'eq': {
      const deck = parseDeckId(parts[1])
      const band = parseEqBand(parts[2])
      return deck === undefined || band === undefined ? undefined : { kind: 'eq', deck, band }
    }
    case 'tempo': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'tempo', deck }
    }
    case 'color': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'color', deck }
    }
    case 'channelCue': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'channelCue', deck }
    }
    case 'sync': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'sync', deck }
    }
    case 'masterDeck': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'masterDeck', deck }
    }
    case 'quantize': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'quantize', deck }
    }
    case 'slip': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'slip', deck }
    }
    case 'vinyl': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'vinyl', deck }
    }
    case 'masterTempo': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'masterTempo', deck }
    }
    case 'loopIn': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'loopIn', deck }
    }
    case 'loopOut': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'loopOut', deck }
    }
    case 'reloop': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'reloop', deck }
    }
    case 'loopHalve': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'loopHalve', deck }
    }
    case 'loopDouble': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'loopDouble', deck }
    }
    case 'beatJump': {
      const deck = parseDeckId(parts[1])
      const beats = parseBeatJump(parts[2])
      return deck === undefined || beats === undefined ? undefined : { kind: 'beatJump', deck, beats }
    }
    case 'jog': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'jog', deck }
    }
    case 'jogTouch': {
      const deck = parseDeckId(parts[1])
      return deck === undefined ? undefined : { kind: 'jogTouch', deck }
    }
    case 'pitchBend': {
      const deck = parseDeckId(parts[1])
      const direction = parts[2] === '-1' ? -1 : parts[2] === '1' ? 1 : undefined
      return deck === undefined || direction === undefined
        ? undefined
        : { kind: 'pitchBend', deck, direction }
    }
    case 'crossfader':
      return { kind: 'crossfader' }
    case 'masterGain':
      return { kind: 'masterGain' }
    case 'cueMix':
      return { kind: 'cueMix' }
    case 'phonesLevel':
      return { kind: 'phonesLevel' }
    case 'beatFxLevel':
      return { kind: 'beatFxLevel' }
    case 'beatFxEnabled':
      return { kind: 'beatFxEnabled' }
    case 'record':
      return { kind: 'record' }
    default:
      return undefined
  }
}

export function midiTargetCatalog(): MidiTarget[] {
  const decks: DeckId[] = [1, 2]
  const pads: HotCueId[] = ['A', 'B', 'C']
  const bands: EqBand[] = ['low', 'mid', 'high']
  const targets: MidiTarget[] = []
  for (const deck of decks) {
    targets.push(
      { kind: 'play', deck },
      { kind: 'cue', deck },
      { kind: 'channelFader', deck },
      { kind: 'trim', deck },
      { kind: 'tempo', deck },
      { kind: 'color', deck },
      { kind: 'channelCue', deck },
      { kind: 'sync', deck },
      { kind: 'masterDeck', deck },
      { kind: 'quantize', deck },
      { kind: 'slip', deck },
      { kind: 'vinyl', deck },
      { kind: 'masterTempo', deck },
      { kind: 'loopIn', deck },
      { kind: 'loopOut', deck },
      { kind: 'reloop', deck },
      { kind: 'loopHalve', deck },
      { kind: 'loopDouble', deck },
    )
    for (const beats of BEAT_JUMP_LENGTHS) {
      targets.push({ kind: 'beatJump', deck, beats })
    }
    targets.push(
      { kind: 'jog', deck },
      { kind: 'jogTouch', deck },
      { kind: 'pitchBend', deck, direction: -1 },
      { kind: 'pitchBend', deck, direction: 1 },
    )
    for (const pad of pads) {
      targets.push({ kind: 'hotCue', deck, pad })
    }
    for (const band of bands) {
      targets.push({ kind: 'eq', deck, band })
    }
  }
  targets.push(
    { kind: 'crossfader' },
    { kind: 'masterGain' },
    { kind: 'cueMix' },
    { kind: 'phonesLevel' },
    { kind: 'beatFxLevel' },
    { kind: 'beatFxEnabled' },
    { kind: 'record' },
  )
  return targets
}

export function encodingForTarget(target: MidiTarget, kind: MidiMessageKind): MidiCcEncoding {
  if (target.kind === 'jog' && kind === 'cc') {
    return 'relativeOffset64'
  }
  return 'absolute'
}
