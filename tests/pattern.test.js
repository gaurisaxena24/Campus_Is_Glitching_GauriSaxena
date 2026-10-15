import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  TILES, RULES, makeRng, generatePuzzle, checkAnswer, isValidPuzzle, makeSession, applyAttempt,
  isValidSession, ruleValidator, countSolutions,
} from '../src/js/game/pattern.js';

const IDS = TILES.map((t) => t.id);
const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const R1 = RULES.filter((r) => r.round === 1).map((r) => r.id);
const R2 = RULES.filter((r) => r.round === 2).map((r) => r.id);
const clone = (x) => JSON.parse(JSON.stringify(x));
const fullOf = (p) => { const s = p.sequence.slice(); p.blanks.forEach((b, i) => { s[b] = p.solution[i]; }); return s; };
const wrongFor = (p) => p.solution.map((t) => IDS.find((x) => x !== t));

test('tiles have distinct colours AND distinct symbols', () => {
  assert.equal(TILES.length, 5);
  for (const key of ['id', 'hex', 'symbol', 'name']) assert.equal(new Set(TILES.map((t) => t[key])).size, 5, key);
});

test('rules: round 1 and round 2 families are disjoint and documented', () => {
  assert.deepEqual(R1, ['alternate', 'repeat3', 'growing-runs']);
  assert.deepEqual(R2, ['interleave', 'mirror', 'rotate', 'growing-group']);
  for (const r of RULES) assert.ok(r.title && r.hint && ruleValidator(r.id), r.id);
});

test('makeRng is deterministic and seed-dependent', () => {
  const a = makeRng(42); const b = makeRng(42); const c = makeRng(43);
  const xs = [a(), a(), a()];
  assert.deepEqual(xs, [b(), b(), b()]);
  assert.notDeepEqual(xs, [c(), c(), c()]);
  for (const x of xs) assert.ok(x >= 0 && x < 1);
});

test('determinism: same (round, seed) gives an identical puzzle', () => {
  for (const seed of [1, 7, 99, 123456, 0xffffffff]) {
    for (const round of [1, 2]) assert.deepEqual(generatePuzzle(round, seed), generatePuzzle(round, seed));
  }
});

test('variety: seeds 1..300 use every rule and many different sequences', () => {
  const r1 = new Set(); const r2 = new Set(); const seqs = new Set();
  for (const seed of SEEDS) {
    const a = generatePuzzle(1, seed); const b = generatePuzzle(2, seed);
    r1.add(a.ruleId); r2.add(b.ruleId);
    seqs.add(JSON.stringify(a.sequence)); seqs.add(JSON.stringify(b.sequence));
  }
  assert.deepEqual([...r1].sort(), [...R1].sort());
  assert.deepEqual([...r2].sort(), [...R2].sort());
  assert.ok(seqs.size > 400, `only ${seqs.size} distinct sequences`);
});

test('every generated puzzle (seeds 1..300, both rounds) meets the design constraints', () => {
  for (const seed of SEEDS) {
    for (const round of [1, 2]) {
      const p = generatePuzzle(round, seed);
      const tag = `round ${round} seed ${seed} ${p.ruleId}`;
      const n = p.sequence.length;
      assert.equal(p.round, round, tag);
      assert.ok(isValidPuzzle(p), tag);
      assert.ok((round === 1 ? R1 : R2).includes(p.ruleId), tag);
      assert.deepEqual(p.blanks, p.sequence.map((t, i) => (t === null ? i : -1)).filter((i) => i >= 0), tag);
      assert.equal(p.solution.length, p.blanks.length, tag);
      assert.ok(ruleValidator(p.ruleId)(fullOf(p)), `${tag}: full sequence fits its rule`);
      // palette: every solution tile, plus 1-2 distractors, no duplicates
      assert.equal(new Set(p.palette).size, p.palette.length, tag);
      for (const t of p.solution) assert.ok(p.palette.includes(t), tag);
      const extra = p.palette.filter((t) => !p.solution.includes(t)).length;
      assert.ok(extra >= 1 && extra <= 2, `${tag}: ${extra} distractors`);
      if (round === 1) {
        assert.ok(n >= 8 && n <= 10, tag);
        assert.ok(p.blanks.length >= 1 && p.blanks.length <= 2, tag);
        const period = { alternate: 2, repeat3: 3, 'growing-runs': 3 }[p.ruleId];
        assert.ok(p.blanks[0] >= period * 2, `${tag}: two full periods shown before the first blank`);
      } else {
        assert.ok(n >= 10 && n <= 14, tag);
        assert.ok(p.blanks.length >= 2 && p.blanks.length <= 4, tag);
        assert.ok(p.blanks.some((b) => b >= Math.floor(n / 3) && b < Math.ceil((2 * n) / 3)), `${tag}: middle blank`);
        assert.ok(p.blanks[0] >= 4, tag);
      }
    }
  }
});

