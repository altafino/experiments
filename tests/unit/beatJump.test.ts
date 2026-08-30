import { describe, expect, it } from 'vitest'
import { beatJumpLabel, beatJumpSeconds, beatJumpTestId } from '../../src/domain/beatJump'

describe('beatJumpSeconds', () => {
  it('moves one beat at 120 BPM and clamps to the track', () => {
    expect(beatJumpSeconds(1, 1, 120, 8)).toBeCloseTo(1.5)
    expect(beatJumpSeconds(1, -4, 120, 8)).toBe(0)
    expect(beatJumpSeconds(7.5, 8, 120, 8)).toBe(8)
  })

  it('labels pads without a plus on negative jumps', () => {
    expect(beatJumpLabel(4)).toBe('+4')
    expect(beatJumpLabel(-8)).toBe('-8')
    expect(beatJumpTestId(-1)).toBe('beat-jump-m1')
    expect(beatJumpTestId(16)).toBe('beat-jump-p16')
  })
})
