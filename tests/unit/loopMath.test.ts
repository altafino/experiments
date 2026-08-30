import { describe, expect, it } from 'vitest'
import {
  BEAT_LOOP_1,
  BEAT_LOOP_4,
  beatLoopEnd,
  minLoopSeconds,
  wrapIntoLoop,
} from '../../src/domain/loop'

describe('loop math', () => {
  it.each([
    { position: 2, start: 2, end: 4, expected: 2 },
    { position: 3.5, start: 2, end: 4, expected: 3.5 },
    { position: 4, start: 2, end: 4, expected: 2 },
    { position: 6, start: 2, end: 4, expected: 2 },
    { position: 5, start: 2, end: 4, expected: 3 },
    { position: 0.5, start: 1, end: 2, expected: 1.5 },
  ])('wrapIntoLoop($position, $start, $end)', ({ position, start, end, expected }) => {
    expect(wrapIntoLoop(position, start, end)).toBeCloseTo(expected, 8)
  })

  it('builds a 4-beat loop end from 120 BPM', () => {
    expect(beatLoopEnd(0, BEAT_LOOP_4, 120, 60)).toBeCloseTo(2, 8)
    expect(beatLoopEnd(1, BEAT_LOOP_1, 120, 60)).toBeCloseTo(1.5, 8)
  })

  it('clamps a beat loop to the track duration', () => {
    expect(beatLoopEnd(9, BEAT_LOOP_4, 120, 10)).toBe(10)
  })

  it('uses a 1/32-beat minimum when BPM is known', () => {
    expect(minLoopSeconds(120)).toBeCloseTo(60 / 120 / 32, 8)
  })
})
