export function mixToMono(channels: Float32Array[]): Float32Array {
  const first = channels[0]
  if (!first || channels.length === 0) {
    return new Float32Array(0)
  }
  if (channels.length === 1) {
    return first
  }
  const mixed = new Float32Array(first.length)
  const count = channels.length
  for (let i = 0; i < first.length; i += 1) {
    let sum = 0
    for (const channel of channels) {
      sum += channel[i] ?? 0
    }
    mixed[i] = sum / count
  }
  return mixed
}

export function rmsDb(mono: Float32Array): number {
  if (mono.length === 0) {
    return -Infinity
  }
  let sum = 0
  for (let i = 0; i < mono.length; i += 1) {
    const sample = mono[i] ?? 0
    sum += sample * sample
  }
  const rms = Math.sqrt(sum / mono.length)
  if (rms <= 1e-12) {
    return -120
  }
  return 20 * Math.log10(rms)
}
