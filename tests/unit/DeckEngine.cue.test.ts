import { describe, expect, it } from 'vitest'
import type { Clock } from '../../src/audio/AudioClock'
import { DeckEngine } from '../../src/audio/deck/DeckEngine'
import type { AnalysisResult } from '../../src/analysis/types'

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

describe('DeckEngine cue + hot cues', () => {
  it('sets a memory cue while paused away from the existing point', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.seek(2)

    deck.cue()

    expect(deck.getSnapshot().cuePoint).toBe(2)
    expect(deck.getSnapshot().playing).toBe(false)
  })

  it('sets a hot cue on an empty pad and jumps to it on the next press', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.seek(2.5)
    deck.hotCue('A')
    expect(deck.getSnapshot().hotCues).toEqual([{ id: 'A', positionSeconds: 2.5 }])

    deck.seek(0)
    deck.hotCue('A')

    const snap = deck.getSnapshot()
    expect(snap.playing).toBe(true)
    expect(snap.positionSeconds).toBe(2.5)
  })

  it('snaps a new hot cue to the nearest beat when quantize is on', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(2, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    const analysis: AnalysisResult = {
      waveform: { peaks: new Float32Array(4), bucketCount: 4, levels: [] },
      bpm: 120,
      beatGrid: { bpm: 120, firstBeatSeconds: 0, beats: [] },
      loudness: 0,
    }
    deck.applyAnalysis(analysis)
    deck.setQuantize(true)
    deck.seek(0.1)
    deck.hotCue('B')
    expect(deck.getSnapshot().hotCues[0]?.positionSeconds).toBeCloseTo(0, 8)
    expect(deck.getSnapshot().quantizeEnabled).toBe(true)
  })

  it('clears a hot cue without moving the playhead', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.seek(3)
    deck.hotCue('C')
    deck.clearHotCue('C')
    expect(deck.getSnapshot().hotCues).toEqual([])
    expect(deck.getSnapshot().positionSeconds).toBe(3)
  })
})
