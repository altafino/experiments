import type { AudioEngineApi, DeckId, DJCommand } from './DJCommand'
import { downloadBlob, mixRecordingFilename } from '../io/download'
import { LibraryService, type LibraryController } from '../library/LibraryService'
import { MidiService, type MidiController } from '../midi/MidiService'

/**
 * Normalized command entry point for pointer, keyboard, and MIDI.
 * The bus talks to the audio engine; it never schedules audio itself.
 */
export class CommandBus {
  private readonly engine: AudioEngineApi
  private readonly library: LibraryController
  private readonly midi: MidiController

  constructor(
    engine: AudioEngineApi,
    library: LibraryController = new LibraryService(),
    midi: MidiController = new MidiService(),
  ) {
    this.engine = engine
    this.library = library
    this.midi = midi
  }

  async dispatch(command: DJCommand): Promise<void> {
    switch (command.type) {
      case 'DECK_LOAD':
        await this.library.importFiles([command.file])
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
      case 'BEAT_JUMP':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).beatJump(command.beats)
        this.refreshSync()
        return
      case 'SET_SLIP':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).setSlip(command.enabled)
        this.refreshSync()
        return
      case 'HOT_CUE_RELEASE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).hotCueRelease(command.id)
        this.refreshSync()
        return
      case 'SET_VINYL':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).setVinyl(command.enabled)
        this.refreshSync()
        return
      case 'JOG_TOUCH_START':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).jogTouchStart()
        this.refreshSync()
        return
      case 'JOG_TOUCH_MOVE':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).jogTouchMove(command.deltaRadians)
        this.refreshSync()
        return
      case 'JOG_TOUCH_END':
        await this.engine.ensureStarted()
        this.engine.getDeck(command.deck).jogTouchEnd()
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
      case 'SET_COLOR_FX':
        await this.engine.ensureStarted()
        this.engine.getMixer().setColorFx(command.deck, command.fx)
        return
      case 'SET_COLOR':
        await this.engine.ensureStarted()
        this.engine.getMixer().setColor(command.deck, command.value)
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
      case 'SET_BEAT_FX':
        await this.engine.ensureStarted()
        this.engine.getMixer().setBeatFx(command.fx)
        return
      case 'SET_BEAT_FX_BEAT':
        await this.engine.ensureStarted()
        this.engine.getMixer().setBeatFxBeats(command.beats)
        return
      case 'SET_BEAT_FX_LEVEL':
        await this.engine.ensureStarted()
        this.engine.getMixer().setBeatFxLevel(command.value)
        return
      case 'SET_BEAT_FX_ENABLED':
        await this.engine.ensureStarted()
        this.engine.getMixer().setBeatFxEnabled(command.enabled)
        return
      case 'SET_CHANNEL_CUE':
        await this.engine.ensureStarted()
        this.engine.getMixer().setChannelCue(command.deck, command.enabled)
        return
      case 'SET_CUE_MIX':
        await this.engine.ensureStarted()
        this.engine.getMixer().setCueMix(command.value)
        return
      case 'SET_PHONES_LEVEL':
        await this.engine.ensureStarted()
        this.engine.getMixer().setPhonesLevel(command.value)
        return
      case 'LIBRARY_IMPORT':
        await this.library.importFiles(command.files)
        return
      case 'LIBRARY_LOAD': {
        const file = this.library.fileOf(command.trackId)
        if (!file) {
          throw new Error('Re-import this track to load it')
        }
        await this.engine.load(command.deck, file)
        return
      }
      case 'LIBRARY_SET_QUERY':
        this.library.setQuery(command.query)
        return
      case 'LIBRARY_SET_SORT':
        this.library.setSort(command.sort)
        return
      case 'LIBRARY_SET_ARTIST':
        this.library.setArtistFilter(command.artist)
        return
      case 'LIBRARY_SET_BPM':
        this.library.setBpmFilter(command.min, command.max)
        return
      case 'LIBRARY_SELECT_PLAYLIST':
        this.library.selectPlaylist(command.playlistId)
        return
      case 'LIBRARY_CREATE_PLAYLIST':
        this.library.createPlaylist(command.name)
        return
      case 'LIBRARY_DELETE_PLAYLIST':
        this.library.deletePlaylist(command.playlistId)
        return
      case 'LIBRARY_ADD_TO_PLAYLIST':
        this.library.addToPlaylist(command.playlistId, command.trackId)
        return
      case 'LIBRARY_REMOVE_FROM_PLAYLIST':
        this.library.removeFromPlaylist(command.playlistId, command.trackId)
        return
      case 'RECORD_START':
        await this.engine.ensureStarted()
        this.engine.startRecording()
        return
      case 'RECORD_STOP': {
        const blob = await this.engine.stopRecording()
        if (blob.size > 0) {
          downloadBlob(blob, mixRecordingFilename())
        }
        return
      }
      case 'MIDI_CONNECT':
        await this.midi.connect()
        return
      case 'MIDI_DISCONNECT':
        this.midi.disconnect()
        return
      case 'MIDI_LEARN':
        this.midi.startLearn(command.actionId)
        return
      case 'MIDI_UNMAP':
        this.midi.unmap(command.actionId)
        return
      case 'MIDI_RESET_MAP':
        await this.midi.resetMap()
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
