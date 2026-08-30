import type { AudioEngine } from '../audio/AudioEngine'
import type { useDeckStore } from './deck.store'
import type { useMixerStore } from './mixer.store'

/**
 * Copies engine snapshots into Pinia at display refresh rate.
 * requestAnimationFrame is a UI scheduler, not the playback clock.
 */
export function startUiSync(
  engine: AudioEngine,
  decks: ReturnType<typeof useDeckStore>,
  mixer: ReturnType<typeof useMixerStore>,
): () => void {
  let frame = 0
  let stopped = false

  const tick = (): void => {
    if (stopped) {
      return
    }
    const deck1 = engine.tryGetDeck(1)
    if (deck1) {
      decks.applySnapshot(deck1.getSnapshot())
    }
    const deck2 = engine.tryGetDeck(2)
    if (deck2) {
      decks.applySnapshot(deck2.getSnapshot())
    }
    const mix = engine.tryGetMixer()
    if (mix) {
      mixer.applySnapshot(mix.getSnapshot())
    }
    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)

  return () => {
    stopped = true
    cancelAnimationFrame(frame)
  }
}
