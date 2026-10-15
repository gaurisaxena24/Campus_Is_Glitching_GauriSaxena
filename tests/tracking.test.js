import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GPS, WALK, TRACK, distanceM, createTrack, startTrack, pauseTrack, resumeTrack, stopTrack, addSample, activeMs,
  signalState, summarize, sanitizeSummary, restoreTrack, walkMet, walkProgress, movingTimeReliable, addSteps, setMotion,
} from '../src/js/game/tracking.js';

// Test-only positions around an arbitrary origin (0,0). These are not campus
// coordinates. 1 degree of latitude is about 111,195 m.
const M_PER_DEG = 111_195;
const at = (northM, t, accuracy = 5) => ({ lat: northM / M_PER_DEG, lon: 0, accuracy, timestamp: t });
const T0 = 1_000_000;

function feed(track, samples) {
  const verdicts = [];
  for (const s of samples) {
    const r = addSample(track, s, s.timestamp);
    track = r.track;
    verdicts.push(r.verdict);
  }
  return { track, verdicts };
}

test('haversine distance: known values', () => {
  assert.equal(distanceM({ lat: 0, lon: 0 }, { lat: 0, lon: 0 }), 0);
  const d = distanceM({ lat: 0, lon: 0 }, { lat: 1, lon: 0 });
  assert.ok(Math.abs(d - 111_195) < 5, `1 degree latitude = ${d}`);
  const e = distanceM({ lat: 0, lon: 0 }, { lat: 0, lon: 0.001 });
  assert.ok(Math.abs(e - 111.2) < 0.5, `0.001 degree longitude at equator = ${e}`);
  // Symmetric
  assert.equal(distanceM({ lat: 18.5, lon: 73.7 }, { lat: 18.51, lon: 73.71 }), distanceM({ lat: 18.51, lon: 73.71 }, { lat: 18.5, lon: 73.7 }));
});

test('valid walking accumulates distance and movement time', () => {
  let t = startTrack(createTrack(), T0);
  // 1.4 m/s, one reading every 5 s, for 60 s
  const samples = Array.from({ length: 13 }, (_, i) => at(i * 7, T0 + i * 5000));
  const r = feed(t, samples);
  assert.equal(r.verdicts[0], 'anchor');
  assert.ok(Math.abs(r.track.distanceM - 84) < 1, `distance ${r.track.distanceM}`);
  assert.ok(r.track.movingMs > 0);
  assert.equal(r.track.good, 13);
});

test('stationary drift inside the accuracy radius never counts as movement', () => {
  let t = startTrack(createTrack(), T0);
  // Jitter of up to 9 m around one spot with 12 m accuracy, for 2 minutes
  const jitter = [0, 6, -4, 9, -7, 3, 8, -9, 5, -2, 7, -6, 4, -8, 9, -3, 2, -5, 6, -1, 0, 8, -4, 5];
  const samples = jitter.map((j, i) => at(j, T0 + i * 5000, 12));
  const r = feed(t, samples);
  assert.equal(r.track.distanceM, 0);
  assert.equal(r.track.movingMs, 0);
  assert.ok(r.verdicts.slice(1).every((v) => v === 'still'));
});

test('weak, stale, invalid and out-of-order readings are rejected', () => {
  let t = startTrack(createTrack(), T0);
  t = addSample(t, at(0, T0), T0).track;
  let r = addSample(t, at(50, T0 + 5000, GPS.maxAccuracyM + 1), T0 + 5000);
  assert.equal(r.verdict, 'weak');
  assert.equal(r.track.distanceM, 0);
  assert.equal(r.track.lastFix.accuracy, GPS.maxAccuracyM + 1, 'weak fix is still shown as current accuracy');
  r = addSample(t, at(50, T0), T0 + GPS.staleMs + 1);
  assert.equal(r.verdict, 'stale');
  r = addSample(t, at(50, T0 - 1000), T0 + 1000);
  assert.equal(r.verdict, 'stale', 'older than the anchor');
  r = addSample(t, { lat: NaN, lon: 0, accuracy: 5, timestamp: T0 + 1 }, T0 + 1);
  assert.equal(r.verdict, 'invalid');
  r = addSample(t, { lat: 95, lon: 0, accuracy: 5, timestamp: T0 + 1 }, T0 + 1);
  assert.equal(r.verdict, 'invalid');
  assert.equal(r.track.rejected.invalid, 1);
});

