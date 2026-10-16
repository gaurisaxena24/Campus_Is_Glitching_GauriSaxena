// In-game pages (between the HUD and the tab bar). Each is (ctx) => HTML.
// Copy is deliberately short; optional detail lives in <details> panels.

import { MISSIONS, getMission, SQUAD_RALLY, MAX_REFLECTION } from '../data/missions.js';
import { getDestination } from '../data/destinations.js';
import {
  displayState, isUnlocked, repairedCount, hasReflection, tokenCount, remainingMs, formatClock, restorationPercent, readyToRepair,
  MISSION, SESSION, MAX_TOKENS, TOKENS_PER_REPAIR, episodeResult,
} from '../game/state.js';
import {
  levelOf, levelProgress, XP_PER_LEVEL, BADGES, GAME_RECORDS, completedGlitchCount, AVATARS, TEAMMATES, SQUAD_COLOURS, streak, dailyFor, dailyDone, squadActive, XP,
} from '../game/profile.js';
import { esc, icon } from './dom.js';
import { STATE_LABEL, STATE_ICON } from './pins.js';
import { glitchArt, crest, teammate } from './art.js';
import { audioSupported } from './audio.js';
import { walkIntroHTML, walkPanelHTML } from './walk-view.js';
import { TRACK } from '../game/tracking.js';
import { COLOUR_TARGETS } from '../game/colour.js';
import { EPISODES, TURNS } from '../game/conversation.js';

const back = (label = 'Back') => `<button class="back-btn" data-action="back">${icon('back')}<span>${esc(label)}</span></button>`;
const ring = (pct, inner, cls = '') => `<span class="ring ${cls}" style="--p:${Math.round(pct * 100)}"><b>${inner}</b></span>`;
const localChip = '<span class="local-chip" title="Local play on this device. Nothing is shared or synced.">' + icon('squad', 'icon--xs') + 'Local</span>';

function multiplayerPanel(ctx) {
  const room = ctx.multiplayerRoom;
  if (!room) return `<section class="panel multiplayer-panel">
    <div class="multiplayer-heading"><div><p class="eyebrow eyebrow--acid">Live co-op</p><h2>Bring a friend</h2></div>${icon('squad', 'icon--lg')}</div>
    <p class="hint">Create a two-player room or join with your friend’s code.</p>
    <div class="multiplayer-actions"><label class="field"><span class="label">Your call sign</span><input class="input input--dark" data-room-name maxlength="24" value="${esc(ctx.multiplayerDraftName ?? ctx.profile.fieldName ?? '')}" placeholder="Name your friend will recognise"></label><button class="btn btn--acid" data-action="room-create">Create room</button><label class="field"><span class="label">Room code</span><input class="input input--dark" data-room-code maxlength="6" value="${esc(ctx.multiplayerInviteCode || '')}" autocapitalize="characters" placeholder="6-character code"></label><button class="btn btn--ghost-dark" data-action="room-join">Join room</button></div>
    ${ctx.multiplayerError ? `<p class="error" role="alert">${esc(ctx.multiplayerError)}</p>` : ''}
    <small>Your quests and XP stay saved on your device; room activity syncs live.</small>
  </section>`;
  const players = room.players || [];
  const others = players.map((p) => {
    const contributions = Object.values(p.activities || {}).reduce((total, activity) => total + Object.values(activity).filter(Boolean).length, 0);
    return `<div class="multiplayer-player"><span class="multiplayer-avatar">${icon('user')}</span><div><strong>${esc(p.name)}${p.id === ctx.multiplayerPlayerId ? ' · You' : ''}</strong><small>Lv ${p.level} · ${p.xp} XP · ${contributions} contributions · ${p.ready ? 'Ready' : 'Not ready'}</small></div><i class="presence-dot${Date.now() - p.lastSeen < 12_000 ? ' is-online' : ''}" title="${Date.now() - p.lastSeen < 12_000 ? 'Online' : 'Offline'}"></i></div>`;
  }).join('');
  const activityLabels = [['frozen-character','Frozen Character'],['lost-colour','Lost Colour'],['missing-connection','Lost Connection']];
  const tasks = activityLabels.map(([id, name]) => {
    const status = room.activities?.[id] || {};
    const contributors = players.map((p) => `<span>${esc(p.name)} ${p.activities?.[id]?.physical ? 'P✓' : 'P○'} ${p.activities?.[id]?.digital ? 'D✓' : 'D○'} ${p.activities?.[id]?.repaired ? 'Fix✓' : 'Fix○'}</span>`).join('');
    return `<div class="multiplayer-task"><strong>${name}</strong><span>${status.physical ? '✓' : '○'} Physical</span><span>${status.digital ? '✓' : '○'} Digital</span><span>${status.repaired ? '✓' : '○'} Team fix</span><div class="multiplayer-contributors">${contributors}</div></div>`;
  }).join('');
  const games = [['sequence','Colour Click + Pattern'],['episode','Missing-Word Conversation']];
  const scoreRows = games.map(([key, title]) => {
    const bestRuns = players.map((p) => ({ player: p, run: [...(p.scores?.[key]?.runs || [])].sort((a, b) => b.score - a.score)[0] }));
    const bothPlayed = bestRuns.length === 2 && bestRuns.every((entry) => entry.run);
    const highScore = bothPlayed ? Math.max(...bestRuns.map((entry) => entry.run.score)) : null;
    const leader = highScore == null ? '' : bestRuns.filter((entry) => entry.run.score === highScore).map((entry) => entry.player.name).join(' + ');
    return `<div class="multiplayer-score"><strong>${title}</strong><div class="multiplayer-score-players">${bestRuns.map(({ player: p, run: bestRun }) => {
    const time = bestRun?.elapsedMs == null ? '' : ` · ${(bestRun.elapsedMs / 1000).toFixed(1)}s`;
    return `<span>${esc(p.name)} ${bestRun ? `${bestRun.score} pts · ${bestRun.accuracy}%${time}` : '—'}</span>`;
    }).join('')}${leader ? `<small class="multiplayer-leader">${esc(leader)} ${bestRuns.filter((entry) => entry.run.score === highScore).length > 1 ? 'tied' : 'leads'}</small>` : '<small>Play a run to start the room duel</small>'}</div></div>`;
  }).join('');
  return `<section class="panel multiplayer-panel multiplayer-panel--room">
    <div class="multiplayer-heading"><div><p class="eyebrow eyebrow--acid">Live room · ${esc(room.code)}</p><h2>Two-player link</h2></div><button class="btn btn--ghost-dark btn--sm" data-action="room-copy">Copy code</button></div>
    <div class="multiplayer-players">${others}${players.length < 2 ? '<div class="multiplayer-player multiplayer-waiting"><span class="multiplayer-avatar">+</span><div><strong>Waiting for friend</strong><small>Share the room code above</small></div></div>' : ''}</div>
    <div class="multiplayer-actions"><button class="btn btn--acid" data-action="room-ready" data-ready="${players.find((p) => p.id === ctx.multiplayerPlayerId)?.ready ? 'false' : 'true'}">${players.find((p) => p.id === ctx.multiplayerPlayerId)?.ready ? 'Ready ✓' : 'I’m ready'}</button><span class="multiplayer-reconnect">Room reconnects automatically if you go offline.</span></div>
    <h3 class="section-title">Campus team progress</h3><div class="multiplayer-tasks">${tasks}</div>
    <h3 class="section-title">Room bests</h3><div class="multiplayer-scores">${scoreRows}</div>
    <small>Activity reports are tied to your room token. Physical tasks are self-confirmed.</small>
    ${ctx.multiplayerError ? `<p class="error" role="alert">${esc(ctx.multiplayerError)}</p>` : ''}
  </section>`;
}

