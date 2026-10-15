import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createProfile, award, levelOf, streak, recordDay, unlockBadge, completeDaily, dailyFor, dailyDone,
  setSquad, squadActive, sanitizeProfile, XP_PER_LEVEL,
} from '../src/js/game/profile.js';

test('XP is awarded once per key, even when repeated (no duplicate rewards)', () => {
  let p = createProfile();
  let r = award(p, 'run:1:frozen-character:repair', 50, '2026-10-10');
  assert.equal(r.gained, 50);
  p = r.profile;
  r = award(p, 'run:1:frozen-character:repair', 50, '2026-10-10');
  assert.equal(r.gained, 0);
  assert.equal(r.profile.xp, 50);
});

test('levels every 150 XP and reports level-ups', () => {
  assert.equal(levelOf(0), 1);
  assert.equal(levelOf(XP_PER_LEVEL), 2);
  const r = award({ ...createProfile(), xp: 140 }, 'k', 20, '2026-10-10');
  assert.equal(r.levelUp, true);
});

test('streak counts consecutive days honestly from stored dates', () => {
  let p = createProfile();
  for (const d of ['2026-10-07', '2026-10-08', '2026-10-09']) p = recordDay(p, d);
  assert.equal(streak(p, '2026-10-09'), 3);
  assert.equal(streak(p, '2026-10-10'), 3, 'still alive if not yet played today');
  assert.equal(streak(p, '2026-10-11'), 0, 'broken after a missed day');
  p = recordDay(p, '2026-10-01');
  assert.equal(streak(p, '2026-10-09'), 3);
});

test('three-day streak badge is earned through real awards', () => {
  let p = createProfile();
  p = award(p, 'a', 10, '2026-10-08').profile;
  p = award(p, 'b', 10, '2026-10-09').profile;
  const r = award(p, 'c', 10, '2026-10-10');
  assert.equal(r.streakBadge, true);
  assert.ok(r.profile.badges['streak-3']);
});

test('badges unlock once and only if they exist', () => {
  let r = unlockBadge(createProfile(), 'first-repair', '2026-10-10');
  assert.equal(r.unlocked, true);
  r = unlockBadge(r.profile, 'first-repair', '2026-10-11');
  assert.equal(r.unlocked, false);
  assert.equal(unlockBadge(createProfile(), 'made-up', 'x').unlocked, false);
});

test('daily challenge rotates by date and pays once per day', () => {
  assert.notEqual(dailyFor('2026-10-10').id, dailyFor('2026-10-11').id);
  let r = completeDaily(createProfile(), '2026-10-10');
  assert.equal(r.gained, 30);
  assert.equal(dailyDone(r.profile, '2026-10-10'), true);
  r = completeDaily(r.profile, '2026-10-10');
  assert.equal(r.gained, 0);
});

test('local squad needs a name and at least one teammate character', () => {
  let p = setSquad(createProfile(), { name: 'Night Owls', mode: 'squad', members: [] });
  assert.equal(squadActive(p), false);
  p = setSquad(p, { members: ['ira', 'not-real', 'dev', 'meera', 'kabir'], mode: 'squad' });
  assert.deepEqual(p.squad.members, ['ira', 'dev', 'meera']);
  assert.equal(squadActive(p), true);
  assert.equal(setSquad(p, { mode: 'solo' }).squad.mode, 'solo');
});

test('profile from storage is validated', () => {
  const p = sanitizeProfile({ version: 1, xp: -5, ledger: { a: true, b: 'x' }, badges: { 'first-repair': '2026-10-10', fake: 'y' }, days: ['bad', '2026-10-10'], avatar: 'nope', squad: { name: 'x'.repeat(50), colour: 'red', members: ['ira'], mode: 'squad' } });
  assert.equal(p.xp, 0);
  assert.deepEqual(p.ledger, { a: true });
  assert.deepEqual(Object.keys(p.badges), ['first-repair']);
  assert.deepEqual(p.days, ['2026-10-10']);
  assert.equal(p.avatar, null);
  assert.equal(p.squad.name.length, 24);
  assert.equal(sanitizeProfile('garbage').xp, 0);
});
