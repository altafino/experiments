import { clamp } from './timecode'
import { TEMPO_RANGES, WIDE_TEMPO_RANGE, type TempoRange } from './tempo'

export const SYNC_PHASE_DEADZONE = 0.02
export const SYNC_PHASE_GAIN = 0.1
export const SYNC_PHASE_MAX = 0.04

export function beatPhase(
  positionSeconds: number,
  firstBeatSeconds: number,
  bpm: number,
): number {
  if (!(bpm > 0)) {
    return 0
  }
  const period = 60 / bpm
  const beats = (positionSeconds - firstBeatSeconds) / period
  const frac = beats - Math.floor(beats)
  return frac < 0 ? frac + 1 : frac
}

/** Slave phase minus master phase, wrapped into (-0.5, 0.5]. */
export function wrappedPhaseError(masterPhase: number, slavePhase: number): number {
  let delta = slavePhase - masterPhase
  if (delta > 0.5) {
    delta -= 1
  }
  if (delta <= -0.5) {
    delta += 1
  }
  return delta
}

export function syncPlaybackRate(masterEffectiveBpm: number, slaveOriginalBpm: number): number {
  if (!(slaveOriginalBpm > 0)) {
    return 1
  }
  return masterEffectiveBpm / slaveOriginalBpm
}

export function tempoPercentFromRate(rate: number): number {
  return (rate - 1) * 100
}

export function rangeForTempoPercent(percent: number): TempoRange {
  const abs = Math.abs(percent)
  for (const range of TEMPO_RANGES) {
    if (abs <= range) {
      return range
    }
  }
  return WIDE_TEMPO_RANGE
}

export function phaseRateMultiplier(errorBeats: number): number {
  if (Math.abs(errorBeats) < SYNC_PHASE_DEADZONE) {
    return 1
  }
  const adjustment = clamp(-errorBeats * SYNC_PHASE_GAIN, -SYNC_PHASE_MAX, SYNC_PHASE_MAX)
  return 1 + adjustment
}
