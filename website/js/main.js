/* ============================================================
   CEDUR — loader → hero reveal → scroll-scrubbed scene
   The second section scrubs a 169-frame sequence (the film) with
   the scroll position, while the copy swaps inside the frame —
   same mechanic as gru.space's "Lunar 1" section.
   ============================================================ */

(() => {
  'use strict';

  // ------------------------------------------------------------------
  // config
  // ------------------------------------------------------------------
  const FRAME_COUNT = 169;
  const FRAME_W = 1440;
  const FRAME_H = 800;
  const FRAME_PATH = i => `assets/frames/frame_${String(i + 1).padStart(3, '0')}.webp`;

  const MIN_LOADER_MS = 2600;   // loader lives at least this long
  const GATE_FRAMES = 42;       // frames that must be ready before reveal
  const SCRUB_IN = 0.05;        // scroll progress where the scrub starts
  const SCRUB_OUT = 0.96;       // scroll progress where frame 169 lands
  const HERO_EXIT = [0.0, 0.12];   // hero copy fades over this range
  const BENEFITS_IN = [0.14, 0.20]; // benefits copy fades in over this range

  // copy per step — verbatim from Figma (130:118 / 130:147 / 130:176)
  const STEPS = [
    {
      title: 'Made to weather the storm',
      desc: 'Exceptional impact resistance provides dependable protection against hail and severe weather, season after season.',
      width: 351,
    },
    {
      title: 'Standalone Class A Fire Rated',
      desc: 'Engineered for elevated fire protection, helping safeguard the home and everything beneath it when it matters most.',
      width: 351,
    },
    {
      title: 'Strength, thoughtfully engineered',
      desc: 'CEDUR delivers the depth and dimension of natural cedar in a lighter roofing system designed for easier installation and lasting structural confidence.',
      width: 420,
    },
  ];
  // step boundaries in scrub progress (0..1 across the scrub range)
  const STEP_BOUNDS = [0.38, 0.7];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------------
  // dom
  // ------------------------------------------------------------------
  const body = document.body;
  const loader = document.getElementById('loader');
  const loaderBand = document.getElementById('loaderBand');
  const loaderWindow = document.getElementById('loaderWindow');
  const tlHome = document.getElementById('tlHome');
  const stage = document.getElementById('stage');
  const hero = document.getElementById('hero');
  const cta = document.getElementById('cta');
  const benefits = document.getElementById('benefits');
  const benefitTitle = document.getElementById('benefitTitle');
  const benefitDesc = document.getElementById('benefitDesc');
  const benefitProgress = document.getElementById('benefitProgress');
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');

  const u = () => Math.max(window.innerWidth, 320) / (window.innerWidth <= 720 ? 720 : 1440);

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

  // nearest available frame at or below the requested index
  function nearestFrame(i) {
    i = Math.max(0, Math.min(FRAME_COUNT - 1, Math.round(i)));
    for (let j = i; j >= 0; j--) if (frames[j]) return frames[j];
    return null;
  }

  // ------------------------------------------------------------------
  // canvas
  // ------------------------------------------------------------------
  let lastDrawn = -1;

  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    lastDrawn = -1;
  }

  function drawFrame(index) {
    const img = nearestFrame(index);
    if (!img) return;
    const cw = canvas.width, ch = canvas.height;
    // cover-fit the 1440×800 design crop
    const s = Math.max(cw / FRAME_W, ch / FRAME_H);
    const dw = FRAME_W * s, dh = FRAME_H * s;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
  }

  // ------------------------------------------------------------------
  // loader timeline
  // ------------------------------------------------------------------
  const t0 = performance.now();

  function loaderTick() {
    if (body.dataset.state !== 'loading') return;
    // "home" brightens with real load progress (0.2 → 1 alpha)
    const p = loadedCount / FRAME_COUNT;
    tlHome.style.color = `rgba(255,255,255,${(0.2 + 0.8 * p).toFixed(3)})`;
    const ready = loadedCount >= GATE_FRAMES && performance.now() - t0 >= (reducedMotion ? 400 : MIN_LOADER_MS);
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
      const px = u();
      const openFrom = `inset(calc(100% - ${100 * px}px) calc(50% - ${50 * px}px) 0px calc(50% - ${50 * px}px))`;
      const win = loaderWindow.animate(
        [{ clipPath: openFrom }, { clipPath: 'inset(0px 0px 0px 0px)' }],
        { duration: reducedMotion ? 1 : 1100, easing: 'cubic-bezier(0.76,0,0.24,1)', fill: 'forwards' }
      );
      win.onfinish = () => {
        drawFrame(0);
        body.dataset.state = 'revealed';
        body.setAttribute('data-revealed', '');
        // drop the loader after the hero reveal transitions have played
        setTimeout(() => { body.dataset.state = 'done-loading'; }, reducedMotion ? 50 : 1600);
      };
    };
  }

  // ------------------------------------------------------------------
  // benefits text swapping
  // ------------------------------------------------------------------
  let currentStep = -1;
  let swapLock = 0;

  function setStepText(i) {
    benefitTitle.querySelector('.reveal').textContent = STEPS[i].title;
    benefitDesc.querySelector('.reveal').textContent = STEPS[i].desc;
    benefitTitle.style.maxWidth = `calc(${STEPS[i].width} * var(--u))`;
  }

  function swapStep(next) {
    if (next === currentStep) return;
    const first = currentStep === -1;
    currentStep = next;
    const token = ++swapLock;

    if (first || reducedMotion) {
      setStepText(next);
      benefits.classList.remove('swap-out', 'swap-prep');
      benefits.classList.add('swap-in');
      return;
    }

    benefits.classList.remove('swap-in');
    benefits.classList.add('swap-out');
    setTimeout(() => {
      if (token !== swapLock) return;
      setStepText(next);
      benefits.classList.remove('swap-out');
      benefits.classList.add('swap-prep');
      void benefits.offsetWidth; // reflow to commit the prep position
      benefits.classList.remove('swap-prep');
      benefits.classList.add('swap-in');
    }, 380);
  }

  // ------------------------------------------------------------------
  // scroll engine
  // ------------------------------------------------------------------
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const range = (p, a, b) => clamp01((p - a) / (b - a));

  let targetFrame = 0;
  let shownFrame = 0;

  function onScroll() {
    const vh = window.innerHeight;
    const total = stage.offsetHeight - vh;
    const p = total > 0 ? clamp01(window.scrollY / total) : 0;

    // scrub position 0..1 across the film
    const scrub = range(p, SCRUB_IN, SCRUB_OUT);
    targetFrame = scrub * (FRAME_COUNT - 1);

    // hero copy exits as we take off
    const heroOut = range(p, HERO_EXIT[0], HERO_EXIT[1]);
    const heroOpacity = 1 - heroOut;
    hero.style.opacity = heroOpacity.toFixed(3);
    hero.style.transform = `translateY(${(-40 * heroOut).toFixed(1)}px)`;
    cta.style.opacity = heroOpacity.toFixed(3);
    hero.style.visibility = heroOpacity <= 0 ? 'hidden' : '';
    cta.style.visibility = heroOpacity <= 0 ? 'hidden' : '';

    // benefits copy fades in and swaps per step
    const bIn = range(p, BENEFITS_IN[0], BENEFITS_IN[1]);
    benefits.style.opacity = bIn.toFixed(3);
    if (bIn > 0) {
      const step = scrub < STEP_BOUNDS[0] ? 0 : scrub < STEP_BOUNDS[1] ? 1 : 2;
      swapStep(step);
      // progress line: 243 → 720 → 1360 across the section (continuous)
      benefitProgress.style.transform = `scaleX(${range(p, BENEFITS_IN[0], SCRUB_OUT).toFixed(4)})`;
    }
  }

  function rafLoop() {
    // ease the shown frame toward the target for a fluid scrub
    const k = reducedMotion ? 1 : 0.16;
    shownFrame += (targetFrame - shownFrame) * k;
    if (Math.abs(targetFrame - shownFrame) < 0.02) shownFrame = targetFrame;
    const idx = Math.round(shownFrame);
    if (idx !== lastDrawn && body.dataset.state !== 'loading') {
      drawFrame(idx);
      lastDrawn = idx;
    }
    requestAnimationFrame(rafLoop);
  }

  // ------------------------------------------------------------------
  // boot
  // ------------------------------------------------------------------
  function onResize() {
    sizeCanvas();
    drawFrame(Math.round(shownFrame));
    onScroll();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  sizeCanvas();
  window.scrollTo(0, 0);
  requestAnimationFrame(() => loader.setAttribute('data-in', ''));
  preloadAll();
  loaderTick();
  onScroll();
  rafLoop();
})();
