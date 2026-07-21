/* Wedge hero → governance flow.
 *
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
intro();

/* ---------------- explore → fly-in → governance ---------------- */

function reveal() {
  video.pause();                 // hold the last (person) frame
  stage.classList.remove('is-playing');
  stage.classList.add('is-revealed');
}

exploreBtn.addEventListener('click', () => {
  if (stage.classList.contains('is-playing') || stage.classList.contains('is-revealed')) return;

  stage.classList.remove('is-intro');
  stage.classList.add('is-playing');

  if (reduceMotion) {
    // honour reduced motion: skip the fly-in, jump straight to the last frame
    try { video.currentTime = video.duration || 4; } catch (e) {}
    reveal();
    return;
  }

  video.currentTime = 0;
  const p = video.play();
  if (p && p.catch) p.catch(() => reveal()); // autoplay blocked → just reveal
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
