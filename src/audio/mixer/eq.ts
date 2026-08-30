import { clamp } from '../../domain/timecode'

export const EQ_KILL_DB = -80
export const EQ_BOOST_DB = 6

/**
 * Map a 0..1 mixer knob to decibels.
 * 0 = kill, 0.5 = 0 dB, 1 = +6 dB.
 */
export function eqKnobToDb(knob: number): number {
  const t = clamp(knob, 0, 1)
  if (t <= 0.5) {
    return EQ_KILL_DB + (t / 0.5) * (0 - EQ_KILL_DB)
  }
  return ((t - 0.5) / 0.5) * EQ_BOOST_DB
}

export function dbToLinear(db: number): number {
  if (db <= EQ_KILL_DB) {
    return 0
  }
  return 10 ** (db / 20)
}
