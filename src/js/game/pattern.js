// Lost Colour: two-round colour-pattern puzzle (pure logic, no DOM).
//
// Puzzles are generated from an integer seed with a small deterministic PRNG,
// so the same (round, seed) always gives the same puzzle. Everything returned
// is plain JSON data, so a puzzle can be stored in the saved session and later
// re-verified by regenerating it (isValidPuzzle), which rejects tampered saves.
//
// Each rule has its own validator that checks whether a complete sequence fits
// the rule family (with any tiles). Generation only accepts a set of blanks if
// exactly one way of filling them satisfies that validator, so every puzzle is
// uniquely solvable from the visible tiles. Difficulty never comes from timers
// or hard-to-see colours: every tile also carries a distinct symbol.

export const TILES = Object.freeze([
  Object.freeze({ id: 'rust', name: 'Rust', hex: '#c0583a', symbol: '▲' }),
  Object.freeze({ id: 'ochre', name: 'Ochre', hex: '#e0a83a', symbol: '●' }),
  Object.freeze({ id: 'moss', name: 'Moss', hex: '#6f9a3c', symbol: '■' }),
  Object.freeze({ id: 'sky', name: 'Sky', hex: '#5fa8c8', symbol: '◆' }),
  Object.freeze({ id: 'plum', name: 'Plum', hex: '#8a5a9e', symbol: '★' }),
]);

const TILE_IDS = TILES.map((t) => t.id);
const TILE_SET = new Set(TILE_IDS);
const nameOf = (id) => (TILES.find((t) => t.id === id) || { name: id }).name;
const names = (ids) => ids.map(nameOf).join(', ');

export const RULES = Object.freeze([
  Object.freeze({ id: 'alternate', round: 1, title: 'Taking turns', hint: 'Two colours take turns, one after the other.' }),
  Object.freeze({ id: 'repeat3', round: 1, title: 'Group of three', hint: 'A group of three tiles repeats in the same order.' }),
  Object.freeze({ id: 'growing-runs', round: 1, title: 'Growing runs', hint: 'Two colours swap, and each run is one tile longer than the one before.' }),
  Object.freeze({ id: 'interleave', round: 2, title: 'Two patterns woven together', hint: 'Read every other tile. The 1st, 3rd, 5th… tiles make one pattern; the 2nd, 4th, 6th… make another.' }),
  Object.freeze({ id: 'mirror', round: 2, title: 'Mirror', hint: 'The second half is the first half reflected, as if in a mirror.' }),
  Object.freeze({ id: 'rotate', round: 2, title: 'Rotating groups', hint: 'Tiles come in groups of four. Each group moves its first tile to the end.' }),
  Object.freeze({ id: 'growing-group', round: 2, title: 'Growing group', hint: 'Each group starts again from the first tile and adds one new tile.' }),
]);

const MISTAKE = Object.freeze({
  alternate: 'Check which colour comes next as the two take turns.',
  repeat3: 'Count back three tiles: the group of three always repeats in the same order.',
  'growing-runs': 'Look at how the run lengths grow: 1, 2, 3, 4.',
  interleave: 'Look at every other tile separately: one strand repeats two colours, the other repeats three.',
  mirror: 'Find the matching tile at the same distance from the other end.',
  rotate: 'Compare each group of four with the one before it: the first tile moves to the end.',
  'growing-group': 'Each group starts again from the first tile and adds one more.',
});

// ---------- PRNG ----------

// mulberry32: tiny, fast, deterministic. Returns floats in [0, 1).
export function makeRng(seed) {
  let a = (Number(seed) >>> 0) || 0;
  return function rng() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const randInt = (rng, lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)); // inclusive
