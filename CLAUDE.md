You are implementing a realtime browser DJ workstation.
Audio correctness and deterministic state transitions have higher priority
than visual fidelity.

Architecture is strictly divided into:

1. UI
2. DJ command/state layer
3. realtime audio engine

Vue components must never become authoritative sources of audio timing.
AudioContext.currentTime is the global clock.
Sample-critical DSP belongs in AudioWorklet.
Long-running analysis belongs in Web Workers.
Deck 1 and Deck 2 must use identical reusable DeckEngine implementations.
Input mechanisms such as mouse, touch, keyboard and MIDI must communicate
through a normalized DJ command layer.

Do not introduce a dependency without explaining why it is necessary.
Do not refactor unrelated code while implementing a feature.
Before completing any task run type checking, unit tests and the production
build.
Implement the engineering roadmap in dependency order rather than trying to
build the entire controller simultaneously.

Current implementation phase: Phase 20 (controller UI: zoomed scrolling
waveform with beat grid, tabbed main display).
Display state (mode, zoom) lives in `view.store.ts` and must never influence
audio timing.
Sync orchestrates on AudioEngine; do not
change the public DeckEngine command surface for sync. Analysis remains
worker-only; do not store audio files in IndexedDB.
