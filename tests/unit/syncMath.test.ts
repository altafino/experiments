import { describe, expect, it } from 'vitest'
import {
  beatPhase,
  phaseRateMultiplier,
  rangeForTempoPercent,
  SYNC_PHASE_DEADZONE,
  syncPlaybackRate,
  tempoPercentFromRate,
  wrappedPhaseError,
} from '../../src/domain/sync'

describe('sync math', () => {
  it.each([
    { position: 0, firstBeat: 0, bpm: 120, expected: 0 },
    { position: 0.5, firstBeat: 0, bpm: 120, expected: 0 },
    { position: 0.25, firstBeat: 0, bpm: 120, expected: 0.5 },
    { position: 0.1, firstBeat: 0.1, bpm: 120, expected: 0 },
  ])('beatPhase($position, $firstBeat, $bpm)', ({ position, firstBeat, bpm, expected }) => {
    expect(beatPhase(position, firstBeat, bpm)).toBeCloseTo(expected, 8)
  })

  it.each([
    { master: 0, slave: 0, expected: 0 },
    { master: 0, slave: 0.1, expected: 0.1 },
    { master: 0.1, slave: 0, expected: -0.1 },
    { master: 0, slave: 0.9, expected: -0.1 },
    { master: 0.9, slave: 0.1, expected: 0.2 },
  ])('wrappedPhaseError($master, $slave)', ({ master, slave, expected }) => {
    expect(wrappedPhaseError(master, slave)).toBeCloseTo(expected, 8)
  })

  it('matches 126 BPM master to a 128 BPM slave without seeking', () => {
    const rate = syncPlaybackRate(126, 128)
    expect(rate).toBeCloseTo(126 / 128, 8)
    expect(tempoPercentFromRate(rate)).toBeCloseTo((126 / 128 - 1) * 100, 8)
  })

  it.each([
    { percent: 0, range: 6 },
    { percent: 6, range: 6 },
    { percent: 8, range: 10 },
    { percent: -15, range: 16 },
    { percent: 20, range: 24 },
  ])('rangeForTempoPercent($percent) is $range', ({ percent, range }) => {
    expect(rangeForTempoPercent(percent)).toBe(range)
  })

  it('holds rate when phase error is inside the deadzone', () => {
    expect(phaseRateMultiplier(SYNC_PHASE_DEADZONE / 2)).toBe(1)
    expect(phaseRateMultiplier(-SYNC_PHASE_DEADZONE / 2)).toBe(1)
  })

  it('slows a slave that is ahead and speeds one that is behind', () => {
    expect(phaseRateMultiplier(0.1)).toBeLessThan(1)
    expect(phaseRateMultiplier(-0.1)).toBeGreaterThan(1)
  })
})
