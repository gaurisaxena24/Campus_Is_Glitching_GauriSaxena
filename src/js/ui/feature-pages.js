// Screens for the device-feature missions:
//   - Lost Colour physical: camera / upload colour hunt (huntPage)
//   - Lost Colour digital: two-round pattern puzzle (patternPage)
//   - Missing Connection digital: five-message conversation episode (episodePage)
// Each is (ctx, id) => HTML. Behaviour is wired in app.js through data-action.

import { getMission } from '../data/missions.js';
import { COLOUR_TARGETS } from '../game/colour.js';
import { TILES, checkAnswer } from '../game/pattern.js';
import { EPISODES, ENGINE_LABEL, TURNS, MAX_CHARS, CONVERSATION_PASS_SCORE, startEpisode, sendMessage, suggestions, evaluate } from '../game/conversation.js';
import { esc, icon } from './dom.js';

const back = (label) => `<button class="back-btn" data-action="back">${icon('back')}<span>${esc(label)}</span></button>`;
const colourInfo = (id) => COLOUR_TARGETS.find((c) => c.id === id) || { id, name: id, hex: '#888888' };
const tile = (id) => TILES.find((t) => t.id === id);

// ---------- Lost Colour: colour hunt ----------
export function huntPage(ctx, id) {
  const { state, cam } = ctx;
  const mission = getMission(id);
  const p = mission.physical;
  const hunt = state.hunts[id];
  if (!hunt) return '<div class="page-inner"><p class="hint">Preparing the colour hunt…</p></div>';
  const target = colourInfo(hunt.target);
  const n = hunt.items.length;
  const slots = Array.from({ length: p.count }, (_, i) => {
    const it = hunt.items[i];
    return it
      ? `<span class="hunt-slot on${cam.justAdded === i ? ' new' : ''}" style="--c:${it.hex}" aria-label="Object ${i + 1}: ${esc(colourInfo(it.colourId).name)}, ${Math.round(it.confidence * 100)}% confident">${icon('check', 'icon--sm')}</span>`
      : `<span class="hunt-slot" aria-label="Object ${i + 1}: not found yet">${i + 1}</span>`;
  }).join('');

  let stage = '';
  if (n >= p.count) {
    stage = `<p class="repaired-line">${icon('check')} All ${p.count} found. The colour is back.</p>
      <button class="btn btn--acid btn--xl btn--block" data-action="complete-physical" data-id="${id}">${icon('check')} Restore the colour</button>`;
  } else if (cam.live) {
    stage = `<div class="cam-frame"><video data-cam-video playsinline muted autoplay aria-label="Camera preview"></video><span class="cam-reticle" aria-hidden="true"></span></div>
      <p class="hint hint--center">Fill the circle with one ${esc(target.name.toLowerCase())} object.</p>
      <div class="btn-row"><button class="btn btn--ghost-dark" data-action="cam-cancel">${icon('close')} Cancel</button>
      <button class="btn btn--acid" data-action="cam-snap">${icon('camera')} Take picture</button></div>`;
  } else if (cam.hasImage) {
    const a = cam.analysis;
    const r = cam.match;
    const pass = r && r.pass && !cam.duplicate;
    stage = `<div class="cam-frame cam-frame--photo"><canvas data-cam-preview role="img" aria-label="Your photo. Tap the object to analyse just that part."></canvas>
        ${cam.region ? `<span class="cam-region" style="left:${cam.region.cx * 100}%;top:${cam.region.cy * 100}%"></span>` : ''}</div>
      <p class="hint hint--center">${cam.region ? 'Analysing the circled area. Tap elsewhere to move it.' : 'Analysing the centre. Tap the object to analyse just that part.'}</p>
      <div class="cam-result" data-status="${pass ? 'pass' : r ? r.status : 'uncertain'}" aria-live="polite">
        <span class="cam-swatch" style="--c:${a && a.hex ? a.hex : '#555'}"></span>
        <div><strong>${esc(cam.duplicate ? 'Looks like a photo you already added' : r ? r.message : 'Analysing…')}</strong>
        <small>${a && a.colour ? `Detected: ${esc(a.colour.name)} · ${Math.round((r ? r.confidence : a.confidence) * 100)}% confident` : 'No clear colour found'}</small>
        <small>${cam.duplicate ? 'Find a different object.' : pass ? 'Counts toward your collection.' : r && r.status === 'uncertain' ? 'Tap the object in the photo, or move closer.' : 'Does not count. Try another object.'}</small></div>
      </div>
      <div class="btn-row"><button class="btn btn--ghost-dark" data-action="cam-retake">${icon('restart')} Retake</button>
      <button class="btn btn--acid" data-action="cam-add" ${pass ? '' : 'aria-disabled="true"'}>${icon('plus')} Add to collection</button></div>`;
  } else {
    stage = `<div class="cam-actions">
        ${cam.cameraSupported ? `<button class="btn btn--acid btn--xl btn--block" data-action="cam-open">${icon('camera')} Open camera</button>` : ''}
        <label class="btn btn--ghost-dark btn--block cam-upload">${icon('satchel')} ${cam.cameraSupported ? 'Upload a photo' : 'Take or upload a photo'}<input type="file" accept="image/*" data-cam-file ${cam.cameraSupported ? '' : 'capture="environment"'}></label>
      </div>`;
  }
  return `<div class="page-inner page-inner--phys">
    <div class="mission-top">${back(mission.name)}</div>
    <div class="phys-head"><span class="step-tag">Physical</span><h1 tabindex="-1">${esc(p.title)}</h1></div>
    <div class="hunt-target" style="--c:${target.hex}">
      <span class="hunt-target-swatch" aria-hidden="true"></span>
      <div><small>Today's colour</small><strong>Find ${p.count} different ${esc(target.name.toLowerCase())} things</strong><em>${n} of ${p.count} found · ${p.count - n} to go</em></div>
    </div>
    <div class="hunt-slots" role="list" aria-label="Collection">${slots}</div>
    ${cam.busy ? '<p class="hint hint--center" role="status">Checking the colour…</p>' : ''}
    ${cam.error ? `<p class="walk-help walk-help--bad" role="alert">${icon('info', 'icon--sm')} ${esc(cam.error)}</p>` : ''}
    ${stage}
    <button class="link-btn link-btn--light" data-action="report-colour-hunt" data-id="${id}">I did the colour hunt <small>(self-reported)</small></button>
    <p class="safety">${icon('leaf', 'icon--sm')} Don't photograph people without asking. Camera checks are optional; photos stay on this phone.</p>
  </div>`;
}

