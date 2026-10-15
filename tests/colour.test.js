import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  COLOUR_TARGETS, srgbToLab, deltaE, nameColour, analyseImage, matchTarget,
  imageHash, hashDistance, layoutDistance, isLikelyDuplicate, pickTargets, HASH_RE, DUPLICATE_RULES,
} from '../src/js/game/colour.js';

/* ---------- synthetic image helpers (ImageData-like, no DOM) ---------- */

// Build a w x h image; paint(x, y) returns [r, g, b] or [r, g, b, a].
function makeImage(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a = 255] = paint(x, y);
      const i = (y * w + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;
    }
  }
  return { width: w, height: h, data };
}
const solid = (rgb, w = 80, h = 80) => makeImage(w, h, () => rgb);
const close = (actual, expected, tol, label) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${label}: ${actual} vs ${expected}`);
const named = (r, g, b) => nameColour(srgbToLab(r, g, b)).id;

/* ---------- Lab conversion and deltaE ---------- */

test('srgbToLab matches known D65 values', () => {
  const white = srgbToLab(255, 255, 255);
  close(white[0], 100, 0.01, 'white L'); close(white[1], 0, 0.01, 'white a'); close(white[2], 0, 0.01, 'white b');
  const black = srgbToLab(0, 0, 0);
  close(black[0], 0, 0.01, 'black L');
  const red = srgbToLab(255, 0, 0);
  close(red[0], 53.24, 0.02, 'red L'); close(red[1], 80.09, 0.02, 'red a'); close(red[2], 67.2, 0.02, 'red b');
  const blue = srgbToLab(0, 0, 255);
  close(blue[0], 32.3, 0.05, 'blue L'); close(blue[1], 79.19, 0.05, 'blue a'); close(blue[2], -107.86, 0.05, 'blue b');
});

test('deltaE (CIEDE2000): identical = 0, symmetric, Sharma et al. published pairs', () => {
  const p = [50, 2.6772, -79.7751];
  assert.equal(deltaE(p, p), 0);
  const q = [50, 0, -82.7485];
  close(deltaE(p, q), 2.0425, 0.0001, 'Sharma pair 1');
  assert.equal(deltaE(p, q), deltaE(q, p));
  close(deltaE([50, 0, 0], [50, -1, 2]), 2.3669, 0.0001, 'Sharma pair 7');
  close(deltaE([50, 2.5, 0], [73, 25, -18]), 27.1492, 0.0001, 'Sharma pair 17');
  const a = srgbToLab(10, 200, 30); const b = srgbToLab(200, 30, 90);
  close(deltaE(a, b), deltaE(b, a), 1e-9, 'symmetric');
});

/* ---------- naming ---------- */

test('targets include the seven playable colours plus non-target naming classes', () => {
  const ids = COLOUR_TARGETS.map((t) => t.id);
  for (const id of ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink']) {
    assert.equal(COLOUR_TARGETS.find((t) => t.id === id).target, true, id);
  }
  for (const id of ['teal', 'brown', 'white', 'grey', 'black']) {
    assert.equal(COLOUR_TARGETS.find((t) => t.id === id).target, false, id);
  }
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(Object.isFrozen(COLOUR_TARGETS) && Object.isFrozen(COLOUR_TARGETS[0]) && Object.isFrozen(COLOUR_TARGETS[0].lab));
  for (const t of COLOUR_TARGETS) {
    assert.match(t.hex, /^#[0-9a-f]{6}$/);
    assert.equal(nameColour(t.lab).id, t.id, `reference ${t.id} names itself`);
  }
});

test('shades of blue incl. dark navy and light sky blue are blue', () => {
  for (const [rgb, label] of [
    [[0, 0, 255], 'pure blue'], [[0, 0, 128], 'navy'], [[25, 25, 112], 'midnight'], [[20, 30, 70], 'dark navy'],
    [[135, 206, 235], 'sky blue'], [[173, 216, 230], 'light blue'], [[30, 144, 255], 'dodger'],
    [[65, 105, 225], 'royal'], [[70, 130, 180], 'steel'], [[21, 96, 189], 'denim'],
  ]) assert.equal(named(...rgb), 'blue', label);
});

test('red, yellow, green, purple, orange, pink shades', () => {
  for (const rgb of [[255, 0, 0], [139, 0, 0], [220, 20, 60], [200, 30, 30], [128, 0, 0]]) assert.equal(named(...rgb), 'red', String(rgb));
  for (const rgb of [[255, 255, 0], [255, 215, 0], [240, 230, 140], [230, 200, 40]]) assert.equal(named(...rgb), 'yellow', String(rgb));
  for (const rgb of [[0, 128, 0], [0, 255, 0], [0, 100, 0], [46, 139, 87], [154, 205, 50]]) assert.equal(named(...rgb), 'green', String(rgb));
  for (const rgb of [[128, 0, 128], [75, 0, 130], [138, 43, 226], [147, 112, 219], [238, 130, 238]]) assert.equal(named(...rgb), 'purple', String(rgb));
  for (const rgb of [[255, 165, 0], [255, 140, 0]]) assert.equal(named(...rgb), 'orange', String(rgb));
  for (const rgb of [[255, 192, 203], [255, 105, 180], [255, 20, 147]]) assert.equal(named(...rgb), 'pink', String(rgb));
  for (const rgb of [[139, 69, 19], [160, 82, 45]]) assert.equal(named(...rgb), 'brown', String(rgb));
  for (const rgb of [[0, 128, 128], [0, 255, 255], [64, 224, 208]]) assert.equal(named(...rgb), 'teal', String(rgb));
});

test('low chroma colours are white, grey or black', () => {
  assert.equal(named(255, 255, 255), 'white');
  assert.equal(named(245, 245, 240), 'white');
  assert.equal(named(128, 128, 128), 'grey');
  assert.equal(named(112, 128, 144), 'grey');
  assert.equal(named(180, 180, 175), 'grey');
  assert.equal(named(0, 0, 0), 'black');
  assert.equal(named(20, 20, 22), 'black');
  const n = nameColour(srgbToLab(128, 128, 128));
  assert.equal(n.name, 'Grey');
  assert.ok(n.distance >= 0 && n.distance < 1);
});

/* ---------- image analysis and matching ---------- */

test('a solid blue image passes blue', () => {
  const a = analyseImage(solid([30, 80, 220]));
  assert.equal(a.colour.id, 'blue');
  assert.ok(a.share > 0.99);
  assert.ok(a.confidence > 0.9);
  assert.ok(a.sampled > 1000);
  assert.match(a.hex, /^#[0-9a-f]{6}$/);
  const m = matchTarget(a, 'blue');
  assert.deepEqual([m.pass, m.status, m.message], [true, 'match', 'Blue detected']);
  const r = matchTarget(a, 'red');
  assert.equal(r.pass, false);
  assert.equal(r.status, 'mismatch');
  assert.equal(r.message, 'This looks blue, not red');
});

test('a shaded blue object with a specular highlight on a light background passes', () => {
  const img = makeImage(100, 100, (x, y) => {
    const dx = x - 50; const dy = y - 50;
    const d = Math.hypot(dx, dy);
    if (d > 38) return [215, 212, 205]; // off-white table
    if (Math.hypot(x - 40, y - 38) < 6) return [252, 252, 255]; // specular highlight
    // Lit from top-left: from light blue to deep navy shadow.
    const shade = Math.min(1, Math.max(0, (dx + dy + 60) / 120));
    return [Math.round(70 - 60 * shade), Math.round(120 - 105 * shade), Math.round(240 - 150 * shade)];
  });
  const a = analyseImage(img);
  assert.equal(a.colour.id, 'blue', JSON.stringify(a.shares));
  const m = matchTarget(a, 'blue');
  assert.equal(m.pass, true, JSON.stringify({ m, shares: a.shares }));
});

test('a red image with a thin blue border does not pass for blue', () => {
  const img = makeImage(80, 80, (x, y) => (x < 4 || y < 4 || x > 75 || y > 75 ? [20, 60, 230] : [210, 30, 30]));
  for (const region of [undefined, { cx: 0.5, cy: 0.5, r: 0.75 }]) {
    const m = matchTarget(analyseImage(img, { region }), 'blue');
    assert.equal(m.pass, false);
    assert.equal(m.status, 'mismatch');
    assert.equal(m.message, 'This looks red, not blue');
  }
});

test('a mostly grey photo with a small blue patch in a corner does not pass for blue', () => {
  const img = makeImage(80, 80, (x, y) => (x < 16 && y < 16 ? [20, 60, 230] : [120 + (x % 5), 122, 125]));
  const a = analyseImage(img);
  assert.equal(a.colour.id, 'grey');
  const m = matchTarget(a, 'blue');
  assert.equal(m.pass, false);
  assert.equal(m.status, 'mismatch');
});

test('a tiny blue object in the centre of a red scene does not pass', () => {
  const img = makeImage(80, 80, (x, y) => (Math.hypot(x - 40, y - 40) < 7 ? [20, 60, 230] : [210, 30, 30]));
  assert.equal(matchTarget(analyseImage(img), 'blue').pass, false);
});

test('an evenly split four-colour image is uncertain', () => {
  const quad = [[210, 30, 30], [20, 60, 230], [30, 160, 50], [240, 210, 20]];
  const img = makeImage(80, 80, (x, y) => quad[(x < 40 ? 0 : 1) + (y < 40 ? 0 : 2)]);
  const a = analyseImage(img);
  assert.ok(a.share < 0.35, String(a.share));
  for (const id of ['red', 'blue', 'green', 'yellow']) {
    const m = matchTarget(a, id);
    assert.equal(m.status, 'uncertain', id);
    assert.equal(m.pass, false);
    assert.match(m.message, /couldn't confidently identify/);
  }
});

test('half red / half blue: default region is uncertain; region on the blue side passes blue', () => {
  const img = makeImage(100, 80, (x) => (x < 50 ? [210, 30, 30] : [20, 60, 230]));
  assert.equal(matchTarget(analyseImage(img), 'blue').status, 'uncertain');
  const right = analyseImage(img, { region: { cx: 0.75, cy: 0.5, r: 0.25 } });
  assert.equal(right.colour.id, 'blue');
  assert.equal(matchTarget(right, 'blue').pass, true);
  const left = analyseImage(img, { region: { cx: 0.25, cy: 0.5, r: 0.25 } });
  assert.equal(matchTarget(left, 'blue').pass, false);
  assert.equal(matchTarget(left, 'red').pass, true);
});

test('teal is reported as near / closer to teal for target blue', () => {
  const m = matchTarget(analyseImage(solid([0, 128, 128])), 'blue');
  assert.equal(m.pass, false);
  assert.equal(m.status, 'near');
  assert.equal(m.message, 'This looks closer to teal');
});

test('genuinely white and black objects are still named (not all dropped as highlight/shadow)', () => {
  assert.equal(analyseImage(solid([255, 255, 255])).colour.id, 'white');
  assert.equal(analyseImage(solid([5, 5, 5])).colour.id, 'black');
});

test('transparent pixels, empty or invalid images are uncertain, never a pass', () => {
  const clear = analyseImage(solid([20, 60, 230, 0]));
  assert.equal(clear.colour, null);
  assert.equal(matchTarget(clear, 'blue').status, 'uncertain');
  assert.equal(matchTarget(analyseImage(null), 'blue').status, 'uncertain');
  assert.equal(matchTarget(analyseImage({ width: 2, height: 2, data: new Uint8ClampedArray(3) }), 'blue').status, 'uncertain');
  assert.equal(matchTarget(analyseImage(solid([20, 60, 230], 4, 4)), 'blue').status, 'uncertain'); // too few pixels
  assert.equal(matchTarget(null, 'blue').pass, false);
  assert.throws(() => matchTarget(analyseImage(solid([0, 0, 255])), 'teal'), RangeError);
});

test('analysis is deterministic', () => {
  const img = makeImage(60, 60, (x, y) => [(x * 7) % 256, (y * 5) % 256, ((x + y) * 3) % 256]);
  assert.deepEqual(analyseImage(img), analyseImage(img));
});

/* ---------- duplicate detection ---------- */

const scene = (w = 90, h = 80) => makeImage(w, h, (x, y) => {
  const base = 40 + Math.round((x / w) * 120);
  const box = x > 20 && x < 50 && y > 15 && y < 45;
  const disc = Math.hypot(x - 65, y - 55) < 12;
  if (box) return [180, 60, 50];
  if (disc) return [30, 40, 150];
  return [base, base - 10, Math.max(0, base - 30)];
});

test('imageHash: 16 structure + 96 colour-layout hex chars, identical images have distance 0', () => {
  const h = imageHash(scene());
  assert.match(h, /^[0-9a-f]{112}$/);
  assert.equal(layoutDistance(h, imageHash(scene())), 0);
  assert.equal(hashDistance(h, imageHash(scene())), 0);
  assert.throws(() => imageHash(null), TypeError);
});

test('a slightly brightened copy is a likely duplicate; a different image is not', () => {
  const orig = scene();
  const bright = { ...orig, data: orig.data.map((v, i) => (i % 4 === 3 ? v : Math.min(255, Math.round(v * 1.1 + 8)))) };
  const h = imageHash(orig);
  const hb = imageHash(bright);
  assert.ok(hashDistance(h, hb) <= 10, String(hashDistance(h, hb)));
  assert.equal(isLikelyDuplicate(hb, [h]), true);

  const other = makeImage(90, 80, (x, y) => {
    const v = ((Math.floor(x / 15) + Math.floor(y / 13)) % 2) * 160 + 40 + Math.round((y / 80) * 50);
    return [v, v, v];
  });
  const ho = imageHash(other);
  assert.ok(hashDistance(h, ho) > 10, String(hashDistance(h, ho)));
  assert.equal(isLikelyDuplicate(ho, [h, hb]), false);
  assert.equal(isLikelyDuplicate(ho, []), false);
});

test('two different low-texture photos are not duplicates even when their structure hashes collide', () => {
  // A plain blue|red split and a blue object on a dark|light background: both
  // are nearly flat, so their 64-bit structure hashes are almost all zeros.
  const split = makeImage(80, 60, (x) => (x < 40 ? [42, 91, 215] : [200, 50, 30]));
  const object = makeImage(80, 60, (x, y) => {
    if (((x - 40) / 30) ** 2 + ((y - 30) / 24) ** 2 <= 1) return [42, 91, 215];
    return x < 40 ? [30, 30, 30] : [240, 240, 240];
  });
  const hs = imageHash(split);
  const ho = imageHash(object);
  assert.ok(hashDistance(hs, ho) <= DUPLICATE_RULES.structureBits, 'precondition: structure collides');
  assert.ok(layoutDistance(hs, ho) > DUPLICATE_RULES.layoutDeltaE, String(layoutDistance(hs, ho)));
  assert.equal(isLikelyDuplicate(ho, [hs]), false);
  assert.equal(isLikelyDuplicate(imageHash(split), [hs]), true, 'the same photo again is still caught');
});

test('a re-encoded flat photo is still a duplicate although its tied structure bits flip', () => {
  const flat = makeImage(80, 60, () => [42, 91, 215]);
  let seed = 7;
  const noise = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return (seed % 3) - 1; };
  const reencoded = { ...flat, data: flat.data.map((v, i) => (i % 4 === 3 ? v : Math.max(0, Math.min(255, v + noise())))) };
  assert.equal(isLikelyDuplicate(imageHash(reencoded), [imageHash(flat)]), true);
});

test('older structure-only hashes are still accepted and compared on structure', () => {
  const h = imageHash(scene());
  assert.match(h.slice(0, 16), HASH_RE);
  assert.equal(layoutDistance(h, h.slice(0, 16)), null);
  assert.equal(isLikelyDuplicate(h, [h.slice(0, 16)]), true);
});

test('hashDistance range and invalid input', () => {
  assert.equal(hashDistance('0000000000000000', 'ffffffffffffffff'), 64);
  assert.equal(hashDistance('0000000000000000', '0000000000000001'), 1);
  assert.equal(hashDistance('abc', '0000000000000000'), 64);
  assert.equal(isLikelyDuplicate('nope', ['0000000000000000']), false);
  assert.equal(isLikelyDuplicate('0000000000000000', null), false);
});

/* ---------- session variety ---------- */

test('pickTargets is deterministic, distinct and only uses playable colours', () => {
  const playable = COLOUR_TARGETS.filter((t) => t.target).map((t) => t.id);
  assert.deepEqual(pickTargets(42, 3), pickTargets(42, 3));
  const picks = pickTargets(42, 5);
  assert.equal(picks.length, 5);
  assert.equal(new Set(picks).size, 5);
  for (const id of picks) assert.ok(playable.includes(id));
  assert.equal(pickTargets(7, 99).length, playable.length);
  assert.deepEqual(pickTargets(7, 0), []);
  const firsts = new Set(Array.from({ length: 30 }, (_, s) => pickTargets(s, 1)[0]));
  assert.ok(firsts.size >= 4, 'different seeds vary the colour');
});
