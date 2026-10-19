/* 反直觉实验室 — shared helpers: DOM, RNG, math, controls, canvas plots. */
(function () {
  'use strict';
  const PL = (window.PL = {});
  PL.demos = [];
  PL.register = (d) => PL.demos.push(d);

  // ---------- page lifecycle ----------
  let cleanups = [];
  PL.onCleanup = (fn) => cleanups.push(fn);
  PL._runCleanups = () => {
    for (const f of cleanups) { try { f(); } catch (e) { console.error(e); } }
    cleanups = [];
  };
  PL.loop = function (fn) {
    let id = 0, last = performance.now(), alive = true;
    const tick = (t) => {
      if (!alive) return;
      const dt = Math.min(0.1, Math.max(0, (t - last) / 1000));
      last = t;
      fn(dt, t);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    const stop = () => { alive = false; cancelAnimationFrame(id); };
    PL.onCleanup(stop);
    return stop;
  };
  PL.debounce = function (fn, ms = 40) {
    let t = 0;
    const g = (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    PL.onCleanup(() => clearTimeout(t));
    return g;
  };

  // ---------- DOM ----------
  PL.h = function (tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) {
      if (kid == null || kid === false) continue;
      el.append(kid.nodeType ? kid : String(kid));
    }
    return el;
  };
  const h = PL.h;

  // ---------- RNG ----------
  PL.rng = function (seed) {
    let s = (seed >>> 0) || 0x9e3779b9;
    const r = function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    let spare = null;
    r.normal = function () {
      if (spare !== null) { const v = spare; spare = null; return v; }
      let u, v, q;
      do { u = 2 * r() - 1; v = 2 * r() - 1; q = u * u + v * v; } while (q >= 1 || q === 0);
      const m = Math.sqrt(-2 * Math.log(q) / q);
      spare = v * m;
      return u * m;
    };
    r.exp = (mean = 1) => -Math.log(1 - r()) * mean;
    r.gamma = function (k, theta = 1) {
      if (k < 1) return r.gamma(1 + k, theta) * Math.pow(r() || 1e-12, 1 / k);
      const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
      for (;;) {
        let x, v;
        do { x = r.normal(); v = 1 + c * x; } while (v <= 0);
        v = v * v * v;
        const u = r();
        if (u < 1 - 0.0331 * x * x * x * x) return d * v * theta;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * theta;
      }
    };
    r.t = (nu) => r.normal() / Math.sqrt(r.gamma(nu / 2, 2) / nu);
    r.int = (n) => Math.floor(r() * n);
    r.poisson = function (lam) {
      if (lam <= 0) return 0;
      if (lam < 40) {
        const L = Math.exp(-lam);
        let k = 0, p = 1;
        do { k++; p *= r(); } while (p > L);
        return k - 1;
      }
      return Math.max(0, Math.round(lam + Math.sqrt(lam) * r.normal()));
    };
    r.pick = (arr) => arr[Math.floor(r() * arr.length)];
    r.shuffle = (arr) => {
      for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
      return arr;
    };
    return r;
  };
  PL.seed = () => (Math.random() * 2 ** 32) >>> 0;

  // ---------- math ----------
  const M = (PL.m = {});
  M.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  M.lerp = (a, b, t) => a + (b - a) * t;
  M.sum = (a) => { let s = 0; for (const v of a) s += v; return s; };
  M.mean = (a) => (a.length ? M.sum(a) / a.length : NaN);
  M.variance = (a) => { const m = M.mean(a); let s = 0; for (const v of a) s += (v - m) * (v - m); return s / Math.max(1, a.length - 1); };
  M.sd = (a) => Math.sqrt(M.variance(a));
  M.corr = (x, y) => {
    const n = x.length, mx = M.mean(x), my = M.mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { const a = x[i] - mx, b = y[i] - my; sxy += a * b; sxx += a * a; syy += b * b; }
    return sxy / Math.sqrt(sxx * syy);
  };
  M.linreg = (x, y) => {
    const mx = M.mean(x), my = M.mean(y);
    let sxy = 0, sxx = 0;
    for (let i = 0; i < x.length; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; }
    const slope = sxy / sxx;
    return { slope, intercept: my - slope * mx };
  };
  M.quantile = (arr, q) => {
    const a = Float64Array.from(arr).sort();
    if (!a.length) return NaN;
    const i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i);
    return a[lo] + (a[hi] - a[lo]) * (i - lo);
  };
  M.linspace = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
  M.logspace = (a, b, n) => Array.from({ length: n }, (_, i) => a * Math.pow(b / a, i / (n - 1)));
  M.erf = (x) => {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return x >= 0 ? y : -y;
  };
  M.normCdf = (x) => 0.5 * (1 + M.erf(x / Math.SQRT2));
  M.normInv = (p) => { // Acklam
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425;
    let q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  };
  M.lgamma = (x) => { // Lanczos
    const g = 7, cf = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - M.lgamma(1 - x);
    x -= 1;
    let a = cf[0];
    const t = x + g + 0.5;
    for (let i = 1; i < 9; i++) a += cf[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  };
  // solve dense linear system A x = b (A: array of rows), partial pivoting; returns null if singular
  M.solve = (A, b) => {
    const n = b.length;
    const a = A.map((row, i) => [...row, b[i]]);
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[piv][c])) piv = r;
      if (Math.abs(a[piv][c]) < 1e-12) return null;
      [a[c], a[piv]] = [a[piv], a[c]];
      for (let r = 0; r < n; r++) {
        if (r === c) continue;
        const f = a[r][c] / a[c][c];
        if (f) for (let k = c; k <= n; k++) a[r][k] -= f * a[c][k];
      }
    }
    return a.map((row, i) => row[n] / row[i]);
  };

  // ---------- formatting ----------
  PL.fmt = (x, d = 2) => (isFinite(x) ? Number(x).toFixed(d) : '—');
  PL.pct = (x, d = 1) => (isFinite(x) ? (x * 100).toFixed(d) + '%' : '—');
  PL.int = (x) => (isFinite(x) ? Math.round(x).toLocaleString('en-US') : '—');
  PL.signed = (x, d = 1, unit = '') => (isFinite(x) ? (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x).toFixed(d) + unit : '—');
  PL.signedPct = (x, d = 0) => (isFinite(x) ? (x > 0 ? '+' : x < 0 ? '−' : '±') + Math.abs(x * 100).toFixed(d) + '%' : '—');

  // ---------- colors ----------
  let colCache = {};
  PL.col = (name) => {
    if (!name) return '#888';
    if (name[0] === '#' || name.startsWith('rgb') || name.startsWith('hsl') || name === 'transparent') return name;
    if (!(name in colCache)) colCache[name] = getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim() || name;
    return colCache[name];
  };
  PL.font = (px, weight = 400, family = 'sans') => `${weight} ${px}px ${PL.col(family) === family ? 'sans-serif' : PL.col(family)}`;
  const listeners = new Set();
  PL.onTheme = (fn) => { listeners.add(fn); PL.onCleanup(() => listeners.delete(fn)); };
  if (window.matchMedia) {
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { colCache = {}; listeners.forEach((f) => f()); });
  }

  // ---------- canvas stage ----------
  PL.stage = function (parent, opts = {}, draw) {
    const wrap = h('div', { class: 'stage' + (opts.class ? ' ' + opts.class : '') });
    const canvas = h('canvas');
    wrap.append(canvas);
    parent.append(wrap);
    const st = { canvas, wrap, ctx: null, w: 0, h: 0, draw: draw || null };
    const height = opts.height || ((w) => w * (opts.aspect || 0.5));
    st.resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = Math.max(200, wrap.clientWidth || 640);
      const hh = Math.round(typeof height === 'function' ? height(w) : height);
      canvas.style.width = w + 'px';
      canvas.style.height = hh + 'px';
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(hh * dpr);
      st.ctx = canvas.getContext('2d');
      st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      st.w = w; st.h = hh;
    };
    st.render = () => {
      if (!st.ctx) st.resize();
      const c = st.ctx;
      c.save();
      c.clearRect(0, 0, st.w, st.h);
      if (st.draw) st.draw(c, st.w, st.h);
      c.restore();
    };
    st.pos = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const ro = new ResizeObserver(() => {
      const w = wrap.clientWidth;
      if (w && Math.abs(w - st.w) > 0.5) { st.resize(); st.render(); }
    });
    ro.observe(wrap);
    PL.onCleanup(() => ro.disconnect());
    PL.onTheme(() => st.render());
    return st;
  };

  // ---------- plot ----------
  function niceStep(range, n) {
    const raw = range / n;
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / mag;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
  }
  function linTicks(a, b, n) {
    const s = niceStep(b - a, n);
    const out = [];
    for (let v = Math.ceil(a / s - 1e-9) * s; v <= b + s * 1e-9; v += s) out.push(+v.toFixed(12));
    return { ticks: out, step: s };
  }
  function logTicks(a, b) {
    const out = [];
    const e0 = Math.floor(Math.log10(a)), e1 = Math.ceil(Math.log10(b));
    const mults = e1 - e0 <= 2 ? [1, 2, 5] : [1];
    for (let e = e0; e <= e1; e++) for (const m of mults) {
      const v = m * Math.pow(10, e);
      if (v >= a * 0.999 && v <= b * 1.001) out.push(v);
    }
    if (e1 - e0 > 7) return out.filter((v, i) => i % 2 === 0);
    return out;
  }
  function autoFmt(v, step) {
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e6) return +(v / 1e6).toPrecision(3) + 'M';
    if (a >= 1e4) return +(v / 1e3).toPrecision(3) + 'k';
    if (step) {
      const d = Math.max(0, Math.ceil(-Math.log10(step) - 1e-9));
      return v.toFixed(Math.min(d, 6));
    }
    if (a < 1) return String(+v.toPrecision(2));
    return String(+v.toPrecision(4));
  }
  PL.plot = function (parent, o = {}) {
    const p = PL.stage(parent, { height: o.height || 260, class: o.class });
    p.o = o;
    p.x = (o.x || [0, 1]).slice();
    p.y = (o.y || [0, 1]).slice();
    p.fn = o.draw || null;
    const pad = Object.assign({ l: 52, r: 16, t: 14, b: 40 }, o.pad || {});
    const tx = (v) => (o.xlog ? Math.log10(v) : v);
    const ty = (v) => (o.ylog ? Math.log10(v) : v);
    p.X = (v) => { const a = tx(p.x[0]), b = tx(p.x[1]); return p.L + (tx(v) - a) / (b - a) * (p.R - p.L); };
    p.Y = (v) => { const a = ty(p.y[0]), b = ty(p.y[1]); return p.B - (ty(v) - a) / (b - a) * (p.B - p.T); };
    p.invX = (px) => { const a = tx(p.x[0]), b = tx(p.x[1]); const v = a + (px - p.L) / (p.R - p.L) * (b - a); return o.xlog ? Math.pow(10, v) : v; };
    p.invY = (py) => { const a = ty(p.y[0]), b = ty(p.y[1]); const v = a + (p.B - py) / (p.B - p.T) * (b - a); return o.ylog ? Math.pow(10, v) : v; };
    p.setX = (a, b) => { p.x = [a, b]; };
    p.setY = (a, b) => { p.y = [a, b]; };
    p.legend = o.legend || null;

    const style = (c, s = {}) => {
      c.strokeStyle = PL.col(s.color || 's1');
      c.fillStyle = PL.col(s.fill || s.color || 's1');
      c.lineWidth = s.width || 2;
      c.globalAlpha = s.alpha == null ? 1 : s.alpha;
      c.setLineDash(s.dash || []);
      c.lineJoin = 'round';
      c.lineCap = 'round';
    };
    p.line = (xs, ys, s = {}) => {
      const c = p.ctx; c.save(); style(c, s); c.beginPath();
      let pen = false;
      for (let i = 0; i < xs.length; i++) {
        const X = p.X(xs[i]), Y = p.Y(ys[i]);
        if (!isFinite(X) || !isFinite(Y)) { pen = false; continue; }
        const Yc = M.clamp(Y, -1e4, 1e4);
        if (!pen) { c.moveTo(X, Yc); pen = true; } else c.lineTo(X, Yc);
      }
      c.stroke(); c.restore();
    };
    p.func = (f, s = {}) => {
      const n = s.n || 240;
      const xs = o.xlog ? M.logspace(p.x[0], p.x[1], n) : M.linspace(p.x[0], p.x[1], n);
      p.line(xs, xs.map(f), s);
    };
    p.area = (xs, y0, y1, s = {}) => {
      const c = p.ctx; c.save(); style(c, s); c.globalAlpha = s.alpha == null ? 0.15 : s.alpha; c.beginPath();
      const lo = typeof y0 === 'number' ? xs.map(() => y0) : y0;
      xs.forEach((x, i) => (i ? c.lineTo(p.X(x), p.Y(y1[i])) : c.moveTo(p.X(x), p.Y(y1[i]))));
      for (let i = xs.length - 1; i >= 0; i--) c.lineTo(p.X(xs[i]), p.Y(lo[i]));
      c.closePath(); c.fill(); c.restore();
    };
    p.dots = (xs, ys, s = {}) => {
      const c = p.ctx; c.save(); style(c, s);
      const r = s.r || 2.5;
      const cols = s.colors;
      for (let i = 0; i < xs.length; i++) {
        const X = p.X(xs[i]), Y = p.Y(ys[i]);
        if (!isFinite(X) || !isFinite(Y)) continue;
        if (cols) c.fillStyle = PL.col(cols[i]);
        c.beginPath(); c.arc(X, Y, r, 0, 7); c.fill();
      }
      c.restore();
    };
    p.point = (x, y, s = {}) => {
      const c = p.ctx; c.save(); style(c, s);
      const X = p.X(x), Y = p.Y(y);
      c.beginPath(); c.arc(X, Y, s.r || 5, 0, 7);
      if (s.hollow) { c.fillStyle = PL.col('panel'); c.fill(); c.stroke(); } else { c.fill(); c.lineWidth = 2; c.strokeStyle = PL.col('panel'); c.stroke(); }
      c.restore();
      if (s.label) p.text(x, y, s.label, Object.assign({ dx: 8, dy: -8, color: s.color }, s.labelStyle || {}));
    };
    p.bars = (xs, hs, s = {}) => {
      const c = p.ctx; c.save(); style(c, s);
      const w = s.w || (xs.length > 1 ? Math.abs(xs[1] - xs[0]) * 0.86 : 1);
      const base = s.base || 0;
      for (let i = 0; i < xs.length; i++) {
        if (s.colors) c.fillStyle = PL.col(s.colors[i]);
        const x0 = p.X(xs[i] - w / 2), x1 = p.X(xs[i] + w / 2);
        const y0 = p.Y(base), y1 = p.Y(hs[i]);
        c.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0));
      }
      c.restore();
    };
    p.hist = (vals, s = {}) => {
      const bins = s.bins || 40;
      const [a, b] = s.range || [p.x[0], p.x[1]];
      const counts = new Array(bins).fill(0);
      const bw = (b - a) / bins;
      for (const v of vals) { const k = Math.floor((v - a) / bw); if (k >= 0 && k < bins) counts[k]++; }
      const tot = vals.length || 1;
      const hs = counts.map((c) => (s.density ? c / tot / bw : s.frac ? c / tot : c));
      const xs = counts.map((_, i) => a + (i + 0.5) * bw);
      if (s.autoY) p.y = [0, (Math.max(...hs) || 1) * (s.autoY === true ? 1.15 : s.autoY)];
      p.bars(xs, hs, Object.assign({ w: bw * 0.92 }, s));
      return { xs, hs, bw };
    };
    p.vline = (x, s = {}) => {
      const c = p.ctx; c.save(); style(c, Object.assign({ width: 1.5, color: 'ink3', dash: [4, 4] }, s));
      const X = p.X(x); c.beginPath(); c.moveTo(X, p.T); c.lineTo(X, p.B); c.stroke(); c.restore();
      if (s.label) p.textPx(X + 5, p.T + 12, s.label, { color: s.color || 'ink2', align: s.align || 'left' });
    };
    p.hline = (y, s = {}) => {
      const c = p.ctx; c.save(); style(c, Object.assign({ width: 1.5, color: 'ink3', dash: [4, 4] }, s));
      const Y = p.Y(y); c.beginPath(); c.moveTo(p.L, Y); c.lineTo(p.R, Y); c.stroke(); c.restore();
      if (s.label) p.textPx(s.align === 'left' ? p.L + 6 : p.R - 6, Y - 6, s.label, { color: s.color || 'ink2', align: s.align || 'right' });
    };
    p.textPx = (X, Y, str, s = {}) => {
      const c = p.ctx; c.save();
      c.font = PL.font(s.size || 12, s.weight || 400);
      c.fillStyle = PL.col(s.color || 'ink2');
      c.textAlign = s.align || 'left';
      c.textBaseline = s.baseline || 'alphabetic';
      if (s.halo !== false) { c.lineWidth = 3; c.strokeStyle = PL.col('panel'); c.globalAlpha = 0.85; c.strokeText(str, X, Y); c.globalAlpha = 1; }
      c.fillText(str, X, Y);
      c.restore();
    };
    p.text = (x, y, str, s = {}) => p.textPx(p.X(x) + (s.dx || 0), p.Y(y) + (s.dy || 0), str, s);
    p.arrow = (x0, y0, x1, y1, s = {}) => {
      const c = p.ctx; c.save(); style(c, Object.assign({ width: 1.5 }, s));
      const X0 = p.X(x0), Y0 = p.Y(y0), X1 = p.X(x1), Y1 = p.Y(y1);
      PL.drawArrow(c, X0, Y0, X1, Y1, s.head || 7);
      c.restore();
    };
    p.rect = (x0, y0, x1, y1, s = {}) => {
      const c = p.ctx; c.save(); style(c, s); c.globalAlpha = s.alpha == null ? 0.12 : s.alpha;
      c.fillRect(p.X(x0), p.Y(y1), p.X(x1) - p.X(x0), p.Y(y0) - p.Y(y1)); c.restore();
    };

    p.draw = (c, w, hh) => {
      p.ctx = c;
      p.L = pad.l; p.R = w - pad.r; p.T = pad.t; p.B = hh - pad.b;
      // grid + ticks
      c.font = PL.font(11);
      const xt = o.xticks ? { ticks: o.xticks, step: null } : o.xlog ? { ticks: logTicks(p.x[0], p.x[1]), step: null } : linTicks(p.x[0], p.x[1], Math.max(3, Math.round((p.R - p.L) / 80)));
      const yt = o.yticks ? { ticks: o.yticks, step: null } : o.ylog ? { ticks: logTicks(p.y[0], p.y[1]), step: null } : linTicks(p.y[0], p.y[1], Math.max(3, Math.round((p.B - p.T) / 46)));
      const xf = o.xfmt || ((v) => autoFmt(v, xt.step));
      const yf = o.yfmt || ((v) => autoFmt(v, yt.step));
      c.strokeStyle = PL.col('grid'); c.lineWidth = 1;
      c.fillStyle = PL.col('ink3');
      c.textAlign = 'center'; c.textBaseline = 'top';
      for (const v of xt.ticks) {
        const X = Math.round(p.X(v)) + 0.5;
        if (X < p.L - 1 || X > p.R + 1) continue;
        c.beginPath(); c.moveTo(X, p.T); c.lineTo(X, p.B); c.stroke();
        c.fillText(xf(v), X, p.B + 6);
      }
      c.textAlign = 'right'; c.textBaseline = 'middle';
      for (const v of yt.ticks) {
        const Y = Math.round(p.Y(v)) + 0.5;
        if (Y < p.T - 1 || Y > p.B + 1) continue;
        c.beginPath(); c.moveTo(p.L, Y); c.lineTo(p.R, Y); c.stroke();
        c.fillText(yf(v), p.L - 6, Y);
      }
      c.strokeStyle = PL.col('line'); c.lineWidth = 1;
      c.beginPath(); c.moveTo(p.L + 0.5, p.T); c.lineTo(p.L + 0.5, p.B + 0.5); c.lineTo(p.R, p.B + 0.5); c.stroke();
      c.fillStyle = PL.col('ink2'); c.font = PL.font(12);
      if (o.xlabel) { c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillText(o.xlabel, (p.L + p.R) / 2, hh - 2); }
      if (o.ylabel) {
        c.save(); c.translate(12, (p.T + p.B) / 2); c.rotate(-Math.PI / 2);
        c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(o.ylabel, 0, 0); c.restore();
      }
      c.save();
      c.beginPath(); c.rect(p.L - 6, p.T - 6, p.R - p.L + 12, p.B - p.T + 12); c.clip();
      if (p.fn) p.fn(p);
      c.restore();
      if (p.legend && p.legend.length) drawLegend(p, c, p.legend);
      if (p.after) p.after(p);
    };
    function drawLegend(p, c, items) {
      c.save();
      c.font = PL.font(12);
      const rowH = 18, padX = 8;
      const wMax = Math.max(...items.map((it) => c.measureText(it.label).width)) + 30;
      const boxW = wMax + padX * 2 - 8, boxH = items.length * rowH + 8;
      const pos = o.legendPos || 'tr';
      const X0 = pos.includes('l') ? p.L + 8 : p.R - boxW - 6;
      const Y0 = pos.includes('b') ? p.B - boxH - 6 : p.T + 4;
      c.globalAlpha = 0.88; c.fillStyle = PL.col('panel'); c.fillRect(X0, Y0, boxW, boxH); c.globalAlpha = 1;
      items.forEach((it, i) => {
        const y = Y0 + 4 + rowH * i + rowH / 2;
        c.strokeStyle = c.fillStyle = PL.col(it.color);
        if (it.type === 'dot') { c.beginPath(); c.arc(X0 + padX + 9, y, 4, 0, 7); c.fill(); }
        else if (it.type === 'box') { c.globalAlpha = 0.5; c.fillRect(X0 + padX, y - 5, 18, 10); c.globalAlpha = 1; }
        else { c.lineWidth = it.width || 2.5; c.setLineDash(it.dash || []); c.beginPath(); c.moveTo(X0 + padX, y); c.lineTo(X0 + padX + 18, y); c.stroke(); c.setLineDash([]); }
        c.fillStyle = PL.col('ink2'); c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText(it.label, X0 + padX + 24, y);
      });
      c.restore();
    }
    return p;
  };

  PL.drawArrow = (c, x0, y0, x1, y1, head = 7) => {
    const a = Math.atan2(y1 - y0, x1 - x0);
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    if (Math.hypot(x1 - x0, y1 - y0) < 2) return;
    c.setLineDash([]);
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x1 - head * Math.cos(a - 0.45), y1 - head * Math.sin(a - 0.45));
    c.lineTo(x1 - head * Math.cos(a + 0.45), y1 - head * Math.sin(a + 0.45));
    c.closePath();
    c.fillStyle = c.strokeStyle; c.fill();
  };

  // ---------- page building blocks ----------
  PL.panel = function (root, title, note) {
    const el = h('section', { class: 'panel' });
    if (title) el.append(h('h3', { class: 'panel-title', html: title }));
    if (note) el.append(h('p', { class: 'panel-note', html: note }));
    const ctrlEl = h('div', { class: 'controls' });
    const fig = h('div', { class: 'figs' });
    el.append(ctrlEl, fig);
    root.append(el);
    const pn = { el, fig, ctrl: PL.controls(ctrlEl) };
    pn.cols = (n = 2) => { fig.classList.add(n === 3 ? 'three' : 'two'); return pn; };
    pn.box = (cls) => { const b = h('div', { class: 'fig' + (cls ? ' ' + cls : '') }); fig.append(b); return b; };
    pn.stats = (items) => PL.stats(el, items);
    pn.note = (html) => { const n = h('p', { class: 'panel-foot', html }); el.append(n); return n; };
    pn.html = (html, cls = 'panel-html') => { const n = h('div', { class: cls, html }); el.append(n); return n; };
    return pn;
  };
  PL.prose = (root, html) => { const el = h('section', { class: 'prose', html }); root.append(el); return el; };

  PL.controls = function (el) {
    const api = { el };
    api.slider = ({ label, min, max, step = 1, value, fmt = (v) => v, onInput, log = false, wide = false }) => {
      const input = h('input', { type: 'range' });
      const out = h('output');
      const wrapEl = h('label', { class: 'ctl slider' + (wide ? ' wide' : '') }, h('span', { class: 'ctl-label', html: label }), input, out);
      el.append(wrapEl);
      const toPos = (v) => (log ? Math.log(v / min) / Math.log(max / min) * 1000 : v);
      const fromPos = (t) => {
        if (!log) return +t;
        let v = min * Math.pow(max / min, t / 1000);
        if (step) v = Math.round(v / step) * step;
        return M.clamp(v, min, max);
      };
      if (log) { input.min = 0; input.max = 1000; input.step = 1; } else { input.min = min; input.max = max; input.step = step; }
      let cur = value;
      input.value = toPos(value);
      out.textContent = fmt(value);
      input.addEventListener('input', () => {
        cur = fromPos(input.value);
        out.textContent = fmt(cur);
        onInput && onInput(cur);
      });
      return {
        el: wrapEl,
        get: () => cur,
        set: (v, fire = false) => { cur = v; input.value = toPos(v); out.textContent = fmt(v); if (fire && onInput) onInput(v); },
      };
    };
    api.toggle = ({ label, value = false, onChange }) => {
      const input = h('input', { type: 'checkbox' });
      input.checked = value;
      const wrapEl = h('label', { class: 'ctl toggle' }, input, h('span', { class: 'switch' }), h('span', { class: 'ctl-label', html: label }));
      el.append(wrapEl);
      input.addEventListener('change', () => onChange && onChange(input.checked));
      return { el: wrapEl, get: () => input.checked, set: (v, fire = false) => { input.checked = v; if (fire && onChange) onChange(v); } };
    };
    api.seg = ({ label, options, value, onChange }) => {
      const box = h('div', { class: 'seg' });
      let cur = value;
      const btns = options.map((op) => {
        const o = typeof op === 'object' ? op : { value: op, label: String(op) };
        const b = h('button', { type: 'button', html: o.label, class: o.value === value ? 'on' : '' });
        b.addEventListener('click', () => { set(o.value, true); });
        b._v = o.value;
        box.append(b);
        return b;
      });
      function set(v, fire) {
        cur = v;
        btns.forEach((b) => b.classList.toggle('on', b._v === v));
        if (fire && onChange) onChange(v);
      }
      const wrapEl = h('div', { class: 'ctl segwrap' }, label ? h('span', { class: 'ctl-label', html: label }) : null, box);
      el.append(wrapEl);
      return { el: wrapEl, get: () => cur, set };
    };
    api.button = (label, onClick, cls = '') => {
      const b = h('button', { type: 'button', class: 'btn ' + cls, html: label });
      b.addEventListener('click', onClick);
      el.append(b);
      return b;
    };
    api.text = (html) => { const s = h('span', { class: 'ctl-text', html }); el.append(s); return s; };
    api.break = () => { el.append(h('div', { class: 'ctl-break' })); };
    return api;
  };

  PL.stats = function (parent, items) {
    const el = h('div', { class: 'stats' });
    const map = {};
    for (const it of items) {
      const v = h('div', { class: 'stat-v', text: '—' });
      const s = h('div', { class: 'stat-s', html: it.sub || '' });
      const tile = h('div', { class: 'stat' }, h('div', { class: 'stat-l', html: it.label }), v, s);
      if (it.color) tile.style.setProperty('--sc', PL.col(it.color));
      map[it.key] = { tile, v, s };
      el.append(tile);
    }
    parent.append(el);
    return {
      el,
      set(key, val, sub, tone) {
        const m = map[key];
        if (!m) return;
        m.v.textContent = val;
        if (sub !== undefined && sub !== null) m.s.innerHTML = sub;
        if (tone !== undefined) m.tile.dataset.tone = tone || '';
      },
    };
  };

  PL.table = function (parent, cols, cls = '') {
    const t = h('table', { class: 'tbl ' + cls });
    const thead = h('thead', null, h('tr', null, cols.map((c) => h('th', { html: c }))));
    const tbody = h('tbody');
    t.append(thead, tbody);
    parent.append(t);
    return {
      el: t,
      rows(rows) {
        tbody.innerHTML = '';
        for (const r of rows) {
          const tr = h('tr', r.cls ? { class: r.cls } : null);
          (r.cells || r).forEach((c) => tr.append(h('td', { html: String(c) })));
          tbody.append(tr);
        }
      },
    };
  };
})();
