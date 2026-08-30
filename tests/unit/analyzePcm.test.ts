import { describe, expect, it } from 'vitest'
import { detectBpm } from '../../src/analysis/BPMAnalyzer'
import { buildBeatGrid } from '../../src/analysis/BeatGridAnalyzer'
import { analyzePcm } from '../../src/analysis/analyzePcm'
import { PEAK_HOPS } from '../../src/analysis/WaveformAnalyzer'

function clickTrain(bpm: number, seconds: number, sampleRate = 44100): Float32Array {
  const samples = new Float32Array(Math.floor(sampleRate * seconds))
  const period = Math.round((60 / bpm) * sampleRate)
  const click = Math.floor(sampleRate * 0.004)
  for (let start = 0; start + click < samples.length; start += period) {
    for (let i = 0; i < click; i += 1) {
      samples[start + i] = 1 - i / click
    }
  }
  return samples
}

describe('detectBpm', () => {
  it('estimates 120 BPM from a click track', () => {
    const mono = clickTrain(120, 8)
    const estimate = detectBpm(mono, 44100)
    expect(Math.abs((estimate?.bpm ?? 0) - 120)).toBeLessThan(2)
  })

  it('skips clips that are too short', () => {
    expect(detectBpm(new Float32Array(1000), 44100)).toBeUndefined()
  })
})

describe('buildBeatGrid', () => {
  it('places the first beat near the opening click', () => {
    const sampleRate = 44100
    const mono = clickTrain(120, 8, sampleRate)
    const grid = buildBeatGrid(mono, sampleRate, 120, mono.length / sampleRate)
    expect(grid.beats.length).toBeGreaterThan(10)
    const first = grid.beats[0]
    const second = grid.beats[1]
    expect(first).toBeDefined()
    expect(second).toBeDefined()
    expect(second - first).toBeCloseTo(0.5, 1)
  })
})

describe('analyzePcm', () => {
  it('returns multi-resolution peaks and a beat grid', () => {
    const mono = clickTrain(128, 6)
    const result = analyzePcm({ sampleRate: 44100, channels: [mono] })
    expect(result.waveform.levels.map((level) => level.samplesPerBucket)).toEqual([...PEAK_HOPS])
    expect(result.waveform.peaks.length).toBeGreaterThan(0)
    expect(Math.abs((result.bpm ?? 0) - 128)).toBeLessThan(2)
    expect(result.beatGrid?.beats.length).toBeGreaterThan(0)
    expect(result.loudness).toBeGreaterThan(-120)
  })
})
