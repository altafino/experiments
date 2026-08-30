export interface PeakSource {
  numberOfChannels: number
  length: number
  getChannelData(channel: number): Float32Array
}

export const DEFAULT_PEAK_BUCKETS = 2048

/**
 * Downsample decoded PCM into peak buckets for canvas rendering.
 * Analysis-quality BPM work belongs in a worker (Phase 5); this is
 * a one-shot visual extract after decode.
 */
export function extractPeaks(
  source: PeakSource,
  bucketCount = DEFAULT_PEAK_BUCKETS,
): Float32Array {
  if (source.length <= 0 || bucketCount <= 0 || source.numberOfChannels <= 0) {
    return new Float32Array(0)
  }

  const count = Math.min(bucketCount, source.length)
  const samplesPerBucket = Math.max(1, Math.floor(source.length / count))
  const peaks = new Float32Array(count)
  const channels: Float32Array[] = []

  for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
    channels.push(source.getChannelData(channel))
  }

  for (let bucket = 0; bucket < count; bucket += 1) {
    const start = bucket * samplesPerBucket
    const end =
      bucket === count - 1 ? source.length : Math.min(source.length, start + samplesPerBucket)
    let peak = 0
    for (const data of channels) {
      for (let i = start; i < end; i += 1) {
        const sample = data[i]
        if (sample === undefined) {
          continue
        }
        const abs = sample < 0 ? -sample : sample
        if (abs > peak) {
          peak = abs
        }
      }
    }
    peaks[bucket] = peak
  }

  return peaks
}
