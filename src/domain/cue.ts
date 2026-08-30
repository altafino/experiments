import { clamp } from './timecode'

export const CUE_MIX_CUE = 0
export const CUE_MIX_MASTER = 1

export interface CueMixGains {
  cue: number
  master: number
}

/**
 * Headphones CUE/MIX knob: 0 = cue only, 1 = master only.
 * Equal-power so the blend does not peak at center.
 */
export function cueMixGains(mix: number): CueMixGains {
  const x = clamp(mix, 0, 1)
  return {
    cue: Math.cos((x * Math.PI) / 2),
    master: Math.sin((x * Math.PI) / 2),
  }
}
