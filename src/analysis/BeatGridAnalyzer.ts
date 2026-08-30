import type { BeatGrid } from '../domain/Track'
import { energyOnset } from './BPMAnalyzer'

/**
 * Align a constant BPM grid to the onset envelope and emit beat times.
 */
export function buildBeatGrid(
  mono: Float32Array,
  sampleRate: number,
  bpm: number,
  durationSeconds: number,
): BeatGrid {
  const hop = Math.max(1, Math.round(sampleRate / 100))
  const onset = energyOnset(mono, hop)
  const fps = sampleRate / hop
  const periodHops = Math.max(1, (60 / bpm) * fps)

  let bestOffset = 0
  let bestScore = -1
  const steps = Math.max(1, Math.round(periodHops))
  for (let offset = 0; offset < steps; offset += 1) {
    let score = 0
    for (let i = offset; i < onset.length; i += periodHops) {
      const index = Math.floor(i)
      score += onset[index] ?? 0
    }
    if (score > bestScore) {
      bestScore = score
      bestOffset = offset
    }
  }

  const firstBeatSeconds = (bestOffset * hop) / sampleRate
  const period = 60 / bpm
  const beats: number[] = []
  let time = firstBeatSeconds
  while (time < durationSeconds) {
    beats.push(time)
    time += period
  }

  return { bpm, firstBeatSeconds, beats }
}
