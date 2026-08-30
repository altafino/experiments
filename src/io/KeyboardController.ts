import type { AudioEngineApi, DeckId } from '../commands/DJCommand'
import type { CommandBus } from '../commands/CommandBus'
import type { HotCueId } from '../domain/DeckState'

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

function hotCueIdFromCode(code: 'KeyQ' | 'KeyW' | 'KeyE'): HotCueId {
  switch (code) {
    case 'KeyQ':
      return 'A'
    case 'KeyW':
      return 'B'
    case 'KeyE':
      return 'C'
    default: {
      const neverCode: never = code
      return neverCode
    }
  }
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
  private readonly onKeyUp: (event: Event) => void

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
    this.onKeyUp = (event: Event) => {
      if (!(event instanceof KeyboardEvent)) {
        return
      }
      void this.handleKeyUp(event)
    }
  }

  attach(target: EventTarget = window): () => void {
    target.addEventListener('keydown', this.onKeyDown)
    target.addEventListener('keyup', this.onKeyUp)
    return () => {
      target.removeEventListener('keydown', this.onKeyDown)
      target.removeEventListener('keyup', this.onKeyUp)
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
        if (event.repeat) {
          return
        }
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
      case 'BracketLeft':
        if (event.repeat) {
          return
        }
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'PITCH_BEND_START', deck: deckId, direction: -1 })
        return
      case 'BracketRight':
        if (event.repeat) {
          return
        }
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'PITCH_BEND_START', deck: deckId, direction: 1 })
        return
      case 'KeyM':
        event.preventDefault()
        await this.commandBus.dispatch({
          type: 'SET_MASTER_TEMPO',
          deck: deckId,
          enabled: !deck.getSnapshot().masterTempo,
        })
        return
      case 'KeyS':
        event.preventDefault()
        await this.commandBus.dispatch({
          type: 'SET_SYNC',
          deck: deckId,
          enabled: !deck.getSnapshot().syncEnabled,
        })
        return
      case 'KeyG':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'SET_MASTER_DECK', deck: deckId })
        return
      case 'KeyT':
        event.preventDefault()
        await this.commandBus.dispatch({
          type: 'SET_QUANTIZE',
          deck: deckId,
          enabled: !deck.getSnapshot().quantizeEnabled,
        })
        return
      case 'KeyQ':
      case 'KeyW':
      case 'KeyE': {
        event.preventDefault()
        const code = event.code
        const id = hotCueIdFromCode(code)
        if (event.shiftKey) {
          await this.commandBus.dispatch({ type: 'CLEAR_HOT_CUE', deck: deckId, id })
        } else {
          await this.commandBus.dispatch({ type: 'HOT_CUE', deck: deckId, id })
        }
        return
      }
      case 'KeyI':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'LOOP_IN', deck: deckId })
        return
      case 'KeyO':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'LOOP_OUT', deck: deckId })
        return
      case 'KeyL':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'LOOP_RELOOP', deck: deckId })
        return
      case 'Comma':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'LOOP_HALVE', deck: deckId })
        return
      case 'Period':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'LOOP_DOUBLE', deck: deckId })
        return
      default:
        return
    }
  }

  private async handleKeyUp(event: KeyboardEvent): Promise<void> {
    if (isEditableTarget(event.target)) {
      return
    }
    switch (event.code) {
      case 'BracketLeft':
      case 'BracketRight': {
        event.preventDefault()
        const deckId = this.focus.get()
        const deck = this.engine.tryGetDeck(deckId)
        if (!deck) {
          return
        }
        await this.commandBus.dispatch({ type: 'PITCH_BEND_END', deck: deckId })
        return
      }
      case 'KeyC': {
        event.preventDefault()
        const deckId = this.focus.get()
        const deck = this.engine.tryGetDeck(deckId)
        if (!deck) {
          return
        }
        await this.commandBus.dispatch({ type: 'DECK_CUE_RELEASE', deck: deckId })
        return
      }
      default:
        return
    }
  }
}
