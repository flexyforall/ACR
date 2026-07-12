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
  const VEIL_MAX = 1;             // hero veil opacity multiplier

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
  const veil = document.getElementById('veil');
  const cta = document.getElementById('cta');
  const benefitsHead = document.getElementById('benefitsHead');
  const benefitTitle = document.getElementById('benefitTitle');
  const benefitDesc = document.getElementById('benefitDesc');
  const progressBar = document.getElementById('progressBar');
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');

  // hero pieces choreographed individually during the scroll transition
  const hlineA = document.querySelector('.hline--a');
  const hlineB = document.querySelector('.hline--b');
  const vlineEls = Array.from(document.querySelectorAll('.vline'));
  const crossEls = Array.from(document.querySelectorAll('.cross'));
  const exploreEl = document.getElementById('explore');
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
        setTimeout(startSquareLoop, reducedMotion ? 0 : 3200);
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
  // title squares: product previews bloom open between the title words
  // (after THE / THAT / MAKES), hold, close, then the next one — looped
  // ------------------------------------------------------------------
  const titleSquares = Array.from(document.querySelectorAll('.slogan .tw'));

  function startSquareLoop() {
    if (reducedMotion || !titleSquares.length) return;
    let i = 0;
    (function cycle() {
      if (rawP > 0.02) { setTimeout(cycle, 900); return; } // wait out the film
      const el = titleSquares[i];
      el.classList.add('on');
      setTimeout(() => {
        el.classList.remove('on');
        i = (i + 1) % titleSquares.length;
        setTimeout(cycle, 1000); // let the slot close before the next opens
      }, 2100);                  // hold open
    })();
  }

  // ------------------------------------------------------------------
  // SECTION 3 (101:648) — floating cards + reading text on white; the
  // room then darkens, the last card docks, the point copy appears.
  // The section slides beneath the stage, so the film screen lifts off
  // it like a curtain; local progress q covers that reveal too.
  // ------------------------------------------------------------------
  const s3 = document.getElementById('s3');
  const s3World = document.getElementById('s3World');
  const s3CardsBox = document.getElementById('s3Cards');
  const s3Read = document.getElementById('s3Read');
  const s3Dark = document.getElementById('s3Dark');
  const s3Hero = document.getElementById('s3Hero');
  const s3Final = document.getElementById('s3Final');
  const s3Line = s3Final ? s3Final.querySelector('.s3__line') : null;
  let s3Raw = 0;
  let s3Smooth = 0;

  const S3_REVEAL = 0.2;        // first fifth of the section = curtain reveal
  const S3_TRAVEL = 1800;       // card scroll distance in board units
  const S3_FIX_AT = 0.55;       // the last two cards stop here
  // (x, y at q=0, w, h, parallax speed, image) — two loose columns
  const S3_CARDS = [
    { x: 40,   y0: 830,  w: 220, h: 198, sp: 1.0,  img: 'assets/card2.jpg' },
    { x: 1030, y0: 420,  w: 370, h: 333, sp: 0.9,  img: 'assets/card1.jpg' },
    { x: 1220, y0: 900,  w: 180, h: 162, sp: 0.85, img: 'assets/card3.jpg' },
    { x: 40,   y0: 1750, w: 322, h: 290, sp: 1.15, img: 'assets/card3.jpg' },
    { x: 1078, y0: 2100, w: 322, h: 290, sp: 1.05, img: 'assets/card2.jpg' },
    // the top-left card: rides up, fixes at y40, then exits upward
    { x: 40,   y0: 1030, w: 241, h: 217, sp: 1.0,  img: 'assets/card1.jpg', tl: true },
  ];
  // the docking card: rides the right column, fixes at (1078, 470),
  // then morphs to the finale slot (295, 200, 552×480 — 100:592)
  const S3_HERO = { x: 1078, y0: 1262, w: 322, h: 290, sp: 0.8, to: { x: 295, y: 200, w: 552, h: 480 } };

  let s3Words = [];
  let s3LitCount = -1;

  if (s3) {
    S3_CARDS.forEach(c => {
      const el = document.createElement('div');
      el.className = 's3card';
      el.style.setProperty('--x', c.x);
      el.style.setProperty('--w', c.w);
      el.style.setProperty('--h', c.h);
      const im = document.createElement('img');
      im.src = c.img;
      im.alt = '';
      im.draggable = false;
      el.appendChild(im);
      s3CardsBox.appendChild(el);
      c.el = el;
    });
    // wrap each word of the reading text for the digitalflagship-style
    // light-up-as-you-scroll effect
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
    const px = u();
    const boardY = y => vh / 2 + (y - 400) * px; // board coord → viewport px
    const v = clamp01(q / S3_REVEAL);            // curtain-reveal progress
    const qq = range(q, S3_REVEAL, 1);           // in-section progress

    // ---- entrance: the whole world arrives out of a blur ----
    const bl = 18 * (1 - smooth01(clamp01((v - 0.3) / 0.7)));
    const blCss = bl > 0.15 ? `blur(${(bl * px).toFixed(1)}px)` : '';
    s3World.style.filter = blCss;
    s3Hero.style.filter = blCss;

    // ---- reading effect: words light up as the scroll passes ----
    const lit = Math.round(range(qq, 0.06, 0.5) * s3Words.length);
    if (lit !== s3LitCount) {
      s3Words.forEach((w, i) => w.classList.toggle('lit', i < lit));
      s3LitCount = lit;
    }
    s3Read.style.opacity = (1 - range(qq, 0.56, 0.64)).toFixed(3);

    // ---- cards ride up; the TL card fixes, then exits ----
    S3_CARDS.forEach(c => {
      let y = c.y0 - S3_TRAVEL * c.sp * (c.tl ? Math.min(qq, S3_FIX_AT) : qq);
      if (c.tl) y -= 1600 * smooth01(range(qq, 0.62, 0.74)); // the exit
      c.el.style.transform = `translate3d(0, ${boardY(y).toFixed(1)}px, 0)`;
    });

    // ---- the docking card: column → fix → morph to the finale slot ----
    const hColY = S3_HERO.y0 - S3_TRAVEL * S3_HERO.sp * Math.min(qq, S3_FIX_AT);
    const m = smooth01(range(qq, 0.62, 0.78));
    const hx = S3_HERO.x + (S3_HERO.to.x - S3_HERO.x) * m;
    const hy = hColY + (S3_HERO.to.y - hColY) * m;
    const hw = S3_HERO.w + (S3_HERO.to.w - S3_HERO.w) * m;
    const hh = S3_HERO.h + (S3_HERO.to.h - S3_HERO.h) * m;
    s3Hero.style.left = (hx * px).toFixed(1) + 'px';
    s3Hero.style.width = (hw * px).toFixed(1) + 'px';
    s3Hero.style.height = (hh * px).toFixed(1) + 'px';
    s3Hero.style.transform = `translate3d(0, ${boardY(hy).toFixed(1)}px, 0)`;

    // ---- the room darkens, then the point copy appears (101:747) ----
    s3Dark.style.opacity = range(qq, 0.6, 0.78).toFixed(3);
    const fIn = smooth01(range(qq, 0.8, 0.92));
    s3Final.style.opacity = fIn.toFixed(3);
    s3Final.style.transform = `translateY(${(24 * (1 - fIn)).toFixed(1)}px)`;
    if (s3Line) s3Line.style.transform = `scaleX(${fIn.toFixed(3)})`;
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
      setBenefitDesc('hero');
      return;
    }
    if (prev === 'hero' || reducedMotion) {
      applyBenefitTitle(next);
      benefitsHead.classList.add('show');
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
  // title line boxes L1 292–364, L2 364–436, HOME 436–508;
  // the top hairline starts at HOME's cap (444), the bottom at 499
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
    const lineY = 444 - 184 * t; // 444 → 260 (past the title's top)
    hlineA.style.setProperty('--rise', (444 - lineY).toFixed(2));
    hlineA.style.opacity = String(Math.min(1, Math.max(0, (lineY - 270) / 30)));

    const cut2 = clamp01((436 - lineY) / 72); // THAT MAKES IT
    const cut1 = clamp01((364 - lineY) / 72); // THE ROOF
    slEls[1].style.clipPath = cut2 > 0 ? `inset(0 0 ${(cut2 * 100).toFixed(2)}% 0)` : '';
    slEls[0].style.clipPath = cut1 > 0 ? `inset(0 0 ${(cut1 * 100).toFixed(2)}% 0)` : '';
    const homeCut = clamp01((t - 0.05) / 0.85);
    slEls[2].style.clipPath = homeCut > 0 ? `inset(${(homeCut * 100).toFixed(2)}% 0 0 0)` : '';

    // ---- 2. the bottom hairline sinks from HOME's baseline (502) to
    // y547, where it stays as the film section's progress track ----
    const sink = 45 * smooth01(range(p, 0.02, 0.14));
    hlineB.style.setProperty('--sink', sink.toFixed(2));

    // ---- 3. plus markers ride their lines, spinning shut ----
    crossEls.forEach((el, i) => {
      const top = i < 2;
      el.style.setProperty('--dy', top ? (lineY - 444).toFixed(2) : sink.toFixed(2));
      el.style.transform = `translate(-50%, -50%) rotate(${(90 * t).toFixed(1)}deg) scale(${(1 - 0.5 * t).toFixed(3)})`;
      if (t > 0) el.style.opacity = (1 - t).toFixed(3);
    });

    // ---- 4. the rest of the hero copy dissolves ----
    const fade = (1 - t).toFixed(3);
    exploreEl.style.opacity = t > 0 ? fade : '';
    heroPara.style.opacity = t > 0 ? fade : '';
    vlineEls.forEach(el => { el.style.opacity = t > 0 ? fade : ''; });
    cta.style.opacity = fade;
    cta.style.visibility = t >= 1 ? 'hidden' : '';

    // ---- 5. the top gradient fades; the film stays at its 70%-over-
    // black tone (hero and film section alike); the grain stays too.
    // The hero's 32px blur also clears across this range ----
    const vOut = range(p, VEIL_OUT[0], VEIL_OUT[1]);
    veil.style.opacity = (VEIL_MAX * (1 - vOut)).toFixed(3);
    heroVOut = vOut;

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

    // section 3 runs on its own smoothed progress
    s3Smooth += (s3Raw - s3Smooth) * (reducedMotion ? 1 : 0.11);
    if (Math.abs(s3Raw - s3Smooth) < 0.0004) s3Smooth = s3Raw;
    if (body.dataset.state !== 'loading') applyS3(s3Smooth);

    // hero blur: fades in once the film fills the screen, plays blurred,
    // and clears with the veil as the user scrolls into the film section
    const blurTarget = body.hasAttribute('data-revealed') ? BLUR_MAX * (1 - heroVOut) : 0;
    blurNow += (blurTarget - blurNow) * (reducedMotion ? 1 : 0.05);
    if (Math.abs(blurTarget - blurNow) < 0.05) blurNow = blurTarget;
    canvas.style.filter = blurNow > 0.2 ? `blur(${(blurNow * u()).toFixed(1)}px)` : '';

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
  preloadAll();
  loaderTick();
  onScroll();
  requestAnimationFrame(rafLoop);
})();
