import { describe, expect, it } from 'vitest'
import { CUE_MIX_CUE, CUE_MIX_MASTER, cueMixGains } from '../../src/domain/cue'
import { emptyChannelMix, emptyMixerState } from '../../src/domain/MixerState'

describe('cueMixGains', () => {
  it.each([
    [CUE_MIX_CUE, 1, 0],
    [0.5, Math.SQRT1_2, Math.SQRT1_2],
    [CUE_MIX_MASTER, 0, 1],
  ] as const)('at mix %d is cue %d / master %d', (mix, cue, master) => {
    const gains = cueMixGains(mix)
    expect(gains.cue).toBeCloseTo(cue)
    expect(gains.master).toBeCloseTo(master)
  })

  it('clamps out of range mix values', () => {
    expect(cueMixGains(-1)).toEqual(cueMixGains(0))
    expect(cueMixGains(2)).toEqual(cueMixGains(1))
  })

  it('is equal-power across the blend', () => {
    for (const mix of [0, 0.25, 0.5, 0.75, 1]) {
      const { cue, master } = cueMixGains(mix)
      expect(cue * cue + master * master).toBeCloseTo(1)
    }
  })
})

describe('mixer cue defaults', () => {
  it('starts with PFL off and phones hearing master', () => {
    const mixer = emptyMixerState()
    expect(emptyChannelMix().cue).toBe(false)
    expect(mixer.channels[1].cue).toBe(false)
    expect(mixer.channels[2].cue).toBe(false)
    expect(mixer.cueMix).toBe(CUE_MIX_MASTER)
    expect(mixer.phonesLevel).toBe(1)
  })
})
