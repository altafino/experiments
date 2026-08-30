import type { AnalysisRepository, StoredAnalysis } from './AnalysisRepository'

const DB_NAME = 'web-dj'
const STORE_NAME = 'analysis'
const DB_VERSION = 1

export class IndexedDbRepository implements AnalysisRepository {
  async get(key: string): Promise<StoredAnalysis | undefined> {
    if (typeof indexedDB === 'undefined') {
      return undefined
    }
    const db = await openDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const request = tx.objectStore(STORE_NAME).get(key)
      request.onsuccess = () => {
        resolve(request.result as StoredAnalysis | undefined)
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB get failed'))
      }
    })
  }

  async put(record: StoredAnalysis): Promise<void> {
    if (typeof indexedDB === 'undefined') {
      return
    }
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const request = tx.objectStore(STORE_NAME).put(record)
      request.onsuccess = () => {
        resolve()
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB put failed'))
      }
    })
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
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
