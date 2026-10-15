import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEP, STEP_SOURCES, createStepCounter, addMotion, stepCount, pauseSteps, resetRhythm, cadence,
  stepSummary, sanitizeStepSummary,
} from '../src/js/game/steps.js';

// All accelerometer streams below are SYNTHETIC test signals (no real sensor
// recordings). They use a seeded PRNG so every run is identical.
const G = 9.81;
const T0 = 50_000;

function prng(seed) {
  // mulberry32
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(rand) {
  const u = Math.max(rand(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rand());
}

// Build samples at ~hz with small timing jitter. accel(tSec) returns the
// noise-free [x, y, z]; Gaussian noise (sd `noise` m/s² per axis) is added.
function stream({ seconds, hz = 60, t0 = T0, seed = 1, noise = 0.15, accel }) {
  const rand = prng(seed);
  const out = [];
  const period = 1000 / hz;
  for (let i = 0; i * period < seconds * 1000; i++) {
    const t = t0 + i * period + (rand() - 0.5) * 2; // ±1 ms jitter
    const [x, y, z] = accel((t - t0) / 1000, rand);
    out.push({ t, x: x + gauss(rand) * noise, y: y + gauss(rand) * noise, z: z + gauss(rand) * noise });
  }
  return out;
}

// Gait-like magnitude: gravity + fundamental at the step rate + a small
// second harmonic, applied along unit direction `dir`, plus lateral sway.
function walk({ hz, amp = 2.5, dir = [0, 0, 1] }) {
  return (ts) => {
    const th = 2 * Math.PI * hz * ts;
    const m = G + amp * Math.sin(th) + 0.4 * Math.sin(2 * th + 1);
    const sway = 0.4 * Math.sin(th / 2);
    // sway on an axis perpendicular-ish to dir
    const perp = dir[0] === 0 && dir[1] === 0 ? [1, 0, 0] : [0, 1, 0];
    return [m * dir[0] + sway * perp[0], m * dir[1] + sway * perp[1], m * dir[2] + sway * perp[2]];
  };
}
const still = () => [0, 0, G];

function feed(state, samples) {
  let added = 0;
  for (const smp of samples) {
    const r = addMotion(state, smp);
    state = r.state;
    assert.ok(Number.isInteger(r.stepsAdded) && r.stepsAdded >= 0);
    added += r.stepsAdded;
  }
  assert.equal(stepCount(state), state.steps);
  return { state, added };
}
const within = (got, want, pct) => Math.abs(got - want) <= want * pct;
const report = (label, got, want) => console.log(`# ${label}: counted ${got}, true ${want}, error ${(((got - want) / want) * 100).toFixed(1)}%`);

test('thresholds are frozen and sane', () => {
  assert.ok(Object.isFrozen(STEP));
  assert.deepEqual([...STEP_SOURCES], ['estimated']);
  assert.ok(STEP.minStepIntervalMs < STEP.maxStepIntervalMs);
  assert.ok(Math.abs(1000 / STEP.minStepIntervalMs - 3.5) < 0.05);
  assert.ok(Math.abs(1000 / STEP.maxStepIntervalMs - 0.7) < 0.01);
  assert.ok(STEP.confirmPeaks >= 3);
});

test('new counter starts at zero with no cadence', () => {
  const s = createStepCounter();
  assert.equal(stepCount(s), 0);
  assert.equal(cadence(s), null);
  assert.deepEqual(stepSummary(s), { steps: 0, source: 'estimated' });
});

test('clean 1.8 Hz walk for 60 s counts within ±10% of 108', () => {
  const samples = stream({ seconds: 60, accel: walk({ hz: 1.8 }) });
  const { state, added } = feed(createStepCounter(), samples);
  report('1.8 Hz, 60 s, 60 Hz sampling', added, 108);
  assert.ok(within(added, 108, 0.1), `counted ${added}`);
  const c = cadence(state);
  assert.ok(c !== null && Math.abs(c - 108) <= 6, `cadence ${c} spm`);
});

test('1.8 Hz walk sampled at 50 Hz with lower amplitude and more noise still counts', () => {
  const samples = stream({ seconds: 60, hz: 50, seed: 7, noise: 0.3, accel: walk({ hz: 1.8, amp: 2 }) });
  const { added } = feed(createStepCounter(), samples);
  report('1.8 Hz, amp 2, noise 0.3, 50 Hz sampling', added, 108);
  assert.ok(within(added, 108, 0.1), `counted ${added}`);
});

test('phone lying still counts 0', () => {
  const { state, added } = feed(createStepCounter(), stream({ seconds: 120, seed: 3, noise: 0.2, accel: still }));
  assert.equal(added, 0);
  assert.equal(cadence(state), null);
});

test('shaking at 8 Hz counts 0 (cadence too high)', () => {
  for (const seed of [11, 12, 13]) {
    const samples = stream({
      seconds: 30, seed, accel: (ts, rand) => {
        const a = 3 + rand() * 6; // erratic strength per sample
        return [0.5 * a * Math.sin(2 * Math.PI * 8 * ts + 0.3), 0, G + a * Math.sin(2 * Math.PI * 8 * ts)];
      },
    });
    const { added } = feed(createStepCounter(), samples);
    assert.equal(added, 0, `seed ${seed}`);
  }
});

test('a single bump or tap counts 0', () => {
  const samples = stream({
    seconds: 5, seed: 4, accel: (ts) => {
      const b = ts > 2 && ts < 2.06 ? 8 : 0;
      return [0, 0, G + b];
    },
  });
  assert.equal(feed(createStepCounter(), samples).added, 0);
});

test('isolated bumps every 3 s count 0', () => {
  const samples = stream({
    seconds: 60, seed: 5, accel: (ts) => {
      const ph = ts % 3;
      const b = ph > 1 && ph < 1.08 ? 7 * Math.sin((Math.PI * (ph - 1)) / 0.08) : 0;
      return [0, 0, G + b];
    },
  });
  assert.equal(feed(createStepCounter(), samples).added, 0);
});

test('3 steps then stop counts 0 (streak not confirmed)', () => {
  const hz = 1.8;
  const samples = stream({
    seconds: 10, seed: 6, accel: (ts) => {
      const active = ts >= 1 && ts < 1 + 3 / hz; // exactly three stride cycles
      return [0, 0, G + (active ? 2.5 * Math.sin(2 * Math.PI * hz * (ts - 1)) : 0)];
    },
  });
  assert.equal(feed(createStepCounter(), samples).added, 0);
});

test('confirmPeaks rhythmic steps are confirmed and then added together', () => {
  const hz = 1.8;
  const samples = stream({
    seconds: 10, seed: 6, accel: (ts) => {
      const active = ts >= 1 && ts < 1 + 8 / hz;
      return [0, 0, G + (active ? 2.5 * Math.sin(2 * Math.PI * hz * (ts - 1)) : 0)];
    },
  });
  let s = createStepCounter();
  const adds = [];
  for (const smp of samples) {
    const r = addMotion(s, smp);
    s = r.state;
    if (r.stepsAdded) adds.push(r.stepsAdded);
  }
  assert.equal(adds[0], STEP.confirmPeaks, 'first addition is the whole confirming streak');
  assert.ok(stepCount(s) >= 7 && stepCount(s) <= 8, `counted ${stepCount(s)}`);
});

test('pause mid-walk then resume: no double count, no bridging', () => {
  const hz = 1.8;
  const full = stream({ seconds: 60, seed: 8, accel: walk({ hz }) });
  const continuous = feed(createStepCounter(), full).added;

  // Same walk, paused at 30 s (pauseSteps called twice), resumed 10 s later.
  const first = full.filter((s) => s.t < T0 + 30_000);
  const second = full.filter((s) => s.t >= T0 + 30_000).map((s) => ({ ...s, t: s.t + 10_000 }));
  let { state, added: a1 } = feed(createStepCounter(), first);
  state = pauseSteps(pauseSteps(state));
  assert.equal(stepCount(state), a1, 'pause keeps the total');
  assert.equal(cadence(state), null, 'no cadence across a pause');
  const r2 = feed(state, second);
  assert.equal(stepCount(r2.state), a1 + r2.added);
  assert.ok(stepCount(r2.state) <= continuous, `paused ${stepCount(r2.state)} vs continuous ${continuous}`);
  assert.ok(within(stepCount(r2.state), 108, 0.1), `paused total ${stepCount(r2.state)}`);

  // No bridging: 3 steps, pause, then 3 steps continuing the exact rhythm.
  // Without the pause these 6 peaks confirm; with it, nothing counts.
  const beat = (startS, n) => (ts) => [0, 0, G + (ts >= startS && ts < startS + n / hz ? 2.5 * Math.sin(2 * Math.PI * hz * (ts - startS)) : 0)];
  const pre = stream({ seconds: 1 + 3 / hz, seed: 9, accel: beat(1, 3) });
  const post = stream({ seconds: 4, seed: 10, t0: pre[pre.length - 1].t + 16, accel: beat(0, 3) });
  const joined = feed(feed(createStepCounter(), pre).state, post).added;
  let p = feed(createStepCounter(), pre).state;
  p = resetRhythm(p);
  assert.equal(feed(p, post).added, 0, 'pause is not bridged');
  assert.equal(joined, STEP.confirmPeaks, 'control: without the pause the same peaks do count');
});

test('a gap in samples longer than sampleGapMs is not bridged', () => {
  const hz = 1.8;
  const beat = (n) => (ts) => [0, 0, G + (ts < n / hz ? 2.5 * Math.sin(2 * Math.PI * hz * ts) : 0)];
  const pre = stream({ seconds: 3 / hz + 0.05, seed: 14, accel: beat(3) });
  const post = stream({ seconds: 3, seed: 15, t0: pre[pre.length - 1].t + STEP.sampleGapMs + 100, accel: beat(3) });
  const r = feed(feed(createStepCounter(), pre).state, post);
  assert.equal(r.added, 0);
});

test('random handling (white-noise jostling) rarely produces steps', () => {
  // Not a guarantee: rhythmic-looking chance peaks can occasionally confirm.
  // Bound: under 3 false steps per 2 minutes on average across 10 runs.
  let total = 0;
  for (let seed = 30; seed < 40; seed++) {
    const samples = stream({
      seconds: 120, seed, noise: 0, accel: (ts, rand) => [(rand() - 0.5) * 7, (rand() - 0.5) * 7, G + (rand() - 0.5) * 7],
    });
    total += feed(createStepCounter(), samples).added;
  }
  console.log(`# white-noise jostling: ${total} false steps over 10 x 120 s`);
  assert.ok(total / 10 < 3, `false steps ${total}`);
});

test('a drop spike adds no steps', () => {
  const samples = stream({
    seconds: 6, seed: 16, accel: (ts) => {
      if (ts >= 2 && ts < 2.3) return [0, 0, 0.2]; // free fall
      if (ts >= 2.3 && ts < 2.34) return [20, 15, 60]; // impact
      if (ts >= 2.34 && ts < 2.8) return [0, 0, G + 8 * Math.exp(-(ts - 2.34) * 6) * Math.sin(2 * Math.PI * 12 * ts)]; // ringing
      return [0, 0, G];
    },
  });
  const { state, added } = feed(createStepCounter(), samples);
  assert.equal(added, 0);
  assert.ok(state.spikes >= 1, 'spike recorded');

  // A drop in the middle of a walk never adds steps beyond the clean walk.
  const clean = stream({ seconds: 20, seed: 17, accel: walk({ hz: 1.8 }) });
  const dropped = clean.map((s) => (s.t > T0 + 10_000 && s.t < T0 + 10_040 ? { ...s, z: 70 } : s));
  const c = feed(createStepCounter(), clean).added;
  const d = feed(createStepCounter(), dropped).added;
  assert.ok(d <= c, `dropped ${d} vs clean ${c}`);
});

test('orientation does not matter (magnitude is used)', () => {
  const dirs = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.6, 0, 0.8], [0.577, 0.577, 0.577]];
  for (const dir of dirs) {
    const { added } = feed(createStepCounter(), stream({ seconds: 60, seed: 18, accel: walk({ hz: 1.8, dir }) }));
    report(`1.8 Hz along [${dir}]`, added, 108);
    assert.ok(within(added, 108, 0.1), `dir ${dir}: ${added}`);
  }
});

