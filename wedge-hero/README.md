# Wedge — Hero

Hero section coded from Figma **Wedge Internal → "Hero"** (node `425:1150`).

## Run

Static, no build step:

```bash
cd wedge-hero
npx serve .        # or: python3 -m http.server
```

Open through a server, not by double-clicking the file — `file://` blocks the
video and the fonts.

## Files

- `index.html` — markup, each block tagged with its Figma `data-node-id`
- `styles.css` — all styling; the frame's own numbers (1440x810 canvas, left-aligned
  800px column at x=80, 50px gutters) are kept as literals so they can be checked
  against Figma
- `assets/` — background video + poster, fonts, logo and icons

## Layout

Everything sits in one left-aligned 800px column, 80px off the left edge: the "Backed by Y Combinator"
lockup, the 72px title, a 582px-wide line of copy and the Explore Agents
button. Logo top-left, nav top-right, both 50px off the edge at y=34.

## Explore Agents

Clicking the CTA flies the camera inside, into `assets/transition.mp4`, which
opens on the very frame the hero loop turns around on (frame 192 / 8.0s —
found by comparing frames, 39.5 dB against 16-22 dB elsewhere). Handing off
exactly there means the camera just keeps going, with no cut.

Two things make that work from a click at any moment:

- If the loop is on its way back, playback jumps to the mirrored point in the
  forward pass. Because a boomerang holds every frame twice, that seek shows
  the identical image and is invisible.
- Playback then speeds up to reach the turnaround in about a second, so the
  click feels answered — it reads as the camera diving in rather than a wait.

The transition takes over at the same 50% opacity, so the handoff carries no
brightness step; it brightens to full only once the copy is gone. Its last
frame is held, ready for the next section to pick up.

## Notes

- **Background**: `assets/hero.mp4` loops muted at 50% opacity over black. The
  file is a boomerang — the supplied 8s clip followed by itself reversed — so
  playback runs forward, then back, and cycles with no cut. Browsers can't play
  a video backwards (negative `playbackRate` is unsupported), so the reverse is
  baked into the file and a plain `loop` attribute does the rest. The duplicated
  frame at each turnaround is dropped, so both seams step by exactly one frame:
  384 frames, 16s, 24fps.
  This frame carries no gradient scrim — its `overlay` group is empty — so the
  video's own contrast is what darkens the page.
- **Type**: Mozilla Headline Medium for the title, Inter Display
  (Regular + Medium) for everything else. Only the weights actually used are
  kept in `assets/`.
- **Reveal**: on load the YC line fades up out of a blur, the title types
  itself line by line behind a blinking caret, the copy follows, then the CTA
  rises in. Each typed line sits over a hidden ghost copy of its final text, so
  nothing reflows while the text grows. Button labels
  decode out of random glyphs on hover. All of it is skipped under
  `prefers-reduced-motion`.
- **Icons**: `iconborder.png` is the CTA tile (it carries its own rounding and
  green-to-light falloff, so no fill or highlight is added in CSS),
  `launchicon.svg` sits on top of it, `arrow-right.svg` in
  Book a Demo, and `ycombinator.svg` — which is the whole "Backed by
  Y Combinator" lockup as one 218x28 asset, so that row is a single image
  rather than text plus a logo.
