// Full-screen views (title, onboarding, summary/victory), the location sheet
// and modal dialogs.

import { MISSIONS, getMission, missionAtDestination, SQUAD_RALLY } from '../data/missions.js';
import { getDestination } from '../data/destinations.js';
import {
  displayState, repairedCount, tokenCount, remainingMs, formatClock, restorationPercent,
  SESSION, MISSION, MAX_TOKENS, TOKENS_PER_REPAIR,
} from '../game/state.js';
import { AVATARS, BADGES, levelOf, dailyFor, dailyDone, XP, squadActive } from '../game/profile.js';
import { esc, icon } from './dom.js';
import { pinSVG, STATE_LABEL } from './pins.js';
import { glitchArt, crest } from './art.js';

// ---------- Title ----------
export function titleScreen({ settings, saved, profile, now }) {
  const motes = Array.from({ length: 14 }, (_, i) => {
    const kind = i % 5 === 0 ? ' leaf' : i % 3 === 0 ? ' pixel' : '';
    return `<span class="mote${kind}" style="left:${(i * 37) % 95}%;top:${30 + ((i * 53) % 60)}%;animation-delay:${(i * 0.71).toFixed(2)}s;animation-duration:${7 + (i % 5)}s"></span>`;
  }).join('');
  let resume = '';
  if (saved) {
    const st = saved.session.status;
    if (st === SESSION.RUNNING || st === SESSION.PAUSED) {
      resume = `<button class="btn btn--ghost-dark btn--block" data-action="continue">${icon('play')} Continue · ${formatClock(remainingMs(saved, now))} left</button>`;
    } else if (st === SESSION.ENDED) {
      resume = `<button class="btn btn--ghost-dark btn--block" data-action="continue">${icon('scroll')} Last results</button>`;
    }
  }
  return `<section class="title-screen screen-enter" aria-labelledby="game-title">
    <div class="title-scene" aria-hidden="true">
      <div class="scene-img"></div>
      <div class="scene-glitch"></div>
      <div class="scene-scan"></div>
      <span class="scene-marker">${pinSVG('AVAILABLE').replace('class="pin-svg ', 'style="width:36px;height:46px" class="pin-svg ')}</span>
      ${motes}
    </div>
    <div class="title-top">
      ${profile.xp ? `<span class="title-level">${crest(profile.avatar || 'compass', 30)} Lv ${levelOf(profile.xp)}</span>` : '<span></span>'}
      <button class="sound-pill" data-action="toggle-sound" aria-pressed="${settings.sound}">${icon(settings.sound ? 'sound' : 'mute')}<span>${settings.sound ? 'Sound on' : 'Sound off'}</span></button>
    </div>
    <div class="title-block">
      <h1 class="game-title" id="game-title" tabindex="-1">
        <span class="t-small">The Campus</span>
        <span class="t-big">Is <span class="glitch-word" data-text="Glitching">Glitching</span></span>
      </h1>
      <p class="title-tag">Move. Notice. Connect. Repair.</p>
    </div>
    <div class="title-panel">
      <div class="title-actions">
        <button class="btn btn--acid btn--xl btn--block" data-action="start-game">${icon('play')} Start game</button>
        ${resume}
      </div>
      <p class="title-foot">15-minute sessions · 5 glitches · FLAME University</p>
    </div>
  </section>`;
}

// ---------- Onboarding ----------
export const INTRO_LAST = 2;

