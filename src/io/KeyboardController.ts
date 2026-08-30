import type { AudioEngineApi, DeckId } from '../commands/DJCommand'
import type { CommandBus } from '../commands/CommandBus'

export interface DeckFocus {
  get(): DeckId
  set(deck: DeckId): void
}

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
  private readonly focus: DeckFocus
  private readonly onKeyDown: (event: Event) => void

  constructor(commandBus: CommandBus, engine: AudioEngineApi, focus: DeckFocus) {
    this.commandBus = commandBus
    this.engine = engine
    this.focus = focus
    this.onKeyDown = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) {
        return
      }
      void this.handleKeyDown(event)
    }
  }

  attach(target: EventTarget = window): () => void {
    target.addEventListener('keydown', this.onKeyDown)
    return () => {
      target.removeEventListener('keydown', this.onKeyDown)
    }
  }

  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    if (isEditableTarget(event.target)) {
      return
    }

    switch (event.code) {
      case 'Digit1':
        event.preventDefault()
        this.focus.set(1)
        return
      case 'Digit2':
        event.preventDefault()
        this.focus.set(2)
        return
      default:
        break
    }

    const deckId = this.focus.get()
    const deck = this.engine.tryGetDeck(deckId)
    if (!deck || deck.getSnapshot().durationSeconds <= 0) {
      return
    }

    switch (event.code) {
      case 'Space':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'DECK_TOGGLE_PLAY', deck: deckId })
        return
      case 'KeyC':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'DECK_CUE', deck: deckId })
        return
      case 'ArrowLeft': {
        event.preventDefault()
        await this.commandBus.dispatch({
          type: 'DECK_SEEK',
          deck: deckId,
          position: deck.getSnapshot().positionSeconds - 1,
        })
        return
      }
      case 'ArrowRight': {
        event.preventDefault()
        await this.commandBus.dispatch({
          type: 'DECK_SEEK',
          deck: deckId,
          position: deck.getSnapshot().positionSeconds + 1,
        })
        return
      }
      default:
        return
    }
  }
}
