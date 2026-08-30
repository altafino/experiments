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

Decision 2A (2026-08-30): LCD swap. PERFORM = side-by-side waveforms (mockup B). BROWSE / INFO / SETTINGS replace LCD content. Chassis never unmounts. Mix-blind browse is accepted.

Decision 3A (2026-08-30): Deck column is hands only: track title, BPM, PLAY, CUE, 8 pads, jog, outer tempo fader. Remove `DeckPanel` overview waveform, seek slider, and the duplicate status block that the LCD already shows.

Pass 1 score: 3/10 → 9/10. Remaining 1: pad paging (hot cue vs loop vs beat jump on 8 pads) deferred to Pass 7.

## Interaction states

| Feature | Loading | Empty | Error | Success | Partial |
|---|---|---|---|---|---|
| Deck load | Platter dim, indeterminate ring | Platter center: LOAD (drop or click) | Amber platter ring, one-line reason, LOAD retries | Title + BPM on deck bezel; waveform on LCD | Other deck still LOAD |
| LCD PERFORM | Quiet grid, no fake waveform | Empty row for that deck | Empty row for failed deck | Side-by-side waveforms + beat grid | One row live, one empty |
| Analysis | LCD: analysing… | n/a | LCD: analysis failed, playback still works | BPM on LCD and bezel | Waveform without grid |
| Ending | n/a | n/a | n/a | Remaining time red under 30s | n/a |
| MIDI | SETTINGS: Connecting… | Off + Connect | SETTINGS one-line permission/error | Open + device name | Map missing, generic fallback |
| Record | Rec button pulses | Rec idle | Rec error on mixer, playback continues | Rec pressed, download on stop | n/a |

Decision 4A: empty = LOAD on the platter.
Decision 5A: decode error = amber on that platter, not an LCD banner.

Pass 2 score: 2/10 → 9/10.

## User journey

| Step | User does | User feels | Plan specifies |
|---|---|---|---|
| 1 | Opens the app | Sitting at a mixer, not a website | Chassis fills viewport; no Phase 20 header |
| 2 | Loads deck 1 | Obvious next action | LOAD on the left platter |
| 3 | Hits PLAY | Hands on hardware | Large PLAY/CUE next to platter |
| 4 | Loads deck 2 | Same move, other hand | Right platter still LOAD |
| 5 | Beat-matches | Mix picture is the LCD | Side-by-side waveforms, shared playhead |
| 6 | Browses next track | Trade: mix picture goes away | LCD swap; platters keep playing |
| 7 | Laptop / phone | Still mixable | 1440 full; 1280 compact; <1280 one-deck stage |

5 seconds: LOAD platters. 5 minutes: two decks on the LCD. 5 years: DESIGN.md stops the next feature from reintroducing cards.

Pass 3 score: 4/10 → 9/10. No extra product choice; journey follows 1A–5A.

## Visual language (anti-slop)

Classifier: APP UI.

- Type: IBM Plex Sans + IBM Plex Mono, self-hosted woff2 in `public/fonts` (or `src/assets/fonts`). Needed because system-ui is on the slop blacklist and mixer labels must be one face. No font CDN at runtime.
- Hardware labels: 10–11px tracked caps. LCD body and library rows: 14–16px. Contrast ≥4.5:1 on LCD text.
- Chrome: 2px max radius, no `shadow-xl`, no `rounded-xl` panels. LCD is a 1px inset well. Knobs are circular. Pads 8px radius max.
- Color: keep `--color-surface` `#0a0c10` (shift current `#0b1018` one notch darker), cyan `#4aa7c2`, magenta `#e879a6`, cue `#f3b23e`, danger `#ff6b7a`. CSS variables only.
- Mockup B is a photoreal reference for layout, not a 3D plastic skin to recreate in CSS.
- Motion: none except playhead, jog pip, Rec pulse, LOAD ring. No page transitions.

Decision 6A: IBM Plex Sans + Mono.
Decision 7A: recessed hardware chrome.

Pass 4 score: 3/10 → 9/10.

## Design system

Decision 8A: add `DESIGN.md` in the same implementation as the chassis. Tokens, type, radius, deck colors, pad banks, breakpoints. `/design-consultation` not required first.

