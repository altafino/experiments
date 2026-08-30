import { describe, expect, it } from 'vitest'
import { crossfaderGains } from '../../src/audio/mixer/crossfaderCurves'

describe('crossfaderGains', () => {
  it('linear: full A at 0 and full B at 1', () => {
    expect(crossfaderGains(0, 'linear')).toEqual({ deck1: 1, deck2: 0 })
    expect(crossfaderGains(1, 'linear')).toEqual({ deck1: 0, deck2: 1 })
    expect(crossfaderGains(0.5, 'linear').deck1).toBeCloseTo(0.5)
    expect(crossfaderGains(0.5, 'linear').deck2).toBeCloseTo(0.5)
  })

  it('equal power: constant-power center', () => {
    const center = crossfaderGains(0.5, 'equalPower')
    expect(center.deck1).toBeCloseTo(Math.SQRT1_2)
    expect(center.deck2).toBeCloseTo(Math.SQRT1_2)
    expect(center.deck1 ** 2 + center.deck2 ** 2).toBeCloseTo(1)
    expect(crossfaderGains(0, 'equalPower')).toEqual({ deck1: 1, deck2: 0 })
  })

  it('sharp: holds unity then cuts through a silent center', () => {
    expect(crossfaderGains(0.2, 'sharp')).toEqual({ deck1: 1, deck2: 0 })
    expect(crossfaderGains(0.8, 'sharp')).toEqual({ deck1: 0, deck2: 1 })
    expect(crossfaderGains(0.5, 'sharp')).toEqual({ deck1: 0, deck2: 0 })
  })
})
