// Session state and the single source of truth for mission progression.
// Pure functions only: no DOM, no storage, no clock. Time is passed in as `now`.
//
// Mission states (docs/06 section 5, owner direction 10 Oct 2026):
//   UNDISCOVERED --ACTIVATE--> ACTIVE --REPAIR (physical && digital)--> REPAIRED
// Physical and digital are independent flags on an ACTIVE mission, completed in
// either order. REPAIR is a separate player action that is refused until both
// parts are done. REPAIRED is terminal.
//
// Tokens are DERIVED (2 x repaired missions), never stored as a counter.
//
// Physical completion records HOW it was done (`physicalMethod`):
//   'steps'     - Frozen Character walk verified by estimated steps (motion
//                 sensor) over 2 tracked minutes (tracking.js walkMet).
//   'gps'       - same walk verified by GPS distance when no motion data exists.
//   'simulator' - the rule met with the dev-only GPS simulator. Never shown as GPS.
//   'self'      - self-reported (every other challenge, and the no-GPS walk).
//   'photo'     - Lost Colour: every photo passed the on-device colour check.
// The reflection journal is separate: saving or skipping it never completes,
// or blocks, a physical or digital part.
//
// Distinct states per glitch (none implies another):
//   discovered/accepted  status ACTIVE (activatedAt)
//   physical started     physicalStartedAt        physical done  physicalComplete
//   digital started      digitalStartedAt         digital done   digitalComplete
//   reflection           reflections[id] (saved, or skipped: true)
//   repaired             status REPAIRED (repairedAt)
//   reward granted       celebrated (XP ledger keys make rewards once-only)
//
// Device-feature data (all validated here, so the UI cannot fake progress):
//   hunts[id]    Lost Colour photo collection: target colour + passed items
//                (hash, colour, confidence). Never the photos themselves.
//   puzzles[id]  Lost Colour two-round pattern session (pattern.js), checked
//                by regenerating each puzzle from its seed.
//   episodes[id] Missing Connection: { episodeId, messages }. The conversation
//                is rebuilt by replaying the messages through the engine.

import { MISSIONS, MISSION_IDS, FIRST_MISSION_ID, MAX_REFLECTION, getMission, validateMinigameResult, cleanNote } from '../data/missions.js';
import { sanitizeSummary, walkMet, walkBasis, TRACK } from './tracking.js';
import { makeSession, applyAttempt, isValidSession } from './pattern.js';
import { startEpisode, sendMessage, evaluate as evaluateEpisode, EPISODES, TURNS, MAX_CHARS, CONVERSATION_PASS_SCORE } from './conversation.js';
import { COLOUR_RULES, HASH_RE, isLikelyDuplicate } from './colour.js';

export const SCHEMA_VERSION = 2;
export const DURATION_MS = 15 * 60 * 1000;
export const CONVERSATION_REFLECTION_MS = 30_000;
export const TOKENS_PER_REPAIR = 2;
export const MAX_TOKENS = MISSIONS.length * TOKENS_PER_REPAIR;

export const SESSION = Object.freeze({
  NOT_STARTED: 'NOT_STARTED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  ENDED: 'ENDED',
});

export const MISSION = Object.freeze({
  UNDISCOVERED: 'UNDISCOVERED',
  ACTIVE: 'ACTIVE',
  REPAIRED: 'REPAIRED',
});

function freshMission(id) {
  return {
    id,
    status: MISSION.UNDISCOVERED,
    physicalComplete: false,
    physicalMethod: null, // 'steps' | 'gps' | 'simulator' | 'photo' | 'self'
    physicalStartedAt: null,
    digitalStartedAt: null,
    walk: null, // { distanceM, activeMs, movingMs } when completed by tracking
    digitalComplete: false,
    result: null, // { game, perfect }
    note: '',
    activatedAt: null,
    physicalAt: null,
    digitalAt: null,
    repairedAt: null,
    celebrated: false,
  };
}

