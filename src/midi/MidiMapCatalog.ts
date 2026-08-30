import type { MidiBinding } from '../domain/midi'

export const MIDI_MAP_ID = 'active'

export interface StoredMidiMap {
  id: string
  bindings: MidiBinding[]
}

export interface MidiMapCatalog {
  load(): Promise<MidiBinding[] | undefined>
  save(bindings: MidiBinding[]): Promise<void>
}

export class MemoryMidiMapCatalog implements MidiMapCatalog {
  private bindings: MidiBinding[] | undefined

  async load(): Promise<MidiBinding[] | undefined> {
    return this.bindings === undefined
      ? undefined
      : this.bindings.map((binding) => ({
          ...binding,
          source: { ...binding.source },
          target: { ...binding.target },
        }))
  }

  async save(bindings: MidiBinding[]): Promise<void> {
    this.bindings = bindings.map((binding) => ({
      ...binding,
      source: { ...binding.source },
      target: { ...binding.target },
    }))
  }
}
