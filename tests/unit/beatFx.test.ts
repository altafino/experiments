import { describe, expect, it } from 'vitest'
import {
  BEAT_FX_LENGTHS,
  BEAT_FX_MAX_DELAY_SECONDS,
  BEAT_FX_TYPES,
  DEFAULT_BEAT_FX_BPM,
  beatDelaySeconds,
  beatFxBpmFromDecks,
  beatFxLabel,
  beatFxLengthLabel,
  beatFxLengthTestId,
  beatFxTestId,
  beatLfoHz,
  nextBeatFx,
  type BeatFxType,
} from '../../src/domain/beatFx'

describe('beatDelaySeconds', () => {
  it('matches the 120 BPM plan example', () => {
    expect(beatDelaySeconds(120, 1)).toBeCloseTo(0.5)
    expect(beatDelaySeconds(120, 0.5)).toBeCloseTo(0.25)
    expect(beatDelaySeconds(120, 8)).toBeCloseTo(4)
  })

  it('scales with BPM', () => {
    expect(beatDelaySeconds(60, 1)).toBeCloseTo(1)
  })

  it('clamps extreme values', () => {
    expect(beatDelaySeconds(10, 8)).toBeLessThanOrEqual(BEAT_FX_MAX_DELAY_SECONDS)
    expect(beatDelaySeconds(400, 0.0625)).toBeGreaterThan(0)
  })
})

describe('beatLfoHz', () => {
  it('is one cycle per selected beat length', () => {
    expect(beatLfoHz(120, 1)).toBeCloseTo(2)
    expect(beatLfoHz(120, 0.5)).toBeCloseTo(4)
  })
})

describe('beatFxBpmFromDecks', () => {
  it('defaults to 120 when nothing is loaded', () => {
    expect(beatFxBpmFromDecks()).toBe(DEFAULT_BEAT_FX_BPM)
  })

  it('prefers the master deck BPM', () => {
    expect(
      beatFxBpmFromDecks(
        { masterDeck: true, playing: false, effectiveBpm: 128 },
        { masterDeck: false, playing: true, effectiveBpm: 100 },
      ),
    ).toBe(128)
  })

  it('uses a playing deck when there is no master BPM', () => {
    expect(
      beatFxBpmFromDecks(
        { masterDeck: false, playing: false, effectiveBpm: 90 },
        { masterDeck: false, playing: true, effectiveBpm: 110 },
      ),
    ).toBe(110)
  })

  it('falls back to any known BPM', () => {
    expect(
      beatFxBpmFromDecks(
        { masterDeck: false, playing: false, effectiveBpm: 95 },
        { masterDeck: false, playing: false },
      ),
    ).toBe(95)
  })
})

describe('beat FX selector', () => {
  it('cycles echo → reverb → flanger → echo', () => {
    expect(nextBeatFx('echo')).toBe('reverb')
    expect(nextBeatFx('reverb')).toBe('flanger')
    expect(nextBeatFx('flanger')).toBe('echo')
  })

  it('labels and test ids cover every type and beat length', () => {
    const labels: Record<BeatFxType, string> = {
      echo: 'Echo',
      reverb: 'Reverb',
      flanger: 'Flanger',
    }
    for (const type of BEAT_FX_TYPES) {
      expect(beatFxLabel(type)).toBe(labels[type])
      expect(beatFxTestId(type)).toBe(`beat-fx-${type}`)
    }
    expect(beatFxLengthLabel(0.5)).toBe('1/2')
    expect(beatFxLengthTestId(0.5)).toBe('beat-fx-beat-1-2')
    expect(BEAT_FX_LENGTHS).toHaveLength(8)
  })
})
