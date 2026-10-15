// Lost Colour: photo colour checking and duplicate detection.
// Pure functions only (no DOM, no clock, no storage, no Math.random), so the
// same code runs in the browser and in `node --test`.
//
// The UI draws the photo onto a canvas, downsamples it (<= 160x160) and passes
// an ImageData-like object { width, height, data: Uint8ClampedArray RGBA }.
//
// How a photo is judged (thresholds in COLOUR_RULES below):
//   1. Sample pixels inside a circular region (default: centre, radius 45% of
//      the short side). Pixels near the centre weigh more; pixels outside the
//      region are ignored, so backgrounds and frame edges count less.
//   2. Drop near-transparent pixels, blown highlights (very light AND nearly
//      grey) and deep shadows. If that would drop almost everything (a
//      genuinely white or black object) all pixels are used instead.
//   3. No white-balance / gray-world correction: gray-world assumes the scene
//      averages to grey, which is false exactly when the player fills the frame
//      with one colour, and would pull a blue photo towards grey.
//   4. Small deterministic k-means (k = 4) in CIELab on a colour histogram.
//   5. Each cluster is named with hue/chroma logic (OKLCh hue, which is far
//      more even than CIELab hue around blue/purple). Clusters with the same
//      name are added together, so a shaded blue object (dark, mid and light
//      blue clusters) still counts as one blue share.
//   6. The colour with the biggest weighted share is dominant. Confidence
//      combines that share with how far it leads the runner-up.
//
// This is a heuristic check on a camera photo, not a measurement. Lighting
// (warm indoor bulbs, coloured shade, screens) can shift what the camera
// records, and the game must present results as "looks like", never as proof.

export const COLOUR_RULES = Object.freeze({
  defaultRegion: Object.freeze({ cx: 0.5, cy: 0.5, r: 0.45 }),
  edgeWeight: 0.25, // weight of a pixel on the region edge (centre = 1)
  minAlpha: 128, // skip pixels more transparent than this
  highlightL: 95, // CIELab L above this AND chroma below highlightC = blown highlight
  highlightC: 10,
  shadowL: 12, // CIELab L below this = deep shadow (hue unreliable)
  minKeptFraction: 0.15, // if filtering leaves less weight than this, use all pixels
  k: 4, // k-means clusters
  iterations: 12,
  passShare: 0.35, // dominant colour must hold at least this weighted share
  passConfidence: 0.4, // and confidence at least this
  minSamples: 50, // fewer usable pixels than this = uncertain
  achromaticDiscount: 0.5, // grey/white/black competitors count half when the leader is a colour
});

// OKLCh thresholds used by nameColour (L 0..1, chroma ~0..0.32, hue degrees).
const NAMING = Object.freeze({
  greyChroma: 0.035, // below this chroma the colour is grey/white/black
  whiteL: 0.88,
  blackL: 0.3,
  darkChroma: 0.06, // very dark AND weak chroma = black
  darkL: 0.2,
  paleChroma: 0.05, // very light AND weak chroma = white
  paleL: 0.93,
});

function deepFreeze(o) {
  for (const v of Object.values(o)) if (v && typeof v === 'object') deepFreeze(v);
  return Object.freeze(o);
}

// hues: OKLCh hue ranges [from, to) in degrees (wrapping allowed) used for naming.
// lab: CIELab reference of hex (for distance and display).
const RAW_TARGETS = [
  { id: 'red', name: 'Red', hex: '#e02020', hues: [[12, 45]], target: true },
  { id: 'orange', name: 'Orange', hex: '#ff8c00', hues: [[45, 80]], target: true },
  { id: 'yellow', name: 'Yellow', hex: '#ffd700', hues: [[80, 118]], target: true },
  { id: 'green', name: 'Green', hex: '#1e9e3c', hues: [[118, 175]], target: true },
  { id: 'blue', name: 'Blue', hex: '#1e5adc', hues: [[215, 290]], target: true },
  { id: 'purple', name: 'Purple', hex: '#8a2be2', hues: [[290, 340]], target: true },
  { id: 'pink', name: 'Pink', hex: '#ff69b4', hues: [[340, 360], [0, 12]], target: true },
  { id: 'teal', name: 'Teal', hex: '#008080', hues: [[175, 215]], target: false },
  { id: 'brown', name: 'Brown', hex: '#8b4513', hues: [], target: false },
  { id: 'white', name: 'White', hex: '#f5f5f5', hues: [], target: false },
  { id: 'grey', name: 'Grey', hex: '#808080', hues: [], target: false },
  { id: 'black', name: 'Black', hex: '#141414', hues: [], target: false },
];