test('impossible jumps are ignored, and repeated jumps re-anchor without adding distance', () => {
  let t = startTrack(createTrack(), T0);
  t = addSample(t, at(0, T0), T0).track;
  let r = addSample(t, at(500, T0 + 5000), T0 + 5000); // 100 m/s
  assert.equal(r.verdict, 'jump');
  assert.equal(r.track.distanceM, 0);
  r = addSample(r.track, at(14, T0 + 10_000), T0 + 10_000); // back to a sane walk
  assert.equal(r.verdict, 'moved');
  assert.ok(Math.abs(r.track.distanceM - 14) < 0.5);
  // A genuinely moved fix (e.g. GPS corrected itself) repeated 3 times
  let u = r.track;
  const v = [];
  for (let k = 1; k <= GPS.jumpResetCount; k++) {
    const x = addSample(u, at(2000, T0 + 10_000 + k * 1000), T0 + 10_000 + k * 1000);
    u = x.track;
    v.push(x.verdict);
  }
  assert.deepEqual(v, ['jump', 'jump', 'reanchor']);
  assert.ok(Math.abs(u.distanceM - 14) < 0.5, 're-anchoring adds no distance');
});

test('pause stops counting; resume does not bridge the gap or double count', () => {
  let t = startTrack(createTrack(), T0);
  t = feed(t, [at(0, T0), at(10, T0 + 5000)]).track;
  const before = t.distanceM;
  t = pauseTrack(t, T0 + 10_000);
  assert.equal(t.status, TRACK.PAUSED);
  assert.equal(activeMs(t, T0 + 60_000), 10_000, 'paused time is not active time');
  assert.equal(addSample(t, at(100, T0 + 20_000), T0 + 20_000).verdict, 'ignored');
  t = resumeTrack(t, T0 + 60_000);
  t = resumeTrack(t, T0 + 61_000); // resuming twice is a no-op
  assert.equal(t.resumedAt, T0 + 60_000);
  // The first fix after resume is a new anchor, 300 m away: no distance added.
  const r = addSample(t, at(310, T0 + 62_000), T0 + 62_000);
  assert.equal(r.verdict, 'anchor');
  assert.equal(r.track.distanceM, before);
  assert.equal(activeMs(r.track, T0 + 72_000), 22_000);
});

test('stop then start begins a fresh attempt; start while tracking is a no-op', () => {
  let t = startTrack(createTrack(), T0);
  t = feed(t, [at(0, T0), at(20, T0 + 5000)]).track;
  assert.equal(startTrack(t, T0 + 6000), t);
  t = stopTrack(t, T0 + 10_000);
  assert.equal(t.status, TRACK.STOPPED);
  assert.ok(t.distanceM > 0, 'stopped attempt keeps its result');
  const fresh = startTrack(t, T0 + 20_000);
  assert.equal(fresh.distanceM, 0);
  assert.equal(fresh.activeMs, 0);
  assert.equal(fresh.status, TRACK.TRACKING);
});

test('signal state: searching, timeout, good, weak, stale, paused', () => {
  let t = startTrack(createTrack(), T0);
  assert.equal(signalState(t, T0 + 1000), 'searching');
  assert.equal(signalState(t, T0 + GPS.noFixMs + 1), 'timeout');
  assert.equal(signalState(t, T0 + 1000, 'denied'), 'denied');
  t = addSample(t, at(0, T0 + 1000), T0 + 1000).track;
  assert.equal(signalState(t, T0 + 2000), 'good');
  assert.equal(signalState(t, T0 + 1000 + GPS.staleMs + 1), 'stale');
  t = addSample(t, at(0, T0 + 3000, 80), T0 + 3000).track;
  assert.equal(signalState(t, T0 + 3500), 'weak');
  assert.equal(signalState(pauseTrack(t, T0 + 4000), T0 + 5000), 'paused');
});

test('the walk rule needs 2 minutes, 60 m and enough good readings', () => {
  const ok = { activeMs: WALK.minActiveMs, distanceM: WALK.minDistanceM, good: WALK.minSamples };
  assert.equal(walkMet(ok), true);
  assert.equal(walkMet({ ...ok, activeMs: WALK.minActiveMs - 1 }), false, 'time alone is not enough');
  assert.equal(walkMet({ ...ok, distanceM: 59.9 }), false, 'timer ran out but too little movement');
  assert.equal(walkMet({ ...ok, good: 2 }), false, 'too few reliable readings');
  assert.equal(walkMet(null), false);
  assert.deepEqual(walkProgress({ activeMs: 60_000, distanceM: 30, good: 9, steps: 75 }), { time: 0.5, distance: 0.5, steps: 0.5, basis: 'gps', met: false });
});

