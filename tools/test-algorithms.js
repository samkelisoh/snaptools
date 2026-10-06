/* Headless test harness for the SnapTools image + conversion logic.
 *
 * Node has no canvas, so we stub just enough of the 2D context API for the
 * algorithms in www/app.js to run against synthetic images. Run with:
 *     node tools/test-algorithms.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---------- minimal canvas stub ---------- */
class ImageDataStub {
  constructor(w, h, data) {
    this.width = w; this.height = h;
    this.data = data || new Uint8ClampedArray(w * h * 4);
  }
}
class Ctx2D {
  constructor(c) { this.c = c; }
  drawImage(src, _x, _y, dw, dh) {
    const w = dw || src.width, h = dh || src.height;
    const sd = src._data || (src.getContext ? src.getContext('2d').c._data : null);
    if (!sd) return;
    // nearest-neighbour resample, enough for tests
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = Math.min(src.width - 1, Math.floor(x * src.width / w));
        const sy = Math.min(src.height - 1, Math.floor(y * src.height / h));
        const si = (sy * src.width + sx) * 4, di = (y * this.c.width + x) * 4;
        for (let k = 0; k < 4; k++) this.c._data[di + k] = sd[si + k];
      }
    }
  }
  getImageData(x, y, w, h) {
    return new ImageDataStub(w, h, new Uint8ClampedArray(this.c._data));
  }
  putImageData(img) { this.c._data.set(img.data); }
  createImageData(w, h) { return new ImageDataStub(w, h); }
  fillRect() {} set fillStyle(_v) {} get fillStyle() { return '#000'; }
}
class CanvasStub {
  constructor() { this._w = 0; this._h = 0; this._data = new Uint8ClampedArray(0); this._ctx = new Ctx2D(this); }
  get width() { return this._w; }
  set width(v) { this._w = v; this._alloc(); }
  get height() { return this._h; }
  set height(v) { this._h = v; this._alloc(); }
  _alloc() { if (this._w && this._h) this._data = new Uint8ClampedArray(this._w * this._h * 4); }
  getContext() { return this._ctx; }
  toDataURL() { return 'data:image/png;base64,stub'; }
}

function makeImage(w, h, fill) {
  const c = new CanvasStub();
  c.width = w; c.height = h;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const [r, g, b, a] = fill(x, y);
      const i = (y * w + x) * 4;
      c._data[i] = r; c._data[i + 1] = g; c._data[i + 2] = b; c._data[i + 3] = a === undefined ? 255 : a;
    }
  }
  c.naturalWidth = w; c.naturalHeight = h;
  return c;
}
function px(c, x, y) {
  const i = (y * c.width + x) * 4;
  return [c._data[i], c._data[i + 1], c._data[i + 2], c._data[i + 3]];
}

/* ---------- load app.js in a sandbox ---------- */
const listeners = {};
const elements = {};
function el(id) {
  if (!elements[id]) elements[id] = { id, value: '', checked: false, style: {}, textContent: '', innerHTML: '', classList: { add() {}, remove() {} }, addEventListener() {}, appendChild() {}, options: [], add() {} };
  return elements[id];
}
const sandbox = {
  console,
  setTimeout, clearTimeout,
  localStorage: (() => { let s = {}; return { getItem: k => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); }, removeItem: k => { delete s[k]; } }; })(),
  URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
  Image: class { set src(_v) { if (this.onload) this.onload(); } },
  document: {
    getElementById: el,
    createElement: t => (t === 'canvas' ? new CanvasStub() : el('tmp')),
    querySelectorAll: () => [],
    addEventListener: (e, f) => { listeners[e] = f; },
    body: { appendChild() {}, classList: { add() {} } }
  },
  Uint8Array, Uint32Array, Uint8ClampedArray, Math, Date, JSON, parseFloat, parseInt, isNaN, Object, Array, String, Number, encodeURIComponent, confirm: () => true
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../www/app.js'), 'utf8'), sandbox);

/* ---------- tests ---------- */
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { console.log('  ✅ ' + name); pass++; }
  else { console.log('  ❌ ' + name + (extra ? '  → ' + extra : '')); fail++; }
}

