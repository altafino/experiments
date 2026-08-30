import type { DeckId } from '../commands/DJCommand'

export type EqBand = 'low' | 'mid' | 'high'

export type CrossfaderCurve = 'linear' | 'equalPower' | 'sharp'

export interface ChannelMixState {
  trim: number
  eq: {
    low: number
    mid: number
    high: number
  }
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
}

export const MIXER_DEFAULTS = {
  trim: 0.5,
  eq: 0.5,
  fader: 1,
  crossfader: 0.5,
  crossfaderCurve: 'equalPower' as const,
  masterGain: 1,
}

export function emptyChannelMix(): ChannelMixState {
  return {
    trim: MIXER_DEFAULTS.trim,
    eq: {
      low: MIXER_DEFAULTS.eq,
      mid: MIXER_DEFAULTS.eq,
      high: MIXER_DEFAULTS.eq,
    },
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
