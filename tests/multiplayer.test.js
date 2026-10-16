import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let server;
let base;
let temp;
let handleMultiplayer;

before(async () => {
  temp = await mkdtemp(join(tmpdir(), 'campus-multiplayer-'));
  process.env.MULTIPLAYER_DATA_FILE = join(temp, 'rooms.json');
  ({ handleMultiplayer } = await import('../scripts/multiplayer.mjs'));
  server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    if (!await handleMultiplayer(req, res, url)) res.writeHead(404).end();
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (temp) await rm(temp, { recursive: true, force: true });
});

async function post(path, body, token) {
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

test('two authenticated players share activity and scores without impersonation or duplicate runs', async () => {
  const a = await post('/api/multiplayer/create', { playerId: 'player-one-123456789', name: 'Ari' });
  assert.equal(a.status, 200);
  const code = a.data.code;
  const b = await post('/api/multiplayer/join', { playerId: 'player-two-123456789', name: 'Bo', code });
  assert.equal(b.status, 200);
  const impersonation = await post('/api/multiplayer/join', { playerId: 'player-one-123456789', name: 'Intruder', code });
  assert.equal(impersonation.status, 409);

  await post(`/api/multiplayer/ready?code=${code}`, { ready: true }, a.data.token);
  await post(`/api/multiplayer/ready?code=${code}`, { ready: true }, b.data.token);
  await post(`/api/multiplayer/profile?code=${code}`, { xp: 321 }, a.data.token);
  await post(`/api/multiplayer/activity?code=${code}`, { activity: 'frozen-character:physical' }, a.data.token);
  await post(`/api/multiplayer/activity?code=${code}`, { activity: 'frozen-character:digital', game: 'thaw' }, b.data.token);
  const run = { activity: 'lost-colour:digital', game: 'sequence', score: 270, accuracy: 90, elapsedMs: 42000, runId: '12345678-1234-1234-1234-123456789abc' };
  await post(`/api/multiplayer/activity?code=${code}`, run, a.data.token);
  await post(`/api/multiplayer/activity?code=${code}`, run, a.data.token);

  const roomResponse = await fetch(`${base}/api/multiplayer/room?code=${code}`, { headers: { Authorization: `Bearer ${b.data.token}` } });
  const room = (await roomResponse.json()).room;
  assert.equal(room.players.length, 2);
  assert.ok(room.players.every((player) => player.ready));
  assert.equal(room.players.find((player) => player.name === 'Ari').level, 3);
  assert.equal(room.activities['frozen-character'].physical, true);
  assert.equal(room.activities['frozen-character'].digital, true);
  assert.equal(room.activities['frozen-character'].repaired, true);
  assert.equal(room.players[0].scores.sequence.runs.length, 1);
  assert.equal(room.players[0].scores.sequence.best, 270);

  const unauthorized = await fetch(`${base}/api/multiplayer/room?code=${code}`);
  assert.equal(unauthorized.status, 401);
  const full = await post('/api/multiplayer/join', { playerId: 'player-three-123456789', name: 'Cy', code });
  assert.equal(full.status, 409);
  const invalid = await post(`/api/multiplayer/activity?code=${code}`, { activity: 'lost-colour:digital', game: 'sequence', score: 900, runId: '12345678-1234-1234-1234-123456789abd' }, b.data.token);
  assert.equal(invalid.status, 400);
  const mismatched = await post(`/api/multiplayer/activity?code=${code}`, { activity: 'frozen-character:digital', game: 'sequence' }, b.data.token);
  assert.equal(mismatched.status, 400);
});
