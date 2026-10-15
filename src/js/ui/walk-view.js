// The Frozen Character walk panel: GPS status, live readings and controls.
// walkModel() turns the in-memory tracker into display values; the panel HTML
// is built once per state change and updateWalkPanel() refreshes the numbers
// in place every tick, so buttons are never rebuilt under the player's finger.

import {
  GPS, WALK, TRACK, summarize, signalState, walkProgress, movingTimeReliable,
} from '../game/tracking.js';
import { esc, icon } from './dom.js';
import { SIM_MODES } from './geo.js';

const SIGNAL = {
  idle: { label: 'Not started', tone: 'idle' },
  searching: { label: 'Searching for GPS…', tone: 'idle' },
  good: { label: 'GPS signal good', tone: 'ok' },
  weak: { label: 'Weak signal: not counted', tone: 'warn' },
  stale: { label: 'Signal lost', tone: 'warn' },
  timeout: { label: 'No GPS fix yet', tone: 'warn' },
  paused: { label: 'Tracking paused', tone: 'idle' },
  stopped: { label: 'Tracking stopped', tone: 'idle' },
  denied: { label: 'Location permission off', tone: 'bad' },
  unavailable: { label: 'Location unavailable', tone: 'bad' },
  unsupported: { label: 'Location not supported', tone: 'bad' },
  insecure: { label: 'Needs a secure page', tone: 'bad' },
};

const HELP = {
  weak: `Accuracy is worse than ±${GPS.maxAccuracyM} m, so these readings are ignored. Open sky helps; tall buildings and indoors hurt.`,
  stale: 'No fresh reading for a while. Keep the game open and the screen on.',
  timeout: 'Your phone has not returned a location yet. Step outside, or tap Retry.',
  denied: 'Location is blocked for this site. Allow it in your browser or phone settings, then tap Retry. Or walk without GPS.',
  unavailable: 'Your device could not find its location. Location services may be off. Tap Retry, or walk without GPS.',
  unsupported: 'This browser cannot share location. You can still walk without GPS.',
  insecure: 'Browsers only share location on https:// pages or localhost. You can still walk without GPS.',
};

const MOTION_LABEL = {
  none: 'Motion sensor not in use',
  pending: 'Waiting for motion data…',
  active: 'Motion sensor on: steps are estimated',
  unavailable: 'No motion data from this device: GPS distance is used instead',
  denied: 'Motion access refused: GPS distance is used instead',
};

const PAUSE_REASON = {
  hidden: 'Paused because the game left the screen. GPS only runs while the game is open.',
  session: 'Paused with the session.',
  error: 'Paused because location stopped working.',
};

export function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function walkModel(walk, now) {
  const t = walk.track;
  const s = summarize(t, now);
  const sig = signalState(t, now, walk.error);
  const target = walk.stepTarget || WALK.stepTarget;
  const prog = walkProgress(s, target);
  const fix = t.lastFix;
  return {
    status: t.status,
    signal: sig,
    signalLabel: (SIGNAL[sig] || SIGNAL.idle).label,
    tone: (SIGNAL[sig] || SIGNAL.idle).tone,
    help: HELP[sig] || (t.status === TRACK.PAUSED && walk.autoPaused ? PAUSE_REASON[walk.autoPaused] : ''),
    elapsed: clock(s.activeMs),
    distance: `${Math.round(s.distanceM)} m`,
    moving: movingTimeReliable(t) ? clock(s.movingMs) : '–',
    accuracy: fix ? `±${Math.round(fix.accuracy)} m` : '–',
    coords: fix && t.status === TRACK.TRACKING ? `${fix.lat.toFixed(5)}, ${fix.lon.toFixed(5)}` : '–',
    timePct: Math.round(prog.time * 100),
    distPct: Math.round(prog.distance * 100),
    stepPct: Math.round(prog.steps * 100),
    steps: t.motion === 'active' || t.steps ? `${t.steps}` : '–',
    motion: t.motion,
    motionLabel: MOTION_LABEL[t.motion] || MOTION_LABEL.none,
    basis: prog.basis,
    target,
    met: prog.met,
    simulated: t.source === 'simulator',
    hasError: Boolean(walk.error),
  };
}