// ---------- Lost Colour: pattern puzzle ----------
const tileHTML = (id, extra = '') => {
  const t = tile(id);
  return t ? `<span class="ptile${extra}" style="--c:${t.hex}" aria-label="${esc(t.name)}"><b aria-hidden="true">${t.symbol}</b></span>` : '';
};

export function patternPage(ctx, id) {
  const { state, ui } = ctx;
  const mission = getMission(id);
  const ps = state.puzzles[id];
  if (!ps) return '<div class="page-inner"><p class="hint">Generating your puzzle…</p></div>';
  const round = ps.solved[0] ? (ps.solved[1] ? 2 : 1) : 0;
  const done = ps.solved.every(Boolean);
  const r = Math.min(round, 1);
  const pz = ps.rounds[r];
  const answer = (ui.pattern && ui.pattern.round === r ? ui.pattern.answer : []);
  const fb = ui.pattern && ui.pattern.round === r ? ui.pattern.feedback : null;
  let blankNo = 0;
  const seq = pz.sequence.map((tId, i) => {
    if (tId) return tileHTML(tId);
    const k = blankNo++;
    const filled = answer[k];
    const wrong = fb && fb.wrongAt && fb.wrongAt.includes(k);
    return filled
      ? `<span class="pslot filled${wrong ? ' wrong' : ''}" aria-label="Gap ${k + 1}: ${esc(tile(filled).name)}">${tileHTML(filled)}</span>`
      : `<span class="pslot${k === answer.length ? ' next' : ''}" aria-label="Gap ${k + 1}: empty">?</span>`;
    void i;
  }).join('');
  const full = answer.length === pz.blanks.length;
  const head = `<div class="mission-top">${back(mission.name)}</div>
    <div class="pattern-head"><p class="eyebrow eyebrow--acid">Pattern restore · Round ${r + 1} of 2</p>
      <h1 tabindex="-1">${r === 0 ? 'Learn the pattern' : 'Apply a harder rule'}</h1>
      <div class="pattern-rounds" aria-label="Rounds">${[0, 1].map((i) => `<span class="${ps.solved[i] ? 'on' : i === r ? 'cur' : ''}">${ps.solved[i] ? icon('check', 'icon--xs') : i + 1}</span>`).join('')}<small>Attempts: ${ps.attempts[r]}</small></div></div>`;
  if (done) {
    return `<div class="page-inner page-inner--pattern">${head}
      <div class="pattern-clear" role="status"><span class="pattern-star">${icon('star', 'icon--lg')}</span><strong>Both rounds cleared</strong><small>${esc(checkAnswer(ps.rounds[1], ps.rounds[1].solution).message)}</small></div>
      <div class="pattern-seq pattern-seq--done">${ps.rounds[1].sequence.map((t, i) => tileHTML(t || ps.rounds[1].solution[ps.rounds[1].blanks.indexOf(i)])).join('')}</div>
      ${state.missions[id].digitalComplete ? `<p class="repaired-line">${icon('check')} Digital part complete.</p>` : `<button class="btn btn--acid btn--xl btn--block" data-action="pattern-finish" data-id="${id}">${icon('check')} Restore the pattern</button>`}
    </div>`;
  }
  return `<div class="page-inner page-inner--pattern">${head}
    ${ui.pattern && ui.pattern.cleared === 0 && r === 1 ? `<div class="pattern-clear pattern-clear--small" role="status">${icon('star')} Round 1 cleared! Round 2 unlocked.</div>` : ''}
    <p class="pattern-brief">${r === 0 ? 'The tiles follow a rule. Work it out and fill the gaps in order.' : 'A different, trickier rule. Gaps can be in the middle too.'}</p>
    <div class="pattern-seq" aria-label="Pattern with ${pz.blanks.length} gaps">${seq}</div>
    <div class="pattern-palette" role="group" aria-label="Tiles">${pz.palette.map((tId) => `<button class="ptile-btn" data-action="pattern-pick" data-tile="${tId}" style="--c:${tile(tId).hex}" aria-label="Add ${esc(tile(tId).name)}" ${full ? 'aria-disabled="true"' : ''}><b aria-hidden="true">${tile(tId).symbol}</b><small>${esc(tile(tId).name)}</small></button>`).join('')}</div>
    <div class="btn-row">
      <button class="btn btn--ghost-dark" data-action="pattern-undo" ${answer.length ? '' : 'aria-disabled="true"'}>${icon('back')} Undo</button>
      <button class="btn btn--ghost-dark" data-action="pattern-reset" ${answer.length ? '' : 'aria-disabled="true"'}>${icon('restart')} Reset</button>
    </div>
    <button class="btn btn--acid btn--xl btn--block" data-action="pattern-submit" data-id="${id}" ${full ? '' : 'aria-disabled="true"'}>${icon('check')} Check pattern</button>
    <p class="pattern-feedback${fb ? (fb.correct ? ' ok' : ' bad') : ''}" aria-live="polite">${fb ? esc(fb.message) : `Fill ${pz.blanks.length} gap${pz.blanks.length > 1 ? 's' : ''}.`}</p>
    ${fb && !fb.correct && ps.attempts[r] >= 2 ? `<p class="hint">${icon('info', 'icon--xs')} Hint: ${esc(pz.hint)}</p>` : ''}
  </div>`;
}

