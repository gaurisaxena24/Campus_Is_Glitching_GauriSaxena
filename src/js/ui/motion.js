// Browser side of the motion sensor: the ONLY place that listens to
// `devicemotion`. Browsers have no step-counter API, so these raw readings
// feed the ESTIMATED step counter in game/steps.js.
//
// - iOS 13+ needs DeviceMotionEvent.requestPermission(), called from a tap.
// - At most one listener exists; stopMotion() removes it.
// - Readings are never stored or sent anywhere.

let handler = null;

export function motionSupported() {
  return typeof window !== 'undefined' && 'DeviceMotionEvent' in window;
}

// Must be called synchronously inside a user tap (iOS rule).
// Resolves 'granted' | 'denied' | 'unsupported'.
export function requestMotion() {
  if (!motionSupported()) return Promise.resolve('unsupported');
  const DME = window.DeviceMotionEvent;
  if (typeof DME.requestPermission !== 'function') return Promise.resolve('granted');
  try {
    return DME.requestPermission().then((r) => (r === 'granted' ? 'granted' : 'denied'), () => 'denied');
  } catch {
    return Promise.resolve('denied');
  }
}

export function startMotion(onSample) {
  stopMotion();
  if (!motionSupported()) return false;
  handler = (e) => {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    onSample({ t: e.timeStamp || performance.now(), x: a.x, y: a.y, z: a.z });
  };
  window.addEventListener('devicemotion', handler);
  return true;
}

export function stopMotion() {
  if (handler) window.removeEventListener('devicemotion', handler);
  handler = null;
}

export function isMotionListening() {
  return handler !== null;
}
