import type { Clock } from '../AudioClock'
import type { DeckId } from '../../commands/DJCommand'
import { cueMixGains } from '../../domain/cue'
import { rampParam } from './rampParam'

/**
 * Pre-fader cue bus plus phones mix. Cue taps sit after Color FX; the
 * phones output blends cue and master. On a single device this is the
 * listen path (CUE MIX at 1 = master only, same as a master-only hookup).
 */
export class CueBus {
  readonly output: GainNode
  private readonly clock: Clock
  private readonly cue1: GainNode
  private readonly cue2: GainNode
  private readonly phonesCue: GainNode
  private readonly phonesMaster: GainNode
  private mix = 1
  private level = 1

  constructor(context: BaseAudioContext, clock: Clock, masterTap: AudioNode) {
    this.clock = clock
    this.cue1 = context.createGain()
    this.cue2 = context.createGain()
    this.phonesCue = context.createGain()
    this.phonesMaster = context.createGain()
    this.output = context.createGain()

    this.cue1.gain.value = 0
    this.cue2.gain.value = 0
    this.phonesCue.gain.value = 0
    this.phonesMaster.gain.value = 1

    const cueSum = context.createGain()
    this.cue1.connect(cueSum)
    this.cue2.connect(cueSum)
    cueSum.connect(this.phonesCue)
    this.phonesCue.connect(this.output)
    masterTap.connect(this.phonesMaster)
    this.phonesMaster.connect(this.output)
  }

  input(deck: DeckId): GainNode {
    switch (deck) {
      case 1:
        return this.cue1
      case 2:
        return this.cue2
      default: {
        const neverDeck: never = deck
        throw new Error(`Unknown deck: ${String(neverDeck)}`)
      }
    }
  }

  setChannelCue(deck: DeckId, enabled: boolean): void {
    rampParam(this.input(deck).gain, enabled ? 1 : 0, this.clock.currentTime)
  }

  setMix(mix: number): void {
    this.mix = mix
    this.applyPhones()
  }

  setLevel(level: number): void {
    this.level = level
    this.applyPhones()
  }

  private applyPhones(): void {
    const gains = cueMixGains(this.mix)
    const now = this.clock.currentTime
    rampParam(this.phonesCue.gain, gains.cue * this.level, now)
    rampParam(this.phonesMaster.gain, gains.master * this.level, now)
  }
}
