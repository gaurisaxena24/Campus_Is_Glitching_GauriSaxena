const ID_KEY = 'campus-glitching:multiplayer-player:v1';
const TOKEN_KEY = 'campus-glitching:multiplayer-room-token:v1';
const CODE_KEY = 'campus-glitching:multiplayer-room-code:v1';

function newId() {
  return globalThis.crypto?.randomUUID?.() || `player-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function multiplayerIdentity() {
  let id = localStorage.getItem(ID_KEY);
  if (!id) { id = newId(); localStorage.setItem(ID_KEY, id); }
  return id;
}

export function multiplayerCredentials() {
  return { playerId: multiplayerIdentity(), token: localStorage.getItem(TOKEN_KEY) || '', code: localStorage.getItem(CODE_KEY) || '' };
}

function saveRoom(response) {
  localStorage.setItem(TOKEN_KEY, response.token);
  localStorage.setItem(CODE_KEY, response.code);
  return response.room;
}

async function reyquest(path, { method = 'GET', body, token = localStorage.getItem(TOKEN_KEY) || '' } = {}) {
  const response = await fetch(path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data = {};
  try { data = await response.json(); } catch { /* report a clear service error below */ }
  if (!response.ok) throw new Error(data.error || 'Room service is unavailable.');
  return data;
}

export async function createRoom(name) {
  const response = await request('/api/multiplayer/create', { method: 'POST', body: { ...multiplayerCredentials(), name } });
  return saveRoom(response);
}

export async function joinRoom(code, name) {
  const response = await request('/api/multiplayer/join', { method: 'POST', body: { ...multiplayerCredentials(), code, name } });
  return saveRoom(response);
}

export async function fetchRoom() {
  const { token, code } = multiplayerCredentials();
  if (!token || !code) return null;
  return (await request(`/api/multiplayer/room?code=${encodeURIComponent(code)}`, { token })).room;
}

export async function setReady(ready) {
  const { code, token } = multiplayerCredentials();
  return (await request(`/api/multiplayer/ready?code=${encodeURIComponent(code)}`, { method: 'POST', body: { ready }, token })).room;
}

export async function syncPlayerProfile(xp) {
  const { code, token } = multiplayerCredentials();
  if (!token || !code) return null;
  return (await request(`/api/multiplayer/profile?code=${encodeURIComponent(code)}`, { method: 'POST', body: { xp }, token })).room;
}

export async function reportRoomActivity(activity, details = {}) {
  const { code, token } = multiplayerCredentials();
  if (!token || !code) return null;
  return (await request(`/api/multiplayer/activity?code=${encodeURIComponent(code)}`, { method: 'POST', body: { activity, ...details }, token })).room;
}

export function forgetRoom() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CODE_KEY);
}
