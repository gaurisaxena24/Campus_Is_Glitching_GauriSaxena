// App controller: owns session state, the player profile and settings,
// dispatches actions through the pure reducers, persists, renders and
// handles every interaction, reward and effect.

import { MISSIONS, getMission, missionAtDestination, SQUAD_RALLY } from './data/missions.js';
import { getDestination } from './data/destinations.js';
import {
  createInitialState, reduce, remainingMs, formatClock, repairedCount, tokenCount, isUnlocked,
  restorationPercent, repairBlocker, SESSION, MISSION, MAX_TOKENS,
} from './game/state.js';
import {
  award, unlockBadge, completeDaily, dailyFor, dailyDone, setSquad, squadActive, levelOf, levelProgress,
  dayString, TEAMMATES, XP,
} from './game/profile.js';
import {
  createStorage, loadSettings, saveSettings, loadSession, saveSession, clearSession,
  loadProfile, saveProfile, clearAll,
} from './game/persistence.js';
import { sanitizeProfile } from './game/profile.js';
import { esc, icon, $, $$, announce, prefersReducedMotion } from './ui/dom.js';
import { createMapView } from './ui/map.js';
import { questsPage, missionPage, physicalPage, gamePage, rallyPage, reflectPage, inventoryPage, squadPage, statusPage } from './ui/pages.js?v=20261011-quest-journal-location';
import { titleScreen, introScreen, summaryScreen, locationSheet, modalHTML, repairBanner, INTRO_LAST } from './ui/screens.js';
import { crest } from './ui/art.js';
import { mountGame } from './ui/games.js';
import { burstFrom, floatFrom, floatText, shake, pop, countUp } from './ui/fx.js';
import { setSoundEnabled, play } from './ui/audio.js';
import {
  TRACK, createTrack, startTrack, pauseTrack, stopTrack, addSample, summarize, restoreTrack, walkMet, addSteps, setMotion,
} from './game/tracking.js';
import { createStepCounter, addMotion, pauseSteps } from './game/steps.js';
import { requestMotion, startMotion, stopMotion } from './ui/motion.js';
import { huntPage, patternPage, episodePage } from './ui/feature-pages.js';
import { analyseImage, matchTarget, imageHash, isLikelyDuplicate } from './game/colour.js';
import { checkAnswer } from './game/pattern.js';
import { startWatch, stopWatch, permissionState, simulatorAllowed, setSimMode, simMode } from './ui/geo.js';
import { walkModel, updateWalkPanel, walkBarText } from './ui/walk-view.js';

const TABS = [
  { id: 'map', label: 'Map', icon: 'map' },
  { id: 'quests', label: 'Quests', icon: 'scroll' },
  { id: 'inventory', label: 'Inventory', icon: 'satchel' },
  { id: 'squad', label: 'Squad', icon: 'squad' },
  { id: 'status', label: 'Status', icon: 'hourglass' },
];
const LOW_TIME_MS = 2 * 60 * 1000;
const PERFECT_BADGE = { focus: 'focus-perfect', rhythm: 'rhythm-perfect', sequence: 'patient', pattern: 'patient' };

function browserStorage() {
  try {
    return window.localStorage;
  } catch {
    return { getItem() { throw new Error('x'); }, setItem() { throw new Error('x'); }, removeItem() {} };
  }
}

