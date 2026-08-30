import { describe, expect, it } from 'vitest'
import type { AnalysisResult } from '../../src/analysis/types'
import type { Clock } from '../../src/audio/AudioClock'
import { DeckEngine } from '../../src/audio/deck/DeckEngine'
import { BEAT_LOOP_1 } from '../../src/domain/loop'

function stubContext(): BaseAudioContext {
  return {
    currentTime: 0,
    createGain: () => ({
      connect: () => undefined,
      disconnect: () => undefined,
      gain: { value: 1 },
    }),
    createBufferSource: () => ({
      buffer: null,
      playbackRate: { value: 1, setValueAtTime: () => undefined },
      connect: () => undefined,
      disconnect: () => undefined,
      start: () => undefined,
      stop: () => undefined,
      onended: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
    }),
  } as unknown as BaseAudioContext
}

function fakeBuffer(duration = 10): AudioBuffer {
  return {
    duration,
    sampleRate: 44100,
    numberOfChannels: 1,
    length: 44100,
    getChannelData: () => new Float32Array(8),
  } as AudioBuffer
}

function analysis120(): AnalysisResult {
  return {
    waveform: { peaks: new Float32Array(4), bucketCount: 4, levels: [] },
    bpm: 120,
    beatGrid: { bpm: 120, firstBeatSeconds: 0, beats: [] },
    loudness: 0,
  }
}

describe('DeckEngine loops', () => {
  it('wraps transport position inside a 1-beat loop', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.applyAnalysis(analysis120())
    deck.beatLoop(BEAT_LOOP_1)

    const loop = deck.getSnapshot().activeLoop
    expect(loop?.active).toBe(true)
    expect(loop?.endSeconds).toBeCloseTo(0.5, 8)
    expect(deck.getSnapshot().playing).toBe(true)

    clock.currentTime = 1.25
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(0.25, 8)
  })

  it('sets a manual loop from in and out without requiring BPM', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.seek(1)
    deck.loopIn()
    deck.seek(2)
    deck.loopOut()
    const loop = deck.getSnapshot().activeLoop
    expect(loop).toEqual({
      startSeconds: 1,
      endSeconds: 2,
      beats: undefined,
      active: true,
    })
  })

  it('exits on reloop and keeps the stored region', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.applyAnalysis(analysis120())
    deck.beatLoop(BEAT_LOOP_1)
    deck.reloop()
    expect(deck.getSnapshot().activeLoop?.active).toBe(false)
    expect(deck.getSnapshot().activeLoop?.endSeconds).toBeCloseTo(0.5, 8)
  })
})
