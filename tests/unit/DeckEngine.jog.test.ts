import { describe, expect, it } from 'vitest'
import type { Clock } from '../../src/audio/AudioClock'
import { DeckEngine } from '../../src/audio/deck/DeckEngine'

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

describe('DeckEngine jog', () => {
  it('scratches the playhead in vinyl mode', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.setVinyl(true)
    deck.jogTouchStart()
    deck.jogTouchMove(Math.PI * 2)
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(1.8, 5)
    expect(deck.getSnapshot().vinylMode).toBe(true)
  })

  it('pitch-bends instead of seeking when vinyl is off', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.jogTouchMove(0.5)
    expect(deck.getSnapshot().pitchBend).toBe(1)
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(0, 8)
    deck.jogTouchEnd()
    expect(deck.getSnapshot().pitchBend).toBe(0)
  })

  it('returns to the slip timeline after a held scratch', () => {
    const clock: Clock = { currentTime: 0 }
    const deck = new DeckEngine(1, stubContext(), clock)
    deck.load(fakeBuffer(), { id: 't', title: 't', duration: 10 })
    deck.setVinyl(true)
    deck.setSlip(true)
    deck.play()
    deck.jogTouchStart()
    clock.currentTime = 2
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(0, 8)
    expect(deck.getSnapshot().logicalPositionSeconds).toBeCloseTo(2, 8)
    deck.jogTouchEnd()
    expect(deck.getSnapshot().positionSeconds).toBeCloseTo(2, 8)
    expect(deck.getSnapshot().playing).toBe(true)
  })
})
