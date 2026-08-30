import { describe, expect, it } from 'vitest'
import { dbToLinear, eqKnobToDb, EQ_BOOST_DB, EQ_KILL_DB } from '../../src/audio/mixer/eq'

describe('eqKnobToDb', () => {
  it.each([
    { knob: 0, expected: EQ_KILL_DB },
    { knob: 0.5, expected: 0 },
    { knob: 1, expected: EQ_BOOST_DB },
    { knob: -1, expected: EQ_KILL_DB },
    { knob: 2, expected: EQ_BOOST_DB },
  ])('maps $knob to $expected dB', ({ knob, expected }) => {
    expect(eqKnobToDb(knob)).toBeCloseTo(expected)
  })
})

describe('dbToLinear', () => {
  it('kills at the EQ floor', () => {
    expect(dbToLinear(EQ_KILL_DB)).toBe(0)
  })

  it('is unity at 0 dB', () => {
    expect(dbToLinear(0)).toBeCloseTo(1)
  })

  it('boosts +6 dB to about 2x', () => {
    expect(dbToLinear(6)).toBeCloseTo(10 ** (6 / 20))
  })
})
