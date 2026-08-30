import { describe, expect, it, vi } from 'vitest'
import type { DJCommand } from '../../src/commands/DJCommand'
import { MemoryMidiMapCatalog } from '../../src/midi/MidiMapCatalog'
import { MidiService } from '../../src/midi/MidiService'
import { FakeMidiInput, fakeMidiAccess } from './fakeMidiAccess'

describe('MidiService', () => {
  it('connects, plays from the generic map, and learns a replacement note', async () => {
    const input = new FakeMidiInput()
    const dispatched: DJCommand[] = []
    const catalog = new MemoryMidiMapCatalog()
    const midi = new MidiService(catalog, async () => fakeMidiAccess([input]))
    midi.setDispatch(async (command) => {
      dispatched.push(command)
    })

    await midi.connect()
    expect(midi.getSnapshot().status).toBe('open')
    expect(midi.getSnapshot().devices).toEqual([{ id: 'generic-test', name: 'Generic Test' }])

    input.send([0x90, 60, 127])
    await vi.waitFor(() => {
      expect(dispatched).toEqual([{ type: 'DECK_TOGGLE_PLAY', deck: 1 }])
    })

    dispatched.length = 0
    midi.startLearn('play:2')
    input.send([0x91, 36, 127])
    await vi.waitFor(() => {
      expect(midi.getSnapshot().learnActionId).toBeNull()
    })
    expect(dispatched).toEqual([])

    input.send([0x91, 36, 127])
    await vi.waitFor(() => {
      expect(dispatched).toEqual([{ type: 'DECK_TOGGLE_PLAY', deck: 2 }])
    })

    const stored = await catalog.load()
    expect(stored?.some((binding) => binding.source.number === 36 && binding.source.channel === 2)).toBe(true)
  })

  it('marks Web MIDI as unsupported when the factory rejects', async () => {
    const midi = new MidiService(new MemoryMidiMapCatalog(), async () => {
      throw new Error('Web MIDI is not supported')
    })
    await midi.connect()
    expect(midi.getSnapshot().status).toBe('unsupported')
  })

  it('marks Web MIDI as denied when permission is refused', async () => {
    const midi = new MidiService(new MemoryMidiMapCatalog(), async () => {
      const error = new Error('Permission to use Web MIDI API was not granted.')
      error.name = 'NotAllowedError'
      throw error
    })
    await midi.connect()
    expect(midi.getSnapshot().status).toBe('denied')
  })
})
