import { describe, expect, it, vi } from 'vitest'
import { analyzePcm } from '../../src/analysis/analyzePcm'
import { TrackAnalyzer } from '../../src/analysis/TrackAnalyzer'
import { MemoryAnalysisRepository } from '../../src/library/MemoryAnalysisRepository'
import { fileAnalysisKey } from '../../src/library/fileAnalysisKey'

describe('TrackAnalyzer', () => {
  it('returns cached analysis on the second call without re-running DSP', async () => {
    const repo = new MemoryAnalysisRepository()
    const analyze = vi.fn(async (input: Parameters<typeof analyzePcm>[0]) => analyzePcm(input))
    const analyzer = new TrackAnalyzer(repo, analyze)
    const file = new File([new Uint8Array([1, 2, 3])], 'loop.wav', { lastModified: 42 })
    const clicks = new Float32Array(44100 * 4)
    for (let i = 0; i < clicks.length; i += 22050) {
      clicks[i] = 1
    }
    const pcm = {
      sampleRate: 44100,
      duration: 4,
      channels: [clicks],
    }

    const first = await analyzer.analyzeFile(file, pcm)
    const second = await analyzer.analyzeFile(file, pcm)

    expect(analyze).toHaveBeenCalledOnce()
    expect(second.waveform.bucketCount).toBe(first.waveform.bucketCount)
    expect(await repo.get(fileAnalysisKey(file))).toBeDefined()
  })
})
