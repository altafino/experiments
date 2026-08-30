import type { AudioEngine } from '../audio/AudioEngine'
import type { useDeckStore } from './deck.store'

/**
 * Copies engine snapshots into Pinia at display refresh rate.
 * requestAnimationFrame is a UI scheduler, not the playback clock.
 */
export function startUiSync(
  engine: AudioEngine,
  store: ReturnType<typeof useDeckStore>,
): () => void {
  let frame = 0
  let stopped = false

  const tick = (): void => {
    if (stopped) {
      return
    }
    const deck = engine.tryGetDeck(1)
    if (deck) {
      store.applySnapshot(deck.getSnapshot())
    }
    frame = requestAnimationFrame(tick)
  }

  frame = requestAnimationFrame(tick)

  return () => {
    stopped = true
    cancelAnimationFrame(frame)
  }
}
