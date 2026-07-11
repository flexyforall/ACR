/* ============================================================
   CEDUR — loader → hero reveal → scroll-scrubbed scene
   The second section scrubs a 169-frame sequence with the scroll
   position. The headline (CEDUR + rule + progress) is ONE
   persistent element: it travels down and shrinks into the
   benefits heading, the rule and progress line moving with it.
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

  const GATE_FRAMES = 42;       // frames that must be ready before reveal
  const SCRUB_IN = 0.05;        // scroll progress where the scrub starts
  const SCRUB_OUT = 0.96;       // scroll progress where frame 169 lands

  // headline morph: hero state → benefits state over this scroll window
  const MORPH = [0.02, 0.115];
  const PROGRESS_START = 64 / 1360; // hero progress segment (122:428)

  // loader sequence: [phrase, dot] lit in order, then the window expands
  const LOADER_STEP_T = [1350, 1900, 2450];
  const LOADER_MIN_MS = 3150;

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
  const headline = document.getElementById('headline');
  const headlineTitle = document.getElementById('headlineTitle');
  const ruleProgress = document.getElementById('ruleProgress');
  const heroDesc = document.getElementById('heroDesc');
  const cta = document.getElementById('cta');
  const benefitDesc = document.getElementById('benefitDesc');
  const canvas = document.getElementById('scene');
  const ctx = canvas.getContext('2d');

  const seqEls = [
    [document.getElementById('tlLeft'), document.getElementById('dotTL')],
    [document.getElementById('tlRight'), document.getElementById('dotTR')],
    [document.getElementById('tlHome'), document.getElementById('dotBR')],
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

  setWords(headlineTitle, 'cedur');
  setWords(heroDesc, heroDesc.textContent.trim());

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
  // 1. tagline slides in (all 20% white)
  // 2. "the roof" → white + top-left dot
  // 3. "that makes it" → white + top-right dot
  // 4. "home" → white + bottom-right dot
  // 5. the window expands into the hero
  // ------------------------------------------------------------------
  const t0 = performance.now();

  requestAnimationFrame(() => loader.setAttribute('data-in', ''));
  if (!reducedMotion) {
    seqEls.forEach(([txt, dot], i) => {
      setTimeout(() => { txt.classList.add('lit'); dot.classList.add('lit'); }, LOADER_STEP_T[i]);
    });
  } else {
    seqEls.forEach(([txt, dot]) => { txt.classList.add('lit'); dot.classList.add('lit'); });
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
        drawFrame(0);
        body.dataset.state = 'revealed';
        body.setAttribute('data-revealed', '');
        // hero text: staggered word rise with skew settle
        wordsIn(headlineTitle);
        setTimeout(() => wordsIn(heroDesc), reducedMotion ? 0 : 250);
        // progress segment draws in to its 64px hero width
        const anim = ruleProgress.animate(
          [{ transform: 'scaleX(0)' }, { transform: `scaleX(${PROGRESS_START})` }],
          { duration: reducedMotion ? 1 : 900, delay: reducedMotion ? 0 : 500, easing: 'cubic-bezier(0.19,1,0.22,1)', fill: 'forwards' }
        );
        anim.onfinish = () => {
          anim.cancel();
          ruleProgress.style.transform = `scaleX(${PROGRESS_START})`;
        };
        setTimeout(() => { body.dataset.state = 'done-loading'; }, reducedMotion ? 50 : 1600);
      };
    };
  }

  // ------------------------------------------------------------------
  // headline state machine: 'hero' (CEDUR) ↔ benefit steps 0..2
  // ------------------------------------------------------------------
  let headlineState = 'hero';
  let swapLock = 0;

  function applyHeadline(state) {
    if (state === 'hero') {
      setWords(headlineTitle, 'cedur');
      headlineTitle.style.maxWidth = 'none';
    } else {
      setWords(headlineTitle, STEPS[state].title);
      headlineTitle.style.maxWidth = `calc(${STEPS[state].width} * var(--u))`;
    }
    requestAnimationFrame(() => requestAnimationFrame(() => wordsIn(headlineTitle)));
  }

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

  function transitionHeadline(next) {
    if (next === headlineState) return;
    headlineState = next;
    const token = ++swapLock;
    if (reducedMotion) { applyHeadline(next); setBenefitDesc(next); return; }
    wordsOut(headlineTitle);
    setTimeout(() => { if (token === swapLock) applyHeadline(next); }, 380);
    setBenefitDesc(next);
  }

  // ------------------------------------------------------------------
  // scroll engine
  // ------------------------------------------------------------------
  const clamp01 = v => Math.max(0, Math.min(1, v));
  const range = (p, a, b) => clamp01((p - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  let targetFrame = 0;
  let shownFrame = 0;

  function onScroll() {
    const vh = window.innerHeight;
    const px = u();
    const total = stage.offsetHeight - vh;
    const p = total > 0 ? clamp01(window.scrollY / total) : 0;

    // scrub position 0..1 across the film
    const scrub = range(p, SCRUB_IN, SCRUB_OUT);
    targetFrame = scrub * (FRAME_COUNT - 1);

    // ---- headline morph: hero → benefits position/size ----
    const m = easeInOut(range(p, MORPH[0], MORPH[1]));
    const ruleY = lerp(vh / 2 + 82 * px, vh - 166 * px, m);
    headline.style.setProperty('--rule-y', `${ruleY.toFixed(2)}px`);
    headline.style.setProperty('--ts', `calc(${lerp(160, 32, m).toFixed(2)} * var(--u))`);
    headline.style.setProperty('--lh', lerp(0.9, 1.1, m).toFixed(3));
    headline.style.setProperty('--pad-b', `calc(${lerp(10, 16, m).toFixed(2)} * var(--u))`);

    // ---- hero description dissolves as we take off ----
    const dOut = range(p, 0.012, 0.06);
    heroDesc.style.opacity = (1 - dOut).toFixed(3);
    heroDesc.style.filter = dOut > 0 ? `blur(${(6 * dOut).toFixed(1)}px)` : '';
    heroDesc.style.transform = `translateY(${(-14 * dOut).toFixed(1)}px)`;
    heroDesc.style.visibility = dOut >= 1 ? 'hidden' : '';

    // ---- cta fades with the hero ----
    const cOut = range(p, 0, 0.08);
    cta.style.opacity = (1 - cOut).toFixed(3);
    cta.style.visibility = cOut >= 1 ? 'hidden' : '';

    // ---- title text: CEDUR ↔ step titles (subtle masked swap) ----
    const next = p < MORPH[1] ? 'hero'
      : scrub < STEP_BOUNDS[0] ? 0
      : scrub < STEP_BOUNDS[1] ? 1 : 2;
    transitionHeadline(next);

    // ---- progress line: continuous from the 64px hero segment to full ----
    if (body.dataset.state === 'done-loading' || p > 0.001) {
      const sx = PROGRESS_START + (1 - PROGRESS_START) * range(p, MORPH[0], SCRUB_OUT);
      ruleProgress.style.transform = `scaleX(${sx.toFixed(4)})`;
    }
  }

  function rafLoop() {
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
  preloadAll();
  loaderTick();
  onScroll();
  rafLoop();
})();
