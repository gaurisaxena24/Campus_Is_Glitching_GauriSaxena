// Inline SVG game art: one animated illustration per glitch (glitched and
// restored states), player crests and the fictional teammate portraits.
// Animation is CSS-driven (see games.css) and switched off by reduced motion.

import { AVATARS, TEAMMATES } from '../game/profile.js';

const wrap = (inner, cls, label) => `<svg class="art ${cls}" viewBox="0 0 160 120" role="img" aria-label="${label}">${inner}</svg>`;

const ground = `<ellipse cx="80" cy="108" rx="62" ry="7" class="art-shadow"/>`;

export function glitchArt(kind, repaired = false) {
  const state = repaired ? 'is-fixed' : 'is-glitched';
  switch (kind) {
    case 'frozen':
      return wrap(`${ground}
        <g class="art-runner">
          <circle cx="80" cy="30" r="10" class="art-skin"/>
          <path d="M80 41 L76 70" class="art-limb"/>
          <path d="M77 48 L62 58 M77 48 L94 56" class="art-limb art-arms"/>
          <path d="M76 70 L64 96 M76 70 L92 94" class="art-limb art-legs"/>
        </g>
        <g class="art-ice"><path d="M52 18 L108 18 L114 104 L46 104 Z"/><path d="M60 30 L70 46 M98 60 L104 80 M58 84 L66 94"/></g>
        <g class="art-glitch-bars"><rect x="40" y="44" width="80" height="5"/><rect x="48" y="76" width="64" height="4"/></g>
        <g class="art-motion"><path d="M40 60 h14 M36 72 h18 M44 84 h10"/></g>`, `art--frozen ${state}`, repaired ? 'The runner is moving again' : 'A runner frozen in a block of ice');
    case 'phone':
      return wrap(`${ground}
        <g class="art-phone"><rect x="52" y="12" width="56" height="94" rx="9"/><rect x="58" y="22" width="44" height="72" rx="3" class="art-screen"/></g>
        <g class="art-feed"><rect x="62" y="28" width="36" height="8" rx="2"/><rect x="62" y="40" width="36" height="8" rx="2"/><rect x="62" y="52" width="36" height="8" rx="2"/><rect x="62" y="64" width="36" height="8" rx="2"/><rect x="62" y="76" width="36" height="8" rx="2"/></g>
        <g class="art-battery"><rect x="64" y="44" width="32" height="18" rx="3"/><rect x="96" y="49" width="4" height="8" rx="1"/><rect x="67" y="47" width="8" height="12" class="art-cell c1"/><rect x="77" y="47" width="8" height="12" class="art-cell c2"/><rect x="87" y="47" width="6" height="12" class="art-cell c3"/></g>
        <g class="art-notif"><circle cx="112" cy="18" r="8"/><circle cx="40" cy="40" r="6"/><circle cx="122" cy="62" r="5"/></g>
        <g class="art-leaf"><path d="M26 96 C26 76 40 66 54 64 C52 80 44 92 26 96 Z"/></g>`, `art--phone ${state}`, repaired ? 'A phone resting, battery full' : 'A phone with an endless glowing feed');
    case 'bubbles':
      return wrap(`${ground}
        <g class="art-person p1"><circle cx="40" cy="58" r="11"/><path d="M24 104 C24 82 56 82 56 104 Z"/></g>
        <g class="art-person p2"><circle cx="120" cy="58" r="11"/><path d="M104 104 C104 82 136 82 136 104 Z"/></g>
        <g class="art-bubble b1"><path d="M30 14 h40 a8 8 0 0 1 8 8 v12 a8 8 0 0 1 -8 8 h-26 l-8 8 v-8 h-6 a8 8 0 0 1 -8 -8 v-12 a8 8 0 0 1 8 -8 z"/></g>
        <g class="art-bubble b2"><path d="M90 20 h40 a8 8 0 0 1 8 8 v12 a8 8 0 0 1 -8 8 h-6 v8 l-8 -8 h-26 a8 8 0 0 1 -8 -8 v-12 a8 8 0 0 1 8 -8 z"/></g>
        <g class="art-link"><path d="M60 74 C72 62 88 62 100 74"/></g>
        <g class="art-break"><path d="M74 66 l6 8 l6 -8"/></g>`, `art--bubbles ${state}`, repaired ? 'Two people talking' : 'Two speech bubbles failing to connect');
    case 'palette':
      return wrap(`${ground}
        <g class="art-pal"><path d="M80 16 C120 16 142 44 136 70 C132 88 112 84 104 92 C96 100 104 108 88 108 C50 108 22 84 24 58 C26 34 50 16 80 16 Z"/></g>
        <circle cx="56" cy="44" r="9" class="art-dot d1"/><circle cx="82" cy="34" r="9" class="art-dot d2"/><circle cx="108" cy="46" r="9" class="art-dot d3"/><circle cx="52" cy="72" r="9" class="art-dot d4"/><circle cx="78" cy="80" r="9" class="art-dot d5"/>
        <g class="art-drip"><path d="M56 53 v14 M82 43 v16 M108 55 v12"/></g>`, `art--palette ${state}`, repaired ? 'A palette full of colour' : 'A palette with its colours drained');
    case 'loop':
      return wrap(`${ground}
        <g class="art-loop"><circle cx="80" cy="60" r="40"/><path d="M118 46 l4 -14 l-14 6"/></g>
        <g class="art-hands"><path d="M80 60 V34 M80 60 L98 70"/></g>
        <g class="art-ghost"><circle cx="80" cy="60" r="40"/></g>
        <g class="art-house"><path d="M66 102 V86 L80 76 L94 86 V102 Z"/></g>`, `art--loop ${state}`, repaired ? 'A clock moving forward' : 'A clock stuck in a loop');
    default:
      return '';
  }
}

