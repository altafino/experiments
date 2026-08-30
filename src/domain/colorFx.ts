import { clamp } from './timecode'

export const COLOR_FX_TYPES = ['filter', 'noise', 'dubEcho', 'pitch'] as const
export type ColorFxType = (typeof COLOR_FX_TYPES)[number]

export const DEFAULT_COLOR_FX: ColorFxType = 'filter'
export const COLOR_CENTER = 0.5
export const COLOR_DEADZONE = 0.02

export const LPF_MIN_HZ = 200
export const LPF_MAX_HZ = 20_000
export const HPF_MIN_HZ = 20
export const HPF_MAX_HZ = 8_000

export const NOISE_GAIN_MAX = 0.35

export const DUB_ECHO_DELAY_SECONDS = 0.14
export const DUB_ECHO_FEEDBACK_MAX = 0.72
export const DUB_ECHO_WET_MAX = 0.85

export type FilterMode = 'bypass' | 'lowpass' | 'highpass'

/**
 * Signed COLOR amount: 0 = full CCW, 0.5 = center, 1 = full CW → −1..1.
 */
export function colorAmount(knob: number): number {
  return clamp((clamp(knob, 0, 1) - COLOR_CENTER) * 2, -1, 1)
}

export function isColorBypassed(knob: number): boolean {
  return Math.abs(colorAmount(knob)) < COLOR_DEADZONE
}

export function filterMode(amount: number): FilterMode {
  if (Math.abs(amount) < COLOR_DEADZONE) {
    return 'bypass'
  }
  if (amount < 0) {
    return 'lowpass'
  }
  return 'highpass'
}

/**
 * Exponential cutoff. CCW (negative) is LPF down to {@link LPF_MIN_HZ};
 * CW is HPF up to {@link HPF_MAX_HZ}.
 */
export function filterCutoffHz(amount: number): number {
  const signed = clamp(amount, -1, 1)
  if (signed < 0) {
    const t = 1 + signed
    return LPF_MIN_HZ * (LPF_MAX_HZ / LPF_MIN_HZ) ** t
  }
  return HPF_MIN_HZ * (HPF_MAX_HZ / HPF_MIN_HZ) ** signed
}

export function noiseGain(amount: number): number {
  if (Math.abs(amount) < COLOR_DEADZONE) {
    return 0
  }
  return Math.abs(amount) * NOISE_GAIN_MAX
}

export function dubEchoFeedback(amount: number): number {
  if (Math.abs(amount) < COLOR_DEADZONE) {
    return 0
  }
  return Math.abs(amount) * DUB_ECHO_FEEDBACK_MAX
}

export function dubEchoWet(amount: number): number {
  if (Math.abs(amount) < COLOR_DEADZONE) {
    return 0
  }
  return Math.abs(amount) * DUB_ECHO_WET_MAX
}

/** Channel pitch ratio. ±1 amount = ±1 octave. Does not change deck tempo. */
export function pitchRatio(amount: number): number {
  if (Math.abs(amount) < COLOR_DEADZONE) {
    return 1
  }
  return 2 ** clamp(amount, -1, 1)
}

export function nextColorFx(type: ColorFxType): ColorFxType {
  switch (type) {
    case 'filter':
      return 'noise'
    case 'noise':
      return 'dubEcho'
    case 'dubEcho':
      return 'pitch'
    case 'pitch':
      return 'filter'
    default: {
      const neverType: never = type
      return neverType
    }
  }
}

export function colorFxLabel(type: ColorFxType): string {
  switch (type) {
    case 'filter':
      return 'Filter'
    case 'noise':
      return 'Noise'
    case 'dubEcho':
      return 'Dub Echo'
    case 'pitch':
      return 'Pitch'
    default: {
      const neverType: never = type
      return String(neverType)
    }
  }
}

export function colorFxTestId(type: ColorFxType): string {
  switch (type) {
    case 'filter':
      return 'color-fx-filter'
    case 'noise':
      return 'color-fx-noise'
    case 'dubEcho':
      return 'color-fx-dub-echo'
    case 'pitch':
      return 'color-fx-pitch'
    default: {
      const neverType: never = type
      return String(neverType)
    }
  }
}
