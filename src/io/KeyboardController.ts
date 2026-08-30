import type { AudioEngineApi } from '../commands/DJCommand'
import type { CommandBus } from '../commands/CommandBus'

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false
  }
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

/**
 * Keyboard input adapter. Emits the same DJCommand values as the on-screen
 * transport; it never touches AudioContext clocks directly.
 */
export class KeyboardController {
  private readonly commandBus: CommandBus
  private readonly engine: AudioEngineApi
  private readonly onKeyDown: (event: KeyboardEvent) => void

  constructor(commandBus: CommandBus, engine: AudioEngineApi) {
    this.commandBus = commandBus
    this.engine = engine
    this.onKeyDown = (event: KeyboardEvent) => {
      void this.handleKeyDown(event)
    }
  }

  attach(target: Window = window): () => void {
    target.addEventListener('keydown', this.onKeyDown)
    return () => {
      target.removeEventListener('keydown', this.onKeyDown)
    }
  }

  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    if (isEditableTarget(event.target)) {
      return
    }

    const deck = this.engine.tryGetDeck(1)
    if (!deck || deck.getSnapshot().durationSeconds <= 0) {
      return
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'DECK_TOGGLE_PLAY', deck: 1 })
        return
      case 'KeyC':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'DECK_CUE', deck: 1 })
        return
      case 'ArrowLeft': {
        event.preventDefault()
        await this.commandBus.dispatch({
          type: 'DECK_SEEK',
          deck: 1,
          position: deck.getSnapshot().positionSeconds - 1,
        })
        return
      }
      case 'ArrowRight': {
        event.preventDefault()
        await this.commandBus.dispatch({
          type: 'DECK_SEEK',
          deck: 1,
          position: deck.getSnapshot().positionSeconds + 1,
        })
        return
      }
      default:
        return
    }
  }
}
