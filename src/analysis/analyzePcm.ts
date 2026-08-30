import { buildBeatGrid } from './BeatGridAnalyzer'
import { detectBpm } from './BPMAnalyzer'
import { mixToMono, rmsDb } from './pcm'
import type { AnalysisResult, AnalyzePcmInput } from './types'
import { buildWaveformData } from './WaveformAnalyzer'

/**
 * Full analysis pipeline. Safe to run inside a Web Worker.
 */
export function analyzePcm(input: AnalyzePcmInput): AnalysisResult {
  const mono = mixToMono(input.channels)
  const waveform = buildWaveformData(mono)
  const loudness = rmsDb(mono)
  const estimate = detectBpm(mono, input.sampleRate)
  if (!estimate) {
    return { waveform, loudness }
  }

  const durationSeconds = mono.length / input.sampleRate
  const beatGrid = buildBeatGrid(mono, input.sampleRate, estimate.bpm, durationSeconds)
  return {
    waveform,
    loudness,
    bpm: estimate.bpm,
    beatGrid,
  }
}