export function introScreen({ step, mode, profile }) {
  const dots = Array.from({ length: INTRO_LAST + 1 }, (_, i) => `<i class="${i === step ? 'on' : ''}"></i>`).join('');
  const top = `<div class="intro-top"><div class="steps-dots" aria-label="Step ${step + 1} of ${INTRO_LAST + 1}">${dots}</div>
    <button class="link-btn link-btn--light" data-action="intro-skip">${mode === 'replay' ? 'Close' : 'Skip'}</button></div>`;
  let body = '';
  let actions = '';
  if (step === 0) {
    body = `<div class="intro-art intro-art--map"><span class="intro-glitch"></span></div>
      <p class="eyebrow eyebrow--acid">The campus is glitching</p>
      <h1 tabindex="-1">Four habits broke it</h1>
      <div class="habit-grid">
        <span>${icon('signal', 'icon--lg')}<b>Scrolling</b></span>
        <span>${icon('steps', 'icon--lg')}<b>Sitting still</b></span>
        <span>${icon('squad', 'icon--lg')}<b>Disconnecting</b></span>
        <span>${icon('hourglass', 'icon--lg')}<b>Rushing</b></span>
      </div>`;
    actions = `<button class="btn btn--acid btn--block" data-action="intro-next">Next ${icon('next', 'icon--sm')}</button>`;
  } else if (step === 1) {
    body = `<div class="intro-equation">
        <span class="eq-card">${icon('steps', 'icon--lg')}<b>Real world</b><small>a short walk, a chat, a break</small></span>
        <span class="eq-op">+</span>
        <span class="eq-card">${icon('bolt', 'icon--lg')}<b>In game</b><small>a quick minigame</small></span>
        <span class="eq-op">=</span>
        <span class="eq-card eq-card--win">${icon('wrench', 'icon--lg')}<b>Repair</b><small>XP, tokens, new areas</small></span>
      </div>
      <p class="eyebrow eyebrow--acid">HOW TO PLAY</p>
      <h1 tabindex="-1">BOTH HALVES FIX A GLITCH</h1>
      <p class="intro-line">${icon('hourglass', 'icon--sm')} 15 minutes on the clock. Pause any time.</p>
      <p class="intro-line">${icon('leaf', 'icon--sm')} Walk, don't run. Everything has a comfortable option.</p>`;
    actions = `<button class="btn btn--ghost-dark" data-action="intro-prev" aria-label="Back">${icon('back')}</button><button class="btn btn--acid" data-action="intro-next">Next ${icon('next', 'icon--sm')}</button>`;
  } else {
    if (mode === 'replay') {
      body = `<p class="eyebrow eyebrow--acid">Ready</p><h1 tabindex="-1">Back to the campus</h1><p class="intro-line">Your session is exactly where you left it.</p>`;
      actions = `<button class="btn btn--acid btn--block" data-action="intro-close">Return to game</button>`;
    } else {
      body = `<p class="eyebrow eyebrow--acid">Choose your crest</p><h1 tabindex="-1">Who's repairing?</h1>
        <label class="field intro-profile-field"><span class="label">Profile name</span><input class="input input--dark" id="intro-profile-name" maxlength="24" value="${esc(profile.fieldName || '')}" placeholder="What should we call you?"></label>
        <div class="avatar-grid">${AVATARS.map((a) => `<button type="button" class="avatar-pick${(profile.avatar || 'compass') === a.id ? ' on' : ''}" data-action="pick-avatar" data-avatar="${a.id}" aria-pressed="${(profile.avatar || 'compass') === a.id}">${crest(a.id, 50)}<small>${esc(a.name)}</small></button>`).join('')}</div>`;
      actions = `<button class="btn btn--ghost-dark" data-action="intro-prev" aria-label="Back">${icon('back')}</button><button class="btn btn--acid btn--xl" data-action="intro-begin">${icon('play')} Begin</button>`;
    }
  }
  const replayReady = mode === 'replay' && step === INTRO_LAST;
  return `<section class="intro${replayReady ? ' intro--replay-ready' : ''} screen-enter">${top}<div class="intro-body intro-body--step-${step} step-enter">${body}</div><div class="intro-actions">${actions}</div></section>`;
}

