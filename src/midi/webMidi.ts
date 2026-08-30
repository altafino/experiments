export interface MidiInputLike {
  id: string
  name?: string | null
  state?: string
  addEventListener(type: 'midimessage', listener: (event: Event) => void): void
  removeEventListener(type: 'midimessage', listener: (event: Event) => void): void
}

export interface MidiAccessLike {
  inputs: { values(): Iterable<MidiInputLike> }
  addEventListener(type: 'statechange', listener: () => void): void
  removeEventListener(type: 'statechange', listener: () => void): void
}

export type MidiAccessFactory = () => Promise<MidiAccessLike>

export async function requestBrowserMidiAccess(): Promise<MidiAccessLike> {
  const nav = navigator as Navigator & {
    requestMIDIAccess?: (options?: { sysex?: boolean }) => Promise<MidiAccessLike>
  }
  if (typeof nav.requestMIDIAccess !== 'function') {
    throw new Error('Web MIDI is not supported')
  }
  return nav.requestMIDIAccess({ sysex: false })
}

export function midiBytesFromEvent(event: Event): Uint8Array | undefined {
  if (!('data' in event)) {
    return undefined
  }
  const data = (event as { data?: unknown }).data
  if (data instanceof Uint8Array) {
    return data
  }
  if (Array.isArray(data)) {
    return new Uint8Array(data)
  }
  return undefined
}
