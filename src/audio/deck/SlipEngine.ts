import { clamp } from '../../domain/timecode'

export type SlipReason = 'loop' | 'hotCue' | 'scratch'

/**
 * Background (logical) timeline for slip. Audible transport may loop or jump;
 * this clock continues from the position captured at the first slip action.
 */
export class SlipEngine {
  private enabled = false
  private readonly reasons = new Set<SlipReason>()
  private startContextTime = 0
  private startPositionSeconds = 0
  private rate = 1
  private durationSeconds = 0
  private running = false

  reset(): void {
    this.enabled = false
    this.discard()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (!enabled) {
      this.discard()
    }
  }

  isEnabled(): boolean {
    return this.enabled
  }

  isActive(): boolean {
    return this.reasons.size > 0
  }

  begin(
    reason: SlipReason,
    now: number,
    positionSeconds: number,
    rate: number,
    durationSeconds: number,
    running: boolean,
  ): void {
    if (!this.enabled) {
      return
    }
    if (this.reasons.size === 0) {
      this.startContextTime = now
      this.startPositionSeconds = positionSeconds
      this.rate = rate > 0 ? rate : 1
      this.durationSeconds = durationSeconds
      this.running = running
    }
    this.reasons.add(reason)
  }

  end(reason: SlipReason, now: number): number | undefined {
    if (!this.reasons.has(reason)) {
      return undefined
    }
    this.reasons.delete(reason)
    if (this.reasons.size > 0) {
      return undefined
    }
    const target = this.position(now)
    this.clearTimeline()
    return target
  }

  position(now: number): number {
    if (!this.running) {
      return this.startPositionSeconds
    }
    const elapsed = (now - this.startContextTime) * this.rate
    return clamp(this.startPositionSeconds + elapsed, 0, this.durationSeconds)
  }

  setRate(rate: number, now: number): void {
    const next = rate > 0 ? rate : 1
    if (this.isActive() && this.running) {
      this.startPositionSeconds = this.position(now)
      this.startContextTime = now
    }
    this.rate = next
  }

  pause(now: number): void {
    if (!this.isActive() || !this.running) {
      return
    }
    this.startPositionSeconds = this.position(now)
    this.running = false
  }

  resume(now: number): void {
    if (!this.isActive() || this.running) {
      return
    }
    this.startContextTime = now
    this.running = true
  }

  discard(): void {
    this.clearTimeline()
  }

  private clearTimeline(): void {
    this.reasons.clear()
    this.running = false
    this.startContextTime = 0
    this.startPositionSeconds = 0
  }
}
