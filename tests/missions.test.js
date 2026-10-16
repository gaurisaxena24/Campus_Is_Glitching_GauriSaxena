import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, validateMinigameResult, SQUAD_RALLY, DAILY } from '../src/js/data/missions.js';
import { DESTINATIONS, getDestination } from '../src/js/data/destinations.js';
import { judgeStep, RHYTHM, makeSequence, checkSequence, SOCIAL, socialNext, SPOT, rallySequence } from '../src/js/game/minigames.js';

test('the three intended quests exist with their six activities', () => {
  assert.deepEqual(MISSIONS.map((m) => m.name), ['Frozen Character', 'Lost Colour', 'Lost Connection']);
  assert.deepEqual(MISSIONS.map((m) => m.physical.title), ['Walk and Thaw', 'Colour hunt', 'Real talk']);
  assert.deepEqual(MISSIONS.map((m) => m.digital.game), ['thaw', 'sequence', 'episode']);
  for (const m of MISSIONS) {
    assert.ok(m.physical.line && m.physical.alt && m.physical.squad, `${m.id} physical`);
    assert.ok(m.digital.game && m.digital.line && m.digital.squad, `${m.id} digital`);
    assert.ok(getDestination(m.destinationId), `${m.id} destination`);
  }
  assert.ok(getDestination(SQUAD_RALLY.destinationId));
  for (const d of DAILY) assert.ok(getDestination(d.destinationId), d.id);
});

test('every glitch is at a different place and at least one starts unlocked', () => {
  const places = MISSIONS.map((m) => m.destinationId);
  assert.equal(new Set(places).size, places.length);
  assert.ok(MISSIONS.some((m) => m.unlockAt === 0));
});

test('destinations sit inside the artwork and cite the official map, no GPS', () => {
  assert.equal(DESTINATIONS.length, 10);
  for (const d of DESTINATIONS) {
    assert.ok(d.pos.x > 0 && d.pos.x < 100 && d.pos.y > 0 && d.pos.y < 100, d.id);
    assert.ok(d.officialRef.startsWith('Official key'), d.id);
    assert.equal('lat' in d || 'lng' in d || 'gps' in d, false);
  }
});

test('minigame results must actually be wins', () => {
  assert.equal(validateMinigameResult('frozen-character', { melted: 99 }).ok, false);
  assert.equal(validateMinigameResult('frozen-character', { melted: 100 }).ok, true);
  assert.equal(validateMinigameResult('missing-connection', { connected: false, path: 1 }).ok, false);
  assert.equal(validateMinigameResult('lost-colour', { correct: false }).ok, false);
  assert.equal(validateMinigameResult('lost-colour', { correct: false }).ok, false);
  assert.deepEqual(validateMinigameResult('frozen-character', { melted: 100, perfect: true }).value, { game: 'thaw', perfect: true });
});

test('digital score records accept only scores consistent with each completed game', () => {
  assert.equal(validateMinigameResult('frozen-character', { melted: 100, perfect: true, restarts: 0, score: 1000 }).value.score, 1000);
  assert.equal(validateMinigameResult('frozen-character', { melted: 100, perfect: true, restarts: 0, score: 999 }).value.score, undefined);
  assert.equal(validateMinigameResult('lost-colour', { correct: true, perfect: true, rounds: 3, mistakes: 0, rushes: 0, score: 300 }).value.score, 300);
  assert.equal(validateMinigameResult('lost-colour', { correct: true, perfect: true, rounds: 3, mistakes: 1, rushes: 0, score: 300 }).value.score, undefined);
});

test('rhythm judging: on-beat correct side hits; off-beat or wrong side misses', () => {
  const start = 0;
  const beat = (k) => start + RHYTHM.leadInMs + k * RHYTHM.beatMs;
  assert.equal(judgeStep(beat(0) + 50, start, 'L').ok, true);
  assert.equal(judgeStep(beat(1) - 100, start, 'R').ok, true);
  assert.equal(judgeStep(beat(1), start, 'L').reason, 'side');
  assert.equal(judgeStep(beat(2) + RHYTHM.windowMs + 50, start, 'L').reason, 'timing');
  assert.equal(judgeStep(10, start, 'L').reason, 'early');
});

test('colour sequence: no immediate repeats; wrong order is caught', () => {
  let i = 0;
  const seq = makeSequence(() => [0.1, 0.1, 0.5, 0.9, 0.3, 0.7][i++ % 6]);
  assert.equal(seq.length, 5);
  for (let k = 1; k < seq.length; k++) assert.notEqual(seq[k], seq[k - 1]);
  assert.equal(checkSequence(seq.slice(0, 2), seq), 'continue');
  assert.equal(checkSequence(seq, seq), 'done');
  assert.equal(checkSequence([seq[1]], seq), seq[1] === seq[0] ? 'continue' : 'wrong');
});

test('social scene: every choice leads somewhere and every path can connect', () => {
  const ends = new Set();
  const walk = (id, depth) => {
    const node = SOCIAL.nodes[id];
    assert.ok(node, id);
    if (node.end) { ends.add(id); return; }
    assert.ok(depth < 8, 'no loops without progress');
    node.choices.forEach((_, i) => walk(socialNext(id, i), depth + 1));
  };
  walk(SOCIAL.start, 0);
  assert.ok(ends.size >= 3);
});

test('spot-the-change and rally data are sane', () => {
  assert.equal(SPOT.spots.length, SPOT.found);
  const seq = rallySequence(() => 0.6);
  assert.ok(seq.every((p) => p >= 0 && p < 4));
});
