// Playable minigames. Each one mounts into an element and moves through
// intro -> play -> won (or retry) states, then reports a result through onWin.
// Results are re-validated by the reducer, so a win cannot be faked by the UI.
//
// mountGame(kind, el, { squad, mates, play, onWin, onExit }) -> { destroy() }

import { esc, icon, prefersReducedMotion } from './dom.js';
import { glitchArt, teammate } from './art.js';
import { burstFrom, floatFrom, shake, pop } from './fx.js';
import {
  FOCUS, PALETTE, SEQUENCE, makeSequence, checkSequence,
  SOCIAL, socialNext, SPOT, RALLY, rallySequence,
} from '../game/minigames.js';

const ring = (pct, label) => `<span class="game-ring" style="--p:${Math.round(pct * 100)}" role="img" aria-label="${label}"><b>${label}</b></span>`;

function flashWrong(node) {
  if (!node) return;
  node.classList.remove('answer-wrong');
  void node.offsetWidth;
  node.classList.add('answer-wrong');
  node.addEventListener('animationend', () => node.classList.remove('answer-wrong'), { once: true });
}

function shell(el, kind, title) {
  el.innerHTML = `<div class="game game--${kind}" data-game="${kind}">
    <div class="game-hud"><span class="game-title">${esc(title)}</span><span class="game-meter"></span></div>
    <div class="game-stage"></div>
    <div class="game-foot"></div>
  </div>`;
  return {
    root: el.firstElementChild,
    stage: el.querySelector('.game-stage'),
    foot: el.querySelector('.game-foot'),
    meter: el.querySelector('.game-meter'),
  };
}

function introFoot(foot, line, onStart, squadLine) {
  foot.innerHTML = `<p class="game-line">${esc(line)}</p>${squadLine ? `<p class="game-squad">${icon('squad', 'icon--sm')} ${esc(squadLine)}</p>` : ''}
    <button class="btn btn--acid btn--block game-start" data-game-start>${icon('play')} Play</button>`;
  foot.querySelector('[data-game-start]').addEventListener('click', onStart, { once: true });
}

function wonFoot(foot, msg, onContinue, onReplay) {
  foot.innerHTML = `<p class="game-won">${icon('check')} ${esc(msg)}</p>
    <div class="btn-row"><button class="btn btn--ghost-dark" data-game-replay>${icon('restart')} Replay</button>
    <button class="btn btn--acid" data-game-continue>Continue ${icon('next', 'icon--sm')}</button></div>`;
  foot.querySelector('[data-game-continue]').addEventListener('click', onContinue, { once: true });
  foot.querySelector('[data-game-replay]').addEventListener('click', onReplay, { once: true });
  foot.querySelector('[data-game-continue]').focus({ preventScroll: true });
}

function retryFoot(foot, msg, onRetry) {
  foot.innerHTML = `<p class="game-lost">${esc(msg)}</p><button class="btn btn--acid btn--block" data-game-retry>${icon('restart')} Try again</button>`;
  foot.querySelector('[data-game-retry]').addEventListener('click', onRetry, { once: true });
  foot.querySelector('[data-game-retry]').focus({ preventScroll: true });
}

function passPhone(stage, mate, ms = 1400) {
  return new Promise((resolve) => {
    const o = document.createElement('div');
    o.className = 'game-pass';
    o.innerHTML = `${teammate(mate, 64)}<strong>${esc(mate.name)}'s turn</strong><span>Pass the phone to a squadmate, or keep going.</span>`;
    stage.appendChild(o);
    setTimeout(() => { o.remove(); resolve(); }, prefersReducedMotion() ? 600 : ms);
  });
}