export function createInitialState() {
  const missions = {};
  for (const id of MISSION_IDS) missions[id] = freshMission(id);
  return {
    version: SCHEMA_VERSION,
    session: {
      status: SESSION.NOT_STARTED,
      startedAt: null,
      pausedAt: null,
      pausedMs: 0,
      endedAt: null,
      endReason: null,
    },
    missions,
    unlockAll: false,
    drafts: {},
    tracks: {}, // missionId -> walk summary (tracking.js summarize; no coordinates)
    reflections: {}, // missionId -> { answers: string[], savedAt, skipped? }
    hunts: {},
    puzzles: {},
    episodes: {},
  };
}

// ---------- time ----------

export function elapsedMs(state, now) {
  const s = state.session;
  if (s.status === SESSION.NOT_STARTED || s.startedAt == null) return 0;
  const until = s.status === SESSION.ENDED ? s.endedAt : s.status === SESSION.PAUSED ? s.pausedAt : now;
  return Math.max(0, until - s.startedAt - s.pausedMs);
}

export function remainingMs(state, now) {
  return Math.max(0, DURATION_MS - elapsedMs(state, now));
}

export function formatClock(ms) {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function applyTimeout(state, now) {
  const s = state.session;
  if (s.status !== SESSION.RUNNING) return state;
  const deadline = s.startedAt + s.pausedMs + DURATION_MS;
  if (now < deadline) return state;
  return { ...state, session: { ...s, status: SESSION.ENDED, endedAt: deadline, endReason: 'TIMEOUT' } };
}

// ---------- selectors ----------

export function repairedCount(state) {
  return MISSION_IDS.filter((id) => state.missions[id].status === MISSION.REPAIRED).length;
}

export function tokenCount(state) {
  return repairedCount(state) * TOKENS_PER_REPAIR;
}

// Campus restoration: each glitch is 20%; a part done counts a little.
export function restorationPercent(state) {
  let pts = 0;
  for (const id of MISSION_IDS) {
    const m = state.missions[id];
    if (m.status === MISSION.REPAIRED) pts += 4;
    else pts += (m.physicalComplete ? 1 : 0) + (m.digitalComplete ? 1 : 0);
  }
  return Math.round((pts / (MISSION_IDS.length * 4)) * 100);
}

export function isUnlocked(state, id) {
  const index = MISSIONS.findIndex((m) => m.id === id);
  if (index < 0) return false;
  // Progression is linear and derived from the immediately preceding repair.
  // Existing per-mission status (or the accessibility toggle) must not let a
  // player skip the sequence.
  return index === 0 || state.missions[MISSIONS[index - 1].id]?.status === MISSION.REPAIRED;
}

export function unlockedCount(state) {
  return MISSION_IDS.filter((id) => isUnlocked(state, id)).length;
}

export function readyToRepair(m) {
  return m.status === MISSION.ACTIVE && m.physicalComplete && m.digitalComplete;
}

// Display state used by markers, badges and the legend.
export function displayState(state, id) {
  const m = state.missions[id];
  if (m.status === MISSION.REPAIRED) return 'REPAIRED';
  if (!isUnlocked(state, id)) return 'LOCKED';
  if (m.status === MISSION.UNDISCOVERED) return 'AVAILABLE';
  if (readyToRepair(m)) return 'READY';
  if (m.physicalComplete) return 'PHYSICAL_COMPLETE';
  if (m.digitalComplete) return 'DIGITAL_COMPLETE';
  return 'ACTIVE';
}

export function canPlay(state) {
  return state.session.status === SESSION.RUNNING;
}

// Why an action would be refused, for clear error feedback in the UI.
export function repairBlocker(state, id) {
  const m = state.missions[id];
  if (!m) return 'Unknown glitch.';
  if (!isUnlocked(state, id)) return 'Complete the previous challenge to unlock this.';
  if (!canPlay(state)) return state.session.status === SESSION.PAUSED ? 'Resume the session first.' : 'The session is not running.';
  if (m.status === MISSION.REPAIRED) return 'Already repaired.';
  if (m.status !== MISSION.ACTIVE) return 'Accept the challenge first.';
  if (!m.physicalComplete && !m.digitalComplete) return 'Complete both parts first.';
  if (!m.physicalComplete) return 'Finish the physical challenge first.';
  if (!m.digitalComplete) return 'Win the digital mission first.';
  return null;
}

// ---------- reducer ----------

function withMission(state, id, patch) {
  return { ...state, missions: { ...state.missions, [id]: { ...state.missions[id], ...patch } } };
}

export function reduce(state, action) {
  const now = action.now ?? 0;
  state = applyTimeout(state, now);
  const s = state.session;

  switch (action.type) {
    case 'TICK':
      return state;

    case 'START_SESSION':
      if (s.status !== SESSION.NOT_STARTED) return state;
      return { ...state, session: { ...s, status: SESSION.RUNNING, startedAt: now } };

    case 'PAUSE':
      if (s.status !== SESSION.RUNNING) return state;
      return { ...state, session: { ...s, status: SESSION.PAUSED, pausedAt: now } };

    case 'RESUME':
      if (s.status !== SESSION.PAUSED) return state;
      return { ...state, session: { ...s, status: SESSION.RUNNING, pausedMs: s.pausedMs + (now - s.pausedAt), pausedAt: null } };

    case 'FINISH': {
      if (s.status !== SESSION.RUNNING && s.status !== SESSION.PAUSED) return state;
      const endedAt = s.status === SESSION.PAUSED ? s.pausedAt : now;
      return { ...state, session: { ...s, status: SESSION.ENDED, endedAt, endReason: 'FINISHED' } };
    }

    case 'RESTART':
      return { ...createInitialState(), unlockAll: state.unlockAll };

    case 'SET_UNLOCK_ALL':
      return { ...state, unlockAll: Boolean(action.value) };

    case 'SAVE_DRAFT': {
      if (!state.missions[action.id]) return state;
      return { ...state, drafts: { ...state.drafts, [action.id]: sanitizeDraft({ ...(state.drafts[action.id] || {}), ...action.draft }) } };
    }

    case 'ACTIVATE': {
      const m = state.missions[action.id];
      if (!m || !canPlay(state) || !isUnlocked(state, action.id) || m.status !== MISSION.UNDISCOVERED) return state;
      return withMission(state, action.id, { status: MISSION.ACTIVE, activatedAt: now });
    }

    case 'COMPLETE_PHYSICAL': {
      const m = state.missions[action.id];
      if (!m || !isUnlocked(state, action.id) || !canPlay(state) || m.status !== MISSION.ACTIVE || m.physicalComplete) return state;
      const phys = getMission(action.id).physical;
      if (phys.kind === 'consent' && action.method !== 'ai-reflection') return state;
      if (action.method === 'ai-reflection') {
        const d = state.drafts[action.id] || {};
        if (phys.kind !== 'consent' || !d.conversationReportedAt || !d.conversationReflectionStartedAt || now - d.conversationReflectionStartedAt < CONVERSATION_REFLECTION_MS || d.conversationReflectionResult?.passed !== true) return state;
      }
      const patch = { physicalComplete: true, physicalAt: now, note: cleanNote(action.note) || m.note, physicalMethod: 'self', walk: null };
      if (action.method === 'tracked') {
        const t = state.tracks[action.id];
        const p = getMission(action.id).physical;
        if (p.kind !== 'walk' || !walkMet(t, p.stepTarget)) return state;
        patch.physicalMethod = t.source === 'simulator' ? 'simulator' : walkBasis(t);
        patch.walk = { distanceM: t.distanceM, activeMs: t.activeMs, movingMs: t.movingMs, steps: t.steps || 0 };
      }
      if (phys.kind === 'camera') {
        const h = state.hunts[action.id];
        if (action.method === 'reported') {
          patch.physicalMethod = 'self';
        } else {
          if (!h || h.items.length < phys.count) return state;
          patch.physicalMethod = 'photo';
        }
      } else if (phys.kind === 'walk' && action.method !== 'tracked' && action.method !== 'self') {
        return state;
      }
      const tracks = { ...state.tracks };
      delete tracks[action.id];
      return { ...withMission(state, action.id, patch), tracks };
    }

    case 'MARK_STARTED': {
      const m = state.missions[action.id];
      const key = action.part === 'digital' ? 'digitalStartedAt' : action.part === 'physical' ? 'physicalStartedAt' : null;
      if (!m || !isUnlocked(state, action.id) || !key || m.status !== MISSION.ACTIVE || m[key] != null) return state;
      return withMission(state, action.id, { [key]: now });
    }

    case 'HUNT_INIT': {
      const m = state.missions[action.id];
      const phys = getMission(action.id)?.physical;
      if (!m || !isUnlocked(state, action.id) || m.status !== MISSION.ACTIVE || !phys || phys.kind !== 'camera' || state.hunts[action.id]) return state;
      const seed = Math.floor((state.session.startedAt || 0) / 1000);
      const target = phys.targets[seed % phys.targets.length];
      return { ...state, hunts: { ...state.hunts, [action.id]: { target, items: [] } } };
    }

    case 'HUNT_ADD': {
      const m = state.missions[action.id];
      const h = state.hunts[action.id];
      const phys = getMission(action.id)?.physical;
      if (!m || !isUnlocked(state, action.id) || !h || !canPlay(state) || m.status !== MISSION.ACTIVE || m.physicalComplete) return state;
      const item = sanitizeHuntItem(action.item);
      if (!item || h.items.length >= phys.count) return state;
      if (item.colourId !== h.target || item.confidence < COLOUR_RULES.passConfidence) return state; // no progress for a failed match
      if (isLikelyDuplicate(item.hash, h.items.map((i) => i.hash))) return state;
      return { ...state, hunts: { ...state.hunts, [action.id]: { ...h, items: [...h.items, { ...item, at: now }] } } };
    }

    case 'PATTERN_INIT': {
      const m = state.missions[action.id];
      if (!m || !isUnlocked(state, action.id) || m.status !== MISSION.ACTIVE || getMission(action.id).digital.game !== 'pattern' || state.puzzles[action.id]) return state;
      const seed = Number.isInteger(action.seed) ? action.seed >>> 0 : Math.floor(now) >>> 0;
      return { ...state, puzzles: { ...state.puzzles, [action.id]: makeSession(seed) } };
    }

    case 'PATTERN_ATTEMPT': {
      const m = state.missions[action.id];
      const p = state.puzzles[action.id];
      if (!m || !isUnlocked(state, action.id) || !p || !canPlay(state) || m.status !== MISSION.ACTIVE) return state;
      const r = applyAttempt(p, action.round, action.answer);
      if (r.error || r.session === p) return state;
      return { ...state, puzzles: { ...state.puzzles, [action.id]: r.session } };
    }

    case 'EPISODE_START': {
      const m = state.missions[action.id];
      if (!m || !isUnlocked(state, action.id) || ![MISSION.ACTIVE, MISSION.REPAIRED].includes(m.status) || getMission(action.id).digital.game !== 'episode') return state;
      if (!EPISODES.some((e) => e.id === action.episodeId)) return state;
      return { ...state, episodes: { ...state.episodes, [action.id]: { episodeId: action.episodeId, messages: [] } } };
    }

    case 'EPISODE_CLEAR': {
      if (!state.episodes[action.id]) return state;
      const episodes = { ...state.episodes };
      delete episodes[action.id];
      return { ...state, episodes };
    }

    case 'EPISODE_SEND': {
      const m = state.missions[action.id];
      const e = state.episodes[action.id];
      if (!m || !isUnlocked(state, action.id) || ![MISSION.ACTIVE, MISSION.REPAIRED].includes(m.status) || !e || typeof action.text !== 'string') return state;
      const text = action.text.trim();
      if (!text || text.length > MAX_CHARS || e.messages.length >= TURNS) return state;
      try {
        sendMessage(replayEpisode(e), text);
      } catch {
        return state;
      }
      return { ...state, episodes: { ...state.episodes, [action.id]: { ...e, messages: [...e.messages, text] } } };
    }

    case 'SET_TRACK': {
      const m = state.missions[action.id];
      if (!m || !isUnlocked(state, action.id) || m.status !== MISSION.ACTIVE || m.physicalComplete || getMission(action.id).physical.kind !== 'walk') return state;
      const t = sanitizeSummary(action.track);
      if (!t) return state;
      return { ...state, tracks: { ...state.tracks, [action.id]: t } };
    }

    case 'CLEAR_TRACK': {
      if (!state.tracks[action.id]) return state;
      const tracks = { ...state.tracks };
      delete tracks[action.id];
      return { ...state, tracks };
    }

    case 'SKIP_REFLECTION': {
      const m = state.missions[action.id];
      if (!m || !isUnlocked(state, action.id) || m.status === MISSION.UNDISCOVERED || state.reflections[action.id]) return state;
      return { ...state, reflections: { ...state.reflections, [action.id]: { answers: getMission(action.id).reflect.map(() => ''), savedAt: now, skipped: true } } };
    }

    case 'SAVE_REFLECTION': {
      const m = state.missions[action.id];
      if (!m || !isUnlocked(state, action.id) || m.status === MISSION.UNDISCOVERED) return state;
      const answers = sanitizeAnswers(action.answers, getMission(action.id).reflect.length);
      return { ...state, reflections: { ...state.reflections, [action.id]: { answers, savedAt: now } } };
    }

    case 'SUBMIT_DIGITAL': {
      const m = state.missions[action.id];
      if (!m || !isUnlocked(state, action.id) || !canPlay(state) || m.status !== MISSION.ACTIVE || m.digitalComplete) return state;
      const game = getMission(action.id).digital.game;
      let value;
      if (game === 'pattern') {
        const p = state.puzzles[action.id];
        if (!p || !p.solved.every(Boolean)) return state;
        value = { game, perfect: p.attempts.every((a) => a === 1) };
      } else if (game === 'episode') {
        const ev = episodeResult(state, action.id);
        if (!ev || ev.total < CONVERSATION_PASS_SCORE) return state;
        value = { game, perfect: ev.rank.id === 'kindred-spirit', rank: ev.rank.title, total: ev.total };
      } else {
        const r = validateMinigameResult(action.id, action.result);
        if (!r.ok) return state;
        value = r.value;
      }
      return withMission(state, action.id, { digitalComplete: true, digitalAt: now, result: value });
    }

    case 'REPAIR': {
      const m = state.missions[action.id];
      if (repairBlocker(state, action.id)) return state;
      let next = withMission(state, action.id, { status: MISSION.REPAIRED, repairedAt: now });
      if (repairedCount(next) === MISSION_IDS.length) {
        next = { ...next, session: { ...next.session, status: SESSION.ENDED, endedAt: now, endReason: 'VICTORY' } };
      }
      void m;
      return next;
    }

    case 'MARK_CELEBRATED': {
      const m = state.missions[action.id];
      if (!m || m.status !== MISSION.REPAIRED || m.celebrated) return state;
      return withMission(state, action.id, { celebrated: true });
    }

    default:
      return state;
  }
}

// ---------- drafts ----------
// Only these fields may be kept in a draft (and therefore in storage).
const MAX_DRAFT = 500;

export function sanitizeDraft(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  if (typeof raw.note === 'string') out.note = raw.note.slice(0, MAX_DRAFT);
  if (raw.consent === true) out.consent = true;
  if (Number.isFinite(raw.conversationReportedAt) && raw.conversationReportedAt > 0) out.conversationReportedAt = raw.conversationReportedAt;
  if (Number.isFinite(raw.conversationReflectionStartedAt) && raw.conversationReflectionStartedAt > 0) out.conversationReflectionStartedAt = raw.conversationReflectionStartedAt;
  if (typeof raw.conversationReflection === 'string') out.conversationReflection = raw.conversationReflection.slice(0, MAX_DRAFT);
  if (raw.conversationReflectionResult && typeof raw.conversationReflectionResult === 'object') {
    const r = raw.conversationReflectionResult;
    if (typeof r.passed === 'boolean' && Number.isInteger(r.score) && r.score >= 1 && r.score <= 5 && typeof r.feedback === 'string' && typeof r.suggestion === 'string' && Number.isFinite(r.evaluatedAt)) {
      out.conversationReflectionResult = { passed: r.passed, score: r.score, feedback: r.feedback.slice(0, 160), suggestion: r.suggestion.slice(0, 160), evaluatedAt: r.evaluatedAt };
    }
  }
  if (typeof raw.timerStartedAt === 'number' && Number.isFinite(raw.timerStartedAt)) out.timerStartedAt = raw.timerStartedAt;
  if (Number.isInteger(raw.counted) && raw.counted >= 0 && raw.counted <= 10) out.counted = raw.counted;
  return out;
}

// ---------- device-feature helpers ----------

export function sanitizeHuntItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.hash !== 'string' || !HASH_RE.test(raw.hash)) return null;
  if (typeof raw.hex !== 'string' || !/^#[0-9a-f]{6}$/i.test(raw.hex)) return null;
  if (typeof raw.colourId !== 'string' || typeof raw.confidence !== 'number' || !(raw.confidence >= 0 && raw.confidence <= 1)) return null;
  return { hash: raw.hash, hex: raw.hex, colourId: raw.colourId, confidence: Math.round(raw.confidence * 100) / 100, ...(Number.isFinite(raw.at) ? { at: raw.at } : {}) };
}

