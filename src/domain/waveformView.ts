import type { BeatGrid, WaveformLevel } from './Track'

/** Visible durations, in seconds, offered by the zoomed waveform. */
export const ZOOM_WINDOWS = [1, 2, 4, 8, 16, 32] as const

export type ZoomWindowSeconds = (typeof ZOOM_WINDOWS)[number]

export const DEFAULT_ZOOM_WINDOW: ZoomWindowSeconds = 8

/** Beats per bar used to emphasise downbeats on the grid. */
export const BEATS_PER_BAR = 4

const MAX_BEAT_TICKS = 512

export function zoomIn(current: ZoomWindowSeconds): ZoomWindowSeconds {
  const index = ZOOM_WINDOWS.indexOf(current)
  return ZOOM_WINDOWS[Math.max(0, index - 1)] ?? DEFAULT_ZOOM_WINDOW
}

export function zoomOut(current: ZoomWindowSeconds): ZoomWindowSeconds {
  const index = ZOOM_WINDOWS.indexOf(current)
  return ZOOM_WINDOWS[Math.min(ZOOM_WINDOWS.length - 1, index + 1)] ?? DEFAULT_ZOOM_WINDOW
}

export interface WaveformWindow {
  startSeconds: number
  endSeconds: number
  secondsPerPixel: number
}

/**
 * Time range shown by a playhead-centred waveform. The window is never clamped
 * to the track so the playhead stays fixed at the centre of the canvas.
 */
export function waveformWindow(
  positionSeconds: number,
  windowSeconds: number,
  widthPx: number,
): WaveformWindow {
  const span = windowSeconds > 0 ? windowSeconds : DEFAULT_ZOOM_WINDOW
  const half = span / 2
  return {
    startSeconds: positionSeconds - half,
    endSeconds: positionSeconds + half,
    secondsPerPixel: widthPx > 0 ? span / widthPx : span,
  }
}

/** Seconds covered by one peak bucket of a level spanning the whole track. */
export function bucketSeconds(peakCount: number, durationSeconds: number): number {
  if (peakCount <= 0 || durationSeconds <= 0) {
    return 0
  }
  return durationSeconds / peakCount
}

/**
 * Coarsest level that still resolves at least one bucket per pixel, falling
 * back to the finest available level when every level is coarser than a pixel.
 */
export function selectPeakLevel(
  levels: readonly WaveformLevel[] | undefined,
  durationSeconds: number,
  secondsPerPixel: number,
): WaveformLevel | undefined {
  if (!levels || levels.length === 0 || durationSeconds <= 0) {
    return undefined
  }

  let chosen: WaveformLevel | undefined
  let chosenBucket = 0
  let finest: WaveformLevel | undefined
  let finestBucket = Number.POSITIVE_INFINITY

  for (const level of levels) {
    const bucket = bucketSeconds(level.peaks.length, durationSeconds)
    if (bucket <= 0) {
      continue
    }
    if (bucket < finestBucket) {
      finest = level
      finestBucket = bucket
    }
    if (bucket <= secondsPerPixel && bucket > chosenBucket) {
      chosen = level
      chosenBucket = bucket
    }
  }

  return chosen ?? finest
}

/** Loudest peak between two times. Ranges outside the track resolve to 0. */
export function peakBetween(
  peaks: Float32Array,
  bucket: number,
  startSeconds: number,
  endSeconds: number,
): number {
  if (bucket <= 0 || peaks.length === 0 || endSeconds < 0) {
    return 0
  }
  const from = Math.max(0, Math.floor(startSeconds / bucket))
  const to = Math.min(peaks.length - 1, Math.floor(endSeconds / bucket))
  let peak = 0
  for (let i = from; i <= to; i += 1) {
    const value = peaks[i] ?? 0
    if (value > peak) {
      peak = value
    }
  }
  return peak
}

export interface BeatTick {
  seconds: number
  downbeat: boolean
}

/**
 * Beat positions inside a window, derived from the constant-tempo grid so ticks
 * stay exact regardless of how far the window sits from the first beat.
 */
export function beatTicksInWindow(
  grid: BeatGrid | undefined,
  startSeconds: number,
  endSeconds: number,
  maxTicks = MAX_BEAT_TICKS,
): BeatTick[] {
  if (!grid || !Number.isFinite(grid.bpm) || grid.bpm <= 0 || endSeconds <= startSeconds) {
    return []
  }
  const period = 60 / grid.bpm
  const first = grid.firstBeatSeconds
  const ticks: BeatTick[] = []
  let index = Math.ceil((startSeconds - first) / period)

  while (ticks.length < maxTicks) {
    const seconds = first + index * period
    if (seconds > endSeconds) {
      break
    }
    if (seconds >= 0) {
      ticks.push({ seconds, downbeat: ((index % BEATS_PER_BAR) + BEATS_PER_BAR) % BEATS_PER_BAR === 0 })
    }
    index += 1
  }

  return ticks
}

/** Skip canvas paint when the LCD tab is off or the element is off-screen. */
export function shouldPaintWaveform(displayActive: boolean, intersecting: boolean): boolean {
  return displayActive && intersecting
}
