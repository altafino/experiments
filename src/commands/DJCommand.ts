import type { BeatFxLength, BeatFxType } from '../domain/beatFx'
import type { BeatJumpLength } from '../domain/beatJump'
import type { ColorFxType } from '../domain/colorFx'
import type { DeckState, HotCueId } from '../domain/DeckState'
import type { LibrarySort } from '../domain/library'
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
  | { type: 'BEAT_JUMP'; deck: DeckId; beats: BeatJumpLength }
  | { type: 'SET_SLIP'; deck: DeckId; enabled: boolean }
  | { type: 'HOT_CUE_RELEASE'; deck: DeckId; id: HotCueId }
  | { type: 'SET_VINYL'; deck: DeckId; enabled: boolean }
  | { type: 'JOG_TOUCH_START'; deck: DeckId }
  | { type: 'JOG_TOUCH_MOVE'; deck: DeckId; deltaRadians: number }
  | { type: 'JOG_TOUCH_END'; deck: DeckId }
  | { type: 'SET_TRIM'; deck: DeckId; value: number }
  | { type: 'SET_EQ'; deck: DeckId; band: EqBand; value: number }
  | { type: 'SET_COLOR_FX'; deck: DeckId; fx: ColorFxType }
  | { type: 'SET_COLOR'; deck: DeckId; value: number }
  | { type: 'SET_CHANNEL_FADER'; deck: DeckId; value: number }
  | { type: 'SET_CROSSFADER'; value: number }
  | { type: 'SET_CROSSFADER_CURVE'; curve: CrossfaderCurve }
  | { type: 'SET_MASTER_GAIN'; value: number }
  | { type: 'SET_BEAT_FX'; fx: BeatFxType }
  | { type: 'SET_BEAT_FX_BEAT'; beats: BeatFxLength }
  | { type: 'SET_BEAT_FX_LEVEL'; value: number }
  | { type: 'SET_BEAT_FX_ENABLED'; enabled: boolean }
  | { type: 'SET_CHANNEL_CUE'; deck: DeckId; enabled: boolean }
  | { type: 'SET_CUE_MIX'; value: number }
  | { type: 'SET_PHONES_LEVEL'; value: number }
  | { type: 'LIBRARY_IMPORT'; files: File[] }
  | { type: 'LIBRARY_LOAD'; deck: DeckId; trackId: string }
  | { type: 'LIBRARY_SET_QUERY'; query: string }
  | { type: 'LIBRARY_SET_SORT'; sort: LibrarySort }
  | { type: 'LIBRARY_SET_ARTIST'; artist: string | null }
  | { type: 'LIBRARY_SET_BPM'; min: number | null; max: number | null }
  | { type: 'LIBRARY_SELECT_PLAYLIST'; playlistId: string | null }
  | { type: 'LIBRARY_CREATE_PLAYLIST'; name: string }
  | { type: 'LIBRARY_DELETE_PLAYLIST'; playlistId: string }
  | { type: 'LIBRARY_ADD_TO_PLAYLIST'; playlistId: string; trackId: string }
  | { type: 'LIBRARY_REMOVE_FROM_PLAYLIST'; playlistId: string; trackId: string }
  | { type: 'RECORD_START' }
  | { type: 'RECORD_STOP' }
  | { type: 'MIDI_CONNECT' }
  | { type: 'MIDI_DISCONNECT' }
  | { type: 'MIDI_LEARN'; actionId: string | null }
  | { type: 'MIDI_UNMAP'; actionId: string }
  | { type: 'MIDI_RESET_MAP' }

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
  hotCueRelease(id: HotCueId): void
  clearHotCue(id: HotCueId): void
  setSlip(enabled: boolean): void
  setVinyl(enabled: boolean): void
  jogTouchStart(): void
  jogTouchMove(deltaRadians: number): void
  jogTouchEnd(): void
  loopIn(): void
  loopOut(): void
  reloop(): void
  beatLoop(beats: BeatLoopLength): void
  loopHalve(): void
  loopDouble(): void
  beatJump(beats: BeatJumpLength): void
  getSnapshot(): DeckState
}

export interface MixerController {
  setTrim(deck: DeckId, value: number): void
  setEq(deck: DeckId, band: EqBand, value: number): void
  setColorFx(deck: DeckId, fx: ColorFxType): void
  setColor(deck: DeckId, value: number): void
  setChannelFader(deck: DeckId, value: number): void
  setCrossfader(value: number): void
  setCrossfaderCurve(curve: CrossfaderCurve): void
  setMasterGain(value: number): void
  setBeatFx(fx: BeatFxType): void
  setBeatFxBeats(beats: BeatFxLength): void
  setBeatFxLevel(value: number): void
  setBeatFxEnabled(enabled: boolean): void
  setChannelCue(deck: DeckId, enabled: boolean): void
  setCueMix(value: number): void
  setPhonesLevel(value: number): void
  getSnapshot(): MixerState
}

export interface AudioEngineApi {
  ensureStarted(): Promise<void>
  load(deck: DeckId, file: File): Promise<void>
  getDeck(deck: DeckId): DeckController
  tryGetDeck(deck: DeckId): DeckController | undefined
  getMixer(): MixerController
  tryGetMixer(): MixerController | undefined
  startRecording(): void
  stopRecording(): Promise<Blob>
  isRecording(): boolean
  setMasterDeck(deck: DeckId): void
  setSync(deck: DeckId, enabled: boolean): void
  ensureMaster(deck: DeckId): void
  maintainSync(): void
}