function stepCard(kind, m, mission, squad, enabled) {
  const done = kind === 'physical' ? m.physicalComplete : m.digitalComplete;
  const part = mission[kind];
  const title = part.title;
  const line = squad ? part.squad : part.line;
  const replayable = kind === 'digital' && done && enabled;
  return `<button class="step-card step-card--${kind}${done ? ' done' : ''}" data-action="${kind === 'physical' ? 'open-physical' : 'open-digital'}" data-id="${mission.id}" ${enabled && (!done || replayable) ? '' : 'aria-disabled="true"'}>
    <span class="step-tag">${kind === 'physical' ? 'Physical' : 'Digital'}</span>
    <span class="step-icon">${icon(done ? 'check' : kind === 'physical' ? 'steps' : 'bolt')}</span>
    <strong>${esc(title)}</strong>
    <small>${esc(line)}</small>
    <span class="step-cta">${done ? (replayable ? 'Replay' : 'Done') : enabled ? (kind === 'physical' ? 'Start' : 'Play') : 'Locked'}</span>
    ${done && kind === 'physical' ? `<span class="step-method">${esc(methodLabel(m))}</span>` : ''}
  </button>`;
}

// How a physical part was completed. Self-reported is never shown as GPS.
export function methodLabel(m) {
  if (m.physicalMethod === 'steps') return `Tracked walk · ${m.walk.steps} estimated steps`;
  if (m.physicalMethod === 'gps') return `GPS-verified walk · ${Math.round(m.walk.distanceM)} m`;
  if (m.physicalMethod === 'simulator') return 'Dev simulator (not real GPS)';
  return 'Self-reported';
}

const journalButton = (id, saved) => `<button class="btn btn--ghost-dark btn--block" data-action="open-reflect" data-id="${id}">${icon('quill')} ${saved ? 'Quest Journal: read or edit' : 'Quest Journal: reflect'}</button>`;

