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

/* ---------------- ambient loop → explore → fly-in → governance ----------------
 *
 * The video is one 10s take: [0 … 6.0s] is an ambient orbit that ends back on
 * frame 0 (measured: the 6.0s frame matches frame 0), and [6.0s … end] is the
 * fly-in towards the person. While idle we loop the first segment; pressing
 * Explore Agents jumps to 6.0s and rides the fly-in to the end.
 */

const INTRO_END = 6.0;
let flying = false;

function reveal() {
  video.pause();                 // hold the last (person) frame
  stage.classList.remove('is-playing');
  stage.classList.add('is-revealed');
}

/* ambient segment loop (rAF for a tight wrap — timeupdate is too coarse) */
function watchAmbient() {
  if (flying) return;
  if (video.currentTime >= INTRO_END - 0.06) video.currentTime = 0;
  requestAnimationFrame(watchAmbient);
}

if (!reduceMotion) {
  const p = video.play(); // muted + playsinline → allowed to autoplay
  if (p && p.catch) p.catch(() => {}); // blocked → static poster is fine
  requestAnimationFrame(watchAmbient);
}

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
