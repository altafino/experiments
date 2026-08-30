# Web DJ

Browser-based two-deck DJ workstation. Phase 5: dual decks, mixer MVP, and worker-based track analysis.

## Architecture

UI (Vue) emits `DJCommand` values. The command bus talks to `AudioEngine` / `DeckEngine` / `MixerEngine`. Playback position is derived from `AudioContext.currentTime`, never from `setInterval` or Vue.

Track analysis (waveform peaks, BPM, beat grid) runs in a Web Worker and is cached in IndexedDB by file identity. Audio files themselves are not stored.

## Scripts

```bash
npm install
npm run dev
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Keyboard

- 1 / 2 — focus deck
- Space — play / pause focused deck
- C — cue
- ← / → — seek 1 second

Double-click mixer faders/knobs to reset.
