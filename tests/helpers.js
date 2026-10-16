// Shared test helpers (not a test file). They complete each glitch's parts
// using the same evidence the game requires, so reducer rules are exercised.
import { reduce } from '../src/js/game/state.js';
import { getMission } from '../src/js/data/missions.js';
import { EPISODES } from '../src/js/game/conversation.js';

export const WIN = {
  'frozen-character': { melted: 100, perfect: true },
  'lost-colour': { correct: true, perfect: true },
  'missing-connection': { connected: true, path: 0 },
};

// Five perceptually different image hashes (pairwise Hamming distance >= 32).
export const HASHES = ['0000000000000000', 'ffffffff00000000', '00000000ffffffff', 'ffff0000ffff0000', '0000ffff0000ffff'];

export function finishPhysical(s, id, t) {
  const physical = getMission(id).physical;
  if (physical.kind === 'consent') {
    s = reduce(s, { type: 'SAVE_DRAFT', id, draft: {
      consent: true,
      conversationReportedAt: t,
      conversationReflectionStartedAt: t,
      conversationReflection: 'We talked about campus music and I learned they play guitar.',
      conversationReflectionResult: { passed: true, score: 4, feedback: 'Good listening.', suggestion: 'Ask what they are learning next.', evaluatedAt: t + 30_000 },
    }, now: t });
    return reduce(s, { type: 'COMPLETE_PHYSICAL', id, method: 'ai-reflection', now: t + 30_000 });
  }
  if (physical.kind === 'camera') {
    s = reduce(s, { type: 'HUNT_INIT', id, now: t });
    const target = s.hunts[id].target;
    for (const hash of HASHES) s = reduce(s, { type: 'HUNT_ADD', id, item: { hash, hex: '#2a5bd7', colourId: target, confidence: 0.8 }, now: t });
  }
  return reduce(s, { type: 'COMPLETE_PHYSICAL', id, method: getMission(id).physical.kind === 'camera' ? 'reported' : 'self', now: t });
}

export const EPISODE_LINES = [
  'Hi. Rough meeting? You looked a bit lost in there.',
  'That sounds really hard. Lots of people feel that in their first weeks.',
  'Do you write your own songs?',
  'Home songs sound lovely. What do you miss most about home?',
  'Standing by the door still takes guts. Want to go on Thursday together?',
];

export function finishDigital(s, id, t) {
  const game = getMission(id).digital.game;
  if (game === 'pattern') {
    s = reduce(s, { type: 'PATTERN_INIT', id, seed: 7, now: t });
    s = reduce(s, { type: 'PATTERN_ATTEMPT', id, round: 0, answer: s.puzzles[id].rounds[0].solution, now: t });
    s = reduce(s, { type: 'PATTERN_ATTEMPT', id, round: 1, answer: s.puzzles[id].rounds[1].solution, now: t });
  } else if (game === 'episode') {
    s = reduce(s, { type: 'EPISODE_START', id, episodeId: EPISODES[1].id, now: t });
    for (const text of EPISODE_LINES) s = reduce(s, { type: 'EPISODE_SEND', id, text, now: t });
  }
  return reduce(s, { type: 'SUBMIT_DIGITAL', id, result: WIN[id], now: t });
}
