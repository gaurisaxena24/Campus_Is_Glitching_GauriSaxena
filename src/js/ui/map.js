// Campus map: the game world. Illustrated map with pan, zoom (buttons, wheel,
// pinch, keyboard), live location states, glitch zones that vanish when
// repaired, a campus that regains colour as it is restored, a legend, a list
// fallback and the current-objective chip. Built once and updated in place.

import { DESTINATIONS, MAP_IMAGE } from '../data/destinations.js';
import { missionAtDestination, MISSIONS, SQUAD_RALLY } from '../data/missions.js';
import { displayState, restorationPercent, repairedCount, MISSION } from '../game/state.js';
import { esc, icon } from './dom.js';
import { pinSVG, STATE_LABEL, STATE_ICON } from './pins.js';

const W = MAP_IMAGE.width;
const H = MAP_IMAGE.height;
const MAX_SCALE = 1.6;
const PAD = 48;
const LIVE = new Set(['AVAILABLE', 'ACTIVE', 'PHYSICAL_COMPLETE', 'DIGITAL_COMPLETE', 'READY']);

// The map objective always follows saved quest state in mission order; a
// tracked or just-completed quest must never displace the next live quest.
export function questChipHTML(state) {
  const next = MISSIONS.find((m) => !['REPAIRED', 'LOCKED'].includes(displayState(state, m.id)));
  if (!next) {
    return `<div class="quest-chip quest-chip--complete" role="status" aria-label="Campus restored. All glitches repaired.">
      <span class="chip-icon chip-icon--REPAIRED">${icon(STATE_ICON.REPAIRED)}</span>
      <span class="chip-text"><strong>Campus Restored</strong><small>Entire campus · All glitches repaired</small></span>
      <span class="chip-play" aria-hidden="true">${icon('next', 'icon--sm')}</span>
    </div>`;
  }
  const ds = displayState(state, next.id);
  const dest = DESTINATIONS.find((d) => d.id === next.destinationId);
  const stateText = {
    AVAILABLE: 'Available',
    ACTIVE: 'In progress',
    PHYSICAL_COMPLETE: STATE_LABEL.PHYSICAL_COMPLETE,
    DIGITAL_COMPLETE: STATE_LABEL.DIGITAL_COMPLETE,
    READY: STATE_LABEL.READY,
  }[ds];
  return `<button class="quest-chip" data-open-mission="${next.id}" aria-label="Open ${esc(next.name)} at ${esc(dest.label)}. ${stateText}.">
    <span class="chip-icon chip-icon--${ds}">${icon(STATE_ICON[ds])}</span>
    <span class="chip-text"><strong>${esc(next.name)}</strong><small>${esc(dest.label)} · ${stateText}</small></span>
    <span class="chip-play">${icon('next', 'icon--sm')}</span>
  </button>`;
}

