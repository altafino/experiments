/**
 * Clock used by deck transport. Production code must wrap AudioContext.
 * Tests may supply a deterministic fake.
 */
export interface Clock {
  readonly currentTime: number
}

/**
 * AudioClock is the authoritative time source for playback position.
 * Do not substitute performance.now() or Date.now() for transport math.
 */
export class AudioClock implements Clock {
  private readonly context: BaseAudioContext

  constructor(context: BaseAudioContext) {
    this.context = context
  }

  get currentTime(): number {
    return this.context.currentTime
  }
}
