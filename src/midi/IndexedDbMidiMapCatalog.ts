import type { MidiBinding } from '../domain/midi'
import { MIDI_MAPS_STORE, openWebDjDb } from '../library/webDjDb'
import { MIDI_MAP_ID, type MidiMapCatalog, type StoredMidiMap } from './MidiMapCatalog'

export class IndexedDbMidiMapCatalog implements MidiMapCatalog {
  async load(): Promise<MidiBinding[] | undefined> {
    if (typeof indexedDB === 'undefined') {
      return undefined
    }
    const db = await openWebDjDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MIDI_MAPS_STORE, 'readonly')
      const request = tx.objectStore(MIDI_MAPS_STORE).get(MIDI_MAP_ID)
      request.onsuccess = () => {
        const record = request.result as StoredMidiMap | undefined
        resolve(record?.bindings)
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB MIDI map get failed'))
      }
    })
  }

  async save(bindings: MidiBinding[]): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      return
    }
    const db = await openWebDjDb()
    const record: StoredMidiMap = { id: MIDI_MAP_ID, bindings }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(MIDI_MAPS_STORE, 'readwrite')
      const request = tx.objectStore(MIDI_MAPS_STORE).put(record)
      request.onsuccess = () => {
        resolve()
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB MIDI map put failed'))
      }
    })
  }
}
