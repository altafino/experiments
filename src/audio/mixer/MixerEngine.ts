import type { Clock } from '../AudioClock'
import type { DeckId, MixerController } from '../../commands/DJCommand'
import {
  emptyMixerState,
  type ChannelMixState,
  type CrossfaderCurve,
  type EqBand,
  type MixerState,
} from '../../domain/MixerState'
import { clamp } from '../../domain/timecode'
import { ChannelStrip } from './ChannelStrip'
import { crossfaderGains } from './crossfaderCurves'
import { rampParam } from './rampParam'

function copyMixerState(state: MixerState): MixerState {
  return {
    channels: {
      1: copyChannel(state.channels[1]),
      2: copyChannel(state.channels[2]),
    },
    crossfader: state.crossfader,
    crossfaderCurve: state.crossfaderCurve,
    masterGain: state.masterGain,
  }
}

function copyChannel(channel: ChannelMixState): ChannelMixState {
  return {
    trim: channel.trim,
    eq: { low: channel.eq.low, mid: channel.eq.mid, high: channel.eq.high },
    fader: channel.fader,
  }
}

/**
 * Mixer graph: channel strips → crossfader gains → master.
 * Parameter changes are ramped on the AudioContext clock.
 */
export class MixerEngine implements MixerController {
  private readonly clock: Clock
  private readonly strip1: ChannelStrip
  private readonly strip2: ChannelStrip
  private readonly xfade1: GainNode
  private readonly xfade2: GainNode
  private readonly master: GainNode
  private state: MixerState

  constructor(context: BaseAudioContext, clock: Clock) {
    this.clock = clock
    this.state = emptyMixerState()
    this.strip1 = new ChannelStrip(context, clock)
    this.strip2 = new ChannelStrip(context, clock)
    this.xfade1 = context.createGain()
    this.xfade2 = context.createGain()
    this.master = context.createGain()

    this.strip1.output.connect(this.xfade1)
    this.strip2.output.connect(this.xfade2)
    this.xfade1.connect(this.master)
    this.xfade2.connect(this.master)

    this.applyChannel(1)
    this.applyChannel(2)
    this.applyCrossfader()
    this.applyMaster()
  }

  input(deck: DeckId): AudioNode {
    return this.strip(deck).input
  }

  connect(destination: AudioNode): void {
    this.master.connect(destination)
  }

  setTrim(deck: DeckId, value: number): void {
    const next = clamp(value, 0, 1)
    this.channel(deck).trim = next
    this.strip(deck).setTrim(next)
  }

  setEq(deck: DeckId, band: EqBand, value: number): void {
    const next = clamp(value, 0, 1)
    this.channel(deck).eq[band] = next
    this.strip(deck).setEq(band, next)
  }

  setChannelFader(deck: DeckId, value: number): void {
    const next = clamp(value, 0, 1)
    this.channel(deck).fader = next
    this.strip(deck).setFader(next)
  }

  setCrossfader(value: number): void {
    this.state.crossfader = clamp(value, 0, 1)
    this.applyCrossfader()
  }

  setCrossfaderCurve(curve: CrossfaderCurve): void {
    this.state.crossfaderCurve = curve
    this.applyCrossfader()
  }

  setMasterGain(value: number): void {
    this.state.masterGain = clamp(value, 0, 1)
    this.applyMaster()
  }

  getSnapshot(): MixerState {
    return copyMixerState(this.state)
  }

  private applyChannel(deck: DeckId): void {
    const channel = this.channel(deck)
    const strip = this.strip(deck)
    strip.setTrim(channel.trim)
    strip.setEq('low', channel.eq.low)
    strip.setEq('mid', channel.eq.mid)
    strip.setEq('high', channel.eq.high)
    strip.setFader(channel.fader)
  }

  private applyCrossfader(): void {
    const gains = crossfaderGains(this.state.crossfader, this.state.crossfaderCurve)
    const now = this.clock.currentTime
    rampParam(this.xfade1.gain, gains.deck1, now)
    rampParam(this.xfade2.gain, gains.deck2, now)
  }

  private applyMaster(): void {
    rampParam(this.master.gain, this.state.masterGain, this.clock.currentTime)
  }

  private channel(deck: DeckId): ChannelMixState {
    switch (deck) {
      case 1:
        return this.state.channels[1]
      case 2:
        return this.state.channels[2]
      default: {
        const neverDeck: never = deck
        throw new Error(`Unknown deck: ${String(neverDeck)}`)
      }
    }
  }

  private strip(deck: DeckId): ChannelStrip {
    switch (deck) {
      case 1:
        return this.strip1
      case 2:
        return this.strip2
      default: {
        const neverDeck: never = deck
        throw new Error(`Unknown deck: ${String(neverDeck)}`)
      }
    }
  }
}
