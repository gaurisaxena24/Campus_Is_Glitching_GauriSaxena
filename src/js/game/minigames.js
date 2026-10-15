// Pure minigame rules (no DOM), shared by the UI and the unit tests.

// ---------- Rhythm (Frozen Character) ----------
export const RHYTHM = { beatMs: 900, windowMs: 300, steps: 8, leadInMs: 1200 };

// Judge a tap. Beat k happens at start + leadIn + k * beat; even beats are
// LEFT, odd beats are RIGHT. Returns { beat, ok, reason }.
export function judgeStep(tapMs, startMs, side, cfg = RHYTHM) {
  const t = tapMs - startMs - cfg.leadInMs;
  const beat = Math.round(t / cfg.beatMs);
  if (beat < 0) return { beat: -1, ok: false, reason: 'early' };
  const off = Math.abs(t - beat * cfg.beatMs);
  const want = beat % 2 === 0 ? 'L' : 'R';
  if (off > cfg.windowMs) return { beat, ok: false, reason: 'timing' };
  if (side !== want) return { beat, ok: false, reason: 'side' };
  return { beat, ok: true, reason: 'hit' };
}

// ---------- Focus (Low Battery) ----------
export const FOCUS = { target: 12, seconds: 25, spawnMs: 700, lifeMs: 1500, distractorEvery: 3 };

// ---------- Sequence (Lost Colour) ----------
export const PALETTE = [
  { id: 'rust', name: 'Rust', hex: '#c0583a' },
  { id: 'ochre', name: 'Ochre', hex: '#e0a83a' },
  { id: 'moss', name: 'Moss', hex: '#6f9a3c' },
  { id: 'sky', name: 'Sky', hex: '#5fa8c8' },
  { id: 'plum', name: 'Plum', hex: '#8a5a9e' },
  { id: 'rose', name: 'Rose', hex: '#d97a8a' },
];
export const SEQUENCE = { length: 5, revealMs: 850 };

export function makeSequence(rand = Math.random, n = SEQUENCE.length) {
  const pool = PALETTE.map((c) => c.id);
  const out = [];
  while (out.length < n) {
    const pick = pool[Math.floor(rand() * pool.length)];
    if (pick !== out[out.length - 1]) out.push(pick);
  }
  return out;
}

// Returns 'continue' | 'wrong' | 'done'
export function checkSequence(input, seq) {
  for (let i = 0; i < input.length; i++) if (input[i] !== seq[i]) return 'wrong';
  return input.length === seq.length ? 'done' : 'continue';
}

// ---------- Social (Missing Connection) ----------
// A small branching scene with a fictional student. Every respectful path can
// connect; pushy choices bounce back gently so the player can try again.
export const SOCIAL = {
  start: 'intro',
  nodes: {
    intro: {
      speaker: 'Someone is sitting alone with a half-finished crossword.',
      choices: [
        { label: 'Smile and say hi', next: 'hi' },
        { label: 'Ask about the crossword', next: 'crossword' },
        { label: 'Sit down right next to them', next: 'tooFast' },
      ],
    },
    hi: {
      speaker: '“Oh, hi!” They look up and smile back.',
      choices: [
        { label: '“Mind if I join you?”', next: 'join' },
        { label: '“How’s your day going?”', next: 'day' },
      ],
    },
    crossword: {
      speaker: '“Seven letters, ‘a fresh look at something familiar’. Any ideas?”',
      choices: [
        { label: '“Revisit?”', next: 'solve' },
        { label: '“No idea, but I like puzzles”', next: 'join' },
      ],
    },
    tooFast: {
      speaker: 'They shift their bag a little. Maybe that was a bit sudden.',
      choices: [{ label: 'Back up and say hi first', next: 'hi' }],
    },
    day: {
      speaker: '“Long. Three classes back to back. This is my first break.”',
      choices: [
        { label: 'Listen and ask what’s next', next: 'listen' },
        { label: 'Talk about your own day instead', next: 'aboutMe' },
      ],
    },
    aboutMe: {
      speaker: 'They nod politely, but their eyes drift back to the paper.',
      choices: [{ label: 'Turn it back to them', next: 'listen' }],
    },
    join: { speaker: '“Sure, pull up a chair.” You work on the crossword together.', end: true },
    solve: { speaker: '“REVISIT! That fits!” They laugh and slide the pen over.', end: true },
    listen: { speaker: '“A quiz next. Thanks for asking, honestly.” The table feels warmer.', end: true },
  },
};

export function socialNext(nodeId, choiceIndex) {
  const node = SOCIAL.nodes[nodeId];
  if (!node || node.end) return null;
  const c = node.choices[choiceIndex];
  return c ? c.next : null;
}

// ---------- Spot the change (Time Loop) ----------
// Positions are percentages within the scene. The scene is a crop of the map
// artwork; changed spots get a subtle glitch shimmer that is easy to miss.
export const SPOT = {
  found: 3,
  spots: [
    { id: 'a', x: 22, y: 34 },
    { id: 'b', x: 68, y: 58 },
    { id: 'c', x: 44, y: 78 },
  ],
};

// ---------- Squad Rally (Shantiniketan) ----------
export const RALLY = { rounds: 4, startLength: 3, pads: 4, noteMs: 650 };

export function rallySequence(rand = Math.random, length = RALLY.startLength + RALLY.rounds - 1) {
  return Array.from({ length }, () => Math.floor(rand() * RALLY.pads));
}