export function sanitizeHunts(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const mission of MISSIONS) {
    const h = raw[mission.id];
    if (mission.physical.kind !== 'camera' || !h || !mission.physical.targets.includes(h.target) || !Array.isArray(h.items)) continue;
    const items = h.items.map(sanitizeHuntItem).filter((i) => i && i.colourId === h.target).slice(0, mission.physical.count);
    out[mission.id] = { target: h.target, items };
  }
  return out;
}

export function sanitizePuzzles(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const mission of MISSIONS) {
    if (mission.digital.game === 'pattern' && raw[mission.id] && isValidSession(raw[mission.id])) out[mission.id] = raw[mission.id];
  }
  return out;
}

// Rebuild a conversation from its messages. Throws if they are not a valid episode.
export function replayEpisode(e) {
  let st = startEpisode(e.episodeId);
  for (const text of e.messages) st = sendMessage(st, text).state;
  return st;
}

export function sanitizeEpisodes(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const mission of MISSIONS) {
    const e = raw[mission.id];
    if (mission.digital.game !== 'episode' || !e || !Array.isArray(e.messages) || e.messages.length > TURNS) continue;
    if (!e.messages.every((t) => typeof t === 'string')) continue;
    try {
      replayEpisode(e);
      out[mission.id] = { episodeId: e.episodeId, messages: [...e.messages] };
    } catch { /* invalid: drop it */ }
  }
  return out;
}

