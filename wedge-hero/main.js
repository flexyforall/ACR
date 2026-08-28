/* Wedge hero — reveal choreography.
 *
 * Carried over from the earlier builds:
 *   · the "Backed by Y Combinator" line fades up out of a blur
 *   · the title types itself line by line behind a blinking caret
 *   · the copy follows, quicker
 *   · the CTA rises in once the typing lands
 *   · button labels decode out of random glyphs on hover
 *
 * Each typed line sits over a hidden ghost copy of its final text, so the
 * centred column keeps its exact size and nothing reflows mid-animation.
 */

const hero = document.querySelector('.hero');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- typing ---------------- */

const caret = document.createElement('span');
caret.className = 'type-caret';
caret.setAttribute('aria-hidden', 'true');

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function typeInto(out, cps) {
  const text = out.dataset.text;
  out.appendChild(caret); // the caret trails whichever line is being written
  let i = 0;

  return new Promise((done) => {
    (function step() {
      i++;
      out.textContent = text.slice(0, i);
      out.appendChild(caret);
      if (i >= text.length) return done();
      let d = (1000 / cps) * (0.6 + Math.random() * 0.8); // organic jitter
      if (text[i - 1] === ' ') d *= 1.5;
      setTimeout(step, d);
    })();
  });
}

async function reveal() {
  const outs = [...document.querySelectorAll('.type__out')];

  if (reduceMotion) {
    outs.forEach((o) => (o.textContent = o.dataset.text));
    hero.classList.add('is-t1', 'is-t2');
    return;
  }

  await wait(120);
  hero.classList.add('is-t1');        // YC line
  await wait(260);
  await typeInto(outs[0], 62);        // title, line 1
  await typeInto(outs[1], 62);        // title, line 2
  await wait(60);
  await typeInto(outs[2], 150);       // copy, quicker
  await wait(120);
  caret.classList.add('type-caret--done');
  hero.classList.add('is-t2');        // CTA
  setTimeout(() => caret.remove(), 700);
}

reveal();

/* ---------------- Explore Agents → fly inside ----------------
 *
 * hero.mp4 is a boomerang: frames 0-192 run forward, 193-383 are the same
 * frames coming back. transition.mp4 opens on frame 192 — the turnaround —
 * matched by frame comparison, so if we hand off exactly there the camera
 * simply keeps going and there is no cut to see.
 *
 * Two things make that work from a click at any moment:
 *   · if the loop is on its way back, we jump to the mirrored point in the
 *     forward pass. That frame is the same image, so the seek is invisible.
 *   · playback then speeds up to reach the turnaround in about a second, which
 *     reads as the camera diving in rather than as a wait.
 */

const heroVideo = document.getElementById('heroVideo');
const transitionVideo = document.getElementById('transitionVideo');
const cta = document.querySelector('.cta');

const TURN = 8.0;        // seconds: frame 192 at 24fps, where the two clips meet
const DIVE_SECONDS = 1.1; // how long the run-up to the turnaround should take

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let diving = false;

function goInside() {
  heroVideo.pause();
  hero.classList.add('is-transition');
  transitionVideo.currentTime = 0;
  const p = transitionVideo.play();
  if (p && p.catch) p.catch(() => {});
  setTimeout(() => hero.classList.add('is-inside'), 250);
}

cta.addEventListener('click', () => {
  if (diving) return;
  diving = true;
  hero.classList.add('is-diving');

  if (reduceMotion) {
    hero.classList.add('is-transition', 'is-inside');
    try { transitionVideo.currentTime = transitionVideo.duration || 5; } catch (e) {}
    return;
  }

  let t = heroVideo.currentTime;
  if (t > TURN) {
    // on the way back: the mirrored time shows the identical frame
    try { heroVideo.currentTime = t = 2 * TURN - t; } catch (e) {}
  }

  const remaining = Math.max(0, TURN - t);
  heroVideo.loop = false;
  heroVideo.playbackRate = clamp(remaining / DIVE_SECONDS, 1, 6);
  const p = heroVideo.play();
  if (p && p.catch) p.catch(goInside); // can't play → just show the transition

  (function watch() {
    if (!hero.classList.contains('is-transition')) {
      if (heroVideo.currentTime >= TURN - 0.03) return goInside();
      requestAnimationFrame(watch);
    }
  })();

  // safety net: hand off anyway if playback stalls
  setTimeout(goInside, (remaining / heroVideo.playbackRate) * 1000 + 900);
});

// hold the final frame; this is where the next section will pick up
transitionVideo.addEventListener('ended', () => {
  transitionVideo.pause();
  hero.classList.add('is-arrived');
});

/* ---------------- cipher decode on hover ---------------- */

const SCRAMBLE_CHARS = '!<>-_\\/[]{}=+*^?#$%&@01';

document.querySelectorAll('[data-scramble]').forEach((el) => {
  const finalText = el.textContent;
  const trigger = el.closest('button, a') || el;
  let running = false;

  function start() {
    if (running || reduceMotion) return;
    running = true;

    const D = 550;                     // total decode time, ms
    const len = finalText.length;
    // every character locks at its own moment, sweeping left to right
    const locks = [...finalText].map((ch, i) =>
      ch === ' ' ? 0 : (i / len) * D * 0.75 + Math.random() * D * 0.25);

    // pin the label's width so the button doesn't breathe while it decodes
    el.style.display = 'inline-block';
    el.style.minWidth = el.offsetWidth + 'px';

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
      if (t < D) return requestAnimationFrame(frame);
      el.textContent = finalText;
      el.style.minWidth = '';
      running = false;
    })();
  }

  trigger.addEventListener('mouseenter', start);
  trigger.addEventListener('focusin', start);
});
