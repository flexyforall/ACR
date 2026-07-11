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
  const SCRUB_IN = 0.05;        // scroll progress where the scrub starts
  const SCRUB_OUT = 0.96;       // scroll progress where frame 169 lands

  const HERO_OUT = [0.0, 0.09];   // hero UI dissolves over this range
  const VEIL_OUT = [0.02, 0.14];  // dark veil + blur clear over this range
  const BENEFITS_AT = 0.14;       // benefits copy takes over from here
  const BLUR_MAX = 25;            // design blur, in 1440-board px (130:355)
  const SCALE_MAX = 1.17;         // blurred scene overscan (936/800)

  // loader sequence: phrases lit one at a time (previous dims back)
  const LOADER_STEP_T = [1350, 1950, 2550];
  const LOADER_MIN_MS = 3250;

  // hero intro: the film nudges forward this many frames right after the
  // loader — a small push toward the house — then waits for the scroll
  const INTRO_FRAMES = 14;

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
  const slogan = document.getElementById('slogan');
  const benefitsHead = document.getElementById('benefitsHead');
  const benefitTitle = document.getElementById('benefitTitle');
  const ruleProgress = document.getElementById('ruleProgress');
  const cta = document.getElementById('cta');
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
        setTimeout(() => wordsIn(slogan), reducedMotion ? 0 : 150);
        // hero intro: a gentle push into the scene, behind the veil
        setTimeout(playIntro, reducedMotion ? 0 : 500);
      };
    };
  }

  // ------------------------------------------------------------------
  // hero intro scrub — the film eases forward INTRO_FRAMES after the
  // reveal; scrolling then continues from that frame
  // ------------------------------------------------------------------
  let introFrame = 0;

  function playIntro() {
    if (reducedMotion) { introFrame = INTRO_FRAMES; return; }
    const start = performance.now();
    const dur = 2200;
    const tick = now => {
      const t = clamp01((now - start) / dur);
      introFrame = INTRO_FRAMES * (1 - Math.pow(1 - t, 3)); // easeOutCubic
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
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
    benefitTitle.style.maxWidth = `calc(${STEPS[state].width} * var(--u))`;
    requestAnimationFrame(() => requestAnimationFrame(() => wordsIn(benefitTitle)));
  }

  function transitionBenefits(next) {
    if (next === benefitState) return;
    const prev = benefitState;
    benefitState = next;
    const token = ++swapLock;

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
  const lerp = (a, b, t) => a + (b - a) * t;

  let scrubPos = 0;
  let shownFrame = 0;

  function onScroll() {
    const vh = window.innerHeight;
    const px = u();
    const total = stage.offsetHeight - vh;
    const p = total > 0 ? clamp01(window.scrollY / total) : 0;

    // scrub position 0..1 across the film (picks up after the intro)
    scrubPos = range(p, SCRUB_IN, SCRUB_OUT);

    // ---- hero UI dissolves ----
    const hOut = range(p, HERO_OUT[0], HERO_OUT[1]);
    hero2.style.opacity = (1 - hOut).toFixed(3);
    hero2.style.transform = `translateY(${(-30 * hOut).toFixed(1)}px)`;
    hero2.style.visibility = hOut >= 1 ? 'hidden' : '';
    cta.style.opacity = (1 - hOut).toFixed(3);
    cta.style.visibility = hOut >= 1 ? 'hidden' : '';

    // ---- the veil and the blur clear, revealing the film as-is ----
    const vOut = range(p, VEIL_OUT[0], VEIL_OUT[1]);
    veil.style.opacity = (1 - vOut).toFixed(3);
    const blur = BLUR_MAX * (1 - vOut) * px;
    canvas.style.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : '';
    canvas.style.transform = vOut < 1 ? `scale(${lerp(SCALE_MAX, 1, vOut).toFixed(4)})` : '';

    // ---- benefits copy ----
    const next = p < BENEFITS_AT ? 'hero'
      : scrubPos < STEP_BOUNDS[0] ? 0
      : scrubPos < STEP_BOUNDS[1] ? 1 : 2;
    transitionBenefits(next);

    // ---- progress line fills across the film section ----
    ruleProgress.style.transform = `scaleX(${range(p, BENEFITS_AT, SCRUB_OUT).toFixed(4)})`;
  }

  function rafLoop() {
    const targetFrame = introFrame + scrubPos * (FRAME_COUNT - 1 - INTRO_FRAMES);
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
  loaderWindow.querySelector('img').src = FRAME_PATH(0);
  preloadAll();
  loaderTick();
  onScroll();
  rafLoop();
})();
