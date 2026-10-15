// Step ESTIMATION from phone accelerometer data: pure functions only (no DOM,
// no clock, no storage). The browser adapter feeds DeviceMotionEvent samples
// (accelerationIncludingGravity x, y, z in m/s², plus a timestamp in ms);
// this module decides how many steps those samples most likely contain.
//
// Browsers have NO standard pedometer API. The count produced here is an
// ESTIMATE and must always be shown as "estimated steps" (source
// 'estimated'). It can under-count (phone in a loose bag, very soft steps)
// and, rarely, over-count (rhythmic non-walking motion such as bouncing a
// phone in a steady rhythm). It never proves exactly what the player did.
//
// How a sample becomes a step (thresholds in STEP below):
//   1. invalid   - non-finite numbers, or a time not later than the previous
//                  sample, are ignored (counted in state.ignored).
//   2. gap       - if no sample arrived for STEP.sampleGapMs (tab hidden,
//                  sensor paused) the filters and the rhythm restart, so a
//                  gap is never bridged.
//   3. spike     - a jump in magnitude above STEP.spikeDeltaMs2, or a
//                  magnitude above STEP.maxMagnitudeMs2 (drop, hard shake,
//                  slap on a table) clears the rhythm and mutes peak
//                  detection for STEP.spikeHoldMs.
//   4. filter    - magnitude sqrt(x²+y²+z²) is used, so the phone's
//                  orientation does not matter. A fast low-pass smooths
//                  sensor noise; a slow low-pass tracks the "baseline"
//                  (gravity plus slow drift). signal = fast - slow.
//   5. peak      - a local maximum of signal at least STEP.minPeakMs2 above
//                  baseline. After a peak the detector is disarmed until the
//                  signal falls back below STEP.rearmMs2, so noise wiggles on
//                  top of one stride are not counted twice.
//   6. rhythm    - the interval since the previous peak must be a plausible
//                  cadence (STEP.minStepIntervalMs to STEP.maxStepIntervalMs)
//                  and close to the streak's average interval
//                  (STEP.regularityTolerance). Otherwise the streak restarts
//                  at this peak.
//   7. confirm   - nothing is counted until STEP.confirmPeaks rhythmic peaks
//                  in a row confirm walking; then all of them are added at
//                  once, and every further rhythmic peak adds one step.
//                  Single bumps, taps and short shuffles therefore never
//                  count.

export const STEP = Object.freeze({
  // Fast low-pass time constant. Cut-off about 1 / (2π · 0.04 s) ≈ 4 Hz:
  // keeps walking and running (1–3.5 Hz) while damping sensor noise.
  lowPassTauMs: 40,
  // Slow low-pass ("baseline") time constant. About 0.16 Hz cut-off, so it
  // follows gravity and slow posture changes but not individual steps
  // (it passes only ~13% of a slow 1.2 Hz walk).
  baselineTauMs: 1000,
  // After the filters (re)start, no peaks are judged for this long while the
  // baseline settles.
  warmUpMs: 500,
  // A step peak must rise at least this far above the baseline. Phone sensor
  // noise at rest is roughly 0.02–0.2 m/s²; walking with a phone in hand or
  // pocket typically swings the magnitude by 1.5–5 m/s².
  minPeakMs2: 1.0,
  // The detector re-arms only once the signal drops back below the baseline
  // (hysteresis), so each stride produces one peak.
  rearmMs2: 0,
  // Fastest plausible cadence 3.5 steps/s (sprinting) -> 285 ms between
  // steps. Faster peaks mean shaking or vibration and restart the streak.
  minStepIntervalMs: 285,
  // Slowest plausible cadence 0.7 steps/s (very slow stroll) -> 1430 ms.
  // Longer gaps break the walking rhythm.
  maxStepIntervalMs: 1430,
  // Each new interval must be within ±30% of the streak's average interval.
  // Real gait varies by ~5–15% step to step; random bumps do not repeat.
  // (Tuned on synthetic data: ±30% kept a walk with ±15% step-timing jitter
  // fully counted while cutting false steps from random handling.)
  regularityTolerance: 0.3,
  // Peaks needed in a row (5 regular intervals) before any are counted.
  // 4 peaks let random handling through about 10x more often in synthetic
  // tests; 6 costs nothing on a real walk because the confirming peaks are
  // added once walking is confirmed.
  confirmPeaks: 6,
  // Peak times remembered for the average interval.
  streakMemory: 8,
  // No sample for this long (tab hidden, sensor paused) restarts everything.
  sampleGapMs: 2000,
  // A change in magnitude this large between two consecutive samples is a
  // drop, impact or violent shake, never a footstep.
  spikeDeltaMs2: 30,
  // Any magnitude above ~5 g is treated as an impact.
  maxMagnitudeMs2: 50,
  // After a spike, peaks are ignored for this long (bounce and ringing).
  spikeHoldMs: 1000,
  // Cadence is computed from counted steps within this recent window.
  cadenceWindowMs: 10_000,
  // Counted step times remembered for cadence.
  recentMemory: 32,
  // Sanity cap for a saved summary (far beyond a 15-minute session).
  maxSavedSteps: 100_000,
});

export const STEP_SOURCES = Object.freeze(['estimated']);

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// Filter and peak-detector fields that restart on pause, gap or reset.
function freshSignal() {
  return {
    lastT: null, // time of the last accepted sample (ms)
    lastMag: null, // magnitude of the last accepted sample (m/s²)
    lp: null, // fast low-pass of magnitude
    base: null, // slow low-pass of magnitude (baseline)
    s1: null, // previous signal value (lp - base)
    s2: null, // signal value before that
    t1: null, // time of s1
    armed: true, // may the next local maximum count as a peak?
    warmUntil: null, // no peaks before this time
    holdUntil: null, // no peaks before this time (after a spike)
    streak: [], // times of rhythmic peaks in the current run
    confirmed: false, // has the current run been confirmed as walking?
    recent: [], // times of counted steps (for cadence)
  };
}