test('uniquely solvable: brute force over palette (and all tiles) finds only the solution', () => {
  for (const seed of SEEDS) {
    for (const round of [1, 2]) {
      const p = generatePuzzle(round, seed);
      const fits = ruleValidator(p.ruleId);
      const found = [];
      const s = p.sequence.slice();
      (function fill(k, acc) {
        if (k === p.blanks.length) { if (fits(s)) found.push(acc.slice()); return; }
        for (const t of p.palette) { s[p.blanks[k]] = t; acc.push(t); fill(k + 1, acc); acc.pop(); }
      })(0, []);
      assert.deepEqual(found, [p.solution], `round ${round} seed ${seed}`);
      assert.equal(countSolutions(p.ruleId, p.sequence, p.blanks), 1, `all-tiles round ${round} seed ${seed}`);
      // the fair message test: correct passes, wrong fails
      assert.equal(checkAnswer(p, p.solution).correct, true);
    }
  }
});

test('session: round 2 rule family always differs from round 1', () => {
  for (const seed of SEEDS) {
    const s = makeSession(seed);
    assert.ok(R1.includes(s.rounds[0].ruleId) && R2.includes(s.rounds[1].ruleId));
    assert.notEqual(s.rounds[0].ruleId, s.rounds[1].ruleId);
    assert.ok(s.rounds[1].sequence.length >= s.rounds[0].sequence.length);
  }
});

test('checkAnswer: correct, wrong (wrongAt + explanatory message), wrong length', () => {
  const p = generatePuzzle(2, 5);
  const ok = checkAnswer(p, p.solution.slice());
  assert.deepEqual(ok.wrongAt, []);
  assert.equal(ok.correct, true);

  const answer = p.solution.slice();
  answer[1] = IDS.find((t) => t !== answer[1]);
  const bad = checkAnswer(p, answer);
  assert.equal(bad.correct, false);
  assert.deepEqual(bad.wrongAt, [1]);
  assert.match(bad.message, /1 of \d+ tiles/);
  assert.ok(bad.message.length > 20);

  const allBad = checkAnswer(p, wrongFor(p));
  assert.deepEqual(allBad.wrongAt, p.solution.map((_, i) => i));

  for (const a of [p.solution.slice(0, -1), [...p.solution, 'rust'], [], null, 'rust']) {
    const r = checkAnswer(p, a);
    assert.equal(r.correct, false);
    assert.deepEqual(r.wrongAt, []);
    assert.ok(r.message);
  }
  assert.match(checkAnswer(p, p.solution.slice(0, 1)).message, /Fill all/);
  // unknown tile id is simply wrong at that index
  assert.deepEqual(checkAnswer(p, ['nope', ...p.solution.slice(1)]).wrongAt, [0]);
});

test('checkAnswer gives a rule-specific tip for each rule', () => {
  const seen = new Map();
  for (const seed of SEEDS) for (const round of [1, 2]) {
    const p = generatePuzzle(round, seed);
    if (!seen.has(p.ruleId)) seen.set(p.ruleId, checkAnswer(p, wrongFor(p)).message);
  }
  assert.equal(seen.size, RULES.length);
  assert.equal(new Set(seen.values()).size, RULES.length);
  assert.match(seen.get('growing-runs'), /run lengths grow/);
});

test('isValidPuzzle rejects tampered and malformed data', () => {
  const p = generatePuzzle(2, 77);
  assert.equal(isValidPuzzle(p), true);
  const tamper = (fn) => { const q = clone(p); fn(q); return isValidPuzzle(q); };
  assert.equal(tamper((q) => { q.solution[0] = IDS.find((t) => t !== q.solution[0]); }), false, 'solution');
  assert.equal(tamper((q) => { const i = q.sequence.findIndex((t) => t !== null); q.sequence[i] = IDS.find((t) => t !== q.sequence[i]); }), false, 'sequence tile');
  assert.equal(tamper((q) => { q.sequence[q.blanks[0]] = q.solution[0]; }), false, 'blank filled in');
  assert.equal(tamper((q) => { q.palette[0] = 'gold'; }), false, 'unknown palette id');
  assert.equal(tamper((q) => { q.solution[0] = 'gold'; }), false, 'unknown solution id');
  assert.equal(tamper((q) => { q.sequence[0] = 'gold'; }), false, 'unknown sequence id');
  assert.equal(tamper((q) => { q.solution.pop(); }), false, 'solution length');
  assert.equal(tamper((q) => { q.blanks.pop(); }), false, 'blanks length');
  assert.equal(tamper((q) => { q.seed += 1; }), false, 'seed');
  assert.equal(tamper((q) => { q.seed = 1.5; }), false, 'non-integer seed');
  assert.equal(tamper((q) => { q.round = 1; }), false, 'round');
  assert.equal(tamper((q) => { q.ruleId = 'mirror-x'; }), false, 'rule');
  assert.equal(tamper((q) => { q.explain = 'hi'; }), false, 'explain');
  assert.equal(tamper((q) => { q.palette.reverse(); }), false, 'palette order');
  for (const junk of [null, undefined, 1, 'x', [], {}, { round: 2 }]) assert.equal(isValidPuzzle(junk), false);
});

