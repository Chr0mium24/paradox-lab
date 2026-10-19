/* 类别五（续）：量法变了，东西没变 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 林德利悖论
  // ======================================================================
  PL.register({
    id: 'lindley', cat: 'measure', nav: '林德利悖论：显著却支持原假设',
    title: '林德利悖论：p = 0.04，却是支持"没有效应"的证据',
    hook: '同一个 p 值，在样本量小时是反对原假设的证据；样本量足够大时，它会变成支持原假设的强证据。频率学派和贝叶斯学派在这里给出相反的结论。',
    related: ['falsefindings', 'smallsample', 'bertrand'],
    render(root) {
      const st = { n: 10000, p: 0.04, tau: 0.5 };
      const zOf = (p) => M.normInv(1 - p / 2);
      const bf01 = (n, z, tau) => Math.sqrt(1 + n * tau * tau) * Math.exp(-(z * z / 2) * (n * tau * tau) / (1 + n * tau * tau));
      const post0 = (n, z, tau) => { const b = bf01(n, z, tau); return b / (1 + b); };
      const pn = PL.panel(root, '固定 p 值，改变样本量', '检验"效应 = 0"（原假设）对"效应 ≠ 0"。贝叶斯一方给两个假设各 50% 的先验，并假设效应如果存在，其大小大约在 ±τ 个标准差之内（正态先验）。下面计算：看到这个 p 值以后，原假设为真的后验概率。');
      const sN = pn.ctrl.slider({ label: '样本量 n', min: 10, max: 1e9, step: 1, log: true, value: st.n, fmt: (v) => PL.int(v), onInput: (v) => { st.n = v; update(); }, wide: true });
      const sP = pn.ctrl.slider({ label: 'p 值', min: 0.0001, max: 0.1, step: 0.0001, log: true, value: st.p, fmt: (v) => (v < 0.001 ? v.toExponential(1) : PL.fmt(v, 3)), onInput: (v) => { st.p = v; update(); } });
      pn.ctrl.slider({ label: '先验效应尺度 τ', min: 0.05, max: 2, step: 0.05, value: st.tau, fmt: (v) => PL.fmt(v, 2) + ' σ', onInput: (v) => { st.tau = v; update(); } });
      pn.ctrl.button('PEAR 超感实验', () => { st.n = 104490000; st.p = 0.0003; sN.set(st.n); sP.set(st.p); update(); });
      const ch = PL.plot(pn.box(), { height: 300, x: [10, 1e9], y: [0, 1], xlog: true, xlabel: '样本量 n（p 值保持不变）', ylabel: '原假设为真的后验概率', yfmt: (v) => Math.round(v * 100) + '%', legend: [{ label: 'p = 0.05', color: 's7' }, { label: 'p = 0.001', color: 's7', dash: [5, 4] }, { label: '当前 p 值', color: 's2' }], legendPos: 'tl' });
      ch.fn = (p) => {
        p.hline(0.5, { color: 'ink3', label: '先验 50%', align: 'right' });
        p.func((n) => post0(n, zOf(0.05), st.tau), { color: 's7', width: 1.5 });
        p.func((n) => post0(n, zOf(0.001), st.tau), { color: 's7', width: 1.5, dash: [5, 4] });
        p.func((n) => post0(n, zOf(st.p), st.tau), { color: 's2', width: 3 });
        p.point(st.n, post0(st.n, zOf(st.p), st.tau), { color: 's2' });
      };
      const stats = pn.stats([
        { key: 'z', label: 'z 统计量', color: 's7' },
        { key: 'eff', label: '估计出的效应大小', color: 's6' },
        { key: 'bf', label: '贝叶斯因子（支持原假设 : 反对）', color: 's4' },
        { key: 'post', label: '原假设为真的后验概率', color: 's2' },
      ]);
      function update() {
        const z = zOf(st.p), b = bf01(st.n, z, st.tau), po = b / (1 + b);
        stats.set('z', PL.fmt(z, 2), `频率学派：p = ${st.p < 0.001 ? st.p.toExponential(1) : PL.fmt(st.p, 3)}，拒绝原假设`);
        stats.set('eff', PL.fmt(z / Math.sqrt(st.n), 4) + ' σ', '样本越大，同一个 p 值对应的效应越微小');
        stats.set('bf', b >= 1 ? PL.fmt(b, b > 100 ? 0 : 2) + ' : 1' : '1 : ' + PL.fmt(1 / b, 1 / b > 100 ? 0 : 2));
        stats.set('post', PL.pct(po, 1), po > 0.5 ? '贝叶斯：数据反而支持原假设' : '', po > 0.5 ? 'bad' : 'good');
        ch.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>p 值固定时，z 统计量也固定（p = 0.04 对应 z ≈ 2.05）。但 z = 效应估计 ÷ 标准误，而标准误 ∝ 1/√n。所以样本量越大，同一个 z 对应的效应估计就越小：n = 100 万时，效应只有 0.002 个标准差。</p>
        <p>贝叶斯的比较是：这组数据在"效应恰好为 0"下有多可能，在"效应可能是 ±τ 范围内的某个值"下又有多可能。观测到的效应极其微小，几乎正好落在 0 附近，而"有效应"的假设把概率摊在一大片范围上，在 0 附近分到的很少。样本越大，这个对比越悬殊，于是<b>同样的 p = 0.04，最终会变成支持原假设的强证据</b>。这就是 Lindley（1957）指出的悖论。</p>
        <p class="try">保持 p = 0.04，把 n 从 100 拖到 10 亿：后验概率从"更可能有效应"一路滑到"几乎肯定没有效应"。再把 τ 调大调小，看先验怎样影响结论。</p>

        <h2>真实的例子：PEAR 超感实验</h2>
        <p>普林斯顿大学的 PEAR 实验室让受试者用"意念"影响随机数发生器，累计约 1.04 亿次试验，结果有 52,263,471 次"成功"，比期望的一半多出约 1.8 万次，p ≈ 0.0003，频率学派的检验高度显著。Jefferys（1990）用贝叶斯方法重新分析，在"效应大小在合理范围内均匀"的先验下，贝叶斯因子约为 12 : 1，<b>支持</b>"没有任何超感能力"。差别只有 0.018%，大样本让它显著，但它比任何合理的"有效应"假设都更接近零。（点上面的按钮可以看到它在曲线上的位置。）</p>

        <h2>该相信哪一边</h2>
        <p>两边都没算错，它们回答的是不同的问题。p 值回答"如果真的没有效应，看到这么极端的数据有多罕见"；贝叶斯因子回答"这组数据更支持哪一个具体的假设"。在超大样本下，几乎任何微小的偏差（仪器、抽样上的极轻微不对称）都会变得显著，此时<b>显著不等于重要</b>。实际工作中的建议是：大样本时同时报告效应大小和置信区间，而不是只看 p 值；先验的选择需要说清楚，因为它确实影响结论（见${PL.link('bertrand', '贝特朗悖论')}：连"均匀"都需要定义）。</p>
        <div class="takeaway"><b>带走什么：</b>p 值的意义依赖样本量。小样本里 p = 0.04 可能是有价值的线索；几亿个样本里 p = 0.04 几乎只说明"差别极小"。和${PL.link('smallsample', '小样本霸占两头')}正好是一对：样本量既会制造假的极端值，也会改变同一个统计量的含义。</div>
      `);
    },
  });

  // ======================================================================
  // 洛德悖论
  // ======================================================================
  PL.register({
    id: 'lord', cat: 'measure', nav: '洛德悖论：两种分析两个答案',
    title: '洛德悖论：同一份数据，两种都合理的分析，得出相反的结论',
    hook: '两组人的平均体重一学年都没变。一位统计学家说"两组没有差别"；另一位控制了初始体重，说"B 组多长了 3 公斤"。两人都没算错。',
    related: ['simpson', 'regression', 'birthweight'],
    render(root) {
      const st = { rho: 0.7, gap: 12, eff: 0, story: 'sex', seed: 1967 };
      const STORY = {
        sex: { A: '女生', B: '男生', note: 'Lord 的原版：同一个食堂，问饮食对男生和女生的影响是否不同。性别决定了初始体重。' },
        hall: { A: '食堂 1', B: '食堂 2', note: 'Wainer 与 Brown 的版本：学生根据自己的体重选择食堂，较重的更多去了食堂 2。初始体重影响了"分到哪组"。' },
      };
      const pn = PL.panel(root, '九月和六月各称一次体重', '每个点是一个学生。两组的初始平均体重不同；每个人六月的体重 = 组均值 + ρ ×（九月体重 − 组均值）+ 随机波动。也就是说，每组的平均体重整学年保持不变。').cols(2);
      pn.ctrl.seg({ label: '故事', options: [{ value: 'sex', label: '男生 vs 女生' }, { value: 'hall', label: '两个食堂' }], value: st.story, onChange: (v) => { st.story = v; update(); } });
      pn.ctrl.slider({ label: '两次称重的相关 ρ', min: 0.2, max: 0.98, step: 0.02, value: st.rho, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.rho = v; update(); } });
      pn.ctrl.slider({ label: '两组初始体重差', min: 0, max: 20, step: 1, value: st.gap, fmt: (v) => v + ' kg', onInput: (v) => { st.gap = v; update(); } });
      pn.ctrl.slider({ label: 'B 组真实多增重', min: -3, max: 3, step: 0.5, value: st.eff, fmt: (v) => PL.signed(v, 1, ' kg'), onInput: (v) => { st.eff = v; update(); } });
      let D;
      const sc = PL.plot(pn.box(), { height: 340, x: [35, 105], y: [35, 105], xlabel: '九月体重（kg）', ylabel: '六月体重（kg）' });
      sc.fn = (p) => {
        p.func((x) => x, { color: 'ink3', dash: [4, 4], width: 1.5 });
        p.text(100, 100, '没变化', { dx: -4, dy: -6, align: 'right', color: 'ink3', size: 11 });
        for (const [g, col] of [['A', 's1'], ['B', 's2']]) {
          const G = D[g];
          p.dots(G.x, G.y, { color: col, r: 2.4, alpha: 0.55 });
          const lo = Math.min(...G.x), hi = Math.max(...G.x);
          p.line([lo, hi], [D.a[g] + D.b * lo, D.a[g] + D.b * hi], { color: col, width: 2.5 });
          p.point(M.mean(G.x), M.mean(G.y), { color: col, r: 6 });
        }
        const x0 = (M.mean(D.A.x) + M.mean(D.B.x)) / 2;
        p.arrow(x0, D.a.A + D.b * x0, x0, D.a.B + D.b * x0, { color: 's4', width: 2, head: 8 });
        p.text(x0, (D.a.A + D.a.B) / 2 + D.b * x0, '统计学家 2 看到的差', { dx: 8, color: 's4', size: 12 });
      };
      const right = pn.box();
      const verdict = h('div', { class: 'panel-html' });
      right.append(h('div', { class: 'fig-title', text: '两位统计学家' }));
      const tbl = PL.table(right, ['', '统计学家 1：比较平均变化', '统计学家 2：控制初始体重']);
      right.append(verdict);
      const stats = pn.stats([
        { key: 's1', label: '统计学家 1：B 组比 A 组多增重', color: 's1' },
        { key: 's2', label: '统计学家 2：B 组比 A 组多增重', color: 's2' },
      ]);
      function update() {
        const r = PL.rng(st.seed), S = 7, n = 220;
        const mk = (mu, eff) => {
          const x = [], y = [];
          for (let i = 0; i < n; i++) { const a = mu + S * r.normal(); x.push(a); y.push(mu + eff + st.rho * (a - mu) + Math.sqrt(1 - st.rho * st.rho) * S * r.normal()); }
          return { x, y };
        };
        const muA = 70 - st.gap / 2, muB = 70 + st.gap / 2;
        D = { A: mk(muA, 0), B: mk(muB, st.eff) };
        let sxy = 0, sxx = 0;
        for (const g of ['A', 'B']) { const G = D[g], mx = M.mean(G.x), my = M.mean(G.y); G.x.forEach((v, i) => { sxy += (v - mx) * (G.y[i] - my); sxx += (v - mx) ** 2; }); }
        D.b = sxy / sxx;
        D.a = { A: M.mean(D.A.y) - D.b * M.mean(D.A.x), B: M.mean(D.B.y) - D.b * M.mean(D.B.x) };
        const chA = M.mean(D.A.y) - M.mean(D.A.x), chB = M.mean(D.B.y) - M.mean(D.B.x);
        const s1 = chB - chA, s2 = D.a.B - D.a.A;
        const T = STORY[st.story];
        tbl.rows([
          [`${T.A}的平均变化`, PL.signed(chA, 2, ' kg'), '—'],
          [`${T.B}的平均变化`, PL.signed(chB, 2, ' kg'), '—'],
          [`${T.B}多增重`, `<b>${PL.signed(s1, 2, ' kg')}</b>`, `<b>${PL.signed(s2, 2, ' kg')}</b>（同样初始体重下）`],
        ]);
        verdict.innerHTML = `<p>${T.note}</p>` + (st.story === 'sex'
          ? '<p>这里初始体重是性别<b>造成</b>的（性别 → 初始体重 → 期末体重），控制它等于控制了一个中介。想知道"一学年里男生和女生的体重变化是否不同"，统计学家 1 的答案（没有差别）回答的正是这个问题。统计学家 2 比较的是"体重相同的男生和女生"，而这样的人在各自组里处于不同的位置，会被回归均值拉向各自的组均值。</p>'
          : '<p>这里初始体重影响了学生选哪个食堂（初始体重 → 食堂，初始体重 → 期末体重），它是混杂因素。想知道"食堂对体重的效应"，就应该比较初始体重相同的学生，统计学家 2 的做法是对的。</p>');
        stats.set('s1', PL.signed(s1, 2, ' kg'), '各组"六月 − 九月"的平均差');
        stats.set('s2', PL.signed(s2, 2, ' kg'), `理论约 (1 − ρ) × 组间差 + 真实效应 = ${PL.signed((1 - st.rho) * st.gap + st.eff, 1, ' kg')}`, Math.abs(s2 - s1) > 0.8 ? 'bad' : '');
        sc.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>1967 年，Frederic Lord 在一页纸的短文里提出了这个问题。<b>统计学家 1</b>：每组的平均体重九月和六月一样，所以两组的变化都是 0，没有差别。<b>统计学家 2</b>：用六月体重对九月体重做回归，再加上组别（协方差分析），发现"在九月体重相同的情况下"，B 组六月平均重了好几公斤。</p>
        <p>两条回归线平行，却上下错开，原因是回归均值：在每组内部，九月偏重的人六月往往回落一点，偏轻的人往往回升一点，每个人都被拉向<b>自己组</b>的均值。一个 70 公斤的学生，如果属于较轻的 A 组，会被往下拉；如果属于较重的 B 组，会被往上拉。于是"初始体重相同"的两组人，六月的体重差了大约 (1 − ρ) × 组间差。</p>
        <p class="try">把相关 ρ 拉到 0.98：几乎没有回归均值，两位统计学家的结论趋于一致。把 ρ 降到 0.3：分歧变得很大。</p>

        <h2>谁对？</h2>
        <p>Lord 当年的结论是"没有一个统计方法能自动回答这个问题"。半个世纪后，Judea Pearl 用因果图给出了回答：<b>取决于你问的是什么因果问题，以及初始体重在因果图里的位置</b>。如果分组决定了初始体重（初始体重是中介），控制它就改变了问题；如果初始体重决定了分组（初始体重是混杂因素），就必须控制它。切换上面的"故事"，数字一模一样，正确的答案却换了一个。</p>
        <div class="takeaway"><b>带走什么：</b>"差值分析"和"控制基线的回归"不是同一个问题的两种算法，而是两个不同的问题。在前后测、A/B 测试的基线调整、政策评估里，先说清楚你要估计的是哪个因果效应，再选方法。这和${PL.link('simpson', '辛普森悖论')}、${PL.link('birthweight', '低出生体重悖论')}是同一课：答案在因果图里，不在数据里。</div>
      `);
    },
  });

  // ======================================================================
  // 贝特朗悖论
  // ======================================================================
  PL.register({
    id: 'bertrand', cat: 'measure', nav: '贝特朗悖论："随机"有三个答案',
    title: '贝特朗悖论：在圆里随机画一条弦，它比内接三角形边长的概率是多少？',
    hook: '答案可以是 1/3、1/2 或 1/4，取决于你怎么理解"随机"。三种做法都很自然，每一种都没算错。',
    related: ['lindley', 'benford', 'highdim'],
    render(root) {
      const st = { method: 'end', n: 0, seed: PL.seed() };
      const METHODS = {
        end: { label: '随机取两个端点', theory: 1 / 3, desc: '在圆周上随机取两个点，连成弦。' },
        rad: { label: '随机半径上的随机点', theory: 1 / 2, desc: '随机选一条半径，在半径上均匀取一点，过该点作垂直于半径的弦。' },
        mid: { label: '随机取中点', theory: 1 / 4, desc: '在圆内均匀取一个点，把它当作弦的中点。' },
      };
      let chords = [];
      function chord(r) {
        if (st.method === 'end') { const a = r() * 2 * Math.PI, b = r() * 2 * Math.PI; return [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)]; }
        let phi = r() * 2 * Math.PI, d;
        if (st.method === 'rad') d = r(); else d = Math.sqrt(r()); // 'mid': midpoint uniform in the disk
        const mx = d * Math.cos(phi), my = d * Math.sin(phi), hl = Math.sqrt(Math.max(0, 1 - d * d));
        return [mx - hl * Math.sin(phi), my + hl * Math.cos(phi), mx + hl * Math.sin(phi), my - hl * Math.cos(phi)];
      }
      const pn = PL.panel(root, '画弦', '');
      const note = pn.el.querySelector('.panel-note') || h('p', { class: 'panel-note' });
      pn.el.insertBefore(note, pn.el.querySelector('.controls'));
      pn.cols(2);
      pn.ctrl.seg({ options: Object.entries(METHODS).map(([k, v]) => ({ value: k, label: v.label })), value: st.method, onChange: (v) => { st.method = v; reset(); } });
      pn.ctrl.button('重新开始', () => { st.seed = PL.seed(); reset(); });
      let rng = PL.rng(st.seed);
      const disc = PL.stage(pn.box(), { height: 320 }, (c, w, hh) => {
        const R = Math.min(w, hh) / 2 - 14, cx = w / 2, cy = hh / 2;
        c.strokeStyle = PL.col('ink'); c.lineWidth = 2; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
        for (const ch of chords) {
          const long = Math.hypot(ch[2] - ch[0], ch[3] - ch[1]) > Math.sqrt(3);
          c.strokeStyle = PL.col(long ? 's2' : 's7'); c.globalAlpha = long ? 0.32 : 0.16; c.lineWidth = 1;
          c.beginPath(); c.moveTo(cx + ch[0] * R, cy - ch[1] * R); c.lineTo(cx + ch[2] * R, cy - ch[3] * R); c.stroke();
        }
        c.globalAlpha = 1;
        c.strokeStyle = PL.col('s1'); c.lineWidth = 2;
        c.beginPath(); for (let k = 0; k <= 3; k++) { const a = Math.PI / 2 + (k * 2 * Math.PI) / 3; const x = cx + R * Math.cos(a), y = cy - R * Math.sin(a); k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
        c.setLineDash([4, 4]); c.strokeStyle = PL.col('ink3'); c.beginPath(); c.arc(cx, cy, R / 2, 0, 7); c.stroke(); c.setLineDash([]);
      });
      const mb = pn.box();
      mb.append(h('div', { class: 'fig-title', text: '这些弦的中点落在哪里' }));
      const mids = PL.stage(mb, { height: 290 }, (c, w, hh) => {
        const R = Math.min(w, hh) / 2 - 14, cx = w / 2, cy = hh / 2;
        c.strokeStyle = PL.col('ink3'); c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, R, 0, 7); c.stroke();
        c.setLineDash([4, 4]); c.beginPath(); c.arc(cx, cy, R / 2, 0, 7); c.stroke(); c.setLineDash([]);
        for (const ch of chords) {
          const mx = (ch[0] + ch[2]) / 2, my = (ch[1] + ch[3]) / 2;
          c.fillStyle = PL.col(Math.hypot(mx, my) < 0.5 ? 's2' : 's7'); c.globalAlpha = 0.7;
          c.fillRect(cx + mx * R - 1, cy - my * R - 1, 2.2, 2.2);
        }
        c.globalAlpha = 1;
      });
      mb.append(h('div', { class: 'fig-cap', text: '中点落在虚线小圆（半径一半）以内，弦就比三角形的边长。三种方法让中点有完全不同的分布。' }));
      const stats = pn.stats([
        { key: 'n', label: '已画的弦', color: 's7' },
        { key: 'est', label: '比三角形边长的比例', color: 's2' },
        { key: 'th', label: '这种方法的理论值', color: 's4' },
      ]);
      function reset() { chords = []; rng = PL.rng(st.seed); note.innerHTML = METHODS[st.method].desc; draw(); }
      function draw() {
        const long = chords.filter((ch) => Math.hypot(ch[2] - ch[0], ch[3] - ch[1]) > Math.sqrt(3)).length;
        stats.set('n', String(chords.length));
        stats.set('est', chords.length ? PL.pct(long / chords.length, 1) : '—');
        const th = METHODS[st.method].theory;
        stats.set('th', th === 1 / 3 ? '1/3' : th === 1 / 2 ? '1/2' : '1/4', PL.pct(th, 1));
        disc.render(); mids.render();
      }
      reset();
      for (let i = 0; i < 120; i++) chords.push(chord(rng));
      draw();
      PL.loop(() => { if (chords.length >= 1500) return; for (let i = 0; i < 6; i++) chords.push(chord(rng)); draw(); });
      PL.prose(root, `
        <h2>三个都对的答案</h2>
        <p>1889 年，约瑟夫·贝特朗在他的概率论教科书里提出这个问题：在圆内随机画一条弦，它比圆内接正三角形的边长的概率是多少？</p>
        <ul>
          <li><b>随机取两个端点</b>：固定一个端点，另一个端点必须落在对面那 1/3 的圆弧上，答案 <b>1/3</b>。</li>
          <li><b>随机半径上的随机点</b>：弦到圆心的距离在 [0, R] 上均匀，距离小于 R/2 时弦更长，答案 <b>1/2</b>。</li>
          <li><b>随机取中点</b>：中点在圆内均匀分布，落在半径 R/2 的小圆里的概率是面积比，答案 <b>1/4</b>。</li>
        </ul>
        <p>问题不在于计算，而在于"随机"这个词：三种方法对应弦的三种不同的概率分布。右边的中点分布图把差别画了出来：第一种方法的中点堆在边缘附近，第三种均匀铺满圆面。</p>
        <p class="try">在三种方法之间切换，看左边的弦和右边的中点有什么不同。</p>

        <h2>有没有一个"正确"的随机？</h2>
        <p>1973 年，物理学家 E. T. Jaynes 在《适定的问题》中提出：如果问题没有指明圆的位置和大小，那么"随机"应当在平移和缩放下保持不变，满足这个要求的分布是唯一的，正是第二种方法，答案 1/2。他还指出，往地上画的圆上随手扔麦秆，实验结果确实接近 1/2。贝特朗问题因此成了"用对称性确定无信息先验"的经典例子。</p>
        <div class="takeaway"><b>带走什么：</b>"随机抽一个"、"均匀分布"、"毫无偏好的先验"都不是自明的，必须说清楚是对哪个量、在哪种参数化下均匀。在${PL.link('lindley', '林德利悖论')}里，先验的选择改变了结论；在${PL.link('benford', '本福特定律')}里，"在对数尺度上均匀"解释了为什么首位数字 1 那么常见。</div>
      `);
    },
  });
})();
