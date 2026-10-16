// Player profile: progression that lasts across sessions on this device.
// XP, level, badges, daily challenges, streak, avatar and the local squad.
// Pure functions. Dates are local calendar days as 'YYYY-MM-DD' strings.
//
// XP is awarded through idempotent keys, so the same event (for example
// "repair of a glitch in session X") can never pay out twice, even after
// reloads, double taps or navigation. Repair tokens are separate and still
// follow the documented rule: exactly 2 per repaired glitch.

import { DAILY, MISSIONS } from '../data/missions.js';

export const PROFILE_VERSION = 1;
export const XP_PER_LEVEL = 150;

export const XP = Object.freeze({
  physical: 20,
  digital: 20,
  perfect: 10,
  round: 15, // each pattern-puzzle round, once
  repair: 50,
  squadBonus: 10,
  daily: 30,
  rally: 40,
  victory: 100,
  personalBest: 25,
});

export const GAME_RECORDS = Object.freeze({
  thaw: { title: 'Frozen Character · Thaw', maxScore: 1000 },
  sequence: { title: 'Lost Colour · Colour Pattern', maxScore: 300 },
  episode: { title: 'Lost Connection · Conversation', maxScore: 15 },
});

export const AVATARS = [
  { id: 'compass', name: 'Navigator', colour: '#b6e632' },
  { id: 'leaf', name: 'Gardener', colour: '#7fbf5a' },
  { id: 'quill', name: 'Chronicler', colour: '#e8a33d' },
  { id: 'steps', name: 'Wanderer', colour: '#d9734a' },
  { id: 'signal', name: 'Tuner', colour: '#5fb3c8' },
  { id: 'seal', name: 'Keeper', colour: '#c58fd9' },
];

// Fictional teammate characters for local squad play. They are game
// characters, not real people, and are always shown as such.
export const TEAMMATES = [
  { id: 'ira', name: 'Ira', role: 'Cartographer', colour: '#5fb3c8', hair: 0, line: 'I mapped a shortcut. We’re not taking it.' },
  { id: 'kabir', name: 'Kabir', role: 'Runner', colour: '#d9734a', hair: 1, line: 'Walking pace today. Doctor’s orders: mine.' },
  { id: 'meera', name: 'Meera', role: 'Listener', colour: '#c58fd9', hair: 2, line: 'Ask one question, then really listen.' },
  { id: 'dev', name: 'Dev', role: 'Tinkerer', colour: '#e8a33d', hair: 3, line: 'Every glitch has a loose wire somewhere.' },
  { id: 'noor', name: 'Noor', role: 'Botanist', colour: '#7fbf5a', hair: 4, line: 'Colours come back if you stop long enough.' },
];

export const SQUAD_COLOURS = ['#b6e632', '#e8a33d', '#5fb3c8', '#c58fd9', '#d9734a'];

export const BADGES = [
  { id: 'first-repair', name: 'First Fix', desc: 'Repair your first glitch.', icon: 'seal' },
  { id: 'restored', name: 'Campus Restored', desc: 'Repair all three glitches in one session.', icon: 'compass' },
  { id: 'focus-perfect', name: 'Ice Breaker', desc: 'Thaw the frozen character in one clean run.', icon: 'signal' },
  { id: 'rhythm-perfect', name: 'Colour Echo', desc: 'Clear every colour sequence without a miss.', icon: 'steps' },
  { id: 'patient', name: 'Pattern Pro', desc: 'Restore colour with a perfect pattern run.', icon: 'leaf' },
  { id: 'listener', name: 'Good Listener', desc: 'Reconnect through a thoughtful conversation.', icon: 'squad' },
  { id: 'squad-up', name: 'Squad Up', desc: 'Form a local squad.', icon: 'squad' },
  { id: 'rally', name: 'Chorus', desc: 'Win the Squad Rally.', icon: 'sound' },
  { id: 'daily', name: 'Daily Explorer', desc: 'Complete a daily challenge.', icon: 'flag' },
  { id: 'streak-3', name: 'Three in a Row', desc: 'Play on three days in a row.', icon: 'hourglass' },
  { id: 'colour-hunter', name: 'Colour Hunter', desc: 'Complete the Lost Colour hunt.', icon: 'camera' },
  { id: 'pattern-master', name: 'Pattern Master', desc: 'Score 280 or more in the colour pattern game.', icon: 'steps' },
  { id: 'personal-best', name: 'Personal Best', desc: 'Set a new digital-game record.', icon: 'star' },
];

