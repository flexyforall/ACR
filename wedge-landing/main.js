/* Wedge intro → hero → governance flow.
 *
 * Intro clip: plays once un-overlaid, then freezes and stays as the hero's
 * backdrop — no second clip swaps in behind the hero, so there is no seam.
 * Intro: the hero text types itself (terminal caret), then the CTA appears.
 * Stage states, driven only by the button and the video:
 *   is-intro    → building backdrop (poster), hero copy + "Explore Agents"
 *   is-playing  → hero copy fades out, the fly-in video plays
 *   is-revealed → video holds on its last frame (person at desk) and the
 *                 governance content fades in
 */

const stage = document.getElementById('stage');
const introVideo = document.getElementById('introVideo');
const flyinVideo = document.getElementById('flyinVideo');
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

/* ---------------- intro clip → hero ----------------
 * The intro plays un-overlaid, then simply stops. Its last frame stays on
 * screen as the hero backdrop — nothing swaps, so there is no seam to see.
 */

let heroStarted = false;

function freezeIntro() {
  introVideo.pause();
  // park on the very last frame so the still is exactly where the motion ended
  if (introVideo.duration) {
    try { introVideo.currentTime = Math.max(0, introVideo.duration - 0.04); } catch (e) {}
  }
}

function startHero() {
  if (heroStarted) return;
  heroStarted = true;
  freezeIntro();
  stage.classList.add('is-live'); // menu + hero copy appear over the frozen frame
  intro();
}

if (!reduceMotion) {
  introVideo.addEventListener('ended', startHero);

  // safety nets: some codecs never fire 'ended', and autoplay can be blocked
  introVideo.addEventListener('timeupdate', () => {
    if (introVideo.duration && introVideo.currentTime >= introVideo.duration - 0.05) startHero();
  });
  introVideo.addEventListener('error', startHero);
  const p = introVideo.play();
  if (p && p.catch) p.catch(startHero); // playback refused → straight to the hero
  setTimeout(startHero, 15000);         // hard cap, whatever happens
} else {
  startHero(); // reduced motion: hold the poster, no clip
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

/* ---------------- explore → fly-in → governance ----------------
 *
 * hero-flyin.mp4 is cut to open on the exact shot the intro clip freezes on
 * (matched by frame comparison, same 3840x2140 square-pixel geometry), so the
 * cross-fade on click continues the camera instead of cutting to a new one.
 */

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
  flyinVideo.pause();            // hold the last (person) frame
  stage.classList.remove('is-playing');
  stage.classList.add('is-revealed');
  setTimeout(() => {
    startTypeLoop(document.getElementById('eyebrowLabel'), 300);
    startTypeLoop(document.getElementById('askLabel'), 600);
  }, 350);
}

exploreBtn.addEventListener('click', () => {
  if (stage.classList.contains('is-playing') || stage.classList.contains('is-revealed')) return;

  stage.classList.remove('is-intro');
  stage.classList.add('is-playing');

  if (reduceMotion) {
    // honour reduced motion: skip the fly-in, jump straight to the last frame
    stage.classList.add('is-flying');
    try { flyinVideo.currentTime = flyinVideo.duration || 4; } catch (e) {}
    reveal();
    return;
  }

  // the fly-in opens on the shot the intro froze on, so fading it in while it
  // starts moving reads as the same camera continuing, not a cut
  flyinVideo.currentTime = 0;
  stage.classList.add('is-flying');
  const p = flyinVideo.play();
  if (p && p.catch) p.catch(() => reveal()); // playback blocked → just reveal
});

// When the fly-in finishes, reveal the governance content.
flyinVideo.addEventListener('ended', reveal);

// Safety net: if 'ended' doesn't fire (some codecs), reveal near the end.
flyinVideo.addEventListener('timeupdate', () => {
  if (flyinVideo.duration && flyinVideo.currentTime >= flyinVideo.duration - 0.05 &&
      stage.classList.contains('is-playing')) {
    reveal();
  }
});
