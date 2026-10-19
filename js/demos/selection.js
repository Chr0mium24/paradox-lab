/* 类别三：选择 + 噪声 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 回归均值
  // ======================================================================
  PL.register({
    id: 'regression', cat: 'selection', nav: '回归均值：表扬让人退步？',
    title: '回归均值：被表扬的人下次变差，被批评的人下次变好',
    hook: '一次特别好的表现里，总有一部分是运气。下一次运气重新抽签，成绩就会往中间回落，和你做了什么无关。',
    related: ['smallsample', 'winners', 'stein', 'screening'],
    render(root) {
      const st = { sigma: 1, q: 0.1, mode: 'exam', seed: PL.seed() };
      const TXT = {
        exam: { x: '第一次考试', y: '第二次考试', top: '尖子组（第一次前 q）', bot: '后进组（第一次后 q）' },
        pilot: { x: '这次着陆的得分', y: '下次着陆的得分', top: '被表扬的（最好的 q）', bot: '被批评的（最差的 q）' },
      };
      const pn = PL.panel(root, '同一批人，考两次', '每个人的成绩 = 真实水平 + 随机噪声。两次考试之间，<b>没有任何人的水平发生变化</b>。');
      pn.ctrl.seg({ options: [{ value: 'exam', label: '考试' }, { value: 'pilot', label: '飞行教官' }], value: st.mode, onChange: (v) => { st.mode = v; update(); } });
      pn.ctrl.slider({ label: '噪声大小 σ', min: 0, max: 2, step: 0.05, value: st.sigma, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.sigma = v; update(); } });
      pn.ctrl.slider({ label: '挑出的比例 q', min: 0.02, max: 0.5, step: 0.01, value: st.q, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.q = v; update(); } });
      pn.ctrl.button('重新抽样', () => { st.seed = PL.seed(); update(); });
      const ch = PL.plot(pn.box(), {
        height: 380, x: [-4, 4], y: [-4, 4],
        legend: [{ label: 'y = x（没有回归）', color: 'ink3', dash: [4, 4] }, { label: '实际的期望：y = r·x', color: 's4' }], legendPos: 'tl',
      });
      const stats = pn.stats([
        { key: 'top', label: '', color: 's2' },
        { key: 'bot', label: '', color: 's1' },
        { key: 'r', label: '两次成绩的相关系数 r', color: 's4', sub: '理论 1 ÷ (1 + σ²)' },
      ]);
      let D;
      ch.fn = (p) => {
        const { x, y, top, bot, g } = D;
        const cols = x.map((_, i) => (top[i] ? 's2' : bot[i] ? 's1' : 's7'));
        p.dots(x, y, { r: 2.6, alpha: 0.6, colors: cols });
        p.func((v) => v, { color: 'ink3', dash: [4, 4], width: 1.5 });
        const r = 1 / (1 + st.sigma * st.sigma);
        p.func((v) => r * v, { color: 's4', width: 2 });
        for (const [k, col] of [['top', 's2'], ['bot', 's1']]) {
          const m1 = g[k][0], m2 = g[k][1];
          p.arrow(m1, m1, m1, m2, { color: col, width: 2.5, head: 9 });
          p.point(m1, m1, { color: col, hollow: true, r: 6 });
          p.point(m1, m2, { color: col, r: 6 });
        }
      };
      function update() {
        const r = PL.rng(st.seed), n = 700;
        const x = [], y = [];
        for (let i = 0; i < n; i++) { const s = r.normal(); x.push(s + st.sigma * r.normal()); y.push(s + st.sigma * r.normal()); }
        const hi = M.quantile(x, 1 - st.q), lo = M.quantile(x, st.q);
        const top = x.map((v) => v >= hi), bot = x.map((v) => v <= lo);
        const gm = (mask) => [M.mean(x.filter((_, i) => mask[i])), M.mean(y.filter((_, i) => mask[i]))];
        D = { x, y, top, bot, g: { top: gm(top), bot: gm(bot) } };
        const R = 3.4 * Math.sqrt(1 + st.sigma * st.sigma);
        ch.setX(-R, R); ch.setY(-R, R);
        const T = TXT[st.mode];
        ch.o.xlabel = T.x; ch.o.ylabel = T.y;
        const lab = (k) => T[k].replace('q', PL.pct(st.q, 0));
        stats.el.children[0].querySelector('.stat-l').textContent = lab('top');
        stats.el.children[1].querySelector('.stat-l').textContent = lab('bot');
        const [t1, t2] = D.g.top, [b1, b2] = D.g.bot;
        stats.set('top', `${PL.fmt(t1, 2)} → ${PL.fmt(t2, 2)}`, st.mode === 'pilot' ? '"表扬之后就退步"' : '第二次往中间回落', 'bad');
        stats.set('bot', `${PL.fmt(b1, 2)} → ${PL.fmt(b2, 2)}`, st.mode === 'pilot' ? '"批评之后就进步"' : '第二次往中间回升', 'good');
        stats.set('r', PL.fmt(M.corr(x, y), 2));
        ch.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>每次考试的成绩 = 真实水平 + 运气。第一次考得特别好的人，往往是"水平高"再加上"运气好"；到了第二次，水平还在，运气却重新抽签，平均回到 0，所以他们第二次的平均分会<b>往中间回落</b>。考得特别差的人正好相反，第二次会进步。这期间没有任何人的水平发生变化。</p>
        <div class="formula">第二次的期望 = r × 第一次的成绩　　r = 真实水平的方差 ÷ (真实水平的方差 + 噪声的方差)</div>
        <p>噪声越大，r 越小，回归越剧烈；噪声为 0（r = 1）时完全没有回归。</p>
        <p class="try">切到"飞行教官"模式：被表扬的学员下一次变差了，被批评的学员下一次变好了。但这个模拟里，表扬和批评根本不起任何作用。</p>

        <h2>卡尼曼和飞行教官</h2>
        <p>丹尼尔·卡尼曼给以色列空军的飞行教官讲"奖励比惩罚更有效"时，一位教官反驳：每次他表扬学员动作漂亮，学员下次就会变差；每次他骂学员动作糟糕，学员下次就会变好。卡尼曼意识到这正是回归均值。教官看到的规律是真的，原因却不是表扬和批评，而是一次特别好或特别差的表现本身就含有很大的运气成分。</p>

        <h2>它冒充过很多东西</h2>
        <ul>
          <li><b>"《体育画报》封面诅咒"</b>：能上封面的运动员通常刚刚经历一段巅峰期，之后自然回落。</li>
          <li><b>"整治见效了"</b>：在事故最多的路口装上摄像头，第二年事故减少了。可即使不装，最差的那一批路口第二年也大概率会好转。</li>
          <li><b>"偏方治好了我的病"</b>：人在最难受的时候才会去试偏方，而最难受的时候过后，往往就是好转。</li>
          <li><b>高尔顿的身高研究</b>：特别高的父母，孩子平均没那么高；特别矮的父母，孩子平均没那么矮。统计学里"回归"这个词就来自这里。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>只要你是<b>因为表现极端才去关注</b>某个人或某件事，下一次的回落或反弹就是可以预期的。要判断一项干预有没有效，必须有一个同样极端、但没有被干预的<b>对照组</b>。</div>
      `);
    },
  });

  // ======================================================================
  // 小样本霸占两头
  // ======================================================================
  PL.register({
    id: 'smallsample', cat: 'selection', nav: '小样本：最好和最差都是它',
    title: '小样本霸占两头：发病率最高和最低的，都是小县',
    hook: '所有县的真实发病率一模一样，排名最高的 5% 和最低的 5%，却几乎全是人口最少的县。',
    related: ['stein', 'regression', 'winners'],
    render(root) {
      const P0 = 3e-4, K = 2500;
      const st = { tau: 0, shrink: false, seed: PL.seed() };
      const pn = PL.panel(root, '2500 个县的发病率', '横轴是人口（对数刻度），纵轴是每 10 万人的病例数。<b style="color:var(--s2)">红点</b>：排名最高的 5%；<b style="color:var(--s1)">蓝点</b>：排名最低的 5%。灰色漏斗是"纯噪声"能造成的波动范围（±2 个标准误）。');
      pn.ctrl.toggle({ label: '收缩估计（经验贝叶斯）', value: st.shrink, onChange: (v) => { st.shrink = v; update(); } });
      pn.ctrl.slider({ label: '各县的真实差异', min: 0, max: 0.6, step: 0.02, value: st.tau, fmt: (v) => (v === 0 ? '完全相同' : '±' + PL.pct(v, 0)), onInput: (v) => { st.tau = v; gen(); update(); } });
      pn.ctrl.button('重新抽样', () => { st.seed = PL.seed(); gen(); update(); });
      const ch = PL.plot(pn.box(), { height: 380, x: [500, 2e6], y: [0, 160], xlog: true, xlabel: '县人口', ylabel: '每 10 万人病例数' });
      const stats = pn.stats([
        { key: 'all', label: '所有县的人口中位数', color: 's7' },
        { key: 'top', label: '排名最高 5% 的人口中位数', color: 's2' },
        { key: 'bot', label: '排名最低 5% 的人口中位数', color: 's1' },
        { key: 'hit', label: '找对真正高风险县的比例', color: 's3', sub: '估计的前 5% ∩ 真实的前 5%' },
      ]);
      let D;
      function gen() {
        const r = PL.rng(st.seed);
        const n = [], p = [], cases = [];
        for (let i = 0; i < K; i++) {
          const pop = Math.round(500 * Math.pow(4000, r()));
          const pi = P0 * Math.exp(st.tau * r.normal() - (st.tau * st.tau) / 2);
          n.push(pop); p.push(pi); cases.push(r.poisson(pop * pi));
        }
        D = { n, p, cases, jit: Array.from({ length: K }, () => r()) };
      }
      function rankSets(vals) {
        const idx = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b] || D.jit[a] - D.jit[b]);
        const k = Math.round(K * 0.05);
        const bot = new Set(idx.slice(0, k)), top = new Set(idx.slice(-k));
        return { top, bot };
      }
      let est, sets;
      ch.fn = (p) => {
        const ns = M.logspace(500, 2e6, 120);
        const m = st.shrink ? D.m : P0;
        p.area(ns, ns.map((v) => Math.max(0, (m - 2 * Math.sqrt(m / v)) * 1e5)), ns.map((v) => (m + 2 * Math.sqrt(m / v)) * 1e5), { color: 's7', alpha: 0.12 });
        p.hline(m * 1e5, { color: 'ink3', label: '平均', align: 'right' });
        const cols = D.n.map((_, i) => (sets.top.has(i) ? 's2' : sets.bot.has(i) ? 's1' : 's7'));
        const ys = est.map((v) => Math.min(v * 1e5, p.y[1] * 0.985));
        const order = D.n.map((_, i) => i).sort((a, b) => (cols[a] === 's7') - (cols[b] === 's7')).reverse();
        p.dots(order.map((i) => D.n[i]), order.map((i) => ys[i]), { r: 2.4, alpha: 0.75, colors: order.map((i) => cols[i]) });
      };
      function update() {
        const { n, cases } = D;
        const tn = M.sum(n), tc = M.sum(cases), m = tc / tn;
        D.m = m;
        const raw = cases.map((c, i) => c / n[i]);
        if (st.shrink) {
          let V = 0;
          for (let i = 0; i < K; i++) V += n[i] * (raw[i] - m) ** 2;
          V /= tn;
          const tau2 = Math.max(1e-4 * m * m, V - (m * K) / tn);
          const k = m / tau2;
          est = cases.map((c, i) => (c + m * k) / (n[i] + k));
        } else est = raw;
        sets = rankSets(est);
        const trueSets = rankSets(D.p);
        const med = (s) => M.quantile([...s].map((i) => n[i]), 0.5);
        stats.set('all', PL.int(M.quantile(n, 0.5)) + ' 人');
        stats.set('top', PL.int(med(sets.top)) + ' 人', null, med(sets.top) < M.quantile(n, 0.5) / 3 ? 'bad' : '');
        stats.set('bot', PL.int(med(sets.bot)) + ' 人', null, med(sets.bot) < M.quantile(n, 0.5) / 3 ? 'bad' : '');
        if (st.tau === 0) stats.set('hit', '—', '真实发病率全都一样，没有"真正的高风险县"');
        else {
          let hit = 0; for (const i of sets.top) if (trueSets.top.has(i)) hit++;
          stats.set('hit', PL.pct(hit / sets.top.size, 0), st.shrink ? '收缩后的排名' : '原始排名');
        }
        ch.render();
      }
      gen(); update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>美国按县统计肾癌发病率，发病率最低的县大多是人口稀少的农村县。很容易编出一个解释：农村空气好、压力小、吃得新鲜。可发病率<b>最高</b>的县，也大多是人口稀少的农村县，同样很容易编出解释：农村医疗条件差、抽烟喝酒多、收入低。（这个例子来自 Wainer 和 Zwerling，卡尼曼在《思考，快与慢》里也讲过。）</p>
        <p>真正的原因是小样本的方差大。一个 500 人的县，多一个病例或少一个病例，发病率就会跳到极高或者变成 0。上面的模拟里，<b>所有县的真实发病率完全相同</b>，但排名最高和最低的 5%，几乎全是小县。</p>
        <div class="formula">样本均值的标准误 = σ ÷ √n　　（棣莫弗公式）</div>
        <p>统计学家 Howard Wainer 把它叫作"最危险的方程"。不是因为它复杂，而是因为人们总是忘记它。</p>

        <h2>代价很高的误判</h2>
        <p>1990 年代末到 2000 年代，盖茨基金会等机构注意到：成绩最好的学校里，小规模学校的比例偏高。于是他们投入了十多亿美元，推动把大学校拆成小学校。后来人们发现，成绩<b>最差</b>的学校里，小规模学校的比例同样偏高。小学校并不更好，只是更"极端"（Wainer, "The Most Dangerous Equation", 2007）。</p>

        <h2>怎么办：收缩</h2>
        <p>打开"收缩估计"：每个县的估计变成（病例数 + k × 全国平均发病率）÷（人口 + k），相当于给每个县都添上 k 个"按全国平均发病"的虚拟居民。k 从数据里估计：县与县之间的真实差异越小，k 越大。大县几乎不受影响，小县被大幅拉向全国平均，极端值也就不再被小县垄断。</p>
        <p class="try">把"真实差异"调大，让一部分县确实是高风险的，再比较原始排名和收缩后的排名，各自能找对多少真正的高风险县。</p>
        <div class="takeaway"><b>带走什么：</b>看任何排行榜（医院手术死亡率、门店业绩、商品评分、城市犯罪率），先看样本量。最好和最差的两头如果都被小样本占据，你看到的大概率是噪声。这就是${PL.link('stein', '斯坦因悖论')}在现实中的样子。</div>
      `);
    },
  });

  // ======================================================================
  // 斯坦因悖论
  // ======================================================================
  const BASEBALL = [
    ['Clemente', 18, 0.346], ['F. Robinson', 17, 0.298], ['F. Howard', 16, 0.276], ['Johnstone', 15, 0.222],
    ['Berry', 14, 0.273], ['Spencer', 14, 0.27], ['Kessinger', 13, 0.263], ['L. Alvarado', 12, 0.21],
    ['Santo', 11, 0.269], ['Swoboda', 11, 0.23], ['Unser', 10, 0.264], ['Williams', 10, 0.256],
    ['Scott', 10, 0.303], ['Petrocelli', 10, 0.264], ['E. Rodriguez', 10, 0.226], ['Campaneris', 9, 0.285],
    ['Munson', 8, 0.316], ['Alvis', 7, 0.2],
  ];
  PL.register({
    id: 'stein', cat: 'selection', nav: '斯坦因悖论：一起往中间拉',
    title: '斯坦因悖论：把毫不相干的估计一起往中间拉，总误差反而变小',
    hook: '同时估计 3 个以上的量时，"每个都用自己的观测值"不是最好的办法，而且不管真值是多少都不是。',
    related: ['smallsample', 'winners', 'highdim', 'regression'],
    render(root) {
      // ---- A: geometry ----
      const ga = { d: 20, th: 4 };
      const pa = PL.panel(root, '为什么：高维里，观测向量总是"太长"', '把 d 个未知量看成 d 维空间里的一个点 θ。每一维的观测噪声方差为 1，合起来是一个半径约 √d 的"噪声壳"，而且在高维里噪声方向几乎总是和 θ 垂直。下图画的就是这种"典型情形"。').cols(2);
      pa.ctrl.slider({ label: '维数 d', min: 3, max: 200, step: 1, log: true, value: ga.d, fmt: (v) => v, onInput: (v) => { ga.d = v; upA(); } });
      pa.ctrl.slider({ label: '真值的长度 ‖θ‖', min: 0, max: 15, step: 0.1, value: ga.th, fmt: (v) => PL.fmt(v, 1), onInput: (v) => { ga.th = v; upA(); } });
      let G;
      const geo = PL.stage(pa.box(), { height: 320 }, (c, w, hh) => {
        const { d, th } = ga, nr = Math.sqrt(d);
        const S = Math.min((w - 70) / Math.max(th + nr * 0.6, 1), (hh - 50) / (nr * 1.15 + 0.5));
        const ox = 34, oy = hh - 28;
        const P = (x, y) => [ox + x * S, oy - y * S];
        const [Ox, Oy] = P(0, 0), [Tx, Ty] = P(th, 0), [Xx, Xy] = P(th, nr), [Jx, Jy] = P(th * G.f, nr * G.f);
        c.setLineDash([4, 4]); c.strokeStyle = PL.col('ink3'); c.lineWidth = 1;
        c.beginPath(); c.arc(Tx, Ty, nr * S, Math.PI, 2 * Math.PI); c.stroke(); c.setLineDash([]);
        c.font = PL.font(12);
        const seg = (x0, y0, x1, y1, col, wdt, dash) => { c.strokeStyle = PL.col(col); c.lineWidth = wdt; c.setLineDash(dash || []); c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); c.setLineDash([]); };
        seg(Ox, Oy, Tx, Ty, 'ink', 2.5);
        seg(Ox, Oy, Xx, Xy, 's7', 1.5, [5, 4]);
        seg(Tx, Ty, Xx, Xy, 's2', 2.5);
        seg(Tx, Ty, Jx, Jy, 's3', 2.5);
        const dot = (x, y, col, lab, dx = 8, dy = -8, al = 'left') => { c.fillStyle = PL.col(col); c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); c.fillStyle = PL.col(col); c.font = PL.font(13, 600); c.textAlign = al; c.fillText(lab, x + dx, y + dy); };
        dot(Ox, Oy, 'ink3', '原点', -6, 18, 'left');
        dot(Tx, Ty, 'ink', 'θ 真值', 8, 18);
        dot(Xx, Xy, 's2', 'X 观测值', 8, -6);
        dot(Jx, Jy, 's3', 'JS 估计', -10, -8, 'right');
        c.font = PL.font(12); c.fillStyle = PL.col('s2'); c.textAlign = 'left';
        c.fillText('误差 = √d = ' + PL.fmt(nr, 2), Tx + 6, (Ty + Xy) / 2);
        c.fillStyle = PL.col('ink3'); c.textAlign = 'center';
        c.fillText('噪声壳（半径 √d）', Tx, Math.max(14, Ty - nr * S - 8));
      });
      const pab = pa.box();
      pab.append(h('div', { class: 'fig-title', text: '误差平方随 ‖θ‖ 的变化（当前 d）' }));
      const gch = PL.plot(pab, { height: 280, x: [0, 15], y: [0, 1.1], xlabel: '真值的长度 ‖θ‖', ylabel: 'JS 误差² ÷ 观测值误差²', legend: [{ label: '观测值（= 1）', color: 's2' }, { label: 'James–Stein', color: 's3' }], legendPos: 'br' });
      gch.fn = (p) => {
        p.hline(1, { color: 's2', dash: [], width: 2 });
        p.func((t) => jsErr(ga.d, t) / ga.d, { color: 's3', width: 2.5 });
        p.point(ga.th, G.err / ga.d, { color: 's3' });
      };
      function jsErr(d, t) { const f = 1 - (d - 2) / (t * t + d); return (1 - f) ** 2 * t * t + f * f * d; }
      const sa = pa.stats([
        { key: 'len', label: '‖X‖² ≈ ‖θ‖² + d', color: 's7' },
        { key: 'f', label: '收缩系数 1 − (d−2)/‖X‖²', color: 's3' },
        { key: 'err', label: '误差²：观测值 → JS', color: 's2' },
      ]);
      function upA() {
        const { d, th } = ga;
        const f = 1 - (d - 2) / (th * th + d);
        G = { f, err: jsErr(d, th) };
        sa.set('len', `${PL.fmt(th * th, 1)} + ${d} = ${PL.fmt(th * th + d, 1)}`, '观测向量比真值长得多');
        sa.set('f', PL.fmt(f, 3));
        sa.set('err', `${PL.fmt(d, 1)} → ${PL.fmt(G.err, 1)}`, null, 'good');
        geo.render(); gch.render();
      }
      upA();

      // ---- B: experiment ----
      const ex = { d: 10, type: 'near', toMean: false, seed: PL.seed(), noiseSeed: PL.seed() };
      const pb = PL.panel(root, '动手：抽真值，加噪声，比一比', '每一行是一个要估计的量。<b>○</b> 真值，<b style="color:var(--s7)">●</b> 观测值（真值 + 方差为 1 的噪声），<b style="color:var(--s3)">●</b> James–Stein 估计。下方统计是同一组真值、重复观测 2000 次的平均结果。').cols(2);
      pb.ctrl.slider({ label: '同时估计几个量 d', min: 3, max: 60, step: 1, value: ex.d, fmt: (v) => v, onInput: (v) => { ex.d = v; upB(true); } });
      pb.ctrl.seg({ label: '真值', options: [{ value: 'near', label: '比较接近' }, { value: 'far', label: '很分散' }, { value: 'mixed', label: '毫不相干' }], value: ex.type, onChange: (v) => { ex.type = v; upB(true); } });
      pb.ctrl.toggle({ label: '往平均值收缩（否则往 0）', value: ex.toMean, onChange: (v) => { ex.toMean = v; upB(true); } });
      pb.ctrl.button('再观测一次', () => { ex.noiseSeed = PL.seed(); upB(false); });
      pb.ctrl.button('换一组真值', () => { ex.seed = PL.seed(); upB(true); });
      const rowsPlot = PL.plot(pb.box(), { height: 340, x: [-6, 6], y: [-0.5, 15.5], yticks: [], xlabel: '数值', pad: { l: 16 } });
      const rk = pb.box();
      rk.append(h('div', { class: 'fig-title', text: 'JS 的平均误差 ÷ 观测值的平均误差（当前真值类型）' }));
      const riskPlot = PL.plot(rk, { height: 300, x: [3, 60], y: [0, 1.1], xlabel: '同时估计的量 d', ylabel: '误差比' });
      function thetas(d, type, seed) {
        const r = PL.rng(seed);
        return Array.from({ length: d }, () => (type === 'near' ? r.normal() : type === 'far' ? 3 * r.normal() : (r() < 0.5 ? -1 : 1) * Math.pow(10, r() * 1.1) * (r() < 0.2 ? 0.1 : 1)));
      }
      function js(X, toMean) {
        const d = X.length;
        const c = toMean ? M.mean(X) : 0;
        let s = 0; for (const v of X) s += (v - c) ** 2;
        const f = Math.max(0, 1 - (d - (toMean ? 3 : 2)) / s);
        return X.map((v) => c + f * (v - c));
      }
      function mc(th, toMean, trials, r) {
        let a = 0, b = 0, win = 0;
        const d = th.length;
        for (let t = 0; t < trials; t++) {
          const X = th.map((v) => v + r.normal());
          const J = js(X, toMean);
          let ea = 0, eb = 0;
          for (let i = 0; i < d; i++) { ea += (X[i] - th[i]) ** 2; eb += (J[i] - th[i]) ** 2; }
          a += ea; b += eb; if (eb < ea) win++;
        }
        return { mle: a / trials, js: b / trials, win: win / trials };
      }
      const sb = pb.stats([
        { key: 'one', label: '这一次的总误差²：观测值 → JS', color: 's7' },
        { key: 'avg', label: '2000 次平均：观测值 → JS', color: 's3' },
        { key: 'win', label: 'JS 胜出的次数', color: 's4' },
      ]);
      let B, curve;
      rowsPlot.fn = (p) => {
        const n = Math.min(16, ex.d);
        for (let i = 0; i < n; i++) {
          const y = 15 - i;
          p.line([p.x[0], p.x[1]], [y, y], { color: 'grid', width: 1 });
          p.arrow(B.X[i], y, B.J[i], y, { color: 's3', width: 1.5, head: 6 });
          p.point(B.th[i], y, { color: 'ink', hollow: true, r: 5 });
          p.dots([B.X[i]], [y], { color: 's7', r: 4 });
          p.dots([B.J[i]], [y], { color: 's3', r: 4 });
        }
        if (ex.d > 16) p.textPx(p.R - 4, p.B - 4, `（只画出前 16 个，共 ${ex.d} 个）`, { align: 'right', color: 'ink3', size: 11 });
        if (ex.toMean) p.vline(M.mean(B.X), { color: 's3', label: '观测值的平均' });
        else p.vline(0, { color: 's3', label: '0' });
      };
      riskPlot.fn = (p) => {
        p.hline(1, { color: 's2', dash: [], width: 2, label: '观测值', align: 'right' });
        p.line(curve.d, curve.ratio, { color: 's3', width: 2.5 });
        p.point(ex.d, B.avg.js / B.avg.mle, { color: 's3' });
      };
      function upB(newTheta) {
        const th = thetas(ex.d, ex.type, ex.seed);
        const r = PL.rng(ex.noiseSeed);
        const X = th.map((v) => v + r.normal());
        const J = js(X, ex.toMean);
        const e = (E) => E.reduce((s, v, i) => s + (v - th[i]) ** 2, 0);
        const avg = mc(th, ex.toMean, 2000, PL.rng(42));
        B = { th, X, J, avg };
        const all = [...th, ...X];
        const lo = Math.min(...all), hi = Math.max(...all), pad = (hi - lo) * 0.08 + 0.5;
        rowsPlot.setX(lo - pad, hi + pad);
        const n = Math.min(16, ex.d);
        rowsPlot.setY(15.5 - n, 15.5);
        sb.set('one', `${PL.fmt(e(X), 1)} → ${PL.fmt(e(J), 1)}`, e(J) < e(X) ? 'JS 赢了这一次' : 'JS 输了这一次（会发生）');
        sb.set('avg', `${PL.fmt(avg.mle, 2)} → ${PL.fmt(avg.js, 2)}`, `观测值的理论平均 = d = ${ex.d}`, 'good');
        sb.set('win', PL.pct(avg.win, 0));
        if (newTheta || !curve) {
          const ds = [];
          for (let d = 3; d <= 60; d += 3) ds.push(d);
          if (!ds.includes(ex.d)) { ds.push(ex.d); ds.sort((a, b) => a - b); }
          curve = { d: ds, ratio: ds.map((d) => { const t = thetas(d, ex.type, ex.seed); const m = mc(t, ex.toMean, 300, PL.rng(d)); return m.js / m.mle; }) };
        }
        rowsPlot.render(); riskPlot.render();
      }
      upB(true);

      // ---- C: baseball ----
      const bb = BASEBALL.map(([name, hits, rest]) => ({ name, y: hits / 45, rest }));
      const ybar = M.mean(bb.map((p) => p.y));
      const s2 = (ybar * (1 - ybar)) / 45;
      const ss = M.sum(bb.map((p) => (p.y - ybar) ** 2));
      const cJS = 1 - ((bb.length - 3) * s2) / ss;
      const lamJS = 1 - cJS;
      const err = (lam) => M.sum(bb.map((p) => (ybar + (1 - lam) * (p.y - ybar) - p.rest) ** 2));
      const bs = { lam: lamJS };
      const pc = PL.panel(root, '真实数据：1970 年的 18 名棒球手', '用每个人赛季前 45 个打数的打击率，预测他赛季剩下的打击率（Efron &amp; Morris, 1975）。滑块控制"往全体平均拉多少"：0 = 只看自己，100% = 所有人都猜平均值。').cols(2);
      const lamS = pc.ctrl.slider({ label: '往平均拉', min: 0, max: 1, step: 0.01, value: bs.lam, fmt: (v) => PL.pct(v, 0), onInput: (v) => { bs.lam = v; upC(); }, wide: true });
      pc.ctrl.button('跳到 James–Stein 的选择', () => { bs.lam = lamJS; lamS.set(lamJS); upC(); });
      const pl = PL.plot(pc.box(), { height: 400, x: [0.13, 0.42], y: [-0.5, 17.5], yticks: [], pad: { l: 92 }, xlabel: '打击率', xfmt: (v) => v.toFixed(2).replace(/^0/, '') });
      pl.fn = (p) => {
        p.vline(ybar, { color: 'ink3', label: '平均 ' + ybar.toFixed(3).replace(/^0/, '') });
        bb.forEach((pp, i) => {
          const y = 17 - i, est = ybar + (1 - bs.lam) * (pp.y - ybar);
          p.line([pp.y, est], [y, y], { color: 's7', width: 1, dash: [2, 3] });
          p.line([est, pp.rest], [y, y], { color: 's2', width: 2, alpha: 0.6 });
          p.dots([pp.y], [y], { color: 's7', r: 3.5 });
          p.point(pp.rest, y, { color: 'ink', hollow: true, r: 4 });
          p.dots([est], [y], { color: 's3', r: 4 });
        });
      };
      pl.after = (p) => bb.forEach((pp, i) => p.textPx(p.L - 6, p.Y(17 - i) + 4, pp.name, { align: 'right', size: 11.5, color: 'ink2', halo: false }));
      const eb = pc.box();
      eb.append(h('div', { class: 'fig-title', text: '18 人的总平方误差 vs. 往平均拉多少' }));
      const ep = PL.plot(eb, { height: 260, x: [0, 1], y: [0, 0.09], xlabel: '往平均拉', xfmt: (v) => Math.round(v * 100) + '%', ylabel: '总平方误差' });
      ep.fn = (p) => {
        p.func(err, { color: 's1', width: 2.5 });
        p.point(0, err(0), { color: 's7', label: '只看自己', labelStyle: { dx: 8, dy: -6 } });
        p.point(lamJS, err(lamJS), { color: 's3', label: 'James–Stein', labelStyle: { dx: -6, dy: -12, align: 'center' } });
        p.vline(bs.lam, { color: 'ink3' });
      };
      eb.append(h('div', { class: 'fig-cap', html: '<b style="color:var(--s7)">●</b> 前 45 打数的打击率 <b style="color:var(--s3)">●</b> 你的估计 <b>○</b> 赛季剩余的真实打击率；红线 = 估计误差' }));
      const sc = pc.stats([
        { key: 'mle', label: '只看自己的总平方误差', color: 's7' },
        { key: 'cur', label: '你当前的选择', color: 's1' },
        { key: 'js', label: 'James–Stein（只用前 45 打数算出来的）', color: 's3' },
      ]);
      function upC() {
        sc.set('mle', PL.fmt(err(0), 4));
        sc.set('cur', PL.fmt(err(bs.lam), 4), `比只看自己 ${PL.signedPct(err(bs.lam) / err(0) - 1)}`, err(bs.lam) < err(0) ? 'good' : 'bad');
        sc.set('js', PL.fmt(err(lamJS), 4), `往平均拉 ${PL.pct(lamJS, 0)}`, 'good');
        pl.render(); ep.render();
      }
      upC();

      PL.prose(root, `
        <h2>设定</h2>
        <p>你要估计 d 个未知量 θ₁…θ<sub>d</sub>，每个只有一次带噪声的观测 X<sub>i</sub> ~ N(θ<sub>i</sub>, 1)。最自然的估计就是直接用观测值：θ̂<sub>i</sub> = X<sub>i</sub>。它无偏，是最大似然估计，看上去无可挑剔。</p>
        <p><b>Stein（1956）证明：只要 d ≥ 3，这个估计就是"不可容许的"。</b>也就是说，存在另一个估计，<b>不管真值是多少</b>，它的总均方误差都更小。James 和 Stein（1961）给出了具体的估计：</p>
        <div class="formula">θ̂ = (1 − (d − 2) ÷ ‖X‖²) · X</div>
        <p>也就是把所有观测一起往原点稍微收缩一点（往总均值收缩也可以，这时需要 d ≥ 4，系数里的 d − 2 换成 d − 3）。这些量之间可以毫无关系。量与量离得越远，收益越小，但总误差永远不会变大。</p>

        <h2>为什么：高维几何</h2>
        <p>‖X‖² 的期望是 ‖θ‖² + d。噪声在每一维都给观测向量添上一点长度，维度一多，观测向量就系统性地比真值"长"（见第一张图）。而且在高维里，随机噪声的方向几乎总是和 θ 垂直（见${PL.link('orthogonal', '维度福音')}），所以把 X 往原点缩一缩，离 θ 就更近了。单看每一维都是无偏的，但从整体看，"向量长度"这个方向上是有偏的。</p>
        <p>为什么分界线恰好在 3 维？Brown（1971）证明，它和"随机游走在二维一定会回到原点，在三维却不一定"出自同一个数学根源，都是从低维到高维时的几何跳变。</p>

        <h2>真实数据</h2>
        <p>Efron 和 Morris 用 1970 年 18 名球员赛季前 45 个打数的打击率，去预测他们赛季剩余的打击率。James–Stein 估计的总平方误差，只有直接用个人打击率的不到三分之一。注意它只用了前 45 个打数的信息，没有偷看答案。被"冤枉"的人也有：Clemente 前 45 打数打出 .400，被拉回到 .294，而他后来的真实打击率是 .346，这一个人的误差变大了，但 18 个人的总误差大幅下降。</p>
        <p class="try">把滑块从 0 慢慢往右拉：总误差先降后升，最低点就在 James–Stein 算出来的位置附近。</p>
        <div class="takeaway"><b>带走什么：</b>手上有一堆带噪声的估计时（各门店业绩、各员工评分、只有几条评论的商品），不要逐个照单全收，要往群体均值收缩，<b>样本越小收缩越多</b>。IMDb Top 250 的贝叶斯平均、保险精算的信度理论、机器学习里的正则化和权重衰减，都是这个思想。</div>
      `);
    },
  });

  // ======================================================================
  // 赢家诅咒 / 优化者诅咒
  // ======================================================================
  PL.register({
    id: 'winners', cat: 'selection', nav: '赢家诅咒：挑出来的最好的那个',
    title: '赢家诅咒：你挑出来的最好的那个，几乎一定没你想的好',
    hook: '即使你对每个选项的估计都是无偏的，"估计最高的那个"也一定被高估了。候选越多、噪声越大，事后越失望。',
    related: ['stein', 'regression', 'goodhart', 'smallsample'],
    render(root) {
      const st = { n: 20, sigma: 1, het: false, seed: PL.seed() };
      const pn = PL.panel(root, '从 n 个候选里挑估计值最高的', '每个候选的真实价值 ~ N(0, 1)，你看到的估计 = 真实价值 + 噪声。<b style="color:var(--s2)">红圈</b>：按估计挑出来的那个；<b style="color:var(--s3)">绿圈</b>：先收缩再挑出来的那个。').cols(2);
      pn.ctrl.slider({ label: '候选数 n', min: 2, max: 500, step: 1, log: true, value: st.n, fmt: (v) => v, onInput: (v) => { st.n = v; update(); } });
      pn.ctrl.slider({ label: '估计噪声 σ', min: 0, max: 2, step: 0.05, value: st.sigma, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.sigma = v; update(true); } });
      pn.ctrl.toggle({ label: '每个候选的噪声大小不同', value: st.het, onChange: (v) => { st.het = v; update(true); } });
      pn.ctrl.button('再抽一次', () => { st.seed = PL.seed(); update(); });
      const sc = PL.plot(pn.box(), { height: 330, x: [-4, 4], y: [-4, 4], xlabel: '你看到的估计', ylabel: '真实价值', legend: [{ label: '估计 = 真实（虚线）', color: 'ink3', dash: [4, 4] }], legendPos: 'tl' });
      const cb = pn.box();
      cb.append(h('div', { class: 'fig-title', text: '被选中者的平均"失望"：估计 − 真实' }));
      const curve = PL.plot(cb, { height: 300, x: [2, 500], y: [0, 2.5], xlog: true, xlabel: '候选数 n', ylabel: '平均失望', legend: [{ label: '直接挑最大', color: 's2' }, { label: '先收缩再挑', color: 's3' }], legendPos: 'tl' });
      const stats = pn.stats([
        { key: 'dis', label: '直接挑：平均失望', color: 's2', sub: '估计值 − 真实价值' },
        { key: 'naive', label: '直接挑：选中者的平均真实价值', color: 's7' },
        { key: 'shr', label: '先收缩再挑：平均真实价值', color: 's3' },
        { key: 'best', label: '上帝视角：最好的那个', color: 's4' },
      ]);
      function draw(n, r) {
        const v = [], e = [], s = [];
        for (let i = 0; i < n; i++) {
          const si = st.het ? st.sigma * (0.2 + 1.6 * r()) : st.sigma;
          const vi = r.normal();
          v.push(vi); s.push(si); e.push(vi + si * r.normal());
        }
        let a = 0, b = 0, c = 0;
        for (let i = 1; i < n; i++) {
          if (e[i] > e[a]) a = i;
          if (e[i] / (1 + s[i] * s[i]) > e[b] / (1 + s[b] * s[b])) b = i;
          if (v[i] > v[c]) c = i;
        }
        return { v, e, s, a, b, c };
      }
      function mcStats(n, trials, r) {
        let dis = 0, dis2 = 0, tv = 0, ts = 0, tb = 0;
        for (let t = 0; t < trials; t++) {
          const D = draw(n, r);
          dis += D.e[D.a] - D.v[D.a];
          dis2 += D.e[D.b] / (1 + D.s[D.b] ** 2) - D.v[D.b];
          tv += D.v[D.a]; ts += D.v[D.b]; tb += D.v[D.c];
        }
        return { dis: dis / trials, dis2: dis2 / trials, tv: tv / trials, ts: ts / trials, tb: tb / trials };
      }
      let D, C;
      sc.fn = (p) => {
        p.func((x) => x, { color: 'ink3', dash: [4, 4], width: 1.5 });
        p.dots(D.e, D.v, { color: 's7', r: 2.8, alpha: 0.6 });
        const ring = (i, col) => { p.point(D.e[i], D.v[i], { color: col, hollow: true, r: 8 }); };
        p.arrow(D.e[D.a], D.e[D.a], D.e[D.a], D.v[D.a], { color: 's2', width: 2, head: 8 });
        ring(D.a, 's2');
        if (D.b !== D.a) ring(D.b, 's3');
        p.text(D.e[D.a], (D.e[D.a] + D.v[D.a]) / 2, '失望', { dx: 8, color: 's2', size: 12 });
      };
      curve.fn = (p) => {
        p.line(C.ns, C.dis, { color: 's2', width: 2.5 });
        p.line(C.ns, C.dis2, { color: 's3', width: 2.5 });
        p.vline(st.n, { color: 'ink3' });
      };
      function update(rebuildCurve) {
        D = draw(st.n, PL.rng(st.seed));
        const lim = Math.max(3.5, ...D.e.map(Math.abs), ...D.v.map(Math.abs)) + 0.3;
        sc.setX(-lim, lim); sc.setY(-lim, lim);
        const S = mcStats(st.n, 2000, PL.rng(99));
        stats.set('dis', '+' + PL.fmt(S.dis, 2), null, 'bad');
        stats.set('naive', PL.fmt(S.tv, 2));
        stats.set('shr', PL.fmt(S.ts, 2), st.het ? '收缩会改变排名：噪声大的被拉得更多' : '噪声一样时，收缩不改变排名，只是不再高估', S.ts > S.tv + 0.01 ? 'good' : '');
        stats.set('best', PL.fmt(S.tb, 2));
        if (rebuildCurve || !C) {
          const ns = [2, 3, 5, 8, 12, 20, 35, 60, 100, 170, 300, 500];
          C = { ns, dis: [], dis2: [] };
          for (const n of ns) { const s = mcStats(n, 400, PL.rng(n)); C.dis.push(s.dis); C.dis2.push(s.dis2); }
          curve.setY(0, Math.max(0.5, ...C.dis) * 1.15);
        }
        sc.render(); curve.render();
      }
      update(true);

      // ---- auction ----
      const au = { N: 12, s: 0.2, shade: 0 };
      const pa = PL.panel(root, '拍卖一罐硬币', '罐子里的硬币值 8 美元。每个竞拍者独立估计罐子的价值，估计平均来说是准的（无偏）。出价最高的人赢，付自己的出价。');
      pa.ctrl.slider({ label: '竞拍人数', min: 2, max: 40, step: 1, value: au.N, fmt: (v) => v + ' 人', onInput: (v) => { au.N = v; upA(); } });
      pa.ctrl.slider({ label: '估计误差', min: 0.05, max: 0.8, step: 0.01, value: au.s, fmt: (v) => '±' + PL.pct(v, 0), onInput: (v) => { au.s = v; upA(); } });
      pa.ctrl.slider({ label: '每人在估计基础上压价', min: 0, max: 0.6, step: 0.01, value: au.shade, fmt: (v) => PL.pct(v, 0), onInput: (v) => { au.shade = v; upA(); } });
      const hp = PL.plot(pa.box(), { height: 240, x: [0, 24], y: [0, 1], xlabel: '金额（美元）', yticks: [], legend: [{ label: '单个人的估计', color: 's7', type: 'box' }, { label: '中标价', color: 's2', type: 'box' }] });
      const sa = pa.stats([
        { key: 'avg', label: '平均中标价', color: 's2' },
        { key: 'profit', label: '赢家的平均盈亏', color: 's4' },
        { key: 'lose', label: '赢家亏钱的概率', color: 's6' },
        { key: 'be', label: '不亏本需要压价', color: 's3' },
      ]);
      let A;
      hp.fn = (p) => {
        const bw = 0.5;
        const hist = (vals) => { const c = new Array(48).fill(0); for (const v of vals) { const k = Math.floor(v / bw); if (k >= 0 && k < 48) c[k]++; } return c.map((x) => x / vals.length / bw); };
        const h1 = hist(A.ests), h2 = hist(A.wins);
        const mx = Math.max(...h1, ...h2) * 1.1;
        p.y = [0, mx];
        const xs = h1.map((_, i) => (i + 0.5) * bw);
        p.bars(xs, h1, { color: 's7', alpha: 0.4, w: bw * 0.92 });
        p.bars(xs, h2, { color: 's2', alpha: 0.55, w: bw * 0.92 });
        p.vline(8, { color: 'ink', dash: [], width: 2, label: '真实价值 $8' });
      };
      function upA() {
        const r = PL.rng(7), T = 6000;
        const wins = [], ests = [];
        let sumMax = 0, lose = 0;
        for (let t = 0; t < T; t++) {
          let mx = 0;
          for (let i = 0; i < au.N; i++) {
            const e = 8 * Math.exp(au.s * r.normal() - au.s * au.s / 2);
            if (i === 0 && ests.length < 6000) ests.push(e);
            if (e > mx) mx = e;
          }
          sumMax += mx;
          const bid = mx * (1 - au.shade);
          wins.push(bid);
          if (bid > 8) lose++;
        }
        A = { wins, ests };
        const avg = M.mean(wins);
        sa.set('avg', '$' + PL.fmt(avg, 2));
        sa.set('profit', (8 - avg >= 0 ? '+$' : '−$') + PL.fmt(Math.abs(8 - avg), 2), null, 8 - avg < 0 ? 'bad' : 'good');
        sa.set('lose', PL.pct(lose / T, 0));
        sa.set('be', PL.pct(Math.max(0, 1 - 8 / (sumMax / T)), 0), '才能让赢家平均不亏');
        hp.render();
      }
      upA();

      PL.prose(root, `
        <h2>起源：墨西哥湾的油田</h2>
        <p>1971 年，大西洋富田公司的三位工程师 Capen、Clapp 和 Campbell 发现：墨西哥湾油田租约拍卖中，中标的公司系统性地亏钱。原因不是谁算错了。每家公司对储量的估计平均来说是准的，但<b>中标的总是估计最乐观的那一家</b>。中标这件事本身，就把正误差筛选了出来。</p>
        <p>Bazerman 和 Samuelson（1983）在课堂上复现了它：让 MBA 学生竞拍一罐硬币，罐子真实价值 8 美元。学生的平均估值约 5 美元，是偏低的；可平均中标价约 10 美元，赢家平均下来是亏的。</p>
        <p class="try">在拍卖里把人数加到 30：每个人的估计都没有变差，赢家却亏得更多。压价多少才不亏？看最后一个数字。</p>

        <h2>不需要对手：优化者诅咒</h2>
        <p>Smith 和 Winkler（2006）把它推广到任何决策：即使你对每个方案的估计都是无偏的，<b>挑出估计值最高的那个</b>，它的估计也一定是偏高的，事后平均会失望。候选越多、估计噪声越大，失望越大。更糟的是：打开"每个候选的噪声大小不同"，你会发现被选中的往往是<b>噪声最大</b>的那几个，因为它们最容易被噪声推到最上面。</p>
        <ul>
          <li>面试表现最好的候选人，入职后表现往往回落一截。</li>
          <li>A/B 测试里提升最大的那个版本，正式上线后提升会缩水。</li>
          <li>去年收益排第一的基金，今年大概率回到中游。</li>
          <li>已发表研究的效应量普遍偏大：只有"显著"的结果才容易发表，这又是一层筛选。这也是心理学重复危机的成因之一。</li>
        </ul>

        <h2>解法：先收缩，再挑</h2>
        <p>把每个估计往均值收缩（噪声大的收缩得更多），然后再挑最大的，这正是${PL.link('stein', '斯坦因悖论')}的思路。噪声大小相同时，收缩不会改变排名，但能让你对选中者的预期变得准确；噪声大小不同时，收缩会改变排名，常常选中一个看起来没那么耀眼、但更有把握的选项，平均真实价值也更高。</p>
        <div class="takeaway"><b>带走什么：</b>当你从很多选项里挑出最好的那个，"挑最好"这个动作本身就是一次有偏的筛选。要么预留失望的余地，要么先收缩再挑；拍卖和招聘里，赢的那一刻就该问自己：别人为什么都没出这么高？</div>
      `);
    },
  });
})();
