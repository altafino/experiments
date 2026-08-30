export const WEB_DJ_DB = 'web-dj'
export const WEB_DJ_DB_VERSION = 4
export const ANALYSIS_STORE = 'analysis'
export const TRACKS_STORE = 'tracks'
export const PLAYLISTS_STORE = 'playlists'
export const MIDI_MAPS_STORE = 'midiMaps'

export function openWebDjDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(WEB_DJ_DB, WEB_DJ_DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(ANALYSIS_STORE)) {
        db.createObjectStore(ANALYSIS_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(TRACKS_STORE)) {
        db.createObjectStore(TRACKS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(PLAYLISTS_STORE)) {
        db.createObjectStore(PLAYLISTS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(MIDI_MAPS_STORE)) {
        db.createObjectStore(MIDI_MAPS_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB open failed'))
    }
  })
}