// ---------------- Focus: tap battery cells, ignore notifications ----------------
function focusGame(el, opts) {
  const ui = shell(el, 'focus', 'Recharge the signal');
  let timers = [];
  let raf = 0;
  const clear = () => { timers.forEach(clearTimeout); timers = []; cancelAnimationFrame(raf); };

  function intro() {
    clear();
    ui.stage.innerHTML = `<div class="focus-intro">${glitchArt('phone')}</div>`;
    ui.meter.innerHTML = ring(0, `0/${FOCUS.target}`);
    introFoot(ui.foot, 'Tap the green cells. Notifications are traps.', start, opts.squad ? 'Halfway, pass the phone to a squadmate.' : '');
  }

  function start() {
    opts.play('start');
    let hits = 0;
    let traps = 0;
    let spawned = 0;
    let paused = false;
    let passed = false;
    const end = performance.now() + FOCUS.seconds * 1000;
    let pauseAt = 0;
    let extra = 0;
    ui.stage.innerHTML = `<div class="focus-field" aria-live="polite"></div><div class="game-timebar"><i></i></div>`;
    const field = ui.stage.querySelector('.focus-field');
    const bar = ui.stage.querySelector('.game-timebar i');
    ui.foot.innerHTML = '<p class="game-line">Tap fast, but stay focused.</p>';

    const update = () => { ui.meter.innerHTML = ring(hits / FOCUS.target, `${hits}/${FOCUS.target}`); };
    update();

    const spawn = () => {
      if (paused) return;
      spawned += 1;
      const trap = spawned % FOCUS.distractorEvery === 0;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = trap ? 'focus-trap' : 'focus-cell';
      b.dataset.focus = trap ? 'trap' : 'cell';
      b.setAttribute('aria-label', trap ? 'Notification (ignore)' : 'Battery cell');
      b.innerHTML = trap ? `${icon('signal')}<span>New!</span>` : '<i></i>';
      b.style.left = `${8 + Math.random() * 74}%`;
      b.style.top = `${6 + Math.random() * 74}%`;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (trap) {
          traps += 1;
          opts.play('glitch');
          flashWrong(b);
          b.classList.add('pop-bad');
        } else {
          hits += 1;
          opts.play('hit');
          b.classList.add('pop-good');
          update();
          if (opts.squad && !passed && hits === Math.floor(FOCUS.target / 2)) {
            passed = true;
            paused = true;
            pauseAt = performance.now();
            passPhone(ui.stage, opts.mates[0]).then(() => { extra += performance.now() - pauseAt; paused = false; });
          }
          if (hits >= FOCUS.target) return win();
        }
        setTimeout(() => b.remove(), 160);
      });
      b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.dispatchEvent(new PointerEvent('pointerdown')); } });
      field.appendChild(b);
      timers.push(setTimeout(() => b.remove(), FOCUS.lifeMs + (trap ? 600 : 0)));
    };

    const loop = () => {
      const left = end + extra - performance.now();
      bar.style.transform = `scaleX(${Math.max(0, left / (FOCUS.seconds * 1000))})`;
      if (left <= 0) { clear(); field.innerHTML = ''; opts.play('miss'); return retryFoot(ui.foot, `Battery at ${hits}/${FOCUS.target}. Try again: no penalty.`, start); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const tick = () => { spawn(); timers.push(setTimeout(tick, FOCUS.spawnMs)); };
    tick();

    function win() {
      clear();
      field.innerHTML = `<div class="focus-full">${glitchArt('phone', true)}</div>`;
      opts.play('win');
      burstFrom(field);
      const perfect = traps === 0;
      wonFoot(ui.foot, perfect ? 'Fully charged. Not one notification tapped.' : 'Fully charged.', () => opts.onWin({ hits, perfect }), start);
    }
  }

  intro();
  return { destroy: clear };
}