export function createProfile() {
  return {
    version: PROFILE_VERSION,
    xp: 0,
    ledger: {},
    badges: {},
    gameRecords: {},
    days: [],
    dailies: {},
    avatar: null,
    fieldName: '',
    tutorialSeen: false,
    squad: { name: '', colour: SQUAD_COLOURS[0], members: [], emails: [], mode: 'solo', rallyBest: 0, xp: 0 },
  };
}

// Persist only scores from the game's bounded, validated score scales.
export function recordGameScore(p, game, score) {
  const config = GAME_RECORDS[game];
  if (!config || !Number.isInteger(score) || score < 0 || score > config.maxScore) {
    return { profile: p, newBest: false, previousBest: null, best: p.gameRecords?.[game]?.best || 0 };
  }
  const old = p.gameRecords?.[game] || { best: 0, runs: [] };
  const newBest = score > old.best;
  const runs = [...old.runs, score].slice(-20);
  return {
    profile: { ...p, gameRecords: { ...p.gameRecords, [game]: { best: Math.max(old.best, score), runs } } },
    newBest,
    previousBest: old.best || null,
    best: Math.max(old.best, score),
  };
}

export function completedGlitchCount(p) {
  return Object.keys(p.ledger || {}).filter((key) =>
    MISSIONS.some((mission) => key.endsWith(`:${mission.id}:repair`))
  ).length;
}

export function levelOf(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}

export function levelProgress(xp) {
  return (xp % XP_PER_LEVEL) / XP_PER_LEVEL;
}

export function dayString(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function addDays(day, n) {
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  return dayString(dt.getTime());
}

export function recordDay(p, day) {
  if (p.days.includes(day)) return p;
  const days = [...p.days, day].sort().slice(-60); // keep at most 60 days of history
  return { ...p, days };
}

// Consecutive days with play, ending today (or yesterday if not played yet today).
export function streak(p, today) {
  const set = new Set(p.days);
  let cursor = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(cursor)) {
    n += 1;
    cursor = addDays(cursor, -1);
  }
  return n;
}

export function hasBadge(p, id) {
  return Boolean(p.badges[id]);
}

export function unlockBadge(p, id, day) {
  if (p.badges[id] || !BADGES.some((b) => b.id === id)) return { profile: p, unlocked: false };
  return { profile: { ...p, badges: { ...p.badges, [id]: day } }, unlocked: true };
}

// Award XP once per key. Returns the new profile and what happened.
export function award(p, key, amount, day) {
  if (!key || p.ledger[key] || !(amount > 0)) return { profile: p, gained: 0, levelUp: false };
  const before = levelOf(p.xp);
  let next = { ...p, xp: p.xp + amount, ledger: { ...p.ledger, [key]: true } };
  next = recordDay(next, day);
  let unlocked = false;
  if (streak(next, day) >= 3 && !next.badges['streak-3']) {
    ({ profile: next, unlocked } = unlockBadge(next, 'streak-3', day));
  }
  return { profile: next, gained: amount, levelUp: levelOf(next.xp) > before, streakBadge: unlocked };
}

export function dailyFor(day) {
  const [y, m, d] = day.split('-').map(Number);
  const start = Date.UTC(y, 0, 0);
  const idx = Math.floor((Date.UTC(y, m - 1, d) - start) / 86400000) % DAILY.length;
  return DAILY[idx];
}

