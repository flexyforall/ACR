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

Playback then speeds up to reach the fly-in in about a second and drops back to
normal once inside, where the scene brightens to full. The final frame is held,
ready for the next section.

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