const stat = (key, label, value) => `<div class="walk-stat"><small>${label}</small><b data-walk="${key}">${esc(value)}</b></div>`;
const bar = (key, label, pct, goal) => `<div class="walk-goal"><span>${label}</span><span class="walk-goal-track"><i data-walk-bar="${key}" style="width:${pct}%"></i></span><em>${goal}</em></div>`;

export function walkIntroHTML(id, { permission, simulator, stepTarget = WALK.stepTarget }) {
  return `<section class="walk-intro panel">
    <h2 class="walk-section-label">Your walk goal</h2>
    <div class="walk-goal-cards">
      <div><small>Duration</small><strong>${clock(WALK.minActiveMs)}</strong></div>
      <div><small>Target</small><strong>≈${stepTarget} steps</strong></div>
    </div>
    <p class="walk-target">A gentle stroll is enough.</p>
    <h2 class="walk-section-label">How tracking works</h2>
    <ul class="walk-why">
      <li><strong>Motion:</strong> estimates steps using your phone's movement sensors.</li>
      <li><strong>GPS:</strong> estimates distance when available. If motion data is unavailable, the game may use GPS distance instead.</li>
      <li><strong>Privacy:</strong> Your walk stays on this device. Progress and tracking status needed to resume or verify it are saved; raw sensor readings and GPS coordinates are never saved or sent.</li>
      <li><strong>Tracking ends:</strong> when you pause, stop, finish, or leave the game.</li>
    </ul>
    ${permission === 'denied' ? `<p class="walk-help walk-help--bad">${icon('info', 'icon--sm')} Location is currently blocked for this site. Allow it in your browser settings first, or walk without GPS.</p>` : ''}
    ${simulator ? '<p class="walk-sim-tag">DEV GPS SIMULATOR ON: readings are fake and labelled as simulated.</p>' : ''}
    <button class="btn btn--acid btn--xl btn--block" data-action="walk-start" data-id="${id}">${icon('steps')} Allow &amp; start walk</button>
    <button class="link-btn link-btn--light" data-action="walk-self" data-id="${id}">Walk without GPS (self-reported)</button>
  </section>`;
}

