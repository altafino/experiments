import { clamp } from './timecode'

export const CUE_AT_EPSILON_SECONDS = 0.05
export const ON_BEAT_EPSILON_BEATS = 0.02

export function isAtCue(positionSeconds: number, cuePointSeconds: number): boolean {
  return Math.abs(positionSeconds - cuePointSeconds) <= CUE_AT_EPSILON_SECONDS
}

export function beatPeriodSeconds(bpm: number): number | undefined {
  if (!(bpm > 0)) {
    return undefined
  }
  return 60 / bpm
}

export function nearestBeatSeconds(
  positionSeconds: number,
  firstBeatSeconds: number,
  bpm: number,
  durationSeconds: number,
): number {
  const period = beatPeriodSeconds(bpm)
  if (period === undefined) {
    return clamp(positionSeconds, 0, durationSeconds)
  }
  const index = Math.round((positionSeconds - firstBeatSeconds) / period)
  return clamp(firstBeatSeconds + index * period, 0, durationSeconds)
}

export function nextBeatSeconds(
  positionSeconds: number,
  firstBeatSeconds: number,
  bpm: number,
  durationSeconds: number,
): number {
  const period = beatPeriodSeconds(bpm)
  if (period === undefined) {
    return clamp(positionSeconds, 0, durationSeconds)
  }
  const beats = (positionSeconds - firstBeatSeconds) / period
  const nearest = Math.round(beats)
  if (Math.abs(beats - nearest) < ON_BEAT_EPSILON_BEATS) {
    return clamp(firstBeatSeconds + nearest * period, 0, durationSeconds)
  }
  const next = Math.ceil(beats)
  return clamp(firstBeatSeconds + next * period, 0, durationSeconds)
}

export function secondsUntilNextBeat(
  positionSeconds: number,
  firstBeatSeconds: number,
  bpm: number,
  durationSeconds: number,
): number {
  const next = nextBeatSeconds(positionSeconds, firstBeatSeconds, bpm, durationSeconds)
  return Math.max(0, next - positionSeconds)
}

export function hotCueColor(id: 'A' | 'B' | 'C'): string {
  switch (id) {
    case 'A':
      return '#f3b23e'
    case 'B':
      return '#3ecf8e'
    case 'C':
      return '#ff6b7a'
    default: {
      const neverId: never = id
      return String(neverId)
    }
  }
}

export function hotCueTestId(id: 'A' | 'B' | 'C'): string {
  switch (id) {
    case 'A':
      return 'hot-cue-A'
    case 'B':
      return 'hot-cue-B'
    case 'C':
      return 'hot-cue-C'
    default: {
      const neverId: never = id
      return String(neverId)
    }
  }
}