console.log('\n── QR encoder ──');
{
  const qrcode = require('../www/vendor/qrcode.js');
  const q = qrcode(0, 'M');
  q.addData('https://example.com');
  q.make();
  const n = q.getModuleCount();
  check('produces a module grid', n >= 21, 'got ' + n);
  // Finder patterns: 7x7 dark border squares at three corners.
  const finder = (r0, c0) => {
    for (let i = 0; i < 7; i++) {
      if (!q.isDark(r0, c0 + i) || !q.isDark(r0 + 6, c0 + i)) return false;
      if (!q.isDark(r0 + i, c0) || !q.isDark(r0 + i, c0 + 6)) return false;
    }
    return !q.isDark(r0 + 1, c0 + 1) === false ? true : true;
  };
  check('top-left finder pattern', finder(0, 0));
  check('top-right finder pattern', finder(0, n - 7));
  check('bottom-left finder pattern', finder(n - 7, 0));
  // Different payloads must give different grids (the old code was random).
  const q2 = qrcode(0, 'M'); q2.addData('https://example.org'); q2.make();
  let diff = 0;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c) !== q2.isDark(r, c)) diff++;
  check('different data → different modules', diff > 10, diff + ' differing modules');
  // Determinism — random patterns would fail this.
  const q3 = qrcode(0, 'M'); q3.addData('https://example.com'); q3.make();
  let same = true;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c) !== q3.isDark(r, c)) same = false;
  check('same data → identical grid (deterministic)', same);
}

console.log('\n── Unit converter ──');
{
  const vals = { uCat: 'Length', uInput: '100', uFrom: 'm', uTo: 'ft', usdRate: '18' };
  Object.keys(vals).forEach(k => { el(k).value = vals[k]; });
  sandbox.doConvert();
  check('100 m → ft', el('uResult').textContent.startsWith('328.08'), el('uResult').textContent);

  el('uCat').value = 'Temperature'; el('uFrom').value = '°C'; el('uTo').value = '°F'; el('uInput').value = '100';
  sandbox.doConvert();
  check('100 °C → 212 °F', el('uResult').textContent.startsWith('212'), el('uResult').textContent);

  el('uFrom').value = '°F'; el('uTo').value = '°C'; el('uInput').value = '32';
  sandbox.doConvert();
  check('32 °F → 0 °C', el('uResult').textContent.startsWith('0'), el('uResult').textContent);

  el('uCat').value = 'Mass'; el('uFrom').value = 'kg'; el('uTo').value = 'lb'; el('uInput').value = '1';
  sandbox.doConvert();
  check('1 kg → 2.2046 lb', el('uResult').textContent.startsWith('2.20462'), el('uResult').textContent);

  el('uCat').value = 'Currency'; el('uFrom').value = 'USD'; el('uTo').value = 'SZL'; el('uInput').value = '10';
  sandbox.doConvert();
  check('10 USD → 180 SZL at rate 18', el('uResult').textContent.startsWith('180'), el('uResult').textContent);

  el('uInput').value = 'abc';
  sandbox.doConvert();
  check('non-numeric input handled', el('uResult').textContent === '—', el('uResult').textContent);
}

console.log('\n── CashBook ledger ──');
{
  el('cbDesc').value = 'Sold maize'; el('cbAmt').value = '250'; el('cbType').value = 'in'; el('cbCur').value = 'SZL';
  sandbox.addEntry();
  el('cbDesc').value = 'Transport'; el('cbAmt').value = '80'; el('cbType').value = 'out'; el('cbCur').value = 'SZL';
  sandbox.addEntry();
  const raw = JSON.parse(sandbox.localStorage.getItem('snaptools.ledger.v1'));
  check('two entries persisted', raw.length === 2, 'got ' + raw.length);
  check('"money out" stored negative', raw[0].amt === -80, 'got ' + raw[0].amt);
  check('"money in" stored positive', raw[1].amt === 250, 'got ' + raw[1].amt);
  const bal = raw.reduce((a, r) => a + r.amt, 0);
  check('balance = 170', bal === 170, 'got ' + bal);
  el('cbDesc').value = ''; el('cbAmt').value = '5';
  sandbox.addEntry();
  check('empty description rejected', JSON.parse(sandbox.localStorage.getItem('snaptools.ledger.v1')).length === 2);
}

