/* Wedge loader → hero → governance flow.
 *
 * Loader: a full-bleed clip plays once; its last frame hands off to the hero.
 * Intro: the hero text types itself (terminal caret), then the CTA appears.
 * Stage states, driven only by the button and the video:
 *   is-intro    → building backdrop (poster), hero copy + "Explore Agents"
 *   is-playing  → hero copy fades out, the fly-in video plays
 *   is-revealed → video holds on its last frame (person at desk) and the
 *                 governance content fades in
 */

const stage = document.getElementById('stage');
const video = document.getElementById('heroVideo');
const exploreBtn = document.getElementById('exploreBtn');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- intro: self-typing hero text ---------------- */

const typeLines = [...document.querySelectorAll('.type-line')];
const caret = document.createElement('span');
caret.className = 'type-caret';
caret.setAttribute('aria-hidden', 'true');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function typeSpan(span, cps) {
  const text = span.dataset.text;
  span.parentNode.insertBefore(caret, span.nextSibling); // caret follows this line
  for (let i = 1; i <= text.length; i++) {
    span.textContent = text.slice(0, i);
    let d = (1000 / cps) * (0.6 + Math.random() * 0.8); // organic jitter
    if (text[i - 1] === ' ') d *= 1.5;
    await wait(d);
  }
}

async function intro() {
  if (reduceMotion) {
    stage.classList.add('t1', 't2'); // no typing — everything appears at once
    return;
  }
  typeLines.forEach((s) => (s.textContent = '')); // clear the no-JS fallback copy
  await wait(250);
  stage.classList.add('t1');       // "Backed by YC" fades in
  await wait(350);
  await typeSpan(typeLines[0], 34); // title line 1
  await typeSpan(typeLines[1], 34); // title line 2
  await wait(140);
  await typeSpan(typeLines[2], 85); // subtitle, quicker
  await wait(350);
  caret.classList.add('type-caret--done');
  stage.classList.add('t2');       // CTA appears
  setTimeout(() => caret.remove(), 900);
}

/* ---------------- loader → hero handoff ---------------- */

const loader = document.getElementById('loader');
const loaderVideo = document.getElementById('loaderVideo');
let heroStarted = false;

function startHero() {
  if (heroStarted) return;
  heroStarted = true;

  loader.classList.add('is-done');
  stage.classList.add('is-live');
  setTimeout(() => loader.remove(), 700); // after the cross-fade

  if (!reduceMotion) {
    const p = video.play(); // muted + playsinline → allowed to autoplay
    if (p && p.catch) p.catch(() => {});
    requestAnimationFrame(watchAmbient);
  }
  intro();
}

if (loader && loaderVideo && !reduceMotion) {
  loaderVideo.addEventListener('ended', startHero);

  // safety nets: some codecs never fire 'ended', and autoplay can be blocked
  loaderVideo.addEventListener('timeupdate', () => {
    if (loaderVideo.duration && loaderVideo.currentTime >= loaderVideo.duration - 0.05) startHero();
  });
  loaderVideo.addEventListener('error', startHero);
  const p = loaderVideo.play();
  if (p && p.catch) p.catch(startHero); // playback refused → go straight to the hero
  setTimeout(startHero, 15000);         // hard cap, whatever happens
} else {
  startHero(); // reduced motion: no loader clip
}

/* ---------------- bottom-right Lottie on the governance screen ---------------- */

const lottieBox = document.getElementById('govLottie');
if (lottieBox && window.lottie) {
  (window.__LOTTIE_DATA__
    ? Promise.resolve(window.__LOTTIE_DATA__) // inlined build (preview bundle)
    : fetch('assets/lottie.json').then((r) => (r.ok ? r.json() : Promise.reject()))
  )
    .then((data) => {
      window.lottie.loadAnimation({
        container: lottieBox,
        renderer: 'svg',
        loop: true,
        autoplay: !reduceMotion,
        animationData: data,
      });
    })
    .catch(() => {}); // no assets/lottie.json yet → the box stays hidden
}

/* ---------------- cipher scramble on button hover ----------------
 * On hover/focus the label dissolves into random glyphs and locks back in
 * character by character, left to right — like a cipher being decoded.
 */

const SCRAMBLE_CHARS = '!<>-_\\/[]{}=+*^?#$%&@01';

