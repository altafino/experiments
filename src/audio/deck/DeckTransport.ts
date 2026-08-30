import { wrapIntoLoop, type LoopRegion } from '../../domain/loop'
import { clamp } from '../../domain/timecode'

export type CueAction = 'set' | 'return' | 'none'

/**
 * Clock-driven deck transport. `now` must be AudioContext.currentTime
 * (or a test double of that clock). This class is the source of truth
 * for play/pause/seek/cue position; Vue must only visualize snapshots.
 */
export class DeckTransport {
  private playing = false
  private durationSeconds = 0
  private startContextTime = 0
  private startPositionSeconds = 0
  private cuePointSeconds = 0
  private playbackRate = 1
  private loopStart: number | null = null
  private loopEnd: number | null = null

  reset(durationSeconds: number): void {
    this.playing = false
    this.durationSeconds = Math.max(0, durationSeconds)
    this.startContextTime = 0
    this.startPositionSeconds = 0
    this.cuePointSeconds = 0
    this.playbackRate = 1
    this.loopStart = null
    this.loopEnd = null
  }

  isPlaying(): boolean {
    return this.playing
  }

  duration(): number {
    return this.durationSeconds
  }

  cuePoint(): number {
    return this.cuePointSeconds
  }

  setCuePoint(positionSeconds: number): void {
    this.cuePointSeconds = clamp(positionSeconds, 0, this.durationSeconds)
  }

  rate(): number {
    return this.playbackRate
  }

  setPlaybackRate(rate: number, now: number): void {
    const next = rate > 0 ? rate : 1
    if (this.playing) {
      this.startPositionSeconds = this.getPosition(now)
      this.startContextTime = now
    }
    this.playbackRate = next
  }

  setLoop(region: LoopRegion | undefined, now: number): void {
    const current = this.getPosition(now)
    if (region && region.endSeconds > region.startSeconds) {
      this.loopStart = region.startSeconds
      this.loopEnd = region.endSeconds
      if (this.playing) {
        this.startPositionSeconds = wrapIntoLoop(current, region.startSeconds, region.endSeconds)
        this.startContextTime = now
      }
      return
    }
    this.loopStart = null
    this.loopEnd = null
    if (this.playing) {
      this.startPositionSeconds = current
      this.startContextTime = now
    }
  }

  getPosition(now: number): number {
    if (!this.playing) {
      return this.startPositionSeconds
    }
    const elapsed = (now - this.startContextTime) * this.playbackRate
    const raw = this.startPositionSeconds + elapsed
    if (this.loopStart !== null && this.loopEnd !== null) {
      return wrapIntoLoop(raw, this.loopStart, this.loopEnd)
    }
    return clamp(raw, 0, this.durationSeconds)
  }

  play(now: number): boolean {
    if (this.durationSeconds <= 0) {
      return false
    }
    if (this.startPositionSeconds >= this.durationSeconds) {
      return false
    }
    if (this.playing) {
      return true
    }
    this.startContextTime = now
    this.playing = true
    return true
  }

  pause(now: number): void {
    if (!this.playing) {
      return
    }
    this.startPositionSeconds = this.getPosition(now)
    this.playing = false
  }

  seek(positionSeconds: number, now: number): number {
    const next = clamp(positionSeconds, 0, this.durationSeconds)
    this.startPositionSeconds = next
    this.startContextTime = now
    return next
  }

  cue(now: number): CueAction {
    if (this.durationSeconds <= 0) {
      return 'none'
    }
    if (this.playing) {
      this.pause(now)
      this.seek(this.cuePointSeconds, now)
      return 'return'
    }
    this.cuePointSeconds = this.getPosition(now)
    return 'set'
  }

  notifyEnded(): void {
    this.playing = false
    this.startPositionSeconds = this.durationSeconds
  }
}
