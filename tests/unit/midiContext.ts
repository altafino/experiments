import { DEFAULT_TEMPO_RANGE } from '../../src/domain/tempo'
import type { MidiMapContext } from '../../src/midi/MidiMapper'

export function midiContext(overrides: Partial<MidiMapContext> = {}): MidiMapContext {
  return {
    tempoRange: () => DEFAULT_TEMPO_RANGE,
    channelCue: () => false,
    syncEnabled: () => false,
    slipEnabled: () => false,
    vinylMode: () => false,
    masterTempo: () => false,
    quantizeEnabled: () => false,
    beatFxEnabled: () => false,
    recording: () => false,
    ...overrides,
  }
}
