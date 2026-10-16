import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, MISSION, CONVERSATION_REFLECTION_MS } from '../src/js/game/state.js';
import { MISSIONS } from '../src/js/data/missions.js';
import { serialize, deserialize } from '../src/js/game/persistence.js';
import { EPISODES } from '../src/js/game/conversation.js';
import { WALK } from '../src/js/game/tracking.js';
import { conversationReflectionPage } from '../src/js/ui/feature-pages.js';
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

test('reflection CTA stays locked until 30 seconds and then reads Done Reflecting', () => {
  const reflection = 'We talked about campus gardens, and I learned she grows mint.';
  const ctx = (now) => ({
    state: { drafts: { [MC]: { conversationReflectionStartedAt: T0, conversationReflection: reflection } } },
    now,
    ui: {},
  });
  const locked = conversationReflectionPage(ctx(T0 + CONVERSATION_REFLECTION_MS - 1), MC);
  assert.match(locked, /Keep reflecting/);
  assert.match(locked, /data-reflection-submit disabled/);
  assert.doesNotMatch(locked, /Done Reflecting/);

  const ready = conversationReflectionPage(ctx(T0 + CONVERSATION_REFLECTION_MS), MC);
  assert.match(ready, /Done Reflecting/);
  assert.doesNotMatch(ready, /data-reflection-submit disabled/);
});

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

test('colour hunt can be honestly self-reported when camera access is unavailable', () => {
  const s = run(active(LC), { type: 'COMPLETE_PHYSICAL', id: LC, method: 'reported' });
  assert.equal(s.missions[LC].physicalComplete, true);
  assert.equal(s.missions[LC].physicalMethod, 'self');
  assert.equal(s.missions[LC].digitalComplete, false);
});

test('colour hunt camera checks still require five distinct passed photos', () => {
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

test('colour memory game accepts wins and rejects misses', () => {
  assert.equal(reduce(active(LC), { type: 'SUBMIT_DIGITAL', id: LC, result: { correct: false } }).missions[LC].digitalComplete, false);
  assert.equal(reduce(active(LC), { type: 'SUBMIT_DIGITAL', id: LC, result: { correct: true, perfect: true } }).missions[LC].digitalComplete, true);
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

test('a repaired Lost Connection quest can replay its digital conversation without changing quest completion', () => {
  let s = active(MC);
  const episodeId = EPISODES[0].id;
  s = run(s, { type: 'EPISODE_START', id: MC, episodeId });
  const before = { ...s.missions[MC], status: 'REPAIRED', physicalComplete: true, digitalComplete: true };
  s = { ...s, missions: { ...s.missions, [MC]: before } };
  const restarted = reduce(s, { type: 'EPISODE_START', id: MC, episodeId, now: T0 + 20 });
  assert.equal(restarted.episodes[MC].messages.length, 0);
  const played = reduce(restarted, { type: 'EPISODE_SEND', id: MC, text: 'Hey, what are you working on?', now: T0 + 21 });
  assert.equal(played.episodes[MC].messages.length, 1);
  assert.equal(played.missions[MC].status, 'REPAIRED');
  assert.equal(played.missions[MC].digitalComplete, true);
  assert.deepEqual(played.missions[MC].result, before.result);
});

test('real conversation self-report is gated by 30 seconds and a passing AI reflection, then awards progress once', () => {
  const startedAt = T0 + 100;
  const direct = run(active(MC), { type: 'COMPLETE_PHYSICAL', id: MC, method: 'self' });
  assert.equal(direct.missions[MC].physicalComplete, false, 'consent activities cannot bypass the reflection flow');
  let s = run(active(MC), { type: 'SAVE_DRAFT', id: MC, draft: {
    consent: true,
    conversationReportedAt: startedAt,
    conversationReflectionStartedAt: startedAt,
    conversationReflection: 'We talked about the campus garden and I learned she grows mint.',
    conversationReflectionResult: { passed: true, score: 4, feedback: 'Nice detail.', suggestion: 'Ask what is blooming next.', evaluatedAt: startedAt + CONVERSATION_REFLECTION_MS },
  } });
  const blocked = reduce(s, { type: 'COMPLETE_PHYSICAL', id: MC, method: 'ai-reflection', now: startedAt + CONVERSATION_REFLECTION_MS - 1 });
  assert.equal(blocked.missions[MC].physicalComplete, false, 'one millisecond early is blocked');
  s = reduce(s, { type: 'COMPLETE_PHYSICAL', id: MC, method: 'ai-reflection', now: startedAt + CONVERSATION_REFLECTION_MS });
  assert.equal(s.missions[MC].physicalComplete, true);
  assert.equal(s.missions[MC].physicalMethod, 'self', 'AI evaluates writing and does not verify the real event');
  assert.equal(reduce(s, { type: 'COMPLETE_PHYSICAL', id: MC, method: 'ai-reflection', now: startedAt + CONVERSATION_REFLECTION_MS + 10 }), s, 'reward eligibility cannot be repeated');

  const bare = run(active(MC), { type: 'SAVE_DRAFT', id: MC, draft: { conversationReflectionStartedAt: startedAt, conversationReflectionResult: { passed: true, score: 4, feedback: 'Good', suggestion: 'Ask more', evaluatedAt: startedAt } } });
  assert.equal(reduce(bare, { type: 'COMPLETE_PHYSICAL', id: MC, method: 'ai-reflection', now: startedAt + CONVERSATION_REFLECTION_MS }).missions[MC].physicalComplete, false, 'missing self-report cannot complete');
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
