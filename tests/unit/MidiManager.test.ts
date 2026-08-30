import { describe, expect, it } from 'vitest'
import { MidiManager } from '../../src/midi/MidiManager'
import { FakeMidiInput, fakeMidiAccess } from './fakeMidiAccess'

describe('MidiManager', () => {
  it('forwards parsed input messages and ignores clock bytes', async () => {
    const input = new FakeMidiInput()
    const messages: unknown[] = []
    const manager = new MidiManager(
      async () => fakeMidiAccess([input]),
      (message) => {
        messages.push(message)
      },
    )

    await manager.open()
    expect(manager.devices()).toEqual([{ id: 'generic-test', name: 'Generic Test' }])
    input.send([0xb0, 7, 64])
    input.send([0xf8])
    expect(messages).toEqual([
      { kind: 'cc', channel: 1, number: 7, value: 64, pressed: true },
    ])
    manager.close()
    input.send([0xb0, 7, 0])
    expect(messages).toHaveLength(1)
  })
})
