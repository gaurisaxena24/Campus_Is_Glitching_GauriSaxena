import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, MISSION } from '../src/js/game/state.js';
import { MISSIONS } from '../src/js/data/missions.js';
import { serialize, deserialize } from '../src/js/game/persistence.js';
import { EPISODES } from '../src/js/game/conversation.js';
import { WALK } from '../src/js/game/tracking.js';
import { HASHES, EPISODE_LINES, finishPhysical, finishDigital } from './helpers.js';

const T0 = 1_000_000;
const run = (s, ...a) => a.reduce((x, y) => reduce(x, { now: T0 + 10, ...y }), s);
const active = (id) => {
  let state = run(createInitialState(), { type: 'START_SESSION', now: T0 });
  const targetIndex = MISSIONS.findIndex((m) => m.id === id);
  // Earn prerequisites through the normal reducer so persistence tests also
  // exercise valid completed saves under sequential progression.
  for (const mission of MISSIONS.slice(0, targetIndex)) {
    state = run(state, { type: 'ACTIVATE', id: mission.id });
    state = finishPhysical(state, mission.id, T0 + 1);
    state = finishDigital(state, mission.id, T0 + 2);
    state = run(state, { type: 'REPAIR', id: mission.id });
  }
  return run(state, { type: 'ACTIVATE', id });
};
const LC = 'lost-colour';
const MC = 'missing-connection';
const FC = 'frozen-character';
const item = (hash, colourId, confidence = 0.8) => ({ hash, hex: '#2a5bd7', colourId, confidence });

test('colour hunt: target comes from mission config; failed matches, low confidence and duplicates give no progress', () => {
  let s = run(active(LC), { type: 'HUNT_INIT', id: LC });
  const target = s.hunts[LC].target;
  assert.ok(['blue', 'red', 'yellow', 'green', 'purple'].includes(target));
  const other = target === 'blue' ? 'red' : 'blue';
  s = run(s, { type: 'HUNT_ADD', id: LC, item: item(HASHES[0], other) });
  assert.equal(s.hunts[LC].items.length, 0, 'wrong colour');
  s = run(s, { type: 'HUNT_ADD', id: LC, item: item(HASHES[0], target, 0.2) });
  assert.equal(s.hunts[LC].items.length, 0, 'not confident');
  s = run(s, { type: 'HUNT_ADD', id: LC, item: item(HASHES[0], target) });
  s = run(s, { type: 'HUNT_ADD', id: LC, item: item('0000000000000001', target) });
  assert.equal(s.hunts[LC].items.length, 1, 'near-identical photo is a duplicate');
  s = run(s, { type: 'HUNT_ADD', id: LC, item: { hash: 'nope', colourId: target, confidence: 1 } });
  assert.equal(s.hunts[LC].items.length, 1, 'malformed item');
  s = run(s, { type: 'HUNT_INIT', id: LC });
  assert.equal(s.hunts[LC].items.length, 1, 'init is idempotent');
});

test('colour hunt: physical completes only with 5 passed photos, and never completes the digital puzzle', () => {
  let s = run(active(LC), { type: 'HUNT_INIT', id: LC });
  const target = s.hunts[LC].target;
  for (const h of HASHES.slice(0, 4)) s = run(s, { type: 'HUNT_ADD', id: LC, item: item(h, target) });
  assert.equal(run(s, { type: 'COMPLETE_PHYSICAL', id: LC, method: 'self' }).missions[LC].physicalComplete, false);
  s = run(s, { type: 'HUNT_ADD', id: LC, item: item(HASHES[4], target) });
  s = run(s, { type: 'HUNT_ADD', id: LC, item: item('aaaaaaaaaaaaaaaa', target) });
  assert.equal(s.hunts[LC].items.length, 5, 'never more than 5');
  s = run(s, { type: 'COMPLETE_PHYSICAL', id: LC, method: 'self' });
  assert.equal(s.missions[LC].physicalComplete, true);
  assert.equal(s.missions[LC].physicalMethod, 'photo');
  assert.equal(s.missions[LC].digitalComplete, false);
  assert.ok(!JSON.stringify(s).includes('data:image'), 'no photo data in state');
});

test('pattern: round 2 locked until round 1; digital done only after both rounds; replays never change the record', () => {
  let s = run(active(LC), { type: 'PATTERN_INIT', id: LC, seed: 42 });
  const p = s.puzzles[LC];
  assert.equal(run(s, { type: 'PATTERN_INIT', id: LC, seed: 9 }).puzzles[LC], p, 'init once');
  assert.equal(run(s, { type: 'PATTERN_ATTEMPT', id: LC, round: 1, answer: p.rounds[1].solution }).puzzles[LC].solved[1], false, 'locked');
  assert.equal(run(s, { type: 'SUBMIT_DIGITAL', id: LC }).missions[LC].digitalComplete, false);
  const wrong = p.rounds[0].solution.map((t) => (t === 'rust' ? 'sky' : 'rust'));
  s = run(s, { type: 'PATTERN_ATTEMPT', id: LC, round: 0, answer: wrong });
  assert.deepEqual(s.puzzles[LC].attempts, [1, 0]);
  assert.equal(s.puzzles[LC].solved[0], false);
  s = run(s, { type: 'PATTERN_ATTEMPT', id: LC, round: 0, answer: p.rounds[0].solution });
  const afterR1 = s;
  s = run(s, { type: 'PATTERN_ATTEMPT', id: LC, round: 0, answer: p.rounds[0].solution });
  assert.equal(s, afterR1, 'replaying a solved round is a no-op (rewards are keyed on this)');
  s = run(s, { type: 'PATTERN_ATTEMPT', id: LC, round: 1, answer: p.rounds[1].solution });
  s = run(s, { type: 'SUBMIT_DIGITAL', id: LC });
  assert.equal(s.missions[LC].digitalComplete, true);
  assert.equal(s.missions[LC].physicalComplete, false, 'digital never completes physical');
  assert.equal(s.missions[LC].result.perfect, false, 'one wrong attempt');
});

