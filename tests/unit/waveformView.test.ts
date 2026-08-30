import { describe, expect, it } from 'vitest'
import type { WaveformLevel } from '../../src/domain/Track'
import {
  beatTicksInWindow,
  bucketSeconds,
  peakBetween,
  selectPeakLevel,
  waveformWindow,
  zoomIn,
  zoomOut,
  ZOOM_WINDOWS,
} from '../../src/domain/waveformView'

function level(samplesPerBucket: number, count: number): WaveformLevel {
  return { samplesPerBucket, peaks: new Float32Array(count) }
}

describe('waveformWindow', () => {
  it('centres the playhead and keeps the window unclamped at the track edges', () => {
    expect(waveformWindow(30, 8, 800)).toEqual({
      startSeconds: 26,
      endSeconds: 34,
      secondsPerPixel: 0.01,
    })
    expect(waveformWindow(0, 4, 400)).toEqual({
      startSeconds: -2,
      endSeconds: 2,
      secondsPerPixel: 0.01,
    })
  })

  it('falls back to the full span when the canvas has no width', () => {
    expect(waveformWindow(10, 4, 0).secondsPerPixel).toBe(4)
  })
})

describe('zoom stepping', () => {
  it('clamps at both ends of the zoom ladder', () => {
    expect(ZOOM_WINDOWS[0]).toBe(1)
    expect(zoomIn(1)).toBe(1)
    expect(zoomOut(32)).toBe(32)
    expect(zoomIn(8)).toBe(4)
    expect(zoomOut(8)).toBe(16)
  })
})

describe('selectPeakLevel', () => {
  const levels = [level(64, 3000), level(256, 750), level(1024, 188), level(4096, 47)]
  const duration = 4

  it('picks the coarsest level that still resolves one bucket per pixel', () => {
    expect(selectPeakLevel(levels, duration, bucketSeconds(750, duration))?.samplesPerBucket).toBe(
      256,
    )
    expect(selectPeakLevel(levels, duration, 1)?.samplesPerBucket).toBe(4096)
  })

  it('falls back to the finest level when every level is coarser than a pixel', () => {
    expect(selectPeakLevel(levels, duration, 0.00001)?.samplesPerBucket).toBe(64)
  })

  it('returns nothing without levels or duration', () => {
    expect(selectPeakLevel(undefined, duration, 0.01)).toBeUndefined()
    expect(selectPeakLevel(levels, 0, 0.01)).toBeUndefined()
  })
})

describe('peakBetween', () => {
  const peaks = Float32Array.from([0.1, 0.9, 0.3, 0.2])

  it('takes the loudest bucket touched by the range', () => {
    expect(peakBetween(peaks, 1, 0, 1.5)).toBeCloseTo(0.9)
    expect(peakBetween(peaks, 1, 2, 2.5)).toBeCloseTo(0.3)
  })

  it('reads silence outside the track', () => {
    expect(peakBetween(peaks, 1, -3, -1)).toBe(0)
    expect(peakBetween(peaks, 1, 9, 10)).toBe(0)
    expect(peakBetween(peaks, 0, 0, 1)).toBe(0)
  })
})

describe('beatTicksInWindow', () => {
  const grid = { bpm: 120, firstBeatSeconds: 0.25, beats: [] }

  it('emits beats inside the window and marks every fourth as a downbeat', () => {
    const ticks = beatTicksInWindow(grid, 0.2, 2.3)
    expect(ticks.map((tick) => tick.seconds)).toEqual([0.25, 0.75, 1.25, 1.75, 2.25])
    expect(ticks.filter((tick) => tick.downbeat).map((tick) => tick.seconds)).toEqual([0.25, 2.25])
  })

  it('extends the grid backwards from the first beat but skips negative times', () => {
    const ticks = beatTicksInWindow({ bpm: 120, firstBeatSeconds: 1, beats: [] }, -1, 1)
    expect(ticks.map((tick) => tick.seconds)).toEqual([0, 0.5, 1])
  })

  it('returns nothing for an unusable grid or window', () => {
    expect(beatTicksInWindow(undefined, 0, 4)).toEqual([])
    expect(beatTicksInWindow({ bpm: 0, firstBeatSeconds: 0, beats: [] }, 0, 4)).toEqual([])
    expect(beatTicksInWindow(grid, 4, 4)).toEqual([])
  })

  it('caps runaway grids', () => {
    expect(beatTicksInWindow(grid, 0, 60 * 60, 16)).toHaveLength(16)
  })
})
