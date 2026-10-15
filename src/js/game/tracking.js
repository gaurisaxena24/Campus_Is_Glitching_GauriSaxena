// GPS walk tracking: pure functions only (no DOM, no clock, no storage).
// Shared by the browser adapter (ui/geo.js), the reducer and the unit tests.
//
// How a reading is judged (thresholds in GPS below):
//   1. invalid  - missing or out-of-range numbers are ignored.
//   2. stale    - the reading is older than GPS.staleMs (a cached fix), or not
//                 newer than the last accepted reading.
//   3. weak     - reported accuracy is worse than GPS.maxAccuracyM.
//   4. jump     - moving from the last accepted point would need a speed above
//                 GPS.maxSpeedMps (faster than a sprint). After
//                 GPS.jumpResetCount jumps in a row the game re-anchors at the
//                 new point WITHOUT adding distance (the earlier fix was wrong).
//   5. still    - the move is smaller than the noise radius
//                 max(GPS.minStepM, average accuracy of the two points). This
//                 stops a phone lying still from "walking" through GPS drift.
//                 The anchor is kept, so slow walking still adds up once it
//                 leaves the noise radius.
//   6. moved    - the distance is added. Movement time is added only when the
//                 segment is short enough to trust (GPS.maxSegmentMs) and the
//                 speed is at least walking-ish (GPS.movingMinSpeedMps).
//
// Distance is an ESTIMATE. It usually under-counts (drift filtering), and it
// never proves exactly what the player did.
//
// Pausing or stopping clears the anchor, so distance is never counted across
// a pause, a reload or a gap in tracking.

export const GPS = Object.freeze({
  maxAccuracyM: 35,
  staleMs: 15_000,
  noFixMs: 20_000,
  maxSpeedMps: 7,
  minStepM: 8,
  movingMinSpeedMps: 0.4,
  maxSegmentMs: 30_000,
  jumpResetCount: 3,
  reliableSamples: 5,
});

// Frozen Character's documented two-minute walk.
// Verified when BOTH: at least minActiveMs of tracked (not paused) time, AND
//   - if the motion sensor is delivering data: the mission's step target in
//     ESTIMATED steps (game/steps.js). GPS is then context only.
//   - if there is no motion data (unsupported, refused, or silent): at least
//     minDistanceM of filtered GPS distance from minSamples good readings.
// Time alone never verifies the walk.
export const WALK = Object.freeze({ minActiveMs: 120_000, minDistanceM: 60, minSamples: 5, stepTarget: 150 });

// Motion sensor status for the walk: none (not asked), pending (listening,
// no data yet), active (estimated steps arriving), unavailable, denied.
export const MOTION = Object.freeze(['none', 'pending', 'active', 'unavailable', 'denied']);

