// Optional sound, OFF by default and remembered in settings. Short, quiet,
// slightly varied arcade and glitch tones synthesised with the Web Audio API
// (no files to download). Audio starts only after a player action.

let ctx = null;
let enabled = false;
let master = null;

export function audioSupported() {
  return typeof window !== 'undefined' && Boolean(window.AudioContext || window.webkitAudioContext);
}

export function setSoundEnabled(on) {
  enabled = Boolean(on) && audioSupported();
  if (enabled && !ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.55;
    master.connect(ctx.destination);
  }
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function soundEnabled() {
  return enabled;
}

const vary = (f) => f * (1 + (Math.random() - 0.5) * 0.03); // tiny detune so repeats never sound identical

function tone(freq, start, dur, { type = 'sine', gain = 0.06, slideTo = null } = {}) {
  const t = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(vary(freq), t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

function noise(start, dur, gain = 0.03) {
  const t = ctx.currentTime + start;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.7 ? 1 : 0.2);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const g = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 2400 + Math.random() * 1600;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const PAD_NOTES = [392, 494, 587, 698];

const SOUNDS = {
  tap: () => tone(720, 0, 0.05, { type: 'square', gain: 0.018 }),
  select: () => { tone(520, 0, 0.07, { type: 'triangle', gain: 0.04 }); tone(780, 0.05, 0.08, { type: 'triangle', gain: 0.035 }); },
  open: () => { tone(440, 0, 0.09, { type: 'triangle', gain: 0.035 }); tone(660, 0.06, 0.1, { type: 'triangle', gain: 0.03 }); },
  start: () => { tone(330, 0, 0.12, { type: 'square', gain: 0.03, slideTo: 660 }); tone(990, 0.12, 0.12, { type: 'triangle', gain: 0.04 }); },
  hit: () => tone(880, 0, 0.07, { type: 'triangle', gain: 0.05 }),
  step: () => tone(260, 0, 0.08, { type: 'square', gain: 0.03 }),
  miss: () => { noise(0, 0.08, 0.025); tone(180, 0, 0.1, { type: 'sawtooth', gain: 0.02 }); },
  glitch: () => { noise(0, 0.12, 0.03); tone(1200, 0.02, 0.05, { type: 'square', gain: 0.015, slideTo: 300 }); },
  part: () => { tone(587, 0, 0.14); tone(880, 0.09, 0.2); },
  win: () => { [523, 659, 784].forEach((f, i) => tone(f, i * 0.08, 0.22, { type: 'triangle', gain: 0.045 })); },
  xp: () => { tone(1318, 0, 0.1, { type: 'triangle', gain: 0.035 }); tone(1760, 0.06, 0.14, { type: 'triangle', gain: 0.03 }); },
  repair: () => { noise(0, 0.25, 0.02); [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12 + i * 0.09, 0.4, { gain: 0.045 })); },
  unlock: () => { tone(660, 0, 0.1, { type: 'square', gain: 0.025 }); tone(990, 0.1, 0.18, { type: 'triangle', gain: 0.04 }); tone(1320, 0.2, 0.22, { type: 'triangle', gain: 0.03 }); },
  level: () => { [523, 659, 784, 1047, 1318].forEach((f, i) => tone(f, i * 0.07, 0.3, { type: 'triangle', gain: 0.04 })); },
  victory: () => { [392, 523, 659, 784, 1047, 1318].forEach((f, i) => tone(f, i * 0.12, 0.6, { gain: 0.05 })); },
  error: () => { tone(220, 0, 0.12, { type: 'square', gain: 0.03 }); tone(165, 0.1, 0.16, { type: 'square', gain: 0.03 }); },
  pad0: () => tone(PAD_NOTES[0], 0, 0.3, { type: 'triangle', gain: 0.05 }),
  pad1: () => tone(PAD_NOTES[1], 0, 0.3, { type: 'triangle', gain: 0.05 }),
  pad2: () => tone(PAD_NOTES[2], 0, 0.3, { type: 'triangle', gain: 0.05 }),
  pad3: () => tone(PAD_NOTES[3], 0, 0.3, { type: 'triangle', gain: 0.05 }),
};

export function play(name) {
  if (!enabled || !ctx || !SOUNDS[name]) return;
  try {
    SOUNDS[name]();
  } catch {
    /* sound is optional */
  }
}
