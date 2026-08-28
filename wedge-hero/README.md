# Wedge — Hero

Hero section coded from Figma **Wedge Internal → "Hero"** (node `425:1038`).

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
- `styles.css` — all styling; the frame's own numbers (1440x810 canvas, centred
  800px column, 50px gutters) are kept as literals so they can be checked
  against Figma
- `assets/` — background video + poster, fonts, logo and icons

## Layout

Everything sits in one centred 800px column: the "Backed by Y Combinator"
lockup, the 72px title, a 582px-wide line of copy and the Explore Agents
button. Logo top-left, nav top-right, both 50px off the edge at y=34.

## Notes

- **Background**: `assets/hero.mp4` loops muted at 50% opacity over black.
  This frame carries no gradient scrim — its `overlay` group is empty — so the
  video's own contrast is what darkens the page.
- **Type**: Mozilla Headline Medium for the title, Inter Display
  (Regular + Medium) for everything else. Only the weights actually used are
  kept in `assets/`.
- **Reveal**: on load the YC line fades up out of a blur, the title types
  itself line by line behind a blinking caret, the copy follows, then the CTA
  rises in. Each typed line sits over a hidden ghost copy of its final text, so
  the centred column keeps its exact size and nothing reflows. Button labels
  decode out of random glyphs on hover. All of it is skipped under
  `prefers-reduced-motion`.
- **Icons**: `iconborder.png` is the CTA tile (it carries its own rounding and
  green-to-light falloff, so no fill or highlight is added in CSS),
  `launchicon.svg` sits on top of it, `arrow-right.svg` in
  Book a Demo, and `ycombinator.svg` — which is the whole "Backed by
  Y Combinator" lockup as one 218x28 asset, so that row is a single image
  rather than text plus a logo.
