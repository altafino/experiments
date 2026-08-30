import type { AudioEngineApi, DeckId, DJCommand } from '../commands/DJCommand'
import { DEFAULT_TEMPO_RANGE } from '../domain/tempo'
import {
  emptyMidiState,
  encodingForTarget,
  formatMidiMessage,
  midiTargetFromKey,
  type MidiMessage,
  type MidiState,
} from '../domain/midi'
import { IndexedDbMidiMapCatalog } from './IndexedDbMidiMapCatalog'
import { MemoryMidiMapCatalog, type MidiMapCatalog } from './MidiMapCatalog'
import { MidiManager } from './MidiManager'
import { MidiMapper, type MidiMapContext } from './MidiMapper'
import { genericMidiBindings } from './mappings/generic'
import { requestBrowserMidiAccess, type MidiAccessFactory } from './webMidi'

export interface MidiController {
  connect(): Promise<void>
  disconnect(): void
  startLearn(actionId: string | null): void
  unmap(actionId: string): void
  resetMap(): Promise<void>
  getSnapshot(): MidiState
}

/**
 * Mapping + Web MIDI session. Incoming bytes become DJCommand values via
 * MidiMapper; Vue never sees MIDI events.
 */
export class MidiService implements MidiController {
  private readonly catalog: MidiMapCatalog
  private readonly requestAccess: MidiAccessFactory
  private readonly mapper: MidiMapper
  private manager: MidiManager | undefined
  private dispatch: (command: DJCommand) => Promise<void> = async () => undefined
  private engine: AudioEngineApi | undefined
  private status: MidiState['status'] = 'idle'
  private error: string | undefined
  private lastMessage: string | null = null
  private learnActionId: string | null = null
  private devices: MidiState['devices'] = []
  private hydratePromise: Promise<void>

  constructor(catalog?: MidiMapCatalog, requestAccess?: MidiAccessFactory) {
    this.catalog = catalog ?? defaultCatalog()
    this.requestAccess = requestAccess ?? requestBrowserMidiAccess
    this.mapper = new MidiMapper(genericMidiBindings())
    this.hydratePromise = this.hydrate()
  }

  setDispatch(dispatch: (command: DJCommand) => Promise<void>): void {
    this.dispatch = dispatch
  }

  setEngine(engine: AudioEngineApi): void {
    this.engine = engine
  }

  async ready(): Promise<void> {
    await this.hydratePromise
  }

  async connect(): Promise<void> {
    this.status = 'connecting'
    this.error = undefined
    try {
      await this.ready()
      this.manager?.close()
      this.manager = new MidiManager(
        this.requestAccess,
        (message) => {
          void this.ingest(message)
        },
        () => {
          this.devices = this.manager?.devices() ?? []
        },
      )
      await this.manager.open()
      this.devices = this.manager.devices()
      this.status = 'open'
    } catch (error) {
      this.manager?.close()
      this.manager = undefined
      this.devices = []
      const name = error instanceof Error ? error.name : ''
      const text = error instanceof Error ? error.message : 'MIDI failed'
      if (name === 'NotAllowedError' || text.toLowerCase().includes('denied')) {
        this.status = 'denied'
      } else if (text.toLowerCase().includes('not supported')) {
        this.status = 'unsupported'
      } else {
        this.status = 'error'
      }
      this.error = text
    }
  }

  disconnect(): void {
    this.manager?.close()
    this.manager = undefined
    this.devices = []
    this.status = 'idle'
    this.error = undefined
    this.learnActionId = null
  }

  startLearn(actionId: string | null): void {
    this.learnActionId = actionId && midiTargetFromKey(actionId) ? actionId : null
  }

  unmap(actionId: string): void {
    this.mapper.unbind(actionId)
    this.learnActionId = null
    void this.persist()
  }

  async resetMap(): Promise<void> {
    this.mapper.setBindings(genericMidiBindings())
    this.learnActionId = null
    await this.persist()
  }

  getSnapshot(): MidiState {
    const snapshot = emptyMidiState()
    snapshot.status = this.status
    snapshot.error = this.error
    snapshot.devices = this.devices.map((device) => ({ ...device }))
    snapshot.lastMessage = this.lastMessage
    snapshot.learnActionId = this.learnActionId
    snapshot.bindings = this.mapper.getBindings()
    return snapshot
  }

  async ingest(message: MidiMessage): Promise<void> {
    this.lastMessage = formatMidiMessage(message)
    if (this.learnActionId) {
      const target = midiTargetFromKey(this.learnActionId)
      if (target) {
        this.mapper.bind(target, message, encodingForTarget(target, message.kind))
        this.learnActionId = null
        await this.persist()
      }
      return
    }
    const commands = this.mapper.map(message, this.context())
    for (const command of commands) {
      await this.dispatch(command)
    }
  }

  private async hydrate(): Promise<void> {
    try {
      const stored = await this.catalog.load()
      if (stored && stored.length > 0) {
        this.mapper.setBindings(stored)
      }
    } catch {
      this.mapper.setBindings(genericMidiBindings())
    }
  }

  private async persist(): Promise<void> {
    try {
      await this.catalog.save(this.mapper.getBindings())
    } catch {
      return
    }
  }

  private context(): MidiMapContext {
    const engine = this.engine
    const deck = (id: DeckId) => engine?.tryGetDeck(id)?.getSnapshot()
    const mixer = () => engine?.tryGetMixer()?.getSnapshot()
    return {
      tempoRange: (id) => deck(id)?.tempoRange ?? DEFAULT_TEMPO_RANGE,
      channelCue: (id) => mixer()?.channels[id].cue ?? false,
      syncEnabled: (id) => deck(id)?.syncEnabled ?? false,
      slipEnabled: (id) => deck(id)?.slipEnabled ?? false,
      vinylMode: (id) => deck(id)?.vinylMode ?? false,
      masterTempo: (id) => deck(id)?.masterTempo ?? false,
      quantizeEnabled: (id) => deck(id)?.quantizeEnabled ?? false,
      beatFxEnabled: () => mixer()?.beatFxEnabled ?? false,
      recording: () => engine?.isRecording() ?? false,
    }
  }
}

function defaultCatalog(): MidiMapCatalog {
  if (typeof indexedDB === 'undefined') {
    return new MemoryMidiMapCatalog()
  }
  return new IndexedDbMidiMapCatalog()
}
