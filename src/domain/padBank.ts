export const PAD_BANKS = ['hotcue', 'loop', 'jump'] as const

export type PadBank = (typeof PAD_BANKS)[number]

export const DEFAULT_PAD_BANK: PadBank = 'hotcue'

export const PAD_BANK_LABELS: Record<PadBank, string> = {
  hotcue: 'Hot Cue',
  loop: 'Loop',
  jump: 'Jump',
}

export function padBankTestId(bank: PadBank): string {
  return `pad-bank-${bank}`
}
