import { parseMidiBytes, type MidiDeviceInfo, type MidiMessage } from '../domain/midi'
import {
  midiBytesFromEvent,
  type MidiAccessFactory,
  type MidiAccessLike,
  type MidiInputLike,
} from './webMidi'

/**
 * Owns Web MIDI ports. Forwards parsed messages; never talks to Vue or DSP.
 */
export class MidiManager {
  private readonly requestAccess: MidiAccessFactory
  private readonly onMessage: (message: MidiMessage) => void
  private readonly onChange: () => void
  private readonly handleMessage: (event: Event) => void
  private readonly handleState: () => void
  private access: MidiAccessLike | undefined
  private subscribed = new Set<MidiInputLike>()

  constructor(
    requestAccess: MidiAccessFactory,
    onMessage: (message: MidiMessage) => void,
    onChange: () => void = () => undefined,
  ) {
    this.requestAccess = requestAccess
    this.onMessage = onMessage
    this.onChange = onChange
    this.handleMessage = (event: Event) => {
      const bytes = midiBytesFromEvent(event)
      if (!bytes) {
        return
      }
      const message = parseMidiBytes(bytes)
      if (!message) {
        return
      }
      this.onMessage(message)
    }
    this.handleState = () => {
      this.resubscribe()
      this.onChange()
    }
  }

  async open(): Promise<void> {
    this.close()
    this.access = await this.requestAccess()
    this.access.addEventListener('statechange', this.handleState)
    this.resubscribe()
  }

  close(): void {
    this.unsubscribeAll()
    if (this.access) {
      this.access.removeEventListener('statechange', this.handleState)
    }
    this.access = undefined
  }

  devices(): MidiDeviceInfo[] {
    if (!this.access) {
      return []
    }
    const devices: MidiDeviceInfo[] = []
    for (const input of this.access.inputs.values()) {
      if (input.state === 'disconnected') {
        continue
      }
      devices.push({ id: input.id, name: input.name?.trim() || input.id })
    }
    return devices
  }

  private resubscribe(): void {
    this.unsubscribeAll()
    if (!this.access) {
      return
    }
    for (const input of this.access.inputs.values()) {
      if (input.state === 'disconnected') {
        continue
      }
      input.addEventListener('midimessage', this.handleMessage)
      this.subscribed.add(input)
    }
  }

  private unsubscribeAll(): void {
    for (const input of this.subscribed) {
      input.removeEventListener('midimessage', this.handleMessage)
    }
    this.subscribed.clear()
  }
}
