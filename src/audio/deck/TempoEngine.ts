import {
  clampTempoPercent,
  DEFAULT_TEMPO_RANGE,
  playbackRateFromTempo,
  type PitchBend,
  type TempoRange,
} from '../../domain/tempo'

/**
 * Deck tempo state. Converts slider percent, range, and pitch bend into
 * a playbackRate. Master tempo selects the stretch worklet in DeckEngine.
 */
export class TempoEngine {
  private percent = 0
  private range: TempoRange = DEFAULT_TEMPO_RANGE
  private bend: PitchBend = 0
  private master = false

  setPercent(percent: number): void {
    this.percent = clampTempoPercent(percent, this.range)
  }

  setRange(range: TempoRange): void {
    this.range = range
    this.percent = clampTempoPercent(this.percent, range)
  }

  setBend(direction: PitchBend): void {
    this.bend = direction
  }

  setMasterTempo(enabled: boolean): void {
    this.master = enabled
  }

  tempoPercent(): number {
    return this.percent
  }

  tempoRange(): TempoRange {
    return this.range
  }

  pitchBend(): PitchBend {
    return this.bend
  }

  masterTempo(): boolean {
    return this.master
  }

  playbackRate(): number {
    return playbackRateFromTempo(this.percent, this.bend)
  }
}
