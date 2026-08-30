import { describe, expect, it } from 'vitest'
import {
  isAtCue,
  nearestBeatSeconds,
  nextBeatSeconds,
  secondsUntilNextBeat,
} from '../../src/domain/quantize'

describe('quantize math', () => {
  it.each([
    { position: 0, cue: 0, at: true },
    { position: 0.04, cue: 0, at: true },
    { position: 0.2, cue: 0, at: false },
    { position: 12.5, cue: 12.5, at: true },
  ])('isAtCue($position, $cue)', ({ position, cue, at }) => {
    expect(isAtCue(position, cue)).toBe(at)
  })

  it.each([
    { position: 0, expected: 0 },
    { position: 0.1, expected: 0 },
    { position: 0.3, expected: 0.5 },
    { position: 1.24, expected: 1 },
    { position: 1.26, expected: 1.5 },
  ])('nearestBeatSeconds($position) at 120 BPM', ({ position, expected }) => {
    expect(nearestBeatSeconds(position, 0, 120, 60)).toBeCloseTo(expected, 8)
  })

  it('clamps quantized points to the track duration', () => {
    expect(nearestBeatSeconds(10, 0, 120, 2)).toBe(2)
    expect(nearestBeatSeconds(-1, 0, 120, 8)).toBe(0)
  })

  it('treats an on-beat position as the next execution time', () => {
    expect(nextBeatSeconds(1, 0, 120, 60)).toBeCloseTo(1, 8)
    expect(secondsUntilNextBeat(1, 0, 120, 60)).toBeCloseTo(0, 8)
  })

  it('waits until the following beat when off-grid', () => {
    expect(nextBeatSeconds(0.1, 0, 120, 60)).toBeCloseTo(0.5, 8)
    expect(secondsUntilNextBeat(0.1, 0, 120, 60)).toBeCloseTo(0.4, 8)
  })
})
