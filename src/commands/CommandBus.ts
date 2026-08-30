import type { AudioEngineApi, DJCommand } from './DJCommand'

/**
 * Normalized command entry point for pointer, keyboard, and (later) MIDI.
 * The bus talks to the audio engine; it never schedules audio itself.
 */
export class CommandBus {
  private readonly engine: AudioEngineApi

  constructor(engine: AudioEngineApi) {
    this.engine = engine
  }

  async dispatch(command: DJCommand): Promise<void> {
    switch (command.type) {
      case 'DECK_LOAD':
        await this.engine.load(command.deck, command.file)
        return
      case 'DECK_PLAY':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).play()
        return
      case 'DECK_PAUSE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).pause()
        return
      case 'DECK_TOGGLE_PLAY': {
        await this.engine.ensureStarted()
        const deck = this.engine.getDeck(command.deck)
        if (deck.getSnapshot().playing) {
          deck.pause()
        } else {
          deck.play()
        }
        return
      }
      case 'DECK_CUE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).cue()
        return
      case 'DECK_SEEK':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).seek(command.position)
        return
      default: {
        const neverCommand: never = command
        throw new Error(`Unhandled DJ command: ${JSON.stringify(neverCommand)}`)
      }
    }
  }
}