// Evaluation of a finished episode, or null.
export function episodeResult(state, id) {
  const e = state.episodes[id];
  if (!e || e.messages.length < TURNS) return null;
  try {
    return evaluateEpisode(replayEpisode(e));
  } catch {
    return null;
  }
}

export function sanitizeAnswers(raw, n) {
  const list = Array.isArray(raw) ? raw : [];
  return Array.from({ length: n }, (_, i) => (typeof list[i] === 'string' ? list[i].trim().slice(0, MAX_REFLECTION) : ''));
}

// Saved form of the journal: unknown missions and malformed entries are dropped.
export function sanitizeReflections(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const mission of MISSIONS) {
    const r = raw[mission.id];
    if (!r || typeof r !== 'object' || typeof r.savedAt !== 'number' || !Number.isFinite(r.savedAt)) continue;
    out[mission.id] = { answers: sanitizeAnswers(r.answers, mission.reflect.length), savedAt: r.savedAt, ...(r.skipped === true ? { skipped: true } : {}) };
  }
  return out;
}

export function sanitizeTracks(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const mission of MISSIONS) {
    if (mission.physical.kind !== 'walk') continue;
    const t = sanitizeSummary(raw[mission.id]);
    if (t) out[mission.id] = t.status === TRACK.TRACKING ? { ...t, status: TRACK.PAUSED } : t;
  }
  return out;
}

export function hasReflection(state, id) {
  const r = state.reflections[id];
  return Boolean(r) && r.answers.some((a) => a);
}

export function sanitizeDrafts(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const id of MISSION_IDS) if (raw[id]) out[id] = sanitizeDraft(raw[id]);
  return out;
}

export function pendingCelebrations(state) {
  return MISSION_IDS.filter((id) => state.missions[id].status === MISSION.REPAIRED && !state.missions[id].celebrated);
}

export { FIRST_MISSION_ID };