export function walkPanelHTML(id, m, { simulator, simMode }) {
  const tracking = m.status === TRACK.TRACKING;
  const paused = m.status === TRACK.PAUSED;
  const stopped = m.status === TRACK.STOPPED;
  return `<section class="walk-panel panel" data-walk-panel aria-label="Walk tracking">
    ${m.simulated ? '<p class="walk-sim-tag">SIMULATED READINGS: not real GPS</p>' : ''}
    <div class="walk-signal" data-tone="${m.tone}"><span class="walk-dot"></span><strong data-walk="signal">${esc(m.signalLabel)}</strong><span class="walk-acc" data-walk="accuracy">${esc(m.accuracy)}</span></div>
    <p class="walk-help" data-walk="help" ${m.help ? '' : 'hidden'}>${esc(m.help)}</p>
    <p class="walk-motion" data-motion="${m.motion}" data-walk="motion">${esc(m.motionLabel)}</p>
    <div class="walk-stats">
      ${stat('elapsed', 'Tracked time', m.elapsed)}
      ${stat('steps', 'Steps (estimated)', m.steps)}
      ${stat('distance', 'Distance (GPS est.)', m.distance)}
      ${stat('moving', 'Moving time', m.moving)}
    </div>
    <p class="walk-coords">Live position <span data-walk="coords">${esc(m.coords)}</span> <small>(shown only, never saved)</small></p>
    <div class="walk-goals" aria-label="Walk progress">
      ${bar('time', 'Time', m.timePct, clock(WALK.minActiveMs))}
      ${m.basis === 'steps' ? bar('steps', 'Steps', m.stepPct, `${m.target}`) : bar('dist', 'Distance', m.distPct, `${WALK.minDistanceM} m`)}
    </div>
    <div class="walk-controls">
      ${tracking ? `<button class="btn btn--ghost-dark" data-action="walk-pause" data-id="${id}">${icon('pause')} Pause</button>` : ''}
      ${paused ? `<button class="btn btn--ghost-dark" data-action="walk-resume" data-id="${id}">${icon('play')} Resume</button>` : ''}
      ${tracking || paused ? `<button class="btn btn--ghost-dark" data-action="walk-stop" data-id="${id}">${icon('flag')} Stop</button>` : ''}
      ${stopped ? `<button class="btn btn--ghost-dark" data-action="walk-start" data-id="${id}">${icon('restart')} New walk</button>` : ''}
      ${m.hasError ? `<button class="btn btn--ghost-dark" data-action="walk-retry" data-id="${id}">${icon('restart')} Retry GPS</button>` : ''}
    </div>
    <button class="btn btn--acid btn--xl btn--block" data-action="walk-finish" data-id="${id}" data-walk-finish aria-disabled="${m.met ? 'false' : 'true'}">${icon('check')} Finish walk</button>
    <p class="hint hint--center" data-walk="finish-hint">${finishHint(m)}</p>
    <p class="hint">Steps and distance are estimates. Tracking pauses if the game leaves the screen.</p>
    <button class="link-btn link-btn--light" data-action="walk-self" data-id="${id}">Walk without GPS instead (self-reported)</button>
    ${simulator ? `<div class="walk-sim" role="group" aria-label="Developer GPS simulator"><p class="walk-sim-tag">DEV GPS SIMULATOR</p>${SIM_MODES.map((s) => `<button class="chip${simMode === s.id ? ' on' : ''}" data-action="sim-mode" data-mode="${s.id}">${esc(s.label)}</button>`).join('')}</div>` : ''}
  </section>`;
}

function finishHint(m) {
  if (m.met) return 'Walk verified. Finish when ready.';
  return m.basis === 'steps'
    ? `Needs ${clock(WALK.minActiveMs)} tracked and ${m.target} estimated steps.`
    : `Needs ${clock(WALK.minActiveMs)} tracked and ${WALK.minDistanceM} m of reliable GPS movement.`;
}

// Refresh live values without rebuilding the panel.
export function updateWalkPanel(panel, m) {
  if (!panel) return;
  const set = (k, v) => { const n = panel.querySelector(`[data-walk="${k}"]`); if (n && n.textContent !== v) n.textContent = v; };
  set('signal', m.signalLabel);
  set('accuracy', m.accuracy);
  set('elapsed', m.elapsed);
  set('distance', m.distance);
  set('moving', m.moving);
  set('steps', m.steps);
  set('motion', m.motionLabel);
  set('coords', m.coords);
  const help = panel.querySelector('[data-walk="help"]');
  if (help) { if (help.textContent !== m.help) help.textContent = m.help; help.hidden = !m.help; }
  panel.querySelector('.walk-signal').dataset.tone = m.tone;
  panel.querySelector('[data-walk-bar="time"]').style.width = `${m.timePct}%`;
  const second = panel.querySelector('[data-walk-bar="steps"], [data-walk-bar="dist"]');
  if (second) second.style.width = `${second.dataset.walkBar === 'steps' ? m.stepPct : m.distPct}%`;
  const fin = panel.querySelector('[data-walk-finish]');
  if (fin) fin.setAttribute('aria-disabled', m.met ? 'false' : 'true');
  set('finish-hint', finishHint(m));
}

// Small status strip shown on other screens while a walk is being tracked.
export function walkBarText(m) {
  if (m.status === TRACK.TRACKING) return `Walk tracking · ${m.basis === 'steps' ? `${m.steps} steps` : m.distance} · ${m.elapsed}`;
  if (m.status === TRACK.PAUSED) return 'Walk paused';
  return '';
}
