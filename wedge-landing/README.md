# Wedge AI — Hero

Hero section coded from Figma **Wedge Internal → "AI Agent Option"** (node `138:2009`).

## Run

Static site, no build step:

```bash
cd wedge-landing
npx serve .        # or: python3 -m http.server
```

…or open `index.html` directly.

## Notes

- **Backdrop**: `assets/hero.mp4` is shown as a *static* frame (no autoplay, no
  controls) — a separate backdrop animation is planned. `assets/hero-poster.jpg`
  is frame 0 (building already visible) so the section never renders blank.
- **Type**: the title uses the uploaded **Mozilla Headline** TTFs
  (`assets/MozillaHeadline-*.ttf`). UI/body text uses **Inter** — drop
  `assets/Inter-Regular.ttf` and `assets/Inter-Medium.ttf` in to activate it
  (system fallback until then).
- **Layout** (paddings, sizes, colours, letter-spacing) is matched 1:1 to the
  Figma node values.

## Icon / logo assets — exported from Figma

These are the real @3x exports from the Figma file:

| file | Figma node | what it is |
|------|-----------|------------|
| `assets/logo.png` | `143:205` | Wedge menu logo (3D faceted mark) |
| `assets/ycombinator.png` | `138:2170` | "Y Combinator" backer logo |
| `assets/icon.png` | `138:2177` | button icon — blue orbit sphere ("Explore Agents") |
| `assets/icon2.png` | `143:218` | "Book a Demo" chevron |
