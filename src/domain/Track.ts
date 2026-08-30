export interface BeatGrid {
  bpm: number
  firstBeatSeconds: number
  beats: number[]
}

export interface WaveformData {
  peaks: Float32Array
  bucketCount: number
}

export interface Track {
  id: string
  title: string
  artist?: string
  album?: string
  duration: number
  bpm?: number
  key?: string
  waveform?: WaveformData
  beatGrid?: BeatGrid
  fileHandle?: FileSystemFileHandle
}