// Colours that are easy to confuse: the result is 'near' rather than 'mismatch'.
const NEIGHBOURS = Object.freeze({
  red: ['orange', 'pink', 'brown'],
  orange: ['red', 'yellow', 'brown'],
  yellow: ['orange', 'green'],
  green: ['yellow', 'teal'],
  blue: ['teal', 'purple'],
  purple: ['blue', 'pink'],
  pink: ['red', 'purple'],
});

const ACHROMATIC = new Set(['white', 'grey', 'black']);

/* ---------------- colour space conversion ---------------- */

const WHITE_D65 = [0.95047, 1, 1.08883];

const LINEAR_LUT = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LINEAR_LUT[i] = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function toLinear(v) {
  const c = Math.min(255, Math.max(0, v));
  if (Number.isInteger(c)) return LINEAR_LUT[c];
  const n = c / 255;
  return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

function fromLinear(c) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255);
}

const EPS = 216 / 24389;
const KAPPA = 24389 / 27;
const f = (t) => (t > EPS ? Math.cbrt(t) : (KAPPA * t + 16) / 116);
const fInv = (t) => (t ** 3 > EPS ? t ** 3 : (116 * t - 16) / KAPPA);

function linearToLab(r, g, b) {
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / WHITE_D65[0];
  const y = (0.2126729 * r + 0.7151522 * g + 0.072175 * b) / WHITE_D65[1];
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / WHITE_D65[2];
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** sRGB 0..255 -> CIELab [L, a, b] (D65, standard sRGB companding). */
export function srgbToLab(r, g, b) {
  return linearToLab(toLinear(r), toLinear(g), toLinear(b));
}

function labToLinear([L, a, b]) {
  const fy = (L + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;
  const x = fInv(fx) * WHITE_D65[0];
  const y = (L > KAPPA * EPS ? fy ** 3 : L / KAPPA) * WHITE_D65[1];
  const z = fInv(fz) * WHITE_D65[2];
  return [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.969266 * x + 1.8760108 * y + 0.041556 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ];
}

function labToHex(lab) {
  return '#' + labToLinear(lab).map((c) => fromLinear(c).toString(16).padStart(2, '0')).join('');
}

function hexToLab(hex) {
  const n = parseInt(hex.slice(1), 16);
  return srgbToLab((n >> 16) & 255, (n >> 8) & 255, n & 255);
}

// OKLab (Björn Ottosson, 2020) from linear sRGB. Used only for hue naming.
function linearToOklch([r, g, b]) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { L, C: Math.hypot(A, B), h };
}

export const COLOUR_TARGETS = deepFreeze(RAW_TARGETS.map((t) => ({ ...t, lab: hexToLab(t.hex) })));
const BY_ID = new Map(COLOUR_TARGETS.map((t) => [t.id, t]));

/* ---------------- colour difference ---------------- */

const RAD = Math.PI / 180;

/** CIEDE2000 colour difference (Sharma, Wu & Dalal 2005), kL = kC = kH = 1. */
export function deltaE(lab1, lab2) {
  const [L1, a1, b1] = lab1;
  const [L2, a2, b2] = lab2;
  const C1 = Math.hypot(a1, b1);
  const C2 = Math.hypot(a2, b2);
  const Cbar7 = ((C1 + C2) / 2) ** 7;
  const G = 0.5 * (1 - Math.sqrt(Cbar7 / (Cbar7 + 25 ** 7)));
  const a1p = (1 + G) * a1;
  const a2p = (1 + G) * a2;
  const C1p = Math.hypot(a1p, b1);
  const C2p = Math.hypot(a2p, b2);
  const hue = (b, a) => {
    if (a === 0 && b === 0) return 0;
    const h = Math.atan2(b, a) / RAD;
    return h < 0 ? h + 360 : h;
  };
  const h1p = hue(b1, a1p);
  const h2p = hue(b2, a2p);

  const dLp = L2 - L1;
  const dCp = C2p - C1p;
  let dhp = 0;
  if (C1p * C2p !== 0) {
    dhp = h2p - h1p;
    if (dhp > 180) dhp -= 360;
    else if (dhp < -180) dhp += 360;
  }
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin((dhp / 2) * RAD);

  const Lbp = (L1 + L2) / 2;
  const Cbp = (C1p + C2p) / 2;
  let hbp = h1p + h2p;
  if (C1p * C2p !== 0) {
    if (Math.abs(h1p - h2p) > 180) hbp = h1p + h2p < 360 ? hbp + 360 : hbp - 360;
    hbp /= 2;
  }
  const T =
    1 -
    0.17 * Math.cos((hbp - 30) * RAD) +
    0.24 * Math.cos(2 * hbp * RAD) +
    0.32 * Math.cos((3 * hbp + 6) * RAD) -
    0.2 * Math.cos((4 * hbp - 63) * RAD);
  const dTheta = 30 * Math.exp(-(((hbp - 275) / 25) ** 2));
  const Cbp7 = Cbp ** 7;
  const RC = 2 * Math.sqrt(Cbp7 / (Cbp7 + 25 ** 7));
  const SL = 1 + (0.015 * (Lbp - 50) ** 2) / Math.sqrt(20 + (Lbp - 50) ** 2);
  const SC = 1 + 0.045 * Cbp;
  const SH = 1 + 0.015 * Cbp * T;
  const RT = -Math.sin(2 * dTheta * RAD) * RC;
  const tL = dLp / SL;
  const tC = dCp / SC;
  const tH = dHp / SH;
  return Math.sqrt(tL * tL + tC * tC + tH * tH + RT * tC * tH);
}

/* ---------------- naming ---------------- */

const inRange = (h, [from, to]) => h >= from && h < to;

function classify(lab) {
  const { L, C, h } = linearToOklch(labToLinear(lab));
  if (C < NAMING.greyChroma) return L > NAMING.whiteL ? 'white' : L < NAMING.blackL ? 'black' : 'grey';
  if (L < NAMING.darkL && C < NAMING.darkChroma) return 'black';
  if (L > NAMING.paleL && C < NAMING.paleChroma) return 'white';
  // Brown is dark (or dull) orange/yellow. Dark red (maroon, h ~29) stays red.
  if (h >= 40 && h < 85 && (L < 0.56 || (C < 0.09 && L < 0.82))) return 'brown';
  // Light, soft reds (salmon-pink, baby pink) read as pink.
  if (h >= 0 && h < 45 && L > 0.8 && C < 0.12) return 'pink';
  for (const t of COLOUR_TARGETS) if (t.hues.some((r) => inRange(h, r))) return t.id;
  return 'grey'; // unreachable: hue ranges cover 0..360
}

/** Nearest named colour class: { id, name, distance } (distance = CIEDE2000 to the class reference). */
export function nameColour(lab) {
  const t = BY_ID.get(classify(lab));
  return { id: t.id, name: t.name, distance: deltaE(lab, t.lab) };
}

/* ---------------- image analysis ---------------- */

function normRegion(region) {
  const d = COLOUR_RULES.defaultRegion;
  const num = (v, fallback) => (Number.isFinite(v) ? v : fallback);
  if (!region || typeof region !== 'object') return { ...d };
  return {
    cx: Math.min(1, Math.max(0, num(region.cx, d.cx))),
    cy: Math.min(1, Math.max(0, num(region.cy, d.cy))),
    r: Math.min(1.5, Math.max(0.02, num(region.r, d.r))),
  };
}

function isImage(img) {
  return (
    img &&
    Number.isInteger(img.width) &&
    Number.isInteger(img.height) &&
    img.width > 0 &&
    img.height > 0 &&
    img.data &&
    img.data.length >= img.width * img.height * 4
  );
}

// Weighted colour histogram (5 bits per channel) inside the region.
function collect(img, region, filter) {
  const { width: w, height: h, data } = img;
  const rPx = region.r * Math.min(w, h);
  const cx = region.cx * w;
  const cy = region.cy * h;
  const bins = new Map();
  let sampled = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / rPx;
      if (d > 1) continue;
      const i = (y * w + x) * 4;
      if (data[i + 3] < COLOUR_RULES.minAlpha) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let bin = bins.get(key);
      if (!bin) {
        bin = { lab: srgbToLab(r, g, b), w: 0, n: 0 };
        if (filter && !filter(bin.lab)) bin.skip = true;
        bins.set(key, bin);
      }
      if (bin.skip) continue;
      // Centre weighting: 1 at the centre falling to edgeWeight at the rim.
      const weight = 1 - (1 - COLOUR_RULES.edgeWeight) * d * d;
      bin.w += weight;
      bin.n += 1;
      sampled += 1;
    }
  }
  const list = [...bins.values()].filter((b) => !b.skip && b.w > 0);
  return { list, sampled, total: list.reduce((s, b) => s + b.w, 0) };
}

