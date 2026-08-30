export interface BpmEstimate {
  bpm: number
  hop: number
  lag: number
}

const MIN_BPM = 70
const MAX_BPM = 180
const MIN_DURATION_SECONDS = 2

/**
 * Energy-flux BPM estimate in the typical DJ range.
 * Long-running; call from a worker, not the UI thread.
 */
export function detectBpm(mono: Float32Array, sampleRate: number): BpmEstimate | undefined {
  if (sampleRate <= 0 || mono.length / sampleRate < MIN_DURATION_SECONDS) {
    return undefined
  }

  const hop = Math.max(1, Math.round(sampleRate / 100))
  const onset = energyOnset(mono, hop)
  if (onset.length < 8) {
    return undefined
  }

  const fps = sampleRate / hop
  const minLag = Math.max(2, Math.floor((60 * fps) / MAX_BPM))
  const maxLag = Math.min(onset.length - 2, Math.floor((60 * fps) / MIN_BPM))
  if (maxLag <= minLag) {
    return undefined
  }

  let bestLag = minLag
  let bestScore = -1
  for (let lag = minLag; lag <= maxLag; lag += 1) {
    const score = autocorrelate(onset, lag)
    if (score > bestScore) {
      bestScore = score
      bestLag = lag
    }
  }

  if (bestScore <= 0) {
    return undefined
  }

  const bpm = canonicalizeBpm((60 * fps) / bestLag)
  if (bpm < MIN_BPM || bpm > MAX_BPM) {
    return undefined
  }

  return { bpm, hop, lag: bestLag }
}

export function energyOnset(mono: Float32Array, hop: number): Float32Array {
  const frames = Math.floor(mono.length / hop)
  const onset = new Float32Array(frames)
  let previous = 0
  for (let frame = 0; frame < frames; frame += 1) {
    const start = frame * hop
    let energy = 0
    for (let i = 0; i < hop; i += 1) {
      const sample = mono[start + i] ?? 0
      energy += sample * sample
    }
    const rms = Math.sqrt(energy / hop)
    onset[frame] = rms > previous ? rms - previous : 0
    previous = rms
  }

  const window = Math.min(32, Math.max(4, Math.floor(frames / 8)))
  for (let i = 0; i < frames; i += 1) {
    let mean = 0
    let count = 0
    const from = Math.max(0, i - window)
    const to = Math.min(frames - 1, i + window)
    for (let j = from; j <= to; j += 1) {
      mean += onset[j] ?? 0
      count += 1
    }
    const next = (onset[i] ?? 0) - mean / count
    onset[i] = next > 0 ? next : 0
  }

  return onset
}

function autocorrelate(onset: Float32Array, lag: number): number {
  let sum = 0
  const limit = onset.length - lag
  for (let i = 0; i < limit; i += 1) {
    sum += (onset[i] ?? 0) * (onset[i + lag] ?? 0)
  }
  return limit > 0 ? sum / limit : 0
}

function canonicalizeBpm(bpm: number): number {
  let value = bpm
  while (value < MIN_BPM) {
    value *= 2
  }
  while (value > MAX_BPM) {
    value /= 2
  }
  return value
}