export function startApp(root) {
  const storage = createStorage(browserStorage());
  const settings = loadSettings(storage);
  let profile = loadProfile(storage);
  const now = () => Date.now();
  const today = () => dayString(now());

  let state = loadSession(storage) || createInitialState();
  if (state.session.status === SESSION.RUNNING) state = reduce(state, { type: 'TICK', now: now() });

  const ui = {
    screen: 'title', tab: 'map', page: null, from: 'map', sheet: null, modal: null, questView: 'quests',
    selectedMissionId: null, selectedDestinationId: null,
    introStep: 0, introMode: 'new', legendOpen: false, mapList: false, justUnlocked: [], settleId: null,
    newTokens: 0, lowWarned: false, squadEdit: false, squadDraft: null, profileEdit: false,
    repairing: null, banner: null, runXp: 0, runBadges: [],
  };

  let shell = null;
  let lastKey = null;
  let lastSheet = null;
  let lastModal = null;
  let game = null;
  let camKey = null; // last screen rendered, for stopping the camera when leaving it
  let noticePointer = null;
  let suppressNoticeClickUntil = 0;
  const toastTimers = new WeakMap();

  setSoundEnabled(settings.sound);

  // ---------- persistence ----------
  const persist = () => {
    if (!saveSession(storage, state) && storage.available) toast('Could not save progress.', 'info');
  };
  const persistProfile = () => saveProfile(storage, profile);

  function dispatch(action) {
    const prev = state;
    state = reduce(state, { ...action, now: now() });
    if (state === prev) return false;
    persist();
    if (prev.session.status !== SESSION.ENDED && state.session.status === SESSION.ENDED && state.session.endReason === 'TIMEOUT' && ui.screen === 'game') {
      ui.sheet = null;
      ui.modal = { type: 'timeup' };
      play('error');
      announce("Time's up.");
    }
    return true;
  }

  // ---------- GPS walk (Frozen Character) ----------
  // One walk can be tracked at a time. The in-memory track holds the live
  // reading; only its summary (no coordinates) is saved through SET_TRACK.
  // Policy: tracking auto-pauses when the game leaves the screen or the
  // session pauses; it stops (watcher cleared) when the walk is finished,
  // switched to self-report, or the session ends/restarts. A reload restores
  // the walk as paused. "New walk" after Stop starts again from zero.
  const simulator = simulatorAllowed();
  const walk = { id: null, track: createTrack(), error: null, permission: 'unknown', autoPaused: null, savedAt: 0, stepper: createStepCounter(), stepTarget: undefined, motionTimer: 0, noticeDismissedFor: null, starting: false };

  function walkAttach(id) {
    if (walk.id === id) return;
    walkDetach();
    walk.id = id;
    walk.noticeDismissedFor = null;
    walk.starting = false;
    walk.stepTarget = getMission(id).physical.stepTarget;
    walk.stepper = createStepCounter();
    walk.track = state.tracks[id] ? restoreTrack(state.tracks[id]) : createTrack(simulator ? 'simulator' : 'device');
    walk.error = null;
    walk.autoPaused = walk.track.status === TRACK.PAUSED ? 'reload' : null;
    permissionState().then((p) => { walk.permission = p; if (ui.page && ui.page.type === 'physical' && walk.track.status === TRACK.IDLE) { lastKey = null; render(); } });
  }

  function walkDetach() {
    stopWatch();
    stopSensors();
    if (walk.id && walk.track.status === TRACK.TRACKING) {
      walk.track = pauseTrack(walk.track, now());
      walkSave();
    }
    walk.id = null;
    walk.track = createTrack();
    walk.error = null;
    walk.autoPaused = null;
    walk.noticeDismissedFor = null;
    walk.starting = false;
  }

  function walkSave() {
    if (!walk.id || walk.track.status === TRACK.IDLE) return;
    walk.savedAt = now();
    dispatch({ type: 'SET_TRACK', id: walk.id, track: summarize(walk.track, now()) });
  }

  function stopSensors() {
    stopMotion();
    clearTimeout(walk.motionTimer);
    walk.stepper = pauseSteps(walk.stepper);
  }

  // Motion: called with the permission promise started inside the tap (iOS rule).
  function walkMotion(permission) {
    const id = walk.id;
    permission.then((res) => {
      if (walk.id !== id) return;
      walk.starting = false;
      if (walk.track.status !== TRACK.TRACKING) return;
      if (res !== 'granted') {
        walk.track = setMotion(walk.track, res === 'denied' ? 'denied' : 'unavailable');
        walkSave();
        pauseIfNoTrackingSource(id);
        return refreshWalk(true);
      }
      if (walk.track.motion !== 'active') walk.track = setMotion(walk.track, 'pending');
      startMotion((sample) => {
        if (walk.id !== id || walk.track.status !== TRACK.TRACKING) return;
        const r = addMotion(walk.stepper, sample);
        walk.stepper = r.state;
        if (walk.track.motion !== 'active') { walk.track = setMotion(walk.track, 'active'); walkSave(); refreshWalk(true); }
        if (r.stepsAdded) walk.track = addSteps(walk.track, r.stepsAdded);
      });
      // Desktop browsers expose the event but never fire it: give up after 3 s.
      clearTimeout(walk.motionTimer);
      walk.motionTimer = setTimeout(() => {
        if (walk.id === id && walk.track.motion === 'pending') {
          stopMotion();
          walk.track = setMotion(walk.track, 'unavailable');
          walkSave();
          pauseIfNoTrackingSource(id);
          refreshWalk(true);
        }
      }, 3000);
      refreshWalk(true);
    });
  }

  function walkBegin() {
    walk.error = null;
    walk.autoPaused = null;
    walk.track = startTrack({ ...walk.track, source: simulator ? 'simulator' : 'device' }, now());
    const id = walk.id;
    startWatch({
      onSample: (sample) => {
        if (walk.id !== id) return;
        const r = addSample(walk.track, sample, now());
        walk.track = r.track;
        if (walk.error && walk.error !== 'denied' && r.verdict !== 'ignored' && r.verdict !== 'invalid') { walk.error = null; refreshWalk(true); }
        if (r.verdict === 'moved' || r.verdict === 'anchor' || now() - walk.savedAt > 5000) walkSave();
      },
      onError: (code) => {
        if (walk.id !== id) return;
        const changed = walk.error !== code;
        walk.error = code;
        if (code === 'denied' || code === 'unsupported' || code === 'insecure') {
          stopWatch();
          walk.permission = code === 'denied' ? 'denied' : walk.permission;
          // Steps can still verify the walk without GPS; otherwise nothing is measuring, so pause.
          if (walk.track.status === TRACK.TRACKING && !['active', 'pending'].includes(walk.track.motion)) {
            stopSensors();
            walk.track = pauseTrack(walk.track, now());
            walk.autoPaused = 'error';
          }
          walkSave();
        }
        if (changed) { announce(`GPS: ${walkModel(walk, now()).signalLabel}.`); refreshWalk(true); }
      },
    }, { simulator });
    walkSave();
  }

  function pauseIfNoTrackingSource(id) {
    if (walk.id !== id || walk.track.status !== TRACK.TRACKING) return;
    const noGps = ['denied', 'unsupported', 'insecure'].includes(walk.error);
    const noMotion = ['denied', 'unavailable'].includes(walk.track.motion);
    if (!noGps || !noMotion) return;
    stopWatch();
    stopSensors();
    walk.track = pauseTrack(walk.track, now());
    walk.autoPaused = 'error';
    walkSave();
  }

  function walkPause(reason) {
    if (walk.track.status !== TRACK.TRACKING) return false;
    stopWatch();
    stopSensors();
    walk.track = pauseTrack(walk.track, now());
    walk.autoPaused = reason || null;
    walkSave();
    return true;
  }

  // Re-render only when the panel's structure must change; numbers update in renderLive.
  function refreshWalk(structural) {
    if (!shell) return;
    if (structural && ui.page && ui.page.type === 'physical' && ui.page.id === walk.id) { lastKey = null; render(); }
  }

  // ---------- Camera colour hunt (Lost Colour) ----------
  // Photos live only in memory (a canvas) while being checked, then are
  // dropped. Only the hash, detected colour and confidence are saved.
  const cam = {
    id: null, live: false, stream: null, hasImage: false, source: null, small: null, hash: null,
    analysis: null, match: null, duplicate: false, region: null, error: '', busy: false, justAdded: null,
    cameraSupported: Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && window.isSecureContext,
  };

  function stopCamera() {
    if (cam.stream) cam.stream.getTracks().forEach((t) => t.stop());
    cam.stream = null;
    cam.live = false;
  }

  function camReset() {
    stopCamera();
    Object.assign(cam, { hasImage: false, source: null, small: null, hash: null, analysis: null, match: null, duplicate: false, region: null, error: '', busy: false });
  }

  function camAnalyse() {
    const hunt = state.hunts[cam.id];
    if (!cam.small || !hunt) return;
    cam.analysis = analyseImage(cam.small, cam.region ? { region: cam.region } : {});
    cam.match = matchTarget(cam.analysis, hunt.target);
    cam.duplicate = isLikelyDuplicate(cam.hash, hunt.items.map((i) => i.hash));
    announce(cam.duplicate ? 'This looks like a photo you already added.' : cam.match.message);
  }

  // Draw any image source into memory canvases and analyse it.
  function camProcess(src, w, h) {
    const scale = Math.min(1, 640 / Math.max(w, h));
    const big = document.createElement('canvas');
    big.width = Math.max(1, Math.round(w * scale));
    big.height = Math.max(1, Math.round(h * scale));
    big.getContext('2d').drawImage(src, 0, 0, big.width, big.height);
    const k = Math.min(1, 160 / Math.max(big.width, big.height));
    const small = document.createElement('canvas');
    small.width = Math.max(1, Math.round(big.width * k));
    small.height = Math.max(1, Math.round(big.height * k));
    const sctx = small.getContext('2d', { willReadFrequently: true });
    sctx.drawImage(big, 0, 0, small.width, small.height);
    cam.source = big;
    cam.small = sctx.getImageData(0, 0, small.width, small.height);
    cam.hash = imageHash(cam.small);
    cam.hasImage = true;
    cam.region = null;
    cam.busy = false;
    cam.error = '';
    camAnalyse();
    play(cam.match && cam.match.pass && !cam.duplicate ? 'hit' : 'miss');
    lastKey = null;
    render();
  }

  async function camFile(file) {
    if (!file || !/^image\//.test(file.type)) { cam.error = 'That file is not an image. Choose a photo.'; lastKey = null; return render(); }
    cam.busy = true;
    cam.error = '';
    render();
    try {
      if (window.createImageBitmap) {
        const bmp = await createImageBitmap(file);
        camProcess(bmp, bmp.width, bmp.height);
        bmp.close && bmp.close();
      } else {
        const url = URL.createObjectURL(file);
        const img = new Image();
        await new Promise((ok, bad) => { img.onload = ok; img.onerror = bad; img.src = url; });
        camProcess(img, img.naturalWidth, img.naturalHeight);
        URL.revokeObjectURL(url);
      }
    } catch {
      cam.busy = false;
      cam.error = 'This photo could not be opened. Try another one.';
      lastKey = null;
      render();
    }
  }

  function mountFeatures(page) {
    const video = $('[data-cam-video]', page);
    if (video && cam.stream) { video.srcObject = cam.stream; video.play().catch(() => {}); }
    const canvas = $('[data-cam-preview]', page);
    if (canvas && cam.source) {
      canvas.width = cam.source.width;
      canvas.height = cam.source.height;
      canvas.getContext('2d').drawImage(cam.source, 0, 0);
    }
    if (ui.page && ui.page.type === 'game' && getMission(ui.page.id).digital.game === 'episode') page.scrollTop = page.scrollHeight;
  }

  // ---------- rewards ----------
  const runKey = (suffix) => `run:${state.session.startedAt}:${suffix}`;

  function gainXp(key, amount, anchor) {
    const r = award(profile, key, amount, today());
    if (!r.gained) return 0;
    profile = r.profile;
    persistProfile();
    ui.runXp += r.gained;
    const levelBadge = shell && $('.hud-level', shell.hud);
    if (levelBadge) {
      levelBadge.classList.remove('xp-gain');
      void levelBadge.offsetWidth;
      levelBadge.classList.add('xp-gain');
      setTimeout(() => levelBadge.classList.remove('xp-gain'), 760);
    }
    const target = anchor || (shell && $('.hud-level', shell.hud));
    if (target) floatFrom(target, `+${r.gained} XP`, 'fx-float--xp');
    play('xp');
    if (r.levelUp) {
      setTimeout(() => { play('level'); toast(`Level ${levelOf(profile.xp)}!`, 'star'); }, 500);
    }
    if (r.streakBadge) badgeToast('streak-3');
    if (shell) renderHud(true);
    return r.gained;
  }

  function badge(id) {
    const r = unlockBadge(profile, id, today());
    if (!r.unlocked) return;
    profile = r.profile;
    persistProfile();
    badgeToast(id);
  }
  function badgeToast(id) {
    ui.runBadges.push(id);
    setTimeout(() => { play('unlock'); toast(`Badge unlocked: ${badgeName(id)}`, 'seal'); }, 700);
  }
  const badgeName = (id) => ({ 'first-repair': 'First Fix', restored: 'Campus Restored', 'focus-perfect': 'Unplugged', 'rhythm-perfect': 'In Step', patient: 'Slow Lane', listener: 'Good Listener', 'squad-up': 'Squad Up', rally: 'Chorus', daily: 'Daily Explorer', 'streak-3': 'Three in a Row' }[id] || id);

  // ---------- helpers ----------
  function dismissToast(node, direction = 0) {
    if (!node || !node.isConnected || node.dataset.dismissing === 'true') return;
    node.dataset.dismissing = 'true';
    const timer = toastTimers.get(node);
    if (timer) clearTimeout(timer);
    node.style.setProperty('--dismiss-x', `${direction}px`);
    node.classList.add('is-dismissing');
    setTimeout(() => node.remove(), prefersReducedMotion() ? 0 : 220);
  }

  function dismissWalkNotice(direction = 80) {
    if (!walk.id || !shell || walk.noticeDismissedFor === walk.id) return;
    walk.noticeDismissedFor = walk.id;
    shell.walkBar.style.setProperty('--dismiss-x', `${direction}px`);
    shell.walkBar.classList.add('is-dismissing');
    shell.walkStatusRail.setAttribute('aria-hidden', 'true');
    shell.walkStatusRail.inert = true;
    setTimeout(() => {
      if (shell && walk.noticeDismissedFor === walk.id) {
        shell.walkBar.hidden = true;
        shell.walkBar.classList.remove('is-dismissing');
      }
    }, prefersReducedMotion() ? 0 : 220);
  }

  function dismissRepairBanner(direction = 80) {
    const banner = shell && shell.bannerLayer.firstElementChild;
    if (!banner || banner.classList.contains('is-dismissing')) return;
    banner.style.setProperty('--dismiss-x', `${direction}px`);
    banner.classList.add('is-dismissing');
    setTimeout(() => {
      if (shell && shell.bannerLayer.firstElementChild === banner) {
        ui.banner = null;
        renderLayers();
      }
    }, prefersReducedMotion() ? 0 : 220);
  }

  function toast(msg, ic = 'check', kind = '') {
    const host = shell ? shell.toasts : null;
    if (!host) return;
    // Keep at most two on screen so they never bury the controls: an exact
    // repeat replaces itself, and any new message clears stale errors.
    [...host.children].forEach((old) => {
      if (old.textContent === msg || old.classList.contains('toast--error')) old.remove();
    });
    while (host.children.length >= 2) host.firstElementChild.remove();
    const t = document.createElement('div');
    t.className = `toast dismissible-notice ${kind}`;
    t.innerHTML = `<button type="button" class="toast-main" data-action="dismiss-notice">${icon(ic)}<span>${esc(msg)}</span></button><button type="button" class="notice-close" data-action="dismiss-notice" aria-label="Dismiss notification">×</button>`;
    host.appendChild(t);
    toastTimers.set(t, setTimeout(() => dismissToast(t), 3000));
  }
  function refuse(msg, el) {
    play('error');
    toast(msg, 'info', 'toast--error');
    shake(el);
    announce(msg);
  }

  function confirmThen({ title, body, yes, no, danger }, onYes) {
    ui.modal = { type: 'confirm', title, body, yes, no, danger, onYes, back: ui.modal };
    render();
  }

  function applySettings() {
    const html = document.documentElement;
    html.classList.toggle('reduce-motion', settings.reduceMotion);
    html.classList.toggle('large-text', settings.largeText);
  }

  function goScreen(screen, patch = {}) {
    const leaving = root.firstElementChild;
    const doIt = () => {
      destroyGame();
      Object.assign(ui, { screen, sheet: null, modal: null, banner: null }, patch);
      if (screen !== 'game') shell = null;
      lastKey = null;
      render();
    };
    if (leaving && leaving.classList.contains('title-screen') && !prefersReducedMotion()) {
      leaving.classList.add('screen-exit');
      setTimeout(doIt, 340);
    } else {
      doIt();
    }
  }

  function destroyGame() {
    if (game) { game.destroy(); game = null; }
  }

  function begin() {
    walkDetach();
    camReset();
    ui.walkSelf = null;
    state = reduce(createInitialState(), { type: 'SET_UNLOCK_ALL', value: state.unlockAll, now: now() });
    clearSession(storage);
    dispatch({ type: 'START_SESSION' });
    ui.runXp = 0;
    ui.runBadges = [];
    ui.lowWarned = false;
    play('start');
    goScreen('game', { tab: 'map', page: null });
    announce('Session started. Fifteen minutes.');
  }

  // ---------- rendering ----------
  function render() {
    applySettings();
    if (ui.screen === 'title') {
      root.innerHTML = titleScreen({ settings, profile, saved: state.session.status === SESSION.NOT_STARTED ? null : state, now: now() });
      return;
    }
    if (ui.screen === 'intro') {
      root.innerHTML = introScreen({ step: ui.introStep, mode: ui.introMode, profile });
      $('h1', root)?.focus({ preventScroll: true });
      return;
    }
    if (ui.screen === 'summary') {
      root.innerHTML = summaryScreen({ state, profile, runXp: ui.runXp, runBadges: ui.runBadges });
      $$('[data-count]', root).forEach((n) => { const to = Number(n.dataset.count); const pre = n.textContent.startsWith('+') ? '+' : ''; const suf = n.textContent.endsWith('%') ? '%' : ''; countUp(n, 0, to, 900, (v) => `${pre}${v}${suf}`); });
      $('h1', root)?.focus({ preventScroll: true });
      return;
    }
    renderGame();
  }

  function buildShell() {
    root.innerHTML = `
      <header class="hud">
        <button class="hud-level" data-action="tab" data-tab="inventory" aria-label="Level and XP"><span class="hud-crest"></span><span class="hud-lv"></span></button>
        <div class="hud-timer" role="timer">${icon('hourglass')}<span class="hud-clock">15:00</span></div>
        <button class="hud-signal" data-action="open-walk" aria-label="Campus grid status"><i></i><span class="hud-walk-icon" aria-hidden="true">${icon('steps', 'icon--xs')}</span></button>
        <span class="hud-spacer"></span>
        <span class="hud-restore" title="Campus restored"><span class="ring ring--sm ring--acid"><b></b></span></span>
        <span class="hud-tokens" title="Repair tokens">${icon('token')}<b></b></span>
        <button class="icon-btn hud-pause" data-action="pause-toggle"></button>
      </header>
      <div class="walk-status-rail" hidden><div class="walk-bar" role="group"><button class="walk-bar-main" data-action="walk-notice-dismiss">${icon('steps', 'icon--sm')}<span></span></button><button class="notice-close" data-action="dismiss-walk-notice" aria-label="Dismiss walk tracking status">×</button></div></div>
      <div class="toast-stack" aria-live="polite"></div>
      <div class="layer" data-layer="banner"></div>
      <div class="content"></div>
      <nav class="tabbar" aria-label="Main">
        ${TABS.map((t) => `<button class="tab" data-action="tab" data-tab="${t.id}">${icon(t.icon)}<span>${t.label}</span></button>`).join('')}
      </nav>
      <div class="layer" data-layer="sheet"></div>
      <div class="layer" data-layer="modal"></div>`;
    shell = {
      hud: $('.hud', root),
      content: $('.content', root),
      tabbar: $('.tabbar', root),
      walkStatusRail: $('.walk-status-rail', root),
      bannerLayer: $('[data-layer="banner"]', root),
      sheetLayer: $('[data-layer="sheet"]', root),
      modalLayer: $('[data-layer="modal"]', root),
      toasts: $('.toast-stack', root),
      walkBar: $('.walk-bar', root),
      map: createMapView({
        onSelectPlace: (id) => {
        ui.selectedDestinationId = id;
        ui.selectedMissionId = missionAtDestination(id)?.id || null;
          ui.sheet = { type: 'location', id };
          ui.mapList = false;
        ui.legendOpen = false;
          play('select');
          render();
          shell.map.focusPlace(id);
        },
        onOpenMission: (id) => openMission(id),
        onToggleLegend: () => { ui.legendOpen = !ui.legendOpen; ui.mapList = false; play('tap'); render(); },
        onToggleList: () => { ui.mapList = !ui.mapList; ui.legendOpen = false; play('tap'); render(); },
      }),
    };
    lastKey = null;
    lastSheet = null;
    lastModal = null;
  }

  function renderHud(animate = false) {
    const s = state.session;
    const rem = remainingMs(state, now());
    const timer = $('.hud-timer', shell.hud);
    timer.dataset.state = s.status;
    timer.dataset.low = String(s.status === SESSION.RUNNING && rem <= LOW_TIME_MS);
    const clock = $('.hud-clock', shell.hud);
    const clockText = formatClock(rem);
    if (clock.textContent !== clockText) {
      clock.textContent = clockText;
      timer.classList.remove('tick');
      void timer.offsetWidth;
      timer.classList.add('tick');
    }
    timer.setAttribute('aria-label', `${clockText} remaining${s.status === SESSION.PAUSED ? ', paused' : ''}`);
    const lvl = $('.hud-level', shell.hud);
    $('.hud-crest', lvl).innerHTML = crest(profile.avatar || 'compass', 30);
    lvl.style.setProperty('--p', Math.round(levelProgress(profile.xp) * 100));
    $('.hud-lv', lvl).textContent = `Lv ${levelOf(profile.xp)}`;
    lvl.setAttribute('aria-label', `Level ${levelOf(profile.xp)}, ${profile.xp} XP. Open rewards.`);
    const pct = restorationPercent(state);
    const rr = $('.hud-restore .ring', shell.hud);
    const old = Number(rr.style.getPropertyValue('--p') || 0);
    rr.style.setProperty('--p', pct);
    const b = $('b', rr);
    if (animate && old !== pct) countUp(b, old, pct, 700, (v) => `${v}%`); else b.textContent = `${pct}%`;
    $('.hud-restore', shell.hud).setAttribute('aria-label', `Campus ${pct}% restored`);
    $('.hud-tokens b', shell.hud).textContent = `${tokenCount(state)}`;
    $('.hud-tokens', shell.hud).setAttribute('aria-label', `${tokenCount(state)} of ${MAX_TOKENS} repair tokens`);
    const activeMission = MISSIONS.find((m) => state.missions[m.id].status === MISSION.ACTIVE);
    const signal = $('.hud-signal', shell.hud);
    const signalState = s.status === SESSION.PAUSED ? 'paused' : activeMission ? 'active' : repairedCount(state) === MISSIONS.length ? 'stable' : 'scan';
    signal.dataset.state = signalState;
    const walkStatus = walk.id && [TRACK.TRACKING, TRACK.PAUSED].includes(walk.track.status) ? walk.track.status.toLowerCase() : '';
    signal.dataset.walk = walkStatus;
    signal.disabled = !walkStatus;
    signal.setAttribute('aria-hidden', String(!walkStatus));
    const gridStatus = signalState === 'active' ? `Anomaly active: ${activeMission.name}` : signalState === 'paused' ? 'Campus grid paused' : signalState === 'stable' ? 'Campus grid restored' : 'Scanning campus grid';
    signal.title = walkStatus ? `${gridStatus}. Walk ${walkStatus}; open walk status.` : gridStatus;
    signal.setAttribute('aria-label', signal.title);
    const pb = $('.hud-pause', shell.hud);
    const paused = s.status === SESSION.PAUSED;
    pb.innerHTML = icon(paused ? 'play' : 'pause');
    pb.setAttribute('aria-label', paused ? 'Resume session' : 'Pause session');
    $$('.tab', shell.tabbar).forEach((t) => {
      if (t.dataset.tab === ui.tab) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
  }

  const mapCtx = () => ({ squad: squadActive(profile), rallyDone: Boolean(profile.ledger[`rally:${today()}`]), daily: dailyFor(today()), dailyDone: dailyDone(profile, today()) });

  function pageKey() {
    return `${ui.tab}|${ui.tab === 'quests' ? ui.questView : ''}|${ui.page ? `${ui.page.type}:${ui.page.id}` : ''}`;
  }

  function renderContent() {
    const key = pageKey();
    const changed = key !== lastKey;
    const ctx = {
      state, ui, settings, profile, now: now(), today: today(), storageAvailable: storage.available,
      walk, walkModel: walkModel(walk, now()), simulator, simMode: simMode(), cam,
    };
    if (key !== camKey) stopCamera(); // the camera never runs on another screen
    camKey = key;
    if (!ui.page && ui.tab === 'map') {
      destroyGame();
      if (shell.content.firstElementChild !== shell.map.el) shell.content.replaceChildren(shell.map.el);
      shell.map.update(state, ui, mapCtx());
      ui.justUnlocked = [];
      ui.settleId = null;
      lastKey = key;
      return;
    }
    // A running minigame is never rebuilt by unrelated updates.
    if (!changed && ui.page && (ui.page.type === 'game' || ui.page.type === 'rally') && game) return;
    destroyGame();
    let html;
    if (ui.page) {
      const { type, id } = ui.page;
      const gameKind = type === 'game' ? getMission(id).digital.game : null;
      html = type === 'mission' ? missionPage(ctx, id)
        : type === 'physical' ? (getMission(id).physical.kind === 'camera' ? huntPage(ctx, id) : physicalPage(ctx, id))
          : type === 'reflect' ? reflectPage(ctx, id) : type === 'rally' ? rallyPage(ctx)
            : gameKind === 'pattern' ? patternPage(ctx, id) : gameKind === 'episode' ? episodePage(ctx, id) : gamePage(ctx, id);
    } else {
      html = { quests: questsPage, inventory: inventoryPage, squad: squadPage, status: statusPage }[ui.tab](ctx);
    }
    const old = $('.page', shell.content);
    const scroll = !changed && old ? old.scrollTop : 0;
    shell.content.innerHTML = `<div class="page${changed ? ' page-enter' : ''}">${html}</div>`;
    const page = $('.page', shell.content);
    page.scrollTop = scroll;
    if (ui.tab === 'inventory' && !ui.page) ui.newTokens = 0;
    mountHostedGame(page);
    mountFeatures(page);
    cam.justAdded = null;
    if (ui.justDone) {
      const card = $(`.step-card--${ui.justDone}`, page);
      if (card) { card.classList.add('just-done'); burstFrom(card, { count: 16, spread: 70 }); }
      ui.justDone = null;
    }
    if (changed && !ui.modal && !ui.sheet) $('[tabindex="-1"]', page)?.focus({ preventScroll: true });
    lastKey = key;
  }

  function mountHostedGame(page) {
    const host = $('[data-game-host]', page);
    if (!host) return;
    const kind = host.dataset.gameHost;
    const id = host.dataset.id;
    const mates = profile.squad.members.map((m) => TEAMMATES.find((t) => t.id === m)).filter(Boolean);
    game = mountGame(kind, host, {
      squad: squadActive(profile),
      mates: mates.length ? mates : TEAMMATES.slice(0, 1),
      play,
      onWin: (result) => (kind === 'rally' ? winRally(result, host) : winDigital(id, result, host)),
    });
  }

  function renderLayers() {
    if (ui.banner && (ui.page || ui.tab !== 'map')) ui.banner = null; // only on the map, never covering a page
    if (String(ui.banner ? ui.banner.key : '') !== (shell.bannerLayer.dataset.key || '')) {
      shell.bannerLayer.innerHTML = ui.banner ? repairBanner(ui.banner) : '';
      shell.bannerLayer.dataset.key = ui.banner ? String(ui.banner.key) : '';
    }
    if (ui.sheet !== lastSheet) {
      shell.sheetLayer.innerHTML = ui.sheet ? locationSheet({ state, profile, destId: ui.sheet.id, today: today() }) : '';
      if (ui.sheet) $('.sheet .btn, .sheet button', shell.sheetLayer)?.focus({ preventScroll: true });
      lastSheet = ui.sheet;
    }
    if (ui.modal !== lastModal) {
      shell.modalLayer.innerHTML = ui.modal ? modalHTML(ui.modal, { state, now: now() }) : '';
      if (ui.modal) $('.modal button', shell.modalLayer)?.focus({ preventScroll: true });
      lastModal = ui.modal;
    }
  }

  function renderGame() {
    if (!shell || !root.contains(shell.hud)) buildShell();
    renderHud();
    renderContent();
    renderLayers();
  }

  // Values that change every second, updated without re-rendering.
  function renderLive() {
    if (ui.screen !== 'game' || !shell) return;
    renderHud();
    const wm = walk.id ? walkModel(walk, now()) : null;
    if (wm) updateWalkPanel($('[data-walk-panel]', shell.content), wm);
    const onWalkPage = ui.page && ui.page.type === 'physical' && ui.page.id === walk.id;
    const barText = wm && !onWalkPage ? walkBarText(wm) : '';
    const showWalkNotice = Boolean(barText && walk.noticeDismissedFor !== walk.id);
    shell.walkStatusRail.hidden = !barText;
    const dismissAnimating = shell.walkBar.classList.contains('is-dismissing');
    shell.walkBar.hidden = !showWalkNotice && !dismissAnimating;
    shell.walkStatusRail.setAttribute('aria-hidden', String(!showWalkNotice));
    shell.walkStatusRail.inert = !showWalkNotice;
    if (barText) {
      if ($('span', shell.walkBar).textContent !== barText) $('span', shell.walkBar).textContent = barText;
      $('.walk-bar-main', shell.walkBar).setAttribute('aria-label', `Dismiss walk status: ${barText}`);
    }
    const rem = formatClock(remainingMs(state, now()));
    $$('[data-live-clock]', shell.content).forEach((n) => { n.textContent = rem; });
    const t = $('[data-phys-timer]', shell.content);
    if (t && t.dataset.started) {
      const total = Number(t.dataset.seconds) * 1000;
      const left = Math.max(0, total - (now() - Number(t.dataset.started)));
      $('[data-phys-clock]', t).textContent = formatClock(left);
      $('.ring', t).style.setProperty('--p', Math.round((1 - left / total) * 100));
      const done = $('[data-phys-done]', shell.content);
      if (!left && done && done.getAttribute('aria-disabled') === 'true') {
        done.setAttribute('aria-disabled', 'false');
        $('small', t).textContent = 'Done';
        play('win');
        pop(done);
      }
    }
  }

  // ---------- navigation ----------
  function openMission(id) {
    const mission = getMission(id);
    if (!mission) return;
    if (!isUnlocked(state, id)) return refuse('Complete the previous challenge to unlock this.');
    ui.selectedMissionId = id;
    ui.selectedDestinationId = mission.destinationId;
    ui.from = ui.page ? ui.from : ui.tab;
    ui.page = { type: 'mission', id };
    ui.sheet = null;
    ui.mapList = false;
    play('open');
    render();
  }

  function locateMission(id) {
    const mission = getMission(id);
    if (!mission) return;
    ui.selectedMissionId = id;
    ui.selectedDestinationId = mission.destinationId;
    ui.tab = 'map';
    ui.page = null;
    ui.sheet = { type: 'location', id: mission.destinationId };
    ui.mapList = false;
    ui.legendOpen = false;
    settings.lastTab = 'map';
    saveSettings(storage, settings);
    play('select');
    render();
    shell.map.focusPlace(mission.destinationId);
  }

  function goBack() {
    if (!ui.page) return;
    if (['physical', 'game', 'reflect'].includes(ui.page.type)) ui.page = { type: 'mission', id: ui.page.id };
    else ui.page = null;
    play('tap');
    render();
  }

  // ---------- gameplay ----------
  // Send one episode message; the reply appears after a short typing beat.
  function episodeSend(id, text, el) {
    const before = state.episodes[id] ? state.episodes[id].messages.length : 0;
    if (!dispatch({ type: 'EPISODE_SEND', id, text })) return refuse(text && text.trim() ? 'That message could not be sent.' : 'Write a message first.', el);
    ui.episodeDraft = '';
    ui.episodeTyping = id;
    play('tap');
    lastKey = null;
    render();
    setTimeout(() => {
      if (ui.episodeTyping !== id) return;
      ui.episodeTyping = null;
      play(before + 1 >= 5 ? 'win' : 'select');
      if (ui.page && ui.page.type === 'game' && ui.page.id === id) { lastKey = null; render(); }
    }, prefersReducedMotion() ? 60 : 900);
  }

  // After any physical completion: reward once, then open the Quest Journal.
  function physicalDone(id, anchor, message) {
    if (walk.id === id) walkDetach();
    ui.walkSelf = null;
    gainXp(runKey(`${id}:physical`), XP.physical, anchor);
    ui.page = { type: 'reflect', id };
    play('part');
    toast(message, 'steps');
    announce(`${message}. Quest Journal open; every question is optional.`);
    render();
  }

  function winDigital(id, result, host) {
    if (!dispatch({ type: 'SUBMIT_DIGITAL', id, result })) {
      if (state.session.status !== SESSION.RUNNING) refuse('The session is not running.');
      ui.page = { type: 'mission', id };
      return render();
    }
    const mission = getMission(id);
    gainXp(runKey(`${id}:digital`), XP.digital, host);
    if (result.perfect) {
      setTimeout(() => gainXp(runKey(`${id}:perfect`), XP.perfect, host), 350);
      if (PERFECT_BADGE[mission.digital.game]) badge(PERFECT_BADGE[mission.digital.game]);
    }
    if (mission.digital.game === 'social' || mission.digital.game === 'episode') badge('listener');
    ui.page = { type: 'mission', id };
    ui.justDone = 'digital';
    play('part');
    toast('Digital mission complete', 'bolt');
    announce('Digital mission complete.');
    render();
  }

  function winRally(result, host) {
    if (!squadActive(profile)) return;
    const gained = gainXp(`rally:${today()}`, XP.rally, host);
    profile = setSquad(profile, { rallyBest: Math.max(profile.squad.rallyBest || 0, result.rounds || 0), xp: (profile.squad.xp || 0) + gained });
    persistProfile();
    badge('rally');
    toast(gained ? 'Squad Rally won!' : 'Rally won again. Squad XP is once per day.', 'squad');
    ui.page = null;
    ui.tab = 'squad';
    render();
  }

  function doRepair(id, btn) {
    const blocker = repairBlocker(state, id);
    if (blocker) return refuse(blocker, btn);
    const before = MISSIONS.filter((m) => isUnlocked(state, m.id)).map((m) => m.id);
    ui.repairing = id;
    play('repair');
    const hero = $('[data-mission-hero]', shell.content);
    if (hero) hero.classList.add('is-repairing');
    setTimeout(() => {
      ui.repairing = null;
      if (!dispatch({ type: 'REPAIR', id })) return render();
      dispatch({ type: 'MARK_CELEBRATED', id });
      const mission = getMission(id);
      const unlocked = MISSIONS.filter((m) => isUnlocked(state, m.id) && !before.includes(m.id)).map((m) => m.id);
      const victory = state.session.endReason === 'VICTORY';
      ui.page = null;
      ui.tab = 'map';
      ui.settleId = id;
      ui.justUnlocked = unlocked;
      ui.newTokens = 2;
      render();
      shell.map.focusPlace(mission.destinationId);
      setTimeout(() => {
        const pin = shell && shell.map.markerEl(mission.destinationId);
        burstFrom(pin, { count: 34, spread: 140 });
        let xp = gainXp(runKey(`${id}:repair`), XP.repair, pin);
        if (squadActive(profile)) {
          const sq = gainXp(runKey(`${id}:squad`), XP.squadBonus, pin);
          if (sq) { profile = setSquad(profile, { xp: (profile.squad.xp || 0) + sq + XP.repair }); persistProfile(); }
          xp += sq;
        }
        if (repairedCount(state) === 1) badge('first-repair');
        const bannerKey = now();
        ui.banner = { key: bannerKey, mission, unlocked, tokens: tokenCount(state), xp };
        renderLayers();
        setTimeout(() => { if (ui.banner && ui.banner.key === bannerKey) { ui.banner = null; if (shell) renderLayers(); } }, 5000);
        renderHud(true);
        announce(`${mission.name} repaired. Two tokens and ${xp} XP.${unlocked.length ? ' New area unlocked.' : ''}`);
        if (unlocked.length) {
          setTimeout(() => {
            play('unlock');
            unlocked.forEach((u) => { const p = shell && shell.map.markerEl(getMission(u).destinationId); burstFrom(p, { count: 14, spread: 60 }); });
          }, 900);
        }
        if (victory) {
          setTimeout(() => {
            gainXp(runKey('victory'), XP.victory);
            badge('restored');
            play('victory');
            goScreen('summary');
          }, prefersReducedMotion() ? 1200 : 2600);
        }
      }, prefersReducedMotion() ? 50 : 420);
    }, prefersReducedMotion() ? 0 : 750);
  }

  // ---------- events ----------
  const actions = {
    'dismiss-notice': (t) => dismissToast(t.closest('.toast')),
    'dismiss-walk-notice': () => dismissWalkNotice(),
    'walk-notice-dismiss': () => dismissWalkNotice(),
    'start-game': () => {
      const inProgress = [SESSION.RUNNING, SESSION.PAUSED].includes(state.session.status);
      const go = () => (profile.tutorialSeen ? begin() : goScreen('intro', { introStep: 0, introMode: 'new' }));
      if (!inProgress) return go();
      root.querySelector('.title-actions').innerHTML = `
        <p class="title-confirm">Start fresh? Your current session will end. XP and badges stay.</p>
        <button class="btn btn--acid btn--block" data-action="start-game-yes">Start new session</button>
        <button class="btn btn--ghost-dark btn--block" data-action="start-game-no">Keep playing</button>`;
      $('[data-action="start-game-no"]', root).focus();
    },
    'start-game-yes': () => (profile.tutorialSeen ? begin() : goScreen('intro', { introStep: 0, introMode: 'new' })),
    'start-game-no': () => render(),
    continue: () => {
      state = reduce(state, { type: 'TICK', now: now() });
      persist();
      if (state.session.status === SESSION.ENDED) return goScreen('summary');
      goScreen('game', { page: null });
      if (state.session.status === SESSION.PAUSED) { ui.modal = { type: 'pause' }; render(); }
    },
    'toggle-sound': () => {
      settings.sound = !settings.sound;
      setSoundEnabled(settings.sound);
      saveSettings(storage, settings);
      play('select');
      render();
    },
    'intro-next': () => { ui.introStep = Math.min(INTRO_LAST, ui.introStep + 1); play('tap'); render(); },
    'intro-prev': () => { ui.introStep = Math.max(0, ui.introStep - 1); play('tap'); render(); },
    'intro-skip': () => (ui.introMode === 'replay' ? goScreen('game') : (ui.introStep = INTRO_LAST, render())),
    'intro-close': () => goScreen('game'),
    'pick-avatar': (t) => { profile = { ...profile, avatar: t.dataset.avatar }; persistProfile(); play('select'); render(); },
    'intro-begin': () => {
      const name = $('#intro-profile-name', root)?.value.trim().slice(0, 24);
      if (name !== undefined) profile = { ...profile, fieldName: name };
      profile = { ...profile, tutorialSeen: true, avatar: profile.avatar || 'compass' };
      persistProfile();
      begin();
    },
    tab: (t) => {
      ui.tab = t.dataset.tab;
      ui.page = null;
      // Returning to the map restores the world, never the last detail panel.
      // Remembered selection only highlights a marker; marker clicks and Locate
      // are the explicit actions that open a location sheet.
      ui.sheet = null;
      lastSheet = undefined;
      if (ui.tab === 'map') {
        ui.mapList = false;
        ui.legendOpen = false;
        ui.selectedMissionId = null;
        ui.selectedDestinationId = null;
      }
      ui.squadEdit = false;
      ui.profileEdit = false;
      settings.lastTab = ui.tab;
      saveSettings(storage, settings);
      play('tap');
      render();
    },
    'quest-view': (t) => {
      ui.questView = t.dataset.view === 'journal' ? 'journal' : 'quests';
      play('tap');
      render();
      if (ui.tab === 'map' && ui.selectedDestinationId) shell.map.focusPlace(ui.selectedDestinationId);
    },
    'open-mission': (t) => openMission(t.dataset.id),
    'locate-mission': (t) => locateMission(t.dataset.id),
    locked: (t) => openMission(t.dataset.id),
    back: () => goBack(),
    activate: (t) => {
      const id = t.dataset.id;
      if (ui.page?.type !== 'mission' || ui.page.id !== id || !isUnlocked(state, id)) return refuse('Open an available challenge before starting it.', t);
      if (state.session.status !== SESSION.RUNNING) return refuse(state.session.status === SESSION.PAUSED ? 'Resume the session first.' : 'Start a session first.', t);
      if (dispatch({ type: 'ACTIVATE', id })) {
        play('start');
        toast('Challenge accepted', 'play');
      }
      openMission(id);
    },
    'open-physical': (t) => {
      const m = state.missions[t.dataset.id];
      if (m.status !== MISSION.ACTIVE) return refuse(m.status === MISSION.REPAIRED ? 'Already repaired.' : 'Accept the challenge first.', t);
      if (state.session.status !== SESSION.RUNNING) return refuse('Resume the session first.', t);
      if (m.physicalComplete) return refuse('Physical part already done.', t);
      if (getMission(t.dataset.id).physical.kind === 'walk') walkAttach(t.dataset.id);
      if (getMission(t.dataset.id).physical.kind === 'camera') {
        dispatch({ type: 'HUNT_INIT', id: t.dataset.id });
        dispatch({ type: 'MARK_STARTED', id: t.dataset.id, part: 'physical' });
        if (cam.id !== t.dataset.id) camReset();
        cam.id = t.dataset.id;
      }
      ui.page = { type: 'physical', id: t.dataset.id };
      play('open');
      render();
    },
    'open-digital': (t) => {
      const m = state.missions[t.dataset.id];
      if (m.status !== MISSION.ACTIVE) return refuse(m.status === MISSION.REPAIRED ? 'Already repaired.' : 'Accept the challenge first.', t);
      if (state.session.status !== SESSION.RUNNING) return refuse('Resume the session first.', t);
      if (m.digitalComplete) return refuse('Digital mission already won.', t);
      dispatch({ type: 'MARK_STARTED', id: t.dataset.id, part: 'digital' });
      if (getMission(t.dataset.id).digital.game === 'pattern') dispatch({ type: 'PATTERN_INIT', id: t.dataset.id, seed: (now() ^ 0x5bd1e995) >>> 0 });
      ui.page = { type: 'game', id: t.dataset.id };
      play('open');
      render();
    },
    'phys-start': (t) => {
      dispatch({ type: 'MARK_STARTED', id: t.dataset.id, part: 'physical' });
      dispatch({ type: 'SAVE_DRAFT', id: t.dataset.id, draft: { timerStartedAt: now() } });
      play('start');
      lastKey = null;
      render();
    },
    'phys-count': (t) => {
      const id = t.dataset.id;
      const n = (state.drafts[id]?.counted || 0) + 1;
      dispatch({ type: 'SAVE_DRAFT', id, draft: { counted: n } });
      play('hit');
      lastKey = null;
      render();
      burstFrom($$('.spot-slot', shell.content)[n - 1], { count: 10, spread: 40 });
    },
    'complete-physical': (t) => {
      const id = t.dataset.id;
      const mission = getMission(id);
      const draft = state.drafts[id] || {};
      if (t.getAttribute('aria-disabled') === 'true') {
        if (mission.physical.kind === 'consent') return refuse('Tick the box once they were happy to chat.', t);
        return refuse('Timer still running. Stopped early? Use the link below.', t);
      }
      if (['timer', 'walk'].includes(mission.physical.kind) && !draft.timerStartedAt) return refuse('Start the timer first.', t);
      if (mission.physical.kind === 'camera') {
        if (!dispatch({ type: 'COMPLETE_PHYSICAL', id, method: 'self' })) return refuse('Collect all five colours first.', t);
        camReset();
        return physicalDone(id, t, 'Colour hunt complete: every photo checked');
      }
      if (!dispatch({ type: 'COMPLETE_PHYSICAL', id, note: draft.note, method: 'self' })) return refuse(repairBlocker(state, id) || 'Not available right now.', t);
      physicalDone(id, t, 'Physical challenge complete (self-reported)');
    },
    'cam-open': async (t) => {
      cam.error = '';
      try {
        cam.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        cam.live = true;
        play('open');
      } catch (e) {
        cam.error = e && e.name === 'NotAllowedError' ? 'Camera access was refused. You can allow it in your browser settings, or upload a photo instead.'
          : e && e.name === 'NotFoundError' ? 'No camera was found on this device. Upload a photo instead.'
            : 'The camera could not start. Upload a photo instead.';
        refuse(cam.error, t);
      }
      lastKey = null;
      render();
    },
    'cam-cancel': () => { stopCamera(); play('tap'); lastKey = null; render(); },
    'cam-snap': (t) => {
      const video = $('[data-cam-video]', shell.content);
      if (!video || !video.videoWidth) return refuse('The camera is still starting. Try again in a moment.', t);
      const w = video.videoWidth;
      const h = video.videoHeight;
      stopCamera();
      play('select');
      camProcess(video, w, h);
    },
    'cam-retake': () => { camReset(); play('tap'); lastKey = null; render(); },
    'cam-add': (t) => {
      const id = cam.id;
      if (!cam.match || !cam.match.pass) return refuse(cam.match ? cam.match.message : 'Take a photo first.', t);
      if (cam.duplicate) return refuse('That looks like a photo you already added. Find a different object.', t);
      const before = state.hunts[id].items.length;
      const ok = dispatch({ type: 'HUNT_ADD', id, item: { hash: cam.hash, hex: cam.analysis.hex, colourId: cam.analysis.colour.id, confidence: cam.match.confidence } });
      if (!ok) return refuse('That photo could not be added.', t);
      camReset();
      cam.justAdded = before;
      play('unlock');
      const n = state.hunts[id].items.length;
      toast(`${n} of ${getMission(id).physical.count} found`, 'star');
      announce(`Added. ${n} of ${getMission(id).physical.count} found.`);
      lastKey = null;
      render();
      burstFrom($$('.hunt-slot', shell.content)[before], { count: 18, spread: 60 });
    },
    'pattern-pick': (t) => {
      const id = ui.page.id;
      const ps = state.puzzles[id];
      const r = ps.solved[0] ? 1 : 0;
      const cur = ui.pattern && ui.pattern.round === r ? ui.pattern.answer : [];
      if (cur.length >= ps.rounds[r].blanks.length) return refuse('All gaps are filled. Check, undo or reset.', t);
      ui.pattern = { round: r, answer: [...cur, t.dataset.tile], feedback: null };
      play('tap');
      lastKey = null;
      render();
    },
    'pattern-undo': () => { if (ui.pattern && ui.pattern.answer.length) { ui.pattern = { ...ui.pattern, answer: ui.pattern.answer.slice(0, -1), feedback: null }; play('tap'); lastKey = null; render(); } },
    'pattern-reset': () => { if (ui.pattern) { ui.pattern = { ...ui.pattern, answer: [], feedback: null }; play('tap'); lastKey = null; render(); } },
    'pattern-submit': (t) => {
      const id = t.dataset.id;
      const ps = state.puzzles[id];
      const r = ps.solved[0] ? 1 : 0;
      const answer = ui.pattern && ui.pattern.round === r ? ui.pattern.answer : [];
      if (answer.length !== ps.rounds[r].blanks.length) return refuse('Fill every gap first.', t);
      const res = checkAnswer(ps.rounds[r], answer);
      dispatch({ type: 'PATTERN_ATTEMPT', id, round: r, answer });
      const solvedNow = state.puzzles[id].solved[r] && !ps.solved[r];
      if (res.correct && solvedNow) {
        play('level');
        const gained = gainXp(runKey(`${id}:round${r + 1}`), XP.round, t);
        toast(`Round ${r + 1} cleared!${gained ? ` +${gained} XP` : ''}`, 'star');
        announce(`Round ${r + 1} cleared.`);
        ui.pattern = r === 0 ? { round: 1, answer: [], feedback: null, cleared: 0 } : { round: 1, answer, feedback: res };
        lastKey = null;
        render();
        burstFrom($('.pattern-seq, .pattern-clear', shell.content), { count: 30, spread: 110 });
        return;
      }
      play('error');
      ui.pattern = { round: r, answer, feedback: res };
      announce(res.message);
      lastKey = null;
      render();
      shake($('.pattern-seq', shell.content));
    },
    'pattern-finish': (t) => winDigital(t.dataset.id, {}, t),
    'episode-start': (t) => {
      dispatch({ type: 'EPISODE_START', id: t.dataset.id, episodeId: t.dataset.episode });
      dispatch({ type: 'MARK_STARTED', id: t.dataset.id, part: 'digital' });
      ui.episodeDraft = '';
      play('start');
      lastKey = null;
      render();
    },
    'episode-say': (t) => episodeSend(t.dataset.id, t.dataset.text, t),
    'episode-replay': (t) => {
      const episodeId = state.episodes[t.dataset.id]?.episodeId;
      if (episodeId) dispatch({ type: 'EPISODE_START', id: t.dataset.id, episodeId });
      else dispatch({ type: 'EPISODE_CLEAR', id: t.dataset.id });
      ui.episodeDraft = '';
      play('tap');
      lastKey = null;
      render();
    },
    'episode-finish': (t) => winDigital(t.dataset.id, {}, t),
    'walk-start': (t) => {
      if (walk.starting || walk.track.status === TRACK.TRACKING) return;
      if (state.session.status !== SESSION.RUNNING) return refuse('Resume the session first.', t);
      walk.starting = true;
      const motionPermission = requestMotion(); // first, synchronously inside the tap
      walkAttach(t.dataset.id);
      walk.starting = true;
      walkBegin();
      walkMotion(motionPermission);
      play('start');
      lastKey = null;
      render();
    },
    'walk-resume': (t) => actions['walk-start'](t),
    'walk-retry': (t) => {
      walk.error = null;
      if (walk.track.status === TRACK.STOPPED) walk.track = { ...walk.track, status: TRACK.PAUSED };
      actions['walk-start'](t);
    },
    'walk-pause': () => { if (walkPause(null)) { play('tap'); announce('Walk paused.'); lastKey = null; render(); } },
    'walk-stop': () => {
      if (walk.track.status !== TRACK.TRACKING && walk.track.status !== TRACK.PAUSED) return;
      stopWatch();
      stopSensors();
      walk.track = stopTrack(walk.track, now());
      walk.error = null;
      walk.autoPaused = null;
      walkSave();
      play('tap');
      announce(walkMet(summarize(walk.track, now())) ? 'Walk stopped. It is verified, so you can finish.' : 'Walk stopped.');
      lastKey = null;
      render();
    },
    'walk-finish': (t) => {
      const id = t.dataset.id;
      walkSave();
      if (!walkMet(state.tracks[id], walk.stepTarget)) return refuse('Not verified yet: keep walking until both goals are full, or walk without tracking.', t);
      stopWatch();
      stopSensors();
      if (!dispatch({ type: 'COMPLETE_PHYSICAL', id, method: 'tracked' })) return refuse(repairBlocker(state, id) || 'Not available right now.', t);
      walk.id = null;
      walk.track = createTrack();
      const how = state.missions[id].physicalMethod;
      physicalDone(id, t, how === 'steps' ? 'Walk verified by estimated steps' : how === 'gps' ? 'Walk verified by GPS' : 'Walk complete (dev simulator)');
    },
    'walk-self': (t) => {
      const id = t.dataset.id;
      if (walk.id === id && (walk.track.status === TRACK.TRACKING || walk.track.status === TRACK.PAUSED)) {
        stopWatch();
        stopSensors();
        walk.track = stopTrack(walk.track, now());
        walkSave();
      }
      ui.walkSelf = id;
      play('tap');
      lastKey = null;
      render();
    },
    'walk-gps': (t) => { ui.walkSelf = null; walkAttach(t.dataset.id); play('tap'); lastKey = null; render(); },
    'sim-mode': (t) => { setSimMode(t.dataset.mode); play('tap'); lastKey = null; render(); },
    'open-walk': () => {
      if (!walk.id) return;
      ui.from = ui.page ? ui.from : ui.tab;
      ui.page = { type: 'physical', id: walk.id };
      play('open');
      render();
    },
    'open-reflect': (t) => {
      const m = state.missions[t.dataset.id];
      if (!m || m.status === MISSION.UNDISCOVERED) return refuse('Accept the challenge first.', t);
      ui.from = ui.page ? ui.from : ui.tab;
      ui.page = { type: 'reflect', id: t.dataset.id };
      play('open');
      render();
    },
    'reflect-skip': (t) => {
      const id = t.dataset.id;
      if (!state.reflections[id]) dispatch({ type: 'SKIP_REFLECTION', id });
      ui.page = { type: 'mission', id };
      play('tap');
      render();
    },
    repair: (t) => doRepair(t.dataset.id, t),
    'daily-done': (t) => {
      const r = completeDaily(profile, today());
      if (!r.gained) return refuse('Already done today. Back tomorrow!', t);
      profile = r.profile;
      persistProfile();
      ui.runXp += r.gained;
      floatFrom(t, `+${r.gained} XP`, 'fx-float--xp');
      burstFrom(t, { count: 18, spread: 70 });
      play('xp');
      if (r.levelUp) setTimeout(() => { play('level'); toast(`Level ${levelOf(profile.xp)}!`, 'star'); }, 500);
      if (r.streakBadge) badgeToast('streak-3');
      badge('daily');
      toast('Daily challenge done', 'star');
      lastSheet = undefined;
      render();
    },
    'open-rally': (t) => {
      if (!squadActive(profile)) return refuse('Switch to Squad mode first.', t);
      if (!(repairedCount(state) >= SQUAD_RALLY.unlockAt || state.unlockAll)) return refuse('Repair 1 glitch to unlock the rally.', t);
      if (state.session.status === SESSION.ENDED || state.session.status === SESSION.NOT_STARTED) return refuse('Start a session first.', t);
      ui.page = { type: 'rally', id: SQUAD_RALLY.id };
      ui.sheet = null;
      play('open');
      render();
    },
    mode: (t) => {
      const mode = t.dataset.mode;
      if (mode === 'squad' && !profile.squad.name) { ui.squadEdit = true; return render(); }
      profile = setSquad(profile, { mode });
      persistProfile();
      play('select');
      toast(mode === 'squad' ? `Squad mode: ${profile.squad.name} (local)` : 'Solo mode', mode === 'squad' ? 'squad' : 'user');
      render();
    },
    'squad-edit': () => { ui.squadEdit = true; ui.squadDraft = null; render(); },
    'squad-cancel': () => { ui.squadEdit = false; ui.squadDraft = null; render(); },
    'invite-team': async (button) => {
      const emails = profile.squad.emails || [];
      if (!emails.length) { ui.squadEdit = true; render(); return refuse('Add player email addresses first.'); }
      const originalHTML = button.innerHTML;
      button.disabled = true;
      button.textContent = 'Sending invites…';
      try {
        const response = await fetch('/api/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamName: profile.squad.name, emails }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Email sending failed.');
        toast(`Invitation${emails.length === 1 ? '' : 's'} sent`, 'squad');
      } catch (error) {
        toast(error.message || 'Could not send invitations. Check the server email settings.', 'info');
      } finally {
        button.disabled = false;
        button.innerHTML = originalHTML;
      }
    },
    'squad-disband': () => confirmThen({ title: 'Disband squad?', body: 'Your squad name, teammates and squad XP on this device will be removed. Your own XP stays.', yes: 'Disband', danger: true }, () => {
      profile = setSquad(profile, { name: '', members: [], emails: [], mode: 'solo', xp: 0, rallyBest: 0 });
      persistProfile();
      render();
    }),
    'edit-profile': () => { ui.profileEdit = !ui.profileEdit; render(); },
    'toggle-setting': (t) => {
      const key = t.dataset.key;
      settings[key] = !settings[key];
      if (key === 'sound') setSoundEnabled(settings.sound);
      saveSettings(storage, settings);
      play('select');
      lastKey = null;
      render();
    },
    'toggle-unlock': () => {
      dispatch({ type: 'SET_UNLOCK_ALL', value: !state.unlockAll });
      play('unlock');
      toast(state.unlockAll ? 'All places unlocked' : 'Places unlock as you repair', 'lock');
      lastKey = null;
      render();
    },
    'reset-progress': () => confirmThen({ title: 'Reset all progress?', body: 'This deletes your session, Quest Journal, XP, level, badges, streak, daily history and squad from this browser. Settings stay.', yes: 'Reset everything', danger: true }, () => {
      walkDetach();
      clearAll(storage);
      profile = sanitizeProfile(null);
      state = createInitialState();
      goScreen('title');
    }),
    pause: () => {
      walkPause('session');
      if (dispatch({ type: 'PAUSE' })) { ui.modal = { type: 'pause' }; ui.sheet = null; play('tap'); announce('Paused.'); render(); }
    },
    resume: () => { dispatch({ type: 'RESUME' }); ui.modal = null; play('select'); announce('Resumed.'); render(); },
    'pause-toggle': () => actions[state.session.status === SESSION.PAUSED ? 'resume' : 'pause'](),
    finish: () => confirmThen({ title: 'Finish this session?', body: 'Repairs, XP and badges are kept. You will see your results.', yes: 'Finish', no: 'Keep playing' },
      () => { walkDetach(); dispatch({ type: 'FINISH' }); goScreen('summary'); }),
    'confirm-yes': () => { const fn = ui.modal.onYes; ui.modal = null; fn(); },
    'confirm-no': () => { ui.modal = ui.modal.back || null; render(); },
    'close-modal': () => { ui.modal = null; render(); },
    'replay-tutorial': () => goScreen('intro', { introStep: 0, introMode: 'replay' }),
    'close-sheet': () => { ui.sheet = null; shell.sheetLayer.replaceChildren(); lastSheet = undefined; play('tap'); render(); },
    'banner-close': () => dismissRepairBanner(),
    'view-summary': () => goScreen('summary'),
    'play-again': () => begin(),
    'to-title': () => { walkDetach(); goScreen('title'); },
  };

  root.addEventListener('pointerdown', (e) => {
    const notice = e.target.closest('.dismissible-notice, .walk-bar');
    if (!notice || e.button !== 0 || e.target.closest('.notice-close')) return;
    noticePointer = { notice, id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, time: performance.now(), swiping: false };
  });
  root.addEventListener('pointermove', (e) => {
    const p = noticePointer;
    if (!p || p.id !== e.pointerId || !p.notice.isConnected) return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    if (!p.swiping && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
      p.swiping = true;
      p.notice.classList.add('is-dragging');
      try { root.setPointerCapture(e.pointerId); } catch { /* pointer may have ended */ }
    }
    if (p.swiping) {
      e.preventDefault();
      p.lastX = e.clientX;
      p.notice.style.setProperty('--swipe-x', `${dx}px`);
    }
  }, { passive: false });
  const endNoticePointer = (e, cancelled = false) => {
    const p = noticePointer;
    if (!p || p.id !== e.pointerId) return;
    noticePointer = null;
    if (!p.swiping || cancelled) {
      p.notice.classList.remove('is-dragging');
      p.notice.style.setProperty('--swipe-x', '0px');
      return;
    }
    const dx = e.clientX - p.x;
    const elapsed = Math.max(1, performance.now() - p.time);
    const velocity = Math.abs(dx) / elapsed;
    if (Math.abs(dx) >= 72 || (Math.abs(dx) >= 28 && velocity >= 0.55)) {
      suppressNoticeClickUntil = performance.now() + 450;
      const direction = Math.sign(dx) * Math.max(180, Math.abs(dx));
      if (p.notice.classList.contains('toast')) dismissToast(p.notice, direction);
      else if (p.notice.classList.contains('walk-bar')) dismissWalkNotice(direction);
      else dismissRepairBanner(direction);
    } else {
      p.notice.classList.remove('is-dragging');
      p.notice.style.setProperty('--swipe-x', '0px');
    }
  };
  root.addEventListener('pointerup', (e) => endNoticePointer(e));
  root.addEventListener('pointercancel', (e) => endNoticePointer(e, true));

  root.addEventListener('click', (e) => {
    if (performance.now() < suppressNoticeClickUntil && e.target.closest('.dismissible-notice, .walk-bar')) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    const notice = e.target.closest('.toast, .walk-bar, .repair-banner');
    if (notice && !e.target.closest('[data-action]')) {
      e.preventDefault();
      e.stopPropagation();
      if (notice.classList.contains('toast')) dismissToast(notice);
      else if (notice.classList.contains('walk-bar')) dismissWalkNotice();
      else dismissRepairBanner();
      return;
    }
    const t = e.target.closest('[data-action]');
    if (!t || !root.contains(t) || t.disabled) return;
    const fn = actions[t.dataset.action];
    if (fn) {
      e.preventDefault();
      if (t.closest('.dismissible-notice, .walk-bar')) e.stopPropagation();
      fn(t);
      return;
    }
  });

  // Tap the photo to analyse just that object.
  root.addEventListener('click', (e) => {
    const c = e.target.closest('[data-cam-preview]');
    if (!c || !cam.small) return;
    const r = c.getBoundingClientRect();
    cam.region = { cx: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), cy: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)), r: 0.22 };
    camAnalyse();
    play('select');
    lastKey = null;
    render();
  });

  // Squad form and profile form.
  root.addEventListener('click', (e) => {
    const colour = e.target.closest('[data-squad-colour]');
    const av = e.target.closest('.profile-edit [data-avatar]');
    if (colour) {
      const form = $('[data-squad-form]', root);
      const d = ui.squadDraft || { name: profile.squad.name, colour: profile.squad.colour, emails: [...(profile.squad.emails || [])] };
      d.name = form.elements.name.value;
      d.emails = form.elements.emails.value.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean);
      if (colour) d.colour = colour.dataset.squadColour;
      ui.squadDraft = d;
      play('select');
      lastKey = null;
      render();
    }
    if (av) {
      profile = { ...profile, avatar: av.dataset.avatar };
      persistProfile();
      play('select');
      lastKey = null;
      render();
    }
  });

  root.addEventListener('submit', (e) => {
    const epForm = e.target.closest('[data-episode-form]');
    if (epForm) {
      e.preventDefault();
      return episodeSend(epForm.dataset.episodeForm, epForm.elements.text.value, epForm.elements.text);
    }
    const journal = e.target.closest('[data-reflect-form]');
    if (journal) {
      e.preventDefault();
      const id = journal.dataset.reflectForm;
      const answers = getMission(id).reflect.map((_, i) => journal.elements[`a${i}`].value);
      if (!dispatch({ type: 'SAVE_REFLECTION', id, answers })) return refuse('Could not save the journal entry.');
      play('select');
      toast('Saved to your Quest Journal', 'quill');
      announce('Saved to your Quest Journal.');
      ui.page = { type: 'mission', id };
      render();
      return;
    }
    const squadForm = e.target.closest('[data-squad-form]');
    if (squadForm) {
      e.preventDefault();
      const d = ui.squadDraft || { colour: profile.squad.colour };
      const name = squadForm.elements.name.value.trim();
      const rawEmails = squadForm.elements.emails.value.split(/[\s,;]+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
      const emails = [...new Set(rawEmails)];
      const err = $('[data-squad-error]', squadForm);
      if (!name) { err.textContent = 'Give your squad a name.'; return refuse('Give your squad a name.', squadForm.elements.name); }
      if (emails.length > 10) { err.textContent = 'Add up to 10 player email addresses.'; return refuse('A team can invite up to 10 players.', squadForm.elements.emails); }
      if (emails.some((email) => !/^[^\s@]+@[^\s@]+$/.test(email))) { err.textContent = 'Use an address with one @ and no spaces.'; return refuse('Check the email address format.', squadForm.elements.emails); }
      const isNew = !profile.squad.name;
      profile = setSquad(profile, { name, colour: d.colour, emails, mode: 'squad' });
      persistProfile();
      ui.squadEdit = false;
      ui.squadDraft = null;
      play('unlock');
      if (isNew) badge('squad-up');
      toast(`${profile.squad.name} team saved`, 'squad');
      lastKey = null;
      render();
      burstFrom($('.squad-banner', root));
      return;
    }
    const profForm = e.target.closest('[data-profile-form]');
    if (profForm) {
      e.preventDefault();
      profile = { ...profile, fieldName: profForm.elements.fieldName.value.trim().slice(0, 24) };
      persistProfile();
      ui.profileEdit = false;
      play('select');
      toast('Profile saved', 'user');
      lastKey = null;
      render();
    }
  });

  root.addEventListener('input', (e) => {
    if (e.target.id === 'ep-input') ui.episodeDraft = e.target.value;
    if (e.target.id === 'intro-profile-name') {
      profile = { ...profile, fieldName: e.target.value.slice(0, 24) };
      persistProfile();
    }
    const note = e.target.closest('[data-note]');
    if (note) dispatch({ type: 'SAVE_DRAFT', id: note.dataset.note, draft: { note: note.value } });
  });

  root.addEventListener('change', (e) => {
    const file = e.target.closest('[data-cam-file]');
    if (file) { camFile(file.files && file.files[0]); file.value = ''; return; }
    const consent = e.target.closest('[data-consent]');
    if (!consent) return;
    dispatch({ type: 'SAVE_DRAFT', id: consent.dataset.consent, draft: { consent: consent.checked } });
    const btn = $('[data-action="complete-physical"]', shell.content);
    if (btn) btn.setAttribute('aria-disabled', String(!consent.checked));
    play('tap');
  });

  document.addEventListener('keydown', (e) => {
    if (ui.screen !== 'game' || !shell) return;
    if (e.key === 'Escape') {
      const latestToast = shell.toasts.lastElementChild;
      if (latestToast) { e.preventDefault(); dismissToast(latestToast); return; }
      if (!shell.walkBar.hidden) { e.preventDefault(); dismissWalkNotice(); return; }
      if (shell.bannerLayer.firstElementChild) { e.preventDefault(); dismissRepairBanner(); return; }
      if (ui.modal?.type === 'confirm') { e.preventDefault(); return actions['confirm-no'](); }
      if (ui.modal?.type === 'pause') { e.preventDefault(); return actions['close-modal'](); }
      if (ui.sheet) return actions['close-sheet']();
      if (ui.legendOpen || ui.mapList) { ui.legendOpen = false; ui.mapList = false; return render(); }
    }
    if (e.key === 'Tab' && (ui.modal || ui.sheet)) {
      const layer = ui.modal ? shell.modalLayer : shell.sheetLayer;
      const items = $$('button:not([disabled]), [href], input, textarea', layer);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (!layer.contains(document.activeElement)) { e.preventDefault(); first.focus(); } else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  // ---------- clock ----------
  function tick() {
    if (state.session.status === SESSION.RUNNING) {
      const prev = state;
      state = reduce(state, { type: 'TICK', now: now() });
      if (state !== prev) {
        persist();
        if (state.session.endReason === 'TIMEOUT' && ui.screen === 'game') {
          destroyGame();
          walkDetach();
          ui.sheet = null;
          ui.modal = { type: 'timeup' };
          play('error');
          announce("Time's up.");
          render();
        }
      }
      const rem = remainingMs(state, now());
      if (ui.screen === 'game' && !ui.lowWarned && rem > 0 && rem <= LOW_TIME_MS) {
        ui.lowWarned = true;
        toast('Two minutes left. No need to rush.', 'hourglass');
        announce('Two minutes left.');
      }
    }
    if (walk.id && walk.track.status === TRACK.TRACKING && now() - walk.savedAt > 5000) walkSave();
    renderLive();
  }
  setInterval(tick, 250);
  document.addEventListener('visibilitychange', () => {
    // Foreground-only (D10): leaving the screen pauses GPS and clears the watcher.
    if (document.hidden) { if (walkPause('hidden')) { lastKey = null; render(); } return; }
    tick();
  });
  window.addEventListener('pagehide', () => walkPause('hidden'));

  // Audio can only start after a gesture; prime it on the first interaction.
  root.addEventListener('pointerdown', () => setSoundEnabled(settings.sound), { once: true });

  render();
  void floatText;
}