test('slow walk at 1.2 Hz counts', () => {
  const { added } = feed(createStepCounter(), stream({ seconds: 60, seed: 19, accel: walk({ hz: 1.2, amp: 2 }) }));
  report('1.2 Hz, 60 s', added, 72);
  assert.ok(within(added, 72, 0.1), `counted ${added}`);
});

test('running at 3 Hz counts', () => {
  const { state, added } = feed(createStepCounter(), stream({ seconds: 60, seed: 20, accel: walk({ hz: 3, amp: 5 }) }));
  report('3 Hz, 60 s', added, 180);
  assert.ok(within(added, 180, 0.1), `counted ${added}`);
  const c = cadence(state);
  assert.ok(c !== null && Math.abs(c - 180) <= 10, `cadence ${c}`);
});

test('out-of-order, duplicate, NaN and malformed samples are ignored', () => {
  let s = createStepCounter();
  s = addMotion(s, { t: 1000, x: 0, y: 0, z: G }).state;
  const snap = JSON.stringify({ ...s, ignored: 0 });
  const bad = [
    { t: 999, x: 0, y: 0, z: G },
    { t: 1000, x: 0, y: 0, z: G },
    { t: 1010, x: NaN, y: 0, z: G },
    { t: 1010, x: 0, y: Infinity, z: G },
    { t: '1010', x: 0, y: 0, z: G },
    { t: 1010, x: 0, y: 0 },
    null,
    undefined,
  ];
  for (const b of bad) {
    const r = addMotion(s, b);
    assert.equal(r.stepsAdded, 0);
    s = r.state;
  }
  assert.equal(s.ignored, bad.length);
  assert.equal(JSON.stringify({ ...s, ignored: 0 }), snap, 'nothing but the ignored counter changed');

  // A walk with garbage interleaved still counts the same as without it.
  const clean = stream({ seconds: 30, seed: 21, accel: walk({ hz: 1.8 }) });
  const noisy = [];
  clean.forEach((smp, i) => {
    noisy.push(smp);
    if (i % 7 === 0) noisy.push({ ...smp, x: NaN });
    if (i % 11 === 0) noisy.push({ ...smp, t: smp.t - 50 });
  });
  assert.equal(feed(createStepCounter(), noisy).added, feed(createStepCounter(), clean).added);
});