test('pattern: a tampered saved puzzle is dropped on load', () => {
  const s = run(active(LC), { type: 'PATTERN_INIT', id: LC, seed: 42 });
  const raw = JSON.parse(serialize(s));
  raw.puzzles[LC].rounds[0].solution[0] = raw.puzzles[LC].rounds[0].solution[0] === 'rust' ? 'sky' : 'rust';
  assert.equal(deserialize(raw).puzzles[LC], undefined);
  assert.deepEqual(deserialize(serialize(s)).puzzles[LC], s.puzzles[LC]);
});

test('episode: exactly five messages, replayed on load, then digital completes with a rank', () => {
  let s = run(active(MC), { type: 'EPISODE_START', id: MC, episodeId: EPISODES[1].id });
  for (const text of EPISODE_LINES.slice(0, 4)) s = run(s, { type: 'EPISODE_SEND', id: MC, text });
  assert.equal(run(s, { type: 'SUBMIT_DIGITAL', id: MC }).missions[MC].digitalComplete, false, 'only 4 messages');
  assert.equal(run(s, { type: 'EPISODE_SEND', id: MC, text: '   ' }).episodes[MC].messages.length, 4, 'empty rejected');
  assert.equal(run(s, { type: 'EPISODE_SEND', id: MC, text: 'x'.repeat(201) }).episodes[MC].messages.length, 4, 'too long rejected');
  s = run(s, { type: 'EPISODE_SEND', id: MC, text: EPISODE_LINES[4] });
  assert.equal(run(s, { type: 'EPISODE_SEND', id: MC, text: 'one more' }).episodes[MC].messages.length, 5, 'sixth rejected');
  const back = deserialize(serialize(s));
  assert.deepEqual(back.episodes[MC], s.episodes[MC]);
  s = run(s, { type: 'SUBMIT_DIGITAL', id: MC });
  assert.equal(s.missions[MC].digitalComplete, true);
  assert.equal(typeof s.missions[MC].result.rank, 'string');
  assert.equal(s.missions[MC].physicalComplete, false, 'the fictional chat never completes the real-world part');
  const bad = JSON.parse(serialize(s));
  bad.episodes[MC].episodeId = 'made-up';
  assert.equal(deserialize(bad).episodes[MC], undefined, 'unknown episode dropped');
});

test('walk: tracked completion needs the rule met; self-report is labelled self', () => {
  let s = active(FC);
  const short = { status: 'STOPPED', source: 'device', startedAt: T0, activeMs: 200_000, distanceM: 500, movingMs: 100_000, good: 30, steps: 20, motion: 'active', rejected: {} };
  s = run(s, { type: 'SET_TRACK', id: FC, track: short });
  assert.equal(run(s, { type: 'COMPLETE_PHYSICAL', id: FC, method: 'tracked' }).missions[FC].physicalComplete, false, 'too few steps');
  assert.equal(run(s, { type: 'COMPLETE_PHYSICAL', id: FC }).missions[FC].physicalComplete, false, 'walk needs an explicit method');
  s = run(s, { type: 'SET_TRACK', id: FC, track: { ...short, steps: WALK.stepTarget } });
  const done = run(s, { type: 'COMPLETE_PHYSICAL', id: FC, method: 'tracked' });
  assert.equal(done.missions[FC].physicalMethod, 'steps');
  assert.equal(done.missions[FC].walk.steps, WALK.stepTarget);
  assert.equal(done.tracks[FC], undefined, 'live track cleared once complete');
  const sim = run(s, { type: 'SET_TRACK', id: FC, track: { ...short, steps: 999, source: 'simulator' } }, { type: 'COMPLETE_PHYSICAL', id: FC, method: 'tracked' });
  assert.equal(sim.missions[FC].physicalMethod, 'simulator', 'simulated data is never labelled real');
  assert.equal(run(active(FC), { type: 'COMPLETE_PHYSICAL', id: FC, method: 'self' }).missions[FC].physicalMethod, 'self');
});

test('distinct states: started, reflection saved or skipped, repair, all independent', () => {
  let s = active(FC);
  assert.equal(s.missions[FC].physicalStartedAt, null);
  s = run(s, { type: 'MARK_STARTED', id: FC, part: 'physical' }, { type: 'MARK_STARTED', id: FC, part: 'digital', now: T0 + 50 });
  assert.equal(s.missions[FC].physicalStartedAt, T0 + 10);
  assert.equal(s.missions[FC].digitalStartedAt, T0 + 50);
  assert.equal(s.missions[FC].physicalComplete, false);
  s = run(s, { type: 'SKIP_REFLECTION', id: FC });
  assert.equal(s.reflections[FC].skipped, true);
  s = run(s, { type: 'SAVE_REFLECTION', id: FC, answers: ['a bird', ''] });
  assert.equal(s.reflections[FC].skipped, undefined);
  assert.equal(run(s, { type: 'SKIP_REFLECTION', id: FC }).reflections[FC].answers[0], 'a bird', 'skip never erases a saved entry');
  s = finishDigital(finishPhysical(s, FC, T0 + 60), FC, T0 + 70);
  assert.equal(s.missions[FC].status, MISSION.ACTIVE, 'both parts done is still not repaired');
  s = run(s, { type: 'REPAIR', id: FC });
  assert.equal(s.missions[FC].status, MISSION.REPAIRED);
  assert.equal(s.missions[FC].celebrated, false, 'reward granted is its own step');
});
