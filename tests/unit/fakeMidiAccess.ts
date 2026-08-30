import type { MidiAccessLike, MidiInputLike } from '../../src/midi/webMidi'

export class FakeMidiInput extends EventTarget implements MidiInputLike {
  id = 'generic-test'
  name = 'Generic Test'
  state = 'connected'

  send(bytes: number[]): void {
    const event = new Event('midimessage')
    Object.defineProperty(event, 'data', { value: new Uint8Array(bytes) })
    this.dispatchEvent(event)
  }
}

export function fakeMidiAccess(inputs: MidiInputLike[] = [new FakeMidiInput()]): MidiAccessLike {
  return {
    inputs: {
      values: () => inputs,
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }
}
