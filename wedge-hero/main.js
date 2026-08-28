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
