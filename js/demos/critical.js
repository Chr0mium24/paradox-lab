/* 类别八：临界与涌现 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 渗流
  // ======================================================================
  const PERC_CACHE = {};
  function clusters(L, open) {
    const N = L * L, par = new Int32Array(N).map((_, i) => i), size = new Int32Array(N).fill(1);
    const f = (a) => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    const u = (a, b) => { a = f(a); b = f(b); if (a === b) return; if (size[a] < size[b]) [a, b] = [b, a]; par[b] = a; size[a] += size[b]; };
    for (let i = 0; i < N; i++) if (open[i]) { const x = i % L; if (x + 1 < L && open[i + 1]) u(i, i + 1); if (i + L < N && open[i + L]) u(i, i + L); }
    const root = new Int32Array(N);
    for (let i = 0; i < N; i++) root[i] = open[i] ? f(i) : -1;
    const top = new Set(), bot = new Set();
    for (let x = 0; x < L; x++) { if (open[x]) top.add(root[x]); if (open[N - L + x]) bot.add(root[N - L + x]); }
    let span = -1; for (const r of top) if (bot.has(r)) { span = r; break; }
    let big = -1, bs = 0; for (let i = 0; i < N; i++) if (open[i] && par[i] === i && size[i] > bs) { bs = size[i]; big = i; }
    return { root, span, big, bigSize: bs, size };
  }
  PL.register({
    id: 'percolation', cat: 'critical', nav: '渗流：差一点点就是天壤之别',
    title: '渗流：开放的格子从 58% 加到 60%，世界从"不通"变成了"通"',
    hook: '在网格里随机打开一些格子。打开的比例低于某个临界值时，连通的都是小块；越过临界值的那一刻，一块贯穿整个网格的巨型团簇突然出现。',
    related: ['friends', 'schelling', 'sandpile', 'sync'],
    render(root) {
      const L = 90;
      const st = { p: 0.57, seed: PL.seed() };
      let U, C;
      const gen = () => { const r = PL.rng(st.seed); U = Float32Array.from({ length: L * L }, () => r()); };
      const pn = PL.panel(root, '一个 90×90 的网格', '每个格子以概率 p 打开。上下左右相邻的打开格子连成一个团簇。<b style="color:var(--s3)">绿色</b>：最大的团簇；如果它连通了上边和下边，就变成<b style="color:var(--s2)">红色</b>（"渗透"了）。慢慢拖动 p。').cols(2);
      pn.ctrl.slider({ label: '打开的概率 p', min: 0.3, max: 0.85, step: 0.0025, value: st.p, fmt: (v) => PL.pct(v, 1), onInput: (v) => { st.p = v; update(); }, wide: true });
      pn.ctrl.button('换一个网格', () => { st.seed = PL.seed(); gen(); update(); });
      const grid = PL.stage(pn.box(), { height: (w) => Math.min(400, w) }, (c, w, hh) => {
        const S = Math.min(w, hh), cs = S / L, ox = (w - S) / 2;
        c.fillStyle = PL.col('grid'); c.fillRect(ox, 0, S, S);
        for (let i = 0; i < L * L; i++) {
          if (U[i] >= st.p) continue;
          const x = i % L, y = (i / L) | 0, r0 = C.root[i];
          let col = 'ink3', a = 0.35;
          if (r0 === C.span) { col = 's2'; a = 0.95; } else if (r0 === C.big) { col = 's3'; a = 0.9; } else if (C.size[r0] > 30) { col = 's1'; a = 0.45; }
          c.fillStyle = PL.col(col); c.globalAlpha = a;
          c.fillRect(ox + x * cs, y * cs, cs + 0.2, cs + 0.2);
        }
        c.globalAlpha = 1;
      });
      const cb = pn.box();
      cb.append(h('div', { class: 'fig-title', text: '能从上到下贯通的概率' }));
      const ch = PL.plot(cb, { height: 330, x: [0.45, 0.75], y: [0, 1], xlabel: '打开的概率 p', yfmt: (v) => Math.round(v * 100) + '%', xfmt: (v) => Math.round(v * 100) + '%', legend: [{ label: '20×20', color: 's7' }, { label: '50×50', color: 's4' }, { label: '120×120', color: 's2' }], legendPos: 'tl' });
      const curves = PERC_CACHE.c || (PERC_CACHE.c = (() => {
        const r = PL.rng(5), ps = M.linspace(0.45, 0.75, 31), out = {};
        for (const Lc of [20, 50, 120]) {
          const T = Lc > 100 ? 12 : 30;
          out[Lc] = ps.map((p) => { let k = 0; for (let t = 0; t < T; t++) { const o = new Uint8Array(Lc * Lc); for (let i = 0; i < o.length; i++) o[i] = r() < p; if (clusters(Lc, o).span >= 0) k++; } return k / T; });
        }
        return { ps, out };
      })());
      ch.fn = (p) => {
        p.vline(0.5927, { color: 'ink3', label: '临界值 ≈ 59.27%' });
        [[20, 's7'], [50, 's4'], [120, 's2']].forEach(([Lc, col]) => p.line(curves.ps, curves.out[Lc], { color: col, width: 2.2 }));
        p.vline(st.p, { color: 'ink', dash: [], width: 1.5 });
      };
      const stats = pn.stats([
        { key: 'span', label: '上下贯通了吗', color: 's2' },
        { key: 'big', label: '最大团簇占所有打开格子的比例', color: 's3' },
        { key: 'dist', label: '离临界值', color: 's7' },
      ]);
      function update() {
        const open = new Uint8Array(L * L); for (let i = 0; i < open.length; i++) open[i] = U[i] < st.p;
        C = clusters(L, open);
        const nOpen = open.reduce((a, b) => a + b, 0);
        stats.set('span', C.span >= 0 ? '贯通' : '不通', null, C.span >= 0 ? 'bad' : 'good');
        stats.set('big', nOpen ? PL.pct(C.bigSize / nOpen, 1) : '—');
        stats.set('dist', PL.signed((st.p - 0.5927) * 100, 1, ' 个百分点'));
        grid.render(); ch.render();
      }
      gen(); update();
      PL.prose(root, `
        <h2>相变</h2>
        <p>1957 年，Broadbent 和 Hammersley 提出了渗流模型，用来研究防毒面具的活性炭滤芯：气体能不能穿过随机分布的孔隙？在方形网格上，临界概率 p<sub>c</sub> ≈ 0.5927。低于它，打开的格子只组成有限大小的孤岛；高于它，会出现一个占据网格相当比例的"无限"团簇。网格越大，从"几乎不可能贯通"到"几乎必然贯通"的过渡越陡，在无限大的网格里，它是一个真正的跳变。</p>
        <p class="try">把 p 从 55% 慢慢拖到 62%，看绿色的最大团簇怎样从一个小块突然吞并周围的一切；在 59% 附近来回拖，看团簇的形状：分形的、带有各种尺度的空洞。</p>

        <h2>临界点附近没有特征尺度</h2>
        <p>远离临界点时，团簇有一个典型大小，再大的团簇指数级罕见；恰好在临界点上，团簇大小服从幂律分布，大大小小的团簇都有，最大的团簇是一个分形。这种"没有特征尺度"的状态，在${PL.link('sandpile', '沙堆模型')}里会再次出现，而且那里系统会自己走到临界点上。</p>

        <h2>它在哪里</h2>
        <ul>
          <li><b>传染病与疫苗</b>：病毒在接触网络里传播，相当于渗流。接种让一部分节点"关闭"，只要把能传播的比例压到临界值以下，大规模流行就不会发生，这就是群体免疫阈值的网络版本。${PL.link('friends', '熟人免疫')}之所以高效，是因为它优先关掉了枢纽。</li>
          <li><b>森林火灾</b>：树木密度低于某个临界值时，火只烧掉一小片；高于临界值，一个火星就能烧穿整片森林。</li>
          <li><b>材料与网络</b>：导电颗粒在绝缘体中的比例、岩石中石油的流动、互联网在节点失效时是否仍然连通，都是渗流问题。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>在临界点附近，线性的直觉完全失效：一点点的变化可以把系统从"局部的小问题"推到"全局的大事件"。判断一个系统离临界点有多远，比估计它的平均状态更重要。${PL.link('schelling', '谢林隔离')}里的"临界要求"也是同一类现象。</div>
      `);
    },
  });

  // ======================================================================
  // 同步（Kuramoto）
  // ======================================================================
  PL.register({
    id: 'sync', cat: 'critical', nav: '同步：没人指挥，萤火虫一起闪',
    title: '同步：没有指挥，一群萤火虫会自己一起闪',
    hook: '每只萤火虫有自己的节奏，只会根据看到的邻居稍微调快或调慢一点。耦合弱时一片杂乱；耦合超过一个临界值，整群突然开始同步闪烁。',
    related: ['percolation', 'resonance', 'dzhanibekov'],
    render(root) {
      const N = 150;
      const st = { K: 2, sigma: 1, seed: PL.seed(), speed: 1 };
      let w, th, flash, hist, t;
      function reset() {
        const r = PL.rng(st.seed);
        w = Float64Array.from({ length: N }, () => st.sigma * r.normal());
        th = Float64Array.from({ length: N }, () => r() * 2 * Math.PI);
        flash = new Float32Array(N); hist = []; t = 0;
      }
      reset();
      const Kc = (2 * Math.sqrt(2 * Math.PI) * st.sigma) / Math.PI;
      const pn = PL.panel(root, '150 个振子', '左：每个振子是圆上的一个点，颜色是它天生的节奏（蓝 = 慢，红 = 快）；中间的箭头是"整体同步程度"r。右：把每个振子画成一只萤火虫，相位转过一圈时闪一下。').cols(2);
      pn.ctrl.slider({ label: '耦合强度 K', min: 0, max: 5, step: 0.05, value: st.K, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.K = v; }, wide: true });
      pn.ctrl.slider({ label: '播放速度', min: 0.2, max: 3, step: 0.1, value: st.speed, fmt: (v) => '× ' + PL.fmt(v, 1), onInput: (v) => { st.speed = v; } });
      pn.ctrl.button('打乱重来', () => { st.seed = PL.seed(); reset(); });
      let R = 0, psi = 0;
      const hue = (v) => { const u = M.clamp((v / st.sigma + 2.2) / 4.4, 0, 1); return `hsl(${220 - 220 * u}, 70%, 55%)`; };
      const circ = PL.stage(pn.box(), { height: 300 }, (c, w0, hh) => {
        const Rr = Math.min(w0, hh) / 2 - 22, cx = w0 / 2, cy = hh / 2;
        c.strokeStyle = PL.col('line'); c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, Rr, 0, 7); c.stroke();
        for (let i = 0; i < N; i++) { c.fillStyle = hue(w[i]); c.beginPath(); c.arc(cx + Rr * Math.cos(th[i]), cy - Rr * Math.sin(th[i]), 4, 0, 7); c.fill(); }
        c.strokeStyle = PL.col('ink'); c.lineWidth = 3;
        PL.drawArrow(c, cx, cy, cx + Rr * R * Math.cos(psi), cy - Rr * R * Math.sin(psi), 10);
        c.font = PL.font(13, 600); c.fillStyle = PL.col('ink'); c.textAlign = 'center';
        c.fillText(`r = ${PL.fmt(R, 2)}`, cx, cy + Rr * 0.45);
      });
      const fire = PL.stage(pn.box(), { height: 300 }, (c, w0, hh) => {
        c.fillStyle = '#0d1020'; c.fillRect(0, 0, w0, hh);
        const cols = 15, rows = 10, cw = w0 / cols, chh = hh / rows;
        const r = PL.rng(4);
        for (let i = 0; i < N; i++) {
          const x = (i % cols + 0.5 + (r() - 0.5) * 0.5) * cw, y = (Math.floor(i / cols) + 0.5 + (r() - 0.5) * 0.5) * chh, f = flash[i];
          if (f > 0.02) { const g = c.createRadialGradient(x, y, 0, x, y, 16); g.addColorStop(0, `rgba(230,255,120,${0.9 * f})`); g.addColorStop(1, 'rgba(230,255,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y, 16, 0, 7); c.fill(); }
          c.fillStyle = `rgba(200,220,120,${0.15 + 0.85 * f})`; c.beginPath(); c.arc(x, y, 2.2, 0, 7); c.fill();
        }
      });
      pn.cols(2);
      const row = h('div', { class: 'figs two' });
      pn.el.insertBefore(row, pn.el.querySelector('.stats'));
      const lb = h('div', { class: 'fig' }), rb = h('div', { class: 'fig' });
      row.append(lb, rb);
      lb.append(h('div', { class: 'fig-title', text: '同步程度 r 随时间' }));
      const tp = PL.plot(lb, { height: 220, x: [0, 30], y: [0, 1], xlabel: '时间' });
      tp.fn = (p) => { if (hist.length < 2) return; const T = hist[hist.length - 1][0]; p.x = [Math.max(0, T - 30), Math.max(30, T)]; p.line(hist.map((q) => q[0]), hist.map((q) => q[1]), { color: 's2', width: 2 }); };
      rb.append(h('div', { class: 'fig-title', text: '稳定后的同步程度 vs. 耦合强度' }));
      const kp = PL.plot(rb, { height: 220, x: [0, 5], y: [0, 1], xlabel: '耦合强度 K' });
      const curve = (() => {
        const r = PL.rng(21), Ks = M.linspace(0, 5, 26), ys = [];
        for (const K of Ks) {
          const ww = Array.from({ length: 200 }, () => st.sigma * r.normal()), tt = Array.from({ length: 200 }, () => r() * 6.283);
          let acc = 0;
          for (let s = 0; s < 900; s++) {
            let cx = 0, cy = 0; for (const a of tt) { cx += Math.cos(a); cy += Math.sin(a); }
            cx /= 200; cy /= 200; const RR = Math.hypot(cx, cy), ps = Math.atan2(cy, cx);
            for (let i = 0; i < 200; i++) tt[i] += 0.06 * (ww[i] + K * RR * Math.sin(ps - tt[i]));
            if (s >= 600) acc += RR;
          }
          ys.push(acc / 300);
        }
        return { Ks, ys };
      })();
      kp.fn = (p) => { p.vline(Kc, { color: 'ink3', label: `临界 K_c ≈ ${PL.fmt(Kc, 2)}` }); p.line(curve.Ks, curve.ys, { color: 's4', width: 2.5 }); p.point(st.K, R, { color: 's2' }); };
      const stats = pn.stats([
        { key: 'r', label: '同步程度 r', color: 's2', sub: '0 = 完全杂乱，1 = 完全同步' },
        { key: 'k', label: '耦合 K vs 临界值', color: 's4' },
        { key: 'lock', label: '已经锁相的振子', color: 's3' },
      ]);
      let acc = 0;
      PL.loop((dt) => {
        let s = Math.min(0.1, dt) * st.speed * 3;
        while (s > 0) {
          const d = Math.min(0.03, s);
          let cx = 0, cy = 0; for (let i = 0; i < N; i++) { cx += Math.cos(th[i]); cy += Math.sin(th[i]); }
          cx /= N; cy /= N; R = Math.hypot(cx, cy); psi = Math.atan2(cy, cx);
          for (let i = 0; i < N; i++) {
            const before = th[i];
            th[i] += d * (w[i] + 2 * Math.PI * 0.35 + st.K * R * Math.sin(psi - th[i]));
            if (Math.floor(th[i] / (2 * Math.PI)) !== Math.floor(before / (2 * Math.PI))) flash[i] = 1;
          }
          t += d; s -= d;
        }
        for (let i = 0; i < N; i++) flash[i] *= 0.88;
        acc += dt;
        if (acc > 0.08) {
          acc = 0;
          hist.push([t, R]); if (hist.length > 800) hist.shift();
          let locked = 0; for (let i = 0; i < N; i++) if (Math.abs(w[i]) <= st.K * R) locked++;
          stats.set('r', PL.fmt(R, 2), null, R > 0.6 ? 'good' : '');
          stats.set('k', `${PL.fmt(st.K, 2)} / ${PL.fmt(Kc, 2)}`, st.K < Kc ? '低于临界：几乎不同步' : '高于临界：自发同步');
          stats.set('lock', `${locked} / ${N}`, '天生节奏和群体差得不太远的那些');
          tp.render(); kp.render();
        }
        circ.render(); fire.render();
      });
      circ.render(); fire.render();
      PL.prose(root, `
        <h2>Kuramoto 模型</h2>
        <p>东南亚某些河岸的红树林里，成千上万只萤火虫会整夜同步闪烁。没有领头的萤火虫，每一只都只是看到周围的闪光后，把自己的节奏稍微调一调。1975 年，物理学家蔵本由纪把这类现象写成了一个极简的模型：每个振子有自己天生的频率 ω<sub>i</sub>，并且被群体的平均相位轻轻拉动：</p>
        <div class="formula">dθ<sub>i</sub>/dt = ω<sub>i</sub> + K · r · sin(ψ − θ<sub>i</sub>)</div>
        <p>其中 r 和 ψ 是群体的同步程度和平均相位。r 越大，拉力越强；拉力越强，越多振子被拉进同步，r 又更大，这是一个正反馈。结果是一个<b>相变</b>：耦合 K 低于临界值 K<sub>c</sub> = 2/(π g(0))（g 是天生频率的分布）时，r 几乎为 0；超过 K<sub>c</sub>，同步自发出现并迅速增强。</p>
        <p class="try">把 K 从 0 慢慢拉到 3：在 1.6 附近，左边的点开始聚成一团，右边的萤火虫从此起彼伏变成齐闪。再降回 1，看同步怎样瓦解。</p>

        <h2>它在哪里</h2>
        <ul>
          <li><b>伦敦千禧桥</b>：2000 年 6 月开放当天，人群走上桥后桥身开始左右晃动，两天后被迫关闭。行人会不自觉地跟着桥的摆动调整步伐，而这又加剧了摆动：人群超过一个临界人数时，步伐同步突然出现（Strogatz 等, <i>Nature</i> 2005）。加装阻尼器之后才重新开放。</li>
          <li><b>节拍器</b>：把几个节拍器放在一块可以滑动的板上，它们会通过板的微小运动互相耦合，几分钟后齐步摆动。</li>
          <li><b>心脏和电网</b>：心脏起搏细胞靠同步产生心跳；电网里的发电机必须保持频率同步，失步会导致大面积停电。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>整体的秩序不一定需要中央指挥。足够强的局部耦合，会在某个临界点上让秩序突然"涌现"。这和${PL.link('percolation', '渗流')}一样：低于临界点，局部的协调互不相连；越过临界点，它们连成一个整体。</div>
      `);
    },
  });

  // ======================================================================
  // 沙堆模型（自组织临界）
  // ======================================================================
  PL.register({
    id: 'sandpile', cat: 'critical', nav: '沙堆：雪崩没有典型大小',
    title: '沙堆模型：同样的一粒沙，可能什么也不引发，也可能引发一场席卷全局的雪崩',
    hook: '往沙堆上一粒一粒地加沙。大部分时候什么也不会发生，偶尔会引发大大小小的崩塌。这些雪崩的大小没有"典型值"，而且系统不需要任何调节，就会自己走到这种临界状态。',
    related: ['percolation', 'benford', 'bullwhip'],
    render(root) {
      const L = 50, N = L * L;
      const g = new Uint8Array(N);
      let added = 0, sizes = [], lastTopple = new Float32Array(N);
      const st = { rate: 20, running: true };
      const rng = PL.rng(PL.seed());
      const stack = new Int32Array(N + 8); // a site is pushed only when it reaches exactly 4, so it is on the stack at most once
      function addGrain(i) {
        g[i]++; added++;
        if (g[i] < 4) return 0;
        let sp = 0, top = 0;
        stack[sp++] = i;
        while (sp) {
          const j = stack[--sp];
          if (g[j] < 4) continue;
          g[j] -= 4; top++; lastTopple[j] = 1;
          const x = j % L, y = (j / L) | 0;
          if (x > 0 && ++g[j - 1] === 4) stack[sp++] = j - 1;
          if (x < L - 1 && ++g[j + 1] === 4) stack[sp++] = j + 1;
          if (y > 0 && ++g[j - L] === 4) stack[sp++] = j - L;
          if (y < L - 1 && ++g[j + L] === 4) stack[sp++] = j + L;
          if (g[j] >= 4) stack[sp++] = j;
        }
        return top;
      }
      function drop(n, record = true) { for (let k = 0; k < n; k++) { const s = addGrain(rng.int(N)); if (s > 0 && record) sizes.push(s); } }
      drop(30000, false);
      lastTopple.fill(0);
      const pn = PL.panel(root, '一个 50×50 的沙堆', '每个格子最多稳定地堆 3 粒沙。达到 4 粒就会崩塌：把 4 粒分给上下左右的邻居（落到边外的就丢掉），邻居如果也满了，就继续崩塌。颜色越深沙越多，<b style="color:var(--s2)">红色</b>是刚刚崩塌过的格子。').cols(2);
      pn.ctrl.slider({ label: '每帧加几粒沙', min: 1, max: 300, step: 1, log: true, value: st.rate, fmt: (v) => v + ' 粒', onInput: (v) => { st.rate = v; } });
      const runBtn = pn.ctrl.button('暂停', () => { st.running = !st.running; runBtn.textContent = st.running ? '暂停' : '继续'; });
      pn.ctrl.button('快进 2 万粒', () => { drop(20000); update(); });
      pn.ctrl.button('清空统计', () => { sizes = []; update(); });
      const pile = PL.stage(pn.box(), { height: (w) => Math.min(380, w) }, (c, w, hh) => {
        const S = Math.min(w, hh), cs = S / L, ox = (w - S) / 2;
        const cols = ['paper', 's1', 's1', 's1'], al = [1, 0.25, 0.55, 0.9];
        for (let i = 0; i < N; i++) {
          const x = i % L, y = (i / L) | 0;
          c.fillStyle = PL.col(cols[g[i]]); c.globalAlpha = al[g[i]];
          c.fillRect(ox + x * cs, y * cs, cs + 0.3, cs + 0.3);
          if (lastTopple[i] > 0.05) { c.fillStyle = PL.col('s2'); c.globalAlpha = lastTopple[i]; c.fillRect(ox + x * cs, y * cs, cs + 0.3, cs + 0.3); }
        }
        c.globalAlpha = 1;
      });
      const cb = pn.box();
      cb.append(h('div', { class: 'fig-title', text: '雪崩大小的分布（双对数坐标）' }));
      const ch = PL.plot(cb, { height: 330, x: [1, 3000], y: [1e-6, 1], xlog: true, ylog: true, xlabel: '雪崩大小（崩塌次数）', ylabel: '出现的频率', legend: [{ label: '模拟', color: 's2', type: 'dot' }, { label: '幂律参考线（斜率 −1.2）', color: 'ink3', dash: [5, 4] }], legendPos: 'tr' });
      ch.fn = (p) => {
        if (sizes.length < 20) return;
        const edges = M.logspace(1, 5000, 26), cnt = new Array(edges.length - 1).fill(0);
        for (const s of sizes) for (let k = 0; k < edges.length - 1; k++) if (s >= edges[k] && s < edges[k + 1]) { cnt[k]++; break; }
        const xs = [], ys = [];
        cnt.forEach((c0, k) => { if (c0) { xs.push(Math.sqrt(edges[k] * edges[k + 1])); ys.push(c0 / sizes.length / (edges[k + 1] - edges[k])); } });
        p.dots(xs, ys, { color: 's2', r: 4 });
        if (ys.length) p.func((x) => ys[0] * Math.pow(x / xs[0], -1.2), { color: 'ink3', dash: [5, 4], width: 1.5 });
      };
      const stats = pn.stats([
        { key: 'n', label: '记录到的雪崩', color: 's7' },
        { key: 'max', label: '最大的一次', color: 's2' },
        { key: 'h', label: '平均每格沙粒数', color: 's1', sub: '自己稳定在约 2.1：临界状态' },
        { key: 'zero', label: '加一粒沙什么都不发生的比例', color: 's3' },
      ]);
      let zeroCnt = 0, totDrops = 0;
      function update() {
        stats.set('n', PL.int(sizes.length));
        let mx = 0; for (const v of sizes) if (v > mx) mx = v;
        stats.set('max', sizes.length ? PL.int(mx) + ' 次崩塌' : '—');
        let s = 0; for (let i = 0; i < N; i++) s += g[i];
        stats.set('h', PL.fmt(s / N, 3));
        stats.set('zero', totDrops ? PL.pct(zeroCnt / totDrops, 0) : '—');
        pile.render(); ch.render();
      }
      let acc = 0;
      PL.loop((dt) => {
        for (let i = 0; i < N; i++) lastTopple[i] *= 0.82;
        if (st.running) {
          for (let k = 0; k < st.rate; k++) { const sz = addGrain(rng.int(N)); totDrops++; if (sz > 0) sizes.push(sz); else zeroCnt++; }
          if (sizes.length > 200000) sizes = sizes.slice(-100000);
        }
        acc += dt;
        if (acc > 0.25) { acc = 0; update(); } else pile.render();
      });
      drop(20000); update();
      PL.prose(root, `
        <h2>自组织临界</h2>
        <p>1987 年，Per Bak、汤超和 Kurt Wiesenfeld 提出了这个沙堆模型。加沙会让沙堆变陡，雪崩会让它变平，两者相互抵消，沙堆被"吸引"到一个特殊的状态：平均每格约 2.1 粒，刚好处在随时可能崩塌的边缘。在这个状态下，雪崩的大小服从<b>幂律分布</b>：小雪崩很多，大雪崩很少，但没有一个"典型大小"，也没有上限（除了沙堆本身的大小）。</p>
        <p>和${PL.link('percolation', '渗流')}不同的是，这里没有人去调节某个参数让系统停在临界点上，系统<b>自己</b>走到了临界点，所以叫"自组织临界"。</p>
        <p class="try">让它跑一会儿，看右边的点逐渐排成一条直线（双对数坐标下的直线就是幂律）。注意大部分时候加一粒沙什么也不会发生，偶尔一粒沙会引发几百上千次崩塌，而引发大雪崩的那粒沙和其他沙粒没有任何不同。</p>

        <h2>它解释了什么，没解释什么</h2>
        <ul>
          <li><b>地震</b>：地震的能量分布服从古登堡–里克特定律，也是幂律。地壳在板块运动下缓慢积累应力，又以大小不一的地震释放，这和沙堆的图景相似。</li>
          <li><b>森林火灾、太阳耀斑、股市的剧烈波动</b>都表现出类似的"没有特征尺度"的统计，常被拿来与自组织临界相比。</li>
          <li><b>要谨慎</b>：真实的沙堆并不总是表现出这种行为。Frette 等人（1996, <i>Nature</i>）用米粒做实验，发现只有细长的米粒堆才出现幂律雪崩。"看到幂律就说是自组织临界"是常见的过度推广。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>在临界状态下，大事件和小事件可以有<b>同样的起因</b>。为一场大雪崩去找"特别的原因"，往往是找错了方向：要问的不是"哪粒沙引发了它"，而是"系统为什么处在随时会崩的状态"。这和${PL.link('benford', '本福特定律')}一样，是"跨越多个数量级、没有特征尺度"的世界。</div>
      `);
    },
  });
})();
