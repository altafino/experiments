import type { DeckId } from '../commands/DJCommand'
import {
  DEFAULT_BEAT_FX,
  DEFAULT_BEAT_FX_BPM,
  DEFAULT_BEAT_FX_LENGTH,
  DEFAULT_BEAT_FX_LEVEL,
  type BeatFxLength,
  type BeatFxType,
} from './beatFx'
import { CUE_MIX_MASTER } from './cue'
import { COLOR_CENTER, DEFAULT_COLOR_FX, type ColorFxType } from './colorFx'

export type EqBand = 'low' | 'mid' | 'high'

export type CrossfaderCurve = 'linear' | 'equalPower' | 'sharp'

export interface ChannelMixState {
  trim: number
  eq: {
    low: number
    mid: number
    high: number
  }
  colorFx: ColorFxType
  color: number
  cue: boolean
  fader: number
}

export interface MixerState {
  channels: {
    1: ChannelMixState
    2: ChannelMixState
  }
  crossfader: number
  crossfaderCurve: CrossfaderCurve
  masterGain: number
  beatFx: BeatFxType
  beatFxBeats: BeatFxLength
  beatFxLevel: number
  beatFxEnabled: boolean
  beatFxBpm: number
  cueMix: number
  phonesLevel: number
}

export const MIXER_DEFAULTS = {
  trim: 0.5,
  eq: 0.5,
  colorFx: DEFAULT_COLOR_FX,
  color: COLOR_CENTER,
  fader: 1,
  crossfader: 0.5,
  crossfaderCurve: 'equalPower' as const,
  masterGain: 1,
  beatFx: DEFAULT_BEAT_FX,
  beatFxBeats: DEFAULT_BEAT_FX_LENGTH,
  beatFxLevel: DEFAULT_BEAT_FX_LEVEL,
  beatFxEnabled: false,
  cueMix: CUE_MIX_MASTER,
  phonesLevel: 1,
}

export function emptyChannelMix(): ChannelMixState {
  return {
    trim: MIXER_DEFAULTS.trim,
    eq: {
      low: MIXER_DEFAULTS.eq,
      mid: MIXER_DEFAULTS.eq,
      high: MIXER_DEFAULTS.eq,
    },
    colorFx: MIXER_DEFAULTS.colorFx,
    color: MIXER_DEFAULTS.color,
    cue: false,
    fader: MIXER_DEFAULTS.fader,
  }
}

export function emptyMixerState(): MixerState {
  return {
    channels: {
      1: emptyChannelMix(),
      2: emptyChannelMix(),
    },
    crossfader: MIXER_DEFAULTS.crossfader,
    crossfaderCurve: MIXER_DEFAULTS.crossfaderCurve,
    masterGain: MIXER_DEFAULTS.masterGain,
    beatFx: MIXER_DEFAULTS.beatFx,
    beatFxBeats: MIXER_DEFAULTS.beatFxBeats,
    beatFxLevel: MIXER_DEFAULTS.beatFxLevel,
    beatFxEnabled: MIXER_DEFAULTS.beatFxEnabled,
    beatFxBpm: DEFAULT_BEAT_FX_BPM,
    cueMix: MIXER_DEFAULTS.cueMix,
    phonesLevel: MIXER_DEFAULTS.phonesLevel,
  }
}

export function channelOf(state: MixerState, deck: DeckId): ChannelMixState {
  switch (deck) {
    case 1:
      return state.channels[1]
    case 2:
      return state.channels[2]
    default: {
      const neverDeck: never = deck
      throw new Error(`Unknown deck: ${String(neverDeck)}`)
    }
  }
}
