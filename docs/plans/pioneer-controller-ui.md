# Pioneer-style responsive controller UI

Target: V1 "responsive controller UI" from the original Web DJ plan. Functional XDJ-style layout, no Pioneer trademarks, logos, or copied artwork.

Approved visual: variant B (side-by-side waveforms, platters dominate).
Path: `~/.gstack/projects/altafino-experiments/designs/controller-pioneer-20260830/variant-B.png`

Audio, commands, and workers stay as they are. This plan is display chrome and layout only. `view.store.ts` remains display-only.

## What already exists

- Dual `DeckEngine`, mixer, Color FX, Beat FX, cue bus, MIDI, library, recording
- `MainDisplay` tabs: PERFORM / BROWSE / INFO / SETTINGS
- Cyan deck 1 / magenta deck 2 in `deckTheme.ts`
- Zoomed scrolling waveform + overview strip
- Keyboard + generic MIDI already on the command bus
- Tokens in `src/style.css`: surface `#0b1018`, panel, accent, cue, danger
- No `DESIGN.md`

## Information architecture

First / second / third in the first viewport:

1. LCD (waveforms or browse/info/settings content)
2. Jog platters (left deck 1, right deck 2)
3. Mixer (center)

```
┌─────────────────────────────────────────────────────────────┐
│ LCD  [PERFORM] [BROWSE] [INFO] [SETTINGS]           zoom 8s │
│ ┌──────────────────────┐  ▲  ┌──────────────────────┐       │
│ │ Deck1 waveform cyan  │play│ │ Deck2 waveform pink │       │
│ └──────────────────────┘head└──────────────────────┘       │
├─────────────┬───────────────────────────┬───────────────────┤
│ DECK 1      │ MIXER                     │ DECK 2            │
│ tempo fader │ ch1 knobs │ ch2 knobs     │ tempo fader       │
│ PLAY  CUE   │ faders + crossfader       │ PLAY  CUE         │
│ 8 pads      │ Beat FX / Rec / phones    │ 8 pads            │
│   JOG       │                           │   JOG             │
└─────────────┴───────────────────────────┴───────────────────┘
```

- Fill the viewport. No document scroll on desktop ≥1280px.
- Kill the page header ("Web DJ", "Phase 20", keyboard essay). Product name is a 10px bezel mark. Keyboard lives under SETTINGS.
- LCD mode tabs stay on the bezel. Chassis (platters, mixer, transport) does not unmount when the LCD mode changes.

Decision 1A (2026-08-30): hardware chassis, not a restyle of the stacked-card page.

## NOT in scope

- Pioneer / rekordbox trademarks, exact XDJ-RR artwork, or hardware MIDI maps in core
- Dual audio output (`setSinkId`) — cue bus already exists
- Beat-grid accuracy / variable tempo
- File-handle library reopen
- High-quality stretcher rewrite
- New audio commands for layout
