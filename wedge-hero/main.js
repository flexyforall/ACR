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
 * dive.mp4 is the hero's camera move with the fly-in welded onto the end of
 * it, as a single encode. The moment the camera enters the building therefore
 * lives inside a file — it is a plain frame-to-frame cut that cannot glitch,
 * stall or flash.
 *
 * That leaves one swap: from the looping clip to the dive. We control it, so
 * we make it show the same picture on both sides:
 *   · hero.mp4 is a boomerang, so if it is on the way back we mirror the time
 *     to the matching point of the forward pass — the identical frame.
 *   · dive.mp4 opens with that exact same footage, so seeking it to the same
 *     time lands on the same frame.
 *   · we wait for the seek to actually complete, then reveal. The dive layer
 *     is opaque, so the loop is hidden the instant it appears; nothing can
 *     show through and there is no undecoded frame to flash black.
 * Playback then speeds up to reach the fly-in in about a second and drops back
 * to normal once it is inside.
 */

const heroVideo = document.getElementById('heroVideo');
const diveVideo = document.getElementById('diveVideo');
const cta = document.querySelector('.cta');

const LOOP_TURN = 8.0; // boomerang turnaround
const DIVE_JOIN = 8.0; // where the fly-in starts inside dive.mp4
const DIVE_SECONDS = 1.1;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
let diving = false;

/* warm the decoder so the first revealed frame is already painted */
function prewarm() {
  diveVideo.removeEventListener('loadeddata', prewarm);
  const p = diveVideo.play();
  if (p && p.then) p.then(() => { diveVideo.pause(); diveVideo.currentTime = 0; }).catch(() => {});
}
diveVideo.addEventListener('loadeddata', prewarm);

function runDive(from) {
  heroVideo.pause();
  hero.classList.add('is-diving');

  diveVideo.playbackRate = clamp((DIVE_JOIN - from) / DIVE_SECONDS, 1, 6);
  const p = diveVideo.play();
  if (p && p.catch) p.catch(() => {});

  (function watch() {
    if (diveVideo.currentTime >= DIVE_JOIN) {
      diveVideo.playbackRate = 1;      // inside now: back to the intended pace
      hero.classList.add('is-inside');
      return;
    }
    requestAnimationFrame(watch);
  })();
}

cta.addEventListener('click', () => {
  if (diving) return;
  diving = true;
  hero.classList.add('is-leaving');

  if (reduceMotion) {
    try { diveVideo.currentTime = diveVideo.duration || 13; } catch (e) {}
    hero.classList.add('is-diving', 'is-inside');
    return;
  }

  let t = heroVideo.currentTime;
  if (t > LOOP_TURN) t = 2 * LOOP_TURN - t; // mirror: the identical frame
  t = clamp(t, 0, DIVE_JOIN - 0.05);

  // reveal only once the dive is actually sitting on that frame
  let started = false;
  const go = () => { if (!started) { started = true; runDive(t); } };
  diveVideo.addEventListener('seeked', go, { once: true });
  setTimeout(go, 400); // seek never reported → go anyway

  try { diveVideo.currentTime = t; } catch (e) { go(); }
});

// hold the final frame; this is where the next section will pick up
diveVideo.addEventListener('ended', () => {
  diveVideo.pause();
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