const usable = ([L, a, b]) => {
  if (L < COLOUR_RULES.shadowL) return false;
  if (L > COLOUR_RULES.highlightL && Math.hypot(a, b) < COLOUR_RULES.highlightC) return false;
  return true;
};

const dist2 = (p, q) => (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2;

// Deterministic weighted k-means. Init: heaviest bin, then repeatedly the bin
// maximising weight * squared distance to the nearest centre (farthest-first,
// weighted so a few stray pixels do not become a centre).
function kmeans(points, k, iterations) {
  if (points.length === 0) return [];
  const centres = [points.reduce((best, p) => (p.w > best.w ? p : best)).lab.slice()];
  while (centres.length < Math.min(k, points.length)) {
    let best = null;
    let bestScore = 0;
    for (const p of points) {
      const s = p.w * Math.min(...centres.map((c) => dist2(p.lab, c)));
      if (s > bestScore) {
        bestScore = s;
        best = p;
      }
    }
    if (!best) break; // remaining points identical to existing centres
    centres.push(best.lab.slice());
  }
  const assign = new Int32Array(points.length);
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    points.forEach((p, i) => {
      let bi = 0;
      let bd = Infinity;
      centres.forEach((c, j) => {
        const d = dist2(p.lab, c);
        if (d < bd) {
          bd = d;
          bi = j;
        }
      });
      if (assign[i] !== bi) changed = true;
      assign[i] = bi;
    });
    const sums = centres.map(() => [0, 0, 0, 0]);
    points.forEach((p, i) => {
      const s = sums[assign[i]];
      s[0] += p.lab[0] * p.w;
      s[1] += p.lab[1] * p.w;
      s[2] += p.lab[2] * p.w;
      s[3] += p.w;
    });
    sums.forEach((s, j) => {
      if (s[3] > 0) centres[j] = [s[0] / s[3], s[1] / s[3], s[2] / s[3]];
    });
    if (!changed && it > 0) break;
  }
  const clusters = centres.map((lab) => ({ lab, w: 0 }));
  points.forEach((p, i) => {
    clusters[assign[i]].w += p.w;
  });
  return clusters.filter((c) => c.w > 0);
}

