# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-08-31

First public cut of the browser workstation.

### Added

- Dual `DeckEngine` decks, mixer MVP, and worker-based track analysis (waveform peaks, BPM, beat grid) with IndexedDB cache by file identity — audio files themselves are not stored.
- Tempo (`playbackRate`), master tempo (granular overlap-add AudioWorklet), and beat sync that matches slave tempo and phase without seeking.
- Memory cue, hot cues A/B/C, quantize, loop in/out, beat loops, and sample-accurate loop wrap in transport and in the audio graph.
- Slip (background logical playhead), vinyl/CDJ jog and scratch, Sound Color FX, Beat FX, headphone cue bus, session library with playlists, master-bus mix recording (WebM/Opus), and generic Web MIDI with Learn.
- Controller display: PERFORM (zoomed scrolling waveforms + overview strip), BROWSE, INFO, and SETTINGS. Display mode and zoom live in `view.store.ts` and never affect audio timing.
- Product docs: README screenshots, [TUTORIAL.md](TUTORIAL.md), and this changelog.
- Design plan for a Pioneer-style no-scroll chassis (`docs/plans/pioneer-controller-ui.md`).

### Notes

- Tempo and pitch move together unless master tempo is on.
- SYNC never seeks the slave.
- Default MIDI map is generic (channels 1, 2, 16), not a Pioneer XDJ/DDJ layout.
- Cue Mix defaults to master so a single output does not change until you pull toward cue.
