import type { Clock } from '../AudioClock'
import type { ColorFxType } from '../../domain/colorFx'
import type { EqBand } from '../../domain/MixerState'
import { ColorFx } from './ColorFx'
import { dbToLinear, eqKnobToDb } from './eq'
import { rampParam } from './rampParam'

const LOW_SHELF_HZ = 250
const MID_HZ = 1000
const HIGH_SHELF_HZ = 5000
const MID_Q = 1

/**
 * Per-channel trim → 3-band EQ → Sound Color FX → channel fader.
 * Cue tap is pre-fader (after Color FX).
 */
export class ChannelStrip {
  readonly input: GainNode
  private readonly trimNode: GainNode
  private readonly low: BiquadFilterNode
  private readonly mid: BiquadFilterNode
  private readonly high: BiquadFilterNode
  private readonly colorFx: ColorFx
  private readonly faderNode: GainNode
  private readonly clock: Clock

  constructor(context: BaseAudioContext, clock: Clock) {
    this.clock = clock
    this.input = context.createGain()
    this.trimNode = context.createGain()
    this.low = context.createBiquadFilter()
    this.mid = context.createBiquadFilter()
    this.high = context.createBiquadFilter()
    this.colorFx = new ColorFx(context, clock)
    this.faderNode = context.createGain()

    this.low.type = 'lowshelf'
    this.low.frequency.value = LOW_SHELF_HZ
    this.mid.type = 'peaking'
    this.mid.frequency.value = MID_HZ
    this.mid.Q.value = MID_Q
    this.high.type = 'highshelf'
    this.high.frequency.value = HIGH_SHELF_HZ

    this.input.connect(this.trimNode)
    this.trimNode.connect(this.low)
    this.low.connect(this.mid)
    this.mid.connect(this.high)
    this.high.connect(this.colorFx.input)
    this.colorFx.output.connect(this.faderNode)
  }

  /** Pre-fader listen tap (after Color FX). */
  get cueTap(): AudioNode {
    return this.colorFx.output
  }

  attachPitch(): void {
    this.colorFx.attachPitch()
  }

  get output(): GainNode {
    return this.faderNode
  }

  setTrim(knob: number): void {
    rampParam(this.trimNode.gain, dbToLinear(eqKnobToDb(knob)), this.clock.currentTime)
  }

  setEq(band: EqBand, knob: number): void {
    const db = eqKnobToDb(knob)
    const now = this.clock.currentTime
    switch (band) {
      case 'low':
        rampParam(this.low.gain, db, now)
        return
      case 'mid':
        rampParam(this.mid.gain, db, now)
        return
      case 'high':
        rampParam(this.high.gain, db, now)
        return
      default: {
        const neverBand: never = band
        throw new Error(`Unknown EQ band: ${String(neverBand)}`)
      }
    }
  }

  setFader(value: number): void {
    rampParam(this.faderNode.gain, value, this.clock.currentTime)
  }

  setColorFx(type: ColorFxType): void {
    this.colorFx.setType(type)
  }

  setColor(knob: number): void {
    this.colorFx.setAmount(knob)
  }
}
