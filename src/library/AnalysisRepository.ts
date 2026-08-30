import type { BeatGrid, WaveformData, WaveformLevel } from '../domain/Track'

export interface StoredAnalysis {
  key: string
  title: string
  duration: number
  bpm?: number
  loudness: number
  beatGrid?: BeatGrid
  waveform: {
    peaks: number[]
    bucketCount: number
    levels: { samplesPerBucket: number; peaks: number[] }[]
  }
  analyzedAt: number
}

export interface AnalysisRepository {
  get(key: string): Promise<StoredAnalysis | undefined>
  put(record: StoredAnalysis): Promise<void>
}

export function waveformToStored(data: WaveformData): StoredAnalysis['waveform'] {
  return {
    peaks: Array.from(data.peaks),
    bucketCount: data.bucketCount,
    levels: data.levels.map((level) => ({
      samplesPerBucket: level.samplesPerBucket,
      peaks: Array.from(level.peaks),
    })),
  }
}

export function waveformFromStored(data: StoredAnalysis['waveform']): WaveformData {
  return {
    peaks: Float32Array.from(data.peaks),
    bucketCount: data.bucketCount,
    levels: data.levels.map(
      (level): WaveformLevel => ({
        samplesPerBucket: level.samplesPerBucket,
        peaks: Float32Array.from(level.peaks),
      }),
    ),
  }
}