function shuffle(rng, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const pickDistinct = (rng, k) => shuffle(rng, TILE_IDS).slice(0, k);
const allDistinct = (arr) => new Set(arr).size === arr.length;

// ---------- Rule builders and validators ----------
// build(rng) -> { sequence, minBlank, explain }
// fits(seq)  -> true if the complete sequence follows the rule family.

function runsSequence(a, b, maxRun) {
  const out = [];
  for (let r = 1; r <= maxRun; r++) for (let k = 0; k < r; k++) out.push(r % 2 ? a : b);
  return out;
}

// Index where base tile j first appears in a growing group: 0, 2, 5, 9.
const growFirst = (j) => (j * (j + 1)) / 2 + j;
function growOffset(i) {
  let k = 1;
  let start = 0;
  while (i >= start + k) { start += k; k++; }
  return i - start;
}

const BUILDERS = {
  alternate: {
    build(rng) {
      const n = randInt(rng, 8, 10);
      const [a, b] = pickDistinct(rng, 2);
      return { sequence: Array.from({ length: n }, (_, i) => (i % 2 ? b : a)), minBlank: 4, explain: `${nameOf(a)} and ${nameOf(b)} take turns.` };
    },
    fits: (s) => s.length >= 2 && s[0] !== s[1] && s.every((t, i) => t === s[i % 2]),
  },
  repeat3: {
    build(rng) {
      const n = randInt(rng, 8, 10);
      const g = pickDistinct(rng, 3);
      return { sequence: Array.from({ length: n }, (_, i) => g[i % 3]), minBlank: 6, explain: `${names(g)} repeat in that order.` };
    },
    fits: (s) => s.length >= 3 && allDistinct(s.slice(0, 3)) && s.every((t, i) => t === s[i % 3]),
  },
  'growing-runs': {
    build(rng) {
      const [a, b] = pickDistinct(rng, 2);
      return {
        sequence: runsSequence(a, b, 4),
        minBlank: 6,
        explain: `${nameOf(a)} ×1, ${nameOf(b)} ×2, ${nameOf(a)} ×3, ${nameOf(b)} ×4: each run is one tile longer.`,
      };
    },
    fits(s) {
      if (s.length !== 10 || s[0] === s[1]) return false;
      const want = runsSequence(s[0], s[1], 4);
      return s.every((t, i) => t === want[i]);
    },
  },
  interleave: {
    build(rng) {
      const n = randInt(rng, 12, 14);
      const all = pickDistinct(rng, 5);
      const two = all.slice(0, 2);
      const three = all.slice(2);
      const sequence = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? two[(i / 2) % 2] : three[((i - 1) / 2) % 3]));
      return { sequence, minBlank: 4, explain: `The 1st, 3rd, 5th… tiles cycle ${names(two)}; the 2nd, 4th, 6th… cycle ${names(three)}.` };
    },
    fits(s) {
      if (s.length < 6 || s[0] === s[2] || !allDistinct([s[1], s[3], s[5]])) return false;
      return s.every((t, i) => t === (i % 2 === 0 ? s[i % 4] : s[1 + 2 * (((i - 1) / 2) % 3)]));
    },
  },
  mirror: {
    build(rng) {
      const n = randInt(rng, 12, 14);
      const h = Math.ceil(n / 2);
      let half;
      do {
        half = [];
        for (let i = 0; i < h; i++) {
          const options = TILE_IDS.filter((t) => t !== half[i - 1]);
          half.push(options[Math.floor(rng() * options.length)]);
        }
      } while (new Set(half).size < 3);
      const sequence = half.concat(half.slice(0, Math.floor(n / 2)).reverse());
      return { sequence, minBlank: 4, explain: `The second half mirrors the first: ${names(half)}, then back again.` };
    },
    fits: (s) => s.length >= 2 && s.every((t, i) => t === s[s.length - 1 - i]),
  },
  rotate: {
    build(rng) {
      const n = randInt(rng, 12, 14);
      const base = pickDistinct(rng, 4);
      const sequence = Array.from({ length: n }, (_, i) => base[(i % 4 + Math.floor(i / 4)) % 4]);
      return { sequence, minBlank: 4, explain: `Each group of four moves its first tile to the end: ${names(base)} → ${names(sequence.slice(4, 8))}.` };
    },
    fits(s) {
      if (s.length < 4 || !allDistinct(s.slice(0, 4))) return false;
      return s.every((t, i) => t === s[(i % 4 + Math.floor(i / 4)) % 4]);
    },
  },
  'growing-group': {
    build(rng) {
      const n = randInt(rng, 10, 14);
      const base = pickDistinct(rng, 4);
      const sequence = Array.from({ length: n }, (_, i) => base[growOffset(i)]);
      return { sequence, minBlank: 4, explain: `${nameOf(base[0])}; then ${names(base.slice(0, 2))}; then ${names(base.slice(0, 3))}: each group adds one new tile.` };
    },
    fits(s) {
      if (s.length < 10) return false;
      const base = [0, 1, 2, 3].map(growFirst).filter((p) => p < s.length).map((p) => s[p]);
      if (!allDistinct(base)) return false;
      return s.every((t, i) => t === base[growOffset(i)]);
    },
  },
};