test('JSON round trip keeps puzzles and sessions valid and equal', () => {
  const s = makeSession(2024);
  const back = JSON.parse(JSON.stringify(s));
  assert.deepEqual(back, s);
  assert.ok(isValidSession(back));
  for (const p of back.rounds) assert.ok(isValidPuzzle(p));
});

test('makeSession shape', () => {
  const s = makeSession(9);
  assert.equal(s.rounds[0].round, 1);
  assert.equal(s.rounds[1].round, 2);
  assert.deepEqual(s.solved, [false, false]);
  assert.deepEqual(s.attempts, [0, 0]);
  assert.deepEqual(makeSession(9), s);
});

test('applyAttempt: round 2 is locked until round 1 is solved', () => {
  const s = makeSession(3);
  const r = applyAttempt(s, 1, s.rounds[1].solution);
  assert.equal(r.correct, false);
  assert.equal(r.error, 'locked');
  assert.equal(r.newlySolved, false);
  assert.equal(r.session, s);
  assert.deepEqual(s.attempts, [0, 0]);
});

test('applyAttempt: attempts counting, purity, unlock and completion', () => {
  const s0 = makeSession(11);
  const snapshot = clone(s0);
  const w = applyAttempt(s0, 0, wrongFor(s0.rounds[0]));
  assert.equal(w.correct, false);
  assert.ok(w.wrongAt.length > 0);
  assert.deepEqual(w.session.attempts, [1, 0]);
  assert.equal(w.unlockedNext, false);
  assert.deepEqual(s0, snapshot, 'input session not mutated');

  const inc = applyAttempt(w.session, 0, []);
  assert.equal(inc.error, 'incomplete');
  assert.deepEqual(inc.session.attempts, [1, 0], 'incomplete answers are not counted');

  const c = applyAttempt(w.session, 0, w.session.rounds[0].solution);
  assert.equal(c.correct, true);
  assert.equal(c.newlySolved, true);
  assert.equal(c.unlockedNext, true);
  assert.equal(c.complete, false);
  assert.deepEqual(c.session.attempts, [2, 0]);
  assert.deepEqual(c.session.solved, [true, false]);

  const c2w = applyAttempt(c.session, 1, wrongFor(c.session.rounds[1]));
  assert.deepEqual(c2w.session.attempts, [2, 1]);
  const done = applyAttempt(c2w.session, 1, c2w.session.rounds[1].solution);
  assert.equal(done.newlySolved, true);
  assert.equal(done.complete, true);
  assert.deepEqual(done.session.solved, [true, true]);
  assert.deepEqual(done.session.attempts, [2, 2]);
  assert.ok(isValidSession(done.session));
});

test('applyAttempt is idempotent: newlySolved is true exactly once per round', () => {
  let s = makeSession(500);
  const flags = [[], []];
  for (let k = 0; k < 4; k++) {
    for (const ri of [0, 1]) {
      const r = applyAttempt(s, ri, s.rounds[ri].solution);
      flags[ri].push(r.newlySolved);
      if (k > 0) { assert.equal(r.session, s, 'solved round leaves session unchanged'); assert.equal(r.correct, true); }
      s = r.session;
    }
  }
  assert.deepEqual(flags, [[true, false, false, false], [true, false, false, false]]);
  assert.deepEqual(s.attempts, [1, 1]);
  // wrong answer on an already solved round does not un-solve it
  const r = applyAttempt(s, 0, wrongFor(s.rounds[0]));
  assert.equal(r.correct, true);
  assert.equal(r.newlySolved, false);
  assert.equal(r.session, s);
});

test('applyAttempt rejects invalid or tampered sessions and bad round indexes', () => {
  const s = makeSession(8);
  const t = clone(s); t.rounds[0].solution = wrongFor(t.rounds[0]);
  const r = applyAttempt(t, 0, t.rounds[0].solution);
  assert.equal(r.correct, false);
  assert.equal(r.error, 'invalid-session');
  assert.equal(applyAttempt(null, 0, []).error, 'invalid-session');
  assert.equal(applyAttempt({ ...clone(s), solved: [false, true] }, 0, s.rounds[0].solution).error, 'invalid-session');
  assert.equal(applyAttempt(s, 2, []).error, 'invalid-round');
});
