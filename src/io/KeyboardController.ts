import type { AudioEngineApi, DeckId } from '../commands/DJCommand'
import type { CommandBus } from '../commands/CommandBus'
import { nextBeatFx, DEFAULT_BEAT_FX } from '../domain/beatFx'
import { nextColorFx, DEFAULT_COLOR_FX } from '../domain/colorFx'
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
      case 'KeyF': {
        event.preventDefault()
        const deckId = this.focus.get()
        const mixer = this.engine.tryGetMixer()
        const current = mixer?.getSnapshot().channels[deckId].colorFx ?? DEFAULT_COLOR_FX
        await this.commandBus.dispatch({
          type: 'SET_COLOR_FX',
          deck: deckId,
          fx: nextColorFx(current),
        })
        return
      }
      case 'KeyB': {
        event.preventDefault()
        const mixer = this.engine.tryGetMixer()
        const enabled = mixer?.getSnapshot().beatFxEnabled ?? false
        await this.commandBus.dispatch({
          type: 'SET_BEAT_FX_ENABLED',
          enabled: !enabled,
        })
        return
      }
      case 'KeyN': {
        event.preventDefault()
        const mixer = this.engine.tryGetMixer()
        const current = mixer?.getSnapshot().beatFx ?? DEFAULT_BEAT_FX
        await this.commandBus.dispatch({
          type: 'SET_BEAT_FX',
          fx: nextBeatFx(current),
        })
        return
      }
      case 'KeyH': {
        event.preventDefault()
        const deckId = this.focus.get()
        const mixer = this.engine.tryGetMixer()
        const enabled = mixer?.getSnapshot().channels[deckId].cue ?? false
        await this.commandBus.dispatch({
          type: 'SET_CHANNEL_CUE',
          deck: deckId,
          enabled: !enabled,
        })
        return
      }
      case 'KeyR': {
        event.preventDefault()
        if (this.engine.isRecording()) {
          await this.commandBus.dispatch({ type: 'RECORD_STOP' })
        } else {
          await this.commandBus.dispatch({ type: 'RECORD_START' })
        }
        return
      }
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
      case 'KeyY':
        event.preventDefault()
        await this.commandBus.dispatch({
          type: 'SET_SLIP',
          deck: deckId,
          enabled: !deck.getSnapshot().slipEnabled,
        })
        return
      case 'KeyV':
        event.preventDefault()
        await this.commandBus.dispatch({
          type: 'SET_VINYL',
          deck: deckId,
          enabled: !deck.getSnapshot().vinylMode,
        })
        return
      case 'KeyQ':
      case 'KeyW':
      case 'KeyE': {
        if (event.repeat) {
          return
        }
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
      case 'KeyJ':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'BEAT_JUMP', deck: deckId, beats: -1 })
        return
      case 'KeyK':
        event.preventDefault()
        await this.commandBus.dispatch({ type: 'BEAT_JUMP', deck: deckId, beats: 1 })
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
      case 'KeyQ':
      case 'KeyW':
      case 'KeyE': {
        event.preventDefault()
        const deckId = this.focus.get()
        const deck = this.engine.tryGetDeck(deckId)
        if (!deck) {
          return
        }
        const code = event.code
        const id = hotCueIdFromCode(code)
        await this.commandBus.dispatch({ type: 'HOT_CUE_RELEASE', deck: deckId, id })
        return
      }
      default:
        return
    }
  }
}