export function crest(avatarId, size = 44) {
  const a = AVATARS.find((x) => x.id === avatarId) || AVATARS[0];
  return `<svg class="crest" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M24 3 L42 9 V24 C42 35 34 42 24 45 C14 42 6 35 6 24 V9 Z" fill="${a.colour}" stroke="#14130f" stroke-width="2"/>
    <path d="M24 8 L37 12.5 V24 C37 32 31 37.5 24 40 C17 37.5 11 32 11 24 V12.5 Z" fill="none" stroke="rgba(20,19,15,.35)" stroke-width="1.2"/>
    <svg x="13" y="12" width="22" height="22" viewBox="0 0 24 24"><use href="#i-${a.id}" fill="none" stroke="#14130f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></use></svg>
  </svg>`;
}

const HAIR = [
  'M10 22 C10 10 38 8 38 22 C34 16 14 16 10 22 Z',
  'M9 24 C8 8 40 8 39 24 L36 18 C30 12 18 12 12 18 Z',
  'M8 30 C6 8 42 8 40 30 C38 18 36 14 24 14 C12 14 10 18 8 30 Z',
  'M12 18 C14 8 34 8 36 18 L36 14 C30 6 18 6 12 14 Z M30 6 l6 -4 l-2 7 Z',
  'M10 22 C12 6 36 6 38 22 C30 12 18 12 10 22 Z M10 22 C6 26 6 34 10 36 Z',
];

export function teammate(t, size = 52) {
  const tm = typeof t === 'string' ? TEAMMATES.find((x) => x.id === t) : t;
  if (!tm) return '';
  return `<svg class="mate" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="23" fill="${tm.colour}" opacity=".22"/>
    <path d="M8 46 C8 34 40 34 40 46 Z" fill="${tm.colour}"/>
    <circle cx="24" cy="24" r="12" fill="#f0d9b5" stroke="#14130f" stroke-width="1.5"/>
    <path d="${HAIR[tm.hair % HAIR.length]}" fill="#2a241c"/>
    <circle cx="20" cy="25" r="1.6" fill="#14130f"/><circle cx="28" cy="25" r="1.6" fill="#14130f"/>
    <path d="M20 30 C22 32 26 32 28 30" fill="none" stroke="#14130f" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`;
}
