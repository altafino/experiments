import type { AnalysisResult, AnalyzePcmInput, AnalyzeWorkerRequest, AnalyzeWorkerResponse } from './types'
import { analyzePcm } from './analyzePcm'
import { fileAnalysisKey } from '../library/fileAnalysisKey'
import type { AnalysisRepository } from '../library/AnalysisRepository'
import { waveformFromStored, waveformToStored } from '../library/AnalysisRepository'
import { IndexedDbRepository } from '../library/IndexedDbRepository'

export type AnalyzeFn = (input: AnalyzePcmInput) => Promise<AnalysisResult>

/**
 * Loads cached analysis or runs the worker pipeline.
 * PCM copies are transferred into the worker; Vue is not involved.
 */
export class TrackAnalyzer {
  private readonly repo: AnalysisRepository
  private readonly analyze: AnalyzeFn
  private worker: Worker | undefined
  private readonly pending = new Map<
    string,
    { resolve: (result: AnalysisResult) => void; reject: (error: Error) => void }
  >()

  constructor(repo: AnalysisRepository = new IndexedDbRepository(), analyze?: AnalyzeFn) {
    this.repo = repo
    this.analyze = analyze ?? ((input) => this.analyzeInWorker(input))
  }

  async readCache(file: File): Promise<AnalysisResult | undefined> {
    const cached = await this.repo.get(fileAnalysisKey(file))
    if (!cached?.waveform.peaks.length) {
      return undefined
    }
    return {
      waveform: waveformFromStored(cached.waveform),
      bpm: cached.bpm,
      beatGrid: cached.beatGrid,
      loudness: cached.loudness,
    }
  }

  async analyzeFile(
    file: File,
    pcm: { sampleRate: number; duration: number; channels: Float32Array[] },
  ): Promise<AnalysisResult> {
    const cached = await this.readCache(file)
    if (cached) {
      return cached
    }

    const result = await this.analyze({
      sampleRate: pcm.sampleRate,
      channels: pcm.channels,
    })

    try {
      await this.repo.put({
        key: fileAnalysisKey(file),
        title: file.name,
        duration: pcm.duration,
        bpm: result.bpm,
        loudness: result.loudness,
        beatGrid: result.beatGrid,
        waveform: waveformToStored(result.waveform),
        analyzedAt: Date.now(),
      })
    } catch {
      // Playback still works if persistence fails.
    }

    return result
  }

  private analyzeInWorker(input: AnalyzePcmInput): Promise<AnalysisResult> {
    if (typeof Worker === 'undefined') {
      return Promise.resolve(analyzePcm(input))
    }

    const requestId = crypto.randomUUID()
    const worker = this.requireWorker()
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject })
      const request: AnalyzeWorkerRequest = {
        type: 'analyze',
        requestId,
        sampleRate: input.sampleRate,
        channels: input.channels,
      }
      const transfers: Transferable[] = []
      for (const channel of input.channels) {
        transfers.push(channel.buffer)
      }
      worker.postMessage(request, transfers)
    })
  }

  private requireWorker(): Worker {
    if (this.worker) {
      return this.worker
    }
    const worker = new Worker(new URL('./analysis.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.addEventListener('message', (event: MessageEvent<AnalyzeWorkerResponse>) => {
      this.onWorkerMessage(event.data)
    })
    worker.addEventListener('error', (event) => {
      const error = new Error(event.message || 'Analysis worker failed')
      for (const pending of this.pending.values()) {
        pending.reject(error)
      }
      this.pending.clear()
    })
    this.worker = worker
    return worker
  }

  private onWorkerMessage(message: AnalyzeWorkerResponse): void {
    const pending = this.pending.get(message.requestId)
    if (!pending) {
      return
    }
    this.pending.delete(message.requestId)
    switch (message.type) {
      case 'result':
        pending.resolve({
          waveform: message.waveform,
          bpm: message.bpm,
          beatGrid: message.beatGrid,
          loudness: message.loudness,
        })
        return
      case 'error':
        pending.reject(new Error(message.message))
        return
      default: {
        const neverMessage: never = message
        pending.reject(new Error(`Unknown worker message: ${JSON.stringify(neverMessage)}`))
        return
      }
    }
  }
}
