/* ============================================================
   CEDUR — loader → blurred hero → scroll clears into the film
   The hero sits on a blurred, veiled still of the scene. Scrolling
   dissolves the veil and the blur, revealing the film as-is, then
   scrubs it frame-by-frame while the benefits copy swaps in-frame.
   ============================================================ */

(() => {
  'use strict';

  // ------------------------------------------------------------------
  // config
  // ------------------------------------------------------------------
  const FRAME_COUNT = 169;
  // retina screens get the 2880×1600 set (1:1 canvas pixels), others 1440×800
  const HIRES = window.devicePixelRatio > 1.5 && window.innerWidth > 900;
  const FRAME_W = HIRES ? 2880 : 1440;
  const FRAME_H = HIRES ? 1600 : 800;
  const FRAME_PATH = i => `assets/${HIRES ? 'frames2x' : 'frames'}/frame_${String(i + 1).padStart(3, '0')}.webp`;

  const GATE_FRAMES = 42;       // frames that must be ready before reveal
  const SCRUB_IN = 0.16;        // the scrub starts once the hero has left
  const SCRUB_OUT = 0.96;       // scroll progress where frame 169 lands
  const BLUR_MAX = 32;          // hero film blur (150:688); clears on scroll

  // scroll sequence (smooth, staggered): hero copy dissolves, the top
  // gradient fades, then the film scrubs from its first frame
  const HERO_OUT = [0.0, 0.10];   // hero copy dissolves
  const VEIL_OUT = [0.06, 0.16];  // top gradient fades
  const BENEFITS_AT = 0.16;       // benefits copy takes over from here

  // ambient: at rest the film simply plays in the background; reaching the
  // end it rewinds quickly and plays again. The moment the user scrolls it
  // snaps into the same fast rewind back to frame 1, and only then the
  // scroll scrub toward the second section takes over (scrub is parked at
  // frame 1 until SCRUB_IN anyway, so the rewind always lands first).
  const AMBIENT_FPS = 6;       // quarter real-time — a slow, calm background
  const AMBIENT_REWIND_S = 0.9;   // idle-loop rewind duration
  const AMBIENT_AT = 0.02;        // ambient runs below this progress
  const REWIND_K = 0.3;           // fast catch-up lerp once scrolling starts

  // loader sequence: phrases lit one at a time (previous dims back)
  const LOADER_STEP_T = [1350, 1950, 2550];
  const LOADER_MIN_MS = 3250;

  // copy per step — verbatim from Figma (130:118 / 130:147 / 130:176)
  const STEPS = [
    {
      title: 'Made to weather the storm',
      desc: 'Exceptional impact resistance provides dependable protection against hail and severe weather, season after season.',
      bar: 80 / 1440,
      titleW: 435, // Figma title box — wider than the glyphs; the desc
    },             // right-aligns to this box, reaching past the text
    {
      title: 'Standalone Class A Fire Rated',
      desc: 'Engineered for elevated fire protection, helping safeguard the home and everything beneath it when it matters most.',
      bar: 811 / 1440,
      titleW: 461,
    },
    {
      title: 'Strength, thoughtfully engineered',
      desc: 'CEDUR delivers the depth and dimension of natural cedar in a lighter roofing system designed for easier installation and lasting structural confidence.',
      bar: 1314 / 1440,
      titleW: 538,
    },
  ];
  const STEP_BOUNDS = [0.38, 0.7]; // in scrub progress

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------------
  // dom
  // ------------------------------------------------------------------
  const body = document.body;
  const loader = document.getElementById('loader');
  const loaderBand = document.getElementById('loaderBand');
  const loaderWindow = document.getElementById('loaderWindow');
  const stage = document.getElementById('stage');
  const hero2 = document.getElementById('hero2');
  const cta = document.getElementById('cta');
  const benefitsHead = document.getElementById('benefitsHead');
  const benefitTitle = document.getElementById('benefitTitle');
  const benefitDesc = document.getElementById('benefitDesc');
  const progressBar = document.getElementById('progressBar');
  const filmLabels = document.getElementById('filmLabels');
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');

  // hero pieces choreographed individually during the scroll transition
  const hlineA = document.querySelector('.hline--a');
  const hlineB = document.querySelector('.hline--b');
  const vlineEls = Array.from(document.querySelectorAll('.vline'));
  const crossEls = Array.from(document.querySelectorAll('.cross'));
  const exploreEl = document.getElementById('explore');
  const explore2El = document.getElementById('explore2');
  const heroPara = document.querySelector('.hero-para');
  const slEls = Array.from(document.querySelectorAll('.slogan .sl'));

  // lit in reading order: the roof → that makes it (center) → home (right)
  const seqEls = [
    document.getElementById('tlLeft'),
    document.getElementById('tlCenter'),
    document.getElementById('tlRight'),
  ];

  const u = () => window.innerWidth / (window.innerWidth <= 720 ? 720 : 1440);

  // ------------------------------------------------------------------
  // word-mask reveal helpers (line-rise + skew settle)
  // ------------------------------------------------------------------
  function setWords(el, text) {
    el.textContent = '';
    text.split(' ').forEach((word, i) => {
      const w = document.createElement('span');
      w.className = 'w';
      const wi = document.createElement('span');
      wi.className = 'wi';
      wi.style.setProperty('--i', i);
      wi.textContent = word;
      w.appendChild(wi);
      el.appendChild(w);
      el.appendChild(document.createTextNode(' '));
    });
  }
  const wordsIn = el => el.querySelectorAll('.wi').forEach(wi => { wi.classList.remove('out'); wi.classList.add('in'); });
  const wordsOut = el => el.querySelectorAll('.wi').forEach(wi => wi.classList.add('out'));

  // ------------------------------------------------------------------
  // frame preloading
  // ------------------------------------------------------------------
  const frames = new Array(FRAME_COUNT).fill(null);
  let loadedCount = 0;

  function loadFrame(i) {
    return new Promise(resolve => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => { frames[i] = img; loadedCount++; resolve(); };
      img.onerror = () => resolve();
      img.src = FRAME_PATH(i);
    });
  }

  async function preloadAll() {
    await loadFrame(0);
    drawFrame(0);
    const queue = [];
    for (let i = 1; i < FRAME_COUNT; i++) queue.push(i);
    const workers = Array.from({ length: 8 }, async () => {
      while (queue.length) await loadFrame(queue.shift());
    });
    await Promise.all(workers);
  }

  function nearestFrame(i) {
    i = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(i)));
    for (let j = i; j >= 0; j--) if (frames[j]) return frames[j];
    return null;
  }

  // ------------------------------------------------------------------
  // canvas — fractional frame positions render as a crossfade between
  // the two neighbouring frames, so slow playback stays fluid instead
  // of stepping visibly from frame to frame
  // ------------------------------------------------------------------
  let lastDrawn = -1;
  const loaderScene = document.getElementById('loaderScene');
  const loaderCtx = loaderScene ? loaderScene.getContext('2d') : null;

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    if (loaderScene && body.dataset.state !== 'done-loading') {
      loaderScene.width = canvas.width;
      loaderScene.height = canvas.height;
    }
    const fxEl = document.getElementById('fx');
    if (fxEl) {
      fxEl.width = Math.round(fxEl.clientWidth * dpr);
      fxEl.height = Math.round(fxEl.clientHeight * dpr);
    }
    lastDrawn = -1;
  }

  function paintCover(img, alpha) {
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / FRAME_W, ch / FRAME_H);
    const dw = FRAME_W * s, dh = FRAME_H * s;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    ctx.globalAlpha = 1;
  }

  function drawFrame(pos) {
    const i0 = Math.max(0, Math.min(FRAME_COUNT - 1, Math.floor(pos)));
    const i1 = Math.min(FRAME_COUNT - 1, i0 + 1);
    const frac = Math.min(1, Math.max(0, pos - i0));
    const a = frames[i0] || nearestFrame(i0);
    if (!a) return;
    paintCover(a, 1);
    const b = frames[i1];
    if (b && b !== a && frac > 0.01) paintCover(b, frac);
    // mirror into the loader's window while it is on screen
    if (loaderCtx && body.dataset.state !== 'done-loading') {
      loaderCtx.drawImage(canvas, 0, 0);
    }
  }

  // ------------------------------------------------------------------
  // loader timeline
  // ------------------------------------------------------------------
  const t0 = performance.now();

  requestAnimationFrame(() => loader.setAttribute('data-in', ''));
  if (!reducedMotion) {
    seqEls.forEach((txt, i) => {
      setTimeout(() => {
        if (i > 0) seqEls[i - 1].classList.remove('lit');
        txt.classList.add('lit');
      }, LOADER_STEP_T[i]);
    });
  } else {
    seqEls[seqEls.length - 1].classList.add('lit');
  }

  function loaderTick() {
    if (body.dataset.state !== 'loading') return;
    const ready = loadedCount >= GATE_FRAMES &&
      performance.now() - t0 >= (reducedMotion ? 400 : LOADER_MIN_MS);
    if (ready) reveal();
    else requestAnimationFrame(loaderTick);
  }

  function reveal() {
    body.dataset.state = 'revealing';

    const bandCollapse = loaderBand.animate(
      [{ clipPath: 'inset(-100px 0 -100px 0)' }, { clipPath: 'inset(50% 0 50% 0)' }],
      { duration: reducedMotion ? 1 : 650, easing: 'cubic-bezier(0.65,0,0.35,1)', fill: 'forwards' }
    );

    bandCollapse.onfinish = () => {
      // the film starts playing right as the square window opens up —
      // the loader's canvas mirrors the main one, so the expansion
      // reveals footage already in motion
      ambientOn = true;
      const px = u();
      const openFrom = `inset(calc(100% - ${100 * px}px) calc(50% - ${50 * px}px) 0px calc(50% - ${50 * px}px))`;
      const win = loaderWindow.animate(
        [{ clipPath: openFrom }, { clipPath: 'inset(0px 0px 0px 0px)' }],
        { duration: reducedMotion ? 1 : 1100, easing: 'cubic-bezier(0.76,0,0.24,1)', fill: 'forwards' }
      );
      win.onfinish = () => {
        // the main canvas carries the same playing scene, so the loader
        // can drop immediately and the hero reveals play visibly
        body.dataset.state = 'done-loading';
        body.setAttribute('data-revealed', '');
        setTimeout(startTypeLoop, reducedMotion ? 0 : 1200);
      };
    };
  }

  // ------------------------------------------------------------------
  // typed labels: the /welcome sides and the keep-scrolling line type
  // out letter by letter, delete the same way, and loop — one shared
  // cursor keeps them in sync (shorter labels finish early and hold).
  // Each label's box is locked to its full-text width up front so the
  // layout never reflows while letters come and go.
  // ------------------------------------------------------------------
  const typeEls = Array.from(document.querySelectorAll('.explore__side, .explore__center'))
    .map(el => ({ el, text: el.textContent }));
  const typeMax = Math.max(0, ...typeEls.map(t => t.text.length));

  function startTypeLoop() {
    if (reducedMotion || !typeEls.length) return;
    const px = u();
    typeEls.forEach(t => {
      t.el.style.width = `calc(${(t.el.offsetWidth / px).toFixed(2)} * var(--u))`;
      t.el.style.textAlign = 'left';
    });
    let n = typeMax; // labels fade in complete, then the loop begins
    let dir = -1;
    function tick() {
      n += dir;
      typeEls.forEach(t => { t.el.textContent = t.text.slice(0, n); });
      let delay;
      if (dir > 0 && n >= typeMax) { dir = -1; delay = 2600; } // hold typed
      else if (dir < 0 && n <= 0) { dir = 1; delay = 1000; }   // hold empty
      else delay = dir > 0 ? 76 : 42;                          // type / delete
      setTimeout(tick, delay);
    }
    setTimeout(tick, 2600);
  }

  // ------------------------------------------------------------------
  // particle hand-off: as the rising line crosses THAT MAKES IT, the
  // glyphs decay into particles row by row; the particles linger and
  // drift, then assemble into "Made to weather the storm" right as the
  // film section's real title takes over. Everything is a function of
  // scroll progress (reversible) plus a time-based wobble (organic).
  // ------------------------------------------------------------------
  const fx = document.getElementById('fx');
  const fxCtx = fx ? fx.getContext('2d') : null;
  const FX_N = 1400;               // particle budget
  const FX_FORM = [0.115, 0.15];   // particles assemble into the new title
  const FX_FADE = [0.155, 0.17];   // hand over to the real DOM title
  let fxParts = null;
  let fxDirty = false;

  // rasterize a line of text on the 1440×800 board and sample its pixels
  function fxSample(text, font, spacing, align, x, baseline, maxPts) {
    const off = document.createElement('canvas');
    off.width = 1440;
    off.height = 800;
    const c = off.getContext('2d', { willReadFrequently: true });
    c.fillStyle = '#fff';
    c.font = font;
    if ('letterSpacing' in c) c.letterSpacing = spacing;
    c.textAlign = align;
    c.fillText(text.toUpperCase(), x, baseline);
    const data = c.getImageData(0, 0, 1440, 800).data;
    const pts = [];
    for (let y = 0; y < 800; y += 2) {
      for (let px = 0; px < 1440; px += 2) {
        if (data[(y * 1440 + px) * 4 + 3] > 128) pts.push([px, y]);
      }
    }
    const out = [];
    const step = Math.max(1, pts.length / maxPts);
    for (let i = 0; i < pts.length; i += step) out.push(pts[Math.floor(i)]);
    return out;
  }

  function buildParticles() {
    if (!fxCtx || reducedMotion) return;
    const fam = '400 80px "Neue Montreal", "Inter", Arial, sans-serif';
    const famSm = '400 22px "Neue Montreal", "Inter", Arial, sans-serif';
    // THAT MAKES IT: line box 354–426 on the board, baseline ≈ 420
    const src = fxSample('That makes it', fam, '-2.4px', 'center', 720, 420, FX_N);
    // Made to weather the storm: title box top 411, baseline ≈ 431
    const tgt = fxSample('Made to weather the storm', famSm, '0.22px', 'left', 40, 431, src.length);
    if (!src.length || !tgt.length) return;
    // pair source and target left-to-right so the swarm sweeps coherently
    src.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    tgt.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    fxParts = src.map((s, i) => ({
      sx: s[0],
      sy: s[1],
      tx: tgt[Math.min(tgt.length - 1, Math.floor(i * tgt.length / src.length))][0],
      ty: tgt[Math.min(tgt.length - 1, Math.floor(i * tgt.length / src.length))][1],
      // the rising line (y = 444 − 184t across HERO_OUT) cuts this pixel at:
      spawnP: HERO_OUT[0] + (HERO_OUT[1] - HERO_OUT[0]) * clamp01((436 - s[1]) / 184),
      a1: 0.22 + Math.random() * 0.4,
      wob: 2 + Math.random() * 3,        // wobble amplitude (board units)
      f1: 0.6 + Math.random() * 1.1,     // wobble frequency
      ph: Math.random() * Math.PI * 2,   // wobble phase
      dx: (Math.random() - 0.5) * 520,   // drift per unit of scroll progress
      dy: -120 - Math.random() * 480,
      sz: 0.45 + Math.random() * 0.75, // dot radius, board units
    }));
  }

  function fxDraw(p, now) {
    if (!fxCtx) return;
    const active = fxParts && p > HERO_OUT[0] + 0.002 && p < FX_FADE[1];
    if (!active) {
      if (fxDirty) { fxCtx.clearRect(0, 0, fx.width, fx.height); fxDirty = false; }
      return;
    }
    const vh = window.innerHeight;
    const px = u();
    const sc = fx.width / window.innerWidth; // css px → canvas px
    fxCtx.clearRect(0, 0, fx.width, fx.height);
    fxDirty = true;
    const form = smooth01(range(p, FX_FORM[0], FX_FORM[1]));
    const fade = range(p, FX_FADE[0], FX_FADE[1]);
    const tsec = now / 1000;
    fxCtx.fillStyle = '#fff';
    for (const q of fxParts) {
      const born = range(p, q.spawnP, q.spawnP + 0.008);
      if (born <= 0) continue;
      const alpha = q.a1 * born * (1 - fade);
      if (alpha < 0.02) continue;
      const drift = p - q.spawnP; // scroll-driven, so scrubbing back reforms the text
      const loose = 1 - form;
      let bx = q.sx + q.dx * drift * loose + Math.sin(tsec * q.f1 + q.ph) * q.wob * loose;
      let by = q.sy + q.dy * drift * loose + Math.cos(tsec * q.f1 * 1.4 + q.ph * 1.6) * q.wob * loose;
      bx += (q.tx - bx) * form;
      by += (q.ty - by) * form;
      const X = bx * px * sc;
      const Y = (vh / 2 + (by - 400) * px) * sc;
      const R = Math.max(0.5, q.sz * px * sc);
      fxCtx.globalAlpha = alpha;
      fxCtx.beginPath();
      fxCtx.arc(X, Y, R, 0, 6.2832);
      fxCtx.fill();
    }
    fxCtx.globalAlpha = 1;
  }

  // ------------------------------------------------------------------
  // cursor play (hero at rest): the hairline pair travels to wrap
  // whichever title line the cursor points at. Capturing a NEW line
  // plays, on that line only, the code-style character scramble plus
  // its product-square bloom. The other lines stay untouched.
  // Line boxes (center-relative): L1 −118…−46, L2 −46…+26, HOME +26…+98;
  // the pair rests on HOME (offset 0); L2 = −72; L1 = −144.
  // ------------------------------------------------------------------
  const SCRAMBLE_CHARS = 'ABCDEFGHIKLMNORSTUVXZ</>[]#*+';
  const CAPTURE_OFFSETS = [-144, -72, 0];
  let scrambleBusy = false;
  let captured = 2; // the pair rests on HOME
  // per-line text widths (board units) so the vertical pair can hug the
  // captured line horizontally; measured once the fonts are ready
  let lineWidths = [558, 558, 558];
  let vxLT = 441, vxRT = 999; // targets
  let vxL = 441, vxR = 999;   // eased

  function measureLineWidths() {
    const c = document.createElement('canvas').getContext('2d');
    c.font = '400 80px "Neue Montreal", "Inter", Arial, sans-serif';
    if ('letterSpacing' in c) c.letterSpacing = '-2.4px';
    lineWidths = ['THE ROOF', 'THAT MAKES IT', 'HOME'].map(t => c.measureText(t).width);
    setVlineTargets(captured);
  }

  function setVlineTargets(idx) {
    const half = lineWidths[idx] / 2 + 26;
    vxLT = 720 - half;
    vxRT = 720 + half;
  }

  function scrambleLine(idx) {
    if (scrambleBusy || reducedMotion) return;
    scrambleBusy = true;
    const nodes = [];
    slEls[idx].childNodes.forEach(n => {
      if (n.nodeType === 3 && n.textContent.trim()) nodes.push({ n, orig: n.textContent });
    });
    const t0 = performance.now();
    const DUR = 620;
    (function tick() {
      const k = (performance.now() - t0) / DUR;
      nodes.forEach(({ n, orig }) => {
        let out = '';
        for (let i = 0; i < orig.length; i++) {
          const ch = orig[i];
          out += (ch === ' ' || k >= (i + 1) / (orig.length + 1))
            ? ch
            : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
        }
        n.textContent = out;
      });
      if (k < 1) {
        requestAnimationFrame(tick);
      } else {
        nodes.forEach(({ n, orig }) => { n.textContent = orig; });
        scrambleBusy = false;
      }
    })();
  }

  function bloomLine(idx) {
    if (reducedMotion) return;
    slEls[idx].querySelectorAll('.tw').forEach((tw, i) => {
      setTimeout(() => tw.classList.add('on'), i * 140);
      setTimeout(() => tw.classList.remove('on'), 1500 + i * 140);
    });
  }

  window.addEventListener('mousemove', e => {
    if (reducedMotion || !body.hasAttribute('data-revealed')) return;
    if (rawP > 0.02) { mouseYT = 0; return; }
    const vh = window.innerHeight;
    const by = (e.clientY - vh / 2) / u(); // cursor in board units, center-rel
    const zone = by < -46 ? 0 : by < 26 ? 1 : 2;
    mouseYT = CAPTURE_OFFSETS[zone];
    if (zone !== captured) {
      captured = zone;
      setVlineTargets(zone);
      scrambleLine(zone);
      bloomLine(zone);
    }
  }, { passive: true });

  // ------------------------------------------------------------------
  // SECTION 3 (157:1192 frame 3): the film screen lifts away (curtain
  // via the negative margin under the higher-z stage) onto a white
  // canvas. The 56px text is pinned mid-screen and reads itself in
  // word by word while 272×245 cards scroll past in two columns.
  // ------------------------------------------------------------------
  const s3 = document.getElementById('s3');
  const s3Read = document.getElementById('s3Read');
  const s3CardsBox = document.getElementById('s3Cards');
  let s3Raw = 0;
  let s3Smooth = 0;
  let s3Words = [];
  let s3LitCount = -1;

  // (x, y) card anchors on the 4939-tall canvas — two loose columns
  const S3_CARDS = [
    { x: 40, y: -41 }, { x: 1128, y: 625 },
    { x: 40, y: 870 }, { x: 1128, y: 1536 },
    { x: 40, y: 1781 }, { x: 1128, y: 2447 },
    { x: 40, y: 2861 }, { x: 1128, y: 3527 },
  ];
  const S3_IMGS = ['assets/card1.jpg', 'assets/card2.jpg', 'assets/card3.jpg'];

  if (s3) {
    S3_CARDS.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 's3card';
      el.style.setProperty('--x', c.x);
      el.style.setProperty('--y', c.y);
      const im = document.createElement('img');
      im.src = S3_IMGS[i % S3_IMGS.length];
      im.alt = '';
      im.draggable = false;
      el.appendChild(im);
      s3CardsBox.appendChild(el);
      c.el = el;
    });
    const words = s3Read.textContent.trim().split(/\s+/);
    s3Read.textContent = '';
    words.forEach((word, i) => {
      const sp = document.createElement('span');
      sp.className = 's3w';
      sp.textContent = word;
      s3Read.appendChild(sp);
      if (i < words.length - 1) s3Read.appendChild(document.createTextNode(' '));
      s3Words.push(sp);
    });
  }

  function applyS3(q) {
    if (!s3) return;
    const vh = window.innerHeight;

    // the curtain reveal is the scroll window [s3top, s3top + vh]: the
    // stage screen (stacked above) slides up while s3's own pin holds.
    // Counter the document scroll exactly (raw scrollY, no smoothing)
    // so nothing inside moves until the film screen is fully gone;
    // after that the offset caps at vh and the cards ride the scroll.
    const sTop = s3.offsetTop;
    const reveal = Math.max(0, Math.min(vh, window.scrollY - sTop));
    const rv = vh > 0 ? reveal / vh : 1;
    s3CardsBox.style.transform = `translateY(${reveal.toFixed(1)}px)`;

    // entrance: text + cards arrive out of a blur as the film lifts
    const bl = 16 * (1 - smooth01(clamp01((rv - 0.15) / 0.75)));
    const blCss = bl > 0.15 ? `blur(${(bl * u()).toFixed(1)}px)` : '';
    s3Read.style.filter = blCss;
    s3CardsBox.style.filter = blCss;

    // cards grow as they come into view (centerY is their true viewport
    // position — constant during the reveal, so the scale holds too)
    const px = u();
    S3_CARDS.forEach(c => {
      const centerY = sTop + c.y * px + (245 * px) / 2 + reveal - window.scrollY;
      const tIn = clamp01((vh * 1.15 - centerY) / (vh * 0.85));
      c.el.style.transform = `scale(${(0.72 + 0.28 * Math.min(1, tIn)).toFixed(3)})`;
    });

    // reading effect: starts only once the film screen is fully gone
    // (q past the reveal window), words lighting from 20% black to
    // black as you scroll
    const total = s3.offsetHeight - vh;
    const revealFrac = total > 0 ? Math.min(0.9, vh / total) : 0.2;
    const qq = range(q, revealFrac, 1);
    const lit = Math.round(range(qq, 0.02, 0.8) * s3Words.length);
    if (lit !== s3LitCount) {
      s3Words.forEach((w, i) => w.classList.toggle('lit', i < lit));
      s3LitCount = lit;
    }
  }

  // ------------------------------------------------------------------
  // benefits state machine: hidden in the hero ↔ steps 0..2
  // ------------------------------------------------------------------
  let benefitState = 'hero';
  let swapLock = 0;

  function setBenefitDesc(state) {
    if (state === 'hero') {
      benefitDesc.classList.remove('show');
      benefitDesc.classList.add('hide');
      return;
    }
    const swapIn = () => {
      benefitDesc.textContent = STEPS[state].desc;
      benefitDesc.classList.remove('hide');
      benefitDesc.classList.add('show');
    };
    if (benefitDesc.classList.contains('show')) {
      benefitDesc.classList.remove('show');
      benefitDesc.classList.add('hide');
      const token = swapLock;
      setTimeout(() => { if (token === swapLock) swapIn(); }, reducedMotion ? 0 : 300);
    } else {
      swapIn();
    }
  }

  function applyBenefitTitle(state) {
    setWords(benefitTitle, STEPS[state].title);
    // the Figma title box is wider than its glyphs; the desc right-aligns
    // to the box edge, so it reaches a little past the title text
    benefitTitle.style.minWidth = `calc(${STEPS[state].titleW} * var(--u))`;
    requestAnimationFrame(() => requestAnimationFrame(() => wordsIn(benefitTitle)));
  }

  function transitionBenefits(next) {
    if (next === benefitState) return;
    const prev = benefitState;
    benefitState = next;
    const token = ++swapLock;

    // the bright bar grows along the sunken hero line (80/811/1314 of 1440)
    progressBar.style.width = next === 'hero' ? '0' : `${(STEPS[next].bar * 100).toFixed(2)}%`;

    if (next === 'hero') {
      benefitsHead.classList.remove('show');
      filmLabels.classList.remove('show');
      setBenefitDesc('hero');
      return;
    }
    if (prev === 'hero' || reducedMotion) {
      applyBenefitTitle(next);
      benefitsHead.classList.add('show');
      filmLabels.classList.add('show');
      setBenefitDesc(next);
      return;
    }
    // step → step: masked word swap
    wordsOut(benefitTitle);
    setTimeout(() => { if (token === swapLock) applyBenefitTitle(next); }, 380);
    setBenefitDesc(next);
  }

  // ------------------------------------------------------------------
  // scroll engine
  // ------------------------------------------------------------------
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const range = (p, a, b) => clamp01((p - a) / (b - a));

  let rawP = 0;      // real scroll progress
  let smoothP = 0;   // inertia-smoothed progress driving every effect
  let scrubPos = 0;
  let shownFrame = 0;
  let ambientT = 0;
  let rewinding = false;
  let ambientOn = false; // playback starts as the loader window opens
  let heroVOut = 0;      // veil-out progress, shared with the blur lerp
  let blurNow = 0;       // current hero blur, eased toward its target
  let mouseYT = 0;       // cursor-follow target for the hairlines (u units)
  let mouseShift = 0;    // eased cursor-follow offset

  function onScroll() {
    const vh = window.innerHeight;
    const total = stage.offsetHeight - vh;
    rawP = total > 0 ? clamp01(window.scrollY / total) : 0;
    if (s3) {
      const s3Total = s3.offsetHeight - vh;
      s3Raw = s3Total > 0 ? clamp01((window.scrollY - s3.offsetTop) / s3Total) : 0;
    }
  }

  // hero geometry on the 800-tall board (all relative to center 400):
  // title line boxes L1 282–354, L2 354–426, HOME 426–498;
  // the top hairline starts at HOME's cap (436), the bottom at 492
  const smooth01 = q => q * q * (3 - 2 * q);

  // all scroll-driven effects run off the smoothed progress
  function applyScroll(p) {
    // scrub position 0..1 across the film (starts after the hero leaves)
    scrubPos = range(p, SCRUB_IN, SCRUB_OUT);

    const t = range(p, HERO_OUT[0], HERO_OUT[1]);
    body.toggleAttribute('data-scrolling', p > 0.001);

    // ---- 1. the top hairline travels up, wiping the title as it goes:
    // each line it crosses disappears bottom-to-top under it, while
    // HOME dissolves top-to-bottom on its own ----
    const lineY = 436 - 184 * t; // 436 → 252 (past the title's top)
    hlineA.style.setProperty('--rise', (436 - lineY).toFixed(2));
    hlineA.style.opacity = String(Math.min(1, Math.max(0, (lineY - 262) / 30)));
    const my = (mouseShift * (1 - t)).toFixed(2);
    hlineA.style.setProperty('--my', my);
    hlineB.style.setProperty('--my', my);

    const cut2 = clamp01((426 - lineY) / 72); // THAT MAKES IT
    const cut1 = clamp01((354 - lineY) / 72); // THE ROOF
    slEls[1].style.clipPath = cut2 > 0 ? `inset(0 0 ${(cut2 * 100).toFixed(2)}% 0)` : '';
    slEls[0].style.clipPath = cut1 > 0 ? `inset(0 0 ${(cut1 * 100).toFixed(2)}% 0)` : '';
    const homeCut = clamp01((t - 0.05) / 0.85);
    slEls[2].style.clipPath = homeCut > 0 ? `inset(${(homeCut * 100).toFixed(2)}% 0 0 0)` : '';

    // ---- 2. the bottom hairline sinks from HOME's baseline (492) to
    // y664, where it stays as the film section's progress track ----
    const sink = 172 * smooth01(range(p, 0.02, 0.14));
    hlineB.style.setProperty('--sink', sink.toFixed(2));

    // ---- 3. plus markers ride their lines, spinning shut ----
    crossEls.forEach((el, i) => {
      const top = i < 2;
      el.style.setProperty('--dy', top ? (lineY - 436 + mouseShift * (1 - t)).toFixed(2) : (sink + mouseShift * (1 - t)).toFixed(2));
      el.style.transform = `translate(-50%, -50%) rotate(${(90 * t).toFixed(1)}deg) scale(${(1 - 0.5 * t).toFixed(3)})`;
      if (t > 0) el.style.opacity = (1 - t).toFixed(3);
    });

    // ---- 4. the rest of the hero copy dissolves ----
    const fade = (1 - t).toFixed(3);
    exploreEl.style.opacity = t > 0 ? fade : '';
    if (explore2El) explore2El.style.opacity = t > 0 ? fade : '';
    heroPara.style.opacity = t > 0 ? fade : '';
    vlineEls.forEach(el => { el.style.opacity = t > 0 ? fade : ''; });
    cta.style.opacity = fade;
    cta.style.visibility = t >= 1 ? 'hidden' : '';

    // ---- 5. the hero's 32px blur clears across this range (the film
    // stays at its 70%-over-black tone; the grain stays too) ----
    heroVOut = range(p, VEIL_OUT[0], VEIL_OUT[1]);

    // ---- benefits copy + progress bar ----
    const next = p < BENEFITS_AT ? 'hero'
      : scrubPos < STEP_BOUNDS[0] ? 0
      : scrubPos < STEP_BOUNDS[1] ? 1 : 2;
    transitionBenefits(next);
  }

  let lastT = performance.now();

  function rafLoop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;

    // smooth-scroll inertia: everything glides toward the real position
    smoothP += (rawP - smoothP) * (reducedMotion ? 1 : 0.11);
    if (Math.abs(rawP - smoothP) < 0.0004) smoothP = rawP;
    if (body.dataset.state !== 'loading') applyScroll(smoothP);

    // hero blur: fades in once the film fills the screen, plays blurred,
    // and clears with the veil as the user scrolls into the film section
    const blurTarget = body.hasAttribute('data-revealed') ? BLUR_MAX * (1 - heroVOut) : 0;
    blurNow += (blurTarget - blurNow) * (reducedMotion ? 1 : 0.05);
    if (Math.abs(blurTarget - blurNow) < 0.05) blurNow = blurTarget;
    canvas.style.filter = blurNow > 0.2 ? `blur(${(blurNow * u()).toFixed(1)}px)` : '';

    // particle hand-off rides the same smoothed progress
    if (body.dataset.state !== 'loading') fxDraw(smoothP, now);

    // hairlines lean toward the cursor; the vertical pair hugs the
    // captured line's width
    mouseShift += (mouseYT - mouseShift) * (reducedMotion ? 1 : 0.07);
    vxL += (vxLT - vxL) * (reducedMotion ? 1 : 0.07);
    vxR += (vxRT - vxR) * (reducedMotion ? 1 : 0.07);
    vlineEls[0].style.setProperty('--vx', vxL.toFixed(2));
    vlineEls[1].style.setProperty('--vx', vxR.toFixed(2));
    crossEls.forEach((el, i) => el.style.setProperty('--cx', (i % 2 === 0 ? vxL : vxR).toFixed(2)));

    // section 3 runs on its own smoothed progress
    s3Smooth += (s3Raw - s3Smooth) * (reducedMotion ? 1 : 0.11);
    if (Math.abs(s3Raw - s3Smooth) < 0.0004) s3Smooth = s3Raw;
    if (body.dataset.state !== 'loading') applyS3(s3Smooth);

    // frame target: the film plays at rest; scrolling triggers a fast
    // rewind to frame 1, after which the scroll scrub takes over
    let targetFrame;
    const ambient = ambientOn && rawP < AMBIENT_AT && !reducedMotion;
    if (ambient) {
      ambientT += dt;
      const playDur = (FRAME_COUNT - 1) / AMBIENT_FPS;
      const t = ambientT % (playDur + AMBIENT_REWIND_S);
      if (t < playDur) {
        targetFrame = t * AMBIENT_FPS;
      } else {
        const q = (t - playDur) / AMBIENT_REWIND_S;
        targetFrame = (FRAME_COUNT - 1) * (1 - q * q * (3 - 2 * q));
      }
      rewinding = true; // leaving ambient always opens with the fast rewind
    } else {
      ambientT = 0;
      targetFrame = scrubPos * (FRAME_COUNT - 1);
      if (rewinding && Math.abs(targetFrame - shownFrame) < 1) rewinding = false;
    }

    const k = reducedMotion ? 1 : ambient ? 1 : rewinding ? REWIND_K : 0.16;
    shownFrame += (targetFrame - shownFrame) * k;
    if (Math.abs(targetFrame - shownFrame) < 0.02) shownFrame = targetFrame;
    // quantize the fractional position so we only repaint on real change
    const key = Math.round(shownFrame * 64);
    if (key !== lastDrawn && body.dataset.state !== 'loading') {
      drawFrame(shownFrame);
      lastDrawn = key;
    }
    requestAnimationFrame(rafLoop);
  }

  // ------------------------------------------------------------------
  // boot
  // ------------------------------------------------------------------
  function onResize() {
    sizeCanvas();
    drawFrame(shownFrame);
    onScroll();
    applyScroll(smoothP);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  sizeCanvas();
  window.scrollTo(0, 0);
  document.fonts.ready.then(() => { buildParticles(); measureLineWidths(); });
  preloadAll();
  loaderTick();
  onScroll();
  requestAnimationFrame(rafLoop);
})();
