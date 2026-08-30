import type { BeatGrid, WaveformData } from '../domain/Track'

export interface AnalyzePcmInput {
  sampleRate: number
  channels: Float32Array[]
}

export interface AnalysisResult {
  waveform: WaveformData
  bpm?: number
  beatGrid?: BeatGrid
  loudness: number
}

export interface AnalyzeWorkerRequest {
  type: 'analyze'
  requestId: string
  sampleRate: number
  channels: Float32Array[]
}

export type AnalyzeWorkerResponse =
  | ({ type: 'result'; requestId: string } & AnalysisResult)
  | { type: 'error'; requestId: string; message: string }

