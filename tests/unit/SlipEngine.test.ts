import { describe, expect, it } from 'vitest'
import { SlipEngine } from '../../src/audio/deck/SlipEngine'

describe('SlipEngine', () => {
  it('does not run until enabled', () => {
    const slip = new SlipEngine()
    slip.begin('loop', 0, 1, 1, 10, true)
    expect(slip.isActive()).toBe(false)
    expect(slip.end('loop', 2)).toBeUndefined()
  })

  it('advances a linear timeline while a loop is audible', () => {
    const slip = new SlipEngine()
    slip.setEnabled(true)
    slip.begin('loop', 0, 1.2, 1, 10, true)
    expect(slip.position(2)).toBeCloseTo(3.2, 8)
    expect(slip.end('loop', 2)).toBeCloseTo(3.2, 8)
    expect(slip.isActive()).toBe(false)
  })

  it('keeps the background clock until the last reason ends', () => {
    const slip = new SlipEngine()
    slip.setEnabled(true)
    slip.begin('loop', 0, 0, 1, 10, true)
    slip.begin('hotCue', 0.5, 4, 1, 10, true)
    expect(slip.end('hotCue', 1)).toBeUndefined()
    expect(slip.isActive()).toBe(true)
    expect(slip.end('loop', 2)).toBeCloseTo(2, 8)
  })

  it('freezes while paused and resumes from the frozen point', () => {
    const slip = new SlipEngine()
    slip.setEnabled(true)
    slip.begin('loop', 0, 0, 1, 10, true)
    slip.pause(1)
    expect(slip.position(3)).toBeCloseTo(1, 8)
    slip.resume(3)
    expect(slip.position(4)).toBeCloseTo(2, 8)
  })

  it('re-anchors when playback rate changes', () => {
    const slip = new SlipEngine()
    slip.setEnabled(true)
    slip.begin('loop', 0, 0, 1, 10, true)
    slip.setRate(2, 1)
    expect(slip.position(2)).toBeCloseTo(3, 8)
  })

  it('discards the background timeline when slip is turned off', () => {
    const slip = new SlipEngine()
    slip.setEnabled(true)
    slip.begin('loop', 0, 0, 1, 10, true)
    slip.setEnabled(false)
    expect(slip.isActive()).toBe(false)
    expect(slip.end('loop', 2)).toBeUndefined()
  })
})
