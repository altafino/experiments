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

  reset(durationSeconds: number): void {
    this.playing = false
    this.durationSeconds = Math.max(0, durationSeconds)
    this.startContextTime = 0
    this.startPositionSeconds = 0
    this.cuePointSeconds = 0
    this.playbackRate = 1
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

  rate(): number {
    return this.playbackRate
  }

  setPlaybackRate(rate: number): void {
    this.playbackRate = rate > 0 ? rate : 1
  }

  getPosition(now: number): number {
    if (!this.playing) {
      return this.startPositionSeconds
    }
    const elapsed = (now - this.startContextTime) * this.playbackRate
    return clamp(this.startPositionSeconds + elapsed, 0, this.durationSeconds)
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