function emptyAnalysis(sampled = 0) {
  return { lab: null, hex: null, colour: null, share: 0, confidence: 0, clusters: [], shares: {}, sampled };
}

/**
 * Analyse the dominant colour of an ImageData-like image.
 * Returns { lab, hex, colour: {id, name}, share, confidence, clusters: [{hex, colourId, share}], shares, sampled }.
 * `shares` maps colour id -> weighted share (extra, for debugging and the UI).
 */
export function analyseImage(img, { region } = {}) {
  if (!isImage(img)) return emptyAnalysis();
  const reg = normRegion(region);
  let pts = collect(img, reg, usable);
  const all = collect(img, reg, null);
  if (all.total === 0) return emptyAnalysis(0);
  // Genuinely white or black objects: filtering removed nearly everything, so use all pixels.
  if (pts.total < COLOUR_RULES.minKeptFraction * all.total) pts = all;

  const raw = kmeans(pts.list, COLOUR_RULES.k, COLOUR_RULES.iterations);
  const clusters = raw
    .map((c) => {
      const named = nameColour(c.lab);
      return { lab: c.lab, hex: labToHex(c.lab), colourId: named.id, share: c.w / pts.total };
    })
    .sort((a, b) => b.share - a.share);

  // Add up clusters that share a colour name (shading splits one object into several clusters).
  const shares = {};
  for (const c of clusters) shares[c.colourId] = (shares[c.colourId] || 0) + c.share;
  const ranked = Object.entries(shares).sort((a, b) => b[1] - a[1]);
  const [domId, share] = ranked[0];

  // Representative colour: weighted mean of the dominant colour's clusters.
  const mine = clusters.filter((c) => c.colourId === domId);
  const lab = [0, 1, 2].map((i) => mine.reduce((s, c) => s + c.lab[i] * c.share, 0) / share);

  // Confidence = half "how much of the region is this colour" + half "how far it
  // leads the runner-up". Grey/white/black runners-up (walls, tables, paper) count
  // half when the leader is a real colour. Very small samples scale it down.
  const domChromatic = !ACHROMATIC.has(domId);
  const rival = ranked
    .slice(1)
    .reduce((m, [id, s]) => Math.max(m, domChromatic && ACHROMATIC.has(id) ? s * COLOUR_RULES.achromaticDiscount : s), 0);
  const sampleFactor = Math.min(1, pts.sampled / (COLOUR_RULES.minSamples * 2));
  const confidence = Math.min(1, Math.max(0, (0.5 * share + 0.5 * (share - rival)) * sampleFactor));

  const t = BY_ID.get(domId);
  return {
    lab,
    hex: labToHex(lab),
    colour: { id: t.id, name: t.name },
    share,
    confidence,
    clusters: clusters.map(({ hex, colourId, share: s }) => ({ hex, colourId, share: s })),
    shares,
    sampled: pts.sampled,
  };
}

