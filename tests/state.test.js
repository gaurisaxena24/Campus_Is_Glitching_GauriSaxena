import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialState, reduce, remainingMs, tokenCount, repairedCount, displayState, isUnlocked,
  pendingCelebrations, formatClock, restorationPercent, repairBlocker, DURATION_MS, MAX_TOKENS, SESSION, MISSION,
} from '../src/js/game/state.js';
import { MISSION_IDS } from '../src/js/data/missions.js';
import { serialize, deserialize } from '../src/js/game/persistence.js';
import { WIN, finishPhysical, finishDigital } from './helpers.js';

const T0 = 1_000_000;
const run = (state, ...actions) => actions.reduce((s, a) => reduce(s, a), state);
const started = () => reduce(createInitialState(), { type: 'START_SESSION', now: T0 });

const fc = 'frozen-character';
const playBoth = (s, id, t = T0) => finishDigital(finishPhysical(reduce(s, { type: 'ACTIVATE', id, now: t + 1 }), id, t + 2), id, t + 3);

test('timer does not run before Start (T-TIM-01)', () => {
  const s = createInitialState();
  assert.equal(remainingMs(s, T0 + 60_000), DURATION_MS);
  assert.equal(formatClock(remainingMs(s, T0)), '15:00');
});

test('Start is idempotent (T-TIM-03)', () => {
  assert.equal(run(started(), { type: 'START_SESSION', now: T0 + 5000 }).session.startedAt, T0);
});

test('pause stops time and resume continues it (T-TIM-04)', () => {
  let s = run(started(), { type: 'PAUSE', now: T0 + 60_000 });
  assert.equal(remainingMs(s, T0 + 90_000), DURATION_MS - 60_000);
  s = reduce(s, { type: 'RESUME', now: T0 + 90_000 });
  assert.equal(remainingMs(s, T0 + 100_000), DURATION_MS - 70_000);
});

test('timeout ends the session and blocks play (T-TIM-05)', () => {
  let s = run(started(), { type: 'ACTIVATE', id: fc, now: T0 + 1 });
  s = reduce(s, { type: 'COMPLETE_PHYSICAL', method: 'self', id: fc, now: T0 + DURATION_MS + 1 });
  assert.equal(s.session.status, SESSION.ENDED);
  assert.equal(s.session.endReason, 'TIMEOUT');
  assert.equal(s.missions[fc].physicalComplete, false);
});

test('finish and restart (T-TIM-06, T-TIM-07)', () => {
  let s = run(started(), { type: 'FINISH', now: T0 + 30_000 });
  assert.equal(s.session.endReason, 'FINISHED');
  s = reduce(s, { type: 'RESTART' });
  assert.equal(s.session.status, SESSION.NOT_STARTED);
  assert.ok(MISSION_IDS.every((id) => s.missions[id].status === MISSION.UNDISCOVERED));
});

test('both parts done is READY, but not repaired until REPAIR (T-STA-01)', () => {
  let s = playBoth(started(), fc);
  assert.equal(displayState(s, fc), 'READY');
  assert.equal(s.missions[fc].status, MISSION.ACTIVE);
  assert.equal(tokenCount(s), 0);
  s = reduce(s, { type: 'REPAIR', id: fc, now: T0 + 4 });
  assert.equal(s.missions[fc].status, MISSION.REPAIRED);
  assert.equal(tokenCount(s), 2);
});

test('digital first then physical also works (T-STA-02)', () => {
  let s = run(started(), { type: 'ACTIVATE', id: fc, now: T0 + 1 }, { type: 'SUBMIT_DIGITAL', id: fc, result: WIN[fc], now: T0 + 2 });
  assert.equal(displayState(s, fc), 'DIGITAL_COMPLETE');
  s = reduce(s, { type: 'COMPLETE_PHYSICAL', method: 'self', id: fc, now: T0 + 3 });
  assert.equal(displayState(s, fc), 'READY');
});

test('REPAIR is refused with only one part, with a clear reason (T-STA-03, T-STA-04)', () => {
  let s = run(started(), { type: 'ACTIVATE', id: fc, now: T0 + 1 }, { type: 'COMPLETE_PHYSICAL', method: 'self', id: fc, now: T0 + 2 });
  assert.match(repairBlocker(s, fc), /digital/i);
  s = reduce(s, { type: 'REPAIR', id: fc, now: T0 + 3 });
  assert.equal(s.missions[fc].status, MISSION.ACTIVE);
  assert.equal(tokenCount(s), 0);
  assert.match(repairBlocker(started(), fc), /accept/i);
});

