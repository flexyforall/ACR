# Wedge — Hero

Hero section coded from Figma **Wedge Internal → "Hero"** (node `395:378`).

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
- `styles.css` — all styling; the frame's own numbers (1440x810 canvas, 50px
  gutters) are kept as literals so they can be checked against Figma
- `assets/` — background video + poster, fonts, logo and YC marks

## Notes

- **Background**: `assets/hero.mp4` loops muted; it sits at 80% opacity over
  `#171c16`, under a bottom-weighted black scrim (the frame stacks three
  gradients — their combined falloff is ~0.46 at the midpoint and ~0.75 at the
  foot, which is what the single gradient here reproduces).
- **Type**: Mozilla Headline for the title and stat values. The frame calls for
  **Inter Display**, which we don't have — `Rinter` stands in for it. Drop
  `InterDisplay-Regular.ttf` / `-Medium.ttf` into `assets/` and swap the
  `@font-face` block to switch.
- **Icons**: the story glyph and the Book-a-Demo arrow are inline SVG; the Wedge
  mark and the YC lockup are PNG exports.
