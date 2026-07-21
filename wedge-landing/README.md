# Wedge AI — Landing prototype

Screens coded from the Figma selection **Wedge Internal → "transition" section**
(hero → "Talk to Wedge AI" scroll transition → answer section).

## Run it

No build step — it's a static site:

```bash
cd wedge-landing
npx serve .        # or: python3 -m http.server
```

…or just open `index.html` in a browser.

## What's implemented

1. **Hero** — "The Operating System for Healthcare AI Agents", Backed by YC row,
   Start the Journey button (scrolls into the transition), floating glass menu.
2. **Scroll transition** (pinned section, scrubbed by scroll):
   - *Reading effect*: "Talk to Wedge AI to learn more" lights up word by word.
   - The sphere starts huge at the bottom edge, then **scales down while
     circling** (one elliptical loop) until it settles into place under the input.
   - "Hey, I'm Wedge! Ask anything about me" + glass input field fade in.
   - The send icon swaps from voice-bars to an arrow once you type
     (as in the Figma frames), and **pressing send scrolls to the next section**,
     carrying your question into its heading.
3. **Answer section** — "What is wedge?" copy with the development / integration /
   maintenance icon chips, follow-up input, and the resting mini sphere.

## Placeholders

- **Fonts** are placeholder stacks, defined once in `styles.css`:
  `--font-display` → Mozilla Headline, `--font-text` → Mozilla Text,
  `--font-body` → Inter. Swap them there when the real fonts are added.
- The hero's tiled-glass video backdrop, the 3D cube, and the sphere are
  CSS/SVG recreations (no binary assets), so everything is self-contained.

## Files

- `index.html` — markup for all three screens
- `styles.css` — design tokens + styling (frame, menu, sphere, glass input…)
- `main.js` — scroll choreography (word reveal, sphere orbit, phase fades)
