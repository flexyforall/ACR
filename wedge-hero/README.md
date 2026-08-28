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

Clicking the CTA flies the camera inside. The moment it enters the building is
**not** a handoff between two clips — `assets/dive.mp4` is the hero's camera
move with the fly-in welded onto the end of it, one encode, so that join is an
ordinary frame-to-frame cut inside a file and cannot stall, flash or drift.

That leaves a single swap, from the looping clip to the dive, and it is made to
show the same picture on both sides:

- `hero.mp4` is a boomerang, so if it is on its way back, the time is mirrored
  to the matching point of the forward pass — the identical frame.
- `dive.mp4` opens with that same footage, so seeking it to the same time lands
  on that same frame.
- The reveal waits for the seek to actually report complete, and the dive sits
  in its own opaque layer (black behind, video at the same 50% on top), so the
  loop is hidden the instant it appears and no undecoded frame can flash black.
  The decoder is warmed at load so the first revealed frame is already painted.

`dive.mp4` carries the whole journey: the camera move, the fly-in, and the push
into the workstation screen — 430 frames, 17.92s, rebuilt from the original
sources so nothing is a re-encode of a re-encode. It holds two joins:

- **frame 192 (8.0s), into the fly-in** — a hard cut, because those frames
  genuinely match (a single-frame step, confirmed against its neighbours).
- **~12.84s, into the last clip** — a 0.2s dissolve. Here a hard cut would have
  shown a faint pop: a one-frame step inside that clip measures ~44 dB, while
  its opening frame against the preceding one measures only ~36, so the two
  renders differ slightly even though the camera has not moved. The dissolve
  absorbs that, and the ramp across it is smooth end to end.

Playback speeds up to reach the fly-in in about a second and drops back to
normal once inside, where the scene brightens to full. The final frame — the
dashboard — is held, and the Agents section fades in over it.

## Agents (node `417:470`)

The second screen is not a new page — it is the dive's held final frame with
the layout's chrome and copy laid on top. `main.js` adds `is-arrived` in the
dive's `ended` handler, and that class is the only thing that reveals the
section, so the text cannot appear before the last frame is on screen. The
hero's own logo and nav fade out at the same moment; they are white-on-video
and have no place on the light frame.

**No monitor mockup is drawn.** The design's mockup is the workstation the
camera lands on, and the video already puts it there: measured on the dive's
final frame, the monitor's bounding box sits at 0.037 / 0.251 of the frame
(0.586 wide), against 0.035 / 0.249 (0.560 wide) for the mockup on the design's
canvas. The gap is under half a percent of the width, so the video stays
full-bleed and nothing is repositioned or re-scaled to meet it.

What the section adds is the light centred menu (`417:504`), the copy column at
x=956 — bullet + `01`, `AI Receptionist`, the body paragraph and the
`Try Agent Now` button — and the carousel controls below it at y=696: prev/next
and six dots. Frame coordinates are kept as literals, as elsewhere, so they can
be checked against Figma.

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
