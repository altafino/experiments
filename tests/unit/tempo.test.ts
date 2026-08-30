import { describe, expect, it } from 'vitest'
import { TempoEngine } from '../../src/audio/deck/TempoEngine'
import {
  clampTempoPercent,
  effectiveBpm,
  formatTempoPercent,
  PITCH_BEND_PERCENT,
  playbackRateFromTempo,
  tempoRangeLabel,
} from '../../src/domain/tempo'

describe('playbackRateFromTempo', () => {
  it.each([
    { name: 'unity at 0%', percent: 0, bend: 0 as const, expected: 1 },
    { name: 'plus 6%', percent: 6, bend: 0 as const, expected: 1.06 },
    { name: 'minus 10%', percent: -10, bend: 0 as const, expected: 0.9 },
    {
      name: 'pitch bend up overlays the slider',
      percent: 0,
      bend: 1 as const,
      expected: 1 + PITCH_BEND_PERCENT / 100,
    },
    {
      name: 'pitch bend down while tempo is up',
      percent: 6,
      bend: -1 as const,
      expected: 1.06 * (1 - PITCH_BEND_PERCENT / 100),
    },
  ])('$name', ({ percent, bend, expected }) => {
    expect(playbackRateFromTempo(percent, bend)).toBeCloseTo(expected, 8)
  })
})

describe('clampTempoPercent', () => {
  it('keeps a value inside the selected range', () => {
    expect(clampTempoPercent(8, 6)).toBe(6)
    expect(clampTempoPercent(-20, 16)).toBe(-16)
    expect(clampTempoPercent(3, 10)).toBe(3)
  })
})

describe('effectiveBpm', () => {
  it('scales original BPM by playback rate', () => {
    expect(effectiveBpm(120, 1.06)).toBeCloseTo(127.2, 8)
    expect(effectiveBpm(undefined, 1.5)).toBeUndefined()
  })
})

describe('tempo labels', () => {
  it('formats signed percents and range names', () => {
    expect(formatTempoPercent(0)).toBe('0.00%')
    expect(formatTempoPercent(6)).toBe('+6.00%')
    expect(formatTempoPercent(-6)).toBe('-6.00%')
    expect(tempoRangeLabel(24)).toBe('WIDE')
  })
})

describe('TempoEngine', () => {
  it('clamps the slider when the range shrinks', () => {
    const tempo = new TempoEngine()
    tempo.setRange(16)
    tempo.setPercent(12)
    tempo.setRange(6)
    expect(tempo.tempoPercent()).toBe(6)
    expect(tempo.playbackRate()).toBeCloseTo(1.06, 8)
  })

  it('keeps the slider when widening the range', () => {
    const tempo = new TempoEngine()
    tempo.setPercent(6)
    tempo.setRange(16)
    expect(tempo.tempoPercent()).toBe(6)
  })

  it('toggles master tempo without changing playback rate', () => {
    const tempo = new TempoEngine()
    tempo.setPercent(6)
    expect(tempo.masterTempo()).toBe(false)
    tempo.setMasterTempo(true)
    expect(tempo.masterTempo()).toBe(true)
    expect(tempo.playbackRate()).toBeCloseTo(1.06, 8)
  })
})
