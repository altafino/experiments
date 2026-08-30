import type { DeckState, HotCueId } from '../domain/DeckState'
import type { BeatLoopLength } from '../domain/loop'
import type { CrossfaderCurve, EqBand, MixerState } from '../domain/MixerState'
import type { PitchBend, TempoRange } from '../domain/tempo'

export type DeckId = 1 | 2

export type DJCommand =
  | { type: 'DECK_LOAD'; deck: DeckId; file: File }
  | { type: 'DECK_PLAY'; deck: DeckId }
  | { type: 'DECK_PAUSE'; deck: DeckId }
  | { type: 'DECK_TOGGLE_PLAY'; deck: DeckId }
  | { type: 'DECK_CUE'; deck: DeckId }
  | { type: 'DECK_CUE_RELEASE'; deck: DeckId }
  | { type: 'DECK_SEEK'; deck: DeckId; position: number }
  | { type: 'SET_TEMPO'; deck: DeckId; percent: number }
  | { type: 'SET_TEMPO_RANGE'; deck: DeckId; range: TempoRange }
  | { type: 'PITCH_BEND_START'; deck: DeckId; direction: Exclude<PitchBend, 0> }
  | { type: 'PITCH_BEND_END'; deck: DeckId }
  | { type: 'SET_MASTER_TEMPO'; deck: DeckId; enabled: boolean }
  | { type: 'SET_SYNC'; deck: DeckId; enabled: boolean }
  | { type: 'SET_MASTER_DECK'; deck: DeckId }
  | { type: 'SET_QUANTIZE'; deck: DeckId; enabled: boolean }
  | { type: 'HOT_CUE'; deck: DeckId; id: HotCueId }
  | { type: 'CLEAR_HOT_CUE'; deck: DeckId; id: HotCueId }
  | { type: 'LOOP_IN'; deck: DeckId }
  | { type: 'LOOP_OUT'; deck: DeckId }
  | { type: 'LOOP_RELOOP'; deck: DeckId }
  | { type: 'BEAT_LOOP'; deck: DeckId; beats: BeatLoopLength }
  | { type: 'LOOP_HALVE'; deck: DeckId }
  | { type: 'LOOP_DOUBLE'; deck: DeckId }
  | { type: 'SET_TRIM'; deck: DeckId; value: number }
  | { type: 'SET_EQ'; deck: DeckId; band: EqBand; value: number }
  | { type: 'SET_CHANNEL_FADER'; deck: DeckId; value: number }
  | { type: 'SET_CROSSFADER'; value: number }
  | { type: 'SET_CROSSFADER_CURVE'; curve: CrossfaderCurve }
  | { type: 'SET_MASTER_GAIN'; value: number }

export interface DeckController {
  play(): void
  pause(): void
  cue(): void
  cueRelease(): void
  seek(positionSeconds: number): void
  setTempoPercent(percent: number): void
  setTempoRange(range: TempoRange): void
  setPitchBend(direction: PitchBend): void
  setMasterTempo(enabled: boolean): void
  setQuantize(enabled: boolean): void
  hotCue(id: HotCueId): void
  clearHotCue(id: HotCueId): void
  loopIn(): void
  loopOut(): void
  reloop(): void
  beatLoop(beats: BeatLoopLength): void
  loopHalve(): void
  loopDouble(): void
  getSnapshot(): DeckState
}

export interface MixerController {
  setTrim(deck: DeckId, value: number): void
  setEq(deck: DeckId, band: EqBand, value: number): void
  setChannelFader(deck: DeckId, value: number): void
  setCrossfader(value: number): void
  setCrossfaderCurve(curve: CrossfaderCurve): void
  setMasterGain(value: number): void
  getSnapshot(): MixerState
}

export interface AudioEngineApi {
  ensureStarted(): Promise<void>
  load(deck: DeckId, file: File): Promise<void>
  getDeck(deck: DeckId): DeckController
  tryGetDeck(deck: DeckId): DeckController | undefined
  getMixer(): MixerController
  tryGetMixer(): MixerController | undefined
  setMasterDeck(deck: DeckId): void
  setSync(deck: DeckId, enabled: boolean): void
  ensureMaster(deck: DeckId): void
  maintainSync(): void
}