test('addMotion does not mutate its input state', () => {
  const s0 = createStepCounter();
  const before = JSON.stringify(s0);
  let s = s0;
  for (const smp of stream({ seconds: 5, seed: 22, accel: walk({ hz: 1.8 }) })) s = addMotion(s, smp).state;
  assert.equal(JSON.stringify(s0), before);
});

test('state survives a JSON round trip mid-walk', () => {
  const samples = stream({ seconds: 40, seed: 23, accel: walk({ hz: 1.8 }) });
  const half = Math.floor(samples.length / 2);
  const a = feed(createStepCounter(), samples).state;
  let b = feed(createStepCounter(), samples.slice(0, half)).state;
  b = JSON.parse(JSON.stringify(b));
  b = feed(b, samples.slice(half)).state;
  assert.equal(stepCount(b), stepCount(a));
  assert.deepEqual(b, a);
});

test('sanitizeStepSummary accepts valid summaries and rejects junk', () => {
  assert.deepEqual(sanitizeStepSummary({ steps: 0, source: 'estimated' }), { steps: 0, source: 'estimated' });
  assert.deepEqual(sanitizeStepSummary({ steps: 240, source: 'estimated', extra: 'x' }), { steps: 240, source: 'estimated' });
  const junk = [
    null, undefined, 0, 'x', [], [240],
    { steps: 240 },
    { steps: 240, source: 'pedometer' },
    { steps: 240, source: 'real' },
    { steps: -1, source: 'estimated' },
    { steps: 2.5, source: 'estimated' },
    { steps: NaN, source: 'estimated' },
    { steps: Infinity, source: 'estimated' },
    { steps: '240', source: 'estimated' },
    { steps: STEP.maxSavedSteps + 1, source: 'estimated' },
  ];
  for (const j of junk) assert.equal(sanitizeStepSummary(j), null, JSON.stringify(j));
  // Round trip of a real summary.
  const s = feed(createStepCounter(), stream({ seconds: 20, seed: 24, accel: walk({ hz: 1.8 }) })).state;
  assert.deepEqual(sanitizeStepSummary(JSON.parse(JSON.stringify(stepSummary(s)))), stepSummary(s));
});
