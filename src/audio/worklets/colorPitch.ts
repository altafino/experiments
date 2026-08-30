export const COLOR_PITCH_GRAIN = 1024
export const COLOR_PITCH_HOP = 256
export const COLOR_PITCH_RING = 8192
export const COLOR_PITCH_VOICES = 4

function hannWindow(size: number): Float32Array {
  const window = new Float32Array(size)
  const denom = size <= 1 ? 1 : size - 1
  for (let i = 0; i < size; i += 1) {
    window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / denom)
  }
  return window
}

function wrapIndex(position: number, length: number): number {
  let wrapped = position % length
  if (wrapped < 0) {
    wrapped += length
  }
  return wrapped
}

function sampleAt(channel: Float32Array, position: number): number {
  const length = channel.length
  if (length === 0) {
    return 0
  }
  const wrapped = wrapIndex(position, length)
  const index = Math.floor(wrapped)
  const frac = wrapped - index
  const next = (index + 1) % length
  const a = channel[index] ?? 0
  const b = channel[next] ?? 0
  return a + (b - a) * frac
}

/**
 * Overlap-add pitch shifter that keeps duration. Read rate follows `ratio`
 * (2 = +1 octave) while grains are launched on a fixed output hop.
 */
export class ColorPitchShifter {
  private readonly window = hannWindow(COLOR_PITCH_GRAIN)
  private readonly ringL = new Float32Array(COLOR_PITCH_RING)
  private readonly ringR = new Float32Array(COLOR_PITCH_RING)
  private readonly grainAge = new Float32Array(COLOR_PITCH_VOICES).fill(-1)
  private readonly grainOrigin = new Float32Array(COLOR_PITCH_VOICES)
  private write = 0
  private hopCountdown = 0
  private nextVoice = 0

  process(
    inputL: Float32Array,
    inputR: Float32Array,
    outputL: Float32Array,
    outputR: Float32Array,
    frames: number,
    ratio: number,
  ): void {
    const safeRatio = ratio > 0.01 ? ratio : 1
    for (let i = 0; i < frames; i += 1) {
      this.ringL[this.write] = inputL[i] ?? 0
      this.ringR[this.write] = inputR[i] ?? 0

      if (this.hopCountdown <= 0) {
        this.launchGrain(safeRatio)
        this.hopCountdown = COLOR_PITCH_HOP
      }
      this.hopCountdown -= 1

      let mixL = 0
      let mixR = 0
      let weight = 0
      for (let voice = 0; voice < COLOR_PITCH_VOICES; voice += 1) {
        const age = this.grainAge[voice] ?? -1
        if (age < 0 || age >= COLOR_PITCH_GRAIN) {
          continue
        }
        const win = this.window[age] ?? 0
        const read = (this.grainOrigin[voice] ?? 0) + age * safeRatio
        mixL += sampleAt(this.ringL, read) * win
        mixR += sampleAt(this.ringR, read) * win
        weight += win
        this.grainAge[voice] = age + 1
      }

      if (weight > 1e-6) {
        outputL[i] = mixL / weight
        outputR[i] = mixR / weight
      } else {
        outputL[i] = 0
        outputR[i] = 0
      }

      this.write = (this.write + 1) % COLOR_PITCH_RING
    }
  }

  private launchGrain(ratio: number): void {
    const history = COLOR_PITCH_GRAIN * (ratio > 1 ? ratio : 1)
    this.grainOrigin[this.nextVoice] = wrapIndex(this.write - history, COLOR_PITCH_RING)
    this.grainAge[this.nextVoice] = 0
    this.nextVoice = (this.nextVoice + 1) % COLOR_PITCH_VOICES
  }
}
