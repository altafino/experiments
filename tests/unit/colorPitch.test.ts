import { describe, expect, it } from 'vitest'
import { ColorPitchShifter } from '../../src/audio/worklets/colorPitch'

describe('ColorPitchShifter', () => {
  it('emits finite samples for a DC input', () => {
    const shifter = new ColorPitchShifter()
    const frames = 4096
    const input = new Float32Array(frames).fill(0.25)
    const outputL = new Float32Array(frames)
    const outputR = new Float32Array(frames)

    shifter.process(input, input, outputL, outputR, frames, 1)

    expect(outputL.every(Number.isFinite)).toBe(true)
    expect(outputR.every(Number.isFinite)).toBe(true)
  })

  it('passes energy after grain warmup at unity ratio', () => {
    const shifter = new ColorPitchShifter()
    const frames = 8192
    const input = new Float32Array(frames).fill(0.4)
    const outputL = new Float32Array(frames)
    const outputR = new Float32Array(frames)

    shifter.process(input, input, outputL, outputR, frames, 1)

    let energy = 0
    for (let i = 2048; i < frames; i += 1) {
      energy += Math.abs(outputL[i] ?? 0)
    }
    expect(energy).toBeGreaterThan(100)
  })
})
