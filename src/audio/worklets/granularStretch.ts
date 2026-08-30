export const GRAIN_SIZE = 1024
export const SYNTH_HOP = 512

function hannWindow(size: number): Float32Array {
  const window = new Float32Array(size)
  const denom = size <= 1 ? 1 : size - 1
  for (let i = 0; i < size; i += 1) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / denom)
  }
  return window
}

function sampleAt(channel: Float32Array, position: number): number {
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
 * Overlap-add granular stretcher. Output is generated at original pitch while
 * the read head advances at `rate` (tempo). Safe to call from AudioWorklet.
 */
export class GranularStretcher {
  private channels: Float32Array[] = []
  private readonly window = hannWindow(GRAIN_SIZE)
  private readonly olaLeft = new Float32Array(GRAIN_SIZE)
  private readonly olaRight = new Float32Array(GRAIN_SIZE)
  private readPos = 0
  private hopCountdown = 0
  private running = false
  private endedSent = false
  private looping = false
  private loopStart = 0
  private loopEnd = 0

  load(channels: Float32Array[]): void {
    this.channels = channels
    this.clearLoop()
    this.stop()
  }

  start(offsetSamples: number): void {
    this.readPos = offsetSamples > 0 ? offsetSamples : 0
    if (this.looping) {
      this.readPos = this.wrapRead(this.readPos)
    }
    this.running = true
    this.endedSent = false
    this.olaLeft.fill(0)
    this.olaRight.fill(0)
    this.addGrain()
    this.hopCountdown = SYNTH_HOP
  }

  setLoop(startSamples: number, endSamples: number): void {
    if (endSamples > startSamples) {
      this.looping = true
      this.loopStart = startSamples
      this.loopEnd = endSamples
      this.readPos = this.wrapRead(this.readPos)
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
    this.running = false
    this.olaLeft.fill(0)
    this.olaRight.fill(0)
    this.hopCountdown = 0
  }

  /**
   * Fills `frames` of stereo output. Returns true once when the read head
   * passes the end of the buffer.
   */
  process(outputL: Float32Array, outputR: Float32Array, frames: number, rate: number): boolean {
    const safeRate = rate > 0 ? rate : 1
    let justEnded = false
    for (let i = 0; i < frames; i += 1) {
      if (!this.running) {
        outputL[i] = 0
        if (outputR !== outputL) {
          outputR[i] = 0
        }
        continue
      }
      if (this.hopCountdown <= 0) {
        this.shiftHop()
        this.readPos += SYNTH_HOP * safeRate
        if (this.looping) {
          this.readPos = this.wrapRead(this.readPos)
        } else if (this.readPos >= this.sourceLength()) {
          this.running = false
          justEnded = !this.endedSent
          this.endedSent = true
          outputL[i] = 0
          if (outputR !== outputL) {
            outputR[i] = 0
          }
          continue
        }
        this.addGrain()
        this.hopCountdown = SYNTH_HOP
      }
      const index = SYNTH_HOP - this.hopCountdown
      outputL[i] = this.olaLeft[index] ?? 0
      if (outputR !== outputL) {
        outputR[i] = this.olaRight[index] ?? outputL[i]
      }
      this.hopCountdown -= 1
    }
    return justEnded
  }

  private sourceLength(): number {
    return this.channels[0]?.length ?? 0
  }

  private wrapRead(position: number): number {
    if (!this.looping) {
      return position
    }
    const length = this.loopEnd - this.loopStart
    if (!(length > 0)) {
      return position
    }
    let offset = (position - this.loopStart) % length
    if (offset < 0) {
      offset += length
    }
    return this.loopStart + offset
  }

  private addGrain(): void {
    const left = this.channels[0]
    const right = this.channels[1] ?? left
    if (!left) {
      return
    }
    for (let n = 0; n < GRAIN_SIZE; n += 1) {
      const gain = this.window[n] ?? 0
      const position = this.wrapRead(this.readPos + n)
      this.olaLeft[n] = (this.olaLeft[n] ?? 0) + sampleAt(left, position) * gain
      this.olaRight[n] = (this.olaRight[n] ?? 0) + sampleAt(right, position) * gain
    }
  }

  private shiftHop(): void {
    const tail = GRAIN_SIZE - SYNTH_HOP
    for (let i = 0; i < tail; i += 1) {
      this.olaLeft[i] = this.olaLeft[i + SYNTH_HOP] ?? 0
      this.olaRight[i] = this.olaRight[i + SYNTH_HOP] ?? 0
    }
    for (let i = tail; i < GRAIN_SIZE; i += 1) {
      this.olaLeft[i] = 0
      this.olaRight[i] = 0
    }
  }
}

export function renderGranularStretch(
  source: Float32Array,
  rate: number,
  outputFrames: number,
  offsetSamples = 0,
): Float32Array {
  const stretcher = new GranularStretcher()
  stretcher.load([source])
  stretcher.start(offsetSamples)
  const output = new Float32Array(outputFrames)
  stretcher.process(output, output, outputFrames, rate)
  return output
}