// ---------------- THAW: the ice character follows the pointer and paints a trail ----------------
function thawGame(el, opts) {
  const ui = shell(el, 'thaw', 'THAW');
  let active = false;
  let completed = false;
  let restarts = 0;
  let live = null;

  function surface(isPreview = false) {
    return `<div class="thaw-board${isPreview ? ' thaw-board--preview' : ''}" aria-label="Simple dark play area">
      <svg class="thaw-trail" aria-hidden="true" viewBox="0 0 1000 800" preserveAspectRatio="none"></svg>
      <span class="thaw-puddle" aria-hidden="true"></span>
      <button class="thaw-ice" type="button" aria-label="Ice character, drag to move" ${isPreview ? 'disabled' : ''}>
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
          <path class="thaw-cube" d="M22 9 76 7 91 21 88 80 76 91 18 87 9 75 12 24Z"/>
          <path class="thaw-glint" d="m20 26 4-10 18-4m27 4 7 7"/>
          <ellipse class="thaw-eye" cx="38" cy="48" rx="4.2" ry="6.5"/><ellipse class="thaw-eye" cx="63" cy="47" rx="4.2" ry="6.5"/>
          <path class="thaw-cracks" d="m19 49 10 9-3 13m51-21-8 11 4 11m-29 8 7-8 1-10"/>
        </svg>
      </button>
      <i class="thaw-drop thaw-drop--one" aria-hidden="true"></i><i class="thaw-drop thaw-drop--two" aria-hidden="true"></i>
    </div>`;
  }

  function intro() {
    active = false; completed = false; live = null;
    ui.stage.innerHTML = surface(true);
    ui.meter.innerHTML = ring(0, '100%');
    introFoot(ui.foot, 'Drag the ice or glide your cursor to paint a dotted melting trail.', start, opts.squad ? 'Take turns guiding the ice character.' : '');
  }

  function start() {
    active = true; completed = false;
    opts.play('start');
    ui.stage.innerHTML = surface();
    ui.foot.innerHTML = `<p class="game-line">Drag the ice or glide your cursor. Watch the dotted trail thaw it.</p><div class="btn-row"><button class="btn btn--ghost-dark" data-thaw-restart>${icon('restart')} Restart</button></div>`;
    const board = ui.stage.querySelector('.thaw-board');
    const trail = ui.stage.querySelector('.thaw-trail');
    const ice = ui.stage.querySelector('.thaw-ice');
    const puddle = ui.stage.querySelector('.thaw-puddle');
    const rect = board.getBoundingClientRect();
    let position = { x: rect.width / 2, y: rect.height / 2 };
    let lastPoint = position;
    let touchPointer = null;
    let dotCarry = 0;
    let travelled = 0;
    const dotGap = 8;
    const goalDistance = Math.max(1200, Math.hypot(rect.width, rect.height) * 5.25);
    let remaining = 1;

    ui.foot.querySelector('[data-thaw-restart]').addEventListener('click', () => { restarts += 1; start(); });
    const paint = () => {
      remaining = Math.max(0, 1 - travelled / goalDistance);
      const melted = 1 - remaining;
      ui.meter.innerHTML = ring(melted, `${Math.round(remaining * 100)}%`);
      ice.style.setProperty('--ice-scale', String(0.42 + remaining * 0.58));
      ice.style.setProperty('--ice-opacity', String(0.78 + remaining * 0.22));
      ice.style.setProperty('--crack-opacity', String(Math.min(1, Math.max(0, (melted - .12) * 1.35))));
      ice.style.left = `${position.x}px`; ice.style.top = `${position.y}px`;
      puddle.style.left = `${position.x}px`; puddle.style.top = `${position.y + 27 * (0.2 + remaining * 0.8)}px`;
      puddle.style.setProperty('--puddle-scale', String(.3 + melted * .9));
      board.style.setProperty('--melt', String(melted));
      if (remaining <= 0 && !completed) finish();
    };
    const pointFrom = (event) => {
      const b = board.getBoundingClientRect();
      const half = Math.max(ice.offsetWidth * (0.42 + remaining * 0.58) / 2, 7);
      return {
        x: Math.max(half, Math.min(b.width - half, event.clientX - b.left)),
        y: Math.max(half, Math.min(b.height - half, event.clientY - b.top)),
      };
    };
    const addDots = (from, to) => {
      const dx = to.x - from.x; const dy = to.y - from.y;
      const length = Math.hypot(dx, dy);
      if (length < .1) return;
      let along = dotGap - dotCarry;
      while (along <= length) {
        const x = from.x + dx * along / length;
        const y = from.y + dy * along / length;
        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', String(x / rect.width * 1000));
        dot.setAttribute('cy', String(y / rect.height * 800));
        dot.setAttribute('r', String(Math.max(4, 4 * 1000 / rect.width)));
        trail.appendChild(dot);
        along += dotGap;
      }
      dotCarry = (dotCarry + length) % dotGap;
      travelled += length;
    };
    board.addEventListener('pointerdown', (event) => {
      if (!active || completed || event.pointerType !== 'touch') return;
      event.preventDefault();
      touchPointer = event.pointerId;
      board.setPointerCapture(event.pointerId);
      ice.classList.add('is-dragging');
    });
    board.addEventListener('pointermove', (event) => {
      if (!active || completed) return;
      if (event.pointerType === 'touch' && event.pointerId !== touchPointer) return;
      event.preventDefault();
      const point = pointFrom(event);
      addDots(lastPoint, point);
      lastPoint = point; position = point; paint();
    });
    const release = (event) => {
      if (event && touchPointer !== event.pointerId) return;
      if (touchPointer != null && board.hasPointerCapture(touchPointer)) board.releasePointerCapture(touchPointer);
      touchPointer = null;
      ice.classList.remove('is-dragging');
    };
    board.addEventListener('pointerup', release);
    board.addEventListener('pointercancel', release);
    paint();

    function finish() {
      completed = true; active = false; release();
      ice.classList.add('is-nearly-melted');
      opts.play('win'); burstFrom(board);
      ui.foot.innerHTML = `<p class="game-won">${icon('check')} Ice thawed.</p><div class="btn-row">
        <button class="btn btn--ghost-dark" data-thaw-restart>${icon('restart')} Restart</button>
        <button class="btn btn--acid" data-thaw-continue>Continue ${icon('next','icon--sm')}</button></div>`;
      ui.foot.querySelector('[data-thaw-restart]').addEventListener('click', () => { restarts += 1; start(); });
      ui.foot.querySelector('[data-thaw-continue]').addEventListener('click', () => opts.onWin({ melted: 100, perfect: restarts === 0, restarts, score: Math.max(0, 1000 - restarts * 100) }), { once: true });
      ui.foot.querySelector('[data-thaw-continue]').focus({ preventScroll: true });
    }
  }

  intro();
  return { destroy() { active = false; live = null; } };
}

