import { describe, expect, it } from 'vitest'
import {
  ccToTempoPercent,
  ccToUnit,
  formatMidiMessage,
  midiSourceKey,
  midiTargetFromKey,
  midiTargetKey,
  parseMidiBytes,
  relativeOffset64,
} from '../../src/domain/midi'

describe('parseMidiBytes', () => {
  it('parses note on, note off, and zero-velocity note on as release', () => {
    expect(parseMidiBytes([0x90, 60, 127])).toEqual({
      kind: 'note',
      channel: 1,
      number: 60,
      value: 127,
      pressed: true,
    })
    expect(parseMidiBytes([0x80, 60, 64])).toEqual({
      kind: 'note',
      channel: 1,
      number: 60,
      value: 0,
      pressed: false,
    })
    expect(parseMidiBytes([0x90, 60, 0])?.pressed).toBe(false)
  })

  it('parses CC on channel 16 and ignores clock', () => {
    expect(parseMidiBytes([0xbf, 10, 64])).toEqual({
      kind: 'cc',
      channel: 16,
      number: 10,
      value: 64,
      pressed: true,
    })
    expect(parseMidiBytes([0xf8])).toBeUndefined()
    expect(parseMidiBytes([0x90])).toBeUndefined()
  })
})

describe('midi helpers', () => {
  it('formats sources and converts CC values', () => {
    const message = parseMidiBytes([0xb0, 7, 0])
    expect(message).toBeDefined()
    if (!message) {
      return
    }
    expect(midiSourceKey(message)).toBe('cc:1:7')
    expect(formatMidiMessage(message)).toBe('Ch1 CC7 0')
    expect(ccToUnit(127)).toBe(1)
    expect(ccToTempoPercent(64, 10)).toBe(0)
    expect(ccToTempoPercent(127, 10)).toBe(10)
    expect(relativeOffset64(65)).toBe(1)
    expect(relativeOffset64(63)).toBe(-1)
  })

  it('round-trips target keys including pitch bend', () => {
    const target = { kind: 'pitchBend' as const, deck: 2 as const, direction: -1 as const }
    expect(midiTargetFromKey(midiTargetKey(target))).toEqual(target)
    expect(midiTargetFromKey('eq:1:low')).toEqual({ kind: 'eq', deck: 1, band: 'low' })
    expect(midiTargetFromKey('nope')).toBeUndefined()
  })
})
