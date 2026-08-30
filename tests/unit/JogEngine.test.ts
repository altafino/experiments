import { describe, expect, it } from 'vitest'
import { JogEngine } from '../../src/audio/deck/JogEngine'

describe('JogEngine', () => {
  it('estimates velocity from successive touch samples', () => {
    const jog = new JogEngine()
    jog.reset(10)
    jog.touchStart(0, 1)
    expect(jog.touchMove(0.5, 2)).toBeCloseTo(2, 8)
  })

  it('coasts forward then stops', () => {
    const jog = new JogEngine()
    jog.reset(10)
    expect(jog.startCoast(0, 1, 2)).toBe(true)
    const mid = jog.coastPosition(0.05)
    expect(mid).toBeGreaterThan(1)
    expect(jog.isCoasting()).toBe(true)
    const end = jog.coastPosition(2)
    expect(end).toBeGreaterThan(1.1)
    expect(jog.isCoasting()).toBe(false)
  })

  it('emits a nudge after accumulated CDJ rotation', () => {
    const jog = new JogEngine()
    expect(jog.takeNudge(0.02)).toBe(0)
    expect(jog.takeNudge(0.03)).toBe(1)
  })
})
