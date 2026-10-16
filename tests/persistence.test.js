import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialState, reduce, tokenCount, SESSION } from '../src/js/game/state.js';
import { createProfile, award } from '../src/js/game/profile.js';
import {
  serialize, deserialize, createStorage, loadSession, saveSession, clearSession, loadSettings, saveSettings,
  loadProfile, saveProfile, clearAll, SESSION_KEY, PROFILE_KEY,
} from '../src/js/game/persistence.js';

function memoryBackend() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, String(v)), removeItem: (k) => map.delete(k), map };
}

const T0 = 5_000_000;
const fc = 'frozen-character';
function repairedOnce() {
  let s = reduce(createInitialState(), { type: 'START_SESSION', now: T0 });
  s = reduce(s, { type: 'ACTIVATE', id: fc, now: T0 + 1 });
  s = reduce(s, { type: 'COMPLETE_PHYSICAL', method: 'self', id: fc, now: T0 + 2 });
  s = reduce(s, { type: 'SUBMIT_DIGITAL', id: fc, result: { melted: 100 }, now: T0 + 3 });
  return reduce(s, { type: 'REPAIR', id: fc, now: T0 + 4 });
}

test('round trip keeps progress and does not double tokens (T-PER-01, T-TOK-06)', () => {
  const back = deserialize(serialize(repairedOnce()));
  assert.equal(back.session.status, SESSION.RUNNING);
  assert.equal(tokenCount(back), 2);
  assert.equal(tokenCount(deserialize(serialize(back))), 2);
});

test('a ready-to-repair mission survives reload without being repaired', () => {
  let s = reduce(createInitialState(), { type: 'START_SESSION', now: T0 });
  s = reduce(s, { type: 'ACTIVATE', id: fc, now: T0 + 1 });
  s = reduce(s, { type: 'COMPLETE_PHYSICAL', method: 'self', id: fc, now: T0 + 2 });
  s = reduce(s, { type: 'SUBMIT_DIGITAL', id: fc, result: { melted: 100 }, now: T0 + 3 });
  const back = deserialize(serialize(s));
  assert.equal(back.missions[fc].status, 'ACTIVE');
  assert.equal(tokenCount(back), 0);
});

test('corrupted or inconsistent saves are rejected (T-PER-05)', () => {
  assert.equal(deserialize('{not json'), null);
  assert.equal(deserialize(JSON.stringify({ version: 1 })), null);
  const s = JSON.parse(serialize(repairedOnce()));
  s.missions[fc].status = 'NOT_A_STATE';
  assert.equal(deserialize(JSON.stringify(s)), null);
  const t = JSON.parse(serialize(repairedOnce()));
  t.missions[fc].result = null; // digital done without a result
  assert.equal(deserialize(JSON.stringify(t)), null);
});

test('photo or unknown draft data is never kept (privacy, docs/06 s8)', () => {
  const raw = JSON.parse(serialize(createInitialState()));
  raw.drafts = { [fc]: { note: 'hi', photo: 'data:image/png;base64,AAAA', evil: 1 }, nope: { note: 'x' } };
  const back = deserialize(JSON.stringify(raw));
  assert.deepEqual(back.drafts, { [fc]: { note: 'hi' } });
  assert.equal(JSON.stringify(back).includes('base64'), false);
});

test('blocked storage is survivable (T-PER-04)', () => {
  const blocked = { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() { throw new Error('x'); } };
  const store = createStorage(blocked);
  assert.equal(store.available, false);
  assert.equal(saveSession(store, createInitialState()), false);
  assert.equal(loadSession(store), null);
  assert.equal(loadProfile(store).xp, 0);
});

test('session, profile and settings save and load; reset clears progress', () => {
  const be = memoryBackend();
  const store = createStorage(be);
  saveSession(store, repairedOnce());
  saveProfile(store, award(createProfile(), 'k', 70, '2026-10-10').profile);
  assert.equal(tokenCount(loadSession(store)), 2);
  assert.equal(loadProfile(store).xp, 70);
  clearSession(store);
  assert.equal(be.map.has(SESSION_KEY), false);
  clearAll(store);
  assert.equal(be.map.has(PROFILE_KEY), false);
});

test('settings default to sound off', () => {
  const store = createStorage(memoryBackend());
  assert.equal(loadSettings(store).sound, false);
  saveSettings(store, { sound: true, reduceMotion: 'x', largeText: true, lastTab: 'nope' });
  assert.deepEqual(loadSettings(store), { sound: true, reduceMotion: false, largeText: true, lastTab: 'map' });
});
