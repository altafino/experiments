import { describe, expect, it } from 'vitest'
import { GRAIN_SIZE, renderGranularStretch } from '../../src/audio/worklets/granularStretch'

function sine(frequency: number, seconds: number, sampleRate: number): Float32Array {
  const samples = new Float32Array(Math.floor(sampleRate * seconds))
  const omega = (2 * Math.PI * frequency) / sampleRate
  for (let i = 0; i < samples.length; i += 1) {
    samples[i] = Math.sin(omega * i)
  }
  return samples
}

function estimatedHz(samples: Float32Array, sampleRate: number): number {
  let crossings = 0
  for (let i = 1; i < samples.length; i += 1) {
    const previous = samples[i - 1] ?? 0
    const current = samples[i] ?? 0
    if ((previous < 0 && current >= 0) || (previous >= 0 && current < 0)) {
      crossings += 1
    }
  }
  const duration = samples.length / sampleRate
  return duration > 0 ? crossings / 2 / duration : 0
}

describe('granular stretch', () => {
  it('keeps pitch near the source frequency when rate increases', () => {
    const sampleRate = 44100
    const frequency = 440
    const source = sine(frequency, 1.2, sampleRate)
    const rate = 1.5
    const outputFrames = Math.floor(source.length / rate)
    const stretched = renderGranularStretch(source, rate, outputFrames)
    const start = GRAIN_SIZE
    const end = stretched.length - GRAIN_SIZE
    const mid = stretched.subarray(start, Math.max(start + 1, end))
    const hz = estimatedHz(mid, sampleRate)
    expect(hz).toBeGreaterThan(frequency - 40)
    expect(hz).toBeLessThan(frequency + 40)
  })

  it('does not behave like naive resampling (which would pitch up)', () => {
    const sampleRate = 44100
    const frequency = 440
    const source = sine(frequency, 1.2, sampleRate)
    const rate = 1.5
    const outputFrames = Math.floor(source.length / rate)
    const stretched = renderGranularStretch(source, rate, outputFrames)
    const start = GRAIN_SIZE
    const end = stretched.length - GRAIN_SIZE
    const hz = estimatedHz(stretched.subarray(start, Math.max(start + 1, end)), sampleRate)
    expect(hz).toBeLessThan(frequency * rate - 60)
  })
})