// Plain JSON-able state.
export function createStepCounter() {
  return { v: 1, steps: 0, ignored: 0, spikes: 0, ...freshSignal() };
}

export function stepCount(state) {
  return state && Number.isInteger(state.steps) && state.steps >= 0 ? state.steps : 0;
}

// Clear the in-progress streak and the filter history. The total is kept.
// Use whenever counting stops for a while, so resuming never double counts
// and never joins steps across the gap into one rhythm.
export function resetRhythm(state) {
  return { ...state, ...freshSignal() };
}

// Call when the walk is paused (same effect as resetRhythm).
export function pauseSteps(state) {
  return resetRhythm(state);
}

// Feed one accelerometer sample. Pure: returns a new state and the number of
// steps this sample added (0, 1, or confirmPeaks when a streak is confirmed).
export function addMotion(state, sample) {
  const { t, x, y, z } = sample || {};
  if (![t, x, y, z].every(isNum) || (state.lastT !== null && t <= state.lastT)) {
    return { state: { ...state, ignored: state.ignored + 1 }, stepsAdded: 0 };
  }
  let s = { ...state };
  const mag = Math.hypot(x, y, z);

  // 2. gap: restart filters and rhythm.
  if (s.lastT !== null && t - s.lastT > STEP.sampleGapMs) s = { ...s, ...freshSignal() };

  // First sample after (re)start: seed the filters.
  if (s.lastT === null) {
    return {
      state: { ...s, lastT: t, lastMag: mag, lp: mag, base: mag, warmUntil: t + STEP.warmUpMs },
      stepsAdded: 0,
    };
  }

  // 3. spike: never fed into the filters.
  if (Math.abs(mag - s.lastMag) > STEP.spikeDeltaMs2 || mag > STEP.maxMagnitudeMs2) {
    return {
      state: {
        ...s, lastT: t, lastMag: mag, spikes: s.spikes + 1,
        streak: [], confirmed: false, s1: null, s2: null, t1: null,
        holdUntil: t + STEP.spikeHoldMs,
      },
      stepsAdded: 0,
    };
  }

  // 4. filter (time-based exponential smoothing copes with uneven rates).
  const dt = t - s.lastT;
  const lp = s.lp + (mag - s.lp) * (1 - Math.exp(-dt / STEP.lowPassTauMs));
  const base = s.base + (mag - s.base) * (1 - Math.exp(-dt / STEP.baselineTauMs));
  const sig = lp - base;
  let armed = s.armed || sig < STEP.rearmMs2;
  let stepsAdded = 0;

  // 5. peak at the previous sample?
  if (s.s1 !== null && s.s2 !== null && s.s1 > s.s2 && s.s1 >= sig && s.s1 >= STEP.minPeakMs2 && armed) {
    armed = false; // consumed, even if muted below
    const muted = s.t1 < s.warmUntil || (s.holdUntil !== null && s.t1 < s.holdUntil);
    if (!muted) {
      const r = judgePeak(s, s.t1);
      s = r.state;
      stepsAdded = r.stepsAdded;
    }
  }

  return {
    state: { ...s, lastT: t, lastMag: mag, lp, base, s2: s.s1, s1: sig, t1: t, armed },
    stepsAdded,
  };
}

// 6 and 7: rhythm and confirmation for a peak at time tp.
function judgePeak(s, tp) {
  const restart = { state: { ...s, streak: [tp], confirmed: false }, stepsAdded: 0 };
  const streak = s.streak;
  if (streak.length === 0) return restart;
  const last = streak[streak.length - 1];
  const iv = tp - last;
  if (iv < STEP.minStepIntervalMs || iv > STEP.maxStepIntervalMs) return restart;
  if (streak.length >= 2) {
    const mean = (last - streak[0]) / (streak.length - 1);
    if (Math.abs(iv - mean) > STEP.regularityTolerance * mean) return restart;
  }
  const next = [...streak, tp];
  let added = [];
  let confirmed = s.confirmed;
  if (confirmed) added = [tp];
  else if (next.length >= STEP.confirmPeaks) {
    confirmed = true;
    added = next.slice();
  }
  return {
    state: {
      ...s,
      streak: next.slice(-STEP.streakMemory),
      confirmed,
      steps: s.steps + added.length,
      recent: [...s.recent, ...added].slice(-STEP.recentMemory),
    },
    stepsAdded: added.length,
  };
}

// Recent cadence in steps per minute, or null when there is not enough
// recent counted walking to say.
export function cadence(state) {
  if (!state || state.lastT === null || !Array.isArray(state.recent)) return null;
  const r = state.recent.filter((tp) => state.lastT - tp <= STEP.cadenceWindowMs);
  if (r.length < 3) return null;
  const span = r[r.length - 1] - r[0];
  if (span <= 0) return null;
  return Math.round(((r.length - 1) * 60_000) / span);
}

// Summary suitable for saving.
export function stepSummary(state) {
  return { steps: stepCount(state), source: 'estimated' };
}

// Validate a saved { steps, source } summary. Returns a clean copy or null.
export function sanitizeStepSummary(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  if (!STEP_SOURCES.includes(raw.source)) return null;
  const n = raw.steps;
  if (!Number.isInteger(n) || n < 0 || n > STEP.maxSavedSteps) return null;
  return { steps: n, source: raw.source };
}