// ---------------- Social: branching conversation ----------------
function socialGame(el, opts) {
  const ui = shell(el, 'social', 'Reconnect');
  function intro() {
    ui.stage.innerHTML = `<div class="social-art">${glitchArt('bubbles')}</div>`;
    ui.meter.innerHTML = ring(0, 'Chat');
    const mate = opts.squad ? opts.mates.find((m) => m.id === 'meera') || opts.mates[0] : null;
    introFoot(ui.foot, 'Pick how you start a conversation. Kindness wins.', start, mate ? `${mate.name}: “${mate.line}”` : '');
  }
  function start() {
    opts.play('start');
    let node = SOCIAL.start;
    let steps = 0;
    let detours = 0;
    const render = () => {
      const n = SOCIAL.nodes[node];
      ui.meter.innerHTML = ring(Math.min(1, steps / 2), n.end ? 'Linked' : `${steps}/2`);
      ui.stage.innerHTML = `<div class="social-scene">
        <div class="social-npc"><svg viewBox="0 0 48 48" width="56" height="56" aria-hidden="true"><circle cx="24" cy="24" r="23" fill="#5a5448"/><circle cx="24" cy="20" r="9" fill="#d9c4a0"/><path d="M9 44 C10 32 38 32 39 44 Z" fill="#8a7f6c"/></svg></div>
        <p class="social-line" aria-live="polite">${esc(n.speaker)}</p>
      </div>`;
      if (n.end) return win();
      ui.foot.innerHTML = `<div class="social-choices">${n.choices.map((c, i) => `<button class="choice-card" data-choice="${i}">${esc(c.label)}</button>`).join('')}</div>`;
      ui.foot.querySelectorAll('[data-choice]').forEach((b) => b.addEventListener('click', () => {
        const next = socialNext(node, Number(b.dataset.choice));
        if (next === 'tooFast' || next === 'aboutMe') { detours += 1; opts.play('glitch'); flashWrong(b); } else { opts.play('select'); }
        if (!['tooFast', 'aboutMe'].includes(next)) steps += 1;
        node = next;
        if (next === 'tooFast' || next === 'aboutMe') setTimeout(render, 280);
        else render();
      }));
      ui.foot.querySelector('[data-choice]').focus({ preventScroll: true });
    };
    const win = () => {
      ui.stage.querySelector('.social-scene').insertAdjacentHTML('beforeend', `<div class="social-art small">${glitchArt('bubbles', true)}</div>`);
      opts.play('win');
      burstFrom(ui.stage);
      wonFoot(ui.foot, detours ? 'Connected, after finding your footing.' : 'Connected. Real-world tip: ask one question and listen.', () => opts.onWin({ connected: true, path: steps, perfect: detours === 0 }), start);
    };
    render();
  }
  intro();
  return { destroy() {} };
}

