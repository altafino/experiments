export const STRETCH_PROCESSOR_NAME = 'deck-stretch'

export type StretchToWorklet =
  | { type: 'load'; channels: Float32Array[] }
  | {
      type: 'start'
      offsetSamples: number
      playId: number
      loopStartSamples?: number
      loopEndSamples?: number
    }
  | { type: 'setLoop'; startSamples: number; endSamples: number }
  | { type: 'clearLoop' }
  | { type: 'stop' }
  | {
      type: 'scratchStart'
      offsetSamples: number
      playId: number
      loopStartSamples?: number
      loopEndSamples?: number
    }
  | { type: 'scratchMove'; positionSamples: number; velocity: number }
  | { type: 'scratchCoast'; velocity: number; playId: number }

export type StretchFromWorklet =
  | { type: 'ended'; playId: number }
  | { type: 'scratchSettled'; playId: number; positionSamples: number }
