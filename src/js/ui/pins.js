// One marker family for the whole game: same pin silhouette, different fill,
// glyph and label per state, so state never depends on colour alone.

const GLYPH = {
  LOCKED: 'lock',
  AVAILABLE: 'glitch',
  ACTIVE: 'wrench',
  PHYSICAL_COMPLETE: 'steps',
  DIGITAL_COMPLETE: 'bolt',
  READY: 'wrench',
  REPAIRED: 'check',
  DAILY: 'star',
  RALLY: 'squad',
};

export const STATE_LABEL = {
  LOCKED: 'Locked',
  AVAILABLE: 'Glitching',
  ACTIVE: 'Repair in progress',
  PHYSICAL_COMPLETE: 'Physical done',
  DIGITAL_COMPLETE: 'Digital done',
  READY: 'Ready to repair',
  REPAIRED: 'Repaired',
  DAILY: 'Daily challenge',
  RALLY: 'Squad Rally',
};

export const STATE_ICON = {
  LOCKED: 'lock',
  AVAILABLE: 'glitch',
  ACTIVE: 'wrench',
  PHYSICAL_COMPLETE: 'steps',
  DIGITAL_COMPLETE: 'bolt',
  READY: 'wrench',
  REPAIRED: 'seal',
  DAILY: 'star',
  RALLY: 'squad',
};

export function pinSVG(state) {
  const glyph = GLYPH[state] || 'glitch';
  return `<svg class="pin-svg pin--${state}" viewBox="0 0 40 52" aria-hidden="true" focusable="false">
    <path class="pin-body" d="M20 50.5C20 50.5 3.5 31.5 3.5 18.5a16.5 16.5 0 0 1 33 0C36.5 31.5 20 50.5 20 50.5z"/>
    <circle class="pin-face" cx="20" cy="18.5" r="11.5"/>
    <circle class="pin-ring" cx="20" cy="18.5" r="14.5"/>
    <svg class="pin-glyph" x="10.5" y="9" width="19" height="19" viewBox="0 0 24 24"><use href="#i-${glyph}"></use></svg>
  </svg>`;
}
