/* Wedge intro → hero → governance flow.
 *
 * The backdrop is ONE continuous take (assets/hero.mp4), so nothing is ever
 * swapped and there is no seam to see. We only start, stop and resume it:
 *
 *   0 … HERO_AT     the desk shot dissolving into the model
 *   HERO_AT         hero copy types itself in while the camera keeps moving
 *   HERO_AT … HOLD  the camera pulls back and returns
 *   HOLD            paused here, waiting for "Explore Agents"
 *   HOLD … end      flies inside, landing on the person → governance
 */

const stage = document.getElementById('stage');
const video = document.getElementById('heroVideo');
const exploreBtn = document.getElementById('exploreBtn');

/* cut points measured from the encode (see README) */
const HERO_AT = 5.05;  // dissolve into the pull-back has completed
const HOLD_AT = 9.64;  // pull-back is back at rest; the fly-in starts here

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
  await wait(80);
  stage.classList.add('t1');       // "Backed by YC" fades in
  await wait(120);
  await typeSpan(typeLines[0], 62); // title line 1
  await typeSpan(typeLines[1], 62); // title line 2
  await wait(60);
  await typeSpan(typeLines[2], 140); // subtitle, quicker
  await wait(120);
  caret.classList.add('type-caret--done');
  stage.classList.add('t2');       // CTA appears
  setTimeout(() => caret.remove(), 700);
}

/* ---------------- driving the single take ---------------- */

let heroStarted = false;

function startHero() {
  if (heroStarted) return;
  heroStarted = true;
  stage.classList.add('is-live'); // menu + hero copy appear while it still moves
  intro();
}

/* rAF, not timeupdate: timeupdate only fires ~4x a second, which is far too
   coarse to stop cleanly on a specific frame */
function watchIntro() {
  if (stage.classList.contains('is-playing') || stage.classList.contains('is-revealed')) return;
  if (video.currentTime >= HERO_AT) startHero();
  if (video.currentTime >= HOLD_AT - 0.03) {
    video.pause();
    try { video.currentTime = HOLD_AT; } catch (e) {}
    startHero(); // in case the copy hasn't been triggered yet
    return;
  }
  requestAnimationFrame(watchIntro);
}

if (!reduceMotion) {
  const p = video.play();
  if (p && p.catch) p.catch(startHero); // autoplay refused → show the hero now
  video.addEventListener('error', startHero);
  requestAnimationFrame(watchIntro);
  setTimeout(startHero, 12000); // hard cap, whatever happens
} else {
  try { video.currentTime = HOLD_AT; } catch (e) {}
  startHero(); // reduced motion: hold the still, no playback
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

/* ---------------- explore → fly-in → governance ---------------- */

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

exploreBtn.addEventListener('click', () => {
  if (stage.classList.contains('is-playing') || stage.classList.contains('is-revealed')) return;

  stage.classList.remove('is-intro');
  stage.classList.add('is-playing');

  if (reduceMotion) {
    try { video.currentTime = video.duration || 13.87; } catch (e) {}
    reveal();
    return;
  }

  // simply resume the same take from where it paused — the camera keeps going
  try { video.currentTime = HOLD_AT; } catch (e) {}
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