// ---------------- Sequence: watch slowly, then repeat (rushing resets) ----------------
function sequenceGame(el, opts) {
  const ui = shell(el, 'sequence', 'Colour echo');
  let timers = [];
  let round = 0;
  let perfectRun = true;
  let score = 0;
  let totalMistakes = 0;
  let totalRushes = 0;
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  function intro() {
    clear();
    round = 0; perfectRun = true; score = 0; totalMistakes = 0; totalRushes = 0;
    ui.stage.innerHTML = `<div class="seq-art">${glitchArt('palette')}</div>`;
    ui.meter.innerHTML = '';
    introFoot(ui.foot, 'Watch the colour flashes, then tap them back in order.', start, opts.squad ? 'One watches and calls out, the other taps.' : '');
  }
  function start() {
    round = 0; perfectRun = true; score = 0; totalMistakes = 0; totalRushes = 0;
    playRound();
  }
  function playRound() {
    opts.play('start');
    const length = 3 + round;
    const seq = makeSequence(Math.random, length);
    let input = [];
    let rushes = 0;
    let wrongs = 0;
    let watching = false;
    ui.stage.innerHTML = `<div class="seq-wrap" data-seq="${seq.join(',')}">
      <div class="seq-progress" aria-live="polite"><span>R${round + 1} · 0/${length}</span><i><b style="--seq-progress:0%"></b></i></div>
      <div class="seq-orb" aria-live="polite"><span class="seq-label">Watch</span></div>
      <div class="seq-trail">${seq.map(() => '<i></i>').join('')}</div>
      <div class="seq-swatches">${PALETTE.map((c) => `<button class="swatch" data-colour="${c.id}" style="--c:${c.hex}" aria-label="${c.name}"><span>${c.name}</span></button>`).join('')}</div>
    </div>`;
    const orb = ui.stage.querySelector('.seq-orb');
    const label = ui.stage.querySelector('.seq-label');
    const trail = [...ui.stage.querySelectorAll('.seq-trail i')];
    const meter = () => {
      const progress = ui.stage.querySelector('.seq-progress');
      progress.querySelector('span').textContent = `R${round + 1} · ${input.length}/${seq.length}`;
      progress.querySelector('b').style.setProperty('--seq-progress', `${input.length / seq.length * 100}%`);
    };

    const reveal = () => {
      clear();
      watching = true;
      input = [];
      meter();
      trail.forEach((t) => { t.style.background = ''; });
      ui.foot.innerHTML = '<p class="game-line">Breathe. Watch.</p>';
      label.textContent = 'Watch';
      orb.style.removeProperty('--c');
      seq.forEach((id, i) => {
        timers.push(setTimeout(() => {
          const c = PALETTE.find((p) => p.id === id);
          orb.style.setProperty('--c', c.hex);
          label.textContent = c.name;
          orb.classList.remove('beat'); void orb.offsetWidth; orb.classList.add('beat');
          opts.play('tap');
        }, 700 + i * SEQUENCE.revealMs));
      });
      timers.push(setTimeout(() => {
        watching = false;
        orb.style.removeProperty('--c');
        label.textContent = 'Your turn';
        ui.foot.innerHTML = '<p class="game-line">Repeat the colours in order.</p>';
      }, 700 + seq.length * SEQUENCE.revealMs + 200));
    };

    ui.stage.querySelectorAll('[data-colour]').forEach((b) => b.addEventListener('click', () => {
      if (watching) {
        rushes += 1;
        opts.play('glitch');
        shake(orb);
        label.textContent = 'Too fast!';
        clear();
        timers.push(setTimeout(reveal, 900));
        return;
      }
      input.push(b.dataset.colour);
      const c = PALETTE.find((p) => p.id === b.dataset.colour);
      const r = checkSequence(input, seq);
    if (r === 'wrong') {
        wrongs += 1;
        perfectRun = false;
        opts.play('miss');
        flashWrong(b);
        flashWrong(orb);
        timers.push(setTimeout(reveal, 900));
        return;
      }
      opts.play('hit');
      trail[input.length - 1].style.background = c.hex;
      pop(b);
      meter();
      if (r === 'done') {
        clear();
        totalMistakes += wrongs;
        totalRushes += rushes;
        score += Math.max(0, length * 25 - wrongs * 15 - rushes * 10);
        ui.stage.querySelector('.seq-wrap').classList.add('restored');
        label.textContent = 'Restored';
        opts.play('win');
        burstFrom(orb, { colours: PALETTE.map((p) => p.hex) });
        if (rushes || wrongs) perfectRun = false;
        if (round < 2) {
          ui.foot.innerHTML = `<p class="game-won">Round ${round + 1} cleared! The next sequence gets trickier.</p><button class="btn btn--acid btn--block" data-seq-next>Next round ${icon('next', 'icon--sm')}</button>`;
          ui.foot.querySelector('[data-seq-next]').addEventListener('click', () => { round += 1; playRound(); }, { once: true });
        } else {
          wonFoot(ui.foot, perfectRun ? 'All three rounds! Colour restored.' : 'All three rounds cleared! Colour restored.', () => opts.onWin({ correct: true, perfect: perfectRun, score, rounds: 3, mistakes: totalMistakes, rushes: totalRushes }), start);
        }
      }
    }));
    reveal();
  }
  intro();
  return { destroy: clear };
}

