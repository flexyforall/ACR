# CEDUR — marketing site

Static site implementing the Figma frame-by-frame sequence
([Cedur file, node 130-111](https://www.figma.com/design/Hy0EZKshpWuhHvzh8t1k2G/Cedur?node-id=130-111)):

1. **Loader** — masked tagline reveal ("the roof / home / that makes it"),
   "home" brightens with real asset-preload progress, then the 100×100
   window at the bottom expands into the full-bleed hero shot.
2. **Hero** — CEDUR title + description masked reveal, nav, request-sample CTA.
   The hero background *is* frame 1 of the film.
3. **Benefits (scroll-scrubbed)** — the viewport pins and scrolling scrubs a
   169-frame sequence (extracted from the source video at the exact
   1440×800 design crop). The camera flies from the hero shot up over the
   roof while the copy swaps in-frame across three steps and the progress
   line fills — the gru.space-style interaction.

## Run

Any static file server, e.g.:

```bash
cd website && python3 -m http.server 8000
# open http://localhost:8000
```

No build step, no dependencies.

## Fonts

The design uses **OwnersTRIAL Medium** and **Neue Montreal Regular**
(commercial licenses). Drop the licensed files in as:

- `assets/fonts/OwnersTRIAL-Medium.woff2`
- `assets/fonts/NeueMontreal-Regular.woff2`

They are picked up automatically; until then the site falls back to the
bundled open fonts (Archivo / Inter).

## Assets

- `assets/frames/frame_001..169.webp` — film frames, 1440×800, extracted
  from the source MP4 (`crop=1440:800:144:269`, the crop the design uses).
- `assets/logo.svg` — CEDUR logo exported from Figma.
- `assets/thumb.jpg` — request-sample button thumbnail (low-res export;
  replace with the original `Products_Carousel_Live-Oak` product photo
  for full fidelity).
- **Hero building image** — the parallax foreground currently reuses the
  film's establishing frame (`frame_001.webp`) as a stand-in, because
  Figma's asset CDN is blocked from the build environment. To use the
  exact house cutout from Figma node `130:627`, export it as a PNG with
  transparency, save it as `assets/house.webp` (or `.png`), and point the
  `<div class="building"><img>` in `index.html` at it. The radial mask in
  `.building img` can then be removed since the export already has alpha.

To re-extract frames from a new cut of the video:

```bash
ffmpeg -i input.mp4 -vf "crop=1440:800:144:269" -c:v libwebp -quality 66 \
  assets/frames/frame_%03d.webp
```