export function ruleValidator(ruleId) {
  const b = BUILDERS[ruleId];
  return b ? b.fits : null;
}

// Count how many fillings of the blanks (choosing from `options`) satisfy the
// rule; stops at 2 because only "exactly one" matters.
export function countSolutions(ruleId, sequence, blanks, options = TILE_IDS) {
  const fits = ruleValidator(ruleId);
  const s = sequence.slice();
  let count = 0;
  (function fill(k) {
    if (count > 1) return;
    if (k === blanks.length) { if (fits(s)) count++; return; }
    for (const t of options) { s[blanks[k]] = t; fill(k + 1); }
  })(0);
  return count;
}

// ---------- Generation ----------

const normSeed = (seed) => (Number.isFinite(Number(seed)) ? Number(seed) >>> 0 : 0);

function chooseBlanks(rng, round, n, minBlank, sequence, ruleId) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const k = round === 1 ? randInt(rng, 1, 2) : randInt(rng, 2, 4);
    const picked = new Set();
    if (round === 2) {
      // At least one blank in the middle third, so it is not only the end.
      const lo = Math.max(minBlank, Math.floor(n / 3));
      const hi = Math.ceil((2 * n) / 3) - 1;
      picked.add(randInt(rng, lo, hi));
    }
    while (picked.size < k) picked.add(randInt(rng, minBlank, n - 1));
    const blanks = [...picked].sort((x, y) => x - y);
    const shown = sequence.map((t, i) => (picked.has(i) ? null : t));
    if (countSolutions(ruleId, shown, blanks) === 1) return blanks;
  }
  throw new Error(`pattern: could not place uniquely solvable blanks for ${ruleId}`);
}

export function generatePuzzle(round, seed) {
  if (round !== 1 && round !== 2) throw new Error('pattern: round must be 1 or 2');
  const s = normSeed(seed);
  const rng = makeRng((s ^ Math.imul(round, 0x9e3779b1)) >>> 0);
  const rules = RULES.filter((r) => r.round === round);
  const rule = rules[Math.floor(rng() * rules.length)];
  const { sequence: full, minBlank, explain } = BUILDERS[rule.id].build(rng);
  const blanks = chooseBlanks(rng, round, full.length, minBlank, full, rule.id);
  const solution = blanks.map((i) => full[i]);
  const used = [...new Set(solution)];
  const spare = shuffle(rng, TILE_IDS.filter((t) => !used.includes(t)));
  const distractors = spare.slice(0, Math.min(randInt(rng, 1, 2), spare.length));
  const palette = shuffle(rng, used.concat(distractors));
  return {
    round,
    ruleId: rule.id,
    title: rule.title,
    hint: rule.hint,
    explain,
    sequence: full.map((t, i) => (blanks.includes(i) ? null : t)),
    blanks,
    solution,
    palette,
    seed: s,
  };
}

// ---------- Checking ----------

export function checkAnswer(puzzle, answer) {
  const need = puzzle && Array.isArray(puzzle.solution) ? puzzle.solution.length : 0;
  if (!Array.isArray(answer) || answer.length !== need) {
    const short = Array.isArray(answer) && answer.length < need;
    return {
      correct: false,
      wrongAt: [],
      message: short ? `Fill all ${need} blank${need === 1 ? '' : 's'} before checking.` : `This pattern has ${need} blank${need === 1 ? '' : 's'}.`,
    };
  }
  const wrongAt = [];
  answer.forEach((t, i) => { if (t !== puzzle.solution[i]) wrongAt.push(i); });
  if (wrongAt.length === 0) return { correct: true, wrongAt, message: `Pattern restored. ${puzzle.explain}` };
  const tip = MISTAKE[puzzle.ruleId] || puzzle.hint || '';
  const lead = wrongAt.length === need ? (need === 1 ? 'That tile does not fit yet.' : 'Those tiles do not fit yet.') : `${wrongAt.length} of ${need} tiles do not fit yet.`;
  return { correct: false, wrongAt, message: `${lead} ${tip}`.trim() };
}

// ---------- Validation of stored data ----------

const isIntArray = (a) => Array.isArray(a) && a.every((x) => Number.isInteger(x));
const sameArray = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