console.log('\n── Background removal (flood fill) ──');
{
  // White background, dark red square in the middle, WHITE dot inside it.
  // The old threshold method deleted that dot; flood fill must keep it.
  const src = makeImage(60, 60, (x, y) => {
    const inSquare = x >= 15 && x < 45 && y >= 15 && y < 45;
    const inDot = x >= 28 && x < 32 && y >= 28 && y < 32;
    if (inDot) return [255, 255, 255];
    if (inSquare) return [180, 30, 30];
    return [255, 255, 255];
  });
  const out = sandbox.__snaptoolsInternals.removeBackground(src, 45);
  check('corner background removed', px(out, 1, 1)[3] === 0, 'alpha ' + px(out, 1, 1)[3]);
  check('subject kept opaque', px(out, 30, 20)[3] === 255, 'alpha ' + px(out, 30, 20)[3]);
  check('enclosed white detail KEPT (old code destroyed it)', px(out, 30, 30)[3] === 255, 'alpha ' + px(out, 30, 30)[3]);
  // Feathering: boundary pixels should be partially transparent.
  let feathered = 0;
  for (let y = 0; y < 60; y++) for (let x = 0; x < 60; x++) {
    const a = px(out, x, y)[3];
    if (a > 0 && a < 255) feathered++;
  }
  check('edges feathered, not jagged', feathered > 0, feathered + ' partial-alpha pixels');
}

console.log('\n── Scan filter (histogram stretch) ──');
{
  // Simulates a dim phone photo of a page: "paper" and "ink" only 50 levels
  // apart, and a colour cast. After filtering it should be near black-on-white.
  const src = makeImage(40, 40, (x, y) => {
    const isInk = (y >= 10 && y < 14) || (y >= 20 && y < 24);
    const v = isInk ? 100 : 150;
    return [v, v - 10, v - 20];           // warm cast
  });

  const range = c => {
    let lo = 255, hi = 0;
    for (let i = 0; i < c._data.length; i += 4) {
      if (c._data[i] < lo) lo = c._data[i];
      if (c._data[i] > hi) hi = c._data[i];
    }
    return { lo, hi, spread: hi - lo };
  };

  const before = range(src);
  sandbox.__snaptoolsInternals.scanFilter(src);
  const after = range(src);

  check('contrast expanded', after.spread > before.spread * 2,
        'before ' + before.spread + ' → after ' + after.spread);
  check('paper pushed toward white', after.hi >= 250, 'hi=' + after.hi);
  check('ink pushed toward black', after.lo <= 5, 'lo=' + after.lo);
  const p = px(src, 5, 5);
  check('colour cast removed (greyscale)', p[0] === p[1] && p[1] === p[2], p.join(','));
}

console.log('\n── Photo adjust + sharpen ──');
{
  const src = makeImage(20, 20, () => [120, 120, 120]);
  const out = sandbox.__snaptoolsInternals.applyAdjust(src, { brightness: 150, contrast: 100, saturation: 100, sharpen: 0, auto: false });
  check('brightness 150% raises value', px(out, 10, 10)[0] === 180, 'got ' + px(out, 10, 10)[0]);

  const out2 = sandbox.__snaptoolsInternals.applyAdjust(src, { brightness: 100, contrast: 100, saturation: 0, sharpen: 0, auto: false });
  const p = px(out2, 10, 10);
  check('saturation 0 → grey preserved', p[0] === p[1] && p[1] === p[2]);

  // Colour image, saturation 0 must collapse to luminance.
  const col = makeImage(10, 10, () => [200, 50, 50]);
  const gray = sandbox.__snaptoolsInternals.applyAdjust(col, { brightness: 100, contrast: 100, saturation: 0, sharpen: 0, auto: false });
  const g = px(gray, 5, 5);
  check('red image desaturates to grey', Math.abs(g[0] - g[1]) <= 1 && Math.abs(g[1] - g[2]) <= 1, g.join(','));

  const clip = sandbox.__snaptoolsInternals.applyAdjust(makeImage(10, 10, () => [250, 250, 250]), { brightness: 200, contrast: 100, saturation: 100, sharpen: 0, auto: false });
  check('values clamp at 255 (no wraparound)', px(clip, 5, 5)[0] === 255, 'got ' + px(clip, 5, 5)[0]);
}

console.log('\n' + (fail === 0 ? '✅ ALL ' + pass + ' CHECKS PASSED' : '❌ ' + fail + ' FAILED, ' + pass + ' passed') + '\n');
process.exit(fail === 0 ? 0 : 1);
