// Save and restore in this browser only (docs/06 section 8).
// Session (current 15-minute run), profile (XP, badges, squad, days) and
// settings are stored under separate keys. Everything is validated on load;
// corrupted data is discarded so the game always starts safely.

import { MISSION_IDS } from '../data/missions.js';
import {
  SCHEMA_VERSION, SESSION, MISSION, createInitialState, sanitizeDrafts, sanitizeTracks, sanitizeReflections,
  sanitizeHunts, sanitizePuzzles, sanitizeEpisodes,
} from './state.js';
import { sanitizeProfile } from './profile.js';

export const SESSION_KEY = 'campus-glitching:session:v2';
export const PROFILE_KEY = 'campus-glitching:profile:v1';
export const SETTINGS_KEY = 'campus-glitching:settings:v1';
const OLD_KEYS = ['campus-glitching:session:v1'];

export const DEFAULT_SETTINGS = Object.freeze({ sound: false, reduceMotion: false, largeText: false, lastTab: 'map' });
const TABS = ['map', 'quests', 'inventory', 'squad', 'status'];

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isNumOrNull = (v) => v === null || isNum(v);
const isBool = (v) => typeof v === 'boolean';

export function serialize(state) {
  return JSON.stringify(state);
}

export function deserialize(json) {
  let raw;
  try {
    raw = typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object' || raw.version !== SCHEMA_VERSION) return null;
  const s = raw.session;
  if (!s || !Object.values(SESSION).includes(s.status)) return null;
  if (!isNumOrNull(s.startedAt) || !isNumOrNull(s.pausedAt) || !isNum(s.pausedMs) || !isNumOrNull(s.endedAt)) return null;
  if (s.status !== SESSION.NOT_STARTED && !isNum(s.startedAt)) return null;
  if (s.status === SESSION.PAUSED && !isNum(s.pausedAt)) return null;
  if (s.status === SESSION.ENDED && !isNum(s.endedAt)) return null;

  const base = createInitialState();
  const missions = {};
  for (const id of MISSION_IDS) {
    const m = raw.missions && raw.missions[id];
    if (!m || !Object.values(MISSION).includes(m.status)) return null;
    if (!isBool(m.physicalComplete) || !isBool(m.digitalComplete)) return null;
    if (m.status === MISSION.REPAIRED && !(m.physicalComplete && m.digitalComplete)) return null;
    if (m.status === MISSION.UNDISCOVERED && (m.physicalComplete || m.digitalComplete)) return null;
    const result = m.result && typeof m.result === 'object' && typeof m.result.game === 'string' ? { game: m.result.game, perfect: m.result.perfect === true, ...(typeof m.result.rank === 'string' ? { rank: m.result.rank.slice(0, 40) } : {}), ...(Number.isInteger(m.result.total) ? { total: m.result.total } : {}) } : null;
    if (m.digitalComplete && !result) return null;
    missions[id] = {
      ...base.missions[id],
      status: m.status,
      physicalComplete: m.physicalComplete,
      physicalMethod: m.physicalComplete && ['gps', 'steps', 'simulator', 'photo', 'self'].includes(m.physicalMethod) ? m.physicalMethod : m.physicalComplete ? 'self' : null,
      walk: sanitizeWalk(m.walk),
      physicalStartedAt: isNum(m.physicalStartedAt) ? m.physicalStartedAt : null,
      digitalStartedAt: isNum(m.digitalStartedAt) ? m.digitalStartedAt : null,
      digitalComplete: m.digitalComplete,
      result,
      note: typeof m.note === 'string' ? m.note.slice(0, 500) : '',
      activatedAt: isNum(m.activatedAt) ? m.activatedAt : null,
      physicalAt: isNum(m.physicalAt) ? m.physicalAt : null,
      digitalAt: isNum(m.digitalAt) ? m.digitalAt : null,
      repairedAt: isNum(m.repairedAt) ? m.repairedAt : null,
      celebrated: m.celebrated === true,
    };
  }
  return {
    ...base,
    session: {
      status: s.status,
      startedAt: s.startedAt,
      pausedAt: s.pausedAt,
      pausedMs: s.pausedMs,
      endedAt: s.endedAt,
      endReason: ['TIMEOUT', 'FINISHED', 'VICTORY'].includes(s.endReason) ? s.endReason : null,
    },
    missions,
    drafts: sanitizeDrafts(raw.drafts),
    tracks: sanitizeTracks(raw.tracks),
    reflections: sanitizeReflections(raw.reflections),
    hunts: sanitizeHunts(raw.hunts),
    puzzles: sanitizePuzzles(raw.puzzles),
    episodes: sanitizeEpisodes(raw.episodes),
    unlockAll: raw.unlockAll === true,
  };
}

function sanitizeWalk(w) {
  if (!w || typeof w !== 'object') return null;
  const ok = (v) => isNum(v) && v >= 0;
  return ok(w.distanceM) && ok(w.activeMs) && ok(w.movingMs) ? { distanceM: w.distanceM, activeMs: w.activeMs, movingMs: w.movingMs, steps: Number.isInteger(w.steps) && w.steps >= 0 ? w.steps : 0 } : null;
}

// Every call is guarded: storage can be blocked (private mode) or full.
export function createStorage(backend) {
  let available = true;
  try {
    const probe = '__campus_probe__';
    backend.setItem(probe, '1');
    backend.removeItem(probe);
  } catch {
    available = false;
  }
  return {
    get available() {
      return available;
    },
    read(key) {
      if (!available) return null;
      try {
        return backend.getItem(key);
      } catch {
        return null;
      }
    },
    write(key, value) {
      if (!available) return false;
      try {
        backend.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    remove(key) {
      if (!available) return;
      try {
        backend.removeItem(key);
      } catch {
        /* ignore */
      }
    },
  };
}

export function loadSettings(storage) {
  const raw = storage.read(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const p = JSON.parse(raw);
    return {
      sound: p.sound === true,
      reduceMotion: p.reduceMotion === true,
      largeText: p.largeText === true,
      lastTab: TABS.includes(p.lastTab) ? p.lastTab : 'map',
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(storage, settings) {
  return storage.write(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadSession(storage) {
  for (const k of OLD_KEYS) storage.remove(k); // earlier save format is not compatible
  const raw = storage.read(SESSION_KEY);
  return raw ? deserialize(raw) : null;
}

export function saveSession(storage, state) {
  return storage.write(SESSION_KEY, serialize(state));
}

export function clearSession(storage) {
  storage.remove(SESSION_KEY);
}

export function loadProfile(storage) {
  const raw = storage.read(PROFILE_KEY);
  if (!raw) return sanitizeProfile(null);
  try {
    return sanitizeProfile(JSON.parse(raw));
  } catch {
    return sanitizeProfile(null);
  }
}

export function saveProfile(storage, profile) {
  return storage.write(PROFILE_KEY, JSON.stringify(profile));
}

export function clearAll(storage) {
  storage.remove(SESSION_KEY);
  storage.remove(PROFILE_KEY);
}
