import { describe, expect, it } from 'vitest'
import { extractPeaks } from '../../src/audio/waveform/extractPeaks'

function fakeBuffer(channels: Float32Array[]): {
  numberOfChannels: number
  length: number
  getChannelData(channel: number): Float32Array
} {
  const length = channels[0]?.length ?? 0
  return {
    numberOfChannels: channels.length,
    length,
    getChannelData(channel: number): Float32Array {
      const data = channels[channel]
      if (!data) {
        throw new Error(`missing channel ${channel}`)
      }
      return data
    },
  }
}

describe('extractPeaks', () => {
  it('returns an empty array for empty audio', () => {
    expect(extractPeaks(fakeBuffer([new Float32Array(0)])).length).toBe(0)
  })

  it('captures a loud spike in the correct bucket', () => {
    const samples = new Float32Array(16)
    samples[10] = 0.8
    const peaks = extractPeaks(fakeBuffer([samples]), 4)

    expect(peaks.length).toBe(4)
    expect(peaks[0]).toBe(0)
    expect(peaks[1]).toBe(0)
    expect(peaks[2]).toBeCloseTo(0.8)
    expect(peaks[3]).toBe(0)
  })

  it('uses the louder of two channels', () => {
    const left = new Float32Array([0.1, 0.1, 0.1, 0.1])
    const right = new Float32Array([0.1, 0.9, 0.1, 0.1])
    const peaks = extractPeaks(fakeBuffer([left, right]), 4)

    expect(peaks[1]).toBeCloseTo(0.9)
  })
})