// ---------- Mission ----------
export function missionPage(ctx, id) {
  const { state, profile, ui } = ctx;
  const mission = getMission(id);
  const m = state.missions[id];
  const ds = displayState(state, id);
  const dest = getDestination(mission.destinationId);
  const running = state.session.status === SESSION.RUNNING;
  const squad = squadActive(profile);
  const ready = readyToRepair(m);
  const repaired = m.status === MISSION.REPAIRED;
  const started = m.status !== MISSION.UNDISCOVERED;

  let cta = '';
  if (repaired) {
    cta = `<p class="repaired-line">${icon('seal')} Repaired. +${TOKENS_PER_REPAIR} tokens earned.</p>`;
  } else if (!started) {
    cta = `<button class="btn btn--acid btn--start-challenge btn--xl btn--block" data-action="activate" data-id="${id}" ${running ? '' : 'aria-disabled="true"'}>${icon('play')} Start Challenge</button>`;
  } else {
    cta = `<button class="btn btn--repair btn--xl btn--block${ready ? ' is-ready' : ''}" data-action="repair" data-id="${id}" aria-disabled="${ready ? 'false' : 'true'}">${icon('wrench')} Repair glitch</button>
      <p class="repair-hint">${ready ? 'Both parts done. Repair it!' : 'Complete both parts to repair.'}</p>`;
  }

  return `<div class="page-inner page-inner--mission">
    <div class="mission-top">${back(ui.from === 'quests' ? 'Quests' : 'Map')}${squad ? localChip : ''}</div>
    <div class="mission-hero${repaired ? ' is-repaired' : ''}${ui.repairing === id ? ' is-repairing' : ''}" data-mission-hero>
      ${glitchArt(mission.art, repaired)}
      <span class="hero-scan" aria-hidden="true"></span>
    </div>
    <div class="mission-head">
      <p class="eyebrow eyebrow--acid">${esc(mission.glitch)} · ${esc(dest.label)}</p>
      <h1 tabindex="-1">${esc(mission.name)}</h1>
      <p class="mission-line">${esc(mission.line)}</p>
    </div>
    <div class="steps">
      ${stepCard('physical', m, mission, squad, started && running)}
      ${stepCard('digital', m, mission, squad, started && running)}
    </div>
    ${cta}
    ${started ? journalButton(id, hasReflection(state, id)) : ''}
    <details class="more">
      <summary>${icon('info', 'icon--sm')} How it works</summary>
      <ul>
        <li>Finish both parts, in any order, then tap Repair.</li>
        <li>Reward: ${TOKENS_PER_REPAIR} repair tokens and ${XP.repair} XP, once.</li>
        <li><strong>Comfortable option:</strong> ${esc(mission.physical.alt)}</li>
        <li>${mission.physical.kind === 'walk' ? 'This walk can use your phone\'s motion sensor (estimated steps) and GPS, only if you allow them and only while the game is open. Otherwise it is self-reported.' : 'This physical part is self-reported. Nothing tracks you.'}</li>
      </ul>
    </details>
  </div>`;
}

