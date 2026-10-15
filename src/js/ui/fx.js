// Feedback effects: particle bursts, floating XP, shakes, counters.
// All effects are skipped (or reduced to an instant change) under reduced motion.

import { prefersReducedMotion } from './dom.js';

const COLOURS = ['#b6e632', '#f4ecd8', '#e8863a', '#7fbf5a', '#5fb3c8'];

function host() {
  return document.getElementById('app');
}

function localPoint(x, y) {
  const r = host().getBoundingClientRect();
  return { x: x - r.left, y: y - r.top };
}

// Burst of particles from a screen point (clientX/clientY).
export function burst(cx, cy, { count = 26, colours = COLOURS, spread = 120 } = {}) {
  if (prefersReducedMotion()) return;
  const { x, y } = localPoint(cx, cy);
  const layer = host();
  for (let i = 0; i < count; i++) {
    const p = document.createElement('i');
    p.className = 'fx-particle';
    const size = 4 + Math.random() * 6;
    p.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size * (Math.random() > 0.5 ? 1 : 0.45)}px;background:${colours[i % colours.length]}`;
    layer.appendChild(p);
    const angle = Math.random() * Math.PI * 2;
    const dist = spread * (0.4 + Math.random() * 0.6);
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 40;
    p.animate([
      { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${Math.random() * 540}deg)`, opacity: 1, offset: 0.7 },
      { transform: `translate(calc(-50% + ${dx * 1.1}px), calc(-50% + ${dy + 60}px)) rotate(${Math.random() * 720}deg)`, opacity: 0 },
    ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.15,.7,.3,1)' }).finished.then(() => p.remove());
  }
}

export function burstFrom(el, opts) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  burst(r.left + r.width / 2, r.top + r.height / 2, opts);
}

// Floating "+40 XP" style text.
export function floatText(text, cx, cy, cls = '') {
  const { x, y } = localPoint(cx, cy);
  const t = document.createElement('span');
  t.className = `fx-float ${cls}`;
  t.textContent = text;
  t.style.left = `${x}px`;
  t.style.top = `${y}px`;
  host().appendChild(t);
  const dur = prefersReducedMotion() ? 900 : 1300;
  t.animate(prefersReducedMotion()
    ? [{ opacity: 1 }, { opacity: 0 }]
    : [{ transform: 'translate(-50%, 0) scale(.7)', opacity: 0 }, { transform: 'translate(-50%, -18px) scale(1.1)', opacity: 1, offset: 0.2 }, { transform: 'translate(-50%, -64px) scale(1)', opacity: 0 }],
  { duration: dur, easing: 'ease-out' }).finished.then(() => t.remove());
}

export function floatFrom(el, text, cls) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  floatText(text, r.left + r.width / 2, r.top, cls);
}

export function shake(el) {
  if (!el || prefersReducedMotion()) return;
  el.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }], { duration: 320 });
}

export function pop(el) {
  if (!el || prefersReducedMotion()) return;
  el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' });
}

export function countUp(el, from, to, ms = 700, fmt = (v) => String(v)) {
  if (!el) return;
  if (prefersReducedMotion() || from === to) { el.textContent = fmt(to); return; }
  const start = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - start) / ms);
    el.textContent = fmt(Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
