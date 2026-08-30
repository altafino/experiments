import { extractPeaks } from '../audio/waveform/extractPeaks'
import type { WaveformData, WaveformLevel } from '../domain/Track'

export const PEAK_HOPS = [64, 256, 1024, 4096] as const
export const OVERVIEW_BUCKETS = 2048

export function extractPeakLevels(
  mono: Float32Array,
  hops: readonly number[] = PEAK_HOPS,
): WaveformLevel[] {
  const levels: WaveformLevel[] = []
  for (const samplesPerBucket of hops) {
    if (samplesPerBucket <= 0 || mono.length === 0) {
      continue
    }
    const count = Math.max(1, Math.ceil(mono.length / samplesPerBucket))
    const peaks = new Float32Array(count)
    for (let bucket = 0; bucket < count; bucket += 1) {
      const start = bucket * samplesPerBucket
      const end = Math.min(mono.length, start + samplesPerBucket)
      let peak = 0
      for (let i = start; i < end; i += 1) {
        const sample = mono[i] ?? 0
        const abs = sample < 0 ? -sample : sample
        if (abs > peak) {
          peak = abs
        }
      }
      peaks[bucket] = peak
    }
    levels.push({ samplesPerBucket, peaks })
  }
  return levels
}

export function buildWaveformData(mono: Float32Array): WaveformData {
  const peaks = extractPeaks(
    {
      numberOfChannels: 1,
      length: mono.length,
      getChannelData: () => mono,
    },
    OVERVIEW_BUCKETS,
  )
  return {
    peaks,
    bucketCount: peaks.length,
    levels: extractPeakLevels(mono),
  }
}
