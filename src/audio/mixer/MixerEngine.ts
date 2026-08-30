import type { Clock } from '../AudioClock'
import type { DeckId, MixerController } from '../../commands/DJCommand'
import { clampBeatFxBpm, type BeatFxLength, type BeatFxType } from '../../domain/beatFx'
import type { ColorFxType } from '../../domain/colorFx'
import {
  emptyMixerState,
  type ChannelMixState,
  type CrossfaderCurve,
  type EqBand,
  type MixerState,
} from '../../domain/MixerState'
import { clamp } from '../../domain/timecode'
import { BeatFx } from './BeatFx'
import { ChannelStrip } from './ChannelStrip'
import { CueBus } from './CueBus'
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
    beatFx: state.beatFx,
    beatFxBeats: state.beatFxBeats,
    beatFxLevel: state.beatFxLevel,
    beatFxEnabled: state.beatFxEnabled,
    beatFxBpm: state.beatFxBpm,
    cueMix: state.cueMix,
    phonesLevel: state.phonesLevel,
  }
}

function copyChannel(channel: ChannelMixState): ChannelMixState {
  return {
    trim: channel.trim,
    eq: { low: channel.eq.low, mid: channel.eq.mid, high: channel.eq.high },
    colorFx: channel.colorFx,
    color: channel.color,
    cue: channel.cue,
    fader: channel.fader,
  }
}

/**
 * Mixer graph: channel strips → crossfader → Beat FX → master;
 * PFL cue bus mixes with master into the phones listen path.
 * Parameter changes are ramped on the AudioContext clock.
 */
export class MixerEngine implements MixerController {
  private readonly clock: Clock
  private readonly strip1: ChannelStrip
  private readonly strip2: ChannelStrip
  private readonly xfade1: GainNode
  private readonly xfade2: GainNode
  private readonly beatFx: BeatFx
  private readonly master: GainNode
  private readonly cueBus: CueBus
  private state: MixerState

  constructor(context: BaseAudioContext, clock: Clock) {
    this.clock = clock
    this.state = emptyMixerState()
    this.strip1 = new ChannelStrip(context, clock)
    this.strip2 = new ChannelStrip(context, clock)
    this.xfade1 = context.createGain()
    this.xfade2 = context.createGain()
    this.beatFx = new BeatFx(context, clock)
    this.master = context.createGain()

    this.strip1.output.connect(this.xfade1)
    this.strip2.output.connect(this.xfade2)
    this.xfade1.connect(this.beatFx.input)
    this.xfade2.connect(this.beatFx.input)
    this.beatFx.output.connect(this.master)
    this.cueBus = new CueBus(context, clock, this.master)
    this.strip1.cueTap.connect(this.cueBus.input(1))
    this.strip2.cueTap.connect(this.cueBus.input(2))

    this.applyChannel(1)
    this.applyChannel(2)
    this.applyCrossfader()
    this.applyBeatFx()
    this.applyMaster()
    this.applyCue()
  }

  attachColorPitch(): void {
    this.strip1.attachPitch()
    this.strip2.attachPitch()
  }

  input(deck: DeckId): AudioNode {
    return this.strip(deck).input
  }

  connect(destination: AudioNode): void {
    this.cueBus.output.connect(destination)
  }

  get masterTap(): AudioNode {
    return this.master
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

  setColorFx(deck: DeckId, fx: ColorFxType): void {
    this.channel(deck).colorFx = fx
    this.strip(deck).setColorFx(fx)
  }

  setColor(deck: DeckId, value: number): void {
    const next = clamp(value, 0, 1)
    this.channel(deck).color = next
    this.strip(deck).setColor(next)
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

  setBeatFx(fx: BeatFxType): void {
    this.state.beatFx = fx
    this.beatFx.setType(fx)
  }

  setBeatFxBeats(beats: BeatFxLength): void {
    this.state.beatFxBeats = beats
    this.beatFx.setBeats(beats)
  }

  setBeatFxLevel(value: number): void {
    this.state.beatFxLevel = clamp(value, 0, 1)
    this.beatFx.setLevel(this.state.beatFxLevel)
  }

  setBeatFxEnabled(enabled: boolean): void {
    this.state.beatFxEnabled = enabled
    this.beatFx.setEnabled(enabled)
  }

  setChannelCue(deck: DeckId, enabled: boolean): void {
    this.channel(deck).cue = enabled
    this.cueBus.setChannelCue(deck, enabled)
  }

  setCueMix(value: number): void {
    this.state.cueMix = clamp(value, 0, 1)
    this.cueBus.setMix(this.state.cueMix)
  }

  setPhonesLevel(value: number): void {
    this.state.phonesLevel = clamp(value, 0, 1)
    this.cueBus.setLevel(this.state.phonesLevel)
  }

  setBeatFxBpm(bpm: number): void {
    const next = clampBeatFxBpm(bpm)
    this.beatFx.setBpm(next)
    if (Math.abs(next - this.state.beatFxBpm) < 0.05) {
      return
    }
    this.state.beatFxBpm = next
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
    strip.setColorFx(channel.colorFx)
    strip.setColor(channel.color)
    strip.setFader(channel.fader)
    this.cueBus.setChannelCue(deck, channel.cue)
  }

  private applyCrossfader(): void {
    const gains = crossfaderGains(this.state.crossfader, this.state.crossfaderCurve)
    const now = this.clock.currentTime
    rampParam(this.xfade1.gain, gains.deck1, now)
    rampParam(this.xfade2.gain, gains.deck2, now)
  }

  private applyBeatFx(): void {
    this.beatFx.setType(this.state.beatFx)
    this.beatFx.setBeats(this.state.beatFxBeats)
    this.beatFx.setLevel(this.state.beatFxLevel)
    this.beatFx.setEnabled(this.state.beatFxEnabled)
    this.beatFx.setBpm(this.state.beatFxBpm)
  }

  private applyMaster(): void {
    rampParam(this.master.gain, this.state.masterGain, this.clock.currentTime)
  }

  private applyCue(): void {
    this.cueBus.setMix(this.state.cueMix)
    this.cueBus.setLevel(this.state.phonesLevel)
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
