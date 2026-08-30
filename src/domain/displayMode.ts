export const DISPLAY_MODES = ['performance', 'browse', 'info', 'settings'] as const

export type DisplayMode = (typeof DISPLAY_MODES)[number]

export const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  performance: 'Perform',
  browse: 'Browse',
  info: 'Info',
  settings: 'Settings',
}