export function isValidPuzzle(p) {
  try {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
    if (p.round !== 1 && p.round !== 2) return false;
    if (!Number.isInteger(p.seed) || p.seed < 0 || p.seed > 0xffffffff) return false;
    if (!RULES.some((r) => r.id === p.ruleId && r.round === p.round)) return false;
    for (const k of ['title', 'hint', 'explain']) if (typeof p[k] !== 'string') return false;
    const { sequence, blanks, solution, palette } = p;
    if (!Array.isArray(sequence) || !isIntArray(blanks) || !Array.isArray(solution) || !Array.isArray(palette)) return false;
    if (sequence.length < 8 || sequence.length > 14) return false;
    if (!sequence.every((t) => t === null || TILE_SET.has(t))) return false;
    if (!solution.every((t) => TILE_SET.has(t)) || !palette.every((t) => TILE_SET.has(t))) return false;
    if (solution.length !== blanks.length || blanks.length === 0) return false;
    if (!blanks.every((b, i) => b >= 0 && b < sequence.length && sequence[b] === null && (i === 0 || b > blanks[i - 1]))) return false;
    if (sequence.filter((t) => t === null).length !== blanks.length) return false;
    // Re-derive from (round, seed): anything edited after generation is rejected.
    const fresh = generatePuzzle(p.round, p.seed);
    return (
      fresh.ruleId === p.ruleId && fresh.title === p.title && fresh.hint === p.hint && fresh.explain === p.explain &&
      sameArray(fresh.sequence, sequence) && sameArray(fresh.blanks, blanks) &&
      sameArray(fresh.solution, solution) && sameArray(fresh.palette, palette)
    );
  } catch {
    return false;
  }
}

// ---------- Two-round session ----------

export function makeSession(seed) {
  const s = normSeed(seed);
  return {
    rounds: [generatePuzzle(1, s), generatePuzzle(2, (s + 1) >>> 0)],
    solved: [false, false],
    attempts: [0, 0],
  };
}

const isPair = (a, pred) => Array.isArray(a) && a.length === 2 && a.every(pred);

export function isValidSession(session) {
  return Boolean(
    session && typeof session === 'object' &&
    isPair(session.rounds, isValidPuzzle) &&
    session.rounds[0].round === 1 && session.rounds[1].round === 2 &&
    isPair(session.solved, (v) => typeof v === 'boolean') &&
    isPair(session.attempts, (v) => Number.isInteger(v) && v >= 0) &&
    !(session.solved[1] && !session.solved[0]),
  );
}

// Pure. Incomplete answers (wrong length) and locked/invalid attempts are not
// counted as attempts. A solved round stays solved; re-submitting it returns
// correct with newlySolved false and the session unchanged, so callers can
// award rewards exactly once by checking newlySolved.
export function applyAttempt(session, roundIndex, answer) {
  const out = (extra) => ({
    session,
    correct: false,
    newlySolved: false,
    unlockedNext: Boolean(session && session.solved && session.solved[0]),
    complete: Boolean(session && session.solved && session.solved[0] && session.solved[1]),
    ...extra,
  });
  if (!isValidSession(session)) return { ...out({ message: 'This puzzle could not be loaded. Start it again.' }), unlockedNext: false, complete: false, error: 'invalid-session' };
  if (roundIndex !== 0 && roundIndex !== 1) return out({ message: 'There is no such round.', error: 'invalid-round' });
  if (roundIndex === 1 && !session.solved[0]) return out({ message: 'Solve round 1 first to unlock round 2.', error: 'locked' });
  const puzzle = session.rounds[roundIndex];
  if (session.solved[roundIndex]) return out({ correct: true, message: 'Already restored.', wrongAt: [] });

  const result = checkAnswer(puzzle, answer);
  if (!Array.isArray(answer) || answer.length !== puzzle.solution.length) {
    return out({ message: result.message, wrongAt: [], error: 'incomplete' });
  }
  const solved = session.solved.slice();
  const attempts = session.attempts.slice();
  attempts[roundIndex] += 1;
  if (result.correct) solved[roundIndex] = true;
  const next = { rounds: session.rounds, solved, attempts };
  return {
    session: next,
    correct: result.correct,
    newlySolved: result.correct,
    wrongAt: result.wrongAt,
    message: result.message,
    unlockedNext: solved[0],
    complete: solved[0] && solved[1],
  };
}
