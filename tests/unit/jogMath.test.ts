import { describe, expect, it } from 'vitest'
import { coastOffsetSeconds, radiansToSeconds, wrapAngleDelta } from '../../src/domain/jog'

describe('jog math', () => {
  it('maps a full revolution to 1.8 seconds of audio', () => {
    expect(radiansToSeconds(Math.PI * 2)).toBeCloseTo(1.8, 8)
  })

  it('unwraps angle deltas across the ±π seam', () => {
    expect(wrapAngleDelta(3, -3)).toBeCloseTo(Math.PI * 2 - 6, 8)
  })

  it('integrates decaying coast velocity', () => {
    expect(coastOffsetSeconds(1, 0)).toBeCloseTo(0, 8)
    expect(coastOffsetSeconds(1, 0.12)).toBeGreaterThan(0.07)
    expect(coastOffsetSeconds(1, 0.12)).toBeLessThan(0.12)
  })
})
