import { describe, expect, it } from 'vitest'
import { DeckTransport } from '../../src/audio/deck/DeckTransport'

describe('DeckTransport', () => {
  it('keeps position frozen while paused regardless of clock advances', () => {
    const transport = new DeckTransport()
    transport.reset(120)
    transport.seek(10, 0)
    transport.play(5)
    transport.pause(8)

    expect(transport.getPosition(8)).toBe(13)
    expect(transport.getPosition(100)).toBe(13)
    expect(transport.isPlaying()).toBe(false)
  })

  it.each([
    {
      name: 'advances from AudioContext time while playing',
      duration: 60,
      actions: (t: DeckTransport) => {
        t.play(1)
        return t.getPosition(4)
      },
      expected: 3,
    },
    {
      name: 'clamps seek below zero',
      duration: 60,
      actions: (t: DeckTransport) => t.seek(-4, 0),
      expected: 0,
    },
    {
      name: 'clamps seek past duration',
      duration: 20,
      actions: (t: DeckTransport) => t.seek(99, 0),
      expected: 20,
    },
    {
      name: 'applies playback rate to elapsed time',
      duration: 60,
      actions: (t: DeckTransport) => {
        t.setPlaybackRate(2)
        t.play(0)
        return t.getPosition(3)
      },
      expected: 6,
    },
  ])('$name', ({ duration, actions, expected }) => {
    const transport = new DeckTransport()
    transport.reset(duration)
    expect(actions(transport)).toBe(expected)
  })

  it('does not start playback at the end of the track', () => {
    const transport = new DeckTransport()
    transport.reset(10)
    transport.seek(10, 0)
    expect(transport.play(1)).toBe(false)
    expect(transport.isPlaying()).toBe(false)
  })

  it('does not start playback without a duration', () => {
    const transport = new DeckTransport()
    expect(transport.play(0)).toBe(false)
  })

  it('sets the cue point when paused and returns to it when playing', () => {
    const transport = new DeckTransport()
    transport.reset(60)
    transport.seek(12.5, 0)

    expect(transport.cue(0)).toBe('set')
    expect(transport.cuePoint()).toBe(12.5)

    transport.play(1)
    expect(transport.getPosition(5)).toBe(16.5)
    expect(transport.cue(5)).toBe('return')
    expect(transport.isPlaying()).toBe(false)
    expect(transport.getPosition(5)).toBe(12.5)
    expect(transport.getPosition(40)).toBe(12.5)
  })

  it('keeps playing through a seek and re-anchors the clock', () => {
    const transport = new DeckTransport()
    transport.reset(60)
    transport.play(0)
    transport.seek(20, 5)

    expect(transport.isPlaying()).toBe(true)
    expect(transport.getPosition(5)).toBe(20)
    expect(transport.getPosition(8)).toBe(23)
  })

  it('parks at duration when the source reports a natural end', () => {
    const transport = new DeckTransport()
    transport.reset(15)
    transport.play(0)
    transport.notifyEnded()

    expect(transport.isPlaying()).toBe(false)
    expect(transport.getPosition(99)).toBe(15)
  })
})
