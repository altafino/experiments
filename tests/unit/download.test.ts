import { describe, expect, it } from 'vitest'
import { mixRecordingFilename } from '../../src/io/download'

describe('mixRecordingFilename', () => {
  it('uses a webm name stamped from the clock', () => {
    expect(mixRecordingFilename(new Date('2026-08-30T16:05:00.000Z'))).toBe(
      'web-dj-mix-2026-08-30T16-05-00.webm',
    )
  })
})
