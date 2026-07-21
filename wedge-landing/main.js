/* Wedge hero → governance flow.
 *
 * The stage never scrolls. It has three states, driven only by the button
 * and the video:
 *   is-intro    → building backdrop (poster), hero copy + "Explore Agents"
 *   is-playing  → hero copy fades out, the fly-in video plays
 *   is-revealed → video holds on its last frame (person at desk) and the
 *                 governance content fades in
 */

const stage = document.getElementById('stage');
const video = document.getElementById('heroVideo');
const exploreBtn = document.getElementById('exploreBtn');

function reveal() {
  video.pause();                 // hold the last (person) frame
  stage.classList.remove('is-playing');
  stage.classList.add('is-revealed');
}

exploreBtn.addEventListener('click', () => {
  if (stage.classList.contains('is-playing') || stage.classList.contains('is-revealed')) return;

  stage.classList.remove('is-intro');
  stage.classList.add('is-playing');

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
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