export function dailyDone(p, day) {
  return Boolean(p.dailies[day]);
}

export function completeDaily(p, day) {
  if (p.dailies[day]) return { profile: p, gained: 0 };
  const challenge = dailyFor(day);
  const dailies = Object.fromEntries(Object.entries({ ...p.dailies, [day]: challenge.id }).sort().slice(-60));
  const r = award({ ...p, dailies }, `daily:${day}`, XP.daily, day);
  return r;
}

export function setSquad(p, patch) {
  const squad = { ...p.squad, ...patch };
  squad.name = String(squad.name || '').trim().slice(0, 24);
  squad.colour = SQUAD_COLOURS.includes(squad.colour) ? squad.colour : SQUAD_COLOURS[0];
  squad.members = (Array.isArray(squad.members) ? squad.members : []).filter((id) => TEAMMATES.some((t) => t.id === id)).slice(0, 3);
  // Accept any domain (Gmail, Outlook, school/org domains, and newer TLDs).
  // Validate only the basic address shape; the mail provider gives final feedback.
  squad.emails = [...new Set((Array.isArray(squad.emails) ? squad.emails : []).map((email) => String(email).trim().toLowerCase()).filter((email) => /^[^\s@]+@[^\s@]+$/.test(email)))].slice(0, 10);
  squad.mode = squad.mode === 'squad' && squad.name && squad.members.length ? 'squad' : 'solo';
  squad.xp = Number.isInteger(squad.xp) && squad.xp >= 0 ? squad.xp : 0;
  squad.rallyBest = Number.isInteger(squad.rallyBest) && squad.rallyBest >= 0 ? Math.min(squad.rallyBest, 4) : 0;
  return { ...p, squad };
}

export function squadActive(p) {
  return p.squad.mode === 'squad' && Boolean(p.squad.name);
}

export function sanitizeProfile(raw) {
  const base = createProfile();
  if (!raw || typeof raw !== 'object' || raw.version !== PROFILE_VERSION) return base;
  const days = (Array.isArray(raw.days) ? raw.days : []).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort().slice(-60);
  const ledger = {};
  if (raw.ledger && typeof raw.ledger === 'object') for (const k of Object.keys(raw.ledger).slice(0, 500)) if (raw.ledger[k] === true) ledger[k] = true;
  const badges = {};
  if (raw.badges && typeof raw.badges === 'object') for (const b of BADGES) if (typeof raw.badges[b.id] === 'string') badges[b.id] = raw.badges[b.id];
  const gameRecords = {};
  if (raw.gameRecords && typeof raw.gameRecords === 'object') {
    for (const [game, config] of Object.entries(GAME_RECORDS)) {
      const record = raw.gameRecords[game];
      if (!record || typeof record !== 'object' || !Array.isArray(record.runs)) continue;
      const runs = record.runs.filter((score) => Number.isInteger(score) && score >= 0 && score <= config.maxScore).slice(-20);
      if (runs.length) gameRecords[game] = { best: Math.max(...runs), runs };
    }
  }
  const dailies = {};
  if (raw.dailies && typeof raw.dailies === 'object') for (const [d, id] of Object.entries(raw.dailies)) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && typeof id === 'string') dailies[d] = id;
  const p = {
    ...base,
    xp: Number.isInteger(raw.xp) && raw.xp >= 0 ? raw.xp : 0,
    ledger,
    badges,
    gameRecords,
    days,
    dailies,
    avatar: AVATARS.some((a) => a.id === raw.avatar) ? raw.avatar : null,
    fieldName: typeof raw.fieldName === 'string' ? raw.fieldName.trim().slice(0, 24) : '',
    tutorialSeen: raw.tutorialSeen === true,
  };
  return setSquad(p, raw.squad && typeof raw.squad === 'object' ? raw.squad : {});
}