Pass 5 score: 1/10 → 8/10 (file does not exist until implementation).

## Responsive and accessibility

| Viewport | Layout |
|---|---|
| ≥1440 | Mockup B: full platters, side-by-side LCD, mixer center |
| 1280–1439 | Same chassis, platters ~160px, pad labels may abbreviate |
| <1280 | LCD stays; lower half is the focused deck (jog+pads+PLAY/CUE); peer deck is a 48px strip (title, BPM, play); mixer xfader + phones stay reachable |

- Touch targets ≥44px on PLAY, CUE, pads, LOAD.
- Keyboard map unchanged; SETTINGS lists it.
- Landmarks: `role="banner"` on LCD bezel, `main` is the chassis, each deck an `region` labelled Deck 1/2.
- Do not rely on hover to show PLAY.

Decision 9A: three intentional viewports.
Decision 10A: split type size.

Pass 6 score: 2/10 → 9/10.

## Pad banks

Decision 11A: 8 pads + HOT CUE / LOOP / JUMP switch (display-only in `view.store.ts`). Keyboard and MIDI still dispatch the same commands.

Eng decision (2026-08-30): T5 one-deck stage is display-only. Hiding a platter must not dispatch pause/load. Both decks keep their transport. Focus keys 1/2 still choose which platter is large. Same bucket as `view.store.ts` line 15 ("Never consulted by the audio engine").

Pass 7: pad bank resolved. Remaining open: none that block this plan.

## Approved Mockups

| Screen/Section | Mockup Path | Direction | Notes |
|----------------|-------------|-----------|-------|
| Controller chassis | ~/.gstack/projects/altafino-experiments/designs/controller-pioneer-20260830/variant-B.png | Side-by-side waveforms, platters dominate | Layout reference only, not photoreal CSS. LCD swap, 8-pad banks, and <1280 one-deck stage are plan additions on top of this still. |

## Implementation Tasks

Synthesized from this review's findings. Each task derives from a specific finding above. Run with Claude Code or Codex; checkbox as you ship.

- [x] **T1 (P1, human: ~6h / CC: ~2h)** — App shell — Rebuild `App.vue` as a no-scroll chassis: LCD, deck, mixer, deck
  - Surfaced by: Pass 1 — stacked cards instead of a mixer
  - Files: `src/app/App.vue`, `src/components/display/MainDisplay.vue`, `src/components/controller/DeckPanel.vue`, `src/components/mixer/MixerPanel.vue`
  - Verify: Playwright shell test + no document scroll at 1440×900
- [x] **T2 (P1, human: ~3h / CC: ~45min)** — LCD PERFORM — Side-by-side scrolling waveforms, shared playhead, drop deck-column waveform
  - Surfaced by: Pass 1 decisions 2A/3A + mockup B
  - Files: `src/components/display/MainDisplay.vue`, `src/components/display/ScrollingWaveform.vue`, `src/components/controller/DeckPanel.vue`
  - Verify: existing beat-jump and waveform e2e still pass; `scrolling-waveform-1` sits left of `-2`
- [x] **T3 (P1, human: ~3h / CC: ~30min)** — Pad banks — 8 pads with HOT CUE / LOOP / JUMP in `view.store.ts`
  - Surfaced by: Pass 7 issue 11
  - Files: `src/state/view.store.ts`, `src/components/deck/HotCuePads.vue`, `src/components/deck/LoopControls.vue`, `src/components/deck/BeatJumpPads.vue`
  - Verify: unit test for bank state; e2e clicks bank then a pad
- [x] **T4 (P1, human: ~2h / CC: ~25min)** — Empty/error — LOAD and amber error on the platter
  - Surfaced by: Pass 2
  - Files: `src/components/deck/JogWheel.vue`, `src/components/controller/DeckPanel.vue`
  - Verify: e2e empty LOAD visible; invalid file shows platter error
- [x] **T5 (P2, human: ~4h / CC: ~1h)** — Breakpoints — 1440 / 1280 / <1280 one-deck stage
  - Surfaced by: Pass 6
  - Files: `src/app/App.vue`, `src/style.css`
  - Verify: Playwright viewports 1440, 1280, 390
