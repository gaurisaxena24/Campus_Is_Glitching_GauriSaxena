// End-to-end browser tests with no dependencies: drives a local headless
// Google Chrome over the DevTools protocol (Node 22 built-in WebSocket).
//
// Usage:  npm start            (in one terminal)
//         npm run e2e          (in another)
// Env:    E2E_URL      default http://localhost:5173/
//         E2E_OUT      screenshot folder (default: <os tmp>/campus-e2e)
//         CHROME_PATH  path to Chrome if not in the default macOS location
//
// Real mouse events are dispatched at element centres, so a control that is
// clipped, covered or off-screen fails the test.

import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.env.E2E_URL || 'http://localhost:5173/';
const OUT = process.env.E2E_OUT || join(tmpdir(), 'campus-e2e');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333 + Math.floor(Math.random() * 400);
mkdirSync(OUT, { recursive: true });

const results = [];
const errors = [];
let ws;
let seq = 0;
const pending = new Map();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function send(method, params = {}, timeout = 8000) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method} (page may be frozen)`)); }, timeout);
    pending.set(id, { resolve: (v) => { clearTimeout(t); resolve(v); }, reject: (e) => { clearTimeout(t); reject(e); } });
  });
}

async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`Eval error: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
  return r.result.value;
}

async function viewport(width, height, mobile = false) {
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: mobile });
  await sleep(250);
}

async function shot(name) {
  const r = await send('Page.captureScreenshot', { format: 'png' });
  const file = join(OUT, `${name}.png`);
  writeFileSync(file, Buffer.from(r.data, 'base64'));
  return file;
}

async function waitFor(expr, ms = 5000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await evaluate(`Boolean(${expr})`)) return true;
    await sleep(100);
  }
  throw new Error(`Timed out waiting for: ${expr}`);
}

