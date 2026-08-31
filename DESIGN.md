# Design system

Hardware chrome for the Web DJ controller. Audio timing, commands, and engines are out of scope here. `view.store.ts` is display-only.

## Type

Self-hosted IBM Plex (SIL Open Font License). No CDN, no npm font package.

| Role | Face | Size | Notes |
| --- | --- | --- | --- |
| Hardware labels | IBM Plex Sans Medium | 10–11px | Tracked caps (`0.12em`–`0.2em`) |
| LCD body, library | IBM Plex Sans Regular | 14–16px | Contrast ≥4.5:1 on `#080d15` |
| Timecode / BPM | IBM Plex Mono Regular | 12–16px | Never proportional figures for clocks |
| Bezel product mark | IBM Plex Sans Medium | 10px | “Web DJ” on the LCD bezel only |

Files: `public/fonts/IBMPlexSans-Regular.woff2`, `IBMPlexSans-Medium.woff2`, `IBMPlexMono-Regular.woff2`.

## Color (CSS variables in `src/style.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--color-surface` | `#0a0c10` | Chassis / page |
| `--color-panel` | `#12151c` | Deck and mixer plates |
| `--color-panel-border` | `#2a3548` | 1px hardware edge |
| `--color-ink` | `#e8eef8` | Primary text |
| `--color-muted` | `#8b98ad` | Labels |
| `--color-accent` | `#7ee0ff` | Armed / selected |
| `--color-cue` | `#f3b23e` | Cue / playhead |
| `--color-danger` | `#ff6b7a` | Rec / remaining &lt; 30s |
| `--color-deck-1` | `#4aa7c2` | Deck 1 waveform |
| `--color-deck-2` | `#e879a6` | Deck 2 waveform |

LCD well: `#080d15` with a 1px inset highlight. Decode errors use an amber platter ring (`--color-cue`), not an LCD banner.

## Chrome

- Radius: 2px max on plates (`--radius-hardware`). Knobs and platters are circles. Pads ≤8px.
- No `rounded-xl`, `shadow-xl`, or card stacks on the chassis.
- Fill the viewport. No document scroll at ≥1280px. Inner panels may scroll.
- Motion: playhead, jog pip, Rec press, LOAD ring. No page transitions.

## Layout

1. LCD (waveforms or BROWSE / INFO / SETTINGS)
2. Platters (deck 1 left, deck 2 right)
3. Mixer centre

Deck column is hands-only: title, BPM, PLAY / CUE, pad bank, jog, outer tempo fader. Waveforms live on the LCD. Mix-blind browse is accepted: swapping LCD mode does not unmount the chassis.

## Pad banks

Display-only in `view.store.ts`: `hotcue` (default), `loop`, `jump`. Keyboard and MIDI still dispatch the same commands. Wrap existing pad components; do not merge click handlers.

## Breakpoints

| Viewport | Layout |
| --- | --- |
| ≥1440 | Full platters, side-by-side LCD, mixer centre |
| 1280–1439 | Same chassis, platters ~160px |
| &lt;1280 | LCD stays; focused deck is the stage; peer deck is a 48px strip (title, BPM, play); mixer xfader and phones stay reachable |

Hiding a platter is CSS only. Never pause a hidden deck.

## Touch and landmarks

PLAY, CUE, pads, and LOAD are ≥44px. `role="banner"` on the LCD bezel, `main` on the chassis, each deck a labelled `region`.
