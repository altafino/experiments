import { describe, expect, it } from 'vitest'
import { formatTimecode } from '../../src/domain/timecode'

describe('formatTimecode', () => {
  it.each([
    { seconds: 0, remaining: false, expected: '00:00.0' },
    { seconds: 12.34, remaining: false, expected: '00:12.3' },
    { seconds: 70.25, remaining: false, expected: '01:10.3' },
    { seconds: 5, remaining: true, expected: '-00:05.0' },
    { seconds: -3, remaining: false, expected: '00:00.0' },
  ])('formats $seconds remaining=$remaining', ({ seconds, remaining, expected }) => {
    expect(formatTimecode(seconds, remaining)).toBe(expected)
  })
})
