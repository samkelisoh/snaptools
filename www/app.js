/* SnapTools — tool implementations.
 * All processing is local; nothing is uploaded anywhere.
 */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  function toast(msg) {
    var t = $('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('show'); }, 2600);
  }
  window.toast = toast;

  function loadImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); res(img); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      img.src = url;
    });
  }

  // Large phone photos (12MP+) will blow up canvas memory on cheap devices.
  function fitCanvas(img, maxDim) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var s = Math.min(1, maxDim / Math.max(w, h));
    var c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * s));
    c.height = Math.max(1, Math.round(h * s));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  function canvasToPreview(canvas, holderId) {
    var p = $(holderId);
    p.innerHTML = '';
    var out = new Image();
    out.src = canvas.toDataURL('image/png');
    out.style.maxWidth = '100%';
    p.appendChild(out);
    return out;
  }

  function download(dataUrl, name) {
    var a = document.createElement('a');
    a.href = dataUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  window.download = download;

  /* ==========================================================
   * NAVIGATION
   * ======================================================= */
  window.openView = function (id) {
    document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('active'); });
    $(id).classList.add('active');
    window.scrollTo(0, 0);
  };
  window.goHome = function () { window.openView('homeView'); };

  /* ==========================================================
   * 1. BACKGROUND REMOVER
   *
   * The old version deleted every pixel brighter than 230 — which also
   * deletes white shirts, teeth, paper and sky, and leaves hard jagged
   * edges.
   *
   * This version instead flood-fills inward from the image border, so it
   * only removes background that is actually CONNECTED to the edge. An
   * object's white details are kept because they're enclosed by the
   * subject. Edges are then feathered so the cut-out doesn't look
   * pixelated.
   * ======================================================= */
  var bgSourceCanvas = null;
  var bgResultCanvas = null;

  function colorDist(d, i, r, g, b) {
    var dr = d[i] - r, dg = d[i + 1] - g, db = d[i + 2] - b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }

  function removeBackground(srcCanvas, tolerance) {
    var w = srcCanvas.width, h = srcCanvas.height;
    var ctx = srcCanvas.getContext('2d', { willReadFrequently: true });
    var img = ctx.getImageData(0, 0, w, h);
    var d = img.data;

    // Estimate background colour as the median-ish average of border pixels.
    var rs = 0, gs = 0, bs = 0, n = 0;
    function sample(x, y) {
      var i = (y * w + x) * 4;
      rs += d[i]; gs += d[i + 1]; bs += d[i + 2]; n++;
    }
    for (var x = 0; x < w; x++) { sample(x, 0); sample(x, h - 1); }
    for (var y = 0; y < h; y++) { sample(0, y); sample(w - 1, y); }
    var br = rs / n, bg = gs / n, bb = bs / n;

    // Flood fill from every border pixel (iterative — recursion overflows).
    var visited = new Uint8Array(w * h);
    var stack = [];
    for (var x2 = 0; x2 < w; x2++) { stack.push(x2, 0); stack.push(x2, h - 1); }
    for (var y2 = 0; y2 < h; y2++) { stack.push(0, y2); stack.push(w - 1, y2); }

    while (stack.length) {
      var py = stack.pop(), px = stack.pop();
      if (px < 0 || py < 0 || px >= w || py >= h) continue;
      var p = py * w + px;
      if (visited[p]) continue;
      if (colorDist(d, p * 4, br, bg, bb) > tolerance) continue;
      visited[p] = 1;
      stack.push(px + 1, py); stack.push(px - 1, py);
      stack.push(px, py + 1); stack.push(px, py - 1);
    }

    // Feather: alpha = fraction of non-background neighbours, so the edge
    // fades instead of stair-stepping.
    for (var i = 0; i < visited.length; i++) {
      if (visited[i]) { d[i * 4 + 3] = 0; continue; }
      var cx = i % w, cy = (i / w) | 0;
      var bgN = 0, tot = 0;
      for (var oy = -1; oy <= 1; oy++) {
        for (var ox = -1; ox <= 1; ox++) {
          var nx = cx + ox, ny = cy + oy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          tot++;
          if (visited[ny * w + nx]) bgN++;
        }
      }
      if (bgN > 0) d[i * 4 + 3] = Math.round(255 * (1 - bgN / tot));
    }

    var out = document.createElement('canvas');
    out.width = w; out.height = h;
    out.getContext('2d').putImageData(img, 0, 0);
    return out;
  }

  window.runRemoveBG = function () {
    if (!bgSourceCanvas) { toast('Choose a photo first'); return; }
    var tol = parseInt($('bgTol').value, 10);
    toast('Processing…');
    setTimeout(function () {
      try {
        bgResultCanvas = removeBackground(bgSourceCanvas, tol);
        canvasToPreview(bgResultCanvas, 'bgPreview');
        $('bgSave').style.display = 'block';
        toast('Background removed');
        if (window.showInterstitialReal) window.showInterstitialReal();
      } catch (e) {
        console.error(e);
        toast('Could not process that image');
      }
    }, 30);
  };

  window.saveBG = function () {
    if (!bgResultCanvas) return;
    // PNG, not JPEG — JPEG has no alpha channel and would fill it black.
    download(bgResultCanvas.toDataURL('image/png'), 'snaptools-cutout.png');
  };

  /* ==========================================================
   * 2. DOCUMENT SCANNER
   *
   * Old version: single page, fixed 150pt height (distorted every photo
   * that wasn't exactly that ratio), no image processing.
   *
   * Now: multi-page, aspect-correct A4 fit, and an optional threshold
   * filter that makes a phone photo actually look like a scan.
   * ======================================================= */
  var scanPages = [];

  function scanFilter(canvas) {
    var ctx = canvas.getContext('2d', { willReadFrequently: true });
    var img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    var d = img.data;

    // Grayscale + build histogram.
    var hist = new Uint32Array(256);
    for (var i = 0; i < d.length; i += 4) {
      var v = (d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114) | 0;
      d[i] = d[i + 1] = d[i + 2] = v;
      hist[v]++;
    }

    // Stretch to the 5th–95th percentile so dim phone photos get crisp
    // white paper and black ink.
    var total = canvas.width * canvas.height;
    var lo = 0, hi = 255, acc = 0;
    for (var k = 0; k < 256; k++) { acc += hist[k]; if (acc > total * 0.05) { lo = k; break; } }
    acc = 0;
    for (var k2 = 255; k2 >= 0; k2--) { acc += hist[k2]; if (acc > total * 0.05) { hi = k2; break; } }
    var range = Math.max(1, hi - lo);

    for (var j = 0; j < d.length; j += 4) {
      var nv = ((d[j] - lo) / range) * 255;
      nv = nv < 0 ? 0 : nv > 255 ? 255 : nv;
      d[j] = d[j + 1] = d[j + 2] = nv;
    }
    ctx.putImageData(img, 0, 0);
    return canvas;
  }

  window.addScanPage = function (img) {
    var c = fitCanvas(img, 2000);
    if ($('scanEnhance').checked) scanFilter(c);
    scanPages.push(c);
    renderScanPages();
  };

  function renderScanPages() {
    var p = $('scanPreview');
    if (!scanPages.length) {
      p.innerHTML = '<span style="color:#5a6577">Take a photo of a document</span>';
      $('scanCount').textContent = '';
      return;
    }
    p.innerHTML = '';
    p.style.display = 'block';
    scanPages.forEach(function (c, idx) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;margin:8px';
      var im = new Image();
      im.src = c.toDataURL('image/jpeg', 0.7);
      im.style.cssText = 'max-width:100%;border-radius:8px;display:block';
      var del = document.createElement('button');
      del.textContent = '✕';
      del.style.cssText = 'position:absolute;top:6px;right:6px;background:#ef4444;border:none;color:#fff;width:28px;height:28px;border-radius:14px;font-weight:800';
      del.onclick = function () { scanPages.splice(idx, 1); renderScanPages(); };
      wrap.appendChild(im); wrap.appendChild(del);
      p.appendChild(wrap);
    });
    $('scanCount').textContent = scanPages.length + ' page' + (scanPages.length > 1 ? 's' : '');
  }

  window.makePDF = function () {
    if (!scanPages.length) { toast('Add at least one page'); return; }
    if (!window.jspdf) { toast('PDF engine not loaded'); return; }

    var jsPDF = window.jspdf.jsPDF;
    var doc = null;

    scanPages.forEach(function (c, i) {
      var pw = 210, ph = 297, margin = 8;            // A4 mm
      var maxW = pw - margin * 2, maxH = ph - margin * 2;
      // Preserve aspect ratio — the old code forced every page to 150mm.
      var s = Math.min(maxW / c.width, maxH / c.height);
      var w = c.width * s, h = c.height * s;
      var x = (pw - w) / 2, y = (ph - h) / 2;

      if (i === 0) doc = new jsPDF({ unit: 'mm', format: 'a4' });
      else doc.addPage();
      doc.addImage(c.toDataURL('image/jpeg', 0.85), 'JPEG', x, y, w, h);
    });

    var name = ($('scanName').value || 'SnapTools-Scan').replace(/[^\w\-]+/g, '_');
    doc.save(name + '.pdf');
    toast('PDF saved');
    if (window.showInterstitialReal) window.showInterstitialReal();
  };

  window.clearScan = function () { scanPages = []; renderScanPages(); };

  /* ==========================================================
   * 3. QR TOOLS
   *
   * The old generator drew `Math.random() > .5` squares. That is not a QR
   * code — no scanner on earth could read it. This uses a real Reed-Solomon
   * QR encoder (qrcode-generator, MIT).
   * ======================================================= */
  window.genQR = function () {
    var txt = $('qrText').value.trim();
    if (!txt) { toast('Enter some text or a link'); return; }
    if (typeof qrcode !== 'function') { toast('QR engine not loaded'); return; }

    var ecc = $('qrEcc').value;   // L/M/Q/H
    var qr;
    try {
      qr = qrcode(0, ecc);        // 0 = auto-pick the smallest version
      qr.addData(txt);
      qr.make();
    } catch (e) {
      toast('Text too long for one QR code');
      return;
    }

    var count = qr.getModuleCount();
    var quiet = 4;                                  // spec-required quiet zone
    var scale = Math.max(2, Math.floor(512 / (count + quiet * 2)));
    var size = (count + quiet * 2) * scale;

    var c = document.createElement('canvas');
    c.width = c.height = size;
    var ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#000';
    for (var r = 0; r < count; r++) {
      for (var col = 0; col < count; col++) {
        if (qr.isDark(r, col)) {
          ctx.fillRect((col + quiet) * scale, (r + quiet) * scale, scale, scale);
        }
      }
    }

    window._qrCanvas = c;
    var p = $('qrPreview');
    p.innerHTML = '';
    var im = new Image();
    im.src = c.toDataURL('image/png');
    im.style.cssText = 'max-width:100%;border-radius:12px';
    p.appendChild(im);
    $('qrSave').style.display = 'block';
    toast('QR code ready — try scanning it');
  };

  window.saveQR = function () {
    if (window._qrCanvas) download(window._qrCanvas.toDataURL('image/png'), 'snaptools-qr.png');
  };

  // Scanning uses the platform BarcodeDetector where available.
  window.scanQR = async function () {
    var input = $('qrScanInput');
    if (!input.files || !input.files[0]) { input.click(); return; }
    if (!('BarcodeDetector' in window)) {
      toast('QR scanning not supported on this device');
      return;
    }
    try {
      var img = await loadImage(input.files[0]);
      var det = new window.BarcodeDetector({ formats: ['qr_code'] });
      var codes = await det.detect(fitCanvas(img, 1600));
      if (!codes.length) { toast('No QR code found in that image'); return; }
      var val = codes[0].rawValue;
      $('qrScanResult').textContent = val;
      $('qrScanResult').style.display = 'block';
      toast('QR decoded');
    } catch (e) {
      console.error(e);
      toast('Could not read that image');
    }
  };

  /* ==========================================================
   * 4. PHOTO ENHANCE
   *
   * Old version only set a CSS filter on the preview element, so there was
   * nothing to save — the "HD export" button had no export behind it.
   *
   * Now it renders to a real canvas and supports auto-levels and an
   * unsharp mask (genuine sharpening, which is what "unblur" means here).
   * ======================================================= */
  var enhSource = null;

  function applyAdjust(src, opts) {
    var w = src.width, h = src.height;
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(src, 0, 0);

    var img = ctx.getImageData(0, 0, w, h);
    var d = img.data;

    if (opts.auto) {
      // Per-channel histogram stretch = white balance + contrast in one.
      for (var ch = 0; ch < 3; ch++) {
        var lo = 255, hi = 0;
        for (var i = ch; i < d.length; i += 4) {
          if (d[i] < lo) lo = d[i];
          if (d[i] > hi) hi = d[i];
        }
        var rng = Math.max(1, hi - lo);
        for (var j = ch; j < d.length; j += 4) {
          d[j] = ((d[j] - lo) / rng) * 255;
        }
      }
    }

    var br = opts.brightness / 100;
    var ct = opts.contrast / 100;
    var sa = opts.saturation / 100;

    for (var k = 0; k < d.length; k += 4) {
      var r = d[k] * br, g = d[k + 1] * br, b = d[k + 2] * br;
      r = (r - 128) * ct + 128;
      g = (g - 128) * ct + 128;
      b = (b - 128) * ct + 128;
      var gray = r * 0.299 + g * 0.587 + b * 0.114;
      r = gray + (r - gray) * sa;
      g = gray + (g - gray) * sa;
      b = gray + (b - gray) * sa;
      d[k]     = r < 0 ? 0 : r > 255 ? 255 : r;
      d[k + 1] = g < 0 ? 0 : g > 255 ? 255 : g;
      d[k + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
    }
    ctx.putImageData(img, 0, 0);

    if (opts.sharpen > 0) sharpen(ctx, w, h, opts.sharpen / 100);
    return c;
  }

  // 3x3 unsharp convolution.
  function sharpen(ctx, w, h, amount) {
    var src = ctx.getImageData(0, 0, w, h);
    var out = ctx.createImageData(w, h);
    var s = src.data, o = out.data;
    var c = 1 + 4 * amount, e = -amount;

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var i = (y * w + x) * 4;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
          o[i] = s[i]; o[i+1] = s[i+1]; o[i+2] = s[i+2]; o[i+3] = s[i+3];
          continue;
        }
        for (var ch = 0; ch < 3; ch++) {
          var v = s[i + ch] * c
                + s[i - 4 + ch] * e
                + s[i + 4 + ch] * e
                + s[i - w * 4 + ch] * e
                + s[i + w * 4 + ch] * e;
          o[i + ch] = v < 0 ? 0 : v > 255 ? 255 : v;
        }
        o[i + 3] = s[i + 3];
      }
    }
    ctx.putImageData(out, 0, 0);
  }

  window.applyEnhance = function () {
    if (!enhSource) return;
    var opts = {
      brightness: +$('bright').value,
      contrast:   +$('contrast').value,
      saturation: +$('sat').value,
      sharpen:    +$('sharp').value,
      auto:       $('autoLevels').checked
    };
    $('bVal').textContent = opts.brightness + '%';
    $('cVal').textContent = opts.contrast + '%';
    $('sVal').textContent = opts.saturation + '%';
    $('shVal').textContent = opts.sharpen + '%';

    // Work on a smaller copy for live preview so sliders stay responsive.
    window._enhPreviewCanvas = applyAdjust(fitCanvas(enhSource, 900), opts);
    canvasToPreview(window._enhPreviewCanvas, 'enhPreview');
  };

  // Full-resolution render, called after the rewarded ad gate.
  window.doHdExport = function () {
    if (!enhSource) { toast('Choose a photo first'); return; }
    toast('Rendering full resolution…');
    setTimeout(function () {
      var opts = {
        brightness: +$('bright').value,
        contrast:   +$('contrast').value,
        saturation: +$('sat').value,
        sharpen:    +$('sharp').value,
        auto:       $('autoLevels').checked
      };
      var full = applyAdjust(fitCanvas(enhSource, 4000), opts);
      download(full.toDataURL('image/jpeg', 0.95), 'snaptools-enhanced.jpg');
      toast('Saved at ' + full.width + '×' + full.height);
    }, 30);
  };

  window.resetEnhance = function () {
    $('bright').value = 100; $('contrast').value = 100;
    $('sat').value = 100; $('sharp').value = 0;
    $('autoLevels').checked = false;
    window.applyEnhance();
  };

  /* ==========================================================
   * 5. UNIT CONVERTER
   *
   * Old version did one hardcoded direction per category, and shipped a
   * frozen currency rate (0.054) that silently goes stale and misleads
   * people about money. Currency is now an explicit, user-editable offline
   * rate so it is never presented as live market data.
   * ======================================================= */
  var UNITS = {
    Length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, mi: 1609.344, yd: 0.9144, ft: 0.3048, in: 0.0254 },
    Mass:   { kg: 1, g: 0.001, t: 1000, lb: 0.45359237, oz: 0.028349523 },
    Volume: { L: 1, mL: 0.001, 'm³': 1000, gal: 3.785411784, qt: 0.946352946, 'fl oz': 0.0295735296 },
    Area:   { 'm²': 1, 'km²': 1e6, ha: 10000, 'ft²': 0.09290304, acre: 4046.8564224 },
    Speed:  { 'm/s': 1, 'km/h': 0.277777778, mph: 0.44704, kn: 0.514444444 },
    Data:   { MB: 1, KB: 0.0009765625, GB: 1024, TB: 1048576 }
  };

  window.fillUnits = function () {
    var cat = $('uCat').value;
    var from = $('uFrom'), to = $('uTo');
    from.innerHTML = ''; to.innerHTML = '';

    if (cat === 'Temperature') {
      ['°C', '°F', 'K'].forEach(function (u) {
        from.add(new Option(u, u)); to.add(new Option(u, u));
      });
      to.selectedIndex = 1;
    } else if (cat === 'Currency') {
      ['SZL', 'ZAR', 'USD'].forEach(function (u) {
        from.add(new Option(u, u)); to.add(new Option(u, u));
      });
      to.selectedIndex = 2;
    } else {
      Object.keys(UNITS[cat]).forEach(function (u) {
        from.add(new Option(u, u)); to.add(new Option(u, u));
      });
      to.selectedIndex = Math.min(1, to.options.length - 1);
    }
    $('currNote').style.display = cat === 'Currency' ? 'block' : 'none';
    window.doConvert();
  };

  function tempTo(v, unit) {                 // -> Celsius
    if (unit === '°F') return (v - 32) * 5 / 9;
    if (unit === 'K') return v - 273.15;
    return v;
  }
  function tempFrom(c, unit) {
    if (unit === '°F') return c * 9 / 5 + 32;
    if (unit === 'K') return c + 273.15;
    return c;
  }

  window.doConvert = function () {
    var cat = $('uCat').value;
    var v = parseFloat($('uInput').value);
    if (isNaN(v)) { $('uResult').textContent = '—'; return; }
    var f = $('uFrom').value, t = $('uTo').value, r;

    if (cat === 'Temperature') {
      r = tempFrom(tempTo(v, f), t);
    } else if (cat === 'Currency') {
      // SZL is pegged 1:1 to ZAR; USD leg comes from a rate the user sets.
      var perUsd = parseFloat($('usdRate').value) || 18;
      var inSzl = { SZL: 1, ZAR: 1, USD: perUsd }[f] * v;
      r = inSzl / { SZL: 1, ZAR: 1, USD: perUsd }[t];
    } else {
      r = v * UNITS[cat][f] / UNITS[cat][t];
    }

    var abs = Math.abs(r);
    var txt = abs !== 0 && (abs < 0.001 || abs >= 1e9)
      ? r.toExponential(4)
      : parseFloat(r.toPrecision(8)).toLocaleString(undefined, { maximumFractionDigits: 6 });
    $('uResult').textContent = txt + ' ' + t;
  };

  window.swapUnits = function () {
    var f = $('uFrom'), t = $('uTo');
    var tmp = f.value; f.value = t.value; t.value = tmp;
    window.doConvert();
  };

  /* ==========================================================
   * 6. CASHBOOK
   *
   * This was a dead card — it opened an alert() saying the feature exists
   * "in the full app". Shipping advertised-but-missing features is a Play
   * rejection reason, so it is now a working offline ledger.
   * ======================================================= */
  var LEDGER_KEY = 'snaptools.ledger.v1';

  function loadLedger() {
    try { return JSON.parse(localStorage.getItem(LEDGER_KEY)) || []; }
    catch (e) { return []; }
  }
  function saveLedger(rows) {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(rows));
  }

  window.addEntry = function () {
    var desc = $('cbDesc').value.trim();
    var amt = parseFloat($('cbAmt').value);
    if (!desc) { toast('Add a description'); return; }
    if (isNaN(amt) || amt === 0) { toast('Enter an amount'); return; }

    var rows = loadLedger();
    rows.unshift({
      id: Date.now(),
      desc: desc,
      amt: $('cbType').value === 'out' ? -Math.abs(amt) : Math.abs(amt),
      cur: $('cbCur').value,
      at: new Date().toISOString()
    });
    saveLedger(rows);
    $('cbDesc').value = ''; $('cbAmt').value = '';
    renderLedger();
    toast('Entry saved');
  };

  window.deleteEntry = function (id) {
    saveLedger(loadLedger().filter(function (r) { return r.id !== id; }));
    renderLedger();
  };

  window.clearLedger = function () {
    if (!confirm('Delete all CashBook entries? This cannot be undone.')) return;
    saveLedger([]);
    renderLedger();
    toast('CashBook cleared');
  };

  window.exportLedger = function () {
    var rows = loadLedger();
    if (!rows.length) { toast('Nothing to export'); return; }
    var csv = 'Date,Description,Currency,Amount\n' + rows.map(function (r) {
      return [
        new Date(r.at).toISOString().slice(0, 10),
        '"' + r.desc.replace(/"/g, '""') + '"',
        r.cur,
        r.amt.toFixed(2)
      ].join(',');
    }).join('\n');
    download('data:text/csv;charset=utf-8,' + encodeURIComponent(csv), 'snaptools-cashbook.csv');
    toast('CSV exported');
  };

  function renderLedger() {
    var rows = loadLedger();
    var totals = {};
    rows.forEach(function (r) { totals[r.cur] = (totals[r.cur] || 0) + r.amt; });

    var tEl = $('cbTotals');
    tEl.innerHTML = Object.keys(totals).length
      ? Object.keys(totals).map(function (c) {
          var v = totals[c];
          return '<div style="display:flex;justify-content:space-between;padding:6px 0">' +
                 '<span style="color:#8b95a5">' + c + '</span>' +
                 '<b style="color:' + (v < 0 ? '#ef4444' : '#22c55e') + '">' +
                 v.toFixed(2) + '</b></div>';
        }).join('')
      : '<div style="color:#5a6577;font-size:12px">No entries yet</div>';

    var l = $('cbList');
    l.innerHTML = rows.map(function (r) {
      return '<div style="display:flex;align-items:center;gap:10px;padding:12px;background:#1c1f2a;border:1px solid #252a36;border-radius:12px;margin-top:8px">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' +
            r.desc.replace(/</g, '&lt;') + '</div>' +
          '<div style="font-size:10px;color:#6b7280;margin-top:2px">' +
            new Date(r.at).toLocaleDateString() + '</div>' +
        '</div>' +
        '<b style="font-size:13px;color:' + (r.amt < 0 ? '#ef4444' : '#22c55e') + '">' +
          (r.amt < 0 ? '' : '+') + r.amt.toFixed(2) + ' ' + r.cur + '</b>' +
        '<button onclick="deleteEntry(' + r.id + ')" style="background:none;border:none;color:#6b7280;font-size:16px;padding:4px">✕</button>' +
      '</div>';
    }).join('');
  }
  window.renderLedger = renderLedger;

  /* Exposed only so tools/test-algorithms.js can exercise the pure image
   * logic headlessly. Not used by the UI. */
  window.__snaptoolsInternals = {
    removeBackground: removeBackground,
    scanFilter: scanFilter,
    applyAdjust: applyAdjust,
    sharpen: sharpen
  };

  /* ==========================================================
   * WIRE UP
   * ======================================================= */
  document.addEventListener('DOMContentLoaded', function () {
    $('bgInput').addEventListener('change', function (e) {
      if (!e.target.files[0]) return;
      loadImage(e.target.files[0]).then(function (img) {
        bgSourceCanvas = fitCanvas(img, 1600);
        bgResultCanvas = null;
        canvasToPreview(bgSourceCanvas, 'bgPreview');
        $('bgSave').style.display = 'none';
      }).catch(function () { toast('Could not open that image'); });
    });

    $('scanInput').addEventListener('change', function (e) {
      if (!e.target.files[0]) return;
      loadImage(e.target.files[0]).then(function (img) {
        window.addScanPage(img);
        e.target.value = '';
      }).catch(function () { toast('Could not open that image'); });
    });

    $('enhInput').addEventListener('change', function (e) {
      if (!e.target.files[0]) return;
      loadImage(e.target.files[0]).then(function (img) {
        enhSource = img;
        window.applyEnhance();
      }).catch(function () { toast('Could not open that image'); });
    });

    $('qrScanInput').addEventListener('change', function () { window.scanQR(); });

    window.fillUnits();
    renderLedger();
    renderScanPages();
  });
})();