test('a full simulated 2-minute walk meets the rule; a still phone for 2 minutes does not', () => {
  let walk = startTrack(createTrack(), T0);
  walk = feed(walk, Array.from({ length: 26 }, (_, i) => at(i * 5, T0 + i * 5000))).track; // 1 m/s
  assert.equal(walkMet(summarize(walk, T0 + 125_000)), true);
  assert.equal(movingTimeReliable(walk), true);

  let still = startTrack(createTrack(), T0);
  still = feed(still, Array.from({ length: 26 }, (_, i) => at((i % 3) * 3, T0 + i * 5000, 10))).track;
  assert.equal(walkMet(summarize(still, T0 + 125_000)), false);
});

test('saved summaries contain no coordinates and are validated on load', () => {
  let t = startTrack(createTrack(), T0);
  t = feed(t, [at(0, T0), at(20, T0 + 5000)]).track;
  const s = summarize(t, T0 + 6000);
  const json = JSON.stringify(s);
  assert.ok(!/lat|lon|anchor|lastFix/.test(json), json);
  assert.deepEqual(sanitizeSummary(JSON.parse(json)), s);
  assert.equal(sanitizeSummary({ ...s, distanceM: -1 }), null);
  assert.equal(sanitizeSummary({ ...s, status: 'FLYING' }), null);
  assert.equal(sanitizeSummary({ ...s, source: 'made-up' }), null);
  assert.equal(sanitizeSummary(null), null);
});

test('a walk being tracked when the page closed comes back paused, with no gap counted', () => {
  let t = startTrack(createTrack(), T0);
  t = feed(t, [at(0, T0), at(20, T0 + 5000)]).track;
  const saved = summarize(t, T0 + 6000);
  const back = restoreTrack(saved);
  assert.equal(back.status, TRACK.PAUSED);
  assert.equal(back.anchor, null);
  assert.equal(activeMs(back, T0 + 3_600_000), 6000);
  assert.equal(restoreTrack({ junk: true }).status, TRACK.IDLE);
});

test('with motion data, estimated steps verify the walk and GPS distance alone does not', () => {
  const base = { activeMs: WALK.minActiveMs, distanceM: 500, good: 40, motion: 'active' };
  assert.equal(walkMet({ ...base, steps: WALK.stepTarget - 1 }), false, 'GPS distance is context only when steps are measured');
  assert.equal(walkMet({ ...base, steps: WALK.stepTarget }), true);
  assert.equal(walkMet({ ...base, steps: 400, activeMs: 60_000 }), false, 'steps without the 2 minutes do not count');
  assert.equal(walkMet({ ...base, steps: 90 }, 80), true, 'step target comes from the mission settings');
  assert.equal(walkMet({ ...base, motion: 'denied', steps: 0 }), true, 'no motion data: GPS rule applies');
  assert.equal(walkMet({ ...base, motion: 'unavailable', distanceM: 10, steps: 0 }), false);
});

test('steps are added only while tracking; pausing and restarting never double counts', () => {
  let t = setMotion(startTrack(createTrack(), T0), 'active');
  t = addSteps(t, 12);
  t = addSteps(t, -3);
  assert.equal(t.steps, 12);
  t = pauseTrack(t, T0 + 1000);
  assert.equal(addSteps(t, 50).steps, 12, 'paused: ignored');
  t = resumeTrack(t, T0 + 2000);
  t = addSteps(t, 5);
  assert.equal(t.steps, 17);
  const fresh = startTrack(stopTrack(t, T0 + 3000), T0 + 4000);
  assert.equal(fresh.steps, 0, 'a new walk starts from zero');
  assert.equal(fresh.motion, 'active', 'sensor status carries over');
  const saved = summarize(t, T0 + 3000);
  assert.equal(saved.steps, 17);
  assert.equal(sanitizeSummary({ ...saved, steps: -2 }), null);
  assert.equal(sanitizeSummary({ ...saved, steps: undefined, motion: undefined }).steps, 0, 'older saves load with 0 steps');
  assert.equal(sanitizeSummary({ ...saved, motion: 'pending' }).motion, 'unavailable');
});
