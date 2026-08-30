import type { Playlist } from '../domain/library'
import type { LibraryCatalog, StoredLibraryTrack } from './LibraryCatalog'
import { openWebDjDb, PLAYLISTS_STORE, TRACKS_STORE } from './webDjDb'

export class IndexedDbLibraryCatalog implements LibraryCatalog {
  async listTracks(): Promise<StoredLibraryTrack[]> {
    return getAll<StoredLibraryTrack>(TRACKS_STORE)
  }

  async putTrack(track: StoredLibraryTrack): Promise<void> {
    await putValue(TRACKS_STORE, track)
  }

  async listPlaylists(): Promise<Playlist[]> {
    return getAll<Playlist>(PLAYLISTS_STORE)
  }

  async putPlaylist(playlist: Playlist): Promise<void> {
    await putValue(PLAYLISTS_STORE, playlist)
  }

  async deletePlaylist(id: string): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      return
    }
    const db = await openWebDjDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PLAYLISTS_STORE, 'readwrite')
      const request = tx.objectStore(PLAYLISTS_STORE).delete(id)
      request.onsuccess = () => {
        resolve()
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB delete failed'))
      }
    })
  }
}

async function getAll<T>(store: string): Promise<T[]> {
  if (typeof indexedDB === 'undefined') {
    return []
  }
  const db = await openWebDjDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly')
    const request = tx.objectStore(store).getAll()
    request.onsuccess = () => {
      resolve((request.result as T[]) ?? [])
    }
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB getAll failed'))
    }
  })
}

async function putValue(store: string, value: unknown): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return
  }
  const db = await openWebDjDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite')
    const request = tx.objectStore(store).put(value)
    request.onsuccess = () => {
      resolve()
    }
    request.onerror = () => {
      reject(request.error ?? new Error('IndexedDB put failed'))
    }
  })
}
