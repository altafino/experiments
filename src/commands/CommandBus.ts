import type { AudioEngineApi, DeckId, DJCommand } from './DJCommand'

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
        this.refreshSync(command.deck)
        return
      case 'DECK_PAUSE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).pause()
        this.refreshSync()
        return
      case 'DECK_TOGGLE_PLAY': {
        await this.engine.ensureStarted()
        const deck = this.engine.getDeck(command.deck)
        const snap = deck.getSnapshot()
        if (snap.playing) {
          if (snap.cuePreviewing) {
            deck.play()
            this.refreshSync(command.deck)
          } else {
            deck.pause()
            this.refreshSync()
          }
        } else {
          deck.play()
          this.refreshSync(command.deck)
        }
        return
      }
      case 'DECK_CUE': {
        await this.engine.ensureStarted()
        const deck = this.engine.getDeck(command.deck)
        deck.cue()
        this.refreshSync(deck.getSnapshot().playing ? command.deck : undefined)
        return
      }
      case 'DECK_CUE_RELEASE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).cueRelease()
        this.refreshSync()
        return
      case 'DECK_SEEK':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).seek(command.position)
        this.refreshSync()
        return
      case 'SET_TEMPO':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).setTempoPercent(command.percent)
        this.refreshSync()
        return
      case 'SET_TEMPO_RANGE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).setTempoRange(command.range)
        this.refreshSync()
        return
      case 'PITCH_BEND_START':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).setPitchBend(command.direction)
        this.refreshSync()
        return
      case 'PITCH_BEND_END':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).setPitchBend(0)
        this.refreshSync()
        return
      case 'SET_MASTER_TEMPO':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).setMasterTempo(command.enabled)
        this.refreshSync()
        return
      case 'SET_SYNC':
        await this.engine.ensureStarted()
        this.engine.setSync(command.deck, command.enabled)
        return
      case 'SET_MASTER_DECK':
        await this.engine.ensureStarted()
        this.engine.setMasterDeck(command.deck)
        return
      case 'SET_QUANTIZE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).setQuantize(command.enabled)
        return
      case 'HOT_CUE': {
        await this.engine.ensureStarted()
        const deck = this.engine.getDeck(command.deck)
        const wasPlaying = deck.getSnapshot().playing
        deck.hotCue(command.id)
        this.refreshSync(deck.getSnapshot().playing && !wasPlaying ? command.deck : undefined)
        return
      }
      case 'CLEAR_HOT_CUE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).clearHotCue(command.id)
        return
      case 'LOOP_IN':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).loopIn()
        this.refreshSync()
        return
      case 'LOOP_OUT':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).loopOut()
        this.refreshSync()
        return
      case 'LOOP_RELOOP': {
        await this.engine.ensureStarted()
        const deck = this.engine.getDeck(command.deck)
        const wasPlaying = deck.getSnapshot().playing
        deck.reloop()
        this.refreshSync(deck.getSnapshot().playing && !wasPlaying ? command.deck : undefined)
        return
      }
      case 'BEAT_LOOP': {
        await this.engine.ensureStarted()
        const deck = this.engine.getDeck(command.deck)
        const wasPlaying = deck.getSnapshot().playing
        deck.beatLoop(command.beats)
        this.refreshSync(deck.getSnapshot().playing && !wasPlaying ? command.deck : undefined)
        return
      }
      case 'LOOP_HALVE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).loopHalve()
        this.refreshSync()
        return
      case 'LOOP_DOUBLE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).loopDouble()
        this.refreshSync()
        return
      case 'SET_TRIM':
        await this.engine.ensureStarted()
        this.engine.getMixer().setTrim(command.deck, command.value)
        return
      case 'SET_EQ':
        await this.engine.ensureStarted()
        this.engine.getMixer().setEq(command.deck, command.band, command.value)
        return
      case 'SET_CHANNEL_FADER':
        await this.engine.ensureStarted()
        this.engine.getMixer().setChannelFader(command.deck, command.value)
        return
      case 'SET_CROSSFADER':
        await this.engine.ensureStarted()
        this.engine.getMixer().setCrossfader(command.value)
        return
      case 'SET_CROSSFADER_CURVE':
        await this.engine.ensureStarted()
        this.engine.getMixer().setCrossfaderCurve(command.curve)
        return
      case 'SET_MASTER_GAIN':
        await this.engine.ensureStarted()
        this.engine.getMixer().setMasterGain(command.value)
        return
      default: {
        const neverCommand: never = command
        throw new Error(`Unhandled DJ command: ${JSON.stringify(neverCommand)}`)
      }
    }
  }

  private refreshSync(assignMaster?: DeckId): void {
    if (assignMaster !== undefined) {
      this.engine.ensureMaster(assignMaster)
    }
    this.engine.maintainSync()
  }
}
