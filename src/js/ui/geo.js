// Browser side of GPS: the ONLY place that touches navigator.geolocation.
//
// - At most one watcher exists at a time: startWatch() always clears the
//   previous one first, and stopWatch() calls clearWatch().
// - Location is requested only when the player taps "Allow location and start"
//   on the Frozen Character walk (never on page load).
// - Readings are passed to the caller and never stored or sent anywhere here.
// - The dev simulator is available only on localhost with ?gpssim in the URL,
//   and every reading it makes is labelled `simulated`.

const OPTIONS = { enableHighAccuracy: true, maximumAge: 0, timeout: 20_000 };
const DAY = 24 * 3600_000;

let watchId = null;
let provider = null;
let onSample = null;
let onError = null;

export function geoSupport() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return { ok: false, reason: 'unsupported' };
  if (!window.isSecureContext) return { ok: false, reason: 'insecure' };
  if (!('geolocation' in navigator) || !navigator.geolocation) return { ok: false, reason: 'unsupported' };
  return { ok: true, reason: null };
}

// 'granted' | 'denied' | 'prompt' | 'unknown' (Permissions API is missing in some browsers).
export async function permissionState() {
  try {
    if (!navigator.permissions || !navigator.permissions.query) return 'unknown';
    const r = await navigator.permissions.query({ name: 'geolocation' });
    return r.state || 'unknown';
  } catch {
    return 'unknown';
  }
}

function toSample(p, simulated) {
  const c = p && p.coords;
  let ts = Number(p && p.timestamp);
  // Some older mobile browsers report odd timestamps; fall back to "now"
  // only when the value is clearly not epoch milliseconds.
  if (!Number.isFinite(ts) || Math.abs(ts - Date.now()) > DAY) ts = Date.now();
  return { lat: c ? c.latitude : NaN, lon: c ? c.longitude : NaN, accuracy: c ? c.accuracy : NaN, timestamp: ts, simulated };
}

function errorCode(e) {
  if (!e) return 'unavailable';
  if (e.code === 1) return 'denied';
  if (e.code === 3) return 'timeout';
  return 'unavailable';
}

export function isWatching() {
  return watchId !== null;
}

// Start (or restart) the single watcher.
export function startWatch(handlers, { simulator = false } = {}) {
  stopWatch();
  const support = geoSupport();
  if (!simulator && !support.ok) {
    handlers.onError(support.reason);
    return false;
  }
  provider = simulator ? sim : navigator.geolocation;
  onSample = handlers.onSample;
  onError = handlers.onError;
  try {
    watchId = provider.watchPosition(
      (p) => { if (onSample) onSample(toSample(p, simulator)); },
      (e) => { if (onError) onError(errorCode(e)); },
      OPTIONS,
    );
  } catch {
    watchId = null;
    handlers.onError('unavailable');
    return false;
  }
  return true;
}

export function stopWatch() {
  if (watchId !== null && provider) {
    try { provider.clearWatch(watchId); } catch { /* already gone */ }
  }
  watchId = null;
  provider = null;
  onSample = null;
  onError = null;
}

// ---------- Dev-only simulator ----------

export function simulatorAllowed() {
  try {
    const local = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(location.hostname);
    return local && new URLSearchParams(location.search).has('gpssim');
  } catch {
    return false;
  }
}

// Positions start at 0,0 ("Null Island"): deliberately NOT a campus location.
const M_PER_DEG = 111_195;
const simState = { mode: 'walk', north: 0, timer: null, nextId: 1, active: null };

export const SIM_MODES = Object.freeze([
  { id: 'walk', label: 'Walk 1.3 m/s' },
  { id: 'still', label: 'Stand still (drift)' },
  { id: 'jump', label: 'Jumpy fix' },
  { id: 'weak', label: 'Weak signal' },
  { id: 'silent', label: 'No fix' },
  { id: 'deny', label: 'Deny permission' },
]);

export function setSimMode(mode) {
  if (SIM_MODES.some((m) => m.id === mode)) simState.mode = mode;
}

export function simMode() {
  return simState.mode;
}

const sim = {
  watchPosition(success, failure) {
    const id = simState.nextId++;
    clearInterval(simState.timer);
    simState.active = id;
    const step = () => {
      if (simState.active !== id) return;
      const m = simState.mode;
      if (m === 'silent') return;
      if (m === 'deny') return failure({ code: 1 });
      let accuracy = 6;
      let north = simState.north;
      if (m === 'walk') { simState.north += 1.3; north = simState.north; }
      if (m === 'still') north = simState.north + (Math.random() - 0.5) * 8;
      if (m === 'jump') north = simState.north + 400;
      if (m === 'weak') accuracy = 120;
      success({ coords: { latitude: north / M_PER_DEG, longitude: 0, accuracy }, timestamp: Date.now() });
    };
    simState.timer = setInterval(step, 1000);
    setTimeout(step, 50);
    return id;
  },
  clearWatch(id) {
    if (simState.active === id) {
      clearInterval(simState.timer);
      simState.active = null;
    }
  },
};