// ---------------- Spot the change: find 3 differences in a looping scene ----------------
function spotGame(el, opts) {
  const ui = shell(el, 'spot', 'Break the loop');
  let timer = 0;
  const clear = () => clearInterval(timer);
  function intro() {
    clear();
    ui.stage.innerHTML = `<div class="spot-art">${glitchArt('loop')}</div>`;
    ui.meter.innerHTML = ring(0, `0/${SPOT.found}`);
    introFoot(ui.foot, 'The scene keeps rewinding. Tap the 3 things that changed.', start, opts.squad ? 'Call out each change before tapping it.' : '');
  }
  function start() {
    opts.play('start');
    let found = 0;
    let misses = 0;
    ui.stage.innerHTML = `<div class="spot-scene" role="group" aria-label="Looping scene. Find the changes.">
      ${SPOT.spots.map((s) => `<button class="spot-hit" data-spot="${s.id}" style="left:${s.x}%;top:${s.y}%" aria-label="Something looks different here"><i></i></button>`).join('')}
      <span class="spot-rewind" aria-hidden="true">${icon('restart')}</span>
    </div>`;
    ui.foot.innerHTML = '<p class="game-line">Look closely. Changes shimmer when the loop resets.</p>';
    const scene = ui.stage.querySelector('.spot-scene');
    const meter = () => { ui.meter.innerHTML = ring(found / SPOT.found, `${found}/${SPOT.found}`); };
    meter();
    timer = setInterval(() => { scene.classList.remove('rewind'); void scene.offsetWidth; scene.classList.add('rewind'); }, 3200);
    scene.addEventListener('click', (e) => {
      const hit = e.target.closest('[data-spot]');
      if (!hit) { misses += 1; opts.play('miss'); flashWrong(scene); return; }
      if (hit.classList.contains('found')) return;
      hit.classList.add('found');
      found += 1;
      opts.play('hit');
      floatFrom(hit, 'Found!', 'fx-float--small');
      meter();
      if (found >= SPOT.found) {
        clear();
        scene.classList.add('fixed');
        opts.play('win');
        burstFrom(scene);
        wonFoot(ui.foot, misses ? 'Loop broken.' : 'Loop broken with a sharp eye.', () => opts.onWin({ found, perfect: misses === 0 }), start);
      }
    });
  }
  intro();
  return { destroy: clear };
}