// ---------- Missing Connection: conversation episode ----------
export function portrait(character, size = 56) {
  const p = character.portrait || {};
  return `<svg class="portrait" width="${size}" height="${size}" viewBox="0 0 48 48" aria-hidden="true">
    <circle cx="24" cy="24" r="23" fill="${p.accent || '#5fa8c8'}" opacity=".25"/>
    <path d="M8 46 C8 34 40 34 40 46 Z" fill="${p.accent || '#5fa8c8'}"/>
    <circle cx="24" cy="23" r="11" fill="${p.skin || '#c68a5e'}" stroke="#14130f" stroke-width="1.4"/>
    <path d="M12 21 C13 9 35 9 36 21 C31 15 18 15 12 21 Z" fill="${p.hair || '#2b1d16'}"/>
    <circle cx="20" cy="24" r="1.5" fill="#14130f"/><circle cx="28" cy="24" r="1.5" fill="#14130f"/>
    <path d="M20 29 C22 31 26 31 28 29" fill="none" stroke="#14130f" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`;
}

// Rebuild the visible log by replaying the saved messages through the engine.
export function episodeView(e) {
  const ep = EPISODES.find((x) => x.id === e.episodeId);
  let st = startEpisode(e.episodeId);
  const log = [{ from: 'character', text: ep.opening.text }];
  let final = '';
  for (const text of e.messages) {
    const r = sendMessage(st, text);
    st = r.state;
    log.push({ from: 'player', text });
    log.push({ from: 'character', text: r.reply.text, emotion: r.reply.emotion });
    if (r.reply.final) final = r.reply.final;
  }
  return { ep, st, log, final, done: e.messages.length >= TURNS };
}