test('a minigame that was not won cannot complete the digital part', () => {
  let s = run(started(), { type: 'ACTIVATE', id: fc, now: T0 + 1 });
  s = reduce(s, { type: 'SUBMIT_DIGITAL', id: fc, result: { hits: 3 }, now: T0 + 2 });
  assert.equal(s.missions[fc].digitalComplete, false);
  s = reduce(s, { type: 'SUBMIT_DIGITAL', id: fc, result: null, now: T0 + 3 });
  assert.equal(s.missions[fc].digitalComplete, false);
});

test('double repairs never add tokens (T-TOK-03, T-TOK-04)', () => {
  let s = playBoth(started(), fc);
  s = run(s, { type: 'REPAIR', id: fc, now: T0 + 4 }, { type: 'REPAIR', id: fc, now: T0 + 5 }, { type: 'COMPLETE_PHYSICAL', method: 'self', id: fc, now: T0 + 6 });
  assert.equal(tokenCount(s), 2);
  assert.equal(s.missions[fc].repairedAt, T0 + 4);
});

test('celebration is pending exactly once', () => {
  let s = reduce(playBoth(started(), fc), { type: 'REPAIR', id: fc, now: T0 + 4 });
  assert.deepEqual(pendingCelebrations(s), [fc]);
  s = reduce(s, { type: 'MARK_CELEBRATED', id: fc });
  assert.deepEqual(pendingCelebrations(s), []);
});

test('locations unlock as glitches are repaired', () => {
  let s = started();
  assert.equal(isUnlocked(s, 'frozen-character'), true);
  assert.equal(isUnlocked(s, 'low-battery'), false);
  assert.equal(displayState(s, 'missing-connection'), 'LOCKED');
  assert.equal(reduce(s, { type: 'ACTIVATE', id: 'missing-connection', now: T0 + 1 }).missions['missing-connection'].status, MISSION.UNDISCOVERED);
  s = reduce(playBoth(s, fc), { type: 'REPAIR', id: fc, now: T0 + 4 });
  assert.equal(isUnlocked(s, 'low-battery'), true);
  assert.equal(isUnlocked(s, 'missing-connection'), false);
  assert.equal(isUnlocked(s, 'lost-colour'), false);
  assert.equal(isUnlocked(reduce(s, { type: 'SET_UNLOCK_ALL', value: true }), 'missing-connection'), false);
  s = reduce(playBoth(s, 'low-battery', T0 + 10), { type: 'REPAIR', id: 'low-battery', now: T0 + 15 });
  s = deserialize(serialize(s));
  assert.equal(isUnlocked(s, 'missing-connection'), true, 'unlock survives save/load');
  assert.equal(isUnlocked(s, 'lost-colour'), false, 'third challenge remains locked');
  assert.equal(reduce(s, { type: 'ACTIVATE', id: 'lost-colour', now: T0 + 20 }).missions['lost-colour'].status, MISSION.UNDISCOVERED);
});

test('repairing all five gives 10 tokens, 100% and a victory (T-TOK-02, T-MIS-01..05)', () => {
  let s = started();
  let t = T0;
  for (const id of MISSION_IDS) {
    s = playBoth(s, id, (t += 10));
    s = reduce(s, { type: 'REPAIR', id, now: t + 5 });
    assert.equal(s.missions[id].status, MISSION.REPAIRED, id);
  }
  assert.equal(repairedCount(s), 5);
  assert.equal(tokenCount(s), MAX_TOKENS);
  assert.equal(restorationPercent(s), 100);
  assert.equal(s.session.status, SESSION.ENDED);
  assert.equal(s.session.endReason, 'VICTORY');
});

test('restoration percent counts parts and repairs', () => {
  let s = run(started(), { type: 'ACTIVATE', id: fc, now: T0 + 1 }, { type: 'COMPLETE_PHYSICAL', method: 'self', id: fc, now: T0 + 2 });
  assert.equal(restorationPercent(s), 5);
});

test('actions while paused are ignored', () => {
  let s = run(started(), { type: 'ACTIVATE', id: fc, now: T0 + 1 }, { type: 'PAUSE', now: T0 + 2 });
  s = reduce(s, { type: 'COMPLETE_PHYSICAL', method: 'self', id: fc, now: T0 + 3 });
  assert.equal(s.missions[fc].physicalComplete, false);
});

test('optional field note is kept with the physical part, trimmed', () => {
  const s = run(started(), { type: 'ACTIVATE', id: fc, now: T0 + 1 }, { type: 'COMPLETE_PHYSICAL', method: 'self', id: fc, note: '  a fern  ', now: T0 + 2 });
  assert.equal(s.missions[fc].note, 'a fern');
});
