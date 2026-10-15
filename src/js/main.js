import { startApp } from './app.js?v=20261011-quest-journal-location';

const root = document.getElementById('app');
const img = new Image();
img.src = 'assets/map/campus-map.jpg';

// Wait briefly for the map art so the title scene appears complete, but never
// block the game on it: the map view has its own list fallback.
const ready = img.decode ? img.decode().catch(() => {}) : Promise.resolve();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
// Let the unfolding-map animation finish (about 1.4 s) before the title appears.
const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const minShow = wait(still ? 300 : 1400);
Promise.all([Promise.race([ready, wait(2500)]), minShow]).then(() => {
  const boot = root.querySelector('.boot');
  if (boot) boot.classList.add('is-done');
  return wait(boot && !still ? 240 : 0);
}).then(() => {
  try {
    startApp(root);
  } catch (err) {
    console.error(err);
    root.innerHTML = '<div class="boot"><p>Something went wrong while starting the game. Please refresh the page.</p></div>';
  }
});