// ---------------- Squad Rally: repeat the team chorus ----------------
function rallyGame(el, opts) {
  const ui = shell(el, 'rally', 'Squad Rally');
  let timers = [];
  let onKey = null;
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const unbind = () => { if (onKey) document.removeEventListener('keydown', onKey); onKey = null; };
  const voices = [{ name: 'You', colour: '#b6e632' }, ...opts.mates.slice(0, 3)];
  while (voices.length < 4) voices.push({ name: 'Echo', colour: '#8a8370' });
  function intro() {
    clear();
    unbind();
    ui.stage.innerHTML = `<div class="rally-cast">${opts.mates.map((m) => teammate(m, 56)).join('')}</div>`;
    ui.meter.innerHTML = ring(0, `0/${RALLY.rounds}`);
    introFoot(ui.foot, 'Your squad sings a pattern. Repeat it. It grows each round.', start, 'Local play: everyone on this phone takes part.');
  }
  function start() {
    opts.play('start');
    const seq = rallySequence();
    let round = 0;
    let input = [];
    let listening = false;
    ui.stage.innerHTML = `<div class="rally-pads" data-rally="${seq.join(',')}">${voices.map((v, i) => `<button class="rally-pad" data-pad="${i}" style="--c:${v.colour}" aria-label="${esc(v.name)} note ${i + 1}"><span>${esc(v.name)}</span></button>`).join('')}</div>`;
    const pads = [...ui.stage.querySelectorAll('[data-pad]')];
    const len = () => RALLY.startLength + round;
    const meter = () => { ui.meter.innerHTML = ring(round / RALLY.rounds, `${round}/${RALLY.rounds}`); };
    const flash = (i) => { pads[i].classList.remove('lit'); void pads[i].offsetWidth; pads[i].classList.add('lit'); opts.play(`pad${i}`); };
    const playback = () => {
      clear();
      listening = false;
      input = [];
      meter();
      ui.foot.innerHTML = `<p class="game-line">Round ${round + 1}: listen.</p>`;
      seq.slice(0, len()).forEach((p, k) => timers.push(setTimeout(() => flash(p), 600 + k * RALLY.noteMs)));
      timers.push(setTimeout(() => { listening = true; ui.foot.innerHTML = '<p class="game-line">Your turn. Keys 1 to 4 work too.</p>'; }, 600 + len() * RALLY.noteMs));
    };
    const press = (i) => {
      if (!listening) return;
      flash(i);
      input.push(i);
      const k = input.length - 1;
      if (input[k] !== seq[k]) { listening = false; opts.play('miss'); flashWrong(pads[i]); timers.push(setTimeout(playback, 800)); return; }
      if (input.length === len()) {
        round += 1;
        meter();
        if (round >= RALLY.rounds) {
          clear();
          opts.play('win');
          burstFrom(ui.stage);
          unbind();
          return wonFoot(ui.foot, 'Perfect chorus. The auditorium hums again.', () => opts.onWin({ rounds: round }), start);
        }
        listening = false;
        timers.push(setTimeout(playback, 700));
      }
    };
    pads.forEach((p, i) => p.addEventListener('pointerdown', (e) => { e.preventDefault(); press(i); }));
    pads.forEach((p, i) => p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(i); } }));
    unbind();
    onKey = (e) => { const n = Number(e.key); if (n >= 1 && n <= 4) press(n - 1); };
    document.addEventListener('keydown', onKey);
    playback();
  }
  intro();
  return { destroy() { clear(); unbind(); } };
}

const GAMES = { focus: focusGame, rhythm: thawGame, thaw: thawGame, social: socialGame, sequence: sequenceGame, spot: spotGame, rally: rallyGame };

export function mountGame(kind, el, opts) {
  const fn = GAMES[kind];
  if (!fn) {
    el.innerHTML = '<p class="note">This game could not load.</p>';
    return { destroy() {} };
  }
  return fn(el, { squad: false, mates: [], play: () => {}, ...opts });
}