// ---------- Summary / victory ----------
export function summaryScreen({ state, profile, runXp, runBadges }) {
  const n = repairedCount(state);
  const victory = state.session.endReason === 'VICTORY';
  const pct = restorationPercent(state);
  const head = victory ? 'Campus restored' : n ? 'Campus steadier' : 'Still glitching';
  const sub = victory ? 'Every glitch repaired. FLAME is back in colour.' : state.session.endReason === 'TIMEOUT' ? 'Time ran out.' : 'Session finished.';
  const notes = MISSIONS.filter((mi) => state.missions[mi.id].note).map((mi) => `<li><b>${esc(mi.name)}</b> ${esc(state.missions[mi.id].note)}</li>`).join('');
  const badges = (runBadges || []).map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
  return `<section class="summary-screen${victory ? ' is-victory' : ''} screen-enter">
    <div class="summary-map" style="--restore:${pct / 100}" aria-hidden="true">${victory ? '<span class="victory-glow"></span>' : ''}</div>
    <div class="page-inner">
      <div class="summary-hero">
        ${victory ? `<span class="victory-seal">${icon('seal')}</span>` : ''}
        <p class="eyebrow eyebrow--acid">${esc(sub)}</p>
        <h1 tabindex="-1">${head}</h1>
      </div>
      <div class="stat-grid">
        <div class="stat"><b data-count="${pct}">${pct}%</b><small>restored</small></div>
        <div class="stat"><b>${n}/${MISSIONS.length}</b><small>repaired</small></div>
        <div class="stat"><b>${tokenCount(state)}/${MAX_TOKENS}</b><small>tokens</small></div>
        <div class="stat"><b data-count="${runXp}">+${runXp}</b><small>XP</small></div>
      </div>
      ${badges.length ? `<section class="panel"><h2 class="section-title">New badges</h2><div class="badges">${badges.map((b) => `<div class="badge-tile on"><span>${icon(b.icon)}</span><strong>${esc(b.name)}</strong><small>${esc(b.desc)}</small></div>`).join('')}</div></section>` : ''}
      ${notes ? `<details class="more more--dark" open><summary>${icon('quill', 'icon--sm')} Quest Journal notes</summary><ul>${notes}</ul></details>` : ''}
      <div class="btn-row btn-row--stack">
        <button class="btn btn--acid btn--xl btn--block" data-action="play-again">${icon('restart')} Play again</button>
        <button class="btn btn--ghost-dark btn--block" data-action="to-title">Title screen</button>
      </div>
      <p class="hint hint--center">Level ${levelOf(profile.xp)} · ${profile.xp} XP total. Saved on this device.</p>
    </div>
  </section>`;
}

// ---------- Location sheet ----------
export function locationSheet({ state, profile, destId, today }) {
  const dest = getDestination(destId);
  const mission = missionAtDestination(destId);
  const daily = dailyFor(today);
  const isDaily = !mission && daily.destinationId === destId;
  const running = state.session.status === SESSION.RUNNING;
  let body = '';
  if (mission) {
    const ds = displayState(state, mission.id);
    const m = state.missions[mission.id];
    if (ds === 'LOCKED') {
      body = `<div class="sheet-art sheet-art--locked">${icon('lock', 'icon--xl')}</div>
        <p class="eyebrow">${esc(mission.glitch)}</p><h2 id="sheet-title">${esc(mission.name)}</h2>
        <p class="sheet-line">Complete the previous challenge to unlock this.</p>`;
    } else {
      const steps = `<div class="sheet-steps">
        <span class="${m.physicalComplete ? 'on' : ''}">${icon(m.physicalComplete ? 'check' : 'steps', 'icon--sm')} ${esc(mission.physical.title)}</span>
        <span class="${m.digitalComplete ? 'on' : ''}">${icon(m.digitalComplete ? 'check' : 'bolt', 'icon--sm')} ${esc(mission.digital.title)}</span></div>`;
      const label = m.status === MISSION.REPAIRED ? 'View mission' : m.status === MISSION.ACTIVE && ds !== 'READY' ? 'Continue to map' : 'Open mission';
      const action = m.status === MISSION.ACTIVE && ds !== 'READY' ? 'close-sheet' : 'open-mission';
      const openMission = action === 'close-sheet'
        ? `<button class="link-btn link-btn--light sheet-open-mission" data-action="open-mission" data-id="${mission.id}">Open mission</button>` : '';
      body = `<div class="sheet-art${m.status === MISSION.REPAIRED ? ' is-fixed' : ''}">${glitchArt(mission.art, m.status === MISSION.REPAIRED)}</div>
        <p class="eyebrow eyebrow--acid">${esc(mission.glitch)} · ${STATE_LABEL[ds]}</p>
        <h2 id="sheet-title">${esc(mission.name)}</h2>
        <p class="sheet-line">${esc(mission.line)}</p>
        ${steps}
        <button class="btn btn--acid btn--xl btn--block" data-action="${action}" data-id="${mission.id}">${icon(m.status === MISSION.REPAIRED ? 'seal' : action === 'close-sheet' ? 'map' : 'next')} ${label}</button>${openMission}`;
    }
  } else if (destId === SQUAD_RALLY.destinationId && squadActive(profile)) {
    const open = repairedCount(state) >= SQUAD_RALLY.unlockAt || state.unlockAll;
    body = `<div class="sheet-art">${icon('sound', 'icon--xl')}</div>
      <p class="eyebrow eyebrow--acid">Squad Rally · Local</p><h2 id="sheet-title">${esc(dest.name)}</h2>
      <p class="sheet-line">${esc(SQUAD_RALLY.line)}</p>
      ${open ? `<button class="btn btn--acid btn--xl btn--block" data-action="open-rally">${icon('play')} Play</button>` : '<p class="sheet-line">Repair 1 glitch to unlock.</p>'}`;
  } else if (isDaily) {
    const d = daily;
    const done = dailyDone(profile, today);
    body = `<div class="sheet-art">${icon('star', 'icon--xl')}</div>
      <p class="eyebrow eyebrow--acid">Daily challenge</p><h2 id="sheet-title">${esc(d.title)}</h2>
      <p class="sheet-line">${esc(d.line)}</p>
      ${done ? `<p class="repaired-line daily-xp-earned">${icon('check')} +${XP.daily} XP earned today. Back tomorrow.</p>` : `<button class="btn btn--acid btn--xl btn--block" data-action="daily-done">${icon('check')} Done it · +${XP.daily} XP</button>`}`;
  } else {
    body = `<div class="sheet-art sheet-art--place">${icon('pin', 'icon--xl')}</div>
      <p class="eyebrow">${esc(dest.officialRef)}</p><h2 id="sheet-title">${esc(dest.name)}</h2>
      <p class="sheet-line">${esc(dest.blurb)}</p>`;
  }
  return `<div class="scrim" data-action="close-sheet"></div>
    <section class="sheet${isDaily ? ' sheet--daily' : ''}" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div class="sheet-grip" aria-hidden="true"></div>
      <button class="icon-btn sheet-close" data-action="close-sheet" aria-label="Close">${icon('close')}</button>
      <div class="sheet-body">${body}</div>
    </section>`;
}