document.querySelectorAll('[data-scramble]').forEach((el) => {
  const finalText = el.textContent;
  const trigger = el.closest('button, a') || el;
  let running = false;

  function start() {
    if (running || reduceMotion) return;
    running = true;

    const D = 550; // total decode time, ms
    const len = finalText.length;
    // each character locks at its own moment, sweeping left → right
    const locks = [...finalText].map((ch, i) =>
      ch === ' ' ? 0 : (i / len) * D * 0.75 + Math.random() * D * 0.25);

    // freeze the label's width so the button doesn't breathe while scrambling
    if (el.tagName === 'SPAN' || el.tagName === 'A') {
      el.style.minWidth = el.offsetWidth + 'px';
      el.style.display = 'inline-block';
    }

    const t0 = performance.now();
    (function frame(now) {
      const t = (now || performance.now()) - t0;
      let out = '';
      for (let i = 0; i < len; i++) {
        const ch = finalText[i];
        out += (ch === ' ' || t >= locks[i])
          ? ch
          : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
      }
      el.textContent = out;
      if (t < D) {
        requestAnimationFrame(frame);
      } else {
        el.textContent = finalText;
        el.style.minWidth = '';
        running = false;
      }
    })();
  }

  trigger.addEventListener('mouseenter', start);
  trigger.addEventListener('focusin', start);
});

/* ---------------- ambient loop → explore → fly-in → governance ----------------
 *
 * The video is one 10s take: [0 … 6.0s] is an ambient orbit that ends back on
 * frame 0 (measured: the 6.0s frame matches frame 0), and [6.0s … end] is the
 * fly-in towards the person. While idle we loop the first segment; pressing
 * Explore Agents jumps to 6.0s and rides the fly-in to the end.
 */

const INTRO_END = 6.0;
let flying = false;

/* the "// …" labels type themselves on repeat: type → hold → clear → retype */
function startTypeLoop(el, startDelay) {
  if (!el || el.dataset.looping) return;
  el.dataset.looping = '1';
  const text = el.textContent;
  el.style.minWidth = el.offsetWidth + 'px'; // keep the row from shifting
  if (reduceMotion) return;
  el.classList.add('is-typing');
  let i = 0;
  function step() {
    i++;
    el.textContent = text.slice(0, i);
    if (i < text.length) {
      setTimeout(step, 45 + Math.random() * 45);   // typing
    } else {
      setTimeout(() => {                            // hold the full text…
        i = 0;
        el.textContent = '';
        setTimeout(step, 600);                      // …clear, brief pause, retype
      }, 2600);
    }
  }
  el.textContent = '';
  setTimeout(step, startDelay);
}

function reveal() {
  video.pause();                 // hold the last (person) frame
  stage.classList.remove('is-playing');
  stage.classList.add('is-revealed');
  setTimeout(() => {
    startTypeLoop(document.getElementById('eyebrowLabel'), 300);
    startTypeLoop(document.getElementById('askLabel'), 600);
  }, 350);
}

/* ambient segment plays ONCE: when the camera returns to the first frame
   (~6.0s) the video freezes there until Explore Agents is pressed */
function watchAmbient() {
  if (flying) return;
  if (video.currentTime >= INTRO_END - 0.06) {
    video.pause();
    video.currentTime = INTRO_END; // hold exactly on the return frame
    return;
  }
  requestAnimationFrame(watchAmbient);
}

/* the ambient pass is kicked off by startHero(), once the loader hands over */

exploreBtn.addEventListener('click', () => {
  if (stage.classList.contains('is-playing') || stage.classList.contains('is-revealed')) return;

  flying = true;
  stage.classList.remove('is-intro');
  stage.classList.add('is-playing');

  if (reduceMotion) {
    // honour reduced motion: skip the fly-in, jump straight to the last frame
    try { video.currentTime = video.duration || 10; } catch (e) {}
    reveal();
    return;
  }

  video.currentTime = INTRO_END; // ambient ends on ~frame 0, so the cut is soft
  const p = video.play();
  if (p && p.catch) p.catch(() => reveal()); // playback blocked → just reveal
});

// When the fly-in finishes, reveal the governance content.
video.addEventListener('ended', reveal);

// Safety net: if 'ended' doesn't fire (some codecs), reveal near the end.
video.addEventListener('timeupdate', () => {
  if (video.duration && video.currentTime >= video.duration - 0.05 &&
      stage.classList.contains('is-playing')) {
    reveal();
  }
});
