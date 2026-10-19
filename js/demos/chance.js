/* 类别七：运气的形状（期望 ≠ 典型） */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 遍历性 + 凯利公式
  // ======================================================================
  PL.register({
    id: 'ergodicity', cat: 'chance', nav: '遍历性：期望在涨，人人在亏',
    title: '遍历性：一个期望每轮 +5% 的赌局，几乎让所有人破产',
    hook: '抛硬币，正面财富 ×1.5，反面 ×0.6。期望每轮赚 5%，所有人的平均财富确实在指数增长；可几乎每一个具体的人，都在稳步走向归零。',
    related: ['arcsine', 'average', 'parrondo'],
    render(root) {
      const st = { N: 1000, T: 100, up: 1.5, dn: 0.6, seed: PL.seed() };
      const pa = PL.panel(root, '同一个赌局，一群人一起玩', '每人起始财富 1，每轮把全部财富押上。细线是其中 40 个人的财富（对数刻度）。').cols(2);
      pa.ctrl.seg({ label: '玩家人数', options: [{ value: 100, label: '100' }, { value: 1000, label: '1000' }, { value: 10000, label: '1 万' }], value: st.N, onChange: (v) => { st.N = v; upA(); } });
      pa.ctrl.slider({ label: '轮数', min: 10, max: 300, step: 5, value: st.T, fmt: (v) => v + ' 轮', onInput: PL.debounce((v) => { st.T = v; upA(); }, 50) });
      pa.ctrl.slider({ label: '正面 ×', min: 1.1, max: 2, step: 0.05, value: st.up, fmt: (v) => PL.fmt(v, 2), onInput: PL.debounce((v) => { st.up = v; upA(); }, 50) });
      pa.ctrl.slider({ label: '反面 ×', min: 0.3, max: 0.95, step: 0.05, value: st.dn, fmt: (v) => PL.fmt(v, 2), onInput: PL.debounce((v) => { st.dn = v; upA(); }, 50) });
      pa.ctrl.button('重新开始', () => { st.seed = PL.seed(); upA(); });
      let A;
      const ch = PL.plot(pa.box(), { height: 320, x: [0, 100], y: [1e-8, 1e8], ylog: true, xlabel: '轮数', ylabel: '财富（对数）', legend: [{ label: '期望 E[财富]', color: 's3', dash: [5, 4] }, { label: '所有玩家的平均', color: 's3' }, { label: '中位数（典型的人）', color: 's2' }], legendPos: 'tl' });
      ch.fn = (p) => {
        const ts = A.mean.map((_, i) => i);
        A.paths.forEach((pth) => p.line(ts, pth, { color: 's7', width: 0.8, alpha: 0.35 }));
        p.hline(1, { color: 'ink3' });
        p.func((t) => Math.pow((st.up + st.dn) / 2, t), { color: 's3', width: 1.6, dash: [5, 4] });
        p.line(ts, A.mean, { color: 's3', width: 2.8 });
        p.line(ts, A.med, { color: 's2', width: 2.8 });
      };
      const sb = pa.box();
      sb.append(h('div', { class: 'fig-title', text: '最后一轮：财富的分布' }));
      const dist = PL.plot(sb, { height: 320, x: [-12, 8], y: [0, 1], yticks: [], xlabel: '财富的数量级（log₁₀）' });
      dist.fn = (p) => {
        p.hist(A.finalLog, { bins: 60, range: [-12, 8], color: 's4', alpha: 0.75, frac: true, autoY: 1.2 });
        p.vline(0, { color: 'ink', label: '起点 1' });
        p.vline(Math.log10(A.mean[A.mean.length - 1]), { color: 's3', label: '平均' });
      };
      const sa = pa.stats([
        { key: 'ens', label: '期望：每轮', color: 's3', sub: '(正面 + 反面) / 2' },
        { key: 'time', label: '典型的人：每轮', color: 's2', sub: '√(正面 × 反面)' },
        { key: 'lost', label: `最后比起点更穷的人`, color: 's6' },
        { key: 'top', label: '最富的 1% 拥有的财富', color: 's4' },
      ]);
      function upA() {
        const r = PL.rng(st.seed), N = st.N, T = st.T;
        const lu = Math.log(st.up), ld = Math.log(st.dn);
        const L = new Float64Array(N), heads = new Int32Array(N);
        const mean = [1], med = [1], paths = Array.from({ length: Math.min(40, N) }, () => [1]);
        for (let t = 1; t <= T; t++) {
          let s = 0;
          const cnt = new Int32Array(t + 1);
          for (let i = 0; i < N; i++) { if (r() < 0.5) { L[i] += lu; heads[i]++; } else L[i] += ld; s += Math.exp(L[i]); cnt[heads[i]]++; }
          mean.push(s / N);
          // wealth only depends on the number of heads, so the median player is the one with the median head count
          let acc = 0, mh = 0; while (acc + cnt[mh] <= N / 2) { acc += cnt[mh]; mh++; }
          med.push(Math.exp(mh * lu + (t - mh) * ld));
          paths.forEach((pth, k) => pth.push(Math.exp(L[k])));
        }
        const fin = Array.from(L, (v) => v / Math.LN10);
        const sortedW = Array.from(L, Math.exp).sort((a, b) => b - a);
        const tot = M.sum(sortedW), top = M.sum(sortedW.slice(0, Math.max(1, Math.round(N / 100))));
        A = { mean, med, paths, finalLog: fin };
        const lo = Math.min(-8, Math.log10(Math.min(...med)) - 1), hi = Math.max(8, Math.log10(Math.max(...mean)) + 1);
        const ylo = Math.floor(Math.max(-60, lo)), yhi = Math.ceil(Math.min(60, hi)), stepD = Math.max(1, Math.ceil((yhi - ylo) / 7));
        ch.setX(0, T); ch.setY(Math.pow(10, ylo), Math.pow(10, yhi));
        ch.o.yticks = []; for (let e = Math.ceil(ylo / stepD) * stepD; e <= yhi; e += stepD) ch.o.yticks.push(Math.pow(10, e));
        ch.o.yfmt = (v) => { const e = Math.round(Math.log10(v)); return e === 0 ? '1' : '10^' + e; };
        dist.setX(Math.max(-40, Math.floor(Math.min(...fin)) - 1), Math.ceil(Math.max(...fin)) + 1);
        const ens = (st.up + st.dn) / 2, tm = Math.sqrt(st.up * st.dn);
        sa.set('ens', PL.signedPct(ens - 1, 1), null, ens > 1 ? 'good' : 'bad');
        sa.set('time', PL.signedPct(tm - 1, 1), null, tm > 1 ? 'good' : 'bad');
        sa.set('lost', PL.pct(fin.filter((v) => v < 0).length / N, 1));
        sa.set('top', PL.pct(top / tot, 1), `平均财富 ${mean[T] > 1e4 || mean[T] < 1e-3 ? mean[T].toExponential(1) : PL.fmt(mean[T], 2)}，中位数 ${med[T].toExponential(1)}`);
        ch.render(); dist.render();
      }
      upA();

      // ---- Kelly ----
      const kb = { p: 0.6, f: 0.5, seed: PL.seed() };
      const pk = PL.panel(root, '凯利公式：押多少才对', '一个对你有利的赌局：赢的概率 p &gt; 50%，赔率 1:1。每次押上当前财富的比例 f。押得越多，期望收益越高；可长期增长率呢？').cols(2);
      pk.ctrl.slider({ label: '赢的概率 p', min: 0.5, max: 0.85, step: 0.01, value: kb.p, fmt: (v) => PL.pct(v, 0), onInput: (v) => { kb.p = v; upK(); } });
      pk.ctrl.slider({ label: '每次押上的比例 f', min: 0, max: 1, step: 0.01, value: kb.f, fmt: (v) => PL.pct(v, 0), onInput: (v) => { kb.f = v; upK(); } });
      pk.ctrl.button('换一批路径', () => { kb.seed = PL.seed(); upK(); });
      const g = (f, p) => (f >= 1 ? -Infinity : p * Math.log(1 + f) + (1 - p) * Math.log(1 - f));
      const gk = PL.plot(pk.box(), { height: 280, x: [0, 1], y: [-0.3, 0.15], xlabel: '押上的比例 f', ylabel: '每次的长期增长率', xfmt: (v) => Math.round(v * 100) + '%', yfmt: (v) => Math.round(v * 100) + '%' });
      gk.fn = (p) => {
        p.hline(0, { color: 'ink3' });
        p.func((f) => Math.max(-0.3, g(f, kb.p)), { color: 's1', width: 2.5, n: 400 });
        const fs = 2 * kb.p - 1;
        p.vline(fs, { color: 's3', label: '凯利 f* = 2p − 1' });
        p.vline(Math.min(1, 2 * fs), { color: 's2', label: '≈ 2 倍凯利：增长归零' });
        p.point(kb.f, Math.max(-0.3, g(kb.f, kb.p)), { color: 's1' });
      };
      const kp = PL.plot(pk.box(), { height: 280, x: [0, 1000], y: [1e-6, 1e12], ylog: true, xlabel: '下注次数', ylabel: '财富', legend: [{ label: '你选的 f（5 条路径）', color: 's1' }, { label: '凯利 f*', color: 's3' }], legendPos: 'tl' });
      let KP;
      kp.fn = (p) => {
        const xs = KP.k.map((_, i) => i);
        p.hline(1, { color: 'ink3' });
        KP.u.forEach((pth) => p.line(xs, pth, { color: 's1', width: 1.2, alpha: 0.7 }));
        p.line(xs, KP.k, { color: 's3', width: 2.2 });
      };
      const sk = pk.stats([
        { key: 'g', label: '你的长期增长率（每次）', color: 's1' },
        { key: 'gk', label: '凯利的增长率', color: 's3' },
        { key: 'ev', label: '你的期望收益（每次）', color: 's7', sub: '押得越多期望越高，但它不是你会经历的' },
      ]);
      function upK() {
        const r = PL.rng(kb.seed), n = 1000, fs = 2 * kb.p - 1;
        const sim = (f, rr) => { const out = [1]; let w = 0; for (let i = 0; i < n; i++) { w += rr() < kb.p ? Math.log(1 + f) : Math.log(Math.max(1e-300, 1 - f)); out.push(Math.max(1e-300, Math.exp(w))); } return out; };
        KP = { u: Array.from({ length: 5 }, () => sim(kb.f, r)), k: sim(fs, PL.rng(kb.seed + 1)) };
        const all = [...KP.u.flat(), ...KP.k].filter((v) => v > 0);
        const klo = Math.floor(Math.log10(Math.max(1e-60, Math.min(...all)))), khi = Math.ceil(Math.log10(Math.min(1e60, Math.max(...all)))) + 1, ks = Math.max(1, Math.ceil((khi - klo) / 7));
        kp.setY(Math.pow(10, klo), Math.pow(10, khi));
        kp.o.yticks = []; for (let e = Math.ceil(klo / ks) * ks; e <= khi; e += ks) kp.o.yticks.push(Math.pow(10, e));
        kp.o.yfmt = (v) => { const e = Math.round(Math.log10(v)); return e === 0 ? '1' : '10^' + e; };
        gk.setY(-0.3, Math.max(0.05, g(fs, kb.p) * 1.6));
        const gv = g(kb.f, kb.p);
        sk.set('g', isFinite(gv) ? PL.signedPct(Math.exp(gv) - 1, 2) : '必然破产', null, gv > 0 ? 'good' : 'bad');
        sk.set('gk', PL.signedPct(Math.exp(g(fs, kb.p)) - 1, 2), `f* = ${PL.pct(fs, 0)}`);
        sk.set('ev', PL.signedPct(kb.f * (2 * kb.p - 1), 2));
        gk.render(); kp.render();
      }
      upK();

      PL.prose(root, `
        <h2>两种平均</h2>
        <p>这个赌局的期望是每轮 (1.5 + 0.6)/2 = 1.05 倍。这是"系综平均"：同一时刻，把无数个平行宇宙里的你平均起来。可你只活在一个宇宙里，你经历的是"时间平均"：一正一反之后，你的财富变成 1.5 × 0.6 = 0.9 倍，每轮的典型增长率是 √0.9 ≈ 0.949，也就是每轮亏约 5%。</p>
        <div class="formula">系综：E[乘数] = (1.5 + 0.6)/2 = 1.05　　　时间：exp(E[ln 乘数]) = √(1.5 × 0.6) ≈ 0.949</div>
        <p>两者不相等，这个过程就是<b>非遍历</b>的。总人口的平均财富确实在指数增长，但这完全靠极少数连续走运的人撑着：模拟里最富的 1% 拥有了几乎全部财富，而中位数的人一路走向归零。人数有限时，连"平均财富"最终也会掉下来，因为撑起平均值的那种极端幸运者，在有限的人群里根本不会出现。</p>
        <p class="try">把人数从 100 万调到 100，把轮数拉到 300：平均线先跟着期望上升，后来也掉了下去。再把反面调到 0.7：√(1.5 × 0.7) &gt; 1，典型的人也开始赚钱了。</p>

        <h2>凯利公式：真正该最大化的东西</h2>
        <p>1956 年，贝尔实验室的 John Kelly 给出了重复下注时的最优比例：不要最大化期望收益，而要最大化<b>对数财富的期望</b>，也就是长期增长率。对 1:1 的赌局，最优比例是 f* = 2p − 1。押得比它少，增长慢；押得比它多，增长率反而下降；押到大约 2 倍 f*，长期增长归零，再多就必然走向破产，<b>即使每一次下注的期望都是正的</b>。数学家 Edward Thorp 用凯利公式在 21 点和后来的对冲基金里赚到了真钱。</p>
        <p>同一个数学也解释了投资里的"波动拖累"：长期复合增长率约等于算术平均收益减去方差的一半。波动越大，同样的平均收益留给你的越少。</p>
        <div class="takeaway"><b>带走什么：</b>对于会复利、会累积、不可重来的过程（财富、健康、公司存活），期望值不是你该看的数字，时间平均才是。"期望为正就值得做"只在可以无数次重来、互相独立的情况下成立。研究这一点的"遍历性经济学"（Ole Peters 等，2019）认为，许多被归为"非理性风险厌恶"的行为，其实是对时间平均的正确反应。和${PL.link('average', '平均飞行员')}一样：平均值描述的那个人，可能并不存在。</div>
      `);
    },
  });

  // ======================================================================
  // 反正弦定律
  // ======================================================================
  PL.register({
    id: 'arcsine', cat: 'chance', nav: '反正弦定律：公平游戏里领先不换手',
    title: '反正弦定律：公平的游戏里，领先的往往一直领先',
    hook: '两人抛硬币比输赢 1 万次。你以为领先会频繁换手、两人各领先一半时间？实际上，有四成的可能其中一人领先了 90% 以上的时间。',
    related: ['ergodicity', 'hothand', 'peeking', 'regression'],
    render(root) {
      const st = { N: 10000, seed: PL.seed() };
      const pn = PL.panel(root, '张三和李四抛硬币', '正面张三得 1 分，反面李四得 1 分。曲线是"张三领先多少分"随时间的变化，蓝色区域是张三领先的时段。').cols(2);
      pn.ctrl.slider({ label: '抛多少次', min: 100, max: 20000, step: 100, log: true, value: st.N, fmt: (v) => PL.int(v), onInput: PL.debounce((v) => { st.N = v; update(); }, 60), wide: true });
      pn.ctrl.button('再来几局', () => { st.seed = PL.seed(); update(); });
      let G;
      const paths = PL.stage(pn.box(), { height: 330 }, (c, w, hh) => {
        const k = G.paths.length, rowH = hh / k;
        G.paths.forEach((pth, i) => {
          const y0 = i * rowH + rowH / 2;
          let mx = 1; for (const v of pth) mx = Math.max(mx, Math.abs(v));
          const X = (j) => 8 + (j / (pth.length - 1)) * (w - 16), Y = (v) => y0 - (v / mx) * (rowH / 2 - 6);
          c.fillStyle = PL.col('s1'); c.globalAlpha = 0.25;
          c.beginPath(); c.moveTo(X(0), y0);
          pth.forEach((v, j) => c.lineTo(X(j), Y(Math.max(0, v))));
          c.lineTo(X(pth.length - 1), y0); c.closePath(); c.fill();
          c.fillStyle = PL.col('s2'); c.beginPath(); c.moveTo(X(0), y0);
          pth.forEach((v, j) => c.lineTo(X(j), Y(Math.min(0, v))));
          c.lineTo(X(pth.length - 1), y0); c.closePath(); c.fill();
          c.globalAlpha = 1; c.strokeStyle = PL.col('ink2'); c.lineWidth = 1;
          c.beginPath(); pth.forEach((v, j) => (j ? c.lineTo(X(j), Y(v)) : c.moveTo(X(j), Y(v)))); c.stroke();
          c.strokeStyle = PL.col('line'); c.beginPath(); c.moveTo(8, y0); c.lineTo(w - 8, y0); c.stroke();
          c.font = PL.font(11); c.fillStyle = PL.col('ink3'); c.textAlign = 'right';
          c.fillText(`张三领先 ${PL.pct(G.fracs[i], 0)} 的时间`, w - 10, i * rowH + 13);
        });
      });
      const hb = pn.box();
      hb.append(h('div', { class: 'fig-title', text: '3000 局里，"张三领先的时间比例"的分布' }));
      const hist = PL.plot(hb, { height: 300, x: [0, 1], y: [0, 4], xlabel: '张三领先的时间比例', xfmt: (v) => Math.round(v * 100) + '%', yticks: [], legend: [{ label: '模拟', color: 's4', type: 'box' }, { label: '反正弦分布', color: 's2' }], legendPos: 'tr' });
      hist.fn = (p) => {
        p.hist(G.all, { bins: 40, range: [0, 1], color: 's4', alpha: 0.7, density: true });
        p.y = [0, 4];
        p.func((x) => 1 / (Math.PI * Math.sqrt(Math.max(1e-6, x * (1 - x)))), { color: 's2', width: 2.5, n: 400 });
      };
      const stats = pn.stats([
        { key: 'ext', label: '一方领先超过 90% 时间的局', color: 's2', sub: '理论约 41%' },
        { key: 'mid', label: '势均力敌（各领先 40–60%）的局', color: 's1', sub: '理论约 13%' },
        { key: 'chg', label: '平均领先换手次数', color: 's6' },
      ]);
      function game(N, r) {
        let s = 0, ahead = 0, prev = 0, changes = 0, lastSign = 0;
        const path = [0];
        const keep = N <= 4000 ? 1 : Math.ceil(N / 4000);
        for (let i = 1; i <= N; i++) {
          s += r() < 0.5 ? 1 : -1;
          if (s > 0 || (s === 0 && prev > 0)) ahead++;
          const sg = s > 0 ? 1 : s < 0 ? -1 : 0;
          if (sg !== 0) { if (lastSign !== 0 && sg !== lastSign) changes++; lastSign = sg; }
          prev = s;
          if (i % keep === 0) path.push(s);
        }
        return { f: ahead / N, path, changes };
      }
      function update() {
        const r = PL.rng(st.seed);
        const shown = Array.from({ length: 5 }, () => game(st.N, r));
        const all = [], ch = [];
        const r2 = PL.rng(st.seed + 7), T = Math.max(500, Math.min(2500, Math.round(1.2e7 / st.N)));
        for (let t = 0; t < T; t++) { const g = game(st.N, r2); all.push(g.f); ch.push(g.changes); }
        G = { paths: shown.map((g) => g.path), fracs: shown.map((g) => g.f), all };
        stats.set('ext', PL.pct(all.filter((f) => f < 0.1 || f > 0.9).length / all.length, 0), null, 'bad');
        stats.set('mid', PL.pct(all.filter((f) => f >= 0.4 && f <= 0.6).length / all.length, 0));
        stats.set('chg', PL.fmt(M.mean(ch), 1) + ' 次', `只是 √N 的量级（√N = ${PL.fmt(Math.sqrt(st.N), 0)}），远少于直觉`);
        paths.render(); hist.render();
      }
      update();
      PL.prose(root, `
        <h2>U 形的分布</h2>
        <p>直觉告诉我们：游戏是公平的，所以两人领先的时间应该差不多各占一半，最可能的结果是 50%。事实恰好相反。领先时间比例服从<b>反正弦分布</b>：</p>
        <div class="formula">P(领先时间比例 ≤ x) = (2/π) · arcsin(√x)</div>
        <p>它的密度在两端最高、在 50% 处最低。一方领先超过 90% 时间的概率约为 41%，而"势均力敌"（领先时间在 40% 到 60% 之间）只有约 13%。威廉·费勒在他的经典教科书里专门讨论了这个结果，并说这是"概率论里最令人吃惊的结论之一"。</p>
        <p class="try">多点几次"再来几局"：一条曲线大部分时间待在横线的同一侧，是常态而不是例外。</p>

        <h2>为什么</h2>
        <p>一旦有一方领先，比分要回到 0 需要随机游走"回家"，而${PL.link('polya', '一维随机游走')}虽然必然回家，平均需要的时间却是无穷大：回家的时间分布有一条极重的尾巴。所以领先换手的次数只按 √N 增长：抛 1 万次，平均只换手几十次，而不是几千次。每次领先都会持续一段很长、长度难以预料的时间。</p>

        <h2>它意味着什么</h2>
        <ul>
          <li><b>不要从长期领先推断实力</b>：一支球队整个赛季都领先、一位基金经理连续多年跑赢指数，在完全随机的情况下也经常发生。</li>
          <li><b>随机序列比你想的更"成串"</b>：人们想象中的随机是频繁交替的，于是把真随机里的长段当作规律（这正是${PL.link('hothand', '热手')}之争的另一面）。</li>
          <li><b>不能指望"回归"来救你</b>：公平游戏里落后的一方，没有任何力量把他拉回均势，这和${PL.link('regression', '回归均值')}并不矛盾：回归说的是下一次的独立表现，不是累计的比分。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>"公平"不意味着"轮流"。在累积的随机过程里，看起来像实力或趋势的长期领先，往往只是一条随机游走的正常形状。</div>
      `);
    },
  });

  // ======================================================================
  // 遗传漂变
  // ======================================================================
  function binom(n, p, r) {
    if (p <= 0) return 0; if (p >= 1) return n;
    if (n < 40) { let k = 0; for (let i = 0; i < n; i++) if (r() < p) k++; return k; }
    if (n * p < 25) return Math.min(n, r.poisson(n * p));
    if (n * (1 - p) < 25) return Math.max(0, n - r.poisson(n * (1 - p)));
    return M.clamp(Math.round(n * p + Math.sqrt(n * p * (1 - p)) * r.normal()), 0, n);
  }
  PL.register({
    id: 'drift', cat: 'chance', nav: '遗传漂变：好基因大多会丢失',
    title: '遗传漂变：一个有利的新突变，多半会在几代之内消失',
    hook: '一个让携带者多留 10% 后代的突变，听起来注定会扩散到整个种群。实际上，它有超过 80% 的可能在几代之内就因为运气不好而消失。',
    related: ['smallsample', 'matthew', 'regression'],
    render(root) {
      const st = { N: 1000, s: 0.05, seed: PL.seed() };
      const fix = (N, s) => (Math.abs(s) < 1e-9 ? 1 / N : (1 - Math.exp(-2 * s)) / (1 - Math.exp(-2 * N * s)));
      const pn = PL.panel(root, '一个新突变的命运', '种群大小 N，每一代从上一代里随机抽 N 个个体作为父母（Wright–Fisher 模型）。新突变一开始只有 1 份拷贝，携带者的繁殖优势为 s。每条线是一个独立的突变，纵轴是它在种群里的频率。').cols(2);
      pn.ctrl.slider({ label: '种群大小 N', min: 10, max: 3000, step: 10, log: true, value: st.N, fmt: (v) => PL.int(v), onInput: PL.debounce((v) => { st.N = v; update(); }, 80) });
      pn.ctrl.slider({ label: '繁殖优势 s', min: -0.03, max: 0.15, step: 0.005, value: st.s, fmt: (v) => PL.signedPct(v, 1), onInput: PL.debounce((v) => { st.s = v; update(); }, 80) });
      pn.ctrl.button('再来一批突变', () => { st.seed = PL.seed(); update(); });
      let S;
      const tr = PL.plot(pn.box(), { height: 300, x: [1, 100], y: [1e-3, 1], xlog: true, ylog: true, xlabel: '代数（对数刻度）', ylabel: '突变的频率（对数刻度）', yfmt: (v) => (v >= 0.01 ? Math.round(v * 100) + '%' : +(v * 100).toPrecision(1) + '%') });
      tr.fn = (p) => {
        S.shown.forEach((path) => { const fixed = path[path.length - 1] >= 1; p.line(path.map((_, i) => i + 1), path, { color: fixed ? 's3' : 's2', width: fixed ? 2 : 1, alpha: fixed ? 0.95 : 0.4 }); });
      };
      const cb = pn.box();
      cb.append(h('div', { class: 'fig-title', text: '最终扩散到整个种群（固定）的概率' }));
      const ch = PL.plot(cb, { height: 300, x: [-0.03, 0.15], y: [0, 0.3], xlabel: '繁殖优势 s', xfmt: (v) => Math.round(v * 100) + '%', yfmt: (v) => Math.round(v * 100) + '%', legend: [{ label: '理论（Kimura）', color: 's3' }, { label: '近似 2s（Haldane）', color: 's7', dash: [5, 4] }, { label: '模拟', color: 'ink', type: 'dot' }], legendPos: 'tl' });
      ch.fn = (p) => {
        p.func((s) => Math.max(0, 2 * s), { color: 's7', dash: [5, 4], width: 1.5 });
        p.func((s) => fix(st.N, s), { color: 's3', width: 2.5, n: 300 });
        p.hline(1 / st.N, { color: 'ink3', label: '中性突变 1/N', align: 'left' });
        p.point(st.s, S.sim, { color: 'ink' });
      };
      const stats = pn.stats([
        { key: 'sim', label: '模拟：最终扩散到全种群', color: 's3' },
        { key: 'th', label: 'Kimura 理论值', color: 's1' },
        { key: 'lost', label: '在 10 代之内就消失的', color: 's2' },
      ]);
      function update() {
        const r = PL.rng(st.seed), N = st.N, s = st.s, R = 400;
        let fixed = 0, early = 0;
        const shown = [];
        let maxT = 20;
        for (let k = 0; k < R; k++) {
          let c = 1, t = 0;
          const path = k < 70 ? [1 / N] : null;
          while (c > 0 && c < N && t < 40 * N) {
            const p = c / N, p2 = (p * (1 + s)) / (1 + p * s);
            c = binom(N, p2, r); t++;
            if (path) path.push(c / N);
          }
          if (c >= N) fixed++;
          if (c === 0 && t <= 10) early++;
          if (path) { shown.push(path); if (c >= N) maxT = Math.max(maxT, t); }
        }
        if (!shown.some((p) => p[p.length - 1] >= 1)) maxT = Math.max(maxT, ...shown.map((p) => p.length));
        S = { shown, sim: fixed / R };
        tr.setX(1, Math.max(10, Math.min(maxT * 1.2, 40 * N)));
        tr.setY(0.7 / N, 1);
        tr.o.yticks = [0.001, 0.01, 0.1, 1].filter((v) => v >= 0.7 / N);
        ch.setY(0, Math.max(0.05, fix(N, 0.15) * 1.1));
        stats.set('sim', PL.pct(fixed / R, 1), `${R} 个独立突变`);
        stats.set('th', PL.pct(fix(N, s), 2), s > 0 ? `≈ 2s = ${PL.pct(2 * s, 0)}；直觉以为是 100%` : s < 0 ? '有害突变也可能固定（小种群里）' : '中性：1/N');
        stats.set('lost', PL.pct(early / R, 0), null, s > 0 ? 'bad' : '');
        tr.render(); ch.render();
      }
      update();
      PL.prose(root, `
        <h2>运气比优势更重要</h2>
        <p>一个刚出现的突变只有 1 份拷贝。下一代它能留下几份，取决于这一个携带者生了几个后代、后代又有几个活下来，这是一个均值为 1 + s 的随机数，有相当大的概率是 0。只要有一代运气不好，突变就永远消失了，再大的优势也来不及发挥。1927 年，J. B. S. 霍尔丹算出：在大种群里，优势为 s 的新突变最终扩散到全种群的概率只有约 <b>2s</b>。s = 1% 时只有 2%；s = 10% 时也只有约 18%。</p>
        <div class="formula">固定概率（Kimura）u = (1 − e<sup>−2s</sup>) / (1 − e<sup>−2Ns</sup>) ≈ 2s（N 大、s 小时）</div>
        <p class="try">保持 s = +5%，看大多数红线在最初几代就跌回 0，只有少数绿线冲到 100%。再把种群调到 20、把 s 调成 −1%：有害突变也会偶尔固定，在小种群里，随机漂变压倒了自然选择。</p>

        <h2>中性理论</h2>
        <p>当 |s| 小于大约 1/(2N) 时，选择的作用弱于抽样噪声，突变的命运基本由漂变决定，就像中性突变一样（固定概率 1/N）。木村资生 1968 年提出的<b>分子进化中性理论</b>认为，分子层面的大部分差异正是这样积累下来的，而不是自然选择塑造的。这在当时引起了激烈争论，如今已经成为分子进化研究的基准模型。</p>
        <p>它也解释了"瓶颈"和"奠基者效应"：从少数个体开始的种群，基因组成很大程度上是偶然的，某些罕见遗传病在特定人群里频率偏高就源于此。</p>
        <div class="takeaway"><b>带走什么：</b>"更好的东西终将胜出"需要足够大的样本和足够长的时间。在起步阶段，随机性远比质量重要：大多数好的突变、好的产品、好的想法，都在还没来得及证明自己时就因为运气消失了。这和${PL.link('smallsample', '小样本霸占两头')}、${PL.link('matthew', '马太效应')}是同一类现象。</div>
      `);
    },
  });

  // ======================================================================
  // 随机共振
  // ======================================================================
  PL.register({
    id: 'resonance', cat: 'chance', nav: '随机共振：加噪声听得更清',
    title: '随机共振：往信号里加一点噪声，反而能把它检测出来',
    hook: '一个弱到永远达不到阈值的信号，探测器完全看不见它。加入适量的随机噪声，信号会在探测器的输出里清晰地浮现出来；噪声太多，它又被淹没了。',
    related: ['kapitza', 'sync', 'doubledescent'],
    render(root) {
      const TH = 1, AMP = 0.7;
      const st = { sigma: 0.35, seed: PL.seed() };
      const pn = PL.panel(root, '一个阈值探测器', '探测器只在输入超过阈值 1 时才"放电"。信号是幅度 0.7 的正弦波，永远到不了阈值。我们往输入里加入强度为 σ 的随机噪声。');
      pn.ctrl.slider({ label: '噪声强度 σ', min: 0, max: 2, step: 0.01, value: st.sigma, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.sigma = v; update(); }, wide: true });
      pn.ctrl.button('换一段噪声', () => { st.seed = PL.seed(); update(); });
      let TS;
      const ts = PL.plot(pn.box(), { height: 250, x: [0, 4], y: [-2.6, 3.2], xlabel: '时间（信号周期）', yticks: [-2, -1, 0, 1, 2], legend: [{ label: '信号', color: 's1' }, { label: '信号 + 噪声', color: 's7' }, { label: '探测器放电', color: 's2' }], legendPos: 'bl' });
      ts.fn = (p) => {
        p.line(TS.t, TS.x, { color: 's7', width: 0.8, alpha: 0.6 });
        p.func((t) => AMP * Math.sin(2 * Math.PI * t), { color: 's1', width: 2.5 });
        p.hline(TH, { color: 's2', dash: [5, 4], label: '阈值', align: 'right' });
        TS.t.forEach((t, i) => { if (TS.fire[i]) p.line([t, t], [2.6, 3.1], { color: 's2', width: 1.2 }); });
      };
      const row = h('div', { class: 'figs two' });
      pn.fig.append(row);
      const left = h('div', { class: 'fig' }), right = h('div', { class: 'fig' });
      row.append(left, right);
      left.append(h('div', { class: 'fig-title', text: '输出和信号的相关程度 vs. 噪声强度' }));
      const corr = PL.plot(left, { height: 250, x: [0, 2], y: [0, 0.5], xlabel: '噪声强度 σ', ylabel: '相关系数' });
      const curve = (() => {
        const r = PL.rng(3), ss = M.linspace(0.02, 2, 60), ys = [];
        for (const sg of ss) {
          const n = 12000, a = [], b = [];
          for (let i = 0; i < n; i++) { const t = i / 200, sig = AMP * Math.sin(2 * Math.PI * t); a.push(sig); b.push(sig + sg * r.normal() > TH ? 1 : 0); }
          const c = M.corr(a, b); ys.push(isFinite(c) ? c : 0);
        }
        return { ss: [0, ...ss], ys: [0, ...ys] };
      })();
      corr.fn = (p) => {
        p.line(curve.ss, curve.ys, { color: 's3', width: 2.5 });
        p.point(st.sigma, TS.corr, { color: 's2' });
      };
      right.append(h('div', { class: 'fig-title', text: '同样的原理用在图像上：一张"太淡"的图' }));
      const img = PL.stage(right, { height: 250 }, (c, w, hh) => {
        const W0 = 180, H0 = 72, cs = Math.min((w - 10) / W0, (hh - 10) / H0);
        const ox = (w - W0 * cs) / 2, oy = (hh - H0 * cs) / 2;
        const r = PL.rng(st.seed + 99);
        c.fillStyle = PL.col('paper'); c.fillRect(ox, oy, W0 * cs, H0 * cs);
        c.fillStyle = PL.col('ink');
        for (let y = 0; y < H0; y++) for (let x = 0; x < W0; x++) {
          const v = INT[y * W0 + x] + st.sigma * r.normal();
          if (v > TH) c.fillRect(ox + x * cs, oy + y * cs, cs + 0.3, cs + 0.3);
        }
      });
      right.append(h('div', { class: 'fig-cap', text: '原图的每个像素都低于阈值（文字处 0.75，背景 0.25），没有噪声时什么都显示不出来。' }));
      const INT = (() => {
        const W0 = 180, H0 = 72, cv = document.createElement('canvas');
        cv.width = W0; cv.height = H0;
        const x = cv.getContext('2d');
        x.fillStyle = '#000'; x.fillRect(0, 0, W0, H0);
        x.fillStyle = '#fff'; x.font = `900 52px ${PL.col('sans')}`; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('随机共振', W0 / 2, H0 / 2 + 3);
        const d = x.getImageData(0, 0, W0, H0).data, out = new Float32Array(W0 * H0);
        for (let i = 0; i < W0 * H0; i++) out[i] = 0.25 + 0.5 * (d[i * 4] / 255);
        return out;
      })();
      const stats = pn.stats([
        { key: 'fire', label: '放电次数（这 4 个周期）', color: 's2' },
        { key: 'corr', label: '输出与信号的相关', color: 's3' },
        { key: 'best', label: '最佳噪声强度', color: 's7' },
      ]);
      function update() {
        const r = PL.rng(st.seed), n = 800;
        const t = [], x = [], fire = [];
        for (let i = 0; i < n; i++) { const tt = (4 * i) / n, s = AMP * Math.sin(2 * Math.PI * tt), v = s + st.sigma * r.normal(); t.push(tt); x.push(M.clamp(v, -2.55, 2.55)); fire.push(v > TH); }
        let k = 1; while (k < curve.ss.length - 1 && curve.ss[k] < st.sigma) k++;
        const c0 = curve.ys[k - 1] + (curve.ys[k] - curve.ys[k - 1]) * ((st.sigma - curve.ss[k - 1]) / (curve.ss[k] - curve.ss[k - 1] || 1));
        TS = { t, x, fire, corr: st.sigma === 0 ? 0 : c0 };
        const bi = curve.ys.indexOf(Math.max(...curve.ys));
        stats.set('fire', String(fire.filter(Boolean).length), st.sigma === 0 ? '信号本身永远到不了阈值' : '');
        stats.set('corr', PL.fmt(TS.corr, 3), null, TS.corr > 0.3 ? 'good' : '');
        stats.set('best', 'σ ≈ ' + PL.fmt(curve.ss[bi], 2));
        ts.render(); corr.render(); img.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>没有噪声时，信号永远低于阈值，探测器一次也不放电，输出里没有任何关于信号的信息。加入少量噪声后，"信号 + 噪声"偶尔会越过阈值，而越过阈值最容易发生在信号的波峰附近，于是放电的时刻开始跟着信号的节奏走：输出里出现了信号。噪声继续增大，探测器在任何时刻都可能放电，信号又被淹没。所以输出与信号的相关程度随噪声<b>先升后降</b>，中间有一个最佳的噪声强度。这就是<b>随机共振</b>。</p>
        <p class="try">拖动噪声强度，同时看右边那张图：σ = 0 时一片空白，σ ≈ 0.3 时"随机共振"四个字最清楚，σ 很大时变成满屏雪花。</p>

        <h2>它在哪里</h2>
        <ul>
          <li><b>冰期的节律</b>：这个概念最早由 Benzi 等人（1981）在研究冰期周期时提出：地球轨道变化带来的日照变化很弱，单靠它不足以让气候在冰期和间冰期之间切换，加上气候系统自身的随机波动后，切换恰好跟上了轨道周期。</li>
          <li><b>生物感官</b>：Douglass 等人（1993, <i>Nature</i>）发现，小龙虾尾部的机械感受器在适量的水流噪声下，能更好地探测到微弱的周期性水流；后来在匙吻鲟捕食、人类的触觉和平衡感上也观察到了类似现象。有研究尝试用带微弱振动的鞋垫改善老年人的平衡。</li>
          <li><b>工程</b>：模数转换里的"抖动"（dither）是有意加入的噪声，用来消除量化带来的规则误差，让低于一个量化级的细节在平均后显现出来。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>在有阈值的非线性系统里，噪声不只是敌人。适量的随机性能帮微弱的信号越过门槛，这和${PL.link('kapitza', '卡皮查摆')}里"晃动带来稳定"一样，是非线性系统的反直觉之处。</div>
      `);
    },
  });

  // ======================================================================
  // 马太效应
  // ======================================================================
  PL.register({
    id: 'matthew', cat: 'chance', nav: '马太效应：早期运气锁定结局',
    title: '马太效应：最后谁胜出，常常是开头几步的运气决定的',
    hook: '一个袋子里一红一蓝两个球。每次摸出一个，放回去，再加一个同色的球。摸一万次后红球占多少？答案可以是 0 到 100% 之间的任何数，而且几乎在最初几十次就定下来了。',
    related: ['drift', 'friends', 'survivor', 'winners'],
    render(root) {
      // ---- Pólya urn ----
      const st = { a: 1, seed: PL.seed() };
      const pa = PL.panel(root, '波利亚的罐子', '每条线是一个独立的罐子，纵轴是红球的比例。初始时红、蓝球各 a 个。').cols(2);
      pa.ctrl.slider({ label: '初始每种颜色的球数 a', min: 1, max: 100, step: 1, log: true, value: st.a, fmt: (v) => v + ' 个', onInput: PL.debounce((v) => { st.a = v; upA(); }, 50) });
      pa.ctrl.button('重新开始', () => { st.seed = PL.seed(); upA(); });
      let U;
      const tr = PL.plot(pa.box(), { height: 300, x: [0, 2000], y: [0, 1], xlabel: '摸球次数', ylabel: '红球比例', yfmt: (v) => Math.round(v * 100) + '%' });
      tr.fn = (p) => { U.paths.forEach((pth, i) => p.line(U.xs, pth, { color: i % 2 ? 's2' : 's1', width: 1.2, alpha: 0.6 })); };
      const hb = pa.box();
      hb.append(h('div', { class: 'fig-title', text: '1000 个罐子最终的红球比例' }));
      const hist = PL.plot(hb, { height: 300, x: [0, 1], y: [0, 1], yticks: [], xlabel: '最终的红球比例', xfmt: (v) => Math.round(v * 100) + '%' });
      hist.fn = (p) => p.hist(U.finals, { bins: 25, range: [0, 1], color: 's4', alpha: 0.75, frac: true, autoY: 1.25 });
      const sa = pa.stats([
        { key: 'sd', label: '最终比例的离散程度（标准差）', color: 's4', sub: 'a = 1 时理论约 29%（均匀分布）' },
        { key: 'early', label: '第 50 次时就"大局已定"的比例', color: 's6', sub: '与最终比例相差不到 10 个百分点' },
      ]);
      function urn(a, n, r, record) {
        let red = a, tot = 2 * a;
        const path = record ? [] : null;
        let at50 = 0;
        for (let i = 1; i <= n; i++) {
          if (r() < red / tot) red++;
          tot++;
          if (i === 50) at50 = red / tot;
          if (record && i % 10 === 0) path.push(red / tot);
        }
        return { final: red / tot, path, at50 };
      }
      function upA() {
        const r = PL.rng(st.seed), n = 2000;
        const paths = [];
        for (let k = 0; k < 24; k++) paths.push(urn(st.a, n, r, true).path);
        const finals = [];
        let early = 0;
        for (let k = 0; k < 1000; k++) { const u = urn(st.a, n, r, false); finals.push(u.final); if (Math.abs(u.at50 - u.final) < 0.1) early++; }
        U = { paths, finals, xs: paths[0].map((_, i) => (i + 1) * 10) };
        sa.set('sd', PL.pct(M.sd(finals), 1));
        sa.set('early', PL.pct(early / 1000, 0));
        tr.render(); hist.render();
      }
      upA();

      // ---- MusicLab ----
      const ml = { alpha: 1, seed: PL.seed() };
      const SONGS = 30, WORLDS = 6;
      const pm = PL.panel(root, '音乐实验室：同样的 30 首歌，6 个平行世界', '每首歌有一个固定的"真实质量"（听完后被下载的概率）。听众按照下载榜决定先听哪首：被下载越多，越容易被选中（影响强度 α）。6 个世界的歌和听众完全相同，只是各自独立地演化。').cols(2);
      pm.ctrl.slider({ label: '社会影响强度 α', min: 0, max: 1.6, step: 0.05, value: ml.alpha, fmt: (v) => PL.fmt(v, 2), onInput: PL.debounce((v) => { ml.alpha = v; upM(); }, 60) });
      pm.ctrl.button('重新演化', () => { ml.seed = PL.seed(); upM(); });
      const quality = (() => { const r = PL.rng(48); return Array.from({ length: SONGS }, () => 0.2 + 0.6 * r()).sort((a, b) => b - a); })();
      let MW;
      const sc = PL.plot(pm.box(), { height: 300, x: [0.5, SONGS + 0.5], y: [0, 0.4], xlabel: '歌曲（按真实质量排序，左边最好）', ylabel: '下载份额', yfmt: (v) => Math.round(v * 100) + '%', xticks: [1, 5, 10, 15, 20, 25, 30] });
      sc.fn = (p) => {
        const mx = Math.max(0.12, ...MW.shares.flat()) * 1.1;
        p.y = [0, mx];
        p.line(quality.map((_, i) => i + 1), quality.map((q) => (q / M.sum(quality))), { color: 'ink3', dash: [4, 4], width: 1.5 });
        const cols = ['s1', 's2', 's3', 's4', 's5', 's6'];
        MW.shares.forEach((sh, w) => p.dots(sh.map((_, i) => i + 1 + (w - 2.5) * 0.08), sh, { color: cols[w], r: 3.2, alpha: 0.85 }));
      };
      const rk = pm.box();
      rk.append(h('div', { class: 'fig-title', text: '各个世界的冠军是哪首歌（真实质量排名）' }));
      const rankEl = h('div', { class: 'panel-html' });
      rk.append(rankEl);
      const sm = pm.stats([
        { key: 'gini', label: '不平等程度（基尼系数）', color: 's2' },
        { key: 'unpred', label: '不可预测性', color: 's4', sub: '同一首歌在不同世界的份额差异' },
        { key: 'best', label: '最好的那首歌拿到冠军的世界', color: 's3' },
      ]);
      function world(r) {
        const d = new Float64Array(SONGS);
        for (let l = 0; l < 2500; l++) {
          let tot = 0; const w = new Float64Array(SONGS);
          for (let i = 0; i < SONGS; i++) { w[i] = Math.pow(d[i] + 1, ml.alpha); tot += w[i]; }
          let u = r() * tot, j = 0; while (j < SONGS - 1 && u > w[j]) { u -= w[j]; j++; }
          if (r() < quality[j]) d[j]++;
        }
        const s = M.sum(d);
        return Array.from(d, (v) => v / s);
      }
      const gini = (a) => { const s = a.slice().sort((x, y) => x - y), n = s.length; let g = 0; s.forEach((v, i) => (g += (2 * (i + 1) - n - 1) * v)); return g / (n * M.sum(s)); };
      function upM() {
        const r = PL.rng(ml.seed);
        const shares = Array.from({ length: WORLDS }, () => world(r));
        MW = { shares };
        const champs = shares.map((sh) => sh.indexOf(Math.max(...sh)) + 1);
        rankEl.innerHTML = champs.map((c, w) => `<span style="display:inline-block;margin:2px 6px 2px 0;padding:2px 9px;border-radius:999px;background:var(--grid)"><b style="color:var(--${['s1', 's2', 's3', 's4', 's5', 's6'][w]})">●</b> 世界 ${w + 1}：第 ${c} 好的歌</span>`).join('');
        let unp = 0;
        for (let i = 0; i < SONGS; i++) { let s = 0, c = 0; for (let a = 0; a < WORLDS; a++) for (let b = a + 1; b < WORLDS; b++) { s += Math.abs(shares[a][i] - shares[b][i]); c++; } unp += s / c; }
        sm.set('gini', PL.fmt(M.mean(shares.map(gini)), 2), ml.alpha === 0 ? '只反映质量差异' : '');
        sm.set('unpred', PL.fmt(unp / SONGS * 100, 2));
        sm.set('best', `${champs.filter((c) => c === 1).length} / ${WORLDS}`);
        sc.render();
      }
      upM();
      PL.prose(root, `
        <h2>罐子里的路径依赖</h2>
        <p>这个罐子模型由乔治·波利亚在 1923 年研究。每次摸到红球，红球就多一个，下次更容易再摸到红球：成功带来更多成功。结果是，红球比例最终会收敛到一个稳定的值，但这个值本身是随机的：从一红一蓝开始，它在 0 到 100% 之间<b>均匀分布</b>。而且比例几乎在最初几十次就基本确定了，后面的上万次只是把它锁住。</p>
        <p class="try">把初始球数 a 从 1 调到 100：起点的"底子"越厚，早期运气的影响越小，最终比例越集中在 50% 附近（极限分布是 Beta(a, a)）。</p>

        <h2>音乐实验室</h2>
        <p>2006 年，Salganik、Dodds 和 Watts 在《科学》上发表了一个大规模在线实验：14,341 名参与者在一个网站上试听并下载 48 首无名乐队的歌曲。参与者被随机分到 8 个"社会影响世界"（能看到同一世界里其他人的下载数）和 1 个"独立世界"（看不到）。结果：</p>
        <ul>
          <li>能看到下载数时，热门歌曲的份额更集中，<b>不平等程度显著上升</b>；</li>
          <li>同一首歌在不同世界的命运差别很大，<b>结果变得难以预测</b>；</li>
          <li>质量确实有作用：最好的歌很少惨败，最差的歌很少大热，但中间的任何结果都有可能。</li>
        </ul>
        <p class="try">把社会影响强度 α 从 0 拉到 1.5：份额从"大致跟着质量走"变成"每个世界各捧出一个爆款"，而且各世界的冠军常常不是最好的那首歌。</p>

        <h2>到处都是马太效应</h2>
        <p>社会学家罗伯特·默顿 1968 年用《马太福音》里的"凡有的，还要加给他"命名了这个现象：已经出名的科学家，同样的工作能得到更多关注和引用。同样的"优先连接"机制会长出${PL.link('friends', '无标度网络')}（Barabási–Albert 模型），也会在应用商店、书籍销量、城市规模上造出极端不平等的分布。</p>
        <div class="takeaway"><b>带走什么：</b>当成功会自我强化时，最终的赢家在很大程度上是早期运气的产物，事后的成功故事（"它当然会火，因为……"）大多是${PL.link('survivor', '幸存者偏差')}式的追认。真正能从中得出的结论是：在有正反馈的市场里，结果是一个分布，而不是一个必然。</div>
      `);
    },
  });
})();