export const TRACK = Object.freeze({ IDLE: 'IDLE', TRACKING: 'TRACKING', PAUSED: 'PAUSED', STOPPED: 'STOPPED' });
export const SOURCES = Object.freeze(['device', 'simulator']);
const REJECT_KEYS = ['invalid', 'stale', 'weak', 'jump'];

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// Great-circle distance in metres (haversine, mean Earth radius).
export function distanceM(a, b) {
  const R = 6371008.8;
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

function emptyRejected() {
  return { invalid: 0, stale: 0, weak: 0, jump: 0 };
}

export function createTrack(source = 'device') {
  return {
    status: TRACK.IDLE,
    source: SOURCES.includes(source) ? source : 'device',
    startedAt: null,
    resumedAt: null,
    activeMs: 0,
    distanceM: 0,
    movingMs: 0,
    good: 0,
    steps: 0,
    motion: 'none',
    rejected: emptyRejected(),
    // In memory only, never saved:
    anchor: null,
    lastFix: null,
    jumpRun: 0,
  };
}

export function activeMs(t, now) {
  return t.activeMs + (t.status === TRACK.TRACKING && isNum(t.resumedAt) ? Math.max(0, now - t.resumedAt) : 0);
}

// Starting from IDLE or STOPPED always begins a fresh attempt (distance 0).
export function startTrack(t, now) {
  if (t.status === TRACK.TRACKING) return t;
  if (t.status === TRACK.PAUSED) return resumeTrack(t, now);
  return { ...createTrack(t.source), motion: t.motion, status: TRACK.TRACKING, startedAt: now, resumedAt: now };
}

export function pauseTrack(t, now) {
  if (t.status !== TRACK.TRACKING) return t;
  return { ...t, status: TRACK.PAUSED, activeMs: activeMs(t, now), resumedAt: null, anchor: null, jumpRun: 0 };
}

export function resumeTrack(t, now) {
  if (t.status !== TRACK.PAUSED) return t;
  return { ...t, status: TRACK.TRACKING, resumedAt: now, anchor: null, lastFix: null, jumpRun: 0 };
}

export function stopTrack(t, now) {
  if (t.status !== TRACK.TRACKING && t.status !== TRACK.PAUSED) return t;
  return { ...t, status: TRACK.STOPPED, activeMs: activeMs(t, now), resumedAt: null, anchor: null, jumpRun: 0 };
}

export function validSample(s) {
  return Boolean(s) && isNum(s.lat) && isNum(s.lon) && isNum(s.accuracy) && isNum(s.timestamp) &&
    Math.abs(s.lat) <= 90 && Math.abs(s.lon) <= 180 && s.accuracy > 0;
}

function reject(t, key, fix) {
  return { track: { ...t, lastFix: fix || t.lastFix, rejected: { ...t.rejected, [key]: t.rejected[key] + 1 } }, verdict: key };
}

// Feed one reading. Returns { track, verdict }.
export function addSample(t, s, now) {
  if (t.status !== TRACK.TRACKING) return { track: t, verdict: 'ignored' };
  if (!validSample(s)) return reject(t, 'invalid');
  const fix = { lat: s.lat, lon: s.lon, accuracy: s.accuracy, timestamp: s.timestamp, receivedAt: now };
  if (now - s.timestamp > GPS.staleMs || (t.anchor && s.timestamp <= t.anchor.timestamp)) return reject(t, 'stale', fix);
  if (s.accuracy > GPS.maxAccuracyM) return reject(t, 'weak', fix);

  const base = { ...t, lastFix: fix };
  if (!t.anchor) return { track: { ...base, anchor: fix, good: t.good + 1, jumpRun: 0 }, verdict: 'anchor' };

  const d = distanceM(t.anchor, fix);
  const dtMs = s.timestamp - t.anchor.timestamp;
  const speed = d / (dtMs / 1000);
  if (speed > GPS.maxSpeedMps) {
    const run = t.jumpRun + 1;
    if (run >= GPS.jumpResetCount) return { track: { ...base, anchor: fix, jumpRun: 0, good: t.good + 1 }, verdict: 'reanchor' };
    const r = reject({ ...base, jumpRun: run }, 'jump');
    return r;
  }
  const noise = Math.max(GPS.minStepM, (t.anchor.accuracy + fix.accuracy) / 2);
  if (d < noise) return { track: { ...base, good: t.good + 1, jumpRun: 0 }, verdict: 'still' };

  const moving = dtMs <= GPS.maxSegmentMs && speed >= GPS.movingMinSpeedMps;
  return {
    track: {
      ...base,
      anchor: fix,
      good: t.good + 1,
      jumpRun: 0,
      distanceM: t.distanceM + d,
      movingMs: t.movingMs + (moving ? dtMs : 0),
    },
    verdict: 'moved',
  };
}

// Signal status for the panel. `error` is the last adapter error code, if any.
export function signalState(t, now, error = null) {
  if (error) return error;
  if (t.status !== TRACK.TRACKING) return t.status.toLowerCase();
  if (!t.lastFix) return isNum(t.resumedAt) && now - t.resumedAt > GPS.noFixMs ? 'timeout' : 'searching';
  if (now - t.lastFix.receivedAt > GPS.staleMs) return 'stale';
  if (t.lastFix.accuracy > GPS.maxAccuracyM) return 'weak';
  return 'good';
}

export function movingTimeReliable(t) {
  return t.good >= GPS.reliableSamples;
}

// ---------- the saved form (no coordinates, ever) ----------

export function summarize(t, now) {
  return {
    status: t.status,
    source: t.source,
    startedAt: t.startedAt,
    activeMs: Math.round(activeMs(t, now)),
    distanceM: Math.round(t.distanceM * 10) / 10,
    movingMs: Math.round(t.movingMs),
    good: t.good,
    steps: t.steps,
    motion: t.motion,
    rejected: { ...t.rejected },
  };
}

export function sanitizeSummary(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!Object.values(TRACK).includes(raw.status) || !SOURCES.includes(raw.source)) return null;
  const n = (v, max) => (isNum(v) && v >= 0 && v <= max ? v : null);
  const act = n(raw.activeMs, 24 * 3600_000);
  const dist = n(raw.distanceM, 100_000);
  const mov = n(raw.movingMs, 24 * 3600_000);
  const good = Number.isInteger(raw.good) && raw.good >= 0 ? raw.good : null;
  if (act === null || dist === null || mov === null || good === null) return null;
  const rejected = emptyRejected();
  for (const k of REJECT_KEYS) {
    const v = raw.rejected && raw.rejected[k];
    if (Number.isInteger(v) && v >= 0) rejected[k] = v;
  }
  const steps = raw.steps === undefined ? 0 : Number.isInteger(raw.steps) && raw.steps >= 0 && raw.steps <= 100_000 ? raw.steps : null;
  if (steps === null) return null;
  const motion = MOTION.includes(raw.motion) ? (raw.motion === 'pending' ? 'unavailable' : raw.motion) : 'none';
  return {
    status: raw.status,
    source: raw.source,
    startedAt: isNum(raw.startedAt) ? raw.startedAt : null,
    activeMs: act,
    distanceM: dist,
    movingMs: Math.min(mov, act),
    good,
    steps,
    motion,
    rejected,
  };
}

