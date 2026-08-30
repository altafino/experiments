import type { Clock } from '../AudioClock'
import {
  beatDelaySeconds,
  beatLfoHz,
  clampBeatFxBpm,
  DEFAULT_BEAT_FX_BPM,
  DEFAULT_BEAT_FX_LENGTH,
  DEFAULT_BEAT_FX_LEVEL,
  type BeatFxLength,
  type BeatFxType,
} from '../../domain/beatFx'
import { rampParam } from './rampParam'

const ECHO_MAX_DELAY = 16
const REVERB_MAX_DELAY = 8
const FLANGER_MAX_DELAY = 0.05
const ECHO_FEEDBACK_MAX = 0.78
const REVERB_FEEDBACK_MAX = 0.82
const REVERB_COMB_RATIOS = [0.29, 0.37, 0.43, 0.47] as const
const FLANGER_BASE_DELAY = 0.0045
const FLANGER_DEPTH_MAX = 0.0035
const FLANGER_FEEDBACK_MAX = 0.55
const BPM_EPSILON = 0.05

interface Comb {
  delay: DelayNode
  feedback: GainNode
}

/**
 * Master-bus Beat FX insert after the crossfader. Echo, reverb, and flanger
 * use native Web Audio nodes; delay/LFO times follow master BPM × beat length.
 */
export class BeatFx {
  readonly input: GainNode
  readonly output: GainNode
  private readonly clock: Clock
  private readonly dry: GainNode
  private readonly echoDelay: DelayNode
  private readonly echoFeedback: GainNode
  private readonly echoWet: GainNode
  private readonly combs: Comb[]
  private readonly reverbDamp: BiquadFilterNode
  private readonly reverbWet: GainNode
  private readonly flangerDelay: DelayNode
  private readonly flangerFeedback: GainNode
  private readonly flangerWet: GainNode
  private readonly lfo: OscillatorNode
  private readonly lfoDepth: GainNode
  private type: BeatFxType = 'echo'
  private beats: BeatFxLength = DEFAULT_BEAT_FX_LENGTH
  private level = DEFAULT_BEAT_FX_LEVEL
  private enabled = false
  private bpm = DEFAULT_BEAT_FX_BPM

  constructor(context: BaseAudioContext, clock: Clock) {
    this.clock = clock
    this.input = context.createGain()
    this.output = context.createGain()
    this.dry = context.createGain()
    this.echoDelay = context.createDelay(ECHO_MAX_DELAY)
    this.echoFeedback = context.createGain()
    this.echoWet = context.createGain()
    this.reverbDamp = context.createBiquadFilter()
    this.reverbWet = context.createGain()
    this.flangerDelay = context.createDelay(FLANGER_MAX_DELAY)
    this.flangerFeedback = context.createGain()
    this.flangerWet = context.createGain()
    this.lfo = context.createOscillator()
    this.lfoDepth = context.createGain()

    this.dry.gain.value = 1
    this.echoFeedback.gain.value = 0
    this.echoWet.gain.value = 0
    this.reverbWet.gain.value = 0
    this.flangerFeedback.gain.value = 0
    this.flangerWet.gain.value = 0
    this.lfoDepth.gain.value = 0
    this.echoDelay.delayTime.value = beatDelaySeconds(this.bpm, this.beats)
    this.reverbDamp.type = 'lowpass'
    this.reverbDamp.frequency.value = 4500
    this.flangerDelay.delayTime.value = FLANGER_BASE_DELAY
    this.lfo.type = 'triangle'
    this.lfo.frequency.value = beatLfoHz(this.bpm, this.beats)

    this.input.connect(this.dry)
    this.dry.connect(this.output)

    this.input.connect(this.echoDelay)
    this.echoDelay.connect(this.echoWet)
    this.echoWet.connect(this.output)
    this.echoDelay.connect(this.echoFeedback)
    this.echoFeedback.connect(this.echoDelay)

    this.combs = REVERB_COMB_RATIOS.map((ratio) => {
      const delay = context.createDelay(REVERB_MAX_DELAY)
      const feedback = context.createGain()
      delay.delayTime.value = beatDelaySeconds(this.bpm, this.beats) * ratio
      feedback.gain.value = 0
      this.input.connect(delay)
      delay.connect(this.reverbDamp)
      delay.connect(feedback)
      feedback.connect(delay)
      return { delay, feedback }
    })
    this.reverbDamp.connect(this.reverbWet)
    this.reverbWet.connect(this.output)

    this.input.connect(this.flangerDelay)
    this.flangerDelay.connect(this.flangerWet)
    this.flangerWet.connect(this.output)
    this.flangerDelay.connect(this.flangerFeedback)
    this.flangerFeedback.connect(this.flangerDelay)
    this.lfo.connect(this.lfoDepth)
    this.lfoDepth.connect(this.flangerDelay.delayTime)
    this.lfo.start(0)
  }

  setType(type: BeatFxType): void {
    this.type = type
    this.apply()
  }

  setBeats(beats: BeatFxLength): void {
    this.beats = beats
    this.apply()
  }

  setLevel(level: number): void {
    this.level = level
    this.apply()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    this.apply()
  }

  setBpm(bpm: number): void {
    const next = clampBeatFxBpm(bpm)
    if (Math.abs(next - this.bpm) < BPM_EPSILON) {
      return
    }
    this.bpm = next
    this.apply()
  }

  private apply(): void {
    const now = this.clock.currentTime
    const delay = beatDelaySeconds(this.bpm, this.beats)
    const active = this.enabled
    const level = active ? this.level : 0

    let echoWet = 0
    let echoFb = 0
    let reverbWet = 0
    let reverbFb = 0
    let flangerWet = 0
    let flangerFb = 0
    let lfoDepth = 0

    switch (this.type) {
      case 'echo':
        echoWet = level
        echoFb = level * ECHO_FEEDBACK_MAX
        break
      case 'reverb':
        reverbWet = level * 0.9
        reverbFb = level * REVERB_FEEDBACK_MAX
        break
      case 'flanger':
        flangerWet = level
        flangerFb = level * FLANGER_FEEDBACK_MAX
        lfoDepth = active ? FLANGER_DEPTH_MAX * (0.25 + 0.75 * this.level) : 0
        break
      default: {
        const neverType: never = this.type
        throw new Error(`Unknown beat FX: ${String(neverType)}`)
      }
    }

    rampParam(this.echoDelay.delayTime, delay, now)
    rampParam(this.echoWet.gain, echoWet, now)
    rampParam(this.echoFeedback.gain, echoFb, now)

    for (let i = 0; i < this.combs.length; i += 1) {
      const comb = this.combs[i]
      const ratio = REVERB_COMB_RATIOS[i]
      if (!comb || ratio === undefined) {
        continue
      }
      rampParam(comb.delay.delayTime, delay * ratio, now)
      rampParam(comb.feedback.gain, reverbFb, now)
    }
    rampParam(this.reverbWet.gain, reverbWet, now)

    rampParam(this.flangerWet.gain, flangerWet, now)
    rampParam(this.flangerFeedback.gain, flangerFb, now)
    rampParam(this.lfoDepth.gain, lfoDepth, now)
    rampParam(this.lfo.frequency, beatLfoHz(this.bpm, this.beats), now)
  }
}