// Click the element's centre with a real mouse event after checking it is
// visible, inside the game viewport, and the top-most element at that point.
async function click(selector) {
  const info = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return { err: 'not found' };
    el.scrollIntoView({ block: 'nearest' });
    const r = el.getBoundingClientRect();
    const vp = document.getElementById('game-viewport').getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { x, y, w: r.width, h: r.height, top: top ? (top.className && top.className.baseVal !== undefined ? top.className.baseVal : top.className) + ' <' + top.tagName + '>' : 'none', inside: r.left >= vp.left - 1 && r.right <= vp.right + 1 && r.top >= vp.top - 1 && r.bottom <= vp.bottom + 1, hit: top === el || el.contains(top) };
  })()`);
  if (info.err) throw new Error(`click ${selector}: ${info.err}`);
  if (!info.inside) throw new Error(`click ${selector}: element is outside the phone viewport`);
  if (!info.hit) throw new Error(`click ${selector}: element is covered by ${info.top}`);
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await send('Input.dispatchMouseEvent', { type, x: info.x, y: info.y, button: 'left', clickCount: 1 });
  }
  await sleep(120);
}

async function type(selector, text) {
  await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  await send('Input.insertText', { text });
  await sleep(60);
}

async function check(id, name, fn) {
  try {
    const detail = await fn();
    results.push({ id, name, ok: true, detail: detail || '' });
    console.log(`  PASS ${id} ${name}${detail ? ` (${detail})` : ''}`);
  } catch (e) {
    results.push({ id, name, ok: false, detail: e.message });
    console.log(`  FAIL ${id} ${name}: ${e.message}`);
  }
}

const geometry = () => evaluate(`(() => {
  const v = document.getElementById('game-viewport').getBoundingClientRect();
  const d = document.documentElement;
  return { left: v.left, top: v.top, width: v.width, height: v.height, winW: innerWidth, winH: innerHeight,
    pageOverflowX: d.scrollWidth > d.clientWidth, pageOverflowY: d.scrollHeight > d.clientHeight,
    innerOverflowX: [...document.querySelectorAll('#game-viewport *')].some((n) => { const r = n.getBoundingClientRect(); return r.width && (r.right > v.right + 1 || r.left < v.left - 1) && getComputedStyle(n).position !== 'fixed' && !n.closest('.map-world, .title-scene, .mission-hero, .intro-art, .toast-stack'); }) };
})()`);

// Visible map labels must not overlap each other (docs/05: labels stay readable).
const labelCollisions = () => evaluate(`(() => {
  const ps = [...document.querySelectorAll('.marker .plaque')].filter((p) => getComputedStyle(p).visibility !== 'hidden' && getComputedStyle(p).display !== 'none' && p.getBoundingClientRect().width);
  const out = [];
  const hit = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
  const fr = document.querySelector('.map-frame').getBoundingClientRect();
  const pins = [...document.querySelectorAll('.marker .pin-svg, .marker .dest-dot, .marker .marker-pips')];
  for (let i = 0; i < ps.length; i++) {
    const a = ps[i].getBoundingClientRect();
    if (a.left < fr.left || a.right > fr.right || a.top < fr.top || a.bottom > fr.bottom) out.push(ps[i].textContent + ' clipped at map edge');
    for (let j = i + 1; j < ps.length; j++) if (hit(a, ps[j].getBoundingClientRect())) out.push(ps[i].textContent + ' / ' + ps[j].textContent);
    const rank = (el) => Number(el.closest('.marker').dataset.rank || 0);
    // A label may sit over a less important marker (it is drawn on top); never under an equal or more important one.
    for (const pin of pins) if (pin.closest('.marker') !== ps[i].closest('.marker') && rank(pin) >= rank(ps[i]) && hit(a, pin.getBoundingClientRect())) out.push(ps[i].textContent + ' covered by a pin');
  }
  return out;
})()`);

const state = () => evaluate(`JSON.parse(localStorage.getItem('campus-glitching:session:v2') || 'null')`);

async function main() {
  const profile = mkdtempSync(join(tmpdir(), 'campus-chrome-'));
  const chrome = spawn(CHROME, [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio', '--use-fake-device-for-media-stream', 'about:blank',
  ], { stdio: 'ignore' });

  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(150);
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* starting */ }
  }
  if (!target) throw new Error('Could not start Chrome. Set CHROME_PATH.');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) {
      const p = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? p.reject(new Error(msg.error.message)) : p.resolve(msg.result);
    } else if (msg.method === 'Runtime.exceptionThrown') {
      errors.push(msg.params.exceptionDetails.exception?.description || msg.params.exceptionDetails.text);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      errors.push(msg.params.args.map((a) => a.value || a.description).join(' '));
    }
  };
  await send('Runtime.enable');
  await send('Page.enable');

  try {
    await run();
  } finally {
    ws.close();
    chrome.kill();
    await sleep(300);
    try { rmSync(profile, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

async function load() {
  await send('Page.navigate', { url: URL_ });
  await waitFor(`document.querySelector('.title-screen')`, 8000);
  await sleep(300);
}

async function run() {
  console.log(`E2E against ${URL_}\nScreenshots: ${OUT}\n`);
  const profile = () => evaluate(`JSON.parse(localStorage.getItem('campus-glitching:profile:v1') || 'null')`);
  const visible = (sel) => evaluate(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; })()`);
  const text = (sel) => evaluate(`(document.querySelector(${JSON.stringify(sel)}) || {}).textContent || ''`);

  // Play helpers -------------------------------------------------------
  async function openFromQuests(id) {
    await click('[data-tab="quests"]');
    await click(`[data-action="open-mission"][data-id="${id}"]`);
  }
  // After a physical part the field journal opens; every question is optional.
  async function skipJournal(id) {
    await waitFor(`document.querySelector('[data-reflect-form="${id}"]')`);
    await click(`[data-action="reflect-skip"][data-id="${id}"]`);
    await waitFor(`document.querySelector('.mission-hero')`);
  }
  async function physicalEarly(id) {
    await click(`[data-action="open-physical"][data-id="${id}"]`);
    if (await evaluate(`Boolean(document.querySelector('[data-action="walk-self"]'))`)) await click(`[data-action="walk-self"][data-id="${id}"]`);
    await click(`[data-action="phys-start"][data-id="${id}"]`);
    await click('[data-early="1"]');
    await skipJournal(id);
  }
  async function winGame() {
    await click('[data-game-start]');
    const kind = await evaluate(`document.querySelector('[data-game]').dataset.game`);
    const end = Date.now() + 45000;
    while (Date.now() < end) {
      if (await evaluate(`Boolean(document.querySelector('[data-game-continue]'))`)) break;
      if (kind === 'rhythm') {
        if (await evaluate(`Boolean(document.querySelector('.rhythm-pad.open'))`)) await click('.rhythm-pad.open');
        else await sleep(25);
      } else if (kind === 'focus') {
        if (await evaluate(`Boolean(document.querySelector('.focus-cell:not(.pop-good)'))`)) {
          try { await click('.focus-cell:not(.pop-good)'); } catch { await sleep(30); }
        } else await sleep(60);
      } else if (kind === 'social') {
        if (await evaluate(`Boolean(document.querySelector('[data-choice]'))`)) await click('[data-choice="0"]');
        else await sleep(80);
      } else if (kind === 'sequence') {
        const ready = await evaluate(`/Repeat/.test(document.querySelector('.game-foot').textContent)`);
        if (ready) {
          const seq = (await evaluate(`document.querySelector('[data-seq]').dataset.seq`)).split(',');
          for (const c of seq) await click(`[data-colour="${c}"]`);
        } else await sleep(150);
      } else if (kind === 'spot') {
        for (const id of ['a', 'b', 'c']) await click(`[data-spot="${id}"]:not(.found)`).catch(() => {});
      } else if (kind === 'rally') {
        if (await evaluate(`/Your turn/.test(document.querySelector('.game-foot').textContent)`)) {
          const seq = (await evaluate(`document.querySelector('[data-rally]').dataset.rally`)).split(',').map(Number);
          const round = Number((await evaluate(`document.querySelector('.game-ring b').textContent`)).split('/')[0]);
          for (const p of seq.slice(0, 3 + round)) await click(`[data-pad="${p}"]`);
          await sleep(300);
        } else await sleep(120);
      }
    }
    if (!(await evaluate(`Boolean(document.querySelector('[data-game-continue]'))`))) throw new Error(`could not win ${kind}`);
    await shot(`game-${kind}-won`);
    await click('[data-game-continue]');
    await sleep(200);
  }
  async function repair(id) {
    await click(`[data-action="repair"][data-id="${id}"]`);
    await sleep(1500);
    const s = await state();
    if (s.missions[id].status !== 'REPAIRED') throw new Error(`${id} not repaired`);
  }

  // Count geolocation watchers so duplicate or leaked watchers fail the run.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const g = navigator.geolocation; if (!g) return;
    const w = g.watchPosition.bind(g), c = g.clearWatch.bind(g); const st = window.__geo = { calls: 0, active: new Set(), max: 0 };
    g.watchPosition = function (...a) { st.calls++; const id = w(...a); st.active.add(id); st.max = Math.max(st.max, st.active.size); return id; };
    g.clearWatch = function (id) { st.active.delete(id); return c(id); }; })();
    (() => { const add = window.addEventListener.bind(window), rem = window.removeEventListener.bind(window); window.__motionListeners = new Set(); window.__motionMax = 0;
      window.addEventListener = function (type, fn, o) { if (type === 'devicemotion' && !String(fn).includes('n++')) { window.__motionListeners.add(fn); window.__motionMax = Math.max(window.__motionMax, window.__motionListeners.size); } return add(type, fn, o); };
      window.removeEventListener = function (type, fn, o) { if (type === 'devicemotion') window.__motionListeners.delete(fn); return rem(type, fn, o); }; })();` });
  const origin = new URL(URL_).origin;
  const geo = () => evaluate(`({ calls: window.__geo.calls, active: window.__geo.active.size, max: window.__geo.max })`);
  const M_PER_DEG = 111_195; // test positions are offsets from 0,0, not campus coordinates
  const setPos = (northM, accuracy = 5) => send('Emulation.setGeolocationOverride', { latitude: northM / M_PER_DEG, longitude: 0, accuracy });
  const setGeoPermission = (setting) => send('Browser.setPermission', { permission: { name: 'geolocation' }, setting, origin });
  const walkText = (k) => text(`[data-walk="${k}"]`);
  const track = async () => (await state()).tracks['frozen-character'];

  // ---------- MacBook presentation ----------
  await viewport(1440, 900);
  await load();
  await evaluate(`localStorage.clear()`);
  await load();
  await shot('01-title');

  await check('T-VP-01', 'phone viewport centred in a 1440x900 browser', async () => {
    const g = await geometry();
    const dx = Math.abs(g.left + g.width / 2 - g.winW / 2);
    const dy = Math.abs(g.top + g.height / 2 - g.winH / 2);
    if (dx > 2 || dy > 2) throw new Error(`off centre by ${dx}px, ${dy}px`);
    return `${Math.round(g.width)}x${Math.round(g.height)}`;
  });
  await check('T-VP-03', 'viewport fits height, ratio about 9:19.5', async () => {
    const g = await geometry();
    if (g.height > g.winH) throw new Error('taller than window');
    if (Math.abs(g.height / g.width - 19.5 / 9) > 0.05) throw new Error('ratio');
  });
  await check('S-SND', 'sound off by default, toggles and is remembered', async () => {
    if ((await evaluate(`document.querySelector('[data-action="toggle-sound"]').getAttribute('aria-pressed')`)) !== 'false') throw new Error('on by default');
    await click('[data-action="toggle-sound"]');
    const set = JSON.parse(await evaluate(`localStorage.getItem('campus-glitching:settings:v1')`));
    if (!set.sound) throw new Error('not saved');
    await click('[data-action="toggle-sound"]');
  });

  await check('S-OPEN', 'Start game: short onboarding, crest choice, Begin starts the session', async () => {
    await click('[data-action="start-game"]');
    await waitFor(`document.querySelector('.intro')`);
    await shot('02-intro-1');
    await click('[data-action="intro-next"]');
    await shot('03-intro-2');
    await click('[data-action="intro-next"]');
    await click('[data-avatar="leaf"]');
    await shot('04-intro-crest');
    await click('[data-action="intro-begin"]');
    await waitFor(`document.querySelector('.hud')`);
    const s = await state();
    if (s.session.status !== 'RUNNING') throw new Error(s.session.status);
    if ((await profile()).avatar !== 'leaf') throw new Error('avatar not saved');
    await sleep(800);
    if (await visible('.sheet')) throw new Error('map opened with an automatic location sheet');
    await shot('05-map-open');
  });

  await check('S-MAP', 'map shows glitching, locked and place markers', async () => {
    const states = await evaluate(`[...document.querySelectorAll('.marker[data-state]')].map(m => m.dataset.dest + ':' + m.dataset.state)`);
    if (!states.includes('arjuna:AVAILABLE') || !states.includes('library:LOCKED')) throw new Error(states.join(','));
    if (!states.includes('eating-place:LOCKED') || !states.includes('housing:LOCKED')) throw new Error(states.join(','));
    await click('.marker[data-dest="library"]');
    await waitFor(`document.querySelector('.sheet')`);
    if (!(await text('.sheet')).includes('Complete the previous challenge to unlock this.')) throw new Error('locked marker has no prerequisite explanation');
    if (await visible('.mission-hero')) throw new Error('locked marker opened a mission');
    await click('.sheet-close');
    await waitFor(`!document.querySelector('.sheet') && !document.querySelector('[data-layer="sheet"] .scrim')`);
  });

  await check('T-STA-01', 'Frozen Character: accept, repair refused early, physical + rhythm game, then repair', async () => {
    await click('.marker[data-dest="arjuna"]');
    await waitFor(`document.querySelector('.sheet')`);
    await click('.sheet [data-action="open-mission"]');
    await waitFor(`document.querySelector('.mission-hero')`);
    if ((await state()).missions['frozen-character'].status !== 'UNDISCOVERED') throw new Error('opening details started the challenge');
    await click('[data-action="back"]');
    if ((await state()).missions['frozen-character'].status !== 'UNDISCOVERED') throw new Error('closing details changed challenge state');
    await click('.marker[data-dest="arjuna"]');
    await waitFor(`document.querySelector('.sheet')`);
    await click('.sheet [data-action="open-mission"]');
    await waitFor(`document.querySelector('.mission-hero')`);
    await click('[data-action="activate"][data-id="frozen-character"]');
    await waitFor(`document.querySelector('.mission-hero')`);
    await shot('06-mission');
    await click('[data-action="repair"]');
    let s = await state();
    if (s.missions['frozen-character'].status !== 'ACTIVE') throw new Error('repaired early');
    if (!(await visible('.toast--error'))) throw new Error('no error feedback');
    await shot('07-repair-refused');
    await physicalEarly('frozen-character');
    s = await state();
    if (!s.missions['frozen-character'].physicalComplete) throw new Error('physical not recorded');
    await click('[data-tab="map"]');
    if (await visible('.sheet')) throw new Error('returning to Map reopened Frozen Character');
    await click('.marker[data-dest="arjuna"]');
    await waitFor(`document.querySelector('.sheet')`);
    await sleep(400);
    if (!(await text('.sheet')).includes('Continue')) throw new Error('active quest has no Continue action');
    await click('.sheet button.btn[data-action="close-sheet"]');
    await waitFor(`!document.querySelector('.sheet')`);
    await click('.marker[data-dest="arjuna"]');
    await waitFor(`document.querySelector('.sheet')`);
    await sleep(400);
    await click('.sheet-open-mission[data-id="frozen-character"]');
    await waitFor(`document.querySelector('.mission-hero')`);
    await click('[data-action="repair"]');
    s = await state();
    if (s.missions['frozen-character'].status === 'REPAIRED') throw new Error('repaired with one part');
    await click('[data-action="open-digital"][data-id="frozen-character"]');
    await shot('08-rhythm-intro');
    await winGame();
    s = await state();
    if (!s.missions['frozen-character'].digitalComplete) throw new Error('digital not recorded');
    await shot('09-ready');
    await repair('frozen-character');
    await shot('10-repaired-map');
  });

  await check('T-TOK-01', '2 tokens, restoration 20%, XP awarded, next area unlocked, badge', async () => {
    const s = await state();
    const p = await profile();
    const pct = await text('.hud-restore b');
    if ((await text('.hud-tokens b')) !== '2') throw new Error('tokens');
    if (pct !== '20%') throw new Error(`restore ${pct}`);
    if (p.xp < 90) throw new Error(`xp ${p.xp}`);
    if (!p.badges['first-repair']) throw new Error('no first-repair badge');
    const st = await evaluate(`document.querySelector('.marker[data-dest="library"]').dataset.state`);
    if (st !== 'AVAILABLE') throw new Error(`library ${st}`);
    if (!(await visible('.repair-banner'))) throw new Error('no success banner');
    return `${p.xp} XP`;
  });

  await check('T-TOK-05', 'reload keeps progress and never re-awards XP or tokens', async () => {
    const xp = (await profile()).xp;
    await load();
    await click('[data-action="continue"]');
    await waitFor(`document.querySelector('.hud')`);
    if ((await text('.hud-tokens b')) !== '2') throw new Error('tokens changed');
    if ((await profile()).xp !== xp) throw new Error('xp changed');
    if (await visible('.sheet')) throw new Error('a location sheet reopened without an explicit selection');
    await click('[data-tab="quests"]');
    await click('[data-tab="map"]');
    if (await visible('.sheet')) throw new Error('switching back to Map reopened the selected quest');
    await click('.marker[data-dest="arjuna"]');
    await waitFor(`document.querySelector('.sheet')`);
    await sleep(400);
    if (!(await text('.sheet')).includes('Frozen Character')) throw new Error('Arjuna opened the wrong quest');
    await click('.sheet-close');
    if (await visible('.sheet')) throw new Error('close did not dismiss the quest sheet');
    await click('[data-tab="quests"]');
    await click('[data-tab="map"]');
    if (await visible('.sheet')) throw new Error('closed quest sheet reopened after tab navigation');
    const saved = await state();
    if (!saved.missions['frozen-character'].physicalComplete || !saved.missions['frozen-character'].digitalComplete || saved.missions['frozen-character'].status !== 'REPAIRED') throw new Error('Frozen Character progress was not preserved');
    return 'saved progress preserved; sheet opens only from marker selection';
  });

  await check('S-FOCUS', 'Low Battery: focus minigame (digital first) then physical, repair', async () => {
    await openFromQuests('low-battery');
    await click('[data-action="activate"]');
    await click('[data-action="open-digital"][data-id="low-battery"]');
    await winGame();
    await physicalEarly('low-battery');
    await repair('low-battery');
  });

  await check('S-SOCIAL', 'Missing Connection: consent required, branching chat, repair', async () => {
    await openFromQuests('missing-connection');
    await click('[data-action="activate"]');
    await click('[data-action="open-physical"][data-id="missing-connection"]');
    await click('[data-action="complete-physical"]');
    if ((await state()).missions['missing-connection'].physicalComplete) throw new Error('completed without consent');
    await click('[data-consent]');
    await click('[data-action="complete-physical"]');
    await skipJournal('missing-connection');
    if ((await state()).missions['missing-connection'].digitalComplete) throw new Error('physical completed the digital part');
    await click('[data-action="open-digital"][data-id="missing-connection"]');
    await waitFor(`document.querySelector('.episode-card')`);
    if (!/Scripted story engine \(no AI\)/.test(await text('.engine-tag'))) throw new Error('engine not labelled');
    await shot('26-episode-choose');
    await click('.episode-card[data-episode="quiet-sketcher"]');
    const waitReply = () => waitFor(`!document.querySelector('.bubble--typing')`, 4000);
    await click('.suggest-chip');
    await waitFor(`document.querySelector('.bubble--typing')`, 2000);
    await waitReply();
    await type('#ep-input', 'What are you sketching right now?');
    await click('[data-episode-form] button[type="submit"]');
    await waitReply();
    const reply = await evaluate(`[...document.querySelectorAll('.bubble--character')].pop().textContent`);
    if (!/sketch|ink|bird|bulbul/i.test(reply)) throw new Error(`reply ignores the question: ${reply}`);
    await shot('27-episode-chat');
    await load();
    await click('[data-action="continue"]');
    await waitFor(`document.querySelector('.hud')`);
    await openFromQuests('missing-connection');
    await click('[data-action="open-digital"][data-id="missing-connection"]');
    await waitFor(`document.querySelectorAll('.bubble--player').length === 2`, 3000);
    for (let i = 0; i < 3; i++) { await click('.suggest-chip:nth-child(2)'); await waitReply(); }
    await waitFor(`document.querySelector('.episode-result')`);
    if (await evaluate(`Boolean(document.querySelector('.suggest-chip, #ep-input'))`)) throw new Error('a sixth message is possible');
    const res = await text('.episode-result');
    if (!/You did well/.test(res) || !/Next time/.test(res) || !/Friendliness/.test(res)) throw new Error(res);
    await shot('28-episode-result');
    await click('[data-action="episode-finish"]');
    const m = (await state()).missions['missing-connection'];
    if (!m.digitalComplete || !m.result.rank) throw new Error(JSON.stringify(m));
    await repair('missing-connection');
    return m.result.rank;
  });

  // Generated test images, uploaded through the real file input.
  async function upload(draw) {
    await evaluate(`(async () => { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d');
      ${draw}
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      const dt = new DataTransfer(); dt.items.add(new File([blob], 'photo.png', { type: 'image/png' }));
      const inp = document.querySelector('[data-cam-file]'); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await waitFor(`document.querySelector('.cam-result')`, 5000);
  }
  // A shaded object in the target colour, photographed against a different background each time.
  const BACKGROUNDS = [
    "g.fillStyle = '#ece8e0'; g.fillRect(0, 0, 320, 240);",
    "g.fillStyle = '#1e1e1e'; g.fillRect(0, 0, 160, 240); g.fillStyle = '#f0f0f0'; g.fillRect(160, 0, 160, 240);",
    "for (let x = 0; x < 320; x += 40) { g.fillStyle = (x / 40) % 2 ? '#111' : '#f2f2f2'; g.fillRect(x, 0, 40, 240); }",
    "const gr = g.createLinearGradient(0, 0, 0, 240); gr.addColorStop(0, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, 320, 240);",
  ];
  const objectDraw = (hex, k) => `${BACKGROUNDS[k]} const sh = g.createRadialGradient(130, 95, 10, 160, 120, 120); sh.addColorStop(0, '${hex}'); sh.addColorStop(1, '${hex}');
    g.fillStyle = sh; g.beginPath(); g.ellipse(160, 120, 112, 92, ${k} * 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.ellipse(175, 140, 80, 50, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.beginPath(); g.arc(125, 90, 14, 0, Math.PI * 2); g.fill();`;

  await check('S-COLOUR', 'Lost Colour photo hunt: colour analysed on device; mismatches, duplicates and failures give no progress; 5 passes complete it', async () => {
    await openFromQuests('lost-colour');
    await click('[data-action="activate"]');
    await click('[data-action="open-physical"][data-id="lost-colour"]');
    await waitFor(`document.querySelector('.hunt-target')`);
    const target = (await state()).hunts['lost-colour'].target;
    const hex = await evaluate(`import('/src/js/game/colour.js').then((m) => m.COLOUR_TARGETS.find((c) => c.id === '${target}').hex)`);
    const other = target === 'red' ? '#2a5bd7' : '#c8321e';
    await shot('29-hunt');
    // Camera permission refused: a clear message, upload still offered.
    await send('Browser.setPermission', { permission: { name: 'camera' }, setting: 'denied', origin });
    await click('[data-action="cam-open"]');
    await waitFor(`/refused/.test(document.querySelector('[role="alert"]')?.textContent || '')`);
    if (!(await visible('.cam-upload'))) throw new Error('no upload fallback');
    // Camera allowed (Chrome's fake device): live preview, take a picture, it is analysed for real.
    await send('Browser.setPermission', { permission: { name: 'camera' }, setting: 'granted', origin });
    await click('[data-action="cam-open"]');
    await waitFor(`document.querySelector('[data-cam-video]')?.videoWidth > 0`, 6000);
    await click('[data-action="cam-snap"]');
    await waitFor(`document.querySelector('.cam-result')`);
    await click('[data-action="cam-retake"]');
    // Wrong colour: an image of another colour with a thin target-coloured border.
    await upload(`g.fillStyle = '${other}'; g.fillRect(0, 0, 320, 240); g.strokeStyle = '${hex}'; g.lineWidth = 8; g.strokeRect(4, 4, 312, 232);`);
    if ((await evaluate(`document.querySelector('[data-action="cam-add"]').getAttribute('aria-disabled')`)) !== 'true') throw new Error('mismatch allowed');
    await click('[data-action="cam-add"]');
    if ((await state()).hunts['lost-colour'].items.length) throw new Error('progress for a failed match');
    await shot('30-hunt-mismatch');
    await click('[data-action="cam-retake"]');
    // Competing colours: half and half is uncertain until the player taps the object.
    await upload(`g.fillStyle = '${hex}'; g.fillRect(0, 0, 160, 240); g.fillStyle = '${other}'; g.fillRect(160, 0, 160, 240);`);
    const before = await evaluate(`document.querySelector('.cam-result').dataset.status`);
    await evaluate(`(() => { const c = document.querySelector('[data-cam-preview]'); const r = c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width * 0.25, clientY: r.top + r.height * 0.5 })); })()`);
    await waitFor(`document.querySelector('.cam-result').dataset.status === 'pass'`, 3000);
    await shot('31-hunt-region');
    await click('[data-action="cam-add"]');
    await waitFor(`!document.querySelector('.cam-result')`);
    // Duplicate: the same photo again is flagged.
    await upload(`g.fillStyle = '${hex}'; g.fillRect(0, 0, 160, 240); g.fillStyle = '${other}'; g.fillRect(160, 0, 160, 240);`);
    await evaluate(`(() => { const c = document.querySelector('[data-cam-preview]'); const r = c.getBoundingClientRect(); c.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width * 0.25, clientY: r.top + r.height * 0.5 })); })()`);
    await sleep(300);
    if (!/already added/.test(await text('.cam-result'))) throw new Error('duplicate not flagged');
    await click('[data-action="cam-retake"]');
    for (let k = 0; k < 4; k++) {
      await upload(objectDraw(hex, k));
      const st = await evaluate(`document.querySelector('.cam-result').dataset.status`);
      if (st !== 'pass') throw new Error(`object ${k}: ${st} ${await text('.cam-result')}`);
      await click('[data-action="cam-add"]');
      await waitFor(`!document.querySelector('.cam-result')`);
    }
    const items = (await state()).hunts['lost-colour'].items;
    if (items.length !== 5) throw new Error(`${items.length} items`);
    if (JSON.stringify(await state()).includes('data:image')) throw new Error('photo saved');
    await shot('32-hunt-full');
    await click('[data-action="complete-physical"]');
    await skipJournal('lost-colour');
    const m = (await state()).missions['lost-colour'];
    if (m.physicalMethod !== 'photo' || m.digitalComplete) throw new Error(JSON.stringify(m));
    return `target ${target}; uncertain first: ${before}`;
  });

  await check('S-PATTERN', 'Lost Colour pattern: two rounds, mistakes explained, round reward once, survives reload, completes digital only', async () => {
    await click('[data-action="open-digital"][data-id="lost-colour"]');
    await waitFor(`document.querySelector('.pattern-seq')`);
    await shot('33-pattern-r1');
    const ps = (await state()).puzzles['lost-colour'];
    const r1 = ps.rounds[0];
    const wrong = r1.solution.map((t) => r1.palette.find((p) => p !== t));
    for (const t of wrong) await click(`[data-action="pattern-pick"][data-tile="${t}"]`);
    await click('[data-action="pattern-submit"]');
    if (!/not fit|Look|tile/i.test(await text('.pattern-feedback'))) throw new Error('no explanation');
    if ((await state()).puzzles['lost-colour'].attempts[0] !== 1) throw new Error('attempt not counted');
    await click('[data-action="pattern-undo"]');
    await click('[data-action="pattern-reset"]');
    const xp0 = (await profile()).xp;
    for (const t of r1.solution) await click(`[data-action="pattern-pick"][data-tile="${t}"]`);
    await click('[data-action="pattern-submit"]');
    await waitFor(`/Round 2/.test(document.querySelector('.pattern-head').textContent)`);
    const xp1 = (await profile()).xp;
    if (xp1 - xp0 !== 15) throw new Error(`round reward ${xp1 - xp0}`);
    await shot('34-pattern-r2');
    await load();
    await click('[data-action="continue"]');
    await waitFor(`document.querySelector('.hud')`);
    await openFromQuests('lost-colour');
    await click('[data-action="open-digital"][data-id="lost-colour"]');
    await waitFor(`/Round 2/.test(document.querySelector('.pattern-head').textContent)`);
    if ((await profile()).xp !== xp1) throw new Error('reward repeated on reload');
    const r2 = (await state()).puzzles['lost-colour'].rounds[1];
    for (const t of r2.solution) await click(`[data-action="pattern-pick"][data-tile="${t}"]`);
    await click('[data-action="pattern-submit"]');
    await waitFor(`document.querySelector('[data-action="pattern-finish"]')`);
    await shot('35-pattern-done');
    await click('[data-action="pattern-finish"]');
    const m = (await state()).missions['lost-colour'];
    if (!m.digitalComplete || !m.physicalComplete) throw new Error(JSON.stringify(m));
    // The inventory shows what was collected: 5 colour swatches, 2/2 pattern rounds, the episode rank.
    await click('[data-tab="inventory"]');
    await waitFor(`document.querySelector('.field-finds')`);
    const finds = await text('.field-finds');
    if ((await evaluate(`document.querySelectorAll('.field-finds .find-swatch.on').length`)) !== 5) throw new Error('swatches missing: ' + finds);
    if (!/2 of 2 restored/.test(finds) || !/Quiet Sketcher/.test(finds)) throw new Error(finds);
    await shot('36-inventory-finds');
    await openFromQuests('lost-colour');
    await repair('lost-colour');
  });

  await check('S-VICTORY', 'Time Loop: spot-the-change, final repair, victory screen', async () => {
    await openFromQuests('time-loop');
    await click('[data-action="activate"]');
    await click('[data-action="open-digital"][data-id="time-loop"]');
    await winGame();
    await physicalEarly('time-loop');
    await click('[data-action="repair"][data-id="time-loop"]');
    await waitFor(`document.querySelector('.summary-screen.is-victory')`, 9000);
    await sleep(1000);
    await shot('12-victory');
    const s = await state();
    const p = await profile();
    if (s.session.endReason !== 'VICTORY') throw new Error(s.session.endReason);
    if (!p.badges.restored) throw new Error('no restored badge');
    return `${p.xp} XP, ${Object.keys(p.badges).length} badges`;
  });

  await check('S-SQUAD', 'local squad: create, labelled Local, rally plays, squad XP saved', async () => {
    await click('[data-action="play-again"]');
    await waitFor(`document.querySelector('.hud')`);
    await click('[data-tab="squad"]');
    await shot('13-squad-form');
    await click('[data-squad-form] button[type="submit"]');
    if (!(await visible('.toast--error'))) throw new Error('empty squad accepted');
    await type('[data-squad-form] input[name="name"]', 'Night Owls');
    await click('[data-mate="ira"]');
    await click('[data-mate="meera"]');
    await click('[data-squad-form] button[type="submit"]');
    await waitFor(`document.querySelector('.squad-banner')`);
    const p = await profile();
    if (p.squad.mode !== 'squad' || p.squad.members.length !== 2) throw new Error(JSON.stringify(p.squad));
    if (!(await visible('.local-chip'))) throw new Error('no Local label');
    const body = await evaluate(`document.body.innerText`);
    if (/online|syncing|players online/i.test(body)) throw new Error('implies online play');
    await shot('14-squad');
    // Nothing repaired in this new game, so the rally is locked: no Play button.
    if (await evaluate(`Boolean(document.querySelector('[data-action="open-rally"]'))`)) throw new Error('rally playable while locked');
    if (!(await visible('.rally-card.is-locked'))) throw new Error('rally not shown as locked');
    // Unlock via the accessibility setting, then play the rally for real.
    await click('[data-tab="status"]');
    await click('[data-action="toggle-unlock"]');
    await click('[data-tab="squad"]');
    await click('[data-action="open-rally"]');
    await waitFor(`document.querySelector('[data-game="rally"]')`);
    await winGame();
    const after = await profile();
    if (!(after.squad.xp > 0)) throw new Error(`squad xp ${after.squad.xp}`);
    if (after.squad.rallyBest !== 4) throw new Error(`rallyBest ${after.squad.rallyBest}`);
    await click('[data-tab="status"]');
    await click('[data-action="toggle-unlock"]');
  });

  await check('S-DAILY', 'daily challenge pays XP once and updates streak', async () => {
    await click('[data-tab="inventory"]');
    const before = (await profile()).xp;
    await click('[data-action="daily-done"]');
    const p = await profile();
    if (p.xp !== before + 30) throw new Error(`xp ${before} -> ${p.xp}`);
    if (!p.days.length) throw new Error('no day recorded');
    await shot('15-rewards');
  });

  // ---------- GPS walk (real Geolocation API, driven by Chrome's emulation) ----------
  let north = 0;
  await check('GPS-ASK', 'location is not requested until the player chooses GPS; consent text shown first', async () => {
    await setGeoPermission('denied');
    await openFromQuests('frozen-character');
    await click('[data-action="activate"]');
    await click('[data-action="open-physical"][data-id="frozen-character"]');
    await waitFor(`document.querySelector('.walk-intro')`);
    const intro = await text('.walk-intro');
    if (!/stays on this phone/.test(intro) || !/never coordinates/.test(intro)) throw new Error('no explanation');
    if ((await geo()).calls !== 0) throw new Error('location requested before consent');
    await shot('20-gps-intro');
  });
  await check('GPS-DENIED', 'permission denied: plain message, retry, self-report option, no fake data, watcher cleared', async () => {
    await click('[data-action="walk-start"]');
    await waitFor(`/permission off/i.test(document.querySelector('[data-walk="signal"]')?.textContent || '')`, 8000);
    if (!(await visible('[data-action="walk-retry"]'))) throw new Error('no retry');
    if (!(await visible('[data-walk-panel] [data-action="walk-self"]'))) throw new Error('no self-report option');
    if ((await walkText('distance')) !== '0 m' || (await walkText('coords')) !== '–') throw new Error('fake data shown');
    if ((await geo()).active !== 0) throw new Error('watcher left running after denial');
    await shot('21-gps-denied');
  });
  await check('GPS-LIVE', 'granted: live accuracy and coordinates; drift and jumps ignored; walking adds distance', async () => {
    await setGeoPermission('granted');
    await setPos(north);
    await click('[data-action="walk-retry"]');
    await waitFor(`/GPS signal good/.test(document.querySelector('[data-walk="signal"]').textContent)`, 8000);
    if ((await walkText('accuracy')) !== '±5 m') throw new Error(await walkText('accuracy'));
    if (!/^0\.0+, 0\.0+$/.test(await walkText('coords'))) throw new Error(`coords ${await walkText('coords')}`);
    for (const j of [3, -2, 4, 1, -3]) { await setPos(north + j); await sleep(700); }
    if ((await walkText('distance')) !== '0 m') throw new Error(`drift counted: ${await walkText('distance')}`);
    for (let i = 0; i < 4; i++) { north += 10; await setPos(north); await sleep(2200); }
    const d1 = parseInt(await walkText('distance'), 10);
    if (d1 < 30 || d1 > 45) throw new Error(`walk distance ${d1}`);
    await setPos(north + 2000); await sleep(1200);
    if (parseInt(await walkText('distance'), 10) !== d1) throw new Error('jump counted');
    north += 10; await setPos(north); await sleep(1500);
    if (parseInt(await walkText('distance'), 10) < d1 + 9) throw new Error('walking after a jump not counted');
    const g = await geo();
    if (g.active !== 1 || g.max > 1) throw new Error(`watchers ${JSON.stringify(g)}`);
    await shot('22-gps-live');
    return `${await walkText('distance')}`;
  });
  await check('GPS-PAUSE', 'pause stops counting and clears the watcher; resume adds no distance for the gap', async () => {
    const before = (await track()).distanceM;
    await click('[data-action="walk-pause"]');
    if ((await geo()).active !== 0) throw new Error('watcher still running while paused');
    north += 150; await setPos(north); await sleep(1500);
    await click('[data-action="walk-resume"]');
    await sleep(2500);
    if (Math.abs((await track()).distanceM - before) > 0.5) throw new Error(`gap counted: ${before} -> ${(await track()).distanceM}`);
    const g = await geo();
    if (g.active !== 1 || g.max > 1) throw new Error(`watchers ${JSON.stringify(g)}`);
  });
  await check('GPS-SHORT', 'finishing with too little time/movement is refused (timer alone never completes it)', async () => {
    if ((await evaluate(`document.querySelector('[data-walk-finish]').getAttribute('aria-disabled')`)) !== 'true') throw new Error('finish enabled');
    await click('[data-walk-finish]');
    if (!(await visible('.toast--error'))) throw new Error('no feedback');
    if ((await state()).missions['frozen-character'].physicalComplete) throw new Error('completed without enough data');
  });
  await check('GPS-NAV', 'navigating away keeps tracking (walk bar) and coming back shows the panel', async () => {
    await click('[data-tab="map"]');
    await waitFor(`!document.querySelector('.walk-bar').hidden`);
    if (!/Walk tracking/.test(await text('.walk-bar'))) throw new Error(await text('.walk-bar'));
    await shot('23-gps-walkbar');
    await click('.walk-bar');
    await waitFor(`document.querySelector('[data-walk-panel]')`);
  });
  await check('GPS-RELOAD', 'reload: walk comes back paused with its distance; no watcher until resumed', async () => {
    const before = (await track()).distanceM;
    await load();
    if ((await geo()).calls !== 0) throw new Error('location requested on page load');
    await click('[data-action="continue"]');
    await waitFor(`document.querySelector('.hud')`);
    const t = await track();
    if (t.status !== 'PAUSED' || Math.abs(t.distanceM - before) > 0.5) throw new Error(JSON.stringify(t));
    if (JSON.stringify(await state()).match(/"lat"|"lon"|latitude/)) throw new Error('coordinates saved');
    await openFromQuests('frozen-character');
    await click('[data-action="open-physical"][data-id="frozen-character"]');
    await waitFor(`document.querySelector('[data-action="walk-resume"]')`);
    // Desktop Chrome has no accelerometer: from here a TEST signal (1.8 Hz walking
    // pattern) is dispatched as real devicemotion events into the game's listener.
    await evaluate(`window.__motion = setInterval(() => { const t = performance.now() / 1000;
      window.dispatchEvent(new DeviceMotionEvent('devicemotion', { accelerationIncludingGravity: { x: 0.3, y: 0.2, z: 9.81 + 2.5 * Math.sin(2 * Math.PI * 1.8 * t) }, interval: 20 })); }, 20)`);
    await click('[data-action="walk-resume"]');
    await waitFor(`/GPS signal good/.test(document.querySelector('[data-walk="signal"]').textContent)`, 8000);
  });
  await check('GPS-STEPS', 'motion data switches the walk to estimated steps (labelled), counted live', async () => {
    await waitFor(`/Motion sensor on/.test(document.querySelector('[data-walk="motion"]').textContent)`, 6000);
    await sleep(6000);
    const n = Number(await walkText('steps'));
    if (!(n >= 5)) throw new Error(`steps ${n}`);
    if (!/Steps \(estimated\)/.test(await text('[data-walk-panel]'))) throw new Error('not labelled estimated');
    await shot('23b-steps-live');
    return `${n} steps after ~6 s`;
  });
  await check('GPS-WALK', 'a 2-minute tracked walk with the step target is verified (method steps), then the journal opens', async () => {
    const end = Date.now() + 170_000;
    while (Date.now() < end) {
      const t = await track();
      if (t && t.activeMs >= 121_000 && t.steps >= 150) break;
      north += 10; await setPos(north); await sleep(2500);
    }
    await waitFor(`document.querySelector('[data-walk-finish]').getAttribute('aria-disabled') === 'false'`, 6000);
    await shot('24-gps-verified');
    await click('[data-walk-finish]');
    await waitFor(`document.querySelector('[data-reflect-form="frozen-character"]')`);
    const m = (await state()).missions['frozen-character'];
    if (!m.physicalComplete || m.physicalMethod !== 'steps' || !(m.walk.steps >= 150)) throw new Error(JSON.stringify(m));
    if (m.digitalComplete) throw new Error('digital completed too');
    if ((await geo()).active !== 0) throw new Error('watcher left running after finish');
    if ((await evaluate(`window.__motionListeners.size`)) !== 0) throw new Error('motion listener left running after finish');
    if ((await evaluate(`window.__motionMax`)) > 1) throw new Error('duplicate motion listeners');
    await evaluate(`clearInterval(window.__motion)`);
    return `${m.walk.steps} estimated steps, ${Math.round(m.walk.distanceM)} m GPS, ${Math.round(m.walk.activeMs / 1000)} s`;
  });
  await check('JOURNAL', 'reflection: save, persists across reload, reopen from inventory, edit; skipped questions allowed', async () => {
    await shot('25-journal');
    await type('[data-reflect-form] textarea[name="a0"]', 'A green door with a brass knocker');
    await click('[data-reflect-form] button[type="submit"]');
    await waitFor(`document.querySelector('.mission-hero')`);
    let r = (await state()).reflections['frozen-character'];
    if (r.answers[0] !== 'A green door with a brass knocker' || r.answers[1] !== '') throw new Error(JSON.stringify(r));
    if ((await state()).missions['frozen-character'].status !== 'ACTIVE') throw new Error('journal changed mission state');
    await load();
    await click('[data-action="continue"]');
    await waitFor(`document.querySelector('.hud')`);
    await click('[data-tab="inventory"]');
    await click('.journal-row[data-id="frozen-character"]');
    await waitFor(`document.querySelector('[data-reflect-form="frozen-character"]')`);
    if ((await evaluate(`document.querySelector('[name="a0"]').value`)) !== 'A green door with a brass knocker') throw new Error('not restored');
    await type('[data-reflect-form] textarea[name="a1"]', 'Warmer');
    await click('[data-reflect-form] button[type="submit"]');
    r = (await state()).reflections['frozen-character'];
    if (r.answers[1] !== 'Warmer') throw new Error('edit not saved');
  });
  await send('Emulation.clearGeolocationOverride');

  // ---------- Sizes ----------
  await check('T-VP-02', 'wide 1920x1080 keeps phone width', async () => {
    await viewport(1920, 1080);
    const g = await geometry();
    if (g.width > 430 || g.pageOverflowX) throw new Error(`width ${g.width}`);
  });
  await check('T-VP-05', 'short 1280x600: fits, no page scroll, tabs reachable', async () => {
    await viewport(1280, 600);
    const g = await geometry();
    if (g.height > g.winH || g.pageOverflowY || g.pageOverflowX) throw new Error('overflow');
    await click('[data-tab="status"]');
    await click('[data-tab="map"]');
    await sleep(400);
    const c = await labelCollisions();
    if (c.length) throw new Error(`labels: ${c.join('; ')}`);
    await shot('16-short');
  });
  await check('T-VP-10', 'phone 390x844: full screen, no overflow, labels readable', async () => {
    await viewport(390, 844, true);
    const g = await geometry();
    if (Math.round(g.width) !== 390 || g.pageOverflowX || g.innerOverflowX) throw new Error('size/overflow');
    await sleep(400);
    const c = await labelCollisions();
    if (c.length) throw new Error(`labels: ${c.join('; ')}`);
    await shot('17-phone-map');
    for (const tab of ['quests', 'inventory', 'squad', 'status']) {
      await click(`[data-tab="${tab}"]`);
      if ((await geometry()).innerOverflowX) throw new Error(`overflow on ${tab}`);
      await shot(`18-phone-${tab}`);
    }
  });
  await check('T-RES-320', 'small phone 320x568: no overflow', async () => {
    await viewport(320, 568, true);
    for (const tab of ['map', 'quests', 'inventory']) {
      await click(`[data-tab="${tab}"]`);
      if ((await geometry()).innerOverflowX) throw new Error(`overflow on ${tab}`);
    }
    await shot('19-phone-320');
  });

  await check('S-RESET', 'Reset progress needs confirmation and clears XP', async () => {
    await viewport(1440, 900);
    await click('[data-tab="status"]');
    await click('[data-action="reset-progress"]');
    await waitFor(`document.querySelector('[data-action="confirm-yes"]')`);
    await click('[data-action="confirm-yes"]');
    await waitFor(`document.querySelector('.title-screen')`);
    if ((await profile())) throw new Error('profile still stored');
  });

  await check('ERR', 'no JavaScript errors during the run', async () => {
    if (errors.length) throw new Error(errors.slice(0, 3).join(' | '));
  });

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
  writeFileSync(join(OUT, 'results.json'), JSON.stringify({ when: new Date().toISOString(), url: URL_, results }, null, 2));
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error('E2E aborted:', e.message);
  process.exitCode = 1;
});
