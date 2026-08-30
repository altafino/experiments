import type { AnalysisRepository, StoredAnalysis } from './AnalysisRepository'

export class MemoryAnalysisRepository implements AnalysisRepository {
  private readonly records = new Map<string, StoredAnalysis>()

  async get(key: string): Promise<StoredAnalysis | undefined> {
    return this.records.get(key)
  }

  async put(record: StoredAnalysis): Promise<void> {
    this.records.set(record.key, record)
  }
}
