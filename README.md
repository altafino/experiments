# Web DJ

Browser-based two-deck DJ workstation. Phase 21: dual decks, mixer, worker analysis, tempo, master tempo, beat sync, cue, hot cues, loops, beat jump, slip, jog/scratch, Sound Color FX, Beat FX, headphone cue, library, mix recording, generic Web MIDI, and a Pioneer-style chassis (LCD waveforms, pad banks, LOAD platters, responsive one-deck stage).

## Architecture

UI (Vue) emits `DJCommand` values. The command bus talks to `AudioEngine` / `DeckEngine` / `MixerEngine`. Playback position is derived from `AudioContext.currentTime`, never from `setInterval` or Vue.

Track analysis (waveform peaks, BPM, beat grid) runs in a Web Worker and is cached in IndexedDB by file identity. Audio files themselves are not stored.

Tempo uses `AudioBufferSourceNode.playbackRate` (speed and pitch together). Master tempo (MT) keeps pitch via a granular overlap-add AudioWorklet. SYNC matches a slave deck's effective BPM and beat phase to the master by adjusting tempo — it never seeks the slave.

Memory cue: while paused away from the cue, CUE stores the point; while playing, CUE returns and pauses; hold CUE at the cue point to preview. Hot cues A/B/C jump and play. Quantize snaps set positions to the beat grid and delays a playing hot-cue jump until the next beat.

Loops wrap in transport math and in the audio graph (`AudioBufferSourceNode.loop` / stretch-worklet read-head wrap). Loop In / Out set a region; Reloop toggles it; beat loops (1/32–32) engage immediately. Halve and double keep the in point and move the out point.

Slip keeps a background (logical) playhead running while a loop or held hot cue changes what you hear. Exiting the loop or releasing the pad jumps audible playback to that background position. Turning slip off discards the background clock without jumping.

Vinyl mode: touching the jog platter takes sample-accurate control of the playhead (scratch, including reverse) in the stretch AudioWorklet. Release coasts briefly from pointer velocity, then resumes transport. CDJ mode (vinyl off): spinning the platter is a momentary pitch bend, same as `[` / `]`.

Sound Color FX sits after the channel EQ and before the fader. Each channel has a bipolar COLOR knob (center = off) and a selector: Filter (LPF/HPF), Noise, Dub Echo (fixed ~140 ms, not beat-synced), and Pitch (channel pitch shifter, not deck tempo). Pitch DSP runs in an AudioWorklet.

Beat FX is a master-bus insert after the crossfader: Echo, Reverb, and Flanger. Delay and LFO times follow the master deck's effective BPM and a beat fraction (1/16–8). LEVEL/DEPTH sets wet/feedback. Timing uses `AudioContext.currentTime` ramps, not `setInterval`.

Headphone cue is pre-fader listen (after Color FX, before the channel fader). Channel CUE buttons feed a cue bus; Cue Mix blends that bus with the master (0 = cue, 1 = master, equal-power). Phones Level scales the blend. On a single output device the phones mix is what you hear (Cue Mix defaults to master so program stays unchanged until you pull it toward cue).

The library is a session collection plus persisted metadata/playlists in IndexedDB. Import local files (multiple); audio blobs are never stored. Search, sort, artist and BPM filters, and playlists sit in front of load-to-deck commands. After a refresh, re-import the same files to make rows playable again.

Recording taps the master bus (after Beat FX and master gain), not the phones mix. MediaRecorder writes WebM/Opus. Rec / R starts and stops; stop downloads the take.

MIDI uses the Web MIDI API. `MidiManager` owns ports; `MidiMapper` turns notes/CCs into the same `DJCommand` values as the on-screen controls. The default map is generic (channel 1 = deck 1, channel 2 = deck 2, channel 16 = mixer) — not a Pioneer XDJ/DDJ map. Learn replaces a binding; maps persist in IndexedDB. Vue never handles MIDI bytes.

Beat jump skips ±1–32 beats on the track grid (`position + beats × 60 / BPM`). Quantize delays a playing jump until the next beat, same as hot cues. J / K skip one beat on the focused deck.

The chassis fills the viewport: LCD on top, platters left/right, mixer in the centre. PERFORM shows side-by-side zoomed scrolling waveforms (playhead fixed at the centre of each canvas, beat grid with accented downbeats, played audio dimmed). BROWSE / INFO / SETTINGS replace LCD content only — the hardware does not unmount. Pad banks (Hot Cue / Loop / Jump) are display-only in `view.store.ts`; keyboard and MIDI still dispatch the same commands. Empty platters show LOAD. Below 1280px the focused deck is staged and the peer is a 48px strip; hiding a platter never pauses it.

The zoomed view picks the coarsest multi-resolution peak level that still resolves one bucket per pixel; the analysis worker already emits levels at 64/256/1024/4096 samples per bucket. Drag a scrolling waveform to scrub, wheel over it to zoom (1–32 s visible). Hidden LCD tabs skip canvas paint. Display mode, zoom, and pad bank live in `view.store.ts` — display-only state that the engines never read.

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
- H — toggle channel cue (headphones) on the focused deck
- R — start / stop mix recording
- Q / W / E — hot cues A / B / C (Shift clears)
- T — quantize
- I / O — loop in / out
- L — reloop / exit
- Y — slip
- V — vinyl / CDJ jog
- F — cycle color FX on the focused deck
- B — toggle Beat FX
- N — cycle Beat FX type
- , / . — loop half / double
- J / K — beat jump −1 / +1
- ← / → — seek 1 second
- [ / ] — pitch bend down / up (hold)
- M — master tempo
- S — sync focused deck to the master
- G — make focused deck the master

## MIDI

Enable in the MIDI panel (browser permission). Generic map, not Pioneer:

- Channel 1 = deck 1, channel 2 = deck 2, channel 16 = mixer
- Notes: C4 play, D4 cue (hold), E4/F4/F#4 hot cues, G4 sync, A4 headphones, B4 slip, C5 vinyl, D5–F#5 loop, G5 quantize, A5 master tempo, B5 master deck, C2 jog touch, F2/G2/A2/B2 beat jump −4/−1/+1/+4
- CC: 1 tempo, 7 fader, 8 trim, 14 jog (relative, 64 = stop), 16–18 EQ, 19 color
- Mixer (ch 16): CC 7 master, 10 crossfader, 1 cue mix, 11 phones, 91 Beat FX level; C4 record, D4 Beat FX

Learn assigns the next note or CC to the selected control. Generic map restores the defaults. Bindings persist in IndexedDB.

Double-click mixer faders/knobs or the tempo slider to reset.
