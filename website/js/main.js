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
  const SCRUB_IN = 0.30;        // the scrub starts once the blur has cleared
  const SCRUB_OUT = 0.96;       // scroll progress where frame 169 lands

  // scroll sequence (smooth, staggered so each stage finishes before the
  // next starts): building parallaxes down & out → hero copy fades → the
  // dark veil + blur clear, revealing the film from its first frame.
  const BUILD_OUT = [0.0, 0.10];  // building parallax down + fade
  const BUILD_PARALLAX = 52;      // vh the building travels down, in %
  const HERO_OUT = [0.09, 0.17];  // remaining hero copy dissolves
  const VEIL_OUT = [0.17, 0.30];  // dark veil + blur clear last
  const BENEFITS_AT = 0.30;       // benefits copy takes over from here
  const VEIL_MAX = 1;             // hero veil opacity multiplier
  const BLUR_MAX = 60;            // scene blur while in the hero (px @1440)

  // ambient: while resting in the hero the blurred film plays in a slow
  // ping-pong loop so the background light shifts; scrolling glides it
  // back to frame 1 before the film section takes over
  const AMBIENT_FPS = 14;
  const AMBIENT_AT = 0.02;        // ambient runs below this progress

  // loader sequence: phrases lit one at a time (previous dims back)
  const LOADER_STEP_T = [1350, 1950, 2550];
  const LOADER_MIN_MS = 3250;

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
  const building = document.getElementById('building');
  const cta = document.getElementById('cta');
  const benefitsHead = document.getElementById('benefitsHead');
  const benefitTitle = document.getElementById('benefitTitle');
  const benefitsBand = document.getElementById('benefitsBand');
  const benefitDesc = document.getElementById('benefitDesc');
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');

  const seqEls = [
    document.getElementById('tlLeft'),
    document.getElementById('tlRight'),
    document.getElementById('tlHome'),
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
    const s = Math.max(cw / FRAME_W, ch / FRAME_H);
    const dw = FRAME_W * s, dh = FRAME_H * s;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
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
      const px = u();
      const openFrom = `inset(calc(100% - ${100 * px}px) calc(50% - ${50 * px}px) 0px calc(50% - ${50 * px}px))`;
      const win = loaderWindow.animate(
        [{ clipPath: openFrom }, { clipPath: 'inset(0px 0px 0px 0px)' }],
        { duration: reducedMotion ? 1 : 1100, easing: 'cubic-bezier(0.76,0,0.24,1)', fill: 'forwards' }
      );
      win.onfinish = () => {
        // the canvas behind carries the same blurred/veiled scene, so the
        // loader can drop immediately and the hero reveals play visibly
        drawFrame(0);
        body.dataset.state = 'done-loading';
        body.setAttribute('data-revealed', '');
        // the slogan fill-sweep and the rest run off [data-revealed];
        // the ambient background loop starts on its own in the raf loop
      };
    };
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
    requestAnimationFrame(() => requestAnimationFrame(() => wordsIn(benefitTitle)));
  }

  function transitionBenefits(next) {
    if (next === benefitState) return;
    const prev = benefitState;
    benefitState = next;
    const token = ++swapLock;

    if (next === 'hero') {
      benefitsHead.classList.remove('show');
      benefitsBand.classList.remove('show');
      setBenefitDesc('hero');
      return;
    }
    if (prev === 'hero' || reducedMotion) {
      applyBenefitTitle(next);
      benefitsHead.classList.add('show');
      benefitsBand.classList.add('show');
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
  let idleYaw = 0;   // gentle autonomous sway of the building at rest
  let idlePitch = 0;

  function onScroll() {
    const vh = window.innerHeight;
    const total = stage.offsetHeight - vh;
    rawP = total > 0 ? clamp01(window.scrollY / total) : 0;
  }

  // all scroll-driven effects run off the smoothed progress
  function applyScroll(p) {
    const vh = window.innerHeight;

    // scrub position 0..1 across the film (starts after the unblur)
    scrubPos = range(p, SCRUB_IN, SCRUB_OUT);

    // ---- 1. the building rotates a touch, then parallaxes DOWN and out ----
    const bOut = range(p, BUILD_OUT[0], BUILD_OUT[1]);
    building.style.setProperty('--par', `${(BUILD_PARALLAX * bOut * vh / 100).toFixed(1)}px`);
    building.style.setProperty('--bfade', (1 - bOut).toFixed(3));
    building.style.visibility = bOut >= 1 ? 'hidden' : '';
    // rotation: idle sway at rest + up to ~7° of yaw as it leaves
    const yaw = idleYaw + 7 * bOut;
    const pitch = idlePitch + 2.2 * bOut;
    building.style.setProperty('--ry', `${yaw.toFixed(2)}deg`);
    building.style.setProperty('--rx', `${(-pitch).toFixed(2)}deg`);
    if (window.__houseTilt) window.__houseTilt(yaw * 0.028, pitch * 0.02);

    // ---- 2. then the remaining hero copy dissolves ----
    const hOut = range(p, HERO_OUT[0], HERO_OUT[1]);
    hero2.style.opacity = (1 - hOut).toFixed(3);
    hero2.style.transform = `translateY(${(-24 * hOut).toFixed(1)}px)`;
    hero2.style.visibility = hOut >= 1 ? 'hidden' : '';

    // ---- 3. finally the veil + blur clear, the film comes alive ----
    const vOut = range(p, VEIL_OUT[0], VEIL_OUT[1]);
    veil.style.opacity = (VEIL_MAX * (1 - vOut)).toFixed(3);
    const blur = BLUR_MAX * (1 - vOut) * u();
    canvas.style.filter = blur > 0.4 ? `blur(${blur.toFixed(1)}px)` : '';
    canvas.style.transform = vOut < 1 ? `scale(${(1 + 0.06 * (1 - vOut)).toFixed(4)})` : '';

    // ---- benefits copy ----
    const next = p < BENEFITS_AT ? 'hero'
      : scrubPos < STEP_BOUNDS[0] ? 0
      : scrubPos < STEP_BOUNDS[1] ? 1 : 2;
    transitionBenefits(next);
  }

  let lastT = performance.now();

  function rafLoop(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
    lastT = now;

    // gentle building sway while resting in the hero
    if (!reducedMotion) {
      const t = now / 1000;
      const rest = clamp01(1 - rawP / AMBIENT_AT);
      idleYaw = Math.sin(t * 0.5) * 1.1 * rest;
      idlePitch = Math.cos(t * 0.37) * 0.5 * rest;
    }

    // smooth-scroll inertia: everything glides toward the real position
    smoothP += (rawP - smoothP) * (reducedMotion ? 1 : 0.11);
    if (Math.abs(rawP - smoothP) < 0.0004) smoothP = rawP;
    if (body.dataset.state !== 'loading') applyScroll(smoothP);

    // frame target: ambient ping-pong at rest, back to frame 1 on scroll
    let targetFrame;
    const ambient = body.hasAttribute('data-revealed') && rawP < AMBIENT_AT && !reducedMotion;
    if (ambient) {
      ambientT += dt * AMBIENT_FPS;
      const cycle = ambientT % (2 * (FRAME_COUNT - 1));
      targetFrame = cycle <= FRAME_COUNT - 1 ? cycle : 2 * (FRAME_COUNT - 1) - cycle;
    } else {
      ambientT = 0;
      targetFrame = scrubPos * (FRAME_COUNT - 1);
    }

    const k = reducedMotion ? 1 : (ambient ? 1 : 0.16);
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
    applyScroll(smoothP);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);

  sizeCanvas();
  window.scrollTo(0, 0);
  loaderWindow.querySelector('img').src = FRAME_PATH(0);
  if (HIRES) document.getElementById('buildingImg').src = 'assets/house2x.webp';
  preloadAll();
  loaderTick();
  onScroll();
  requestAnimationFrame(rafLoop);
})();
