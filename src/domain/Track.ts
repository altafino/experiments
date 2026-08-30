export type AnalysisStatus = 'idle' | 'pending' | 'ready' | 'failed'

export interface BeatGrid {
  bpm: number
  firstBeatSeconds: number
  beats: number[]
}

export interface WaveformLevel {
  samplesPerBucket: number
  peaks: Float32Array
}

export interface WaveformData {
  peaks: Float32Array
  bucketCount: number
  levels: WaveformLevel[]
}

export interface Track {
  id: string
  title: string
  artist?: string
  album?: string
  duration: number
  bpm?: number
  key?: string
  loudness?: number
  waveform?: WaveformData
  beatGrid?: BeatGrid
  fileHandle?: FileSystemFileHandle
}
