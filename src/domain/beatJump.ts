import { clamp } from './timecode'
import { beatPeriodSeconds } from './quantize'

export const BEAT_JUMP_LENGTHS = [-32, -16, -8, -4, -2, -1, 1, 2, 4, 8, 16, 32] as const
export type BeatJumpLength = (typeof BEAT_JUMP_LENGTHS)[number]

export function beatJumpSeconds(
  positionSeconds: number,
  beats: BeatJumpLength,
  bpm: number,
  durationSeconds: number,
): number {
  const period = beatPeriodSeconds(bpm)
  if (period === undefined) {
    return clamp(positionSeconds, 0, durationSeconds)
  }
  return clamp(positionSeconds + beats * period, 0, durationSeconds)
}

export function beatJumpLabel(beats: BeatJumpLength): string {
  if (beats < 0) {
    return String(beats)
  }
  return `+${beats}`
}

export function beatJumpTestId(beats: BeatJumpLength): string {
  if (beats < 0) {
    return `beat-jump-m${Math.abs(beats)}`
  }
  return `beat-jump-p${beats}`
}