const DIMS = [['friendliness', 'Friendliness'], ['curiosity', 'Curiosity'], ['responsiveness', 'Responsiveness'], ['empathy', 'Empathy'], ['flow', 'Flow']];

export function episodePage(ctx, id) {
  const { state, ui } = ctx;
  const mission = getMission(id);
  const e = state.episodes[id];
  const top = `<div class="mission-top">${back(mission.name)}<span class="engine-tag" title="${esc(ENGINE_LABEL)}">${esc(ENGINE_LABEL)}</span></div>`;
  if (!e) {
    return `<div class="page-inner page-inner--episode">${top}
      <div class="page-head"><p class="eyebrow eyebrow--acid">Conversation episode</p><h1 tabindex="-1">Choose a scene</h1>
      <p class="hint">Five messages with a fictional student. There are many good ways to talk; the game gives encouraging feedback at the end.</p></div>
      <div class="episode-list">${EPISODES.map((ep) => `<button class="episode-card" data-action="episode-start" data-id="${id}" data-episode="${ep.id}">
        ${portrait(ep.character, 52)}<span><strong>${esc(ep.title)}</strong><small>${esc(ep.character.name)} · ${esc(ep.setting.split('.')[0])}</small></span>${icon('next', 'icon--sm')}</button>`).join('')}</div>
    </div>`;
  }
  const v = episodeView(e);
  const typing = ui.episodeTyping === id;
  const shown = typing ? v.log.slice(0, -1) : v.log;
  const sent = e.messages.length;
  const bubbles = shown.map((m, i) => `<div class="bubble bubble--${m.from}${i === shown.length - 1 && !typing ? ' fresh' : ''}">${m.from === 'character' ? `<span class="bubble-name">${esc(v.ep.character.name)}</span>` : ''}${esc(m.text)}</div>`).join('');
  let foot = '';
  if (v.done && !typing) {
    const ev = evaluate(v.st);
    const passed = ev.total >= CONVERSATION_PASS_SCORE;
    foot = `<div class="bubble bubble--character bubble--final"><span class="bubble-name">${esc(v.ep.character.name)}</span>${esc(v.final)}</div>
      <section class="episode-result panel" aria-label="Episode results">
        <p class="eyebrow eyebrow--acid">${passed ? 'Digital mission passed' : 'Digital mission not passed yet'}</p>
        <h2 class="episode-rank">${icon('star')} ${esc(ev.rank.title)} <small>${ev.total}/${ev.maxTotal}</small></h2>
        <p>${passed ? 'Pass — you reached Bridge Builder or higher.' : `Try again — you need ${CONVERSATION_PASS_SCORE}/${ev.maxTotal} to pass.`}</p>
        <div class="episode-dims">${DIMS.map(([k, label]) => `<div class="episode-dim"><span>${label}</span><span class="dim-track" role="img" aria-label="${label}: ${ev.scores[k]} of 3">${[0, 1, 2].map((i) => `<i class="${i < ev.scores[k] ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}</div>
        <p><strong>You did well:</strong> ${esc(ev.highlight)}</p>
        <p><strong>Next time:</strong> ${esc(ev.suggestion)}</p>
        <p class="hint">${esc(ev.summary)}</p>
        ${state.missions[id].digitalComplete ? `<p class="repaired-line">${icon('check')} Digital part passed.</p>` : passed ? `<button class="btn btn--acid btn--xl btn--block" data-action="episode-finish" data-id="${id}">${icon('check')} Complete digital mission</button>` : `<button class="btn btn--acid btn--xl btn--block" data-action="episode-replay" data-id="${id}">${icon('restart')} Retake conversation</button>`}
        ${passed ? `<button class="btn btn--ghost-dark btn--block" data-action="episode-replay" data-id="${id}">${icon('restart')} Replay with a different approach</button>` : ''}
      </section>`;
  } else if (!typing) {
    const sug = suggestions(v.st);
    foot = `<div class="composer">
      <div class="suggest">${sug.map((s) => `<button class="suggest-chip" data-action="episode-say" data-id="${id}" data-text="${esc(s.text)}">${esc(s.text)}</button>`).join('')}</div>
      <form class="composer-row" data-episode-form="${id}"><label class="sr-only" for="ep-input">Write your own message</label>
        <input id="ep-input" class="input input--dark" name="text" maxlength="${MAX_CHARS}" autocomplete="off" placeholder="Or write your own…" value="${esc(ui.episodeDraft || '')}">
        <button class="btn btn--acid" type="submit" aria-label="Send">${icon('next')}</button></form>
    </div>`;
  }
  return `<div class="page-inner page-inner--episode">${top}
    <div class="episode-head">${portrait(v.ep.character, 56)}<div><p class="eyebrow eyebrow--acid">${esc(v.ep.title)}</p><h1 tabindex="-1">${esc(v.ep.character.name)} <small>${esc(v.ep.character.pronouns)}</small></h1></div></div>
    <div class="episode-progress" role="img" aria-label="${sent} of ${TURNS} messages sent">${Array.from({ length: TURNS }, (_, i) => `<i class="${i < sent ? 'on' : ''}"></i>`).join('')}<small>${sent}/${TURNS}</small></div>
    <p class="episode-scene">${esc(v.ep.intro)}</p>
    <div class="chat" aria-live="polite">${bubbles}${typing ? `<div class="bubble bubble--character bubble--typing" aria-label="${esc(v.ep.character.name)} is typing"><i></i><i></i><i></i></div>` : ''}</div>
    ${foot}
  </div>`;
}

// Lost Connection physical activity: mandatory reflection timer, saved locally
// while a server-only AI coach evaluates the player's own account of the chat.
export function conversationReflectionPage(ctx, id) {
  const { state, now, ui } = ctx;
  const d = state.drafts[id] || {};
  const result = d.conversationReflectionResult;
  const started = d.conversationReflectionStartedAt || now;
  const left = Math.max(0, 30_000 - (now - started));
  const speechAvailable = typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  const header = `<div class="mission-top">${back('Lost Connection')}<span class="engine-tag">Reflection coach · AI</span></div>`;
  let content;
  if (result) {
    content = `<section class="reflection-result panel${result.passed ? ' is-pass' : ' is-retry'}" aria-live="polite">
      <span class="reflection-result-mark" aria-hidden="true">${icon(result.passed ? 'check' : 'restart', 'icon--lg')}</span>
      <p class="eyebrow eyebrow--acid">${result.passed ? 'Signal connected' : 'One more detail'}</p>
      <h1 tabindex="-1">${result.score}/5 · ${result.passed ? 'Nice listening' : 'Keep going'}</h1>
      <p>${esc(result.feedback)}</p><p class="reflection-suggestion"><strong>Try this:</strong> ${esc(result.suggestion)}</p>
      <small>This rates your reflection; it cannot verify the conversation.</small>
      ${result.passed
        ? `<button class="btn btn--acid btn--xl btn--block" data-action="conversation-reflection-continue" data-id="${id}">${icon('next')} Continue quest</button>`
        : `<button class="btn btn--acid btn--xl btn--block" data-action="conversation-reflection-again" data-id="${id}">${icon('restart')} Reflect again</button>`}
    </section>`;
  } else {
    const loading = ui.reflectionLoading === id;
    content = `<div class="reflection-scene" aria-hidden="true"><span class="reflection-bubble reflection-bubble--one">?</span><span class="reflection-bubble reflection-bubble--two">…</span><span class="reflection-link">${icon('squad', 'icon--lg')}</span></div>
      <div class="reflection-clock" data-reflection-clock data-started="${started}" role="timer" aria-label="Reflection time remaining">
        <span class="reflection-clock-face"><strong data-reflection-count>${left ? Math.ceil(left / 1000) : '✓'}</strong><small data-reflection-unit>${left ? 'sec' : 'ready'}</small></span>
        <span class="reflection-clock-track"><i data-reflection-fill style="--elapsed:${Math.min(100, ((30_000 - left) / 30_000) * 100)}%"></i></span>
        <p>${left ? 'Let the moment land…' : 'Ready when you are'}</p>
      </div>
      <label class="field"><span class="label">What made the conversation interesting?</span>
        <textarea class="textarea" data-conversation-reflection maxlength="500" rows="3" placeholder="A topic, a good question, something you learned…">${esc(d.conversationReflection || '')}</textarea></label>
      ${speechAvailable ? `<button class="link-btn link-btn--light reflection-speak" data-action="conversation-reflection-speak">${icon('sound')}<span>Speak your reflection</span></button>` : ''}
      <p class="hint reflection-privacy">Your writing goes to the AI coach for feedback. Skip names and private details. It does not prove the chat happened.</p>
      ${ui.reflectionError ? `<p class="walk-help walk-help--bad" role="alert">${esc(ui.reflectionError)}</p><button class="btn btn--ghost-dark btn--block" data-action="conversation-reflection-submit" data-id="${id}">${icon('restart')} Retry evaluation</button>` : ''}
      ${!ui.reflectionError ? `<button class="btn btn--acid btn--xl btn--block" data-action="conversation-reflection-submit" data-id="${id}" data-reflection-submit ${loading || left > 0 || (d.conversationReflection || '').trim().length < 12 ? 'disabled' : ''}>${loading ? 'Checking your reflection…' : `${icon('bolt')} Keep reflecting`}</button>` : ''}
      <p class="reflection-honesty">We take your word that you spoke with someone; the coach only reads this reflection.</p>`;
  }
  return `<div class="page-inner page-inner--conversation-reflection">${header}
    <section class="reflection-card">${result ? content : `<p class="eyebrow eyebrow--acid">30-second reflection</p><h1 tabindex="-1">Replay the good bit</h1>${content}`}</section>
  </div>`;
}
