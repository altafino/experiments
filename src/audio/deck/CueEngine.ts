import { HOT_CUE_IDS, type HotCue, type HotCueId } from '../../domain/DeckState'

/**
 * Memory cue preview flag, hot-cue slots, and a single pending quantized jump.
 * Transport still owns the memory cue position and playhead.
 */
export class CueEngine {
  private quantize = false
  private previewing = false
  private readonly slots: Partial<Record<HotCueId, number>> = {}
  private pendingDue: number | null = null
  private pendingPosition = 0

  reset(): void {
    this.previewing = false
    this.pendingDue = null
    this.pendingPosition = 0
    for (const id of HOT_CUE_IDS) {
      delete this.slots[id]
    }
  }

  setQuantize(enabled: boolean): void {
    this.quantize = enabled
    if (!enabled) {
      this.clearPending()
    }
  }

  quantizeEnabled(): boolean {
    return this.quantize
  }

  isPreviewing(): boolean {
    return this.previewing
  }

  beginPreview(): void {
    this.previewing = true
    this.clearPending()
  }

  confirmPreview(): void {
    this.previewing = false
  }

  endPreview(): boolean {
    const was = this.previewing
    this.previewing = false
    return was
  }

  setHotCue(id: HotCueId, positionSeconds: number): void {
    this.slots[id] = positionSeconds
  }

  hotCue(id: HotCueId): number | undefined {
    return this.slots[id]
  }

  clearHotCue(id: HotCueId): void {
    delete this.slots[id]
  }

  list(): HotCue[] {
    const cues: HotCue[] = []
    for (const id of HOT_CUE_IDS) {
      const positionSeconds = this.slots[id]
      if (positionSeconds !== undefined) {
        cues.push({ id, positionSeconds })
      }
    }
    return cues
  }

  scheduleJump(dueContextTime: number, positionSeconds: number): void {
    this.pendingDue = dueContextTime
    this.pendingPosition = positionSeconds
  }

  clearPending(): void {
    this.pendingDue = null
  }

  takeDueJump(now: number): number | undefined {
    if (this.pendingDue === null || now < this.pendingDue) {
      return undefined
    }
    const position = this.pendingPosition
    this.pendingDue = null
    return position
  }
}
