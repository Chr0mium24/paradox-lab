/* 类别四：维度与尺度 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 高维几何
  // ======================================================================
  PL.register({
    id: 'highdim', cat: 'dimension', nav: '高维几何：橘子全是皮',
    title: '高维几何：橘子全是皮，立方体全是角',
    hook: '在 1000 维里，球的体积 99.996% 都在最外面 1% 厚的壳里；高斯分布概率密度最大的地方，一个样本都抽不到。',
    related: ['distance', 'average', 'orthogonal', 'stein'],
    render(root) {
      // ---- A: shell ----
      const a = { d: 100, eps: 0.01 };
      const pa = PL.panel(root, '① 体积全在表皮', 'd 维球的体积 ∝ r<sup>d</sup>。把半径缩小 1%，体积就乘以 0.99<sup>d</sup>，剩下的都在那层薄壳里。').cols(2);
      pa.ctrl.slider({ label: '维数 d', min: 1, max: 1000, step: 1, log: true, value: a.d, fmt: (v) => v, onInput: (v) => { a.d = v; upA(); } });
      pa.ctrl.slider({ label: '壳的厚度 ε', min: 0.001, max: 0.2, step: 0.001, log: true, value: a.eps, fmt: (v) => PL.pct(v, v < 0.01 ? 1 : 0), onInput: (v) => { a.eps = v; upA(); } });
      const peel = PL.stage(pa.box(), { height: 220 }, (c, w, hh) => {
        const f = 1 - Math.pow(1 - a.eps, a.d);
        const cx = w / 2, cy = hh / 2 + 6, R = Math.min(w, hh) * 0.4;
        // draw as a disc whose AREA split matches the volume split
        const rin = R * Math.sqrt(1 - f);
        c.fillStyle = PL.col('s6'); c.beginPath(); c.arc(cx, cy, R, 0, 7); c.fill();
        c.fillStyle = PL.col('panel'); c.beginPath(); c.arc(cx, cy, rin + 0.5, 0, 7); c.fill();
        c.fillStyle = PL.col('s3'); c.globalAlpha = 0.55; c.beginPath(); c.arc(cx, cy, rin, 0, 7); c.fill(); c.globalAlpha = 1;
        c.font = PL.font(12); c.fillStyle = PL.col('ink2'); c.textAlign = 'center';
        c.fillText('按体积比例画成的"切面"：橙色 = 外层 ' + PL.pct(a.eps, a.eps < 0.01 ? 1 : 0) + ' 厚的壳', cx, 14);
        c.fillStyle = PL.col('ink'); c.font = PL.font(15, 700);
        if (rin > 30) c.fillText('果肉 ' + PL.pct(1 - f, 1), cx, cy + 5);
        else c.fillText('果皮 ' + PL.pct(f, f > 0.9999 ? 3 : 1), cx, cy + 5);
      });
      const pab = pa.box();
      const chA = PL.plot(pab, { height: 220, x: [1, 1000], y: [0, 1], xlog: true, xlabel: '维数 d', ylabel: '壳里的体积比例', yfmt: (v) => Math.round(v * 100) + '%' });
      chA.fn = (p) => {
        [0.001, 0.01, 0.1].forEach((e) => p.func((d) => 1 - Math.pow(1 - e, d), { color: 's7', width: 1.2, alpha: 0.7 }));
        p.text(400, 1 - Math.pow(0.999, 400), 'ε=0.1%', { color: 'ink3', size: 11, dy: -6 });
        p.text(30, 1 - Math.pow(0.99, 30), 'ε=1%', { color: 'ink3', size: 11, dx: 4, dy: 4 });
        p.text(4, 1 - Math.pow(0.9, 4), 'ε=10%', { color: 'ink3', size: 11, dx: 6, dy: 4 });
        p.func((d) => 1 - Math.pow(1 - a.eps, d), { color: 's6', width: 3 });
        p.point(a.d, 1 - Math.pow(1 - a.eps, a.d), { color: 's6' });
      };
      const sa = pa.stats([{ key: 'f', label: '外层壳里的体积', color: 's6' }]);
      function upA() {
        const f = 1 - Math.pow(1 - a.eps, a.d);
        sa.set('f', f > 0.99995 ? '> 99.99%' : PL.pct(f, f > 0.99 ? 3 : 1), `d = ${a.d}，壳厚 ${PL.pct(a.eps, a.eps < 0.01 ? 1 : 0)}`);
        peel.render(); chA.render();
      }
      upA();

      // ---- B: corners & central sphere ----
      const b = { d: 10 };
      const pb = PL.panel(root, '② 立方体的体积全在角上', '边长为 4 的立方体 [−2, 2]<sup>d</sup>，在每个角上放一个半径 1 的球（共 2<sup>d</sup> 个），它们两两相切。再在正中间放一个球，让它刚好碰到所有角上的球。这个中心球的半径是 √d − 1。').cols(2);
      pb.ctrl.slider({ label: '维数 d', min: 1, max: 30, step: 1, value: b.d, fmt: (v) => v, onInput: (v) => { b.d = v; upB(); } });
      const sph = PL.stage(pb.box(), { height: 300 }, (c, w, hh) => {
        const S = Math.min(w, hh) / 6.4, cx = w / 2, cy = hh / 2;
        const rc = Math.sqrt(b.d) - 1;
        c.strokeStyle = PL.col('ink'); c.lineWidth = 2; c.strokeRect(cx - 2 * S, cy - 2 * S, 4 * S, 4 * S);
        c.fillStyle = PL.col('s1'); c.globalAlpha = 0.25; c.strokeStyle = PL.col('s1'); c.lineWidth = 1.5;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.arc(cx + sx * S, cy + sy * S, S, 0, 7); c.fill(); c.globalAlpha = 1; c.stroke(); c.globalAlpha = 0.25; }
        c.globalAlpha = 1;
        const out = rc > 2;
        c.fillStyle = PL.col(out ? 's2' : 's3'); c.globalAlpha = 0.35; c.beginPath(); c.arc(cx, cy, Math.max(0, rc) * S, 0, 7); c.fill();
        c.globalAlpha = 1; c.strokeStyle = PL.col(out ? 's2' : 's3'); c.lineWidth = 2; c.stroke();
        c.font = PL.font(12); c.fillStyle = PL.col('ink2'); c.textAlign = 'center';
        c.fillText('按 d 维里的真实半径，画在二维切面上', cx, 14);
        c.fillStyle = PL.col(out ? 's2' : 'ink'); c.font = PL.font(13, 600);
        c.fillText(out ? `中心球半径 ${PL.fmt(rc, 2)}，已经伸出了盒子！` : `中心球半径 ${PL.fmt(rc, 2)}（盒子半宽 2）`, cx, hh - 8);
      });
      const pbb = pb.box();
      pbb.append(h('div', { class: 'fig-title', text: '内切球占立方体体积的比例' }));
      const ratio = (d) => Math.exp((d / 2) * Math.log(Math.PI) - M.lgamma(d / 2 + 1) - d * Math.log(2));
      const chB = PL.plot(pbb, { height: 260, x: [1, 30], y: [1e-20, 1], ylog: true, xlabel: '维数 d', yticks: [1, 1e-4, 1e-8, 1e-12, 1e-16, 1e-20], yfmt: (v) => (v === 1 ? '100%' : '10^' + Math.round(Math.log10(v))) });
      chB.fn = (p) => {
        const ds = M.linspace(1, 30, 30);
        p.line(ds, ds.map(ratio), { color: 's1', width: 2.5 });
        p.point(b.d, ratio(b.d), { color: 's1' });
      };
      const sb = pb.stats([
        { key: 'r', label: '内切球 ÷ 立方体', color: 's1' },
        { key: 'corner', label: '角到中心的距离 ÷ 面到中心的距离', color: 's4', sub: '= √d' },
        { key: 'c', label: '中心球半径 √d − 1', color: 's3' },
      ]);
      function upB() {
        const r = ratio(b.d);
        sb.set('r', r > 0.001 ? PL.pct(r, 2) : r.toExponential(1));
        sb.set('corner', PL.fmt(Math.sqrt(b.d), 2));
        const rc = Math.sqrt(b.d) - 1;
        sb.set('c', PL.fmt(rc, 2), rc > 2 ? '比盒子还大（d ≥ 10）' : rc === 2 ? '刚好碰到盒子的面（d = 9）' : '盒子半宽是 2', rc > 2 ? 'bad' : '');
        sph.render(); chB.render();
      }
      upB();

      // ---- C: gaussian shell ----
      const g = { d: 100, seed: PL.seed() };
      const pc = PL.panel(root, '③ 概率密度最大的地方，没有样本', '从 d 维标准高斯分布里抽 3000 个点，看它们离原点有多远。').cols(2);
      pc.ctrl.slider({ label: '维数 d', min: 1, max: 1000, step: 1, log: true, value: g.d, fmt: (v) => v, onInput: PL.debounce((v) => { g.d = v; upC(); }, 30) });
      const c1b = pc.box(); c1b.append(h('div', { class: 'fig-title', text: '3000 个样本到原点的距离' }));
      const chC1 = PL.plot(c1b, { height: 240, x: [0, 12], y: [0, 1], yticks: [], xlabel: '到原点的距离 ‖x‖' });
      const c2b = pc.box(); c2b.append(h('div', { class: 'fig-title', text: '密度 vs. "落在这个半径上的概率"' }));
      const chC2 = PL.plot(c2b, { height: 240, x: [0, 12], y: [0, 1.05], yticks: [], xlabel: '半径 r', legend: [{ label: '单点概率密度 e^(−r²/2)', color: 's2' }, { label: '半径 r 处的总概率', color: 's1' }] });
      let G;
      chC1.fn = (p) => {
        p.hist(G.norms, { bins: 60, range: p.x, color: 's1', alpha: 0.7, frac: true, autoY: true });
        p.vline(Math.sqrt(g.d), { color: 's2', dash: [], label: '√d = ' + PL.fmt(Math.sqrt(g.d), 1) });
      };
      chC2.fn = (p) => {
        const d = g.d;
        p.func((r) => Math.exp(-r * r / 2), { color: 's2', width: 2.5 });
        const rm = Math.sqrt(Math.max(d - 1, 0));
        const lp = (r) => (d - 1) * Math.log(Math.max(r, 1e-12)) - r * r / 2;
        const lmax = d > 1 ? lp(rm) : 0;
        p.func((r) => (d > 1 ? Math.exp(lp(r) - lmax) : Math.exp(-r * r / 2)), { color: 's1', width: 2.5, n: 400 });
      };
      const sc = pc.stats([
        { key: 'mean', label: '样本到原点的平均距离', color: 's1' },
        { key: 'near', label: '落在半径 √d/2 以内的样本', color: 's2' },
        { key: 'lerp', label: '两个样本"直线插值"中点的长度', color: 's6', sub: '≈ √(d/2)，跑出了薄壳' },
      ]);
      function upC() {
        const r = PL.rng(g.seed), d = g.d, n = 3000;
        const norms = [], pts = [];
        for (let i = 0; i < n; i++) {
          let s = 0;
          const keep = i < 400 ? new Float64Array(d) : null;
          for (let k = 0; k < d; k++) { const z = r.normal(); s += z * z; if (keep) keep[k] = z; }
          norms.push(Math.sqrt(s)); if (keep) pts.push(keep);
        }
        let mid = 0;
        for (let i = 0; i < 200; i++) { const A = pts[2 * i], B = pts[2 * i + 1]; let s = 0; for (let k = 0; k < d; k++) s += ((A[k] + B[k]) / 2) ** 2; mid += Math.sqrt(s); }
        G = { norms };
        const xmax = Math.sqrt(d) + 4.5;
        chC1.setX(0, xmax); chC2.setX(0, xmax);
        sc.set('mean', PL.fmt(M.mean(norms), 2), `√d = ${PL.fmt(Math.sqrt(d), 2)}，标准差 ${PL.fmt(M.sd(norms), 2)}`);
        sc.set('near', PL.pct(norms.filter((v) => v < Math.sqrt(d) / 2).length / n, 1), '密度最高的地方几乎没有点', d >= 10 ? 'bad' : '');
        sc.set('lerp', PL.fmt(mid / 200, 2), `薄壳在 ${PL.fmt(Math.sqrt(d), 1)} 附近`);
        chC1.render(); chC2.render();
      }
      upC();

      PL.prose(root, `
        <h2>① 体积全在表皮</h2>
        <p>d 维球的体积和半径的 d 次方成正比。半径缩小 1%，体积就乘以 0.99<sup>d</sup>：3 维时还剩 97%，100 维时剩 37%，1000 维时只剩 0.004%。高维的"橘子"几乎全是皮。这意味着高维里<b>几乎所有点都在边界附近</b>，"内部"几乎不占体积。</p>

        <h2>② 立方体的体积全在角上</h2>
        <p>内切球占立方体的比例：2 维 78.5%，3 维 52.4%，10 维 0.25%，20 维只剩 2.5 × 10<sup>−8</sup>。立方体的角离中心 √d 远，面却只离中心 1，100 维的立方体，角比面远 10 倍。高维立方体的样子更像一只海胆：几乎所有体积都在那些又细又长的"角"里。</p>
        <p>中间那个球的悖论更直观：4 维时它和角上的球一样大；9 维时它碰到盒子的面；10 维以后，它居然<b>伸出了盒子</b>，尽管它被 2<sup>d</sup> 个球"包围"着。</p>

        <h2>③ 最可能的点上没有样本</h2>
        <p>标准高斯分布的密度在原点最高（红线），但落在半径 r 附近的总概率 = 单点密度 × 半径 r 处的"球面面积"，而球面面积 ∝ r<sup>d−1</sup>，随维数爆炸式增长。两者相乘，概率集中在半径 ≈ √d 的一层薄壳上（蓝线），壳的厚度标准差约 0.7，不随维数增长。信息论里把这层薄壳叫<b>典型集</b>。</p>
        <ul>
          <li><b>生成模型的插值</b>：在 GAN、扩散模型的隐空间里，两个隐向量直接线性插值，中点的长度只有 √(d/2)，落在薄壳内侧，生成出来的图就会发糊、发灰。所以要用球面插值（slerp），让插值路径留在壳上。</li>
          <li><b>"最可能"的不典型</b>：贝叶斯推断里的最大后验点（MAP）是密度最高的点，但在高维里它可能和后验样本长得完全不一样。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>在高维里，"中心""平均""最可能"这些点几乎没有体积，也几乎不会被抽到。凡是涉及很多维度的东西（用户画像、多指标考核、模型的参数空间），对"平均值"和"典型值"都要多一分警惕。下一页${PL.link('distance', '距离集中')}和${PL.link('average', '平均飞行员')}是它的两个直接后果。</div>
      `);
    },
  });

  // ======================================================================
  // 距离集中
  // ======================================================================
  PL.register({
    id: 'distance', cat: 'dimension', nav: '距离集中：所有点都一样远',
    title: '距离集中：高维里所有点都一样远',
    hook: '1000 维的随机点之间，最近的和最远的只差几个百分点。"最近邻"这个概念本身开始失效。',
    related: ['highdim', 'orthogonal', 'average'],
    render(root) {
      const a = { d: 2, seed: PL.seed() };
      const pa = PL.panel(root, '① 从一个点出发，量到其他 500 个点的距离', '点在 [0, 1]<sup>d</sup> 里均匀分布。横轴是"距离 ÷ 平均距离"。').cols(2);
      pa.ctrl.slider({ label: '维数 d', min: 1, max: 1000, step: 1, log: true, value: a.d, fmt: (v) => v, onInput: PL.debounce((v) => { a.d = v; upA(); }, 20) });
      pa.ctrl.button('重新抽样', () => { a.seed = PL.seed(); upA(); });
      const b1 = pa.box(); b1.append(h('div', { class: 'fig-title', text: '距离的分布（以平均距离为 1）' }));
      const ch1 = PL.plot(b1, { height: 250, x: [0, 2], y: [0, 1], yticks: [], xlabel: '距离 ÷ 平均距离' });
      const b2 = pa.box(); b2.append(h('div', { class: 'fig-title', text: '(最远 − 最近) ÷ 最近' }));
      const ch2 = PL.plot(b2, { height: 250, x: [1, 1000], y: [0.01, 1000], xlog: true, ylog: true, xlabel: '维数 d', yfmt: (v) => (v >= 1 ? String(v) : String(v)) });
      function dists(d, seed, n = 500) {
        const r = PL.rng(seed);
        const q = Float64Array.from({ length: d }, () => r());
        const out = [];
        for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < d; k++) { const t = r() - q[k]; s += t * t; } out.push(Math.sqrt(s)); }
        return out;
      }
      const DS = [1, 2, 3, 5, 8, 12, 20, 35, 60, 100, 170, 300, 500, 1000];
      const contrast = DS.map((d) => { let c = 0; for (let s = 0; s < 4; s++) { const x = dists(d, 31 * d + s); const mn = Math.min(...x), mx = Math.max(...x); c += (mx - mn) / mn; } return c / 4; });
      let D;
      ch1.fn = (p) => {
        p.hist(D.map((v) => v / D.mean), { bins: 80, range: [0, 2], color: 's5', alpha: 0.75, frac: true, autoY: true });
        p.vline(1, { color: 'ink3' });
      };
      ch2.fn = (p) => {
        p.line(DS, contrast, { color: 's5', width: 2.5 });
        p.point(a.d, (D.max - D.min) / D.min, { color: 's2' });
      };
      const sa = pa.stats([
        { key: 'min', label: '最近邻', color: 's3' },
        { key: 'max', label: '最远的点', color: 's2' },
        { key: 'mean', label: '平均距离（理论 √(d/6)）', color: 's5' },
        { key: 'c', label: '(最远 − 最近) ÷ 最近', color: 's4' },
      ]);
      function upA() {
        const x = dists(a.d, a.seed);
        D = x; D.mean = M.mean(x); D.min = Math.min(...x); D.max = Math.max(...x);
        sa.set('min', PL.fmt(D.min, 3));
        sa.set('max', PL.fmt(D.max, 3));
        sa.set('mean', PL.fmt(D.mean, 3), `理论 ${PL.fmt(Math.sqrt(a.d / 6), 3)}，标准差 ${PL.fmt(M.sd(x), 3)}`);
        sa.set('c', PL.fmt((D.max - D.min) / D.min, 3), null, (D.max - D.min) / D.min < 0.3 ? 'bad' : '');
        ch1.render(); ch2.render();
      }
      upA();

      // ---- B: neighbourhood size ----
      const b = { d: 10, r: 0.1 };
      const pb = PL.panel(root, '② "局部"其实不局部', '在 [0, 1]<sup>d</sup> 的均匀数据里，想用一个小立方体圈出比例为 r 的点（你的"邻域"），它的边长要是多少？答案是 r<sup>1/d</sup>。').cols(2);
      pb.ctrl.slider({ label: '维数 d', min: 1, max: 100, step: 1, value: b.d, fmt: (v) => v, onInput: (v) => { b.d = v; upB(); } });
      pb.ctrl.slider({ label: '想圈出的比例 r', min: 0.001, max: 0.5, step: 0.001, log: true, value: b.r, fmt: (v) => PL.pct(v, v < 0.01 ? 1 : 0), onInput: (v) => { b.r = v; upB(); } });
      const nb = PL.stage(pb.box(), { height: 230 }, (c, w, hh) => {
        const e = Math.pow(b.r, 1 / b.d);
        const L = 30, R = w - 30;
        c.font = PL.font(12); c.textAlign = 'left';
        const rows = Math.min(8, b.d);
        const rh = Math.min(22, (hh - 60) / rows);
        for (let i = 0; i < rows; i++) {
          const y = 34 + i * rh;
          c.fillStyle = PL.col('grid'); c.fillRect(L, y, R - L, rh - 6);
          const off = (1 - e) * ((i * 0.37) % 1);
          c.fillStyle = PL.col('s5'); c.globalAlpha = 0.75; c.fillRect(L + off * (R - L), y, e * (R - L), rh - 6); c.globalAlpha = 1;
        }
        c.fillStyle = PL.col('ink2');
        c.fillText(`每条坐标轴上，邻域都要覆盖 ${PL.pct(e, 0)} 的范围${b.d > rows ? `（只画出 ${rows} 条轴，共 ${b.d} 条）` : ''}`, L, 18);
        c.fillText('坐标轴的全部范围 [0, 1]', L, 34 + rows * rh + 14);
      });
      const nbb = pb.box();
      const chB = PL.plot(nbb, { height: 230, x: [1, 100], y: [0, 1], xlog: true, xlabel: '维数 d', ylabel: '需要的边长', yfmt: (v) => Math.round(v * 100) + '%', legend: [{ label: 'r = 1%', color: 's7' }, { label: 'r = 10%', color: 's7', dash: [5, 4] }, { label: '当前 r', color: 's5' }], legendPos: 'br' });
      chB.fn = (p) => {
        p.func((d) => Math.pow(0.01, 1 / d), { color: 's7', width: 1.5 });
        p.func((d) => Math.pow(0.1, 1 / d), { color: 's7', width: 1.5, dash: [5, 4] });
        p.func((d) => Math.pow(b.r, 1 / d), { color: 's5', width: 2.5 });
        p.point(b.d, Math.pow(b.r, 1 / b.d), { color: 's5' });
      };
      function upB() { nb.render(); chB.render(); }
      upB();

      // ---- C: noise dims kill kNN ----
      const c = { k: 20 };
      const pcn = PL.panel(root, '③ 后果：无关维度淹没信号', '两类数据只在前 2 维有区别（准确率上限约 95%）。再给每个点加上 k 个毫无信息的随机维度，用"最近邻"来分类。');
      pcn.ctrl.slider({ label: '无关维度 k', min: 0, max: 500, step: 1, value: c.k, fmt: (v) => v, onInput: PL.debounce((v) => { c.k = v; upC(); }, 40), wide: true });
      const ch3 = PL.plot(pcn.box(), { height: 240, x: [1, 501], y: [0.4, 1], xlog: true, xlabel: '无关维度 k + 1（对数刻度）', ylabel: '1-最近邻 分类准确率', yfmt: (v) => Math.round(v * 100) + '%', xfmt: (v) => String(v) });
      function knn(k, seed) {
        const r = PL.rng(seed), n = 200;
        const mk = () => { const y = r() < 0.5 ? 0 : 1; const v = new Float64Array(2 + k); v[0] = (y ? 1 : -1) + 0.6 * r.normal(); v[1] = 0.6 * r.normal(); for (let j = 2; j < 2 + k; j++) v[j] = r.normal(); return { v, y }; };
        const tr = Array.from({ length: n }, mk), te = Array.from({ length: n }, mk);
        let ok = 0;
        for (const t of te) {
          let best = Infinity, by = 0;
          for (const s of tr) { let d = 0; for (let j = 0; j < 2 + k; j++) { const q = t.v[j] - s.v[j]; d += q * q; } if (d < best) { best = d; by = s.y; } }
          if (by === t.y) ok++;
        }
        return ok / n;
      }
      const KS = [0, 1, 2, 5, 10, 20, 50, 100, 200, 500];
      const accs = KS.map((k) => (knn(k, 3 + k) + knn(k, 7 + k)) / 2);
      let cur = 0;
      ch3.fn = (p) => {
        p.hline(0.5, { color: 'ink3', label: '瞎猜 50%', align: 'right' });
        p.line(KS.map((k) => k + 1), accs, { color: 's5', width: 2.5 });
        p.point(c.k + 1, cur, { color: 's2' });
      };
      const s3 = pcn.stats([{ key: 'acc', label: '当前准确率', color: 's5' }]);
      function upC() { cur = knn(c.k, 101); s3.set('acc', PL.pct(cur, 0), `${c.k} 个无关维度`, cur < 0.7 ? 'bad' : ''); ch3.render(); }
      upC();

      PL.prose(root, `
        <h2>为什么所有点都一样远</h2>
        <p>[0, 1]<sup>d</sup> 里两个随机点的距离平方，是 d 个独立小量之和，每一维平均贡献 1/6。根据大数定律，d 越大，这个和越接近 d/6，相对波动按 1/√d 缩小：距离的平均值约为 √(d/6)，标准差却一直稳定在 0.24 左右。1000 维时，几乎所有距离都在 12.9 ± 0.24 之内。Beyer 等人（1999）的论文题目就叫《最近邻什么时候有意义？》，结论是：在很多高维情形下，它没有意义。</p>
        <p class="try">把 d 从 2 拉到 1000，看左边的分布从宽宽一片收缩成一根细针。</p>

        <h2>"局部"其实不局部</h2>
        <p>这个例子来自《统计学习基础》第 2 章：10 维数据里，想圈出最近的 10% 的点，邻域的边长要覆盖每条坐标轴的 80%。所谓"附近的点"，其实已经散布在大半个空间里。依赖"局部平均"的方法（kNN、核密度估计、局部回归）在高维里都需要指数级多的数据。</p>

        <h2>那为什么 embedding 搜索还能用？</h2>
        <p>因为真实数据的<b>内在维度</b>远低于它的表面维度：一张 1000×1000 的照片有一百万个像素，但"自然图像"只占据其中一个低维得多的曲面；句子 embedding 有 1024 维，语义变化的方向却少得多。距离集中描述的是"均匀撒满整个空间"的数据。第三张图说明了真正的危险：<b>无关的维度</b>会把有用的维度淹没，所以特征选择、降维和学习一个好的度量才这么重要。</p>
        <div class="takeaway"><b>带走什么：</b>"找最相似的那个"在高维里不是理所当然的。多加一个指标、多收集一个字段，不一定让你的相似度计算更准，反而可能把真正重要的差别冲淡。</div>
      `);
    },
  });

  // ======================================================================
  // 平均飞行员
  // ======================================================================
  PL.register({
    id: 'average', cat: 'dimension', nav: '平均飞行员：没有人是平均的',
    title: '平均飞行员：4063 人里，没有一个是"平均身材"',
    hook: '美国空军按平均身材设计驾驶舱。测了 4063 名飞行员的 10 项尺寸后发现：10 项全都接近平均的，一个人都没有。',
    related: ['highdim', 'distance'],
    render(root) {
      const N = 4063;
      const st = { k: 10, rho: 0.3, band: 0.3, seed: 1952 };
      let Z = null;
      function gen() {
        const r = PL.rng(st.seed + Math.round(st.rho * 100));
        Z = [];
        const a = Math.sqrt(st.rho), b = Math.sqrt(1 - st.rho);
        for (let i = 0; i < N; i++) { const g = r.normal(); Z.push(Float64Array.from({ length: 10 }, () => a * g + b * r.normal())); }
      }
      const DIMS = ['身高', '胸围', '臂长', '躯干长', '腿长', '腰围', '颈围', '大腿围', '手长', '坐高'];
      const pn = PL.panel(root, '给 4063 名飞行员量尺寸', '每个人的每项尺寸都是标准化后的分数。"接近平均"= 落在中间 30% 的区间里（和 1950 年代那项研究的定义一样）。').cols(2);
      pn.ctrl.slider({ label: '考虑几项尺寸', min: 1, max: 10, step: 1, value: st.k, fmt: (v) => v + ' 项', onInput: (v) => { st.k = v; update(); } });
      pn.ctrl.slider({ label: '尺寸之间的相关性', min: 0, max: 0.9, step: 0.05, value: st.rho, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.rho = v; gen(); update(); } });
      pn.ctrl.slider({ label: '"平均"区间宽度', min: 0.1, max: 0.8, step: 0.05, value: st.band, fmt: (v) => '中间 ' + PL.pct(v, 0), onInput: (v) => { st.band = v; update(); } });
      pn.ctrl.button('换一批飞行员', () => { st.seed = PL.seed(); gen(); update(); });
      const cards = PL.stage(pn.box(), { height: 340 }, (c, w, hh) => {
        const t = M.normInv(0.5 + st.band / 2);
        const cols = 4, rows = 3, cw = w / cols, chh = hh / rows;
        c.font = PL.font(11);
        for (let q = 0; q < 12; q++) {
          const z = Z[q * 37], x0 = (q % cols) * cw + 6, y0 = Math.floor(q / cols) * chh + 6, W = cw - 12, H = chh - 12;
          const inside = Array.from({ length: st.k }, (_, j) => Math.abs(z[j]) <= t);
          const all = inside.every(Boolean);
          c.fillStyle = PL.col('paper'); c.strokeStyle = PL.col(all ? 's3' : 'line'); c.lineWidth = all ? 2 : 1;
          c.beginPath(); c.roundRect(x0, y0, W, H, 8); c.fill(); c.stroke();
          const mid = y0 + H / 2 + 6, sc = (H - 34) / 6;
          c.fillStyle = PL.col('s3'); c.globalAlpha = 0.14; c.fillRect(x0 + 6, mid - t * sc, W - 12, 2 * t * sc); c.globalAlpha = 1;
          const bw = (W - 16) / st.k;
          for (let j = 0; j < st.k; j++) {
            const v = M.clamp(z[j], -3, 3);
            c.fillStyle = PL.col(inside[j] ? 's3' : 's7');
            const bx = x0 + 8 + j * bw;
            c.fillRect(bx + 1, Math.min(mid, mid - v * sc), Math.max(2, bw - 2), Math.abs(v * sc) + 1);
          }
          c.fillStyle = PL.col(all ? 's3' : 'ink3'); c.textAlign = 'left';
          c.fillText(`飞行员 #${q * 37 + 1}`, x0 + 8, y0 + 14);
          c.textAlign = 'right'; c.fillText(`${inside.filter(Boolean).length}/${st.k} 项平均`, x0 + W - 8, y0 + 14);
        }
      });
      const rb = pn.box();
      rb.append(h('div', { class: 'fig-title', text: '所有考虑的尺寸都"接近平均"的人数' }));
      const ch = PL.plot(rb, { height: 300, x: [0.5, 10.5], y: [0.5, N * 1.5], ylog: true, xticks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], xlabel: '考虑的尺寸项数', yticks: [1, 10, 100, 1000, 4063], yfmt: (v) => PL.int(v), legend: [{ label: '模拟（当前相关性）', color: 's3', type: 'box' }, { label: '如果各项独立：N × 0.3ᵏ', color: 's2', dash: [5, 4] }], legendPos: 'tr' });
      let counts = [];
      ch.fn = (p) => {
        const ks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
        ks.forEach((k, i) => {
          const v = counts[i];
          const X0 = p.X(k - 0.35), X1 = p.X(k + 0.35), Y0 = p.Y(0.5), Y1 = p.Y(Math.max(v, 0.5));
          p.ctx.fillStyle = PL.col('s3'); p.ctx.globalAlpha = k === st.k ? 0.95 : 0.45;
          p.ctx.fillRect(X0, Y1, X1 - X0, Y0 - Y1); p.ctx.globalAlpha = 1;
          p.text(k, Math.max(v, 0.5), v === 0 ? '0' : PL.int(v), { dy: -5, align: 'center', size: 11, color: k === st.k ? 'ink' : 'ink3' });
        });
        p.line(ks, ks.map((k) => N * Math.pow(st.band, k)), { color: 's2', width: 2, dash: [5, 4] });
      };
      const stats = pn.stats([
        { key: 'one', label: '只看一项（' + DIMS[0] + '）"接近平均"的人', color: 's7' },
        { key: 'all', label: '', color: 's3' },
        { key: 'ind', label: '如果各项独立的期望人数', color: 's2' },
      ]);
      function update() {
        const t = M.normInv(0.5 + st.band / 2);
        counts = [];
        for (let k = 1; k <= 10; k++) { let c = 0; for (const z of Z) { let ok = true; for (let j = 0; j < k; j++) if (Math.abs(z[j]) > t) { ok = false; break; } if (ok) c++; } counts.push(c); }
        stats.el.children[1].querySelector('.stat-l').textContent = `${st.k} 项全都"接近平均"的人`;
        stats.set('one', PL.int(counts[0]), PL.pct(counts[0] / N, 0));
        stats.set('all', PL.int(counts[st.k - 1]), PL.pct(counts[st.k - 1] / N, 2), counts[st.k - 1] < 5 ? 'bad' : '');
        stats.set('ind', PL.fmt(N * Math.pow(st.band, st.k), 1));
        cards.render(); ch.render();
      }
      gen(); update();
      PL.prose(root, `
        <h2>真实的故事</h2>
        <p>1940 年代末，美国空军飞机事故频发，很多不是机械故障，而是飞行员够不着、看不清、操作不顺手。驾驶舱是 1926 年按当时飞行员的<b>平均身材</b>设计的，人们怀疑飞行员变高变壮了。1950 年前后，年轻的研究员 Gilbert Daniels 测量了 4063 名飞行员的 140 项身体尺寸，然后挑出和驾驶舱设计最相关的 10 项，问了一个简单的问题：有多少人在这 10 项上都接近平均（落在中间 30% 的区间里）？</p>
        <p>答案是<b>零</b>。只看其中 3 项，也只有不到 3.5% 的人符合。按"平均人"设计的驾驶舱，实际上不适合任何人。空军后来要求厂商做可调节的座椅、踏板和头盔带，这些今天看起来理所当然的设计就是这么来的（Todd Rose 在《平均的终结》里讲过这个故事）。</p>
        <p class="try">把相关性调到 0.9（尺寸之间高度相关，比如高的人手也长）：符合的人多了，但仍然随维数快速减少。把"平均"区间放宽到中间 50%，再看 10 项。</p>

        <h2>为什么：高维的中心几乎没有体积</h2>
        <p>每一项"接近平均"的概率是 30%，并不罕见。但 k 项同时接近平均，如果各项独立，概率就是 0.3<sup>k</sup>：10 项时是 0.0006%，4063 人里期望只有 0.02 人。尺寸之间有正相关，会让这个数字大一些，但挡不住指数式的下降。这就是${PL.link('highdim', '高维几何')}里"中心几乎没有体积"的现实版本：在足够多的维度上看，每个人都是离群点。</p>
        <div class="takeaway"><b>带走什么：</b>"平均用户"在每一个单项上都很常见，在所有维度上同时出现的却几乎没有。为平均值设计，等于为一个不存在的人设计。可调节、可配置、分人群，才是应对高维差异的办法。</div>
      `);
    },
  });

  // ======================================================================
  // 维度福音：近乎正交
  // ======================================================================
  PL.register({
    id: 'orthogonal', cat: 'dimension', nav: '维度福音：几乎全是正交的',
    title: '维度福音：高维里随便两个方向几乎都垂直',
    hook: '1000 维里随机挑两个方向，夹角几乎总是 88°–92°。于是几百维的空间里，可以塞下成千上万个"几乎互不干扰"的方向。',
    related: ['highdim', 'distance', 'stein'],
    render(root) {
      // ---- A ----
      const a = { d: 100, seed: PL.seed() };
      const pa = PL.panel(root, '① 两个随机方向的夹角', '在 d 维空间里随机抽 3000 对单位向量，看它们的余弦相似度。cos = 0 就是垂直。');
      pa.ctrl.slider({ label: '维数 d', min: 2, max: 2000, step: 1, log: true, value: a.d, fmt: (v) => v, onInput: PL.debounce((v) => { a.d = v; upA(); }, 30), wide: true });
      const chA = PL.plot(pa.box(), { height: 230, x: [-1, 1], y: [0, 1], yticks: [], xlabel: '余弦相似度', legend: [{ label: '模拟', color: 's5', type: 'box' }, { label: '理论 N(0, 1/d)', color: 's2' }] });
      const sa = pa.stats([
        { key: 'sd', label: '余弦的标准差', color: 's5', sub: '理论 1/√d' },
        { key: 'ang', label: '95% 的夹角落在', color: 's4' },
      ]);
      let cosA = [];
      chA.fn = (p) => {
        const sd = 1 / Math.sqrt(a.d);
        p.hist(cosA, { bins: 100, range: [-1, 1], color: 's5', alpha: 0.7, density: true, autoY: 1.12 });
        if (a.d >= 5) p.func((x) => Math.exp(-x * x / (2 * sd * sd)) / (sd * Math.sqrt(2 * Math.PI)), { color: 's2', width: 2, n: 500 });
      };
      function randUnit(d, r) { const v = new Float64Array(d); let s = 0; for (let i = 0; i < d; i++) { v[i] = r.normal(); s += v[i] * v[i]; } s = 1 / Math.sqrt(s); for (let i = 0; i < d; i++) v[i] *= s; return v; }
      function upA() {
        const r = PL.rng(a.seed);
        cosA = [];
        for (let t = 0; t < 3000; t++) { const u = randUnit(a.d, r), v = randUnit(a.d, r); let s = 0; for (let i = 0; i < a.d; i++) s += u[i] * v[i]; cosA.push(s); }
        const sd = M.sd(cosA);
        const q = M.quantile(cosA.map(Math.abs), 0.95);
        sa.set('sd', PL.fmt(sd, 3), `理论 ${PL.fmt(1 / Math.sqrt(a.d), 3)}`);
        sa.set('ang', `${PL.fmt((Math.acos(q) * 180) / Math.PI, 1)}° – ${PL.fmt((Math.acos(-q) * 180) / Math.PI, 1)}°`);
        chA.render();
      }
      upA();

      // ---- B: packing ----
      const b = { d: 100, ratio: 5 };
      const pb = PL.panel(root, '② 往 d 维空间里塞 M 个方向', '严格两两垂直的方向最多只有 d 个。但如果允许"差不多垂直"，能塞进去的方向数会随维数指数增长。');
      pb.ctrl.seg({ label: '维数 d', options: [10, 50, 100, 300].map((v) => ({ value: v, label: String(v) })), value: b.d, onChange: (v) => { b.d = v; upB(); } });
      pb.ctrl.slider({ label: '方向数 M ÷ d', min: 0.5, max: 10, step: 0.5, value: b.ratio, fmt: (v) => '× ' + v, onInput: PL.debounce((v) => { b.ratio = v; upB(); }, 60), wide: true });
      const chB = PL.plot(pb.box(), { height: 230, x: [-1, 1], y: [0, 1], yticks: [], xlabel: '所有方向两两之间的余弦相似度' });
      const sb = pb.stats([
        { key: 'm', label: '塞进去的方向数 M', color: 's7' },
        { key: 'max', label: '最"不垂直"的一对：|cos| 最大值', color: 's2' },
        { key: 'ang', label: '对应的最小夹角', color: 's4' },
      ]);
      let cosB = [];
      chB.fn = (p) => {
        p.hist(cosB, { bins: 100, range: [-1, 1], color: 's4', alpha: 0.7, frac: true, autoY: 1.12 });
        p.vline(cosB.maxAbs, { color: 's2', label: '最大' }); p.vline(-cosB.maxAbs, { color: 's2' });
      };
      function upB() {
        const d = b.d;
        let Mn = Math.round(b.ratio * d);
        const cap = Math.floor(Math.sqrt((2 * 1.5e8) / d));
        const capped = Mn > cap;
        Mn = Math.min(Mn, cap);
        const r = PL.rng(17 + d);
        const V = Array.from({ length: Mn }, () => randUnit(d, r));
        cosB = [];
        let mx = 0;
        const stride = Math.max(1, Math.floor((Mn * (Mn - 1)) / 2 / 150000));
        let cnt = 0;
        for (let i = 0; i < Mn; i++) for (let j = i + 1; j < Mn; j++) {
          const u = V[i], v = V[j]; let s = 0; for (let k = 0; k < d; k++) s += u[k] * v[k];
          const as = Math.abs(s); if (as > mx) mx = as;
          if (cnt++ % stride === 0) cosB.push(s);
        }
        cosB.maxAbs = mx;
        sb.set('m', PL.int(Mn), (capped ? `（为了不卡，限制在 ${PL.int(cap)}）` : '') + `是维数的 ${PL.fmt(Mn / d, 1)} 倍`);
        sb.set('max', PL.fmt(mx, 3));
        sb.set('ang', PL.fmt((Math.acos(mx) * 180) / Math.PI, 1) + '°', '90° 是完全垂直', mx < 0.35 ? 'good' : '');
        chB.render();
      }
      upB();

      // ---- C: JL ----
      const c = { k: 50 };
      const pc = PL.panel(root, '③ 随机投影：把 1000 维压到 k 维，距离几乎不变', '60 个点在 1000 维空间里。用一个<b>完全随机</b>的矩阵把它们投影到 k 维，看 1770 对点之间的距离变了多少（Johnson–Lindenstrauss 引理）。');
      pc.ctrl.slider({ label: '投影到 k 维', min: 2, max: 500, step: 1, log: true, value: c.k, fmt: (v) => v, onInput: PL.debounce((v) => { c.k = v; upC(); }, 30), wide: true });
      const chC = PL.plot(pc.box(), { height: 220, x: [0, 2], y: [0, 1], yticks: [], xlabel: '投影后的距离 ÷ 原来的距离' });
      const scs = pc.stats([{ key: 'q', label: '95% 的距离误差在', color: 's3', sub: '理论约 ±1.96/√(2k)' }]);
      const D = 1000, NP = 60;
      const P0 = (() => { const r = PL.rng(5); return Array.from({ length: NP }, () => Float64Array.from({ length: D }, () => r.normal())); })();
      let ratios = [];
      chC.fn = (p) => {
        p.hist(ratios, { bins: 100, range: [0, 2], color: 's3', alpha: 0.7, frac: true, autoY: 1.12 });
        p.vline(1, { color: 'ink3' });
      };
      function upC() {
        const k = c.k, r = PL.rng(77);
        const R = Array.from({ length: k }, () => Float64Array.from({ length: D }, () => r.normal() / Math.sqrt(k)));
        const Q = P0.map((x) => Float64Array.from(R, (row) => { let s = 0; for (let i = 0; i < D; i++) s += row[i] * x[i]; return s; }));
        ratios = [];
        for (let i = 0; i < NP; i++) for (let j = i + 1; j < NP; j++) {
          let s0 = 0, s1 = 0;
          for (let t = 0; t < D; t++) s0 += (P0[i][t] - P0[j][t]) ** 2;
          for (let t = 0; t < k; t++) s1 += (Q[i][t] - Q[j][t]) ** 2;
          ratios.push(Math.sqrt(s1 / s0));
        }
        const q = M.quantile(ratios.map((v) => Math.abs(v - 1)), 0.95);
        scs.set('q', '±' + PL.pct(q, 1), `理论约 ±${PL.pct(1.96 / Math.sqrt(2 * k), 1)}`);
        chC.render();
      }
      upC();

      PL.prose(root, `
        <h2>为什么几乎都垂直</h2>
        <p>两个随机单位向量的点积，是 d 个独立的小随机项之和，每一项的量级是 1/d。和的标准差是 1/√d：100 维时约 0.1，1000 维时约 0.03。所以在 1000 维里，随便两个方向的夹角，95% 的情况下都在 88° 到 92° 之间。这是${PL.link('highdim', '高维几何')}的另一面：维度灾难让"找邻居"变难，同样的数学却让"互不干扰"变得极其容易。</p>
        <p>更进一步，如果允许每对方向的 |cos| 不超过某个小数 ε，能塞下的方向数大约是 e<sup>c·ε²·d</sup>，随维数<b>指数</b>增长。第二张图里，300 维空间塞下 1000 个方向，最"不垂直"的一对夹角仍有 70° 以上。</p>

        <h2>它在哪里被用到</h2>
        <ul>
          <li><b>词向量与 embedding</b>：几百维的向量就能表示几十万个词、概念，各自占一个"差不多独立"的方向，互相干扰很小。</li>
          <li><b>大模型里的"叠加"</b>：Anthropic 的研究（Elhage 等，2022，"Toy Models of Superposition"）发现，神经网络可以用 n 个神经元表示远多于 n 个特征，方法正是把特征放在几乎正交的方向上，只要这些特征不常同时出现，彼此的干扰就可以容忍。</li>
          <li><b>随机投影</b>：Johnson–Lindenstrauss 引理说，n 个点可以被随机投影到约 log(n)/ε² 维，而所有两两距离只变化 ±ε。第三张图就是这个效果。它被用于加速最近邻搜索、局部敏感哈希、压缩感知和大规模数据的草图算法。</li>
          <li><b>${PL.link('stein', '斯坦因悖论')}</b>：噪声向量几乎总是和真值垂直，所以观测向量系统性地比真值"长"，收缩才会有用。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>高维不只是诅咒。"随机的东西几乎互不干扰"让我们可以用随机投影、随机特征、随机编码去解决很多看起来需要精心设计的问题。</div>
      `);
    },
  });

  // ======================================================================
  // 双下降
  // ======================================================================
  PL.register({
    id: 'doubledescent', cat: 'dimension', nav: '双下降：参数越多反而越准',
    title: '双下降：参数多到能背下所有数据之后，再加参数反而更准',
    hook: '教科书说参数太多会过拟合，误差曲线是 U 形的。可是参数超过数据点数以后，继续加参数，测试误差会第二次下降，而且降得比第一次还低。',
    related: ['highdim', 'orthogonal', 'stein'],
    render(root) {
      const n = 20, NOISE = 0.3;
      const f = (x) => Math.sin(2 * Math.PI * x) + 0.4 * Math.cos(5 * x);
      const OPT = { frac: 0.5, w0: 6, ws: 400, a: 0.6 };
      function chol(A, m) {
        const L = new Float64Array(m * m);
        for (let i = 0; i < m; i++) for (let j = 0; j <= i; j++) {
          let s = A[i * m + j];
          for (let k = 0; k < j; k++) s -= L[i * m + k] * L[j * m + k];
          if (i === j) L[i * m + i] = Math.sqrt(Math.max(s, 1e-300)); else L[i * m + j] = s / L[j * m + j];
        }
        return L;
      }
      function cholSolve(L, b, m) {
        const y = new Float64Array(m);
        for (let i = 0; i < m; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i * m + k] * y[k]; y[i] = s / L[i * m + i]; }
        const x = new Float64Array(m);
        for (let i = m - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < m; k++) s -= L[k * m + i] * x[k]; x[i] = s / L[i * m + i]; }
        return x;
      }
      function data(seed) { const r = PL.rng(seed); const xs = [], ys = []; for (let i = 0; i < n; i++) { const x = r(); xs.push(x); ys.push(f(x) + NOISE * r.normal()); } return { xs, ys }; }
      function fit(p, dseed, fseed, lamRel) {
        const { xs, ys } = data(dseed);
        const r = PL.rng(fseed);
        const W = new Float64Array(p), B = new Float64Array(p), A = new Float64Array(p);
        for (let j = 0; j < p; j++) { const sp = r() < OPT.frac; W[j] = r.normal() * (sp ? OPT.ws : OPT.w0); B[j] = r() * 2 * Math.PI; A[j] = (sp ? OPT.a : 1) * Math.SQRT2 / Math.sqrt(p); }
        const phi = (x, j) => A[j] * Math.cos(W[j] * x + B[j]);
        const F = xs.map((x) => Float64Array.from({ length: p }, (_, j) => phi(x, j)));
        let tr = 0; for (const row of F) for (const v of row) tr += v * v;
        const lam = (lamRel + 1e-10) * tr / n;
        let w;
        if (p <= n) {
          const G = new Float64Array(p * p);
          for (let a = 0; a < p; a++) for (let b = a; b < p; b++) { let s = 0; for (let i = 0; i < n; i++) s += F[i][a] * F[i][b]; G[a * p + b] = G[b * p + a] = s; }
          for (let a = 0; a < p; a++) G[a * p + a] += lam;
          const bb = new Float64Array(p);
          for (let a = 0; a < p; a++) { let s = 0; for (let i = 0; i < n; i++) s += F[i][a] * ys[i]; bb[a] = s; }
          w = cholSolve(chol(G, p), bb, p);
        } else {
          const K = new Float64Array(n * n);
          for (let i = 0; i < n; i++) for (let k = i; k < n; k++) { let s = 0; const fi = F[i], fk = F[k]; for (let a = 0; a < p; a++) s += fi[a] * fk[a]; K[i * n + k] = K[k * n + i] = s; }
          for (let i = 0; i < n; i++) K[i * n + i] += lam;
          const al = cholSolve(chol(K, n), Float64Array.from(ys), n);
          w = new Float64Array(p);
          for (let a = 0; a < p; a++) { let s = 0; for (let i = 0; i < n; i++) s += F[i][a] * al[i]; w[a] = s; }
        }
        const pred = (x) => { let s = 0; for (let j = 0; j < p; j++) s += w[j] * phi(x, j); return s; };
        let te = 0; const T = 400;
        for (let t = 0; t < T; t++) { const x = (t + 0.5) / T; te += (pred(x) - f(x)) ** 2; }
        let trn = 0; for (let i = 0; i < n; i++) trn += (pred(xs[i]) - ys[i]) ** 2;
        return { test: te / T, train: trn / n, pred, xs, ys };
      }
      const PS = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 27, 30, 35, 40, 50, 60, 80, 100, 140, 200, 300, 450, 700, 1000];
      const SEEDS = 11;
      const LAMS = [{ value: 0, label: '不加正则（最小范数插值）' }, { value: 1e-3, label: '轻微正则 λ' }, { value: 3e-2, label: '较强正则 λ' }];
      const st = { p: 20, lam: 0 };
      const cache = {};
      const pn = PL.panel(root, '用 p 个随机特征去拟合 20 个带噪声的点', '虚线是真实函数，圆点是 20 个训练点（真实值 + 噪声）。模型是 p 个随机正弦波的线性组合；p ≤ 20 时用最小二乘，p &gt; 20 时有无穷多个解能穿过所有点，取其中系数最小的那个。');
      pn.ctrl.slider({ label: '参数个数 p', min: 2, max: 1000, step: 1, log: true, value: st.p, fmt: (v) => v + (v === n ? '（= 数据点数）' : ''), onInput: PL.debounce((v) => { st.p = v; upFit(); }, 20), wide: true });
      pn.ctrl.seg({ options: LAMS, value: st.lam, onChange: (v) => { st.lam = v; upFit(); buildCurve(); } });
      const fitPlot = PL.plot(pn.box(), { height: 280, x: [0, 1], y: [-2.6, 2.6], xlabel: 'x', legend: [{ label: '真实函数', color: 'ink3', dash: [5, 4] }, { label: '模型拟合', color: 's2' }, { label: '训练数据', color: 'ink', type: 'dot' }], legendPos: 'br' });
      const cb = pn.box();
      cb.append(h('div', { class: 'fig-title', text: '测试误差 vs. 参数个数（11 组随机数据的中位数）' }));
      const curvePlot = PL.plot(cb, { height: 260, x: [2, 1000], y: [0.01, 10], xlog: true, ylog: true, xlabel: '参数个数 p（对数刻度）', ylabel: '测试误差' });
      const stats = pn.stats([
        { key: 'train', label: '训练误差', color: 's7' },
        { key: 'test', label: '测试误差（这一组数据）', color: 's2' },
        { key: 'zone', label: '所处阶段', color: 's4' },
      ]);
      let F = null;
      fitPlot.fn = (p) => {
        p.func(f, { color: 'ink3', dash: [5, 4], width: 2 });
        const xs = M.linspace(0, 1, 1600);
        p.line(xs, xs.map((x) => M.clamp(F.pred(x), -4, 4)), { color: 's2', width: 1.8 });
        p.dots(F.xs, F.ys, { color: 'ink', r: 4 });
      };
      curvePlot.fn = (p) => {
        p.vline(n, { color: 's4', label: 'p = n = 20（插值阈值）' });
        const c = cache[st.lam];
        if (c && c.med.length) {
          p.line(PS.slice(0, c.med.length), c.med, { color: 's1', width: 2.5 });
          p.dots(PS.slice(0, c.med.length), c.med, { color: 's1', r: 2.5 });
          if (c.med.length < PS.length) p.textPx(p.R - 6, p.T + 14, `计算中…${c.med.length}/${PS.length}`, { align: 'right', color: 'ink3' });
        }
        p.vline(st.p, { color: 'ink3' });
      };
      function upFit() {
        F = fit(st.p, 1, 5000 + st.p, st.lam);
        stats.set('train', PL.fmt(F.train, 4), st.p >= n && st.lam === 0 ? '穿过每一个训练点' : '');
        stats.set('test', PL.fmt(F.test, 3), null, F.test > 1 ? 'bad' : F.test < 0.1 ? 'good' : '');
        stats.set('zone', st.p <= 4 ? '欠拟合' : st.p <= 16 ? '经典的最佳区' : st.p <= 35 ? '插值阈值附近：灾难' : st.p < 150 ? '第二次下降' : '过参数化：又准了');
        fitPlot.render(); curvePlot.render();
      }
      let timer = 0;
      PL.onCleanup(() => clearTimeout(timer));
      function buildCurve() {
        clearTimeout(timer);
        const lam = st.lam;
        if (cache[lam] && cache[lam].med.length === PS.length) { curvePlot.render(); return; }
        cache[lam] = cache[lam] || { med: [] };
        const step = () => {
          const c = cache[lam], t0 = performance.now();
          while (c.med.length < PS.length && performance.now() - t0 < 25) {
            const p = PS[c.med.length];
            const errs = [];
            for (let s = 0; s < SEEDS; s++) errs.push(fit(p, 100 + s, 9000 + s * 7919 + p, lam).test);
            errs.sort((x, y) => x - y);
            c.med.push(Math.max(1e-3, errs[(SEEDS - 1) / 2]));
          }
          if (st.lam === lam) curvePlot.render();
          if (c.med.length < PS.length) timer = setTimeout(step, 0);
        };
        step();
      }
      upFit(); buildCurve();
      PL.prose(root, `
        <h2>教科书上的 U 形曲线</h2>
        <p>经典统计学说：模型太简单会欠拟合，太复杂会过拟合，测试误差随复杂度先降后升，是一条 U 形曲线，最好的模型在中间。在上图的左半边，这条规律完全成立：p 从 2 增加到 15 左右，误差下降；接近 20 时误差爆炸。</p>
        <p>爆炸点 p = n 叫<b>插值阈值</b>：参数刚好够穿过所有训练点，而且解是唯一的。为了穿过每一个带噪声的点，模型只能剧烈扭动，系数变得极大。</p>

        <h2>阈值之后发生了什么</h2>
        <p>参数超过数据点数之后，能穿过所有点的解有无穷多个。我们取其中<b>系数最小</b>（范数最小）的那个，这也正是梯度下降从零开始训练时会自然收敛到的解。参数越多，可选的解越多，"最省力地穿过所有点"的那个解就越平滑。于是测试误差第二次下降，而且在这个例子里降得比经典最佳点还低。Belkin 等人（2019）把它命名为<b>双下降</b>；Nakkiran 等人（2019）在深度网络里也观察到了同样的曲线，甚至随训练轮数也会出现。</p>
        <p class="try">把 p 慢慢从 10 拉到 1000，看拟合曲线从平滑 → 疯狂扭动 → 重新平滑。在 p = 1000 时仔细看训练点附近：曲线确实穿过了每一个点，但只是在点附近冒出一根很窄的尖刺。然后切到"较强正则"，看峰值消失。</p>

        <h2>噪声藏到哪里去了</h2>
        <p>为了让这个效果在一维里看得见，这里的随机特征有两种：一半是低频的"平滑"正弦波，一半是极高频的"尖刺"正弦波。参数足够多时，最小范数解会让平滑的部分去拟合真实规律，让尖刺部分去吸收每个点上的噪声，而尖刺很窄，几乎不影响其他地方的预测。这叫<b>良性过拟合</b>（benign overfitting）。在真正的高维问题（图像、文本）里，模型不需要我们刻意准备尖刺特征：高维空间里本来就有大量${PL.link('orthogonal', '几乎互不干扰的方向')}可以用来存放噪声。</p>
        <p class="note">不是所有过参数化都会良性：一维里如果只用平滑特征，第二次下降基本不会出现，插值会一直很糟。双下降依赖于"有足够多的方向可以安放噪声"，这本身就是一种高维现象。</p>
        <div class="takeaway"><b>带走什么：</b>"参数越多越容易过拟合"只在插值阈值附近成立。现代大模型参数比数据点多得多，却依然泛化得很好，原因之一就在这里：真正决定泛化的不只是参数个数，还有训练方法偏好的是哪一个解。</div>
      `);
    },
  });

  // ======================================================================
  // 佩托悖论
  // ======================================================================
  PL.register({
    id: 'peto', cat: 'dimension', nav: '佩托悖论：大象为什么不更容易得癌',
    title: '佩托悖论：大象的细胞是人的上百倍，癌症却不比人多',
    hook: '癌症始于某个细胞分裂时出错。细胞越多、活得越久，出错的机会越多，可大象和鲸的癌症率并不比人高。',
    related: ['highdim', 'smallsample'],
    render(root) {
      const K = 5, LAMH = -Math.log(1 - 0.4), R = 30;
      const SP = [
        { name: '小鼠', m: 0.025, L: 2.5 },
        { name: '裸鼹鼠', m: 0.035, L: 30 },
        { name: '狗', m: 30, L: 12 },
        { name: '人', m: 70, L: 80 },
        { name: '大象', m: 4800, L: 65 },
        { name: '弓头鲸', m: 75000, L: 200 },
      ];
      const hazard = (m, L, extra) => LAMH * (m / 70) * Math.pow(L / 80, K) * Math.pow(1 / R, extra);
      const risk = (m, L, extra = 0) => 1 - Math.exp(-hazard(m, L, extra));
      const need = (s) => Math.ceil(Math.log(hazard(s.m, s.L, 0) / LAMH) / Math.log(R) - 1e-9);
      const st = { sp: 4, extra: 0, tuned: false };
      const pn = PL.panel(root, '一个玩具模型：按人类的"防线"去算其他动物', '假设每个细胞每次分裂出错的概率一样，癌症风险 ∝ 细胞数（≈ 体重）× 寿命<sup>5</sup>（多阶段致癌模型），并按人类一生约 40% 的患癌风险校准。"额外防线"：每多一道（比如多一份抑癌基因），单个细胞癌变的概率降为 1/30。');
      pn.ctrl.seg({ label: '物种', options: SP.map((s, i) => ({ value: i, label: s.name })), value: st.sp, onChange: (v) => { st.sp = v; sl.set(st.tuned ? need(SP[v]) : 0); st.extra = sl.get(); update(); } });
      const sl = pn.ctrl.slider({ label: '额外防线', min: -10, max: 6, step: 1, value: st.extra, fmt: (v) => (v > 0 ? '+' : '') + v + ' 道', onInput: (v) => { st.extra = v; update(); } });
      pn.ctrl.toggle({ label: '给每个物种配上"刚好够用"的防线', value: st.tuned, onChange: (v) => { st.tuned = v; sl.set(v ? need(SP[st.sp]) : 0); st.extra = sl.get(); update(); } });
      const ch = PL.plot(pn.box(), { height: 320, x: [0.01, 3e5], y: [1e-10, 1], xlog: true, ylog: true, xlabel: '体重（千克，对数刻度）', ylabel: '一生的患癌风险', yticks: [1e-10, 1e-8, 1e-6, 1e-4, 0.01, 1], yfmt: (v) => (v >= 0.01 ? Math.round(v * 100) + '%' : '10^' + Math.round(Math.log10(v))), legend: [{ label: '寿命固定 80 年、防线同人类', color: 's7', dash: [5, 4] }, { label: '各物种：防线同人类', color: 's2', type: 'dot' }, { label: '各物种：配上够用的防线', color: 's3', type: 'dot' }], legendPos: 'br' });
      ch.fn = (p) => {
        p.func((m) => Math.max(1e-10, risk(m, 80)), { color: 's7', dash: [5, 4], width: 2 });
        p.hline(0.4, { color: 'ink3', label: '人类 ≈ 40%', align: 'left' });
        SP.forEach((s, i) => {
          const r0 = Math.max(1e-10, risk(s.m, s.L));
          p.point(s.m, r0, { color: 's2', r: i === st.sp ? 7 : 5, label: i === st.sp ? '' : s.name, labelStyle: { dx: 8, dy: 4, size: 11, color: 'ink2' } });
          if (st.tuned) p.point(s.m, Math.max(1e-10, risk(s.m, s.L, need(s))), { color: 's3', r: 5 });
        });
        const s = SP[st.sp];
        p.point(s.m, Math.max(1e-10, risk(s.m, s.L, st.extra)), { color: 's4', r: 7, label: s.name + '（当前）', labelStyle: { dx: 10, dy: -8, color: 's4' } });
      };
      const stats = pn.stats([
        { key: 'naive', label: '按人类的防线计算', color: 's2' },
        { key: 'cur', label: '加上当前的额外防线', color: 's4' },
        { key: 'need', label: '风险不超过人类，需要的额外防线', color: 's3' },
      ]);
      function update() {
        const s = SP[st.sp];
        const r0 = risk(s.m, s.L);
        stats.set('naive', r0 > 0.0001 ? PL.pct(r0, r0 > 0.99 ? 2 : 1) : r0.toExponential(1), `${s.name}：${s.m < 1 ? s.m * 1000 + ' 克' : PL.int(s.m) + ' 千克'}，寿命约 ${s.L} 年`, r0 > 0.6 ? 'bad' : '');
        const r1 = risk(s.m, s.L, st.extra);
        stats.set('cur', r1 > 0.0001 ? PL.pct(r1, 1) : r1.toExponential(1));
        const nd = need(s);
        stats.set('need', (nd > 0 ? '+' : '') + nd + ' 道', nd < 0 ? '可以比人类少几道：小而短命的动物用不着那么多防线' : nd === 0 ? '和人类一样' : '');
        ch.render();
      }
      update();
      PL.prose(root, `
        <h2>悖论</h2>
        <p>1970 年代，流行病学家 Richard Peto 注意到一个矛盾：如果每个细胞每次分裂都有一样小的概率走向癌变，那么细胞数是人上百倍、寿命和人相当的大象，几乎注定会得癌；寿命两百年的弓头鲸更不用说。按上面的玩具模型算，它们的患癌风险都接近 100%。可现实中，大象的癌症死亡率远低于人类，鲸也没有被癌症消灭。反过来，小鼠按人类的标准算几乎不可能得癌，实验室小鼠却经常长肿瘤。</p>
        <p>2022 年发表在 <i>Nature</i> 上的一项研究，比较了动物园里 191 种哺乳动物的癌症死亡率，发现它和体重、寿命基本无关，佩托悖论在大范围物种上都成立（Vincze 等）。</p>

        <h2>解答：每个物种都把防线调到了"刚好够用"</h2>
        <ul>
          <li><b>大象</b>有约 20 份 TP53 抑癌基因的拷贝（人只有 1 份），细胞受到 DNA 损伤时更容易直接自杀，而不是带着错误继续分裂（Abegglen 等 2015；Sulak 等 2016）。</li>
          <li><b>裸鼹鼠</b>体型和小鼠差不多，却能活 30 年，几乎不得癌。它的组织里有一种超高分子量的透明质酸，细胞长得太挤时会更早地停止分裂（Tian 等 2013）。</li>
          <li><b>小鼠</b>正好相反：让小鼠细胞癌变，需要的基因突变比人类细胞少。体型小、寿命短的动物，进化上用不着那么多防线，维持防线本身也有代价。</li>
        </ul>
        <p class="try">打开"配上刚好够用的防线"：所有物种都被拉回到差不多的风险水平，大象只需要多一道防线，弓头鲸需要多几道，小鼠反而可以少很多道。每多一道防线，风险就下降一个数量级以上，这是指数的力量。</p>
        <p class="note">这里的模型是一个玩具，参数只是为了说明量级，不代表真实的生物学数值。</p>
        <div class="takeaway"><b>带走什么：</b>把一个物种身上测到的"单位风险"线性外推到大得多的尺度上，结论往往荒谬。系统在不同尺度下会演化出不同的保护机制。工程上也一样：同样的单点故障率，放到规模大几个数量级的系统里，必须多几道冗余。</div>
      `);
    },
  });
})();