// ---------- Physical challenge ----------
export function physicalPage(ctx, id) {
  const { state, profile, now } = ctx;
  const mission = getMission(id);
  const m = state.missions[id];
  const p = mission.physical;
  const draft = state.drafts[id] || {};
  const squad = squadActive(profile);
  let body = '';
  const selfTimer = p.kind === 'timer' || (p.kind === 'walk' && (ctx.ui.walkSelf === id || draft.timerStartedAt));
  if (m.physicalComplete) {
    body = `<p class="repaired-line">${icon('check')} Done. ${esc(methodLabel(m))}.</p>`;
  } else if (p.kind === 'walk' && !selfTimer) {
    const w = ctx.walk;
    body = w.track.status === TRACK.IDLE && !w.error
      ? walkIntroHTML(id, { permission: w.permission, simulator: ctx.simulator, stepTarget: p.stepTarget })
      : walkPanelHTML(id, ctx.walkModel, { simulator: ctx.simulator, simMode: ctx.simMode });
  } else if (selfTimer) {
    const started = draft.timerStartedAt;
    const left = started ? Math.max(0, p.seconds * 1000 - (now - started)) : p.seconds * 1000;
    const pct = started ? 1 - left / (p.seconds * 1000) : 0;
    body = `<div class="timer-ring" data-phys-timer data-seconds="${p.seconds}" data-started="${started || ''}">
        ${ring(pct, `<span data-phys-clock>${formatClock(left)}</span><small>${started ? (left ? 'Go' : 'Done') : 'Ready'}</small>`, 'ring--xl')}
      </div>
      ${started
        ? `<button class="btn btn--acid btn--xl btn--block" data-action="complete-physical" data-id="${id}" data-phys-done ${left ? 'aria-disabled="true"' : ''}>${icon('check')} I did it</button>
           <button class="link-btn link-btn--light" data-action="complete-physical" data-id="${id}" data-early="1">Stopped early? That still counts.</button>`
        : `<button class="btn btn--acid btn--xl btn--block" data-action="phys-start" data-id="${id}">${icon('play')} Start ${formatClock(p.seconds * 1000)}</button>`}
      ${p.kind === 'walk' ? `<p class="self-tag">${icon('info', 'icon--sm')} Self-reported walk: not GPS-verified.</p>
        ${draft.timerStartedAt ? '' : `<button class="link-btn link-btn--light" data-action="walk-gps" data-id="${id}">Use GPS tracking instead</button>`}` : ''}`;
  } else if (p.kind === 'consent') {
    body = `<div class="phys-art">${glitchArt('bubbles')}</div>
      <label class="check check--dark"><input type="checkbox" data-consent="${id}" ${draft.consent ? 'checked' : ''}><span>${esc(p.consent)}</span></label>
      <button class="btn btn--acid btn--xl btn--block" data-action="complete-physical" data-id="${id}" ${draft.consent ? '' : 'aria-disabled="true"'}>${icon('check')} I had the conversation</button>`;
  } else if (p.kind === 'counter') {
    const n = draft.counted || 0;
    const colours = ['#c0583a', '#e0a83a', '#6f9a3c', '#5fa8c8', '#8a5a9e'];
    body = `<div class="spot-slots" aria-label="${n} of ${p.count} colours spotted">${colours.map((c, i) => `<span class="spot-slot${i < n ? ' on' : ''}" style="--c:${c}"></span>`).join('')}</div>
      ${n < p.count
        ? `<button class="btn btn--acid btn--xl btn--block" data-action="phys-count" data-id="${id}">${icon('plus')} I spotted a colour (${n}/${p.count})</button>`
        : `<button class="btn btn--acid btn--xl btn--block" data-action="complete-physical" data-id="${id}">${icon('check')} All five found</button>`}`;
  }
  return `<div class="page-inner page-inner--phys">
    <div class="mission-top">${back(mission.name)}${squad ? localChip : ''}</div>
    <div class="phys-head${p.kind === 'walk' ? ' phys-head--walk' : ''}"><span class="step-tag">Physical</span><h1 tabindex="-1">${esc(p.title)}</h1><p>${p.kind === 'walk' ? 'Take a relaxed 2-minute walk and notice one small detail.' : esc(squad ? p.squad : p.line)}</p></div>
    ${body}
    <p class="safety">${icon('leaf', 'icon--sm')} Walk, don't run. ${esc(p.alt)}</p>
  </div>`;
}

// ---------- Minigame host ----------
export function gamePage(ctx, id) {
  const mission = getMission(id);
  return `<div class="page-inner page-inner--game">
    <div class="mission-top">${back(mission.name)}${squadActive(ctx.profile) ? localChip : ''}</div>
    <h1 class="sr-only" tabindex="-1">${esc(mission.digital.title)}</h1>
    <div class="game-host" data-game-host="${mission.digital.game}" data-id="${id}"></div>
  </div>`;
}

export function rallyPage(ctx) {
  return `<div class="page-inner page-inner--game">
    <div class="mission-top">${back('Squad')}${localChip}</div>
    <h1 class="sr-only" tabindex="-1">Squad Rally</h1>
    <div class="game-host" data-game-host="rally" data-id="${SQUAD_RALLY.id}"></div>
  </div>`;
}

