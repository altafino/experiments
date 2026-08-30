import { describe, expect, it } from 'vitest'
import { CueEngine } from '../../src/audio/deck/CueEngine'

describe('CueEngine', () => {
  it('stores and lists hot cues without changing other slots', () => {
    const cues = new CueEngine()
    cues.setHotCue('A', 1.25)
    cues.setHotCue('C', 8)
    expect(cues.list()).toEqual([
      { id: 'A', positionSeconds: 1.25 },
      { id: 'C', positionSeconds: 8 },
    ])
    cues.clearHotCue('A')
    expect(cues.hotCue('A')).toBeUndefined()
    expect(cues.hotCue('C')).toBe(8)
  })

  it('releases a pending jump only after the due clock time', () => {
    const cues = new CueEngine()
    cues.scheduleJump(2, 12)
    expect(cues.takeDueJump(1.9)).toBeUndefined()
    expect(cues.takeDueJump(2)).toBe(12)
    expect(cues.takeDueJump(3)).toBeUndefined()
  })

  it('clears hot cues and preview on reset', () => {
    const cues = new CueEngine()
    cues.setHotCue('B', 4)
    cues.beginPreview()
    cues.scheduleJump(1, 4)
    cues.reset()
    expect(cues.list()).toEqual([])
    expect(cues.isPreviewing()).toBe(false)
    expect(cues.takeDueJump(9)).toBeUndefined()
  })
})
