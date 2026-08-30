import { clamp } from './timecode'

export const TEMPO_RANGES = [6, 10, 16, 24] as const
export type TempoRange = (typeof TEMPO_RANGES)[number]
export type PitchBend = -1 | 0 | 1

export const DEFAULT_TEMPO_RANGE: TempoRange = 10
export const WIDE_TEMPO_RANGE: TempoRange = 24
export const PITCH_BEND_PERCENT = 8
export const MIN_PLAYBACK_RATE = 0.01

export function clampTempoPercent(percent: number, range: TempoRange): number {
  return clamp(percent, -range, range)
}

export function playbackRateFromTempo(percent: number, bend: PitchBend = 0): number {
  const slider = 1 + percent / 100
  const bent = 1 + (bend * PITCH_BEND_PERCENT) / 100
  return Math.max(MIN_PLAYBACK_RATE, slider * bent)
}

export function effectiveBpm(originalBpm: number | undefined, rate: number): number | undefined {
  if (originalBpm === undefined) {
    return undefined
  }
  return originalBpm * rate
}

export function formatTempoPercent(percent: number): string {
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent.toFixed(2)}%`
}

export function tempoRangeLabel(range: TempoRange): string {
  switch (range) {
    case 6:
      return '±6'
    case 10:
      return '±10'
    case 16:
      return '±16'
    case 24:
      return 'WIDE'
    default: {
      const neverRange: never = range
      return String(neverRange)
    }
  }
}

export function tempoRangeTestId(range: TempoRange): string {
  switch (range) {
    case 6:
      return 'tempo-range-6'
    case 10:
      return 'tempo-range-10'
    case 16:
      return 'tempo-range-16'
    case 24:
      return 'tempo-range-wide'
    default: {
      const neverRange: never = range
      return String(neverRange)
    }
  }
}
