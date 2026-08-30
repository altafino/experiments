export function clamp(value: number, min: number, max: number): number {
  if (value < min) {
    return min
  }
  if (value > max) {
    return max
  }
  return value
}

export function formatTimecode(seconds: number, remaining = false): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  const minuteText = String(minutes).padStart(2, '0')
  const secondText = remainder.toFixed(1).padStart(4, '0')
  return remaining ? `-${minuteText}:${secondText}` : `${minuteText}:${secondText}`
}
