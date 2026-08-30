import { describe, expect, it } from 'vitest'
import {
  COLOR_CENTER,
  COLOR_FX_TYPES,
  DUB_ECHO_DELAY_SECONDS,
  DUB_ECHO_FEEDBACK_MAX,
  DUB_ECHO_WET_MAX,
  HPF_MAX_HZ,
  LPF_MIN_HZ,
  NOISE_GAIN_MAX,
  colorAmount,
  colorFxLabel,
  colorFxTestId,
  dubEchoFeedback,
  dubEchoWet,
  filterCutoffHz,
  filterMode,
  isColorBypassed,
  nextColorFx,
  noiseGain,
  pitchRatio,
  type ColorFxType,
} from '../../src/domain/colorFx'

describe('colorAmount', () => {
  it.each([
    [0, -1],
    [COLOR_CENTER, 0],
    [1, 1],
    [0.25, -0.5],
    [0.75, 0.5],
  ] as const)('maps knob %d to %d', (knob, expected) => {
    expect(colorAmount(knob)).toBeCloseTo(expected)
  })

  it('clamps out of range knobs', () => {
    expect(colorAmount(-2)).toBe(-1)
    expect(colorAmount(3)).toBe(1)
  })
})

describe('isColorBypassed', () => {
  it('treats center as off', () => {
    expect(isColorBypassed(COLOR_CENTER)).toBe(true)
    expect(isColorBypassed(0.505)).toBe(true)
    expect(isColorBypassed(0.495)).toBe(true)
  })

  it('engages away from center', () => {
    expect(isColorBypassed(0)).toBe(false)
    expect(isColorBypassed(1)).toBe(false)
    expect(isColorBypassed(0.4)).toBe(false)
  })
})

describe('filterMode and cutoff', () => {
  it.each([
    [-1, 'lowpass'],
    [-0.5, 'lowpass'],
    [0, 'bypass'],
    [0.5, 'highpass'],
    [1, 'highpass'],
  ] as const)('amount %d is %s', (amount, mode) => {
    expect(filterMode(amount)).toBe(mode)
  })

  it('maps LPF from dark to open', () => {
    expect(filterCutoffHz(-1)).toBeCloseTo(LPF_MIN_HZ)
    expect(filterCutoffHz(-0.0001)).toBeGreaterThan(10_000)
  })

  it('maps HPF from open to thin', () => {
    expect(filterCutoffHz(1)).toBeCloseTo(HPF_MAX_HZ)
  })
})

describe('noise and dub echo', () => {
  it('scales noise by |amount|', () => {
    expect(noiseGain(0)).toBe(0)
    expect(noiseGain(1)).toBeCloseTo(NOISE_GAIN_MAX)
    expect(noiseGain(-1)).toBeCloseTo(NOISE_GAIN_MAX)
  })

  it('scales dub echo wet and feedback with a fixed delay', () => {
    expect(DUB_ECHO_DELAY_SECONDS).toBeCloseTo(0.14)
    expect(dubEchoWet(0)).toBe(0)
    expect(dubEchoFeedback(0)).toBe(0)
    expect(dubEchoWet(1)).toBeCloseTo(DUB_ECHO_WET_MAX)
    expect(dubEchoFeedback(-1)).toBeCloseTo(DUB_ECHO_FEEDBACK_MAX)
    expect(dubEchoFeedback(1)).toBeLessThan(1)
  })
})

describe('pitchRatio', () => {
  it.each([
    [0, 1],
    [1, 2],
    [-1, 0.5],
  ] as const)('amount %d is ratio %d', (amount, expected) => {
    expect(pitchRatio(amount)).toBeCloseTo(expected)
  })
})

describe('color FX selector', () => {
  it('cycles filter → noise → dub echo → pitch → filter', () => {
    expect(nextColorFx('filter')).toBe('noise')
    expect(nextColorFx('noise')).toBe('dubEcho')
    expect(nextColorFx('dubEcho')).toBe('pitch')
    expect(nextColorFx('pitch')).toBe('filter')
  })

  it('labels and test ids cover every type', () => {
    const labels: Record<ColorFxType, string> = {
      filter: 'Filter',
      noise: 'Noise',
      dubEcho: 'Dub Echo',
      pitch: 'Pitch',
    }
    const ids: Record<ColorFxType, string> = {
      filter: 'color-fx-filter',
      noise: 'color-fx-noise',
      dubEcho: 'color-fx-dub-echo',
      pitch: 'color-fx-pitch',
    }
    for (const type of COLOR_FX_TYPES) {
      expect(colorFxLabel(type)).toBe(labels[type])
      expect(colorFxTestId(type)).toBe(ids[type])
    }
  })
})