/** Judge an analysis against a target colour id. */
export function matchTarget(analysis, targetId) {
  const target = BY_ID.get(targetId);
  if (!target || !target.target) throw new RangeError(`Unknown target colour: ${targetId}`);
  const unsure = {
    pass: false,
    status: 'uncertain',
    message: "We couldn't confidently identify the colour. Try tapping the object to select it, or move closer.",
    confidence: analysis && Number.isFinite(analysis.confidence) ? analysis.confidence : 0,
  };
  if (!analysis || !analysis.colour || !(analysis.sampled >= COLOUR_RULES.minSamples)) return unsure;

  const { colour, share, confidence } = analysis;
  // No colour clearly dominates (multicolour or a small object): ask the player to select it.
  if (share < COLOUR_RULES.passShare || confidence < COLOUR_RULES.passConfidence) return unsure;

  if (colour.id === target.id) {
    return { pass: true, status: 'match', message: `${target.name} detected`, confidence };
  }
  const seen = colour.name.toLowerCase();
  if ((NEIGHBOURS[target.id] || []).includes(colour.id)) {
    return { pass: false, status: 'near', message: `This looks closer to ${seen}`, confidence };
  }
  return {
    pass: false,
    status: 'mismatch',
    message: `This looks ${seen}, not ${target.name.toLowerCase()}`,
    confidence,
  };
}

/* ---------------- duplicate detection ---------------- */

// A photo's hash has two parts, compared separately:
//   - structure: 64-bit difference hash (16 hex chars). Robust to resizing and
//     exposure, but in low-texture photos (one plain object filling the frame)
//     neighbouring cells are equal and almost every bit is 0, so two different
//     plain photos collide.
//   - colour layout: mean CIELab of a 4x4 grid (96 hex chars, 1 byte per
//     channel). Two different plain photos almost always differ here (other
//     background, other shade), while a re-upload or re-exposed copy does not.
// A likely duplicate must match on both. Hashes saved before the layout part
// existed (16 chars) are compared on structure only.
export const DUPLICATE_RULES = Object.freeze({
  structureBits: 10, // Hamming distance (of 64) at or below this = same structure
  layoutDeltaE: 12, // mean per-cell CIELab distance at or below this = same colour layout
  // Near-identical colour layout counts on its own: in a flat photo the
  // structure bits are ties that flip under re-encoding noise.
  layoutOnlyDeltaE: 3,
});

const LAYOUT_GRID = 4;

function cellGrid(img, gx, gy, cell) {
  const { width: w, height: h } = img;
  for (let j = 0; j < gy; j++) {
    const y0 = Math.floor((j * h) / gy);
    const y1 = Math.min(h, Math.max(y0 + 1, Math.floor(((j + 1) * h) / gy)));
    for (let i = 0; i < gx; i++) {
      const x0 = Math.floor((i * w) / gx);
      const x1 = Math.min(w, Math.max(x0 + 1, Math.floor(((i + 1) * w) / gx)));
      cell(j * gx + i, x0, x1, y0, y1);
    }
  }
}

