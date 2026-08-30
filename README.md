# Web DJ

Browser-based two-deck DJ workstation. Phase 1: one functional deck with engine-owned transport.

## Architecture

UI (Vue) emits `DJCommand` values. The command bus talks to `AudioEngine` / `DeckEngine`. Playback position is derived from `AudioContext.currentTime`, never from `setInterval` or Vue.

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

- Space — play / pause
- C — cue
- ← / → — seek 1 second
