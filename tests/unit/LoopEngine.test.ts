import { describe, expect, it } from 'vitest'
import { LoopEngine } from '../../src/audio/deck/LoopEngine'

describe('LoopEngine', () => {
  it('arms loop in and activates on loop out', () => {
    const loops = new LoopEngine()
    loops.setIn(1, 0.02)
    expect(loops.pendingInPoint()).toBe(1)
    expect(loops.setOut(2, 0.02)).toBe(true)
    expect(loops.snapshot()).toEqual({
      startSeconds: 1,
      endSeconds: 2,
      beats: undefined,
      active: true,
    })
    expect(loops.pendingInPoint()).toBeUndefined()
  })

  it('rejects an out point that is not after in', () => {
    const loops = new LoopEngine()
    loops.setIn(2, 0.02)
    expect(loops.setOut(2.01, 0.05)).toBe(false)
    expect(loops.snapshot()).toBeUndefined()
  })

  it('toggles reloop without losing the region', () => {
    const loops = new LoopEngine()
    loops.setBeatLoop(0, 2, 4, 0.02)
    expect(loops.toggle()).toBe('exit')
    expect(loops.snapshot()?.active).toBe(false)
    expect(loops.toggle()).toBe('engage')
    expect(loops.isActive()).toBe(true)
  })

  it('halves and doubles around the in point', () => {
    const loops = new LoopEngine()
    loops.setBeatLoop(1, 3, 4, 0.02)
    expect(loops.halve(0.02)).toBe(true)
    expect(loops.snapshot()?.endSeconds).toBe(2)
    expect(loops.snapshot()?.beats).toBe(2)
    expect(loops.double(10)).toBe(true)
    expect(loops.snapshot()?.endSeconds).toBe(3)
    expect(loops.snapshot()?.beats).toBe(4)
  })
})
