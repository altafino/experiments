import { describe, expect, it } from 'vitest'
import { renderScratch, ScratchReader } from '../../src/audio/worklets/scratchReader'

describe('ScratchReader', () => {
  it('holds the read head when velocity is zero', () => {
    const source = new Float32Array([0.1, 0.8, 0.3])
    const output = renderScratch(source, 0, 4, 1)
    expect(output[0]).toBeCloseTo(0.8, 5)
    expect(output[3]).toBeCloseTo(0.8, 5)
  })

  it('reads backwards when velocity is negative', () => {
    const source = new Float32Array([0, 0.25, 0.5, 0.75, 1])
    const reader = new ScratchReader()
    reader.load([source])
    reader.start(4)
    reader.setPosition(4, -1)
    const output = new Float32Array(4)
    reader.process(output, output, 4)
    expect(output[0]).toBeCloseTo(1, 5)
    expect(output[3]).toBeCloseTo(0.25, 5)
  })

  it('wraps the read head inside an active loop', () => {
    const source = new Float32Array(16)
    for (let i = 0; i < source.length; i += 1) {
      source[i] = i
    }
    const reader = new ScratchReader()
    reader.load([source])
    reader.setLoop(2, 6)
    reader.start(5)
    reader.setPosition(5, 1)
    const output = new Float32Array(4)
    reader.process(output, output, 4)
    expect(output[0]).toBeCloseTo(5, 5)
    expect(output[1]).toBeCloseTo(2, 5)
  })
})
