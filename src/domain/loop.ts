import { clamp } from './timecode'
import { beatPeriodSeconds } from './quantize'

export const BEAT_LOOP_LENGTHS = [0.03125, 0.0625, 0.125, 0.25, 0.5, 1, 2, 4, 8, 16, 32] as const

export type BeatLoopLength = (typeof BEAT_LOOP_LENGTHS)[number]

export const BEAT_LOOP_1_32: BeatLoopLength = 0.03125
export const BEAT_LOOP_1_16: BeatLoopLength = 0.0625
export const BEAT_LOOP_1_8: BeatLoopLength = 0.125
export const BEAT_LOOP_1_4: BeatLoopLength = 0.25
export const BEAT_LOOP_1_2: BeatLoopLength = 0.5
export const BEAT_LOOP_1: BeatLoopLength = 1
export const BEAT_LOOP_2: BeatLoopLength = 2
export const BEAT_LOOP_4: BeatLoopLength = 4
export const BEAT_LOOP_8: BeatLoopLength = 8
export const BEAT_LOOP_16: BeatLoopLength = 16
export const BEAT_LOOP_32: BeatLoopLength = 32

export const MIN_LOOP_SECONDS = 0.02

export interface LoopRegion {
  startSeconds: number
  endSeconds: number
}

export function minLoopSeconds(bpm: number | undefined): number {
  const period = bpm === undefined ? undefined : beatPeriodSeconds(bpm)
  if (period === undefined) {
    return MIN_LOOP_SECONDS
  }
  return period * BEAT_LOOP_1_32
}

export function wrapIntoLoop(positionSeconds: number, startSeconds: number, endSeconds: number): number {
  const length = endSeconds - startSeconds
  if (!(length > 0)) {
    return positionSeconds
  }
  let offset = (positionSeconds - startSeconds) % length
  if (offset < 0) {
    offset += length
  }
  return startSeconds + offset
}

export function beatLoopEnd(
  startSeconds: number,
  beats: number,
  bpm: number,
  durationSeconds: number,
): number {
  const period = beatPeriodSeconds(bpm)
  if (period === undefined) {
    return startSeconds
  }
  return clamp(startSeconds + beats * period, 0, durationSeconds)
}

export function isUsableLoop(startSeconds: number, endSeconds: number, minLength: number): boolean {
  return endSeconds - startSeconds >= minLength
}

export function beatLoopLabel(beats: BeatLoopLength): string {
  switch (beats) {
    case 0.03125:
      return '1/32'
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
    case 16:
      return '16'
    case 32:
      return '32'
    default: {
      const neverBeats: never = beats
      return String(neverBeats)
    }
  }
}

export function beatLoopTestId(beats: BeatLoopLength): string {
  switch (beats) {
    case 0.03125:
      return 'loop-beat-1-32'
    case 0.0625:
      return 'loop-beat-1-16'
    case 0.125:
      return 'loop-beat-1-8'
    case 0.25:
      return 'loop-beat-1-4'
    case 0.5:
      return 'loop-beat-1-2'
    case 1:
      return 'loop-beat-1'
    case 2:
      return 'loop-beat-2'
    case 4:
      return 'loop-beat-4'
    case 8:
      return 'loop-beat-8'
    case 16:
      return 'loop-beat-16'
    case 32:
      return 'loop-beat-32'
    default: {
      const neverBeats: never = beats
      return String(neverBeats)
    }
  }
}
