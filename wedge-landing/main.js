/* Wedge landing — scroll choreography for the "Talk to Wedge AI" transition.
 *
 * Timeline while the transition section is pinned (p = 0 → 1):
 *   p .04–.30  reading effect — the headline lights up word by word
 *   p .32–.42  headline floats out
 *   p .34–.82  the sphere scales down while circling into place
 *   p .80–.95  "Hey, I'm Wedge!" + input field fade in
 * Pressing send scrolls to the next section (#about).
 */

const wrapper = document.getElementById('transition');
const readingLine = document.getElementById('readingLine');
const chat = document.getElementById('chat');
const sphere = document.getElementById('sphere');
const askForm = document.getElementById('askForm');
const askInput = document.getElementById('askInput');
const aboutQuestion = document.getElementById('aboutQuestion');

/* ---------- split the headline into word spans for the reading effect ---------- */

const words = readingLine.textContent.trim().split(/\s+/);
readingLine.innerHTML = words
  .map((w) => `<span class="w">${w}</span>`)
  .join(' ');
const wordEls = [...readingLine.querySelectorAll('.w')];

/* ---------- helpers ---------- */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const range = (p, a, b) => clamp((p - a) / (b - a), 0, 1);
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- geometry ---------- */

let vh = innerHeight;
let vw = innerWidth;
let baseSize = 720; // px, the sphere at full scale
const FINAL_SIZE = 56;

function measure() {
  vh = innerHeight;
  vw = innerWidth;
  baseSize = Math.min(853, vh * 1.08);
  sphere.style.setProperty('--sphere-size', `${baseSize}px`);
}
measure();
addEventListener('resize', measure);

/* ---------- per-frame update ---------- */

function update(now) {
  const rect = wrapper.getBoundingClientRect();
  const total = rect.height - vh;
  const p = clamp(-rect.top / total, 0, 1);

  /* Phase A — reading effect */
  const tRead = range(p, 0.04, 0.3);
  const lit = tRead * (wordEls.length + 0.5);
  wordEls.forEach((el, i) => {
    el.style.opacity = 0.25 + 0.75 * clamp(lit - i, 0, 1);
  });

  /* headline exit */
  const tOut = range(p, 0.32, 0.42);
  readingLine.style.opacity = 1 - tOut;
  readingLine.style.translate = `-50% calc(-50% - ${tOut * 60}px)`;

  /* Phase B — sphere scales down, circling, until it comes into place */
  const tMv = easeInOut(range(p, 0.34, 0.82));

  const yStart = vh * 1.15; // huge, peeking over the bottom edge
  const yEnd = vh * 0.865;  // resting spot just below the input field
  const scaleEnd = FINAL_SIZE / baseSize;

  const idleBob = Math.sin(now * 0.0012) * 10 * (1 - tMv);

  // one full elliptical loop that collapses as it lands
  const theta = tMv * Math.PI * 2;
  const orbitX = Math.sin(theta) * vw * 0.24;
  const orbitY = (-(1 - Math.cos(theta)) / 2) * vh * 0.62;

  const x = orbitX;
  const y = lerp(yStart, yEnd, tMv) + orbitY + idleBob;
  const s = lerp(1, scaleEnd, tMv);
  const spin = tMv * 360;

  sphere.style.transform =
    `translate3d(${x}px, ${y}px, 0) scale(${s}) rotate(${spin}deg)`;

  /* Phase C — greeting + input fade in */
  const tChat = range(p, 0.8, 0.95);
  chat.style.opacity = tChat;
  chat.style.translate = `-50% ${(1 - tChat) * 40}px`;
  chat.style.pointerEvents = tChat > 0.85 ? 'auto' : 'none';

  requestAnimationFrame(update);
}
requestAnimationFrame(update);

/* ---------- interactions ---------- */

document.getElementById('startJourney').addEventListener('click', () => {
  wrapper.scrollIntoView({ behavior: 'smooth' });
});

// voice-bars icon becomes an arrow once there's text (as in the Figma frames)
askInput.addEventListener('input', () => {
  askForm.classList.toggle('has-text', askInput.value.trim().length > 0);
});

// send → hand the question to the next section and scroll there
askForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = askInput.value.trim();
  if (q) aboutQuestion.textContent = q;
  document.getElementById('about').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('askFormLight').addEventListener('submit', (e) => {
  e.preventDefault();
  e.target.reset();
});
