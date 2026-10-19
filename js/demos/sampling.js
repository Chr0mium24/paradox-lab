/* 类别二：你看到的样本是偏的 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 检查悖论：公交车
  // ======================================================================
  PL.register({
    id: 'bus', cat: 'sampling', nav: '检查悖论：车总是来得慢',
    title: '检查悖论：你等车的时间，比"间隔的一半"长',
    hook: '公交平均 10 分钟一班。车如果准点，你平均等 5 分钟；车如果随机到站，你平均要等整整 10 分钟。',
    related: ['friends', 'screening', 'queue', 'survivor'],
    render(root) {
      const MU = 10, WIN = 160;
      const st = { cv: 1, seed: PL.seed() };
      let sim;
      function gen() {
        const r = PL.rng(st.seed);
        const k = st.cv < 0.02 ? 0 : Math.min(1e4, 1 / (st.cv * st.cv));
        const gap = () => (k === 0 ? MU : r.gamma(k, MU / k));
        const n = 20000;
        const times = new Float64Array(n + 1);
        let t = 0;
        for (let i = 1; i <= n; i++) { t += gap(); times[i] = t; }
        const find = (u) => { let lo = 1, hi = n; while (lo < hi) { const mid = (lo + hi) >> 1; if (times[mid] >= u) hi = mid; else lo = mid + 1; } return lo; };
        let sumW = 0, sumI = 0;
        const P = 30000;
        for (let j = 0; j < P; j++) {
          const u = r() * t, i = find(u);
          sumW += times[i] - u; sumI += times[i] - times[i - 1];
        }
        // view window
        const buses = [];
        for (let i = 0; i <= n && times[i] <= WIN + 60; i++) buses.push(times[i]);
        const pax = [];
        for (let j = 0; j < 90; j++) {
          const u = r() * WIN;
          let nb = buses.find((b) => b >= u);
          pax.push({ t: u, w: nb - u, y: r() });
        }
        sim = { meanGap: t / n, meanWait: sumW / P, meanInt: sumI / P, buses, pax };
      }
      const pn = PL.panel(root, '一条公交线路的 160 分钟', '竖线是公交到站，圆点是随机到达的乘客，横线是他们等车的时间。平均发车间隔固定为 10 分钟，只改变间隔的"规律程度"。');
      const sl = pn.ctrl.slider({ label: '间隔的变异系数 CV', min: 0, max: 2, step: 0.05, value: st.cv, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.cv = v; seg.set(null); update(); } });
      const seg = pn.ctrl.seg({ options: [{ value: 0, label: '准点' }, { value: 1, label: '随机' }, { value: 1.6, label: '串车' }], value: 1, onChange: (v) => { st.cv = v; sl.set(v); update(); } });
      pn.ctrl.button('重新抽样', () => { st.seed = PL.seed(); update(); });
      const tl = PL.stage(pn.box(), { height: 200 }, (c, w, hh) => {
        const L = 20, R = w - 20, y0 = hh - 46;
        const X = (t) => L + (t / WIN) * (R - L);
        c.strokeStyle = PL.col('line'); c.lineWidth = 2;
        c.beginPath(); c.moveTo(L, y0); c.lineTo(R, y0); c.stroke();
        c.font = PL.font(11); c.fillStyle = PL.col('ink3'); c.textAlign = 'center';
        for (let t = 0; t <= WIN; t += 20) { c.fillText(t + ' 分', X(t), y0 + 30); c.fillRect(X(t) - 0.5, y0, 1, 5); }
        // intervals under line
        for (let i = 1; i < sim.buses.length; i++) {
          const a = sim.buses[i - 1], b = sim.buses[i];
          if (a > WIN) break;
          if (b - a > 14) {
            c.fillStyle = PL.col('ink3');
            c.fillText(PL.fmt(b - a, 0), X((a + Math.min(b, WIN)) / 2), y0 + 16);
          }
        }
        // passengers
        for (const p of sim.pax) {
          const yy = 14 + p.y * (y0 - 30);
          const col = p.w > 15 ? 's2' : p.w > 7 ? 's6' : 's3';
          c.strokeStyle = PL.col(col); c.globalAlpha = 0.55; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(X(p.t), yy); c.lineTo(X(Math.min(WIN, p.t + p.w)), yy); c.stroke();
          c.globalAlpha = 1; c.fillStyle = PL.col(col);
          c.beginPath(); c.arc(X(p.t), yy, 3, 0, 7); c.fill();
        }
        // buses
        for (const b of sim.buses) {
          if (b > WIN) break;
          c.fillStyle = PL.col('ink'); c.globalAlpha = 0.18; c.fillRect(X(b) - 0.75, 6, 1.5, y0 - 6); c.globalAlpha = 1;
          c.fillStyle = PL.col('s1');
          c.beginPath(); c.roundRect(X(b) - 6, y0 - 7, 12, 14, 3); c.fill();
        }
      });
      const pn2box = pn.box();
      const ch = PL.plot(pn2box, {
        height: 230, x: [0, 2], y: [0, 32], xlabel: '间隔的变异系数 CV', ylabel: '乘客平均等待（分钟）',
        legend: [{ label: '理论 5 × (1 + CV²)', color: 's2' }, { label: '模拟', color: 'ink', type: 'dot' }], legendPos: 'tl',
      });
      ch.fn = (p) => {
        p.hline(5, { color: 's3', label: '准点：5 分钟', align: 'right' });
        p.func((cv) => 5 * (1 + cv * cv), { color: 's2', width: 2.5 });
        p.point(st.cv, sim.meanWait, { color: 'ink', r: 5 });
      };
      const stats = pn.stats([
        { key: 'gap', label: '平均发车间隔', color: 's1' },
        { key: 'wait', label: '乘客平均等待（模拟）', color: 's2' },
        { key: 'th', label: '理论值 (μ/2)(1+CV²)', color: 's6' },
        { key: 'int', label: '乘客"撞上"的间隔平均长', color: 's4' },
      ]);
      function update() {
        gen();
        stats.set('gap', PL.fmt(sim.meanGap, 1) + ' 分', '按车次平均');
        stats.set('wait', PL.fmt(sim.meanWait, 1) + ' 分', '按乘客平均', sim.meanWait > 6 ? 'bad' : 'good');
        stats.set('th', PL.fmt(5 * (1 + st.cv * st.cv), 1) + ' 分');
        stats.set('int', PL.fmt(sim.meanInt, 1) + ' 分', '理论 μ(1+CV²)');
        tl.render(); ch.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>车的平均间隔是 10 分钟，但你到站的时刻并不是均匀地落在"每一个间隔"上，而是均匀地落在<b>时间</b>上。长间隔占的时间多，所以你更可能撞上一个长间隔；而在长间隔里，你要等的时间也更长。两件事叠加起来，平均等待就比"间隔的一半"长。</p>
        <div class="formula">平均等待 = E[T²] ÷ (2·E[T]) = (μ/2) × (1 + CV²)</div>
        <p>μ 是平均间隔，CV 是间隔的变异系数（标准差 ÷ 均值）。准点（CV = 0）时平均等 μ/2 = 5 分钟；完全随机（泊松过程，CV = 1）时平均等 μ = 10 分钟；串车（CV &gt; 1）时还要更久。</p>
        <p class="try">把 CV 调到 1.6（串车）：班次总数一样，你平均却要等 18 分钟。在时间轴上看：大部分乘客都挤在少数几个长间隔里。</p>

        <h2>这叫检查悖论</h2>
        <p>只要一个东西被你抽中的概率跟它的长度（时长、大小）成正比，你看到的平均值就会系统性偏大。乘客"撞上"的那个间隔平均长 μ(1 + CV²)：随机到站时是 20 分钟，是真实平均间隔的两倍。</p>
        <ul>
          <li><b>旁边车道总是更快</b>：堵车时，你被别人超车的时段比你超别人的时段持续得更久，所以你大部分时间都在看别人超你（Redelmeier &amp; Tibshirani, <i>Nature</i> 1999）。</li>
          <li><b>调查在押犯人会高估平均刑期</b>：刑期长的人，在任何一个时刻都更可能还在监狱里。</li>
          <li><b>健身房总是很挤</b>：你去的时候恰好是大多数人去的时候。按"人"平均的拥挤程度，高于按"时段"平均的拥挤程度。</li>
          <li><b>失业时长、住院时长</b>：在某一天做抽样调查，抽到的长期失业者、长期住院者总是偏多。</li>
          <li><b>医学筛查</b>：长得慢的肿瘤更容易被筛查撞上，见${PL.link('screening', '筛查悖论')}里的"长度偏倚"。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>看到"平均"，先问一句：<b>按什么单位平均的？</b>按车次还是按乘客，按班级还是按学生，按时段还是按人。对公交公司来说，减少间隔的波动（防止串车）和增加班次一样能缩短乘客的等待，这一点和${PL.link('queue', '排队论')}里"降低波动"的结论一致。</div>
      `);
    },
  });

  // ======================================================================
  // 友谊悖论 + 班级规模 + 熟人免疫
  // ======================================================================
  function genGraph(N, type, r, m = 2) {
    const adj = Array.from({ length: N }, () => new Set());
    const add = (a, b) => { if (a !== b) { adj[a].add(b); adj[b].add(a); } };
    if (type === 'ba') {
      const rep = [];
      for (let i = 0; i <= m; i++) for (let j = 0; j < i; j++) { add(i, j); rep.push(i, j); }
      for (let v = m + 1; v < N; v++) {
        const targets = new Set();
        while (targets.size < m) targets.add(rep[Math.floor(r() * rep.length)]);
        for (const t of targets) { add(v, t); rep.push(v, t); }
      }
    } else {
      const E = m * N;
      let e = 0;
      while (e < E) { const a = r.int(N), b = r.int(N); if (a !== b && !adj[a].has(b)) { add(a, b); e++; } }
    }
    return adj.map((s) => [...s]);
  }
  function layout(adj, r) {
    const N = adj.length;
    const x = new Float64Array(N), y = new Float64Array(N);
    for (let i = 0; i < N; i++) { x[i] = r() - 0.5; y[i] = r() - 0.5; }
    const k = Math.sqrt(1 / N);
    let temp = 0.1;
    const dx = new Float64Array(N), dy = new Float64Array(N);
    for (let it = 0; it < 320; it++) {
      dx.fill(0); dy.fill(0);
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        let ux = x[i] - x[j], uy = y[i] - y[j];
        const d2 = ux * ux + uy * uy + 1e-6, f = (k * k) / d2;
        ux *= f; uy *= f;
        dx[i] += ux; dy[i] += uy; dx[j] -= ux; dy[j] -= uy;
      }
      for (let i = 0; i < N; i++) for (const j of adj[i]) if (j > i) {
        const ux = x[i] - x[j], uy = y[i] - y[j];
        const d = Math.sqrt(ux * ux + uy * uy) + 1e-9, f = d / k;
        dx[i] -= ux * f; dy[i] -= uy * f; dx[j] += ux * f; dy[j] += uy * f;
      }
      for (let i = 0; i < N; i++) {
        // gentle gravity to keep isolated pieces near the middle
        dx[i] -= x[i] * 0.6; dy[i] -= y[i] * 0.6;
        const d = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) + 1e-9;
        const s = Math.min(d, temp) / d;
        x[i] += dx[i] * s; y[i] += dy[i] * s;
      }
      temp *= 0.985;
    }
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let i = 0; i < N; i++) { x0 = Math.min(x0, x[i]); x1 = Math.max(x1, x[i]); y0 = Math.min(y0, y[i]); y1 = Math.max(y1, y[i]); }
    return Array.from({ length: N }, (_, i) => [(x[i] - x0) / (x1 - x0 || 1), (y[i] - y0) / (y1 - y0 || 1)]);
  }
  function giant(adj, removed) {
    const N = adj.length, parent = new Int32Array(N).map((_, i) => i), size = new Int32Array(N).fill(1);
    const find = (a) => { while (parent[a] !== a) { parent[a] = parent[parent[a]]; a = parent[a]; } return a; };
    for (let i = 0; i < N; i++) if (!removed[i]) for (const j of adj[i]) if (j > i && !removed[j]) {
      let a = find(i), b = find(j);
      if (a !== b) { if (size[a] < size[b]) [a, b] = [b, a]; parent[b] = a; size[a] += size[b]; }
    }
    let best = 0;
    for (let i = 0; i < N; i++) if (!removed[i] && parent[i] === i) best = Math.max(best, size[i]);
    return best / N;
  }

  PL.register({
    id: 'friends', cat: 'sampling', nav: '友谊悖论：你的朋友比你朋友多',
    title: '友谊悖论：你的朋友，平均比你朋友多',
    hook: '这不是因为你不受欢迎，而是朋友多的人会出现在更多人的好友列表里。同一个道理也能解释为什么学校的"平均班级人数"和你感受到的不一样。',
    related: ['bus', 'survivor', 'berkson'],
    render(root) {
      // ---- part 1: class sizes ----
      const cs = { n: 9, small: 10, big: 210 };
      const p1 = PL.panel(root, '先看一个简单的：班级规模', '每个点是一个学生，颜色是他所在的班。灰色是小班，红色是那一个大课。');
      p1.ctrl.slider({ label: '小班数量', min: 1, max: 30, step: 1, value: cs.n, fmt: (v) => v + ' 个', onInput: (v) => { cs.n = v; up1(); } });
      p1.ctrl.slider({ label: '小班人数', min: 5, max: 50, step: 1, value: cs.small, fmt: (v) => v + ' 人', onInput: (v) => { cs.small = v; up1(); } });
      p1.ctrl.slider({ label: '大课人数', min: 20, max: 500, step: 5, value: cs.big, fmt: (v) => v + ' 人', onInput: (v) => { cs.big = v; up1(); } });
      const waffle = PL.stage(p1.box(), { height: (w) => Math.max(110, Math.min(220, w * 0.22)) }, (c, w, hh) => {
        const total = cs.n * cs.small + cs.big;
        const area = (w - 10) * (hh - 10);
        const cell = Math.max(3, Math.min(14, Math.floor(Math.sqrt(area / total))));
        const cols = Math.floor((w - 10) / cell);
        let i = 0;
        const draw = (n, col, alpha) => {
          c.fillStyle = PL.col(col); c.globalAlpha = alpha;
          for (let k = 0; k < n; k++, i++) {
            const x = 5 + (i % cols) * cell, y = 5 + Math.floor(i / cols) * cell;
            if (y > hh) return;
            c.beginPath(); c.arc(x + cell / 2, y + cell / 2, cell * 0.36, 0, 7); c.fill();
          }
        };
        for (let k = 0; k < cs.n; k++) draw(cs.small, k % 2 ? 's7' : 'ink3', 0.75);
        draw(cs.big, 's2', 0.9);
        c.globalAlpha = 1;
      });
      const s1 = p1.stats([
        { key: 'school', label: '学校报告：平均班级人数', color: 's7', sub: '按"班"平均' },
        { key: 'student', label: '学生体验：我所在班级的平均人数', color: 's2', sub: '按"人"平均' },
        { key: 'frac', label: '坐在大课里的学生', color: 's4' },
      ]);
      function up1() {
        const sizes = [...Array(cs.n).fill(cs.small), cs.big];
        const tot = M.sum(sizes);
        s1.set('school', PL.fmt(tot / sizes.length, 1) + ' 人');
        s1.set('student', PL.fmt(M.sum(sizes.map((s) => s * s)) / tot, 1) + ' 人', null, 'bad');
        s1.set('frac', PL.pct(cs.big / tot, 0));
        waffle.render();
      }
      up1();

      // ---- part 2: network ----
      const ns = { type: 'ba', N: 70, seed: PL.seed() };
      const p2 = PL.panel(root, '友谊悖论：一个小型社交网络', '点的大小 = 朋友数。<b style="color:var(--s2)">红色</b>：这个人的朋友平均比他自己朋友多；<b style="color:var(--s1)">蓝色</b>：反之。把鼠标移到点上看细节。').cols(2);
      p2.ctrl.seg({ label: '网络类型', options: [{ value: 'ba', label: '无标度（有网红）' }, { value: 'er', label: '随机（大家差不多）' }], value: ns.type, onChange: (v) => { ns.type = v; build(); } });
      p2.ctrl.slider({ label: '人数', min: 30, max: 150, step: 5, value: ns.N, fmt: (v) => v + ' 人', onInput: PL.debounce((v) => { ns.N = v; build(); }, 120) });
      p2.ctrl.button('重新生成', () => { ns.seed = PL.seed(); build(); });
      let G = null, hover = -1;
      const netBox = p2.box();
      const net = PL.stage(netBox, { height: (w) => Math.min(420, Math.max(280, w * 0.9)) }, (c, w, hh) => {
        if (!G) return;
        const pad = 18;
        const P = (i) => [pad + G.pos[i][0] * (w - 2 * pad), pad + G.pos[i][1] * (hh - 2 * pad)];
        c.lineWidth = 1; c.strokeStyle = PL.col('ink3'); c.globalAlpha = 0.25;
        c.beginPath();
        G.adj.forEach((nb, i) => nb.forEach((j) => { if (j > i) { const [a, b] = P(i), [x, y] = P(j); c.moveTo(a, b); c.lineTo(x, y); } }));
        c.stroke(); c.globalAlpha = 1;
        if (hover >= 0) {
          c.strokeStyle = PL.col('ink'); c.lineWidth = 1.6;
          c.beginPath();
          const [a, b] = P(hover);
          G.adj[hover].forEach((j) => { const [x, y] = P(j); c.moveTo(a, b); c.lineTo(x, y); });
          c.stroke();
        }
        G.adj.forEach((nb, i) => {
          const [x, y] = P(i);
          const r = 2.5 + 1.7 * Math.sqrt(G.deg[i]);
          c.fillStyle = PL.col(G.fd[i] > G.deg[i] ? 's2' : 's1');
          c.globalAlpha = hover >= 0 && hover !== i && !G.adj[hover].includes(i) ? 0.3 : 0.9;
          c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
        });
        c.globalAlpha = 1;
        if (hover >= 0) {
          const [x, y] = P(hover);
          const txt = `朋友 ${G.deg[hover]} 个 · 朋友们平均有 ${PL.fmt(G.fd[hover], 1)} 个朋友`;
          c.font = PL.font(12, 600);
          const tw = c.measureText(txt).width + 16;
          const bx = M.clamp(x - tw / 2, 4, w - tw - 4), by = y > 40 ? y - 34 : y + 16;
          c.fillStyle = PL.col('ink'); c.globalAlpha = 0.92; c.beginPath(); c.roundRect(bx, by, tw, 22, 6); c.fill(); c.globalAlpha = 1;
          c.fillStyle = PL.col('paper'); c.textBaseline = 'middle'; c.fillText(txt, bx + 8, by + 11);
        }
      });
      net.canvas.addEventListener('pointermove', (e) => {
        if (!G) return;
        const { x, y } = net.pos(e), pad = 18;
        let best = -1, bd = 14 * 14;
        G.pos.forEach(([u, v], i) => {
          const dx = pad + u * (net.w - 2 * pad) - x, dy = pad + v * (net.h - 2 * pad) - y;
          const d = dx * dx + dy * dy;
          if (d < bd) { bd = d; best = i; }
        });
        if (best !== hover) { hover = best; net.render(); }
      });
      net.canvas.addEventListener('pointerleave', () => { hover = -1; net.render(); });
      const scBox = p2.box();
      const sc = PL.plot(scBox, { height: 300, x: [0, 20], y: [0, 20], xlabel: '我的朋友数', ylabel: '我朋友们的平均朋友数' });
      scBox.append(h('div', { class: 'fig-cap', text: '每个点是一个人。虚线以上的人"不如自己的朋友受欢迎"。' }));
      sc.fn = (p) => {
        p.func((x) => x, { color: 'ink3', dash: [4, 4], width: 1.5 });
        p.dots(G.deg, G.fd, { r: 3.2, alpha: 0.75, colors: G.deg.map((d, i) => (G.fd[i] > d ? 's2' : 's1')) });
      };
      const s2 = p2.stats([
        { key: 'mu', label: '平均每人朋友数 μ', color: 's1' },
        { key: 'fof', label: '随便挑一个"朋友"，他的朋友数', color: 's2', sub: '= E[k²] ÷ E[k]' },
        { key: 'frac', label: '觉得"朋友比我受欢迎"的人', color: 's4' },
      ]);
      function build() {
        const r = PL.rng(ns.seed);
        const adj = genGraph(ns.N, ns.type, r);
        const deg = adj.map((a) => a.length);
        const fd = adj.map((a) => (a.length ? M.mean(a.map((j) => deg[j])) : 0));
        G = { adj, deg, fd, pos: layout(adj, r) };
        hover = -1;
        const mx = Math.max(...deg, ...fd) + 2;
        sc.setX(0, mx); sc.setY(0, mx);
        const sd = M.sum(deg), sd2 = M.sum(deg.map((d) => d * d));
        s2.set('mu', PL.fmt(sd / deg.length, 2));
        s2.set('fof', PL.fmt(sd2 / sd, 2), null, 'bad');
        s2.set('frac', PL.pct(deg.filter((d, i) => fd[i] > d).length / deg.length, 0));
        net.render(); sc.render();
      }
      build();

      // ---- part 3: immunization ----
      const p3 = PL.panel(root, '用它来做事：熟人免疫', '2000 人的无标度网络，假设病毒传染力极强，没接种的人只要连通就会被传染。比较两种只用"本地信息"的接种方法：随机挑人接种 vs. 随机挑人、给<b>他提名的一个朋友</b>接种。');
      const im = { f: 0.15 };
      p3.ctrl.slider({ label: '疫苗覆盖率', min: 0, max: 0.5, step: 0.01, value: im.f, fmt: (v) => PL.pct(v, 0), onInput: (v) => { im.f = v; up3(); }, wide: true });
      const big = (() => {
        const r = PL.rng(20260101);
        return genGraph(2000, 'ba', r, 2);
      })();
      function immunize(frac, mode, r) {
        const N = big.length, removed = new Uint8Array(N), target = Math.round(frac * N);
        let cnt = 0, guard = 0;
        while (cnt < target && guard++ < N * 50) {
          let v = r.int(N);
          if (mode === 'friend') v = big[v][r.int(big[v].length)];
          if (!removed[v]) { removed[v] = 1; cnt++; }
        }
        return giant(big, removed);
      }
      const FS = M.linspace(0, 0.5, 26);
      const curves = { rand: [], fr: [] };
      for (const f of FS) {
        let a = 0, b = 0;
        for (let s = 0; s < 4; s++) { a += immunize(f, 'rand', PL.rng(11 + s)); b += immunize(f, 'friend', PL.rng(97 + s)); }
        curves.rand.push(a / 4); curves.fr.push(b / 4);
      }
      const ic = PL.plot(p3.box(), {
        height: 260, x: [0, 0.5], y: [0, 1], xlabel: '疫苗覆盖率', ylabel: '最多能被传染的人群比例',
        xfmt: (v) => Math.round(v * 100) + '%', yfmt: (v) => Math.round(v * 100) + '%',
        legend: [{ label: '随机接种', color: 's7' }, { label: '熟人接种（给朋友接种）', color: 's3' }],
      });
      ic.fn = (p) => {
        p.line(FS, curves.rand, { color: 's7', width: 2.5 });
        p.line(FS, curves.fr, { color: 's3', width: 2.5 });
        p.vline(im.f, { color: 'ink3' });
        p.point(im.f, cur.rand, { color: 's7' });
        p.point(im.f, cur.fr, { color: 's3' });
      };
      const s3 = p3.stats([
        { key: 'rand', label: '随机接种后，最大传播范围', color: 's7' },
        { key: 'fr', label: '熟人接种后，最大传播范围', color: 's3' },
      ]);
      let cur = { rand: 1, fr: 1 };
      function up3() {
        cur = { rand: immunize(im.f, 'rand', PL.rng(5)), fr: immunize(im.f, 'friend', PL.rng(6)) };
        s3.set('rand', PL.pct(cur.rand, 0), null, cur.rand > 0.3 ? 'bad' : '');
        s3.set('fr', PL.pct(cur.fr, 0), null, cur.fr < cur.rand * 0.7 ? 'good' : '');
        ic.render();
      }
      up3();

      PL.prose(root, `
        <h2>班级规模：同一所学校，两个都对的平均数</h2>
        <p>9 个 10 人小班加 1 个 210 人的大课，学校报告的平均班级人数是 300 ÷ 10 = 30 人。但 300 个学生里有 210 个坐在大课里，问每个学生"你的班有多少人"，再取平均，得到的是 150 人。两个数都没算错，区别在于平均的单位是"每个班"还是"每个人"。大学招生宣传的"小班教学"和学生的真实体验之间，常常隔着这个差距。</p>

        <h2>友谊悖论</h2>
        <p>社会学家 Feld（1991）指出：在几乎任何社交网络里，大多数人的朋友平均都比他们自己的朋友多。原因是朋友多的人会出现在很多人的好友列表里，在"朋友"这个样本里他们被重复抽到了。数学上：</p>
        <div class="formula">随机挑一条好友关系，另一端那个人的平均朋友数 = E[k²] ÷ E[k] = μ + σ² ÷ μ</div>
        <p>只要大家的朋友数不完全一样（σ &gt; 0），它就一定大于 μ。朋友数分布越不均匀，比如网红和普通人并存的"无标度"网络，差距越大。</p>
        <p class="try">在"无标度"和"随机"两种网络之间切换：无标度网络里，绝大多数人都"不如朋友受欢迎"。</p>

        <h2>它可以用来做事</h2>
        <ul>
          <li><b>传染病预警</b>：Christakis 和 Fowler 在 2009 年 H1N1 流感季追踪了哈佛的学生，一组是随机抽的学生，一组是这些学生提名的朋友。朋友组的流感高峰比随机组早了大约两周，因为处在网络中心的人更早被传染。</li>
          <li><b>熟人免疫</b>：疫苗不够时，"随机挑一个人，给他提名的某个朋友接种"比随机接种有效得多（Cohen, Havlin &amp; ben-Avraham 2003）。这个办法不需要知道整个网络长什么样，就能把疫苗优先送到枢纽人物身上。上面的模拟里，同样的覆盖率下，熟人接种能把传播范围压得小得多。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>"随机抽一个人"和"随机抽一个人的朋友"是两个完全不同的样本。你在社交媒体上看到的"大家都在旅游、升职、健身"，也是同一种偏差：你看到的是被频繁曝光的那部分人。</div>
      `);
    },
  });

  // ======================================================================
  // 幸存者偏差
  // ======================================================================
  PL.register({
    id: 'survivor', cat: 'sampling', nav: '幸存者偏差：弹孔该补在哪',
    title: '幸存者偏差：该加固的，是没有弹孔的地方',
    hook: '二战时统计返航轰炸机的弹孔，机翼和机身上密密麻麻，引擎上几乎没有。直觉说该加固弹孔多的地方，正确答案恰恰相反。',
    related: ['berkson', 'bus', 'winners'],
    render(root) {
      const ell = (u, v, cx, cy, rx, ry) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 <= 1;
      const inPoly = (u, v, pts) => {
        let ins = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) ins = !ins;
        }
        return ins;
      };
      const mir = (pts) => pts.map(([x, y]) => [1 - x, y]);
      const WING_L = [[0.46, 0.38], [0.03, 0.465], [0.03, 0.525], [0.46, 0.53]], WING_R = mir(WING_L);
      const TAIL_L = [[0.47, 0.83], [0.29, 0.885], [0.29, 0.92], [0.47, 0.92]], TAIL_R = mir(TAIL_L);
      const ENG = [0.17, 0.32, 0.68, 0.83].map((u) => [u, 0.43]);
      const REG = [
        { k: 'eng', name: '引擎', kill: 0.7, col: 's2' },
        { k: 'cock', name: '驾驶舱', kill: 0.6, col: 's6' },
        { k: 'tail', name: '尾翼', kill: 0.06, col: 's4' },
        { k: 'body', name: '机身', kill: 0.03, col: 's1' },
        { k: 'wing', name: '机翼', kill: 0.02, col: 's5' },
      ];
      const fus = (u, v) => ell(u, v, 0.5, 0.5, 0.055, 0.43);
      function region(u, v) {
        if (ENG.some(([cx, cy]) => ell(u, v, cx, cy, 0.03, 0.065))) return 0;
        if (fus(u, v)) return v < 0.2 ? 1 : v > 0.82 ? 2 : 3;
        if (inPoly(u, v, TAIL_L) || inPoly(u, v, TAIL_R)) return 2;
        if (inPoly(u, v, WING_L) || inPoly(u, v, WING_R)) return 4;
        return -1;
      }
      // region areas
      const area = new Array(5).fill(0);
      { const r = PL.rng(7); let tot = 0; for (let i = 0; i < 40000; i++) { const g = region(r(), r()); if (g >= 0) { area[g]++; tot++; } } for (let i = 0; i < 5; i++) area[i] /= tot; }
      const LAM = 3;
      const st = { planes: [], showLost: false, armor: -1, seed: PL.seed() };
      let rng = PL.rng(st.seed);
      function fly(n) {
        for (let k = 0; k < n; k++) {
          const H = 1 + rng.poisson(LAM);
          const hits = [];
          let alive = true;
          for (let j = 0; j < H; j++) {
            let u, v, g;
            do { u = rng(); v = rng(); g = region(u, v); } while (g < 0);
            hits.push([u, v, g]);
            let kp = REG[g].kill * (st.armor === g ? 0.4 : 1);
            if (rng() < kp) alive = false;
          }
          st.planes.push({ hits, alive });
        }
      }
      const pn = PL.panel(root, '派飞机出去，统计飞回来的弹孔', '每架飞机随机中弹（弹着点在整架飞机上均匀分布）。打中引擎或驾驶舱很容易被击落，打中机翼、机身通常还能飞回来。').cols(2);
      pn.ctrl.button('派出 100 架', () => { fly(100); update(); }, 'primary');
      pn.ctrl.button('派出 1000 架', () => { fly(1000); update(); });
      pn.ctrl.button('清空', () => { st.planes = []; update(); });
      pn.ctrl.toggle({ label: '显示被击落飞机的弹孔', value: false, onChange: (v) => { st.showLost = v; update(); } });
      const planeStage = PL.stage(pn.box(), { height: (w) => Math.min(420, w * 0.95) }, (c, w, hh) => {
        const S = Math.min(w, hh) - 10, ox = (w - S) / 2, oy = (hh - S) / 2;
        const P = (u, v) => [ox + u * S, oy + v * S];
        const poly = (pts) => { c.beginPath(); pts.forEach(([u, v], i) => { const [x, y] = P(u, v); i ? c.lineTo(x, y) : c.moveTo(x, y); }); c.closePath(); };
        const el = (cx, cy, rx, ry) => { const [x, y] = P(cx, cy); c.beginPath(); c.ellipse(x, y, rx * S, ry * S, 0, 0, 7); };
        c.fillStyle = PL.col('grid'); c.strokeStyle = PL.col('ink3'); c.lineWidth = 1.2;
        [WING_L, WING_R, TAIL_L, TAIL_R].forEach((pp) => { poly(pp); c.fill(); c.stroke(); });
        el(0.5, 0.5, 0.055, 0.43); c.fill(); c.stroke();
        ENG.forEach(([u, v]) => { el(u, v, 0.03, 0.065); c.fill(); c.stroke(); });
        if (st.armor >= 0) {
          c.save(); c.globalAlpha = 0.28; c.fillStyle = PL.col('s3');
          const r = PL.rng(3);
          for (let i = 0; i < 2500; i++) { const u = r(), v = r(); if (region(u, v) === st.armor) { const [x, y] = P(u, v); c.fillRect(x, y, 2, 2); } }
          c.restore();
        }
        let nShown = 0;
        for (const pl of st.planes) {
          if (!pl.alive && !st.showLost) continue;
          c.fillStyle = PL.col(pl.alive ? 'ink' : 's2');
          c.globalAlpha = pl.alive ? 0.55 : 0.55;
          for (const [u, v] of pl.hits) { const [x, y] = P(u, v); c.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); if (++nShown > 40000) break; }
        }
        c.globalAlpha = 1;
      });
      const right = pn.box();
      right.append(h('div', { class: 'fig-title', text: '各部位的弹孔密度（每单位面积）' }));
      const bars = PL.plot(right, {
        height: 220, x: [-0.5, 4.5], y: [0, 2], xticks: [0, 1, 2, 3, 4], xfmt: (v) => REG[v] ? REG[v].name : '', ylabel: '相对密度（全机平均 = 1）',
        legend: [{ label: '返航飞机上看到的', color: 'ink', type: 'box' }, { label: '所有飞机真实中弹', color: 's2', type: 'box' }],
      });
      let dens = null;
      bars.fn = (p) => {
        if (!dens) return;
        const xs = [0, 1, 2, 3, 4];
        p.bars(xs.map((x) => x - 0.2), dens.ret, { color: 'ink', w: 0.36, alpha: 0.7 });
        p.bars(xs.map((x) => x + 0.2), dens.all, { color: 's2', w: 0.36, alpha: 0.7 });
        p.hline(1, { color: 'ink3' });
      };
      right.append(h('div', { class: 'fig-title', style: { marginTop: '12px' }, text: '你会加固哪里？（被加固部位的致命率降低 60%）' }));
      const armorCtl = PL.controls(h('div', { class: 'controls' }));
      right.append(armorCtl.el);
      armorCtl.seg({ options: [{ value: -1, label: '不加固' }, ...REG.map((r, i) => ({ value: i, label: r.name }))], value: -1, onChange: (v) => { st.armor = v; st.planes = []; rng = PL.rng(st.seed); fly(300); update(); } });
      const armorOut = h('div', { class: 'panel-html' });
      right.append(armorOut);
      const stats = pn.stats([
        { key: 'sent', label: '出击架次', color: 's7' },
        { key: 'ret', label: '返航率', color: 's3' },
        { key: 'eng', label: '返航飞机的弹孔里，打在引擎上的', color: 's2' },
      ]);
      // analytic survival with Poisson hits: P = s · exp(-λ(1-s))
      function survival(armor) {
        const s = REG.reduce((acc, r, i) => acc + area[i] * (1 - r.kill * (armor === i ? 0.4 : 1)), 0);
        return s * Math.exp(-LAM * (1 - s));
      }
      function update() {
        const ret = st.planes.filter((p) => p.alive);
        const cntR = new Array(5).fill(0), cntA = new Array(5).fill(0);
        let tR = 0, tA = 0;
        for (const p of st.planes) for (const [, , g] of p.hits) { cntA[g]++; tA++; if (p.alive) { cntR[g]++; tR++; } }
        dens = { ret: cntR.map((c, i) => (tR ? c / tR / area[i] : 0)), all: cntA.map((c, i) => (tA ? c / tA / area[i] : 0)) };
        const mx = Math.max(1.6, ...dens.ret, ...dens.all) * 1.45;
        bars.setY(0, mx);
        stats.set('sent', PL.int(st.planes.length));
        stats.set('ret', st.planes.length ? PL.pct(ret.length / st.planes.length, 0) : '—');
        stats.set('eng', tR ? PL.pct(cntR[0] / tR, 1) : '—', `引擎占机体面积 ${PL.pct(area[0], 1)}`);
        const base = survival(-1);
        const rows = REG.map((r, i) => ({ i, name: r.name, gain: survival(i) - base }));
        const best = rows.reduce((a, b) => (b.gain > a.gain ? b : a));
        armorOut.innerHTML = st.armor < 0
          ? `不加固时理论返航率 <b>${PL.pct(base, 1)}</b>。挑一个部位试试。`
          : `加固<b>${REG[st.armor].name}</b>后，理论返航率 ${PL.pct(base, 1)} → <b>${PL.pct(survival(st.armor), 1)}</b>（${PL.signed((survival(st.armor) - base) * 100, 1, ' 个百分点')}）。` +
            (st.armor === best.i ? ' 这就是最好的选择。' : ` 最好的选择是加固<b>${best.name}</b>（${PL.signed(best.gain * 100, 1, ' 个百分点')}）。`);
        planeStage.render(); bars.render();
      }
      fly(300);
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>这是统计学里最有名的故事之一。二战期间，美国军方统计了返航轰炸机身上的弹孔分布，发现机翼、机身上弹孔很多，引擎上很少，于是打算给弹孔多的部位加装甲。哥伦比亚大学统计研究小组的亚伯拉罕·瓦尔德指出：你们只看到了<b>飞回来的</b>飞机。引擎上弹孔少，不是因为引擎很少被打中，而是因为被打中引擎的飞机大多没能飞回来。该加固的恰恰是返航飞机上<b>没有</b>弹孔的地方。</p>
        <p class="try">打开"显示被击落飞机的弹孔"：红点均匀地铺满了整架飞机，引擎上一点也不少。然后在右边挑一个部位加固，看哪个部位最能提高返航率。</p>
        <p class="note">真实历史比这个故事更技术化：瓦尔德写的是一系列备忘录，讨论怎样从返航飞机的数据反推出各部位的"致命概率"。但核心思想就是上面这一点。</p>

        <h2>生活里的幸存者偏差</h2>
        <ul>
          <li><b>成功学</b>：辍学创业成功的人被反复报道，辍学创业失败的人没人采访。只看成功者的共同点，会把"敢冒险"误当成"成功的原因"。</li>
          <li><b>"以前的房子质量更好"</b>：质量差的老房子早就塌了或者被拆了，留到今天的自然都是好的。老歌、老电影、老家具同理。</li>
          <li><b>基金业绩</b>：表现差的基金会被清盘、合并，从数据库里消失。只看"现存基金"的历史收益，会高估整个行业的平均水平。</li>
          <li><b>"我爷爷抽了一辈子烟活到 95"</b>：抽烟早逝的那些人，没机会出来讲故事。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>看到一组数据，先问：<b>是什么决定了哪些东西能出现在我面前？</b>如果筛选条件和你要研究的结果有关，你看到的规律很可能就是筛选本身造出来的。${PL.link('berkson', '伯克森悖论')}是同一件事的二维版本。</div>
      `);
    },
  });

  // ======================================================================
  // 伯克森悖论
  // ======================================================================
  PL.register({
    id: 'berkson', cat: 'sampling', nav: '伯克森悖论：好看的都不好相处？',
    title: '伯克森悖论：为什么"好看的人都不好相处"',
    hook: '两个本来毫无关系的特征，只要你只看"被筛选过"的那部分人，它们就会显得负相关。',
    related: ['survivor', 'simpson', 'friends'],
    render(root) {
      const st = { rule: 'sum', t: 1.2, rho: 0, seed: PL.seed() };
      const LABELS = {
        sum: ['颜值', '人品', '你会约会的人：颜值 + 人品 够高'],
        or: ['疾病 A 的严重程度', '疾病 B 的严重程度', '会住院的人：任一种病足够严重'],
      };
      const pn = PL.panel(root, '只看被选中的人', '800 个人，两个特征相互独立（或按你设定的相关系数）。彩色点是通过筛选、你能"看到"的人，灰色点是你看不到的人。');
      pn.ctrl.seg({ label: '筛选规则', options: [{ value: 'sum', label: '约会：两项之和够高' }, { value: 'or', label: '医院：任一项够高' }], value: st.rule, onChange: (v) => { st.rule = v; update(); } });
      pn.ctrl.slider({ label: '筛选门槛', min: -1, max: 3, step: 0.05, value: st.t, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.t = v; update(); } });
      pn.ctrl.slider({ label: '真实相关系数', min: -0.6, max: 0.6, step: 0.05, value: st.rho, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.rho = v; update(); } });
      pn.ctrl.button('重新抽样', () => { st.seed = PL.seed(); update(); });
      const ch = PL.plot(pn.box(), {
        height: 360, x: [-3.2, 3.2], y: [-3.2, 3.2], xlabel: '', ylabel: '',
        legend: [{ label: '全体的趋势线', color: 's7', dash: [5, 4] }, { label: '被选中者的趋势线', color: 's2' }], legendPos: 'bl',
      });
      const stats = pn.stats([
        { key: 'all', label: '全体：相关系数', color: 's7' },
        { key: 'sel', label: '被选中者：相关系数', color: 's2' },
        { key: 'frac', label: '被选中的比例', color: 's4' },
      ]);
      let data;
      ch.fn = (p) => {
        const { x, y, sel } = data;
        const xs = [], ys = [], xs2 = [], ys2 = [];
        x.forEach((v, i) => (sel[i] ? (xs2.push(v), ys2.push(y[i])) : (xs.push(v), ys.push(y[i]))));
        p.dots(xs, ys, { color: 's7', r: 2.4, alpha: 0.35 });
        p.dots(xs2, ys2, { color: 's2', r: 2.8, alpha: 0.8 });
        const all = M.linreg(x, y);
        p.func((v) => all.intercept + all.slope * v, { color: 's7', width: 2, dash: [5, 4] });
        if (xs2.length > 5) {
          const lr = M.linreg(xs2, ys2);
          const lo = Math.min(...xs2), hi = Math.max(...xs2);
          p.line([lo, hi], [lr.intercept + lr.slope * lo, lr.intercept + lr.slope * hi], { color: 's2', width: 3 });
        }
        if (st.rule === 'sum') p.func((v) => st.t * Math.SQRT2 - v, { color: 'ink3', width: 1, dash: [2, 3] });
        else { p.vline(st.t, { color: 'ink3', dash: [2, 3], width: 1 }); p.hline(st.t, { color: 'ink3', dash: [2, 3], width: 1 }); }
      };
      function update() {
        const r = PL.rng(st.seed);
        const n = 800, x = [], y = [], sel = [];
        for (let i = 0; i < n; i++) {
          const a = r.normal(), b = st.rho * a + Math.sqrt(1 - st.rho * st.rho) * r.normal();
          x.push(a); y.push(b);
          sel.push(st.rule === 'sum' ? (a + b) / Math.SQRT2 > st.t : a > st.t || b > st.t);
        }
        data = { x, y, sel };
        ch.o.xlabel = LABELS[st.rule][0]; ch.o.ylabel = LABELS[st.rule][1];
        const xs2 = x.filter((_, i) => sel[i]), ys2 = y.filter((_, i) => sel[i]);
        stats.set('all', PL.fmt(M.corr(x, y), 2), '你看不到的全体');
        stats.set('sel', xs2.length > 5 ? PL.fmt(M.corr(xs2, ys2), 2) : '—', LABELS[st.rule][2], 'bad');
        stats.set('frac', PL.pct(xs2.length / n, 0));
        ch.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>假设颜值和人品在人群里完全没有关系。但你不会和所有人约会：太不好看又人品一般的，你不会考虑；所以能进入你约会名单的，要么好看，要么人品好，要么两样都还行。在这个名单里，"特别好看的"不需要人品多好就能入选，于是好看的人里人品一般的比例偏高。结果：在你见过的人里，颜值和人品呈现<b>负相关</b>。</p>
        <p>这个现象最早由医学统计学家 Berkson 在 1946 年描述：在住院病人里，两种毫无关系的疾病看起来负相关。因为只要有任意一种病足够严重就会住院，所以住院病人里"已经有了病 A"的人，不需要再有病 B 也能住进来。</p>
        <p class="try">把门槛调高，被选中的人越少，负相关越强；把门槛调到 −1（几乎所有人都被选中），相关性消失。再把真实相关系数调成正的，看筛选能不能把它掩盖掉。</p>

        <h2>更多例子</h2>
        <ul>
          <li><b>名校里，考试成绩和体育特长负相关</b>：录取看的是"总分 + 特长加分"。</li>
          <li><b>好吃的餐馆位置都不好</b>：位置好、东西难吃的店也能活下来；位置差的店只有东西好吃才能活下来。你吃过的、还开着的店里，位置和味道就负相关（Jordan Ellenberg 举过类似的例子）。</li>
          <li><b>发表的研究</b>：只有"效应大"或"样本大"的研究才更容易被发表，于是在已发表的文献里，样本量和效应量常常负相关。</li>
        </ul>
        <h2>名字：对撞偏倚</h2>
        <p>在因果图里，"被选中"这个变量同时受两个特征的影响（两个箭头撞在一起），叫<b>对撞因子</b>（collider）。以对撞因子为条件（只看被选中的人，或者在回归里"控制"它），会在原本独立的两个变量之间制造出虚假的相关。它和${PL.link('simpson', '辛普森悖论')}正好相反：辛普森悖论里，<b>不</b>按混杂因素分组会出错；这里<b>按</b>对撞因子分组会出错。</p>
        <div class="takeaway"><b>带走什么：</b>在一个经过筛选的群体里看到两个特征此消彼长，先别急着找因果，先问一句：这个群体是不是按这两个特征的某种组合筛出来的？</div>
      `);
    },
  });
})();
