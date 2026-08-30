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

describe('DeckEngine slip', () => {
  it('jumps to the background timeline when a slip loop exits', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.applyAnalysis(analysis120())
    deck.setSlip(true)
    deck.beatLoop(BEAT_LOOP_1)

    clock.currentTime = 2
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(0, 8)
    expect(deck.getSnapshot().slipActive).toBe(true)
    expect(deck.getSnapshot().logicalPositionSeconds).toBeCloseTo(2, 8)

    deck.reloop()
    expect(deck.getSnapshot().activeLoop?.active).toBe(false)
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(2, 8)
    expect(deck.getSnapshot().slipActive).toBe(false)
  })

  it('does not jump on loop exit when slip is off', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.applyAnalysis(analysis120())
    deck.beatLoop(BEAT_LOOP_1)
    clock.currentTime = 2
    deck.reloop()
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(0, 8)
  })

  it('restores the background position when a slip hot cue is released', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.hotCue('A')
    deck.seek(2)
    deck.setSlip(true)
    deck.play()
    deck.hotCue('A')

    clock.currentTime = 1
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(1, 8)

    deck.hotCueRelease('A')
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(3, 8)
    expect(deck.getSnapshot().playing).toBe(true)
  })

  it('leaves audible playback alone when slip is disabled during a loop', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.applyAnalysis(analysis120())
    deck.setSlip(true)
    deck.beatLoop(BEAT_LOOP_1)
    clock.currentTime = 2
    deck.setSlip(false)
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(0, 8)
    expect(deck.getSnapshot().activeLoop?.active).toBe(true)
    deck.reloop()
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(0, 8)
  })
})
