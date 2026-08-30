import type { CrossfaderCurve } from '../../domain/MixerState'
import { clamp } from '../../domain/timecode'

export interface CrossfaderGains {
  deck1: number
  deck2: number
}

const SHARP_WIDTH = 0.04

/**
 * Gain curves for a 0..1 crossfader. 0 = full deck 1, 1 = full deck 2.
 * Sharp/scratch holds unity until the last few percent, then cuts hard
 * through center so both sides are silent at 0.5.
 */
export function crossfaderGains(position: number, curve: CrossfaderCurve): CrossfaderGains {
  const x = clamp(position, 0, 1)
  switch (curve) {
    case 'linear':
      return { deck1: 1 - x, deck2: x }
    case 'equalPower':
      return {
        deck1: Math.cos((x * Math.PI) / 2),
        deck2: Math.sin((x * Math.PI) / 2),
      }
    case 'sharp':
      return {
        deck1: sharpDeck1(x),
        deck2: sharpDeck2(x),
      }
    default: {
      const neverCurve: never = curve
      throw new Error(`Unknown crossfader curve: ${String(neverCurve)}`)
    }
  }
}

function sharpDeck1(x: number): number {
  if (x <= 0.5 - SHARP_WIDTH) {
    return 1
  }
  if (x >= 0.5) {
    return 0
  }
  return (0.5 - x) / SHARP_WIDTH
}

function sharpDeck2(x: number): number {
  if (x >= 0.5 + SHARP_WIDTH) {
    return 1
  }
  if (x <= 0.5) {
    return 0
  }
  return (x - 0.5) / SHARP_WIDTH
}
