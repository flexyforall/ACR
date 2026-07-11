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
        setTimeout(startTypeLoop, reducedMotion ? 0 : 1200);
      };
    };
  }

  // ------------------------------------------------------------------
  // typed labels: the /welcome sides and the keep-scrolling line type
  // out letter by letter, delete the same way, and loop — one shared
  // cursor keeps them in sync (shorter labels finish early and hold)
  // ------------------------------------------------------------------
  const typeEls = Array.from(document.querySelectorAll('.explore__side, .explore__center'))
    .map(el => ({ el, text: el.textContent }));
  const typeMax = Math.max(0, ...typeEls.map(t => t.text.length));

  function startTypeLoop() {
    if (reducedMotion || !typeEls.length) return;
    let n = typeMax; // labels fade in complete, then the loop begins
    let dir = -1;
    function tick() {
      n += dir;
      typeEls.forEach(t => { t.el.textContent = t.text.slice(0, n); });
      let delay;
      if (dir > 0 && n >= typeMax) { dir = -1; delay = 2400; } // hold typed
      else if (dir < 0 && n <= 0) { dir = 1; delay = 900; }    // hold empty
      else delay = dir > 0 ? 120 : 60;                         // type / delete
      setTimeout(tick, delay);
    }
    setTimeout(tick, 2400);
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
  let rewinding = false;

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

    // ---- 1. the hero copy dissolves ----
    const hOut = range(p, HERO_OUT[0], HERO_OUT[1]);
    hero2.style.opacity = (1 - hOut).toFixed(3);
    hero2.style.transform = `translateY(${(-24 * hOut).toFixed(1)}px)`;
    hero2.style.visibility = hOut >= 1 ? 'hidden' : '';

    // ---- 2. the top gradient fades; the grain overlay stays ----
    const vOut = range(p, VEIL_OUT[0], VEIL_OUT[1]);
    veil.style.opacity = (VEIL_MAX * (1 - vOut)).toFixed(3);

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

    // smooth-scroll inertia: everything glides toward the real position
    smoothP += (rawP - smoothP) * (reducedMotion ? 1 : 0.11);
    if (Math.abs(rawP - smoothP) < 0.0004) smoothP = rawP;
    if (body.dataset.state !== 'loading') applyScroll(smoothP);

    // frame target: the film plays at rest; scrolling triggers a fast
    // rewind to frame 1, after which the scroll scrub takes over
    let targetFrame;
    const ambient = body.hasAttribute('data-revealed') && rawP < AMBIENT_AT && !reducedMotion;
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
  preloadAll();
  loaderTick();
  onScroll();
  requestAnimationFrame(rafLoop);
})();
