import type { AudioEngine } from '../audio/AudioEngine'
import type { LibraryService } from '../library/LibraryService'
import type { MidiService } from '../midi/MidiService'
import type { useDeckStore } from './deck.store'
import type { useLibraryStore } from './library.store'
import type { useMidiStore } from './midi.store'
import type { useMixerStore } from './mixer.store'
import type { useRecordingStore } from './recording.store'

/**
 * Copies engine snapshots into Pinia at display refresh rate.
 * requestAnimationFrame is a UI scheduler, not the playback clock.
 */
export function startUiSync(
  engine: AudioEngine,
  libraryService: LibraryService,
  midiService: MidiService,
  decks: ReturnType<typeof useDeckStore>,
  mixer: ReturnType<typeof useMixerStore>,
  library: ReturnType<typeof useLibraryStore>,
  recording: ReturnType<typeof useRecordingStore>,
  midi: ReturnType<typeof useMidiStore>,
): () => void {
  let frame = 0
  let stopped = false

  const tick = (): void => {
    if (stopped) {
      return
    }
    engine.maintainSync()
    const deck1 = engine.tryGetDeck(1)
    if (deck1) {
      const snapshot = deck1.getSnapshot()
      decks.applySnapshot(snapshot)
      libraryService.syncFromDeck(snapshot)
    }
    const deck2 = engine.tryGetDeck(2)
    if (deck2) {
      const snapshot = deck2.getSnapshot()
      decks.applySnapshot(snapshot)
      libraryService.syncFromDeck(snapshot)
    }
    const mix = engine.tryGetMixer()
    if (mix) {
      mixer.applySnapshot(mix.getSnapshot())
    }
    library.applySnapshot(libraryService.getSnapshot())
    recording.apply(engine.isRecording())
    midi.applySnapshot(midiService.getSnapshot())
    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)

  return () => {
    stopped = true
    cancelAnimationFrame(frame)
  }
}
