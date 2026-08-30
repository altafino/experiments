# Web DJ

Browser-based two-deck DJ workstation. Phase 10: dual decks, mixer, worker analysis, tempo, master tempo, beat sync, cue, hot cues, and loops.

## Architecture

UI (Vue) emits `DJCommand` values. The command bus talks to `AudioEngine` / `DeckEngine` / `MixerEngine`. Playback position is derived from `AudioContext.currentTime`, never from `setInterval` or Vue.

Track analysis (waveform peaks, BPM, beat grid) runs in a Web Worker and is cached in IndexedDB by file identity. Audio files themselves are not stored.

Tempo uses `AudioBufferSourceNode.playbackRate` (speed and pitch together). Master tempo (MT) keeps pitch via a granular overlap-add AudioWorklet. SYNC matches a slave deck's effective BPM and beat phase to the master by adjusting tempo — it never seeks the slave.

Memory cue: while paused away from the cue, CUE stores the point; while playing, CUE returns and pauses; hold CUE at the cue point to preview. Hot cues A/B/C jump and play. Quantize snaps set positions to the beat grid and delays a playing hot-cue jump until the next beat.

Loops wrap in transport math and in the audio graph (`AudioBufferSourceNode.loop` / stretch-worklet read-head wrap). Loop In / Out set a region; Reloop toggles it; beat loops (1/32–32) engage immediately. Halve and double keep the in point and move the out point.

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
- C — cue (hold at the cue point to preview)
- Q / W / E — hot cues A / B / C (Shift clears)
- T — quantize
- I / O — loop in / out
- L — reloop / exit
- , / . — loop half / double
- ← / → — seek 1 second
- [ / ] — pitch bend down / up (hold)
- M — master tempo
- S — sync focused deck to the master
- G — make focused deck the master

Double-click mixer faders/knobs or the tempo slider to reset.