// Rebuild an in-memory track from a saved summary. A walk that was being
// tracked when the page closed comes back PAUSED: the watcher is gone, and the
// time while the page was closed is not counted.
export function restoreTrack(summary) {
  const s = sanitizeSummary(summary);
  if (!s) return createTrack();
  return {
    ...createTrack(s.source),
    ...s,
    status: s.status === TRACK.TRACKING ? TRACK.PAUSED : s.status,
    resumedAt: null,
  };
}

// Which signal verifies this walk: estimated steps when motion data flows, GPS otherwise.
export function walkBasis(summary) {
  return summary && summary.motion === 'active' ? 'steps' : 'gps';
}

export function walkMet(summary, stepTarget = WALK.stepTarget) {
  if (!summary || summary.activeMs < WALK.minActiveMs) return false;
  if (walkBasis(summary) === 'steps') return (summary.steps || 0) >= stepTarget;
  return summary.distanceM >= WALK.minDistanceM && summary.good >= WALK.minSamples;
}

export function walkProgress(summary, stepTarget = WALK.stepTarget) {
  if (!summary) return { time: 0, distance: 0, steps: 0, basis: 'gps', met: false };
  return {
    time: Math.min(1, summary.activeMs / WALK.minActiveMs),
    distance: Math.min(1, summary.distanceM / WALK.minDistanceM),
    steps: Math.min(1, (summary.steps || 0) / stepTarget),
    basis: walkBasis(summary),
    met: walkMet(summary, stepTarget),
  };
}

// Add estimated steps (from game/steps.js) to a tracking walk. Ignored unless tracking.
export function addSteps(t, n) {
  if (t.status !== TRACK.TRACKING || !(n > 0)) return t;
  return { ...t, steps: t.steps + n };
}

export function setMotion(t, motion) {
  return MOTION.includes(motion) && t.motion !== motion ? { ...t, motion } : t;
}