export function createMapView({ onSelectPlace, onOpenMission, onToggleLegend, onToggleList }) {
  const root = document.createElement('div');
  root.className = 'map-page';
  root.innerHTML = `
    <div class="map-frame" tabindex="0" aria-label="Campus map. Drag or use arrow keys to pan; plus and minus to zoom; zero for the whole map.">
      <div class="map-world">
        <img src="${MAP_IMAGE.src}" width="${W}" height="${H}" alt="Illustrated FLAME University campus, based on the official Campus Map 2025" draggable="false">
        <div class="zones" aria-hidden="true"></div>
        <div class="map-scan" aria-hidden="true"></div>
        <div class="markers"></div>
      </div>
    </div>
    <div class="map-telemetry" aria-hidden="true"><i></i><span class="map-telemetry__label">SYNCING CAMPUS GRID</span><b>GRID RESTORED <strong>0%</strong></b></div>
    <div class="map-controls">
      <button class="icon-btn icon-btn--map" data-map="in" aria-label="Zoom in">${icon('plus')}</button>
      <button class="icon-btn icon-btn--map" data-map="out" aria-label="Zoom out">${icon('minus')}</button>
      <button class="icon-btn icon-btn--map" data-map="fit" aria-label="Show the whole map">${icon('fit')}</button>
      <button class="icon-btn icon-btn--map" data-map="list" aria-pressed="false" aria-label="List of places">${icon('list')}</button>
      <button class="icon-btn icon-btn--map" data-map="legend" aria-pressed="false" aria-label="Map legend">${icon('key')}</button>
    </div>
    <div class="map-overlays"></div>`;

  const frame = root.querySelector('.map-frame');
  const world = root.querySelector('.map-world');
  const img = world.querySelector('img');
  const zonesEl = root.querySelector('.zones');
  const markersEl = root.querySelector('.markers');
  const overlays = root.querySelector('.map-overlays');
  world.style.width = `${W}px`;
  world.style.height = `${H}px`;

  let view = { s: 0.6, x: 0, y: 0 };
  let fw = 0;
  let fh = 0;
  let initialised = false;
  let focusOnMeasure = null;
  let imageFailed = false;
  let lastState = null;
  let lastUi = null;
  let lastCtx = null;
  let telemetryTimer = 0;

  // ---------- geometry ----------
  const minScale = () => Math.min(fw / W, fh / H) * 0.96;
  const defaultScale = () => Math.max(minScale(), Math.min(MAX_SCALE, (fw / W) * 1.75));

  function clamp(v) {
    const s = Math.min(MAX_SCALE, Math.max(minScale(), v.s));
    const mw = W * s;
    const mh = H * s;
    const x = mw + PAD * 2 <= fw ? (fw - mw) / 2 : Math.min(PAD, Math.max(fw - mw - PAD, v.x));
    const y = mh + PAD * 2 <= fh ? (fh - mh) / 2 : Math.min(PAD, Math.max(fh - mh - PAD, v.y));
    return { s, x, y };
  }

  // Hide labels that would overlap a more important label or another marker's
  // pin, or be clipped at the map edge. Priority: selected, live glitches,
  // repaired, daily/rally, locked, plain places (data-rank).
  let declutterQueued = false;
  function declutter() {
    declutterQueued = false;
    const plaques = [...markersEl.querySelectorAll('.plaque')];
    plaques.forEach((p) => p.classList.remove('plaque--hidden'));
    const rank = (el) => Number(el.closest('.marker').dataset.rank || 0);
    const overlaps = (r, k) => r.left < k.right + 2 && r.right > k.left - 2 && r.top < k.bottom + 1 && r.bottom > k.top - 1;
    const fr = frame.getBoundingClientRect();
    const pins = [...markersEl.querySelectorAll('.pin-svg, .dest-dot, .marker-pips, .lock-tag')].map((n) => ({ marker: n.closest('.marker'), rank: rank(n), r: n.getBoundingClientRect() }));
    const kept = [];
    for (const p of plaques.sort((a, b) => rank(b) - rank(a))) {
      const r = p.getBoundingClientRect();
      if (!r.width) continue;
      const own = p.closest('.marker');
      const mine = rank(p);
      const clipped = r.left < fr.left || r.right > fr.right || r.top < fr.top || r.bottom > fr.bottom;
      // A label only yields to pins of equal or higher importance (T-163).
      const hit = clipped || kept.some((k) => overlaps(r, k)) || pins.some((q) => q.marker !== own && q.rank >= mine && overlaps(r, q.r));
      if (hit) p.classList.add('plaque--hidden');
      else kept.push(r);
    }
  }
  function queueDeclutter(delay = 0) {
    if (declutterQueued) return;
    declutterQueued = true;
    setTimeout(() => requestAnimationFrame(declutter), delay);
  }

  function apply(animate = false) {
    world.classList.toggle('animate', animate);
    world.style.transform = `translate(${view.x}px, ${view.y}px) scale(${view.s})`;
    world.style.setProperty('--inv', (1 / view.s).toFixed(4));
    world.classList.toggle('far', view.s < 0.42);
    queueDeclutter(animate ? 340 : 0);
  }

  function setView(v, animate = false) {
    view = clamp(v);
    apply(animate);
  }

  function centreOn(px, py, s = view.s, animate = true) {
    setView({ s, x: fw / 2 - (px / 100) * W * s, y: fh / 2 - (py / 100) * H * s }, animate);
  }

  function zoomAt(factor, cx = fw / 2, cy = fh / 2, animate = false) {
    const s = Math.min(MAX_SCALE, Math.max(minScale(), view.s * factor));
    const k = s / view.s;
    setView({ s, x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k }, animate);
  }

  function measure() {
    const r = frame.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    const changed = r.width !== fw || r.height !== fh;
    fw = r.width;
    fh = r.height;
    if (!initialised) {
      initialised = true;
      const target = DESTINATIONS.find((d) => d.id === focusOnMeasure);
      focusOnMeasure = null;
      if (target) centreOn(target.pos.x, target.pos.y + 6, defaultScale(), false);
      else centreOn(52, 44, defaultScale(), false);
    } else if (changed) {
      setView(view);
    }
    return true;
  }

  new ResizeObserver(() => measure()).observe(frame);

  // ---------- pointer pan and pinch ----------
  const pointers = new Map();
  let drag = null;
  let pinch = null;
  let moved = false;

  frame.addEventListener('pointerdown', (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved = false;
    if (pointers.size === 1) {
      drag = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    } else if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: view.s };
      drag = null;
    }
  });

  frame.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = frame.getBoundingClientRect();
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      zoomAt((pinch.s * (d / pinch.d)) / view.s, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      moved = true;
    } else if (drag) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (!moved && Math.hypot(dx, dy) < 6) return;
      if (!moved) {
        moved = true;
        frame.setPointerCapture(e.pointerId);
        frame.classList.add('dragging');
      }
      setView({ s: view.s, x: drag.vx + dx, y: drag.vy + dy });
    }
  });

  const endPointer = (e) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (pointers.size === 0) {
      drag = null;
      frame.classList.remove('dragging');
    }
  };
  frame.addEventListener('pointerup', endPointer);
  frame.addEventListener('pointercancel', endPointer);

  frame.addEventListener('click', (e) => {
    if (moved) {
      e.stopPropagation();
      e.preventDefault();
      moved = false;
    }
  }, true);

  frame.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = frame.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0016), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });

  frame.addEventListener('dblclick', (e) => {
    if (e.target.closest('.marker')) return;
    const r = frame.getBoundingClientRect();
    zoomAt(1.6, e.clientX - r.left, e.clientY - r.top, true);
  });

  frame.addEventListener('keydown', (e) => {
    if (e.target !== frame) return;
    const step = 60;
    const keys = {
      ArrowLeft: () => setView({ ...view, x: view.x + step }, true),
      ArrowRight: () => setView({ ...view, x: view.x - step }, true),
      ArrowUp: () => setView({ ...view, y: view.y + step }, true),
      ArrowDown: () => setView({ ...view, y: view.y - step }, true),
      '+': () => zoomAt(1.3, fw / 2, fh / 2, true),
      '=': () => zoomAt(1.3, fw / 2, fh / 2, true),
      '-': () => zoomAt(1 / 1.3, fw / 2, fh / 2, true),
      0: () => setView({ s: minScale(), x: 0, y: 0 }, true),
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  });

  root.querySelector('.map-controls').addEventListener('click', (e) => {
    const b = e.target.closest('[data-map]');
    if (!b) return;
    const a = b.dataset.map;
    if (a === 'in') zoomAt(1.35, fw / 2, fh / 2, true);
    else if (a === 'out') zoomAt(1 / 1.35, fw / 2, fh / 2, true);
    else if (a === 'fit') setView({ s: minScale(), x: 0, y: 0 }, true);
    else if (a === 'legend') onToggleLegend();
    else if (a === 'list') onToggleList();
  });

  markersEl.addEventListener('click', (e) => {
    const m = e.target.closest('.marker');
    if (m) onSelectPlace(m.dataset.dest);
  });

  overlays.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-mission], [data-place], [data-close-legend]');
    if (!t) return;
    if (t.dataset.openMission) onOpenMission(t.dataset.openMission);
    else if (t.dataset.place) onSelectPlace(t.dataset.place);
    else if ('closeLegend' in t.dataset) onToggleLegend();
  });

  img.addEventListener('error', () => {
    imageFailed = true;
    if (lastState) update(lastState, lastUi, lastCtx);
  });

  // ---------- rendering ----------
  function placeState(dest, state, ctx) {
    const mission = missionAtDestination(dest.id);
    if (mission) {
      const shared = Boolean(ctx.multiplayerRoom?.activities?.[mission.id]?.repaired);
      return { kind: 'glitch', mission, ds: shared ? 'REPAIRED' : displayState(state, mission.id), shared };
    }
    if (dest.id === SQUAD_RALLY.destinationId && ctx.squad) {
      const open = repairedCount(state) >= SQUAD_RALLY.unlockAt || state.unlockAll;
      return { kind: 'rally', ds: open ? 'RALLY' : 'LOCKED', done: ctx.rallyDone };
    }
    if (ctx.daily && ctx.daily.destinationId === dest.id) return { kind: 'daily', ds: 'DAILY', done: ctx.dailyDone };
    return { kind: 'place', ds: null };
  }

  function markerHTML(dest, state, ui, ctx) {
    const ps = placeState(dest, state, ctx);
    const isSelected = ui.selectedDestinationId === dest.id || (ui.sheet && ui.sheet.id === dest.id);
    const selected = isSelected ? ' selected' : '';
    const style = `left:${dest.pos.x}%;top:${dest.pos.y}%`;
    if (ps.kind === 'place') {
      const rank = selected ? 8 : dest.id === 'plaza' ? 4 : 0;
      return `<button class="marker marker--place${selected}" data-dest="${dest.id}" data-rank="${rank}" style="${style};z-index:${rank + 1}" aria-label="${esc(dest.name)}" aria-pressed="${isSelected}">
        <span class="dest-dot" aria-hidden="true"></span><span class="plaque" aria-hidden="true">${esc(dest.label)}</span></button>`;
    }
    const ds = ps.ds;
    const rank = selected ? 8 : LIVE.has(ds) ? 5 : ds === 'REPAIRED' ? 4 : ps.kind !== 'glitch' ? 3 : 2;
    let extra = '';
    let label = '';
    if (ps.kind === 'glitch') {
      const m = state.missions[ps.mission.id];
      if (m.status === MISSION.ACTIVE && !ps.shared) extra = `<span class="marker-pips" aria-hidden="true"><i class="phys${m.physicalComplete ? ' on' : ''}"></i><i class="dig${m.digitalComplete ? ' on' : ''}"></i></span>`;
      if (ds === 'LOCKED') extra = `<span class="lock-tag" aria-hidden="true">${icon('lock', 'icon--xs')}${ps.mission.unlockAt}</span>`;
      label = ds === 'LOCKED'
        ? `${dest.name}. Locked: repair ${ps.mission.unlockAt} glitch${ps.mission.unlockAt === 1 ? '' : 'es'} to unlock.`
        : ps.shared ? `${dest.name}. ${ps.mission.name}: repaired by your room team.` : `${dest.name}. ${ps.mission.name}: ${STATE_LABEL[ds]}.`;
    } else {
      label = `${dest.name}. ${STATE_LABEL[ds]}${ps.done ? ', done' : ''}.`;
      if (ps.done) extra = `<span class="done-tag" aria-hidden="true">${icon('check', 'icon--xs')}</span>`;
    }
    const cls = [
      'marker', `marker--${ps.kind}`, selected,
      LIVE.has(ds) && ds !== 'READY' ? 'glitching' : '',
      ds === 'READY' ? 'ready' : '',
      ps.shared ? 'team-repaired' : '',
      ps.mission && ui.justUnlocked && ui.justUnlocked.includes(ps.mission.id) ? 'unlocked-now' : '',
      ps.mission && ui.settleId === ps.mission.id ? 'settled' : '',
      ps.done ? 'is-done' : '',
    ].join(' ');
    return `<button class="${cls}" data-dest="${dest.id}" data-state="${ds}" data-rank="${rank}" style="${style};z-index:${rank + 2}" aria-label="${esc(label)}" aria-pressed="${isSelected}">
      ${pinSVG(ds)}${extra}<span class="plaque${LIVE.has(ds) ? ' corrupt' : ''}" aria-hidden="true">${esc(dest.label)}</span></button>`;
  }

  function zonesHTML(state, ctx) {
    return MISSIONS.map((mi) => {
      const d = DESTINATIONS.find((x) => x.id === mi.destinationId);
      const ds = ctx.multiplayerRoom?.activities?.[mi.id]?.repaired ? 'REPAIRED' : displayState(state, mi.id);
      const cls = ds === 'REPAIRED' ? 'zone zone--fixed' : ds === 'LOCKED' ? 'zone zone--locked' : 'zone zone--glitch';
      return `<span class="${cls}" style="left:${d.pos.x}%;top:${d.pos.y}%"><i></i><i></i><i></i></span>`;
    }).join('');
  }

  function legendHTML() {
    const row = (state, text) => `<li>${pinSVG(state)}<span>${text}</span></li>`;
    return `<section class="legend" aria-label="Map legend">
      <h2>Legend <button class="icon-btn icon-btn--map" style="width:34px;height:34px" data-close-legend aria-label="Close legend">${icon('close', 'icon--sm')}</button></h2>
      <ul>
        ${row('AVAILABLE', 'Glitching')}
        ${row('ACTIVE', 'Repair in progress')}
        ${row('READY', 'Ready to repair')}
        ${row('REPAIRED', 'Repaired')}
        ${row('LOCKED', 'Locked')}
        ${row('DAILY', 'Daily challenge')}
        <li><span class="dest-dot" style="margin:0 auto"></span><span>Campus place</span></li>
        <li class="off"><span class="legend-ring">${icon('pin')}</span><span>Your location<span class="unavail">Not shown: map not GPS-calibrated</span></span></li>
      </ul>
      <p class="legend-foot">Illustrated, not to scale. Based on the official FLAME Campus Map 2025.</p>
    </section>`;
  }

  function listHTML(state, ctx) {
    const items = DESTINATIONS.map((d) => {
      const ps = placeState(d, state, ctx);
      const ds = ps.ds;
      const thumb = ds ? `<span class="list-icon list-icon--${ds}">${icon(STATE_ICON[ds])}</span>` : `<span class="list-icon">${icon('pin')}</span>`;
      const sub = ps.kind === 'glitch' ? `${ps.mission.name} · ${STATE_LABEL[ds]}` : ps.kind === 'place' ? 'Campus place' : STATE_LABEL[ds];
      return `<button class="list-row" data-place="${d.id}">${thumb}<span><strong>${esc(d.name)}</strong><small>${esc(sub)}</small></span>${icon('next')}</button>`;
    }).join('');
    return `<div class="map-list">
      ${imageFailed ? `<p class="note note--warn">${icon('info')}<span>The map image could not load, so places are listed.</span></p>` : ''}
      <h2 class="section-title">Campus places</h2>
      <div class="list-rows">${items}</div></div>`;
  }

  function update(state, ui, ctx) {
    lastState = state;
    lastUi = ui;
    lastCtx = ctx;
    const restoredCount = ctx.multiplayerRoom
      ? MISSIONS.filter((mission) => ctx.multiplayerRoom.activities?.[mission.id]?.repaired).length
      : repairedCount(state);
    const restored = Math.round((restoredCount / MISSIONS.length) * 100);
    world.style.setProperty('--restore', (restored / 100).toFixed(2));
    const telemetry = root.querySelector('.map-telemetry');
    const active = MISSIONS.some((m) => state.missions[m.id].status === MISSION.ACTIVE);
    const glitching = MISSIONS.some((m) => displayState(state, m.id) === 'AVAILABLE');
    const label = ui.settleId ? 'SYSTEM RECONSTRUCTING' : ui.justUnlocked.length ? 'NEW ANOMALY DETECTED' : active ? 'SIGNAL ACQUIRED' : restored === 100 ? 'GRID STABLE' : 'SYNCING CAMPUS GRID';
    telemetry.dataset.signal = ui.settleId ? 'repair' : ui.justUnlocked.length ? 'unlock' : active ? 'active' : glitching ? 'glitching' : 'scan';
    telemetry.querySelector('.map-telemetry__label').textContent = label;
    telemetry.querySelector('b strong').textContent = `${restored}%`;
    clearTimeout(telemetryTimer);
    if (ui.settleId || ui.justUnlocked.length) {
      telemetryTimer = setTimeout(() => {
        const current = lastState;
        if (!current || !root.isConnected) return;
        const currentRestored = lastCtx.multiplayerRoom
          ? Math.round((MISSIONS.filter((mission) => lastCtx.multiplayerRoom.activities?.[mission.id]?.repaired).length / MISSIONS.length) * 100)
          : restorationPercent(current);
        const currentActive = MISSIONS.some((m) => current.missions[m.id].status === MISSION.ACTIVE);
        const currentGlitching = MISSIONS.some((m) => displayState(current, m.id) === 'AVAILABLE');
        telemetry.dataset.signal = currentActive ? 'active' : currentGlitching ? 'glitching' : 'scan';
        telemetry.querySelector('.map-telemetry__label').textContent = currentActive ? 'SIGNAL ACQUIRED' : currentRestored === 100 ? 'GRID STABLE' : 'SYNCING CAMPUS GRID';
      }, 1500);
    }
    zonesEl.innerHTML = zonesHTML(state, ctx);
    markersEl.innerHTML = DESTINATIONS.map((d) => markerHTML(d, state, ui, ctx)).join('');
    const listOn = ui.mapList || imageFailed;
    root.querySelector('[data-map="list"]').setAttribute('aria-pressed', String(listOn));
    root.querySelector('[data-map="legend"]').setAttribute('aria-pressed', String(Boolean(ui.legendOpen)));
    overlays.innerHTML = listOn ? listHTML(state, ctx) : `${ui.legendOpen ? legendHTML() : ''}${ui.sheet || ui.legendOpen ? '' : questChipHTML(state)}`;
    if (!initialised) requestAnimationFrame(measure);
    queueDeclutter();
  }

  return {
    el: root,
    update,
    markerEl(destId) {
      return markersEl.querySelector(`[data-dest="${destId}"] .pin-svg`);
    },
    focusPlace(destId) {
      const d = DESTINATIONS.find((x) => x.id === destId);
      if (!d) return;
      if (!initialised) {
        focusOnMeasure = destId;
        measure();
        return;
      }
      centreOn(d.pos.x, d.pos.y + 6, Math.max(view.s, defaultScale()), true);
    },
    measure,
  };
}
