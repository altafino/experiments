import type { Clock } from '../AudioClock'
import {
  colorAmount,
  DUB_ECHO_DELAY_SECONDS,
  dubEchoFeedback,
  dubEchoWet,
  filterCutoffHz,
  filterMode,
  isColorBypassed,
  noiseGain,
  pitchRatio,
  type ColorFxType,
} from '../../domain/colorFx'
import { COLOR_PITCH_PROCESSOR_NAME } from '../worklets/colorPitchMessages'
import { rampParam } from './rampParam'

const FILTER_Q = 0.707
const NOISE_SECONDS = 2
const DELAY_MAX_SECONDS = 1

/**
 * Sound Color FX insert: after EQ, before the channel fader.
 * Filter / noise / dub echo use native Web Audio nodes. Pitch uses an
 * overlap-add AudioWorklet; missing worklet degrades to dry (no pitch).
 */
export class ColorFx {
  readonly input: GainNode
  readonly output: GainNode
  private readonly context: BaseAudioContext
  private readonly clock: Clock
  private readonly dry: GainNode
  private readonly filter: BiquadFilterNode
  private readonly filterWet: GainNode
  private readonly noiseGain: GainNode
  private readonly noiseSource: AudioBufferSourceNode
  private readonly echoDelay: DelayNode
  private readonly echoFeedback: GainNode
  private readonly echoWet: GainNode
  private readonly pitchIn: GainNode
  private readonly pitchWet: GainNode
  private pitchNode: AudioWorkletNode | null = null
  private type: ColorFxType = 'filter'
  private knob = 0.5

  constructor(context: BaseAudioContext, clock: Clock) {
    this.context = context
    this.clock = clock
    this.input = context.createGain()
    this.output = context.createGain()
    this.dry = context.createGain()
    this.filter = context.createBiquadFilter()
    this.filterWet = context.createGain()
    this.noiseGain = context.createGain()
    this.echoDelay = context.createDelay(DELAY_MAX_SECONDS)
    this.echoFeedback = context.createGain()
    this.echoWet = context.createGain()
    this.pitchIn = context.createGain()
    this.pitchWet = context.createGain()

    this.filter.type = 'lowpass'
    this.filter.frequency.value = 20_000
    this.filter.Q.value = FILTER_Q
    this.echoDelay.delayTime.value = DUB_ECHO_DELAY_SECONDS
    this.dry.gain.value = 1
    this.filterWet.gain.value = 0
    this.noiseGain.gain.value = 0
    this.echoFeedback.gain.value = 0
    this.echoWet.gain.value = 0
    this.pitchWet.gain.value = 0

    this.input.connect(this.dry)
    this.dry.connect(this.output)

    this.input.connect(this.filter)
    this.filter.connect(this.filterWet)
    this.filterWet.connect(this.output)

    this.noiseSource = createLoopingNoise(context, NOISE_SECONDS)
    this.noiseSource.connect(this.noiseGain)
    this.noiseGain.connect(this.output)

    this.input.connect(this.echoDelay)
    this.echoDelay.connect(this.echoWet)
    this.echoWet.connect(this.output)
    this.echoDelay.connect(this.echoFeedback)
    this.echoFeedback.connect(this.echoDelay)

    this.input.connect(this.pitchIn)
    this.pitchIn.connect(this.pitchWet)
    this.pitchWet.connect(this.output)
  }

  attachPitch(): void {
    if (this.pitchNode || typeof AudioWorkletNode === 'undefined') {
      return
    }
    if (!('audioWorklet' in this.context)) {
      return
    }
    try {
      const node = new AudioWorkletNode(this.context as AudioContext, COLOR_PITCH_PROCESSOR_NAME, {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2],
        channelCount: 2,
        channelCountMode: 'explicit',
      })
      this.pitchIn.disconnect(this.pitchWet)
      this.pitchIn.connect(node)
      node.connect(this.pitchWet)
      this.pitchNode = node
      this.apply()
    } catch {
      this.pitchNode = null
    }
  }

  setType(type: ColorFxType): void {
    this.type = type
    this.apply()
  }

  setAmount(knob: number): void {
    this.knob = knob
    this.apply()
  }

  private apply(): void {
    const amount = colorAmount(this.knob)
    const bypass = isColorBypassed(this.knob)
    const now = this.clock.currentTime

    let dry = 1
    let filterWet = 0
    let noise = 0
    let echoWet = 0
    let echoFb = 0
    let pitchWet = 0

    switch (this.type) {
      case 'filter':
        if (!bypass) {
          dry = 0
          filterWet = 1
          this.applyFilter(amount)
        }
        break
      case 'noise':
        noise = noiseGain(amount)
        break
      case 'dubEcho':
        echoWet = dubEchoWet(amount)
        echoFb = dubEchoFeedback(amount)
        rampParam(this.echoDelay.delayTime, DUB_ECHO_DELAY_SECONDS, now)
        break
      case 'pitch':
        if (!bypass && this.pitchNode) {
          dry = 0
          pitchWet = 1
          const ratio = this.pitchNode.parameters.get('ratio')
          if (ratio) {
            rampParam(ratio, pitchRatio(amount), now)
          }
        }
        break
      default: {
        const neverType: never = this.type
        throw new Error(`Unknown color FX: ${String(neverType)}`)
      }
    }

    rampParam(this.dry.gain, dry, now)
    rampParam(this.filterWet.gain, filterWet, now)
    rampParam(this.noiseGain.gain, noise, now)
    rampParam(this.echoWet.gain, echoWet, now)
    rampParam(this.echoFeedback.gain, echoFb, now)
    rampParam(this.pitchWet.gain, pitchWet, now)
  }

  private applyFilter(amount: number): void {
    const mode = filterMode(amount)
    switch (mode) {
      case 'bypass':
        return
      case 'lowpass':
        this.filter.type = 'lowpass'
        rampParam(this.filter.frequency, filterCutoffHz(amount), this.clock.currentTime)
        return
      case 'highpass':
        this.filter.type = 'highpass'
        rampParam(this.filter.frequency, filterCutoffHz(amount), this.clock.currentTime)
        return
      default: {
        const neverMode: never = mode
        throw new Error(`Unknown filter mode: ${String(neverMode)}`)
      }
    }
  }
}

function createLoopingNoise(context: BaseAudioContext, seconds: number): AudioBufferSourceNode {
  const frames = Math.max(1, Math.floor(context.sampleRate * seconds))
  const buffer = context.createBuffer(2, frames, context.sampleRate)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel)
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1
    }
  }
  const source = context.createBufferSource()
  source.buffer = buffer
  source.loop = true
  source.start(0)
  return source
}
