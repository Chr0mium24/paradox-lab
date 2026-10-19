/* 类别四（续）：维度与尺度 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 随机游走的常返性（Pólya）
  // ======================================================================
  const POLYA_CACHE = {};
  PL.register({
    id: 'polya', cat: 'dimension', nav: '随机游走：醉汉能回家，醉鸟不一定',
    title: '随机游走：醉汉总能走回家，醉鸟却可能永远回不去',
    hook: '在一维和二维里随机乱走，迟早一定会回到出发点；到了三维，回到原点的概率只剩约 34%。维度从 2 变成 3，"必然"变成了"大概不会"。',
    related: ['stein', 'highdim', 'arcsine'],
    render(root) {
      const S = 10000, W = 700;
      const returns = POLYA_CACHE.r || (POLYA_CACHE.r = {});
      if (!returns[1]) for (const d of [1, 2, 3]) {
        const r = PL.rng(100 + d), first = [];
        for (let w = 0; w < W; w++) {
          const p = new Int32Array(d);
          let t = 0;
          for (let s = 1; s <= S; s++) {
            p[r.int(d)] += r() < 0.5 ? 1 : -1;
            let z = true;
            for (let k = 0; k < d; k++) if (p[k]) { z = false; break; }
            if (z) { t = s; break; }
          }
          first.push(t || Infinity);
        }
        returns[d] = first;
      }
      const LIMIT = { 1: 1, 2: 1, 3: 0.3405 };
      const st = { d: 2, seed: PL.seed() };
      const pn = PL.panel(root, '从原点出发，每一步随机选一个方向走一格', '一维：左或右；二维：上下左右；三维：再加上前后。看它们多久能第一次回到出发点。').cols(2);
      pn.ctrl.seg({ label: '维数', options: [1, 2, 3].map((v) => ({ value: v, label: v + ' 维' })), value: st.d, onChange: (v) => { st.d = v; upWalk(); } });
      pn.ctrl.button('换几条路径', () => { st.seed = PL.seed(); upWalk(); });
      let paths;
      const walk = PL.stage(pn.box(), { height: 320 }, (c, w, hh) => {
        const cols = ['s1', 's2', 's3', 's4', 's6'];
        if (st.d === 1) {
          const n = paths[0].length;
          let mx = 10; for (const p of paths) for (const q of p) mx = Math.max(mx, Math.abs(q[0]));
          const X = (i) => 10 + (i / n) * (w - 20), Y = (v) => hh / 2 - (v / mx) * (hh / 2 - 16);
          c.strokeStyle = PL.col('ink3'); c.setLineDash([4, 4]); c.beginPath(); c.moveTo(10, hh / 2); c.lineTo(w - 10, hh / 2); c.stroke(); c.setLineDash([]);
          paths.forEach((p, k) => { c.strokeStyle = PL.col(cols[k]); c.globalAlpha = 0.8; c.lineWidth = 1.2; c.beginPath(); p.forEach((q, i) => (i ? c.lineTo(X(i), Y(q[0])) : c.moveTo(X(i), Y(q[0])))); c.stroke(); });
          c.globalAlpha = 1; c.fillStyle = PL.col('ink3'); c.font = PL.font(11); c.fillText('横轴：步数　纵轴：位置（虚线 = 家）', 12, hh - 6);
          return;
        }
        let mx = 10; for (const p of paths) for (const q of p) mx = Math.max(mx, Math.abs(q[0]), Math.abs(q[1]));
        const sc = (Math.min(w, hh) / 2 - 12) / mx, cx = w / 2, cy = hh / 2;
        paths.forEach((p, k) => {
          c.strokeStyle = PL.col(cols[k]); c.globalAlpha = 0.65; c.lineWidth = 1;
          c.beginPath(); p.forEach((q, i) => (i ? c.lineTo(cx + q[0] * sc, cy - q[1] * sc) : c.moveTo(cx + q[0] * sc, cy - q[1] * sc))); c.stroke();
          const last = p[p.length - 1];
          c.globalAlpha = 1; c.fillStyle = PL.col(cols[k]); c.beginPath(); c.arc(cx + last[0] * sc, cy - last[1] * sc, 3.5, 0, 7); c.fill();
        });
        c.fillStyle = PL.col('ink'); c.beginPath(); c.arc(cx, cy, 5, 0, 7); c.fill();
        c.fillStyle = PL.col('ink3'); c.font = PL.font(11); c.fillText(st.d === 3 ? '三维路径投影到平面（黑点 = 家）' : '黑点 = 家', 8, hh - 6);
      });
      const cb = pn.box();
      cb.append(h('div', { class: 'fig-title', text: `已经回过家的比例（${W} 个行者）` }));
      const ch = PL.plot(cb, { height: 290, x: [1, S], y: [0, 1], xlog: true, xlabel: '步数', yfmt: (v) => Math.round(v * 100) + '%', legend: [{ label: '1 维', color: 's1' }, { label: '2 维', color: 's3' }, { label: '3 维', color: 's2' }], legendPos: 'tl' });
      const ts = M.logspace(1, S, 80);
      const frac = (d) => ts.map((t) => returns[d].filter((v) => v <= t).length / W);
      const curves = { 1: frac(1), 2: frac(2), 3: frac(3) };
      ch.fn = (p) => {
        p.hline(0.3405, { color: 's2', label: '三维的极限 ≈ 34%', align: 'right' });
        [[1, 's1'], [2, 's3'], [3, 's2']].forEach(([d, col]) => p.line(ts, curves[d], { color: col, width: d === st.d ? 3 : 1.6, alpha: d === st.d ? 1 : 0.55 }));
      };
      const stats = pn.stats([
        { key: 'now', label: '1 万步内回过家的比例', color: 's3' },
        { key: 'lim', label: '走无限步，最终回家的概率', color: 's2' },
        { key: 'med', label: '回家所需步数的中位数', color: 's4' },
      ]);
      function upWalk() {
        const r = PL.rng(st.seed);
        const n = st.d === 1 ? 3000 : 6000;
        paths = Array.from({ length: st.d === 1 ? 5 : 3 }, () => { const p = new Int32Array(st.d), out = [[0, 0]]; for (let s = 0; s < n; s++) { p[r.int(st.d)] += r() < 0.5 ? 1 : -1; out.push([p[0], p[1] || 0]); } return out; });
        const f = returns[st.d].filter((v) => v <= S).length / W;
        stats.set('now', PL.pct(f, 1));
        stats.set('lim', st.d === 3 ? '≈ 34%' : '100%', st.d === 3 ? '大约 2/3 的行者永远回不了家' : st.d === 2 ? '必然回家，但可能要走极其久' : '必然回家');
        const sorted = returns[st.d].slice().sort((a, b) => a - b), med = sorted[Math.floor(W / 2)];
        stats.set('med', isFinite(med) ? PL.int(med) + ' 步' : '> 1 万步', st.d === 1 ? '期望步数却是无穷大' : '');
        walk.render(); ch.render();
      }
      upWalk();
      PL.prose(root, `
        <h2>Pólya 的定理</h2>
        <p>1921 年，数学家乔治·波利亚在苏黎世的公园散步时，反复遇到同一对散步的夫妇，他开始好奇：如果两个人都随机地走，会不会必然一再相遇？这引出了他关于随机游走的定理：在一维和二维的格点上随机游走，<b>以概率 1</b> 会回到出发点（而且会回来无穷多次）；在三维及以上，回到出发点的概率小于 1，三维时约为 34%。这被概括成一句流传很广的话：醉汉总能走回家，醉鸟却可能永远回不了家。</p>
        <p class="try">比较三条曲线：一维很快接近 100%；二维也在一路上升，只是非常缓慢；三维停在 34% 附近再也上不去。</p>

        <h2>为什么偏偏是 2 和 3 之间</h2>
        <p>走了 n 步以后，行者大致散布在半径 √n 的范围里。在 d 维中，这个范围里有大约 n<sup>d/2</sup> 个格点，所以第 n 步恰好在原点的概率约为 n<sup>−d/2</sup>。回家的期望次数是这些概率的总和：</p>
        <div class="formula">Σ n<sup>−d/2</sup>：d = 1 时 Σ n<sup>−1/2</sup> 发散；d = 2 时 Σ 1/n 刚好发散；d = 3 时 Σ n<sup>−3/2</sup> 收敛</div>
        <p>期望回家次数无穷，就一定会回家；期望次数有限，就有可能永远回不来。二维正好卡在发散的边缘，所以虽然必然回家，平均所需的时间却是无穷大。</p>
        <p>另一种漂亮的说法来自电路：把格点看成电阻网络，"会不会回家"等价于"从原点到无穷远的总电阻是不是无穷大"。一维和二维网络里，往无穷远去的电流通道不够多，电阻无穷大；三维网络里通道足够多，电阻有限（Doyle &amp; Snell, 《随机游走与电网络》）。</p>

        <h2>它和斯坦因悖论是同一件事</h2>
        <p>${PL.link('stein', '斯坦因悖论')}的分界线也恰好是 3 维：从 3 维开始，直接用观测值估计均值就不再是最优的。Brown（1971）证明了这两件事的数学根源相同：估计量是否"可容许"，取决于一个相应的扩散过程是常返的还是暂留的。高维空间"太大"，随机游走找不回原点；同样因为空间太大，噪声会把观测向量推离真值，于是往原点收缩才有利。</p>
        <div class="takeaway"><b>带走什么：</b>"足够长的时间里，什么都会发生"在低维里成立，在高维里不成立。维数本身就能把"必然"变成"不太可能"，这和${PL.link('highdim', '高维几何')}里那些失效的直觉是同一类现象。</div>
      `);
    },
  });

  // ======================================================================
  // 本福特定律
  // ======================================================================
  PL.register({
    id: 'benford', cat: 'dimension', nav: '本福特定律：首位数字 1 占三成',
    title: '本福特定律：现实中的数字，首位是 1 的占了三成',
    hook: '河流长度、城市人口、公司营收、2 的乘方……首位数字并不是 1 到 9 各占 1/9：1 开头的约占 30%，9 开头的不到 5%。',
    related: ['bertrand', 'sandpile', 'smallsample'],
    render(root) {
      const BEN = Array.from({ length: 9 }, (_, i) => Math.log10(1 + 1 / (i + 1)));
      const st = { src: 'pow2', scale: 1, m: 3 };
      const SRC = {
        pow2: { label: '2 的乘方（前 1000 个）', note: '2, 4, 8, 16, 32, 64, 128, …' },
        fib: { label: '斐波那契数（前 1000 个）', note: '1, 1, 2, 3, 5, 8, 13, 21, …' },
        prod: { label: '若干随机数的乘积', note: '每个数是 m 个 0 到 1 之间随机数的乘积' },
        growth: { label: '随机复利增长', note: '5000 家公司，每年营收随机增减 −30% 到 +40%，经过 30 年' },
        uni: { label: '1 到 999 的均匀随机数', note: '每个数字开头的机会均等：不符合本福特' },
        height: { label: '成年人身高（厘米）', note: '集中在 150–190 之间：首位几乎全是 1' },
      };
      let logs = [];
      function gen() {
        const r = PL.rng(9);
        const L = [];
        if (st.src === 'pow2') for (let k = 1; k <= 1000; k++) L.push(k * Math.log10(2));
        else if (st.src === 'fib') { let a = 1, b = 1; for (let k = 1; k <= 1000; k++) { if (k < 70) { L.push(Math.log10(a)); [a, b] = [b, a + b]; } else L.push(k * Math.log10((1 + Math.sqrt(5)) / 2) - Math.log10(Math.sqrt(5))); } }
        else if (st.src === 'prod') for (let i = 0; i < 5000; i++) { let s = 0; for (let j = 0; j < st.m; j++) s += Math.log10(r() * 0.999 + 0.001); L.push(s); }
        else if (st.src === 'growth') for (let i = 0; i < 5000; i++) { let s = Math.log10(1 + 9 * r()); for (let y = 0; y < 30; y++) s += Math.log10(1 + (-0.3 + 0.7 * r())); L.push(s); }
        else if (st.src === 'uni') for (let i = 0; i < 5000; i++) L.push(Math.log10(1 + Math.floor(999 * r())));
        else for (let i = 0; i < 5000; i++) L.push(Math.log10(170 + 8 * r.normal()));
        logs = L;
      }
      const pn = PL.panel(root, '数一数首位数字', '');
      const note = h('p', { class: 'panel-note' });
      pn.el.insertBefore(note, pn.el.querySelector('.controls'));
      pn.ctrl.seg({ options: Object.entries(SRC).map(([k, v]) => ({ value: k, label: v.label })), value: st.src, onChange: (v) => { st.src = v; gen(); update(); } });
      pn.ctrl.break();
      pn.ctrl.slider({ label: '换算单位：所有数 ×', min: 1, max: 9.99, step: 0.01, log: true, value: st.scale, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.scale = v; update(); }, wide: true });
      const mSl = pn.ctrl.slider({ label: '乘积里的随机数个数 m', min: 1, max: 12, step: 1, value: st.m, fmt: (v) => v, onInput: (v) => { st.m = v; if (st.src === 'prod') { gen(); update(); } } });
      const ch = PL.plot(pn.box(), { height: 300, x: [0.4, 9.6], y: [0, 0.4], xticks: [1, 2, 3, 4, 5, 6, 7, 8, 9], xfmt: (v) => String(v), xlabel: '首位数字', yfmt: (v) => Math.round(v * 100) + '%', legend: [{ label: '这组数据', color: 's4', type: 'box' }, { label: '本福特定律 log₁₀(1 + 1/d)', color: 's2' }], legendPos: 'tr' });
      let freq;
      ch.fn = (p) => {
        const mx = Math.max(0.35, ...freq) * 1.1;
        p.y = [0, mx];
        p.bars([1, 2, 3, 4, 5, 6, 7, 8, 9], freq, { color: 's4', alpha: 0.75, w: 0.7 });
        p.line([1, 2, 3, 4, 5, 6, 7, 8, 9], BEN, { color: 's2', width: 2.5 });
        p.dots([1, 2, 3, 4, 5, 6, 7, 8, 9], BEN, { color: 's2', r: 4 });
      };
      const stats = pn.stats([
        { key: 'one', label: '首位是 1 的比例', color: 's4', sub: '本福特：30.1%' },
        { key: 'nine', label: '首位是 9 的比例', color: 's6', sub: '本福特：4.6%' },
        { key: 'mad', label: '与本福特分布的平均偏差', color: 's2' },
      ]);
      function update() {
        note.innerHTML = SRC[st.src].note;
        mSl.el.style.display = st.src === 'prod' ? '' : 'none';
        const cnt = new Array(9).fill(0), ls = Math.log10(st.scale);
        for (const L of logs) { const f = (L + ls) - Math.floor(L + ls); cnt[Math.min(8, Math.floor(Math.pow(10, f)) - 1)]++; }
        freq = cnt.map((c) => c / logs.length);
        const mad = M.mean(freq.map((f, i) => Math.abs(f - BEN[i])));
        stats.set('one', PL.pct(freq[0], 1));
        stats.set('nine', PL.pct(freq[8], 1));
        stats.set('mad', PL.pct(mad, 2), mad < 0.006 ? '非常符合' : mad < 0.015 ? '大致符合' : '不符合', mad < 0.006 ? 'good' : mad > 0.015 ? 'bad' : '');
        ch.render();
      }
      gen(); update();
      PL.prose(root, `
        <h2>发现</h2>
        <p>1881 年，天文学家西蒙·纽康注意到图书馆里的对数表：开头几页（查以 1 开头的数）比后面几页磨损得厉害得多。1938 年，物理学家弗兰克·本福特收集了两万多个来自河流面积、人口、物理常数、杂志上的数字等 20 类数据，确认了同一个规律：首位数字是 d 的比例约为</p>
        <div class="formula">P(首位 = d) = log₁₀(1 + 1/d)：1 → 30.1%，2 → 17.6%，3 → 12.5%，…，9 → 4.6%</div>

        <h2>为什么</h2>
        <p>关键是<b>尺度不变性</b>。如果一类数据的分布跟单位无关（用米量和用英尺量，首位数字的分布应该一样），那么它的对数在一个周期上必须是均匀的。在对数尺度上，从 1 到 2 占了 log₁₀2 ≈ 30% 的长度，从 9 到 10 只占 4.6%，首位数字的分布就是本福特分布。另一个等价的视角是乘法：一个量由很多随机因素<b>相乘</b>而成（复利增长、层层放大的过程），它的对数是很多随机项之和，会在多个数量级上铺开，首位数字就会接近本福特分布。Hill（1995）严格证明了：从许多不同分布里随机混合抽取的数据，首位数字会趋向本福特分布。</p>
        <p class="try">选"2 的乘方"，拖动"换算单位"：柱子几乎不动，这就是尺度不变。再切到"均匀随机数"或"身高"拖一拖：分布随单位剧烈变化，它们本来就不服从本福特。最后试试"若干随机数的乘积"，把 m 从 1 调到 6，看它怎样逐渐逼近本福特。</p>

        <h2>用途与误用</h2>
        <ul>
          <li><b>查账</b>：会计学者 Mark Nigrini 推广了用本福特定律检查财务数据。人为编造的数字往往太"均匀"，首位 5、6、7 偏多，可以作为进一步审计的线索。</li>
          <li><b>误用</b>：不是所有数据都该服从本福特。范围很窄的数据（身高、考试分数）、有人为上限下限的数据（价格常定为 9.99）、按固定规则分配的编号，都不服从。拿它去"证明"选举舞弊这类说法，常常是滥用。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>跨越多个数量级的数据，自然的"均匀"是在对数尺度上，而不是在线性尺度上。这和${PL.link('bertrand', '贝特朗悖论')}一样：说"随机"之前，先问在哪个尺度上随机。后面的${PL.link('sandpile', '沙堆模型')}会遇到同一类"没有特征尺度"的分布。</div>
      `);
    },
  });
})();
