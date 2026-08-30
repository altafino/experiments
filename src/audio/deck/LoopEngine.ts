import type { Loop } from '../../domain/DeckState'
import { isUsableLoop, type LoopRegion } from '../../domain/loop'

export type ReloopAction = 'engage' | 'exit' | 'none'

/**
 * Manual and beat-loop region. Transport applies wrapping; this class only
 * stores in/out points and whether the loop is engaged.
 */
export class LoopEngine {
  private pendingIn: number | undefined
  private start = 0
  private end = 0
  private beats: number | undefined
  private active = false
  private hasRegion = false

  reset(): void {
    this.pendingIn = undefined
    this.start = 0
    this.end = 0
    this.beats = undefined
    this.active = false
    this.hasRegion = false
  }

  pendingInPoint(): number | undefined {
    return this.pendingIn
  }

  snapshot(): Loop | undefined {
    if (!this.hasRegion) {
      return undefined
    }
    return {
      startSeconds: this.start,
      endSeconds: this.end,
      beats: this.beats,
      active: this.active,
    }
  }

  isActive(): boolean {
    return this.active && this.hasRegion
  }

  activeRegion(): LoopRegion | undefined {
    if (!this.isActive()) {
      return undefined
    }
    return { startSeconds: this.start, endSeconds: this.end }
  }

  setIn(positionSeconds: number, minLength: number): void {
    this.pendingIn = positionSeconds
    this.beats = undefined
    if (this.hasRegion && isUsableLoop(positionSeconds, this.end, minLength)) {
      this.start = positionSeconds
      return
    }
    if (this.hasRegion) {
      this.hasRegion = false
      this.active = false
    }
  }

  setOut(positionSeconds: number, minLength: number): boolean {
    const start = this.pendingIn ?? (this.hasRegion ? this.start : undefined)
    if (start === undefined || !isUsableLoop(start, positionSeconds, minLength)) {
      return false
    }
    this.start = start
    this.end = positionSeconds
    this.hasRegion = true
    this.active = true
    this.pendingIn = undefined
    this.beats = undefined
    return true
  }

  setBeatLoop(startSeconds: number, endSeconds: number, beats: number, minLength: number): boolean {
    if (!isUsableLoop(startSeconds, endSeconds, minLength)) {
      return false
    }
    this.start = startSeconds
    this.end = endSeconds
    this.beats = beats
    this.hasRegion = true
    this.active = true
    this.pendingIn = undefined
    return true
  }

  halve(minLength: number): boolean {
    if (!this.hasRegion) {
      return false
    }
    const nextEnd = this.start + (this.end - this.start) / 2
    if (!isUsableLoop(this.start, nextEnd, minLength)) {
      return false
    }
    this.end = nextEnd
    if (this.beats !== undefined) {
      this.beats /= 2
    }
    return true
  }

  double(durationSeconds: number): boolean {
    if (!this.hasRegion) {
      return false
    }
    const nextEnd = Math.min(this.start + (this.end - this.start) * 2, durationSeconds)
    if (nextEnd <= this.end + 1e-9) {
      return false
    }
    this.end = nextEnd
    if (this.beats !== undefined) {
      this.beats *= 2
    }
    return true
  }

  toggle(): ReloopAction {
    if (!this.hasRegion) {
      return 'none'
    }
    this.active = !this.active
    this.pendingIn = undefined
    return this.active ? 'engage' : 'exit'
  }
}
