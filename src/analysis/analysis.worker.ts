import { analyzePcm } from './analyzePcm'
import type { AnalyzePcmInput, AnalyzeWorkerRequest, AnalyzeWorkerResponse } from './types'

self.onmessage = (event: MessageEvent<AnalyzeWorkerRequest>) => {
  const message = event.data
  if (message.type !== 'analyze') {
    return
  }
  try {
    const input: AnalyzePcmInput = {
      sampleRate: message.sampleRate,
      channels: message.channels,
    }
    const result = analyzePcm(input)
    const response: AnalyzeWorkerResponse = {
      type: 'result',
      requestId: message.requestId,
      ...result,
    }
    self.postMessage(response)
  } catch (error) {
    const response: AnalyzeWorkerResponse = {
      type: 'error',
      requestId: message.requestId,
      message: error instanceof Error ? error.message : 'Analysis failed',
    }
    self.postMessage(response)
  }
}
