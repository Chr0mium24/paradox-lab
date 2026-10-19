/* 类别一：个体理性，集体变糟 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 布雷斯悖论
  // ======================================================================
  // Wardrop equilibrium on a tiny network with affine link costs a + b·x.
  // Enumerate path supports and solve the KKT system exactly.
  function wardrop(links, paths, N, marginal) {
    const P = paths.length, mul = marginal ? 2 : 1;
    const A = paths.map((p) => p.reduce((s, l) => s + links[l].a, 0));
    const Mx = paths.map((pi) => paths.map((pj) => mul * pi.filter((l) => pj.includes(l)).reduce((s, l) => s + links[l].b, 0)));
    const cost = (f) => A.map((a, i) => a + Mx[i].reduce((s, m, j) => s + m * f[j], 0));
    if (N <= 0) return new Array(P).fill(0);
    for (let size = 1; size <= P; size++) {
      for (let mask = 1; mask < 1 << P; mask++) {
        const S = [];
        for (let i = 0; i < P; i++) if (mask & (1 << i)) S.push(i);
        if (S.length !== size) continue;
        const rows = [], rhs = [];
        S.forEach((i) => { rows.push([...S.map((j) => Mx[i][j]), -1]); rhs.push(-A[i]); });
        rows.push([...S.map(() => 1), 0]); rhs.push(N);
        const sol = M.solve(rows, rhs);
        if (!sol) continue;
        const f = new Array(P).fill(0);
        S.forEach((i, r) => (f[i] = sol[r]));
        const lam = sol[S.length];
        if (f.some((v) => v < -1e-7)) continue;
        const c = cost(f);
        let ok = true;
        for (let j = 0; j < P; j++) if (!(mask & (1 << j)) && c[j] < lam - 1e-7) ok = false;
        if (ok) return f.map((v) => Math.max(0, v));
      }
    }
    return null;
  }

  PL.register({
    id: 'braess', cat: 'collective', nav: '布雷斯悖论：修路反而更堵',
    title: '布雷斯悖论：修路反而更堵',
    hook: '给路网加一条免费的捷径，所有人的通勤时间都变长了，而且没有人能靠换路逃掉。',
    related: ['induced', 'jevons', 'queue', 'thrift'],
    render(root) {
      const LINKS = [
        { k: 'SA', a: 0, b: 0.01 },
        { k: 'AE', a: 45, b: 0 },
        { k: 'SB', a: 45, b: 0 },
        { k: 'BE', a: 0, b: 0.01 },
        { k: 'AB', a: 0, b: 0 },
      ];
      const PATHS = [[0, 1], [2, 3], [0, 4, 3]];
      const PNAME = ['上路 S→A→E', '下路 S→B→E', '捷径 S→A→B→E'];
      const PCOL = ['s1', 's5', 's4'];
      const st = { N: 4000, on: false, c: 0, opt: false };

      const linkTime = (l, x) => LINKS[l].a + LINKS[l].b * x;
      function solve(N, on, c, opt) {
        LINKS[4].a = c;
        const paths = on ? PATHS : PATHS.slice(0, 2);
        const f = wardrop(LINKS, paths, N, opt) || paths.map(() => N / paths.length);
        while (f.length < 3) f.push(0);
        const x = LINKS.map((_, l) => PATHS.reduce((s, p, i) => s + (p.includes(l) ? f[i] : 0), 0));
        const t = LINKS.map((_, l) => linkTime(l, x[l]));
        const pc = PATHS.map((p) => p.reduce((s, l) => s + t[l], 0));
        const avg = N > 0 ? f.reduce((s, fi, i) => s + fi * pc[i], 0) / N : pc[0];
        return { f, x, t, pc, avg };
      }

      const pn = PL.panel(root, '路网', '粗细 = 车流量，颜色 = 拥堵程度。窄路的用时是"车数 ÷ 100"分钟，宽马路固定 45 分钟。');
      pn.ctrl.toggle({ label: '开通 A→B 捷径', value: st.on, onChange: (v) => { st.on = v; dots = dots.filter((d) => v || d.p !== 2); update(); } });
      pn.ctrl.slider({ label: '司机数', min: 0, max: 10000, step: 100, value: st.N, fmt: (v) => PL.int(v) + ' 辆', onInput: (v) => { st.N = v; update(); } });
      pn.ctrl.slider({ label: '捷径用时', min: 0, max: 40, step: 1, value: st.c, fmt: (v) => v + ' 分', onInput: (v) => { st.c = v; curves = null; update(); } });
      pn.ctrl.toggle({ label: '统一调度（社会最优）', value: st.opt, onChange: (v) => { st.opt = v; update(); } });

      const NODES = { S: [0.07, 0.5], A: [0.5, 0.14], B: [0.5, 0.86], E: [0.93, 0.5] };
      const ENDS = [['S', 'A'], ['A', 'E'], ['S', 'B'], ['B', 'E'], ['A', 'B']];
      let sol = null, dots = [], acc = [0, 0, 0];
      const K = 0.05; // seconds of animation per minute of travel
      const net = PL.stage(pn.box(), { height: (w) => Math.min(380, Math.max(260, w * 0.42)) }, drawNet);
      function npos(k, w, hh) { return [NODES[k][0] * w, NODES[k][1] * hh]; }
      function drawNet(c, w, hh) {
        if (!sol) return;
        const N = Math.max(1, st.N);
        c.font = PL.font(12);
        ENDS.forEach(([a, b], l) => {
          const [x0, y0] = npos(a, w, hh), [x1, y1] = npos(b, w, hh);
          const isShort = l === 4;
          const flow = sol.x[l];
          let col = 's7';
          if (LINKS[l].b > 0) col = sol.t[l] > 32 ? 's2' : sol.t[l] > 18 ? 's6' : 's3';
          if (isShort) col = 's4';
          c.save();
          c.strokeStyle = PL.col(col);
          c.lineCap = 'round';
          if (isShort && !st.on) { c.setLineDash([6, 6]); c.globalAlpha = 0.35; c.lineWidth = 2; }
          else { c.lineWidth = 3 + 15 * flow / N; c.globalAlpha = 0.85; }
          c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
          c.restore();
          // label
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
          let lx = mx, ly = my, align = 'center';
          if (l === 0) { lx -= 18; ly -= 14; align = 'right'; }
          if (l === 1) { lx += 18; ly -= 14; align = 'left'; }
          if (l === 2) { lx -= 18; ly += w < 560 ? 14 : 22; align = 'right'; }
          if (l === 3) { lx += 18; ly += w < 560 ? 14 : 22; align = 'left'; }
          if (l === 4) { lx += 14; align = 'left'; }
          const narrow = w < 560;
          const name = LINKS[l].b > 0 ? (narrow ? '窄路' : '窄路 · 车数/100') : isShort ? '捷径' : narrow ? '宽马路' : '宽马路 · 固定 45 分';
          const off = isShort && !st.on;
          c.textAlign = align;
          c.fillStyle = PL.col('ink3'); c.font = PL.font(narrow ? 11 : 12); c.fillText(name, lx, ly);
          c.fillStyle = PL.col(off ? 'ink3' : 'ink'); c.font = PL.font(narrow ? 11.5 : 13, 600);
          if (off) c.fillText('未开通', lx, ly + 15);
          else if (narrow) { c.fillText(`${PL.int(flow)} 辆`, lx, ly + 15); c.fillText(`${PL.fmt(sol.t[l], 1)} 分`, lx, ly + 29); }
          else c.fillText(`${PL.int(flow)} 辆 · ${PL.fmt(sol.t[l], 1)} 分`, lx, ly + 16);
          c.font = PL.font(12);
        });
        // dots
        for (const d of dots) {
          const p = PATHS[d.p], l = p[d.seg];
          if (l == null) continue;
          const [a, b] = ENDS[l];
          const [x0, y0] = npos(a, w, hh), [x1, y1] = npos(b, w, hh);
          const T = sol.t[l] * K;
          const u = T > 0 ? M.clamp(d.ts / T, 0, 1) : 1;
          c.fillStyle = PL.col(PCOL[d.p]);
          c.beginPath(); c.arc(x0 + (x1 - x0) * u + d.jx, y0 + (y1 - y0) * u + d.jy, 3, 0, 7); c.fill();
        }
        // nodes
        for (const k of Object.keys(NODES)) {
          const [x, y] = npos(k, w, hh);
          c.fillStyle = PL.col('panel'); c.strokeStyle = PL.col('ink'); c.lineWidth = 2;
          c.beginPath(); c.arc(x, y, 15, 0, 7); c.fill(); c.stroke();
          c.fillStyle = PL.col('ink'); c.font = PL.font(14, 700); c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(k, x, y + 1); c.textBaseline = 'alphabetic'; c.font = PL.font(12);
        }
      }
      PL.loop((dt) => {
        if (!sol) return;
        const N = st.N;
        for (let i = 0; i < 3; i++) {
          if (N <= 0) break;
          acc[i] += dt * 16 * sol.f[i] / Math.max(N, 1);
          while (acc[i] >= 1) { acc[i] -= 1; dots.push({ p: i, seg: 0, ts: 0, jx: (Math.random() - 0.5) * 6, jy: (Math.random() - 0.5) * 6 }); }
        }
        for (const d of dots) {
          d.ts += dt;
          for (;;) {
            const l = PATHS[d.p][d.seg];
            if (l == null) break;
            const T = sol.t[l] * K;
            if (d.ts < T) break;
            d.ts -= T; d.seg++;
          }
        }
        dots = dots.filter((d) => d.seg < PATHS[d.p].length);
        net.render();
      });

      const tbl = PL.table(pn.el, ['路线', '走这条路的车', '这条路线用时', '如果你一个人改走它']);
      const stats = pn.stats([
        { key: 'avg', label: '现在每人平均用时', color: 's2' },
        { key: 'base', label: '没有捷径时', color: 's7' },
        { key: 'opt', label: '有人统一调度时（最优）', color: 's3' },
        { key: 'poa', label: '无政府代价 = 均衡 ÷ 最优', color: 's4' },
      ]);

      const pn2 = PL.panel(root, '随司机数变化', '同样一条捷径，车少时是好事，车多到一定程度就变成坏事，车再多又没人走它了。');
      let curves = null;
      const chart = PL.plot(pn2.box(), {
        height: 270, x: [0, 10000], y: [0, 100], xlabel: '司机数', ylabel: '平均用时（分钟）',
        legend: [
          { label: '没有捷径', color: 's7' },
          { label: '有捷径（各自选路）', color: 's2' },
          { label: '有捷径（统一调度）', color: 's3', dash: [5, 4] },
        ], legendPos: 'br',
      });
      function buildCurves() {
        const Ns = M.linspace(0, 10000, 101);
        curves = { Ns, base: [], eq: [], opt: [] };
        for (const N of Ns) {
          curves.base.push(solve(N, false, st.c, false).avg);
          curves.eq.push(solve(N, true, st.c, false).avg);
          curves.opt.push(solve(N, true, st.c, true).avg);
        }
      }
      chart.fn = (p) => {
        if (!curves) buildCurves();
        const { Ns, base, eq, opt } = curves;
        // shade paradox zone
        for (let i = 0; i < Ns.length - 1; i++) if (eq[i] > base[i] + 0.05 && eq[i + 1] > base[i + 1] + 0.05) p.rect(Ns[i], 0, Ns[i + 1], 100, { color: 's2', alpha: 0.08 });
        p.line(Ns, base, { color: 's7', width: 2.5 });
        p.line(Ns, opt, { color: 's3', width: 2, dash: [5, 4] });
        p.line(Ns, eq, { color: 's2', width: 2.5 });
        p.vline(st.N, { color: 'ink3' });
        const i = Math.round(st.N / 100);
        p.point(st.N, base[i], { color: 's7', r: 4 });
        p.point(st.N, eq[i], { color: 's2', r: 4 });
        p.textPx(p.X(5800), p.Y(95), '浅红区：捷径让所有人变慢', { color: 's2', align: 'center' });
      };

      function update() {
        sol = solve(st.N, st.on, st.c, st.opt);
        const base = solve(st.N, false, st.c, false);
        const eqOn = solve(st.N, true, st.c, false);
        const optOn = solve(st.N, true, st.c, true);
        const cur = st.on ? eqOn : base;
        const minUsed = Math.min(...sol.pc.filter((_, i) => st.on || i < 2));
        tbl.rows(PATHS.map((p, i) => {
          if (!st.on && i === 2) return { cells: [PNAME[i], '—', '—', '捷径未开通'], cls: 'dim' };
          const used = sol.f[i] > 0.5;
          const dev = sol.pc[i];
          let note = PL.fmt(dev, 1) + ' 分';
          if (!st.opt) note += used ? '（就是现在的用时）' : dev > minUsed + 0.05 ? `（比现在慢 ${PL.fmt(dev - minUsed, 1)} 分）` : '（一样）';
          return { cells: [`<span style="color:${PL.col(PCOL[i])}">●</span> ${PNAME[i]}`, PL.int(sol.f[i]) + ' 辆', PL.fmt(sol.pc[i], 1) + ' 分', note], cls: used ? '' : 'dim' };
        }));
        const shown = st.opt ? (st.on ? optOn : solve(st.N, false, st.c, true)) : cur;
        stats.set('avg', PL.fmt(shown.avg, 1) + ' 分', st.opt ? '按统一调度分配' : st.on ? '捷径开通，各自选路' : '捷径未开通', shown.avg > base.avg + 0.05 ? 'bad' : '');
        stats.set('base', PL.fmt(base.avg, 1) + ' 分', '各走一半');
        stats.set('opt', PL.fmt(optOn.avg, 1) + ' 分', '有捷径 + 统一调度');
        stats.set('poa', PL.fmt(eqOn.avg / optOn.avg, 3), '理论上限 4/3 ≈ 1.333');
        net.render();
        chart.render();
      }
      update();

      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>4000 辆车从 S 开到 E。上路（S→A→E）和下路（S→B→E）各有一段"窄路"和一段"宽马路"：窄路用时 = 车数 ÷ 100 分钟，越挤越慢；宽马路固定 45 分钟。没有捷径时两条路对称，各走 2000 辆，每人用时 20 + 45 = <b>65 分钟</b>。</p>
        <p>现在在 A、B 之间修一条 0 分钟的捷径。对任何一个司机来说：先走窄路 S→A 最多 40 分钟，比宽马路 S→B 的 45 分钟快；到了 A 以后，走捷径再走窄路 B→E 最多 40 分钟，又比宽马路 A→E 快。所以每个人都会选 S→A→B→E，两段窄路都挤满 4000 辆：40 + 0 + 40 = <b>80 分钟</b>。</p>
        <p>这时没有人能靠单方面换路变快：换回任何一条老路都要 40 + 45 = 85 分钟（看上面表格最后一列）。这是一个稳定的<b>纳什均衡</b>。每个人都比修路前慢了 15 分钟，而且谁也跑不掉。</p>
        <p class="try">把司机数调到 2000：捷径真的有用。调到 3000–9000：捷径有害。调到 9000 以上：捷径没人走。再打开"统一调度"，看看如果有人统一指挥，最好能做到多少。</p>

        <h2>为什么直觉会错</h2>
        <p>直觉认为"多一个选项，最坏也就是不用它"。这对一个人成立，对一群各自做最优选择的人不成立。每个司机只算自己的用时，不算自己给窄路上其他人添的那一点拥堵，经济学把这叫<b>外部性</b>。新路改变了均衡点，新的均衡可以比旧的更差。</p>
        <p>如果有人统一调度，让一部分人"吃亏"去走宽马路，平均用时可以低得多。"各自选路的均衡"比"全局最优"差多少，叫<b>无政府代价</b>（price of anarchy）。Roughgarden 和 Tardos（2002）证明：拥堵成本是线性的时候，这个比值最多是 4/3，跟路网有多复杂无关。</p>

        <h2>不只是交通</h2>
        <ul>
          <li><b>弹簧和绳子</b>：两根弹簧中间用一根短绳串起来，旁边再挂两根较长的绳子作为旁路，下面吊一个重物。剪断中间那根短绳，系统从"串联"变成"两路并联"，重物反而<b>升高</b>（Cohen &amp; Horowitz, <i>Nature</i> 1991）。它的数学结构和上面的路网一模一样。</li>
          <li><b>电路、电网、网络路由</b>：加一条导线或一条链路，整体电流或吞吐反而下降，都有对应的实例。</li>
          <li><b>真实城市</b>：首尔 2003–2005 年拆掉清溪川高架、纽约 1990 年临时封闭 42 街，交通都没有像预测的那样瘫痪。这些案例里也有${PL.link('induced', '诱导需求')}反向起作用（路少了，一部分出行消失或改道），不全是布雷斯效应。</li>
        </ul>

        <div class="takeaway"><b>带走什么：</b>评估一个改动，要看它造成的<b>新均衡</b>，不能在现有行为上做加法。组织里的例子：让所有人都能直接去问最资深的工程师。每个人都省了时间，但那个人就变成了所有人都挤上去的那段窄路。</div>
      `);
    },
  });

  // ======================================================================
  // 诱导需求
  // ======================================================================
  PL.register({
    id: 'induced', cat: 'collective', nav: '诱导需求：新车道会被填满',
    title: '诱导需求：新车道会被填满',
    hook: '把路从 2 车道加宽到 8 车道，车流翻了几倍，堵车却几乎没有缓解。',
    related: ['braess', 'jevons', 'queue'],
    render(root) {
      const T0 = 20, CAP = 1800, V0 = 2 * CAP * Math.pow(1 / 0.15, 0.25);
      const bpr = (V, lanes) => T0 * (1 + 0.15 * Math.pow(V / (lanes * CAP), 4));
      const demand = (t, e) => V0 * Math.pow(t / 40, -e);
      function equil(lanes, e) {
        if (e === 0) return { V: V0, t: bpr(V0, lanes) };
        let lo = T0, hi = 600;
        for (let i = 0; i < 70; i++) {
          const mid = (lo + hi) / 2;
          if (mid - bpr(demand(mid, e), lanes) > 0) hi = mid; else lo = mid;
        }
        const t = (lo + hi) / 2;
        return { V: demand(t, e), t };
      }
      const st = { lanes: 4, e: 1 };
      const pn = PL.panel(root, '供给与需求', '蓝线：路上车越多越慢（道路的物理性质）。橙线：路越快，愿意开车上路的人越多。实际车流落在两线交点。').cols(2);
      pn.ctrl.slider({ label: '车道数', min: 1, max: 10, step: 1, value: st.lanes, fmt: (v) => v + ' 条', onInput: (v) => { st.lanes = v; update(); } });
      pn.ctrl.slider({ label: '需求弹性', min: 0, max: 5, step: 0.05, value: st.e, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.e = v; update(); } });
      pn.ctrl.text('（原来是 2 车道、用时 40 分钟）');
      const b1 = pn.box(), b2 = pn.box();
      const c1 = PL.plot(b1, {
        height: 300, x: [0, 20000], y: [0, 90], xlabel: '车流（辆/小时）', ylabel: '通勤用时（分钟）',
        legend: [{ label: '2 车道（原来）', color: 's7', dash: [5, 4] }, { label: '现在的车道', color: 's1' }, { label: '需求曲线', color: 's2' }],
      });
      const c2 = PL.plot(b2, {
        height: 300, x: [1, 10], y: [0, 90], xlabel: '车道数', ylabel: '通勤用时（分钟）', xticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      });
      b2.append(h('div', { class: 'fig-cap', text: '不同需求弹性下，加车道对用时的效果。弹性越大，曲线越平。' }));
      const stats = pn.stats([
        { key: 'cap', label: '道路容量', color: 's1' },
        { key: 'V', label: '实际车流', color: 's2' },
        { key: 't', label: '通勤用时', color: 's3' },
        { key: 'el', label: '车流对车道的弹性', color: 's4', sub: '实证长期 ≈ 1（Duranton & Turner）' },
      ]);
      let eq, base, expect;
      c1.fn = (p) => {
        const xmax = p.x[1];
        p.func((V) => bpr(V, 2), { color: 's7', dash: [5, 4], width: 2 });
        p.func((V) => bpr(V, st.lanes), { color: 's1', width: 2.5 });
        if (st.e === 0) {
          p.vline(V0, { color: 's2', dash: [], width: 2.5 });
        } else {
          const xs = M.linspace(xmax * 0.01, xmax, 300);
          p.line(xs, xs.map((V) => 40 * Math.pow(V / V0, -1 / st.e)), { color: 's2', width: 2.5 });
        }
        p.point(V0, 40, { color: 's7', hollow: true, label: '原来', labelStyle: { dx: -10, dy: -10, align: 'right' } });
        p.point(expect.V, expect.t, { color: 's1', hollow: true, label: '规划时的预期', labelStyle: { dy: 18 } });
        p.point(eq.V, eq.t, { color: 's2', r: 6, label: '实际', labelStyle: { dy: -12 } });
      };
      const ES = [0, 0.5, 1, 2, 4];
      c2.fn = (p) => {
        const Ls = M.linspace(1, 10, 91);
        ES.forEach((e) => {
          const ys = Ls.map((L) => equil(L, e).t);
          p.line(Ls, ys, { color: 's7', width: 1.2, alpha: 0.7 });
          p.text(10, ys[ys.length - 1], 'ε=' + e, { dx: -4, dy: -4, align: 'right', color: 'ink3', size: 11 });
        });
        p.line(Ls, Ls.map((L) => equil(L, st.e).t), { color: 's2', width: 2.8 });
        p.point(st.lanes, eq.t, { color: 's2' });
        p.point(2, 40, { color: 's7', hollow: true });
      };
      function update() {
        eq = equil(st.lanes, st.e);
        base = { V: V0, t: 40 };
        expect = { V: V0, t: bpr(V0, st.lanes) };
        c1.setX(0, Math.max(14000, eq.V * 1.35));
        const e2 = equil(st.lanes * 1.01, st.e);
        const el = Math.log(e2.V / eq.V) / Math.log(1.01);
        stats.set('cap', '× ' + PL.fmt(st.lanes / 2, 1), `${st.lanes} 车道，原来 2 车道`);
        stats.set('V', '× ' + PL.fmt(eq.V / V0, 2), PL.int(eq.V) + ' 辆/小时');
        stats.set('t', PL.fmt(eq.t, 1) + ' 分', `原来 40 分，需求不变时会是 ${PL.fmt(expect.t, 1)} 分`, eq.t < 30 ? 'good' : '');
        stats.set('el', PL.fmt(el, 2));
        c1.render(); c2.render();
      }
      update();

      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>图里有两条曲线。<b>供给曲线</b>（蓝）是道路的物理性质：路上车越多，用时越长（这里用的是交通工程常用的 BPR 函数）。<b>需求曲线</b>（橙）是人的反应：通勤越快，愿意开车上路的人越多，原来坐地铁的、错峰出行的、干脆不出门的人，都会在路变快以后上路。路上实际的车流和用时，落在两条曲线的交点上。</p>
        <p>加宽道路只移动了供给曲线。如果需求是固定的（弹性 = 0），用时会大幅下降，这就是规划时的"预期"（空心点）。但需求会变：用时一降，新车流就补进来，交点沿着需求曲线滑下去，用时只改善一点点，车流却大涨。</p>
        <p class="try">把需求弹性拉到 3 以上，再把车道从 2 加到 8：车流翻几倍，用时几乎不动。</p>

        <h2>真实数据</h2>
        <p>Duranton 和 Turner（2011）用美国 1980–2000 年的城市数据估计：高速公路车道里程每增加 1%，车辆行驶里程也增加约 1%。也就是说，长期来看新车道基本会被<b>按比例填满</b>，拥堵回到原来的水平。他们把这叫"道路拥堵基本定律"。新增的车流来自：原本不出行的人、换路线和换时段的人、从公交转过来的人，以及因为通勤变方便而搬得更远、开得更多的人。</p>
        <p><b>当斯–汤姆森悖论</b>更进一步：如果道路和地铁互相竞争，加宽道路会让一部分地铁乘客改开车。地铁客流下降、班次减少，剩下的乘客等得更久，最后的均衡可能让<b>所有人</b>都更慢。</p>

        <h2>和布雷斯悖论的区别</h2>
        <p>${PL.link('braess', '布雷斯悖论')}里车的总数不变，变差是因为路线选择的均衡变了；诱导需求里车的总数会变，堵车没缓解是因为被压住的需求被释放了出来。两者说的是同一件事：你在改的是一个会对改动做出反应的系统。</p>
        <p class="note">这不等于修路没有价值：多出来的车流本身就是更多人完成了他们想完成的出行。问题在于，如果目标是"缓解拥堵"，加路通常做不到；拥堵收费这类直接作用于需求的办法才有效。</p>

        <div class="takeaway"><b>带走什么：</b>给一个供不应求的东西扩容之前，先问：被压住的需求有多少？扩容以后，排队会不会只是换了一批人来排？服务器扩容后流量上涨、客服扩招后工单变多，都是同一条曲线。</div>
      `);
    },
  });

  // ======================================================================
  // 杰文斯悖论
  // ======================================================================
  PL.register({
    id: 'jevons', cat: 'collective', nav: '杰文斯悖论：越省越费',
    title: '杰文斯悖论：效率越高，用得越多',
    hook: '蒸汽机烧煤的效率越来越高，英国的煤炭总消耗却一路上升。',
    related: ['induced', 'braess'],
    render(root) {
      const st = { e: 1.3, eta: 3 };
      const pn = PL.panel(root, '效率提升之后，资源总消耗变成多少', '效率提高到 η 倍，"一份服务"（照明、动力、计算）的价格就降到 1/η。需求弹性 ε 决定人们会多用多少。');
      pn.ctrl.slider({ label: '效率提升 η', min: 1, max: 10, step: 0.1, log: true, value: st.eta, fmt: (v) => '× ' + PL.fmt(v, 1), onInput: (v) => { st.eta = v; update(); } });
      pn.ctrl.slider({ label: '需求价格弹性 ε', min: 0.1, max: 2.5, step: 0.05, value: st.e, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.e = v; update(); } });
      const ch = PL.plot(pn.box(), {
        height: 300, x: [1, 10], y: [0.1, 10], xlog: true, ylog: true, xlabel: '效率提升倍数 η', ylabel: '资源总消耗（相对原来）',
        xticks: [1, 2, 3, 5, 10], yticks: [0.1, 0.2, 0.5, 1, 2, 5, 10],
        legend: [{ label: '工程师预期（用量不变）', color: 'ink3', dash: [5, 4] }, { label: '当前 ε', color: 's2' }], legendPos: 'tl',
      });
      ch.fn = (p) => {
        p.hline(1, { color: 'ink3', dash: [2, 3], label: '原来的消耗', align: 'right' });
        [0.5, 1, 1.5, 2].forEach((e) => {
          p.func((x) => Math.pow(x, e - 1), { color: 's7', width: 1.2, alpha: 0.6 });
          p.text(10, Math.pow(10, e - 1), 'ε=' + e, { dx: -4, dy: e === 1 ? 14 : -5, align: 'right', color: 'ink3', size: 11 });
        });
        p.func((x) => 1 / x, { color: 'ink3', dash: [5, 4], width: 2 });
        p.func((x) => Math.pow(x, st.e - 1), { color: 's2', width: 3 });
        p.point(st.eta, Math.pow(st.eta, st.e - 1), { color: 's2' });
      };
      const stats = pn.stats([
        { key: 'price', label: '一份服务的价格', color: 's1' },
        { key: 'use', label: '服务用量', color: 's5' },
        { key: 'res', label: '资源总消耗', color: 's2' },
        { key: 'reb', label: '回弹效应', color: 's4', sub: '预期省下的，有多少被多用掉了' },
      ]);
      function update() {
        const { e, eta } = st;
        const use = Math.pow(eta, e), res = Math.pow(eta, e - 1);
        stats.set('price', '× ' + PL.fmt(1 / eta, 2), '效率越高越便宜');
        stats.set('use', '× ' + PL.fmt(use, 2), '便宜了就多用');
        stats.set('res', '× ' + PL.fmt(res, 2), res > 1.001 ? '比原来还多：逆火' : `工程师预期 × ${PL.fmt(1 / eta, 2)}`, res > 1.001 ? 'bad' : 'good');
        const rebound = eta > 1.01 ? 1 - (1 - res) / (1 - 1 / eta) : NaN;
        stats.set('reb', isFinite(rebound) ? PL.pct(rebound, 0) : '—', null, rebound > 1 ? 'bad' : '');
        ch.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>1865 年，杰文斯在《煤炭问题》里指出一个让人不安的事实：瓦特之后，蒸汽机烧煤的效率越来越高，英国的煤炭总消耗却一路上升。效率提高让"用煤做一份功"变便宜了，于是有更多工厂、更多场合开始用蒸汽机。</p>
        <p>模型很简单。效率提高到 η 倍，一份服务的价格就降到原来的 1/η。如果人们对这项服务的需求价格弹性是 ε，用量会变成 η<sup>ε</sup> 倍，于是消耗的资源是：</p>
        <div class="formula">资源消耗 = 服务用量 ÷ 效率 = η<sup>ε</sup> ÷ η = η<sup>ε − 1</sup></div>
        <p>分界线是 ε = 1。ε &lt; 1 时，预期省下的资源有一部分被"回弹"吃掉；ε &gt; 1 时，用得反而比原来多，这叫<b>逆火</b>（backfire）。</p>
        <p class="try">先把 ε 调到 0.5：效率提高 3 倍，消耗降了，但降得没有预期多。再把 ε 调到 1.5：效率越高，总消耗越大。</p>

        <h2>现实里</h2>
        <ul>
          <li><b>照明</b>：从蜡烛、煤气灯到 LED，"一流明·小时"的价格下降了几个数量级，人类花在照明上的总能源却没有同比下降，因为我们照亮了以前根本不会去照亮的地方。</li>
          <li><b>计算</b>：每次运算的能耗和价格持续暴跌，全球用于计算的总电力却在上涨。大模型单个 token 的成本下降，带来的是更多调用、更长的上下文和更多 agent。</li>
          <li><b>道路</b>：见${PL.link('induced', '诱导需求')}。"时间"变便宜了，出行就变多。</li>
        </ul>
        <p class="note">大多数实证研究测到的是"部分回弹"（ε &lt; 1）：节能家电、节能汽车省下的能源，通常有一小部分到一半会被多用掉。真正的逆火更常出现在刚开始普及、还有大量潜在用途的通用技术上。这个模型也简化了一点：现实中资源只占服务成本的一部分，效率提升带来的降价会被摊薄。</p>

        <div class="takeaway"><b>带走什么：</b>"效率提高 → 总消耗下降"不是自动成立的，要看需求有多大弹性。想靠提高效率来减少总量，往往还得配合价格手段或总量限制。</div>
      `);
    },
  });

  // ======================================================================
  // 节俭悖论
  // ======================================================================
  PL.register({
    id: 'thrift', cat: 'collective', nav: '节俭悖论：都存钱，钱反而少',
    title: '节俭悖论：人人多存钱，总储蓄反而变少',
    hook: '一个人多存钱是美德；所有人同时多存钱，大家的收入下降，总储蓄可能反而减少。',
    related: ['braess', 'bullwhip'],
    render(root) {
      const C0 = 20, I0 = 20, S_BASE = 0.2;
      const st = { s: 0.3, b: 0.05 };
      const eqm = (s, b) => { const Y = (C0 + I0) / (s - b); return { Y, C: C0 + (1 - s) * Y, S: I0 + b * Y }; };
      const pn = PL.panel(root, '凯恩斯交叉', '消费 C = C₀ + (1 − s)·Y，投资 I = I₀ + b·Y。均衡时总支出 = 总收入，也就是支出线和 45° 线的交点。');
      const sS = pn.ctrl.slider({ label: '储蓄率 s', min: 0.1, max: 0.5, step: 0.01, value: st.s, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.s = v; fix(); update(); } });
      pn.ctrl.slider({ label: '投资对收入的敏感度 b', min: 0, max: 0.09, step: 0.005, value: st.b, fmt: (v) => PL.fmt(v, 3), onInput: (v) => { st.b = v; fix(); update(); } });
      pn.ctrl.text('（基准：储蓄率 20%）');
      function fix() { if (st.s - st.b < 0.02) { st.s = st.b + 0.02; sS.set(st.s); } }
      const cross = PL.plot(pn.box(), {
        height: 300, x: [0, 450], y: [0, 450], xlabel: '总收入 Y', ylabel: '计划总支出 C + I',
        legend: [{ label: '45° 线：支出 = 收入', color: 'ink3', dash: [4, 4] }, { label: '基准（储蓄率 20%）', color: 's7', dash: [6, 4] }, { label: '当前储蓄率', color: 's2' }], legendPos: 'tl',
      });
      cross.fn = (p) => {
        p.func((Y) => Y, { color: 'ink3', dash: [4, 4], width: 1.5 });
        const b0 = eqm(S_BASE, st.b), cur = eqm(st.s, st.b);
        p.func((Y) => C0 + I0 + (1 - S_BASE + st.b) * Y, { color: 's7', dash: [6, 4], width: 2 });
        p.func((Y) => C0 + I0 + (1 - st.s + st.b) * Y, { color: 's2', width: 2.5 });
        if (b0.Y < 450) p.point(b0.Y, b0.Y, { color: 's7', hollow: true, label: '基准均衡', labelStyle: { dx: 10, dy: 14 } });
        p.point(cur.Y, cur.Y, { color: 's2', label: '现在', labelStyle: { dx: -10, dy: -10, align: 'right' } });
      };
      const row = h('div', { class: 'figs two' });
      pn.fig.append(row);
      const fy = h('div', { class: 'fig' }), fs = h('div', { class: 'fig' });
      row.append(fy, fs);
      fy.append(h('div', { class: 'fig-title', text: '均衡收入 Y 随储蓄率的变化' }));
      fs.append(h('div', { class: 'fig-title', text: '总储蓄 S 随储蓄率的变化' }));
      const py = PL.plot(fy, { height: 200, x: [0.1, 0.5], y: [0, 450], xlabel: '储蓄率 s', xfmt: (v) => Math.round(v * 100) + '%' });
      const ps = PL.plot(fs, { height: 200, x: [0.1, 0.5], y: [0, 80], xlabel: '储蓄率 s', xfmt: (v) => Math.round(v * 100) + '%' });
      const curve = (key) => (p) => {
        const xs = M.linspace(st.b + 0.02, 0.5, 200);
        p.line(xs, xs.map((s) => eqm(s, st.b)[key]), { color: key === 'Y' ? 's1' : 's3', width: 2.5 });
        p.point(S_BASE, eqm(S_BASE, st.b)[key], { color: 's7', hollow: true });
        p.point(st.s, eqm(st.s, st.b)[key], { color: key === 'Y' ? 's1' : 's3' });
      };
      py.fn = curve('Y'); ps.fn = curve('S');
      const stats = pn.stats([
        { key: 'Y', label: '均衡收入 Y', color: 's1' },
        { key: 'C', label: '消费 C', color: 's6' },
        { key: 'S', label: '总储蓄 S', color: 's3' },
      ]);
      function update() {
        const b0 = eqm(S_BASE, st.b), cur = eqm(st.s, st.b);
        stats.set('Y', PL.fmt(cur.Y, 1), '基准 ' + PL.fmt(b0.Y, 1) + '，' + PL.signedPct(cur.Y / b0.Y - 1));
        stats.set('C', PL.fmt(cur.C, 1), '基准 ' + PL.fmt(b0.C, 1));
        const dS = cur.S / b0.S - 1;
        stats.set('S', PL.fmt(cur.S, 1), '基准 ' + PL.fmt(b0.S, 1) + '，' + PL.signedPct(dS), st.s > S_BASE && dS < -0.001 ? 'bad' : '');
        cross.render(); py.render(); ps.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>一个人多存钱，是美德；所有人同时多存钱，结果可能是<b>大家的总储蓄反而减少</b>。这是凯恩斯普及开来的"节俭悖论"，也是经典的<b>合成谬误</b>：对个体成立的事，对整体不一定成立。</p>
        <p>机制在于：你的支出就是别人的收入。所有人都少花钱，企业卖得少，就会减产、裁员、少投资，大家的收入一起下降。收入下降了，即使储蓄<b>率</b>提高，储蓄<b>额</b>也可能下降。</p>
        <p>上图是最简单的凯恩斯交叉模型：</p>
        <div class="formula">均衡收入 Y = (C₀ + I₀) ÷ (s − b)　　总储蓄 S = I₀ + b·Y</div>
        <p>均衡时储蓄一定等于投资（S = I）。如果投资是固定的（b = 0），大家再怎么努力存钱，总储蓄也只能等于 I₀，收入却白白下降了；如果投资随收入变化（b &gt; 0），收入下降会拖累投资，总储蓄就跟着减少。</p>
        <p class="try">先把 b 调到 0：提高储蓄率，收入下降，总储蓄不变（白忙一场）。再把 b 调大：提高储蓄率，总储蓄反而下降。</p>

        <h2>什么时候成立，什么时候不成立</h2>
        <p>节俭悖论依赖一个前提：经济受<b>需求</b>约束，有闲置的工人和机器，产出由大家愿意花多少钱决定。衰退期大致如此，所以 2009 年前后，在居民和企业都捂紧钱包的时候，许多国家的政府选择扩大支出。</p>
        <p>在充分就业、产能用满的长期里，储蓄会通过利率转化为投资，积累资本，提高未来的产出，这时多储蓄对整体也是好事。所以经济学家争论的通常不是这个悖论对不对，而是<b>此时此刻</b>经济处在哪种状态。</p>

        <div class="takeaway"><b>带走什么：</b>当每个人的支出是别人的收入时，个体的理性收缩会叠加成集体的收缩。公司里所有部门同时砍预算、供应链上所有环节同时去库存（见${PL.link('bullwhip', '牛鞭效应')}），都是同样的结构。</div>
      `);
    },
  });
})();