function structureHash(img) {
  const { width: w, data } = img;
  const gx = 9;
  const gy = 8;
  const grid = new Float64Array(gx * gy);
  cellGrid(img, gx, gy, (k, x0, x1, y0, y1) => {
    let sum = 0;
    let n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = (y * w + x) * 4;
        sum += 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
        n += 1;
      }
    }
    grid[k] = n ? sum / n : 0;
  });
  let hex = '';
  let nibble = 0;
  let bits = 0;
  for (let j = 0; j < gy; j++) {
    for (let i = 0; i < gx - 1; i++) {
      nibble = (nibble << 1) | (grid[j * gx + i] > grid[j * gx + i + 1] ? 1 : 0);
      if (++bits === 4) {
        hex += nibble.toString(16);
        nibble = 0;
        bits = 0;
      }
    }
  }
  return hex;
}

const byteHex = (v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0');

function layoutHash(img) {
  const { width: w, data } = img;
  let hex = '';
  cellGrid(img, LAYOUT_GRID, LAYOUT_GRID, (k, x0, x1, y0, y1) => {
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const p = (y * w + x) * 4;
        r += toLinear(data[p]);
        g += toLinear(data[p + 1]);
        b += toLinear(data[p + 2]);
        n += 1;
      }
    }
    const [L, A, B] = n ? linearToLab(r / n, g / n, b / n) : [0, 0, 0];
    hex += byteHex(L * 2.55) + byteHex(A + 128) + byteHex(B + 128);
  });
  return hex;
}

/**
 * Perceptual image hash: 16 hex chars of structure followed by 96 hex chars of
 * colour layout (112 chars in all). Input: { width, height, data } RGBA.
 */
export function imageHash(img) {
  if (!isImage(img)) throw new TypeError('imageHash needs { width, height, data }');
  return structureHash(img) + layoutHash(img);
}

/** Matches a current (112-char) or older structure-only (16-char) hash. */
export const HASH_RE = /^[0-9a-f]{16}(?:[0-9a-f]{96})?$/;
const POP4 = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

/** Structural Hamming distance 0..64 between two hashes. Invalid input counts as completely different (64). */
export function hashDistance(h1, h2) {
  if (!HASH_RE.test(String(h1)) || !HASH_RE.test(String(h2))) return 64;
  let d = 0;
  for (let i = 0; i < 16; i++) d += POP4[parseInt(h1[i], 16) ^ parseInt(h2[i], 16)];
  return d;
}

/** Mean per-cell CIELab distance between two colour layouts, or null if either hash has none. */
export function layoutDistance(h1, h2) {
  if (!HASH_RE.test(String(h1)) || !HASH_RE.test(String(h2)) || h1.length < 112 || h2.length < 112) return null;
  const cells = LAYOUT_GRID * LAYOUT_GRID;
  let sum = 0;
  for (let c = 0; c < cells; c++) {
    const o = 16 + c * 6;
    const ch = (h, i) => parseInt(h.slice(o + i * 2, o + i * 2 + 2), 16);
    const dL = (ch(h1, 0) - ch(h2, 0)) / 2.55;
    const dA = ch(h1, 1) - ch(h2, 1);
    const dB = ch(h1, 2) - ch(h2, 2);
    sum += Math.sqrt(dL * dL + dA * dA + dB * dB);
  }
  return sum / cells;
}

/** True if `hash` has a near-identical colour layout to a previous hash, or matches it on structure (within `threshold` bits) and, where both have one, on colour layout. */
export function isLikelyDuplicate(hash, previousHashes, threshold = DUPLICATE_RULES.structureBits) {
  if (!HASH_RE.test(String(hash)) || !Array.isArray(previousHashes)) return false;
  return previousHashes.some((p) => {
    const d = layoutDistance(hash, p);
    if (d !== null && d <= DUPLICATE_RULES.layoutOnlyDeltaE) return true;
    if (hashDistance(hash, p) > threshold) return false;
    return d === null || d <= DUPLICATE_RULES.layoutDeltaE;
  });
}

/* ---------------- session variety ---------------- */

// mulberry32: small deterministic PRNG so the same seed always gives the same colours.
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic list of `count` distinct target colour ids for a numeric seed. */
export function pickTargets(seed, count = 1) {
  const ids = COLOUR_TARGETS.filter((t) => t.target).map((t) => t.id);
  const n = Math.max(0, Math.min(ids.length, Math.floor(Number(count) || 0)));
  const rand = mulberry32(Number.isFinite(seed) ? Math.floor(seed) : 0);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, n);
}
