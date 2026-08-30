import { JOG_COAST_STOP, JOG_COAST_TAU } from '../../domain/jog'

function interpolate(channel: Float32Array, position: number): number {
  if (channel.length === 0 || position < 0 || position >= channel.length) {
    return 0
  }
  const index = Math.floor(position)
  const next = index + 1
  const frac = position - index
  const a = channel[index] ?? 0
  if (next >= channel.length) {
    return a
  }
  const b = channel[next] ?? 0
  return a + (b - a) * frac
}

/**
 * Sample-accurate scratch read head. Velocity is source samples per output
 * sample (1 = playback, 0 = hold, negative = reverse).
 */
export class ScratchReader {
  private channels: Float32Array[] = []
  private readPos = 0
  private velocity = 0
  private active = false
  private looping = false
  private loopStart = 0
  private loopEnd = 0
  private coasting = false
  private sampleRate = 44100

  load(channels: Float32Array[]): void {
    this.channels = channels
    this.stop()
  }

  setSampleRate(sampleRate: number): void {
    this.sampleRate = sampleRate > 0 ? sampleRate : 44100
  }

  start(offsetSamples: number): void {
    this.readPos = offsetSamples
    this.velocity = 0
    this.active = true
    this.coasting = false
    this.wrap()
  }

  setPosition(positionSamples: number, velocity: number): void {
    this.readPos = positionSamples
    this.velocity = velocity
    this.coasting = false
    this.wrap()
  }

  startCoast(velocity: number): void {
    this.velocity = velocity
    this.coasting = true
    this.active = true
  }

  setLoop(startSamples: number, endSamples: number): void {
    if (endSamples > startSamples) {
      this.looping = true
      this.loopStart = startSamples
      this.loopEnd = endSamples
      this.wrap()
      return
    }
    this.clearLoop()
  }

  clearLoop(): void {
    this.looping = false
    this.loopStart = 0
    this.loopEnd = 0
  }

  stop(): void {
    this.active = false
    this.coasting = false
    this.velocity = 0
  }

  isActive(): boolean {
    return this.active
  }

  position(): number {
    return this.readPos
  }

  /**
   * Returns true once when the head settles (coast done) or hits the buffer end.
   */
  process(outputL: Float32Array, outputR: Float32Array, frames: number): boolean {
    const left = this.channels[0]
    const right = this.channels[1] ?? left
    let settled = false
    const decay = Math.exp(-1 / (JOG_COAST_TAU * this.sampleRate))
    for (let i = 0; i < frames; i += 1) {
      if (!this.active || !left) {
        outputL[i] = 0
        if (outputR !== outputL) {
          outputR[i] = 0
        }
        continue
      }
      this.wrap()
      outputL[i] = interpolate(left, this.readPos)
      if (outputR !== outputL) {
        outputR[i] = right ? interpolate(right, this.readPos) : outputL[i]
      }
      if (this.coasting) {
        this.velocity *= decay
        if (Math.abs(this.velocity) < JOG_COAST_STOP) {
          this.active = false
          this.coasting = false
          this.velocity = 0
          settled = true
        }
      }
      this.readPos += this.velocity
      const length = left.length
      if (!this.looping && (this.readPos < 0 || this.readPos >= length)) {
        this.readPos = this.readPos < 0 ? 0 : length
        this.active = false
        this.coasting = false
        settled = true
      }
    }
    return settled
  }

  private wrap(): void {
    if (!this.looping) {
      return
    }
    const length = this.loopEnd - this.loopStart
    if (!(length > 0)) {
      return
    }
    let offset = (this.readPos - this.loopStart) % length
    if (offset < 0) {
      offset += length
    }
    this.readPos = this.loopStart + offset
  }
}

export function renderScratch(
  source: Float32Array,
  velocity: number,
  outputFrames: number,
  offsetSamples = 0,
): Float32Array {
  const reader = new ScratchReader()
  reader.load([source])
  reader.start(offsetSamples)
  reader.setPosition(offsetSamples, velocity)
  const output = new Float32Array(outputFrames)
  reader.process(output, output, outputFrames)
  return output
}
