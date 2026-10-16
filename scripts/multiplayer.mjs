// Small, file-backed two-player room service for the local Node server.
// Room tokens are private per-browser credentials; player progress stays local.
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const DATA_FILE = process.env.MULTIPLAYER_DATA_FILE || new URL('../.local-data/rooms.json', import.meta.url);
const MISSIONS = new Set(['frozen-character', 'lost-colour', 'missing-connection']);
const MISSION_GAMES = { 'frozen-character': 'thaw', 'lost-colour': 'sequence', 'missing-connection': 'episode' };
const SCORE_LIMITS = { sequence: 300, episode: 15 };
let data = { rooms: {} };
let loaded = false;
let loading = null;
let writes = Promise.resolve();

async function load() {
  if (loaded) return;
  if (!loading) loading = (async () => {
    try { data = JSON.parse(await readFile(DATA_FILE, 'utf8')); }
    catch { data = { rooms: {} }; }
    if (!data || typeof data.rooms !== 'object' || Array.isArray(data.rooms)) data = { rooms: {} };
    loaded = true;
  })();
  await loading;
}

function persist() {
  writes = writes.then(async () => {
    await mkdir(dirname(DATA_FILE instanceof URL ? DATA_FILE.pathname : DATA_FILE), { recursive: true });
    const path = DATA_FILE instanceof URL ? DATA_FILE.pathname : DATA_FILE;
    const temp = `${path}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(data), { mode: 0o600 });
    await rename(temp, path);
  });
  return writes;
}

function cleanName(value) {
  return String(value || 'Repairer').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 24) || 'Repairer';
}
function cleanPlayerId(value) { return typeof value === 'string' && /^[a-z0-9-]{20,80}$/i.test(value) ? value : ''; }
function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[randomBytes(1)[0] % alphabet.length];
  return code;
}
function auth(req, room) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return Object.values(room.players).find((player) => player.token === token) || null;
}
function snapshot(room) {
  const players = Object.values(room.players).map(({ token, ...player }) => player);
  const activities = {};
  for (const id of MISSIONS) {
    const physical = players.some((p) => p.activities[id]?.physical);
    const digital = players.some((p) => p.activities[id]?.digital);
    activities[id] = {
      physical,
      digital,
      repaired: players.some((p) => p.activities[id]?.repaired) || (physical && digital),
    };
  }
  return { code: room.code, createdAt: room.createdAt, players, activities, updatedAt: room.updatedAt };
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 8192) throw Object.assign(new Error('Request is too large.'), { status: 413 });
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw Object.assign(new Error('Invalid request.'), { status: 400 }); }
}

function reply(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(value));
  return true;
}

export async function handleMultiplayer(req, res, url) {
  if (!url.pathname.startsWith('/api/multiplayer/')) return false;
  const origin = req.headers.origin;
  if (origin && new URL(origin).host !== req.headers.host) {
    reply(res, 403, { error: 'Cross-site multiplayer requests are not allowed.' });
    return true;
  }
  await load();
  try {
    if (req.method === 'POST' && ['/api/multiplayer/create', '/api/multiplayer/join'].includes(url.pathname)) {
      const input = await body(req);
      const playerId = cleanPlayerId(input.playerId);
      if (!playerId) return reply(res, 400, { error: 'This browser needs a valid player identity.' });
      let room;
      if (url.pathname.endsWith('/create')) {
        let code;
        do { code = roomCode(); } while (data.rooms[code]);
        room = { code, createdAt: Date.now(), updatedAt: Date.now(), players: {} };
        data.rooms[code] = room;
      } else {
        const code = String(input.code || '').trim().toUpperCase();
        room = data.rooms[code];
        if (!room) return reply(res, 404, { error: 'Room not found. Check the code or ask for a fresh invite.' });
      }
      let player = room.players[playerId];
      if (player && player.token !== String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')) return reply(res, 409, { error: 'This player is already connected elsewhere. Reconnect using the original browser.' });
      if (!player && Object.keys(room.players).length >= 2) return reply(res, 409, { error: 'This room already has two players.' });
      if (!player) player = room.players[playerId] = {
        id: playerId, token: randomUUID(), name: cleanName(input.name), joinedAt: Date.now(), lastSeen: Date.now(),
        ready: false, xp: 0, level: 1, activities: {}, scores: {},
      };
      else { player.name = cleanName(input.name); player.lastSeen = Date.now(); }
      room.updatedAt = Date.now();
      await persist();
      return reply(res, 200, { code: room.code, token: player.token, room: snapshot(room) });
    }

    const code = String(url.searchParams.get('code') || '').trim().toUpperCase();
    const room = data.rooms[code];
    if (!room) return reply(res, 404, { error: 'Room not found.' });
    const player = auth(req, room);
    if (!player) return reply(res, 401, { error: 'Reconnect with this browser’s room token.' });

    if (req.method === 'GET' && url.pathname === '/api/multiplayer/room') {
      player.lastSeen = Date.now();
      await persist();
      return reply(res, 200, { room: snapshot(room) });
    }
    if (req.method === 'POST' && url.pathname === '/api/multiplayer/ready') {
      const input = await body(req);
      player.ready = Boolean(input.ready);
      player.lastSeen = Date.now();
      room.updatedAt = Date.now();
      await persist();
      return reply(res, 200, { room: snapshot(room) });
    }
    if (req.method === 'POST' && url.pathname === '/api/multiplayer/profile') {
      const input = await body(req);
      if (!Number.isSafeInteger(input.xp) || input.xp < 0 || input.xp > 10_000_000) return reply(res, 400, { error: 'Invalid XP total.' });
      player.xp = input.xp;
      player.level = Math.floor(input.xp / 150) + 1;
      player.lastSeen = Date.now();
      room.updatedAt = Date.now();
      await persist();
      return reply(res, 200, { room: snapshot(room) });
    }
    if (req.method === 'POST' && url.pathname === '/api/multiplayer/activity') {
      const input = await body(req);
      const match = /^([a-z-]+):(physical|digital|repaired)$/.exec(String(input.activity || ''));
      if (!match || !MISSIONS.has(match[1])) return reply(res, 400, { error: 'Unknown quest activity.' });
      const [, id, part] = match;
      if (part === 'digital' && input.game !== MISSION_GAMES[id]) return reply(res, 400, { error: 'That game does not belong to this quest.' });
      if (part === 'digital' && ['sequence', 'episode'].includes(input.game)) {
        const limit = SCORE_LIMITS[input.game];
        if (!Number.isInteger(input.score) || input.score < 0 || input.score > limit) return reply(res, 400, { error: 'Invalid game score.' });
      }
      const activity = player.activities[id] || (player.activities[id] = {});
      activity[part] = true;
      if (part === 'digital' && ['sequence', 'episode'].includes(input.game)) {
        const limit = SCORE_LIMITS[input.game];
        const score = input.score;
        const accuracy = Number.isFinite(input.accuracy) ? Math.max(0, Math.min(100, Math.round(input.accuracy))) : Math.round(score / limit * 100);
        const elapsedMs = Number.isFinite(input.elapsedMs) ? Math.max(0, Math.min(3_600_000, Math.round(input.elapsedMs))) : null;
        const runId = typeof input.runId === 'string' && /^[a-f0-9-]{16,64}$/i.test(input.runId) ? input.runId : randomUUID();
        const saved = player.scores[input.game] || (player.scores[input.game] = { best: 0, runs: [] });
        if (!saved.runs.some((run) => run.id === runId)) {
          saved.runs.push({ id: runId, score, accuracy, elapsedMs, at: Date.now() });
          saved.runs = saved.runs.slice(-20);
          saved.best = Math.max(saved.best, score);
        }
      }
      player.lastSeen = Date.now();
      room.updatedAt = Date.now();
      await persist();
      return reply(res, 200, { room: snapshot(room) });
    }
    return reply(res, 405, { error: 'Unsupported multiplayer action.' });
  } catch (error) {
    return reply(res, error.status || 500, { error: error.status ? error.message : 'Room service could not save this update.' });
  }
}
