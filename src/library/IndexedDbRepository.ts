import type { AnalysisRepository, StoredAnalysis } from './AnalysisRepository'
import { ANALYSIS_STORE, openWebDjDb } from './webDjDb'

export class IndexedDbRepository implements AnalysisRepository {
  async get(key: string): Promise<StoredAnalysis | undefined> {
    if (typeof indexedDB === 'undefined') {
      return undefined
    }
    const db = await openWebDjDb()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(ANALYSIS_STORE, 'readonly')
      const request = tx.objectStore(ANALYSIS_STORE).get(key)
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
    const db = await openWebDjDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(ANALYSIS_STORE, 'readwrite')
      const request = tx.objectStore(ANALYSIS_STORE).put(record)
      request.onsuccess = () => {
        resolve()
      }
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB put failed'))
      }
    })
  }
}
