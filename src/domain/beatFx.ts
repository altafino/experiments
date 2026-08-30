import { clamp } from './timecode'

export const BEAT_FX_TYPES = ['echo', 'reverb', 'flanger'] as const
export type BeatFxType = (typeof BEAT_FX_TYPES)[number]

export const BEAT_FX_LENGTHS = [0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8] as const
export type BeatFxLength = (typeof BEAT_FX_LENGTHS)[number]

export const DEFAULT_BEAT_FX: BeatFxType = 'echo'
export const DEFAULT_BEAT_FX_LENGTH: BeatFxLength = 0.5
export const DEFAULT_BEAT_FX_LEVEL = 0.5
export const DEFAULT_BEAT_FX_BPM = 120

export const BEAT_FX_MIN_BPM = 40
export const BEAT_FX_MAX_BPM = 300
export const BEAT_FX_MIN_DELAY_SECONDS = 0.005
export const BEAT_FX_MAX_DELAY_SECONDS = 16

export interface BeatFxBpmSource {
  masterDeck: boolean
  playing: boolean
  effectiveBpm?: number
}

/**
 * Delay for a beat fraction at `bpm`. 120 BPM + 1/2 beat → 250 ms.
 */
export function beatDelaySeconds(bpm: number, beats: BeatFxLength): number {
  const period = 60 / clamp(bpm, BEAT_FX_MIN_BPM, BEAT_FX_MAX_BPM)
  return clamp(period * beats, BEAT_FX_MIN_DELAY_SECONDS, BEAT_FX_MAX_DELAY_SECONDS)
}

/** One LFO cycle per selected beat length, clamped to a flanger-useful range. */
export function beatLfoHz(bpm: number, beats: BeatFxLength): number {
  return clamp(1 / beatDelaySeconds(bpm, beats), 0.05, 20)
}

export function clampBeatFxBpm(bpm: number): number {
  return clamp(bpm, BEAT_FX_MIN_BPM, BEAT_FX_MAX_BPM)
}

/**
 * Master-deck effective BPM, else a playing deck, else any known BPM, else 120.
 */
export function beatFxBpmFromDecks(
  deck1?: BeatFxBpmSource,
  deck2?: BeatFxBpmSource,
): number {
  const master = masterSource(deck1, deck2)
  if (master?.effectiveBpm !== undefined) {
    return clampBeatFxBpm(master.effectiveBpm)
  }
  const playing = firstWithBpm(deck1, deck2, true)
  if (playing?.effectiveBpm !== undefined) {
    return clampBeatFxBpm(playing.effectiveBpm)
  }
  const any = firstWithBpm(deck1, deck2, false)
  if (any?.effectiveBpm !== undefined) {
    return clampBeatFxBpm(any.effectiveBpm)
  }
  return DEFAULT_BEAT_FX_BPM
}

export function nextBeatFx(type: BeatFxType): BeatFxType {
  switch (type) {
    case 'echo':
      return 'reverb'
    case 'reverb':
      return 'flanger'
    case 'flanger':
      return 'echo'
    default: {
      const neverType: never = type
      return neverType
    }
  }
}

export function beatFxLabel(type: BeatFxType): string {
  switch (type) {
    case 'echo':
      return 'Echo'
    case 'reverb':
      return 'Reverb'
    case 'flanger':
      return 'Flanger'
    default: {
      const neverType: never = type
      return String(neverType)
    }
  }
}

export function beatFxTestId(type: BeatFxType): string {
  switch (type) {
    case 'echo':
      return 'beat-fx-echo'
    case 'reverb':
      return 'beat-fx-reverb'
    case 'flanger':
      return 'beat-fx-flanger'
    default: {
      const neverType: never = type
      return String(neverType)
    }
  }
}

export function beatFxLengthLabel(beats: BeatFxLength): string {
  switch (beats) {
    case 0.0625:
      return '1/16'
    case 0.125:
      return '1/8'
    case 0.25:
      return '1/4'
    case 0.5:
      return '1/2'
    case 1:
      return '1'
    case 2:
      return '2'
    case 4:
      return '4'
    case 8:
      return '8'
    default: {
      const neverBeats: never = beats
      return String(neverBeats)
    }
  }
}

export function beatFxLengthTestId(beats: BeatFxLength): string {
  switch (beats) {
    case 0.0625:
      return 'beat-fx-beat-1-16'
    case 0.125:
      return 'beat-fx-beat-1-8'
    case 0.25:
      return 'beat-fx-beat-1-4'
    case 0.5:
      return 'beat-fx-beat-1-2'
    case 1:
      return 'beat-fx-beat-1'
    case 2:
      return 'beat-fx-beat-2'
    case 4:
      return 'beat-fx-beat-4'
    case 8:
      return 'beat-fx-beat-8'
    default: {
      const neverBeats: never = beats
      return String(neverBeats)
    }
  }
}

function masterSource(
  deck1?: BeatFxBpmSource,
  deck2?: BeatFxBpmSource,
): BeatFxBpmSource | undefined {
  if (deck1?.masterDeck) {
    return deck1
  }
  if (deck2?.masterDeck) {
    return deck2
  }
  return undefined
}

function firstWithBpm(
  deck1: BeatFxBpmSource | undefined,
  deck2: BeatFxBpmSource | undefined,
  playingOnly: boolean,
): BeatFxBpmSource | undefined {
  if (matchesBpmSource(deck1, playingOnly)) {
    return deck1
  }
  if (matchesBpmSource(deck2, playingOnly)) {
    return deck2
  }
  return undefined
}

function matchesBpmSource(deck: BeatFxBpmSource | undefined, playingOnly: boolean): boolean {
  if (!deck || deck.effectiveBpm === undefined) {
    return false
  }
  return !playingOnly || deck.playing
}