// ---------- Modals ----------
export function modalHTML(modal, { state, now }) {
  const wrap = (inner, cls = '') => `<div class="scrim"></div><div class="modal-wrap"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="modal-title">${inner}</section></div>`;
  switch (modal.type) {
    case 'pause':
      return wrap(`<button class="icon-btn modal-close" data-action="close-modal" aria-label="Close pause dialog">${icon('close')}</button><p class="eyebrow eyebrow--acid">Paused</p><h2 id="modal-title">${formatClock(remainingMs(state, now))}</h2>
        <p>Time stands still. Take your time.</p>
        <div class="modal-actions">
          <button class="btn btn--acid btn--block" data-action="resume">${icon('play')} Resume</button>
          <button class="btn btn--ghost-dark btn--block" data-action="finish">${icon('flag')} Finish session</button>
        </div>`);
    case 'confirm':
      return wrap(`<button class="icon-btn modal-close" data-action="confirm-no" aria-label="Cancel">${icon('close')}</button><h2 id="modal-title">${esc(modal.title)}</h2><p>${esc(modal.body)}</p>
        <div class="modal-actions">
          <button class="btn ${modal.danger ? 'btn--danger' : 'btn--acid'} btn--block" data-action="confirm-yes">${esc(modal.yes)}</button>
          <button class="btn btn--ghost-dark btn--block" data-action="confirm-no">${esc(modal.no || 'Cancel')}</button>
        </div>`);
    case 'timeup':
      return wrap(`<span class="modal-icon">${icon('hourglass', 'icon--xl')}</span><h2 id="modal-title">Time's up</h2>
        <p>${repairedCount(state)} of 5 glitches repaired.</p>
        <div class="modal-actions"><button class="btn btn--acid btn--block" data-action="view-summary">See results</button></div>`);
    default:
      return '';
  }
}

export function repairBanner({ mission, unlocked, tokens, xp }) {
  return `<div class="repair-banner dismissible-notice" role="status">
    <span class="rb-seal">${icon('seal', 'icon--sm')}</span>
    <strong>${esc(mission.name)} repaired</strong>
    <small>+${TOKENS_PER_REPAIR} tokens · +${xp} XP${unlocked.length ? ` · ${unlocked.map((u) => esc(getDestination(getMission(u).destinationId).label)).join(', ')} open` : ''}</small>
    <button class="notice-close" data-action="banner-close" aria-label="Dismiss repair status">×</button>
  </div>`;
}