// ---------- Field journal (reflection) ----------
export function reflectPage(ctx, id) {
  const { state } = ctx;
  const mission = getMission(id);
  const saved = state.reflections[id];
  const answers = saved ? saved.answers : [];
  const when = saved ? new Date(saved.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
  return `<div class="page-inner page-inner--journal">
    <div class="mission-top">${back(mission.name)}</div>
    <div class="journal-head"><span class="journal-icon">${icon('quill', 'icon--lg')}</span>
      <div><p class="eyebrow eyebrow--acid">Quest Journal · ${esc(mission.name)}</p><h1 tabindex="-1">Reflect</h1></div></div>
    <form class="journal" data-reflect-form="${id}">
      ${mission.reflect.map((q, i) => `<label class="field journal-q"><span class="label">${esc(q)} <small>(optional)</small></span>
        <textarea class="textarea" name="a${i}" maxlength="${MAX_REFLECTION}" rows="3">${esc(answers[i] || '')}</textarea></label>`).join('')}
      <p class="hint">Saved in this browser only, with this session. Don't include anyone's private details.</p>
      ${saved ? `<p class="hint" data-journal-saved>Last saved ${esc(when)}</p>` : ''}
      <button class="btn btn--acid btn--xl btn--block" type="submit">${icon('check')} Save to journal</button>
      <button type="button" class="link-btn link-btn--light" data-action="reflect-skip" data-id="${id}">${saved ? 'Back without changes' : 'Skip for now'}</button>
    </form>
  </div>`;
}

function journalList(state) {
  const entries = MISSIONS.filter((mi) => state.missions[mi.id].status !== MISSION.UNDISCOVERED);
  if (!entries.length) return '<p class="hint">Accept a challenge to start your Quest Journal.</p>';
  return `<div class="journal-list">${entries.map((mi) => {
    const r = state.reflections[mi.id];
    const first = r ? r.answers.find((a) => a) : '';
    return `<button class="journal-row" data-action="open-reflect" data-id="${mi.id}">
      <span>${icon(hasReflection(state, mi.id) ? 'quill' : 'scroll')}</span>
      <span><strong>${esc(mi.name)}</strong><small>${first ? esc(first.length > 70 ? `${first.slice(0, 70)}…` : first) : r ? 'Skipped questions' : 'Not written yet'}</small></span>
      ${icon('next', 'icon--sm')}</button>`;
  }).join('')}</div>`;
}

function questJournalPage(state) {
  const written = MISSIONS.filter((mi) => hasReflection(state, mi.id)).length;
  return `<div class="page-inner">
    <div class="page-head"><p class="eyebrow eyebrow--acid">Your reflections</p><h1 tabindex="-1">Quest Journal</h1></div>
    ${questViewTabs('journal')}
    <p class="hint">Your reflections from campus challenges. Tap any entry to read or edit it.</p>
    <section class="panel"><h2 class="section-title">Entries <span>${written}</span></h2>${journalList(state)}</section>
    ${fieldFinds(state)}
  </div>`;
}

function questViewTabs(view) {
  return `<div class="segmented quest-view-tabs" role="radiogroup" aria-label="Quest pages">
    <button role="radio" aria-checked="${view !== 'journal'}" data-action="quest-view" data-view="quests">Quests</button>
    <button role="radio" aria-checked="${view === 'journal'}" data-action="quest-view" data-view="journal">${icon('quill', 'icon--sm')} Quest Journal</button>
  </div>`;
}

// ---------- Quests ----------
export function questsPage(ctx) {
  const { state, ui } = ctx;
  if (ui.questView === 'journal') return questJournalPage(state);
  const n = repairedCount(state);
  const cards = MISSIONS.map((mi) => {
    const ds = displayState(state, mi.id);
    const m = state.missions[mi.id];
    const dest = getDestination(mi.destinationId);
    const locked = ds === 'LOCKED';
    const selected = ui.selectedMissionId === mi.id;
    const sub = locked ? 'Complete the previous challenge to unlock' : `${dest.label} · ${STATE_LABEL[ds]}`;
    const parts = m.status === MISSION.ACTIVE ? `<span class="mini-steps"><i class="${m.physicalComplete ? 'on' : ''}"></i><i class="${m.digitalComplete ? 'on' : ''}"></i></span>` : '';
    return `<div class="quest-entry${selected ? ' is-tracked' : ''}" data-id="${mi.id}"><button class="quest-row quest-row--${ds}" data-glitch-art="${mi.art}" data-action="${locked ? 'locked' : 'open-mission'}" data-id="${mi.id}" aria-pressed="${selected}" ${locked ? 'aria-disabled="true"' : ''}>
      <span class="quest-art quest-art--${mi.art}">${locked ? icon('lock', 'icon--lg') : glitchArt(mi.art, ds === 'REPAIRED')}</span>
      <span class="quest-text"><small>${esc(mi.glitch)}</small><strong>${esc(mi.name)}</strong><em>${esc(sub)}</em>${parts}</span>
      <span class="quest-state">${icon(STATE_ICON[ds])}</span>
    </button><button class="quest-locate" data-action="locate-mission" data-id="${mi.id}" aria-label="Locate ${esc(mi.name)} at ${esc(dest.label)} on map" title="Locate on map">${icon('map')}<span>Locate</span></button></div>`;
  }).join('');
  return `<div class="page-inner">
    <div class="page-head page-head--row"><div><p class="eyebrow eyebrow--acid">Quests</p><h1 tabindex="-1">Glitches</h1></div>${ring(n / MISSIONS.length, `${n}/${MISSIONS.length}`, 'ring--md')}</div>
    ${questViewTabs('quests')}
    <div class="quest-list">${cards}</div>
  </div>`;
}

// ---------- Rewards (Inventory) ----------
export function inventoryPage(ctx) {
  const { state, profile, ui, today } = ctx;
  const lvl = levelOf(profile.xp);
  const tokens = tokenCount(state);
  const fresh = ui.newTokens || 0;
  const st = streak(profile, today);
  const daily = dailyFor(today);
  const done = dailyDone(profile, today);
  const gameRecords = Object.entries(GAME_RECORDS).map(([game, meta]) => {
    const record = profile.gameRecords[game];
    const best = record ? record.best : null;
    const last = record && record.runs.length ? record.runs[record.runs.length - 1] : null;
    return `<article class="local-record"><div><strong>${esc(meta.title)}</strong><small>${last == null ? 'No run saved yet' : `Last ${last} · Personal best ${best}`}</small></div><span class="local-record-score">${best == null ? '—' : best}</span><small class="local-record-challenge">${best == null ? 'Set your first record' : `Next run · beat ${best}`}</small></article>`;
  }).join('');
  const slots = Array.from({ length: MAX_TOKENS }, (_, i) => {
    const filled = i < tokens;
    const isNew = filled && i >= tokens - fresh;
    return `<span class="token${filled ? ' on' : ''}${isNew ? ' new' : ''}" style="${isNew ? `animation-delay:${(i - (tokens - fresh)) * 150}ms` : ''}">${icon('token')}</span>`;
  }).join('');
  return `<div class="page-inner page-inner--inventory">
    <div class="page-head"><p class="eyebrow eyebrow--acid">Inventory</p><h1 tabindex="-1">Rewards</h1></div>
    <div class="xp-card">
      ${ring(levelProgress(profile.xp), `Lv ${lvl}`, 'ring--lg ring--acid')}
      <div><strong class="xp-num">${profile.xp} XP</strong><small>${XP_PER_LEVEL - (profile.xp % XP_PER_LEVEL)} XP to level ${lvl + 1}</small><span class="xp-level-track" role="img" aria-label="${Math.round(levelProgress(profile.xp) * 100)} percent to level ${lvl + 1}"><i style="width:${levelProgress(profile.xp) * 100}%"></i></span></div>
      <div class="streak${st ? ' on' : ''}" title="Days in a row you've played on this device">${icon('flame')}<b>${st}</b><small>day streak</small></div>
    </div>
    <section class="panel local-scoreboard">
      <h2 class="section-title">Personal leaderboard <span>LOCAL</span></h2>
      <div class="local-score-stats"><div><strong>${profile.xp}</strong><small>Total XP</small></div><div><strong>${completedGlitchCount(profile)}</strong><small>Glitches repaired</small></div></div>
      <p class="hint">You vs your saved runs · Set a score, then beat it.</p>
      <div class="local-record-list">${gameRecords}</div>
    </section>
    <section class="panel">
      <h2 class="section-title">Repair tokens <span>${tokens}/${MAX_TOKENS}</span></h2>
      <div class="tokens" aria-label="${tokens} of ${MAX_TOKENS} repair tokens">${slots}</div>
      <p class="hint">${TOKENS_PER_REPAIR} per repair, once. In-game only.</p>
    </section>
    <section class="panel daily${done ? ' is-done' : ''}">
      <h2 class="section-title">${icon('star', 'icon--sm')} Daily challenge</h2>
      <div class="daily-row"><div><strong>${esc(daily.title)}</strong><small>${esc(daily.line)}</small></div>
      ${done ? `<span class="done-badge daily-xp-earned">${icon('check')} +${XP.daily} XP earned</span>` : `<button class="btn btn--acid" data-action="daily-done">Claim +${XP.daily} XP</button>`}</div>
    </section>
    <section class="panel">
      <h2 class="section-title">Badges <span>${Object.keys(profile.badges).length}/${BADGES.length}</span></h2>
      <div class="badges">${BADGES.map((b) => `<div class="badge-tile${profile.badges[b.id] ? ' on' : ''}" title="${esc(b.desc)}"><span>${icon(profile.badges[b.id] ? b.icon : 'lock')}</span><div class="badge-tile-copy"><strong>${esc(b.name)}</strong><small>${esc(b.desc)}</small></div></div>`).join('')}</div>
    </section>
  </div>`;
}

// What the device-feature missions have collected this session: photographed
// colours, pattern rounds, conversation episodes. Read straight from game state.
function fieldFinds(state) {
  const rows = [];
  for (const mission of MISSIONS) {
    const id = mission.id;
    const hunt = state.hunts && state.hunts[id];
    if (hunt) {
      const target = COLOUR_TARGETS.find((c) => c.id === hunt.target);
      const name = target ? target.name : hunt.target;
      const swatches = Array.from({ length: mission.physical.count }, (_, i) => {
        const it = hunt.items[i];
        return it
          ? `<span class="hunt-slot on find-swatch" style="--c:${it.hex}" role="listitem" aria-label="${esc(name)} object ${i + 1}"></span>`
          : `<span class="hunt-slot find-swatch" role="listitem" aria-label="Empty slot ${i + 1}"></span>`;
      }).join('');
      rows.push(`<div class="find-row"><div><strong>${esc(name)} objects</strong><small>${hunt.items.length} of ${mission.physical.count} photographed (${esc(mission.name)})</small></div>
        <div class="find-swatches" role="list">${swatches}</div></div>`);
    }
    const puzzle = state.puzzles && state.puzzles[id];
    if (puzzle) {
      const solved = puzzle.solved.filter(Boolean).length;
      rows.push(`<div class="find-row"><div><strong>Pattern rounds</strong><small>${solved} of ${puzzle.solved.length} restored (${esc(mission.name)})</small></div>
        <span class="find-count">${solved}/${puzzle.solved.length}</span></div>`);
    }
    const ep = state.episodes && state.episodes[id];
    if (ep) {
      const meta = EPISODES.find((e) => e.id === ep.episodeId);
      const ev = episodeResult(state, id);
      rows.push(`<div class="find-row"><div><strong>${esc(meta ? meta.title : 'Episode')}</strong><small>${ev ? `${esc(ev.rank.title)} with ${esc(meta.character.name)}` : `${ep.messages.length} of ${TURNS} messages sent`}</small></div>
        <span class="find-count">${ev ? icon('star', 'icon--sm') : `${ep.messages.length}/${TURNS}`}</span></div>`);
    }
  }
  if (!rows.length) return '';
  return `<section class="panel field-finds"><h2 class="section-title">${icon('quill', 'icon--sm')} Quest records</h2>${rows.join('')}</section>`;
}

// ---------- Squad ----------
export function squadPage(ctx) {
  const { profile, ui } = ctx;
  const sq = profile.squad;
  const editing = ui.squadEdit || !sq.name;
  if (editing) {
    const draft = ui.squadDraft || { name: sq.name, colour: sq.colour, emails: [...(sq.emails || [])] };
    return `<div class="page-inner">
      <div class="squad-hero">
        <span class="squad-hero-art">${TEAMMATES.slice(0, 3).map((t) => teammate(t, 58)).join('')}</span>
        <p class="eyebrow eyebrow--acid">Squad Mode ${localChip}</p>
        <h1 tabindex="-1">${sq.name ? 'Edit your squad' : 'Form a squad'}</h1>
        <p>Invite your players by email. Meet up and complete campus tasks together.</p>
      </div>
      <form class="panel squad-form" data-squad-form>
        <label class="field"><span class="label">Squad name</span><input class="input input--dark" name="name" maxlength="24" value="${esc(draft.name)}" placeholder="e.g. Night Owls"></label>
        <div class="field"><span class="label">Colour</span><div class="swatch-row">${SQUAD_COLOURS.map((c) => `<button type="button" class="colour-dot${draft.colour === c ? ' on' : ''}" data-squad-colour="${c}" style="--c:${c}" aria-label="Colour ${c}" aria-pressed="${draft.colour === c}"></button>`).join('')}</div></div>
        <label class="field"><span class="label">Players <small>(email addresses, separated by commas)</small></span><textarea class="input input--dark" name="emails" rows="3" placeholder="alex@example.com, sam@example.com">${esc((draft.emails || []).join(', '))}</textarea><small>Gmail, Hotmail, school, and organization addresses are all welcome.</small></label>
        <p class="error" data-squad-error role="alert"></p>
        <div class="btn-row${sq.name ? '' : ' btn-row--stack'}">${sq.name ? '<button type="button" class="btn btn--ghost-dark" data-action="squad-cancel">Cancel</button>' : ''}<button type="submit" class="btn btn--acid">${icon('squad')} ${sq.name ? 'Save squad' : 'Create squad'}</button></div>
      </form>
      ${multiplayerPanel(ctx)}
      <p class="hint hint--center">${ctx.multiplayerRoom ? 'Room activity syncs live; personal quest saves stay on this device.' : 'Email invitations are for meeting up; live cross-device play uses a room code below.'}</p>
    </div>`;
  }
  const active = squadActive(profile);
  const addresses = sq.emails || [];
  const tasks = MISSIONS.map((m) => `<div class="rally-row"><span class="rally-icon">${icon('steps', 'icon--lg')}</span><div><strong>${esc(m.name)}</strong><small>${esc(m.physical.squad || m.physical.line)}</small></div></div>`).join('');
  return `<div class="page-inner">
    <div class="squad-banner" style="--c:${sq.colour}">
      <span class="squad-crest">${icon('squad', 'icon--lg')}</span>
      <div><p class="eyebrow">Squad ${localChip}</p><h1 tabindex="-1">${esc(sq.name)}</h1><small>${addresses.length} invited player${addresses.length === 1 ? '' : 's'}</small></div>
    </div>
    ${multiplayerPanel(ctx)}
    <div class="segmented" role="radiogroup" aria-label="Play mode">
      <button role="radio" aria-checked="${!active}" data-action="mode" data-mode="solo">${icon('user')} Solo</button>
      <button role="radio" aria-checked="${active}" data-action="mode" data-mode="squad">${icon('squad')} Squad</button>
    </div>
    ${addresses.length ? `<div class="mates-row">${addresses.map((email) => `<div class="mate"><strong>${esc(email)}</strong><small>Invited player</small></div>`).join('')}</div>` : '<p class="hint hint--center">No players invited yet.</p>'}
    <section class="panel rally-card">
      <h2 class="section-title">Team tasks</h2>
      <p class="hint">Choose a task to do together in person.</p>
      <div class="team-task-list">${tasks}</div>
    </section>
    <section class="panel squad-players"><h2 class="section-title">Invite players</h2><button class="btn btn--acid btn--block" data-action="invite-team">${icon('squad')} Send team email</button></section>
    <div class="btn-row"><button class="btn btn--ghost-dark" data-action="squad-edit">${icon('gear')} Edit</button><button class="btn btn--ghost-dark" data-action="squad-disband">Disband</button></div>
  </div>`;
}

// ---------- Status (session, profile, settings) ----------
export function statusPage(ctx) {
  const { state, settings, profile, storageAvailable, now } = ctx;
  const s = state.session;
  const pct = restorationPercent(state);
  const sw = (key, label, disabled = false) => `<div class="switch-row"><span class="label" id="lbl-${key}">${label}</span>
    <button class="switch" role="switch" aria-checked="${Boolean(settings[key])}" aria-labelledby="lbl-${key}" data-action="toggle-setting" data-key="${key}" ${disabled ? 'disabled' : ''}></button></div>`;
  return `<div class="page-inner">
    <div class="page-head"><p class="eyebrow eyebrow--acid">Status</p><h1 tabindex="-1">Session</h1></div>
    <div class="session-card">
      <div class="session-clock"><span data-live-clock>${formatClock(remainingMs(state, now))}</span><small data-live-state>${{ RUNNING: 'Running', PAUSED: 'Paused', NOT_STARTED: 'Not started', ENDED: 'Ended' }[s.status]}</small></div>
      ${ring(pct / 100, `${pct}%`, 'ring--md ring--acid')}
      <div class="btn-row">
        ${s.status === SESSION.RUNNING ? `<button class="btn btn--ghost-dark" data-action="pause">${icon('pause')} Pause</button>` : `<button class="btn btn--ghost-dark" data-action="resume" ${s.status !== SESSION.PAUSED ? 'disabled' : ''}>${icon('play')} Resume</button>`}
        <button class="btn btn--ghost-dark" data-action="finish">${icon('flag')} Finish</button>
      </div>
    </div>
    <section class="panel profile-row">
      ${crest(profile.avatar || 'compass', 52)}
      <div><strong>${esc(profile.fieldName || 'Repairer')}</strong><small>Level ${levelOf(profile.xp)} · ${profile.xp} XP</small></div>
      <button class="btn btn--ghost-dark btn--sm" data-action="edit-profile">${icon('user', 'icon--sm')} Change</button>
    </section>
    ${ctx.ui.profileEdit ? profileEditor(profile) : ''}
    <section class="panel settings" aria-label="Settings">
      <h2 class="section-title">${icon('gear', 'icon--sm')} Settings</h2>
      ${sw('sound', 'Sound effects', !audioSupported())}
      ${sw('reduceMotion', 'Reduce motion')}
      ${sw('largeText', 'Larger text')}
      <div class="switch-row"><span class="label" id="lbl-unlock">Unlock all places <small>(accessibility)</small></span><button class="switch" role="switch" aria-checked="${state.unlockAll}" aria-labelledby="lbl-unlock" data-action="toggle-unlock"></button></div>
      <div class="btn-row btn-row--stack">
        <button class="btn btn--ghost-dark" data-action="replay-tutorial">${icon('scroll')} How to play</button>
        <button class="btn btn--danger" data-action="reset-progress">${icon('restart')} Reset progress</button>
      </div>
    </section>
    <details class="more more--dark">
      <summary>${icon('info', 'icon--sm')} Privacy and data</summary>
      <ul>
        <li>Location is used only if you start GPS tracking on the Frozen Character walk, and only while the game is open. Coordinates are shown on screen but never saved or sent; only distance and time are saved.</li>
        <li>The map is illustrated and not GPS-calibrated, so your position is never placed on it.</li>
        <li>${storageAvailable ? 'Progress, XP, badges, squad and the days you played are saved in this browser only. Nothing is uploaded.' : 'Saving is unavailable here (private mode?). Progress will not survive a refresh.'}</li>
        <li>Squad Mode is local: teammates are game characters; nothing is sent to other phones.</li>
        <li>Map based on the official FLAME University Campus Map 2025.</li>
      </ul>
    </details>
  </div>`;
}

export function profileEditor(profile) {
  return `<form class="panel profile-edit" data-profile-form>
    <div class="avatar-grid">${AVATARS.map((a) => `<button type="button" class="avatar-pick${profile.avatar === a.id ? ' on' : ''}" data-avatar="${a.id}" aria-pressed="${profile.avatar === a.id}">${crest(a.id, 46)}<small>${esc(a.name)}</small></button>`).join('')}</div>
    <label class="field"><span class="label">Field name <small>(optional, not your real name)</small></span><input class="input input--dark" name="fieldName" maxlength="24" value="${esc(profile.fieldName)}" placeholder="Repairer"></label>
    <button class="btn btn--acid btn--block" type="submit">${icon('check')} Save</button>
  </form>`;
}

export { isUnlocked };