- [x] **T6 (P2, human: ~2h / CC: ~25min)** — DESIGN.md + Plex — tokens, type, 2px radius, self-hosted IBM Plex
  - Surfaced by: Pass 4/5
  - Files: `DESIGN.md`, `src/style.css`, `src/app/App.vue`
  - Verify: no `rounded-xl` / `shadow-xl` on chassis; fonts load offline
- [x] **T7 (P2, human: ~1h / CC: ~15min)** — SETTINGS keyboard — move cheatsheet off the page header
  - Surfaced by: Pass 1 header kill
  - Files: `src/app/App.vue`, `src/components/controller/MidiPanel.vue` or SETTINGS pane
  - Verify: e2e SETTINGS shows keyboard list; header gone
- [x] **T8 (P2, human: ~1h / CC: ~15min)** — Skip `ScrollingWaveform` draw when the canvas is not visible (Browse/Info/Settings or off-stage deck)
  - Surfaced by: Eng performance — rAF snapshots still trigger watch/draw on `v-show` hidden canvases
  - Files: `src/components/display/ScrollingWaveform.vue`
  - Verify: unit or component test that draw is not called while hidden; no audio change

## Eng review additions

- One-deck stage is CSS/`view.store` only. Never dispatch pause when a platter is hidden.
- Pad banks: wrap existing `HotCuePads` / `LoopControls` / `BeatJumpPads` in `PadBank.vue`. Do not merge click handlers.
- IBM Plex: vendor woff2 + `@font-face`. No npm font package, no CDN.
- Tests (full matrix):
  - Unit: pad bank in `view.store.ts`
  - E2E: LOAD on empty platter
  - E2E: 1440×900 `document.scrollingElement.scrollHeight === clientHeight` (no page scroll)
  - E2E: 390px focused platter visible, peer strip visible, both decks can still be playing
  - Keep existing smoke tests; they are regressions for command behavior
- Hidden waveform: skip canvas draw when not visible. Keep `v-show` so returning to PERFORM does not rebuild GL/canvas.

```
CODE PATHS                                              USER FLOWS
[+] view.store padBank                                  [+] Mix on 1440 chassis
  ├── [GAP] setPadBank hotcue/loop/jump                   ├── [GAP] [→E2E] no document scroll
  └── [GAP] default hotcue                                ├── [★★ TESTED] play/cue/loop/jump — smoke.spec.ts
[+] JogWheel LOAD/error                                 [+] Empty / error
  ├── [GAP] [→E2E] click LOAD → file                      ├── [GAP] [→E2E] LOAD visible
  └── [GAP] [→E2E] bad file → amber                       └── [GAP] [→E2E] decode error on platter
[+] ScrollingWaveform hidden                            [+] Browse while playing
  └── [GAP] skip draw when not visible                      ├── [★★ TESTED] browse tab — smoke.spec.ts
[+] App.vue breakpoints                                     └── [GAP] canvases must not hitch CPU
  ├── [GAP] [→E2E] 1280 compact
  └── [GAP] [→E2E] 390 one-deck stage

COVERAGE today: existing smoke only (command paths). Layout GAPS: 8 (7 E2E, 1 unit).
```

Scope: T1–T7 in one PR (user 2026-08-30). T8 added by eng review.

## NOT in scope


- Pioneer / rekordbox trademarks, exact XDJ-RR artwork, or hardware MIDI maps in core
- Dual audio output (`setSinkId`) — cue bus already exists
- Beat-grid accuracy / variable tempo
- File-handle library reopen
- High-quality stretcher rewrite
- New audio commands for layout

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope & strategy | 0 | — | — |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | — | Codex CLI not installed; in-session second pass only |
| Eng Review | `/plan-eng-review` | Architecture & tests (required) | 1 | CLEAR (PLAN) | 5 issues, 0 critical gaps |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR (FULL) | score: 3/10 → 9/10, 11 decisions |
| DX Review | `/plan-devex-review` | Developer experience gaps | 0 | — | — |

- **VERDICT:** DESIGN + ENG CLEARED — ready to implement T1–T8.

NO UNRESOLVED DECISIONS

