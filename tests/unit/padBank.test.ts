import { describe, expect, it } from 'vitest'
import { DEFAULT_PAD_BANK, PAD_BANKS, padBankTestId } from '../../src/domain/padBank'

describe('padBank', () => {
  it('defaults to hot cue and exposes stable test ids', () => {
    expect(DEFAULT_PAD_BANK).toBe('hotcue')
    expect(PAD_BANKS).toEqual(['hotcue', 'loop', 'jump'])
    expect(padBankTestId('loop')).toBe('pad-bank-loop')
  })
})
