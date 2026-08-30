import { clamp } from '../../domain/timecode'
import {
  JOG_COAST_STOP,
  JOG_NUDGE_RADIANS,
  coastOffsetSeconds,
  coastVelocity,
} from '../../domain/jog'

/**
 * Vinyl vs CDJ mode, pointer velocity, and post-release coast math.
 * Audio sample interpolation stays in the worklet; this only estimates
 * velocity from clocked positions.
 */
export class JogEngine {
  private vinyl = false
  private lastTime = 0
  private lastPosition = 0
  private currentVelocity = 0
  private hasSample = false
  private coasting = false
  private coastStartTime = 0
  private coastStartPosition = 0
  private coastInitialVelocity = 0
  private lastCoastVelocity = 0
  private durationSeconds = 0
  private nudgeAccum = 0

  reset(durationSeconds = 0): void {
    this.lastTime = 0
    this.lastPosition = 0
    this.currentVelocity = 0
    this.hasSample = false
    this.coasting = false
    this.durationSeconds = Math.max(0, durationSeconds)
    this.nudgeAccum = 0
  }

  setVinyl(enabled: boolean): void {
    this.vinyl = enabled
  }

  isVinyl(): boolean {
    return this.vinyl
  }

  velocity(): number {
    if (this.coasting) {
      return this.lastCoastVelocity
    }
    return this.currentVelocity
  }

  isCoasting(): boolean {
    return this.coasting
  }

  touchStart(now: number, positionSeconds: number): void {
    this.coasting = false
    this.hasSample = true
    this.lastTime = now
    this.lastPosition = positionSeconds
    this.currentVelocity = 0
  }

  touchMove(now: number, positionSeconds: number): number {
    const dt = now - this.lastTime
    if (this.hasSample && dt > 1e-4) {
      this.currentVelocity = (positionSeconds - this.lastPosition) / dt
    }
    this.hasSample = true
    this.lastTime = now
    this.lastPosition = positionSeconds
    return this.currentVelocity
  }

  touchEnd(): number {
    const velocity = this.currentVelocity
    this.hasSample = false
    this.currentVelocity = 0
    return velocity
  }

  startCoast(now: number, positionSeconds: number, velocity: number): boolean {
    if (Math.abs(velocity) < JOG_COAST_STOP) {
      this.coasting = false
      return false
    }
    this.coasting = true
    this.coastStartTime = now
    this.coastStartPosition = positionSeconds
    this.coastInitialVelocity = velocity
    this.currentVelocity = 0
    this.hasSample = false
    this.lastCoastVelocity = velocity
    return true
  }

  coastPosition(now: number): number | undefined {
    if (!this.coasting) {
      return undefined
    }
    const elapsed = Math.max(0, now - this.coastStartTime)
    const velocity = coastVelocity(this.coastInitialVelocity, elapsed)
    this.lastCoastVelocity = this.coasting && Math.abs(velocity) >= JOG_COAST_STOP ? velocity : 0
    const position = clamp(
      this.coastStartPosition + coastOffsetSeconds(this.coastInitialVelocity, elapsed),
      0,
      this.durationSeconds,
    )
    if (Math.abs(velocity) < JOG_COAST_STOP) {
      this.coasting = false
    }
    return position
  }

  stopCoast(): void {
    this.coasting = false
    this.lastCoastVelocity = 0
  }

  takeNudge(deltaRadians: number): 1 | -1 | 0 {
    this.nudgeAccum += deltaRadians
    if (this.nudgeAccum >= JOG_NUDGE_RADIANS) {
      this.nudgeAccum = 0
      return 1
    }
    if (this.nudgeAccum <= -JOG_NUDGE_RADIANS) {
      this.nudgeAccum = 0
      return -1
    }
    return 0
  }

  resetNudge(): void {
    this.nudgeAccum = 0
  }
}
