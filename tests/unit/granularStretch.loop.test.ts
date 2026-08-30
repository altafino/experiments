import { describe, expect, it } from 'vitest'
import { GranularStretcher } from '../../src/audio/worklets/granularStretch'

describe('GranularStretcher loop wrap', () => {
  it('keeps the read head inside the loop instead of ending', () => {
    const source = new Float32Array(4096)
    for (let i = 0; i < source.length; i += 1) {
      source[i] = i
    }
    const stretcher = new GranularStretcher()
    stretcher.load([source])
    stretcher.setLoop(100, 200)
    stretcher.start(100)
    const left = new Float32Array(3000)
    const ended = stretcher.process(left, left, left.length, 1)
    expect(ended).toBe(false)
    const energy = left.reduce((sum, sample) => sum + Math.abs(sample), 0)
    expect(energy).toBeGreaterThan(0)
  })
})
