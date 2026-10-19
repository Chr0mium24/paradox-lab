/* 类别一（续）：个体理性，集体变糟 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 谢林隔离模型
  // ======================================================================
  function schellingWorld(L, T, seed) {
    const r = PL.rng(seed), N = L * L, g = new Int8Array(N);
    for (let i = 0; i < N; i++) { const u = r(); g[i] = u < 0.1 ? 0 : u < 0.55 ? 1 : 2; }
    const NB = Array.from({ length: N }, (_, i) => {
      const x = i % L, y = (i / L) | 0, out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) out.push(((y + dy + L) % L) * L + ((x + dx + L) % L));
      return out;
    });
    const w = { L, N, g, NB, r, T, rounds: 0 };
    w.sim = (i) => { let s = 0, o = 0; for (const j of NB[i]) if (g[j]) { o++; if (g[j] === g[i]) s++; } return o ? s / o : 1; };
    w.unhappy = () => { const u = []; for (let i = 0; i < N; i++) if (g[i] && w.sim(i) < w.T) u.push(i); return u; };
    w.step = () => {
      const un = w.unhappy();
      if (!un.length) return 0;
      const empt = []; for (let i = 0; i < N; i++) if (!g[i]) empt.push(i);
      r.shuffle(un);
      for (const i of un) { const k = r.int(empt.length), j = empt[k]; g[j] = g[i]; g[i] = 0; empt[k] = i; }
      w.rounds++;
      return un.length;
    };
    w.seg = () => { let s = 0, c = 0; for (let i = 0; i < N; i++) if (g[i]) { s += w.sim(i); c++; } return s / c; };
    return w;
  }
  PL.register({
    id: 'schelling', cat: 'collective', nav: '谢林隔离：温和偏好，严重隔离',
    title: '谢林隔离模型：没有人想要隔离，城市却分成了两半',
    hook: '每个人只要求"周围至少三成邻居和我一样"，一点也不排外。可大家各自搬几次家以后，平均四分之三的邻居都成了同类。',
    related: ['braess', 'percolation', 'volunteer'],
    render(root) {
      const L = 50;
      const st = { T: 0.3, seed: PL.seed(), running: true };
      let W = schellingWorld(L, st.T, st.seed);
      const pn = PL.panel(root, '一座 50×50 的城市', '蓝色和黄色两种居民各占一半，还有 10% 的空房。每一轮，周围（8 个邻格）同类比例低于要求的居民，会随机搬到一间空房。<b>浅色</b>的是当前不满意的人。').cols(2);
      const sl = pn.ctrl.slider({ label: '每个人的要求：同类邻居至少', min: 0, max: 0.9, step: 0.05, value: st.T, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.T = v; W.T = v; update(); }, wide: true });
      const runBtn = pn.ctrl.button('暂停', () => { st.running = !st.running; runBtn.textContent = st.running ? '暂停' : '继续'; });
      pn.ctrl.button('重新开始', () => { st.seed = PL.seed(); W = schellingWorld(L, st.T, st.seed); st.running = true; runBtn.textContent = '暂停'; update(); });
      let unhappySet = new Set();
      const city = PL.stage(pn.box(), { height: (w) => Math.min(420, w) }, (c, w, hh) => {
        const S = Math.min(w, hh), cs = S / L, ox = (w - S) / 2;
        c.fillStyle = PL.col('grid'); c.fillRect(ox, 0, S, S);
        for (let i = 0; i < W.N; i++) {
          if (!W.g[i]) continue;
          const x = i % L, y = (i / L) | 0;
          c.fillStyle = PL.col(W.g[i] === 1 ? 's1' : 's6');
          c.globalAlpha = unhappySet.has(i) ? 0.35 : 0.95;
          c.fillRect(ox + x * cs + 0.5, y * cs + 0.5, cs - 1, cs - 1);
        }
        c.globalAlpha = 1;
      });
      const rb = pn.box();
      rb.append(h('div', { class: 'fig-title', text: '最终的平均同类邻居比例 vs. 每个人的要求' }));
      const ch = PL.plot(rb, { height: 300, x: [0, 0.9], y: [0.4, 1], xlabel: '每个人要求的同类比例', ylabel: '最后实际的同类比例', xfmt: (v) => Math.round(v * 100) + '%', yfmt: (v) => Math.round(v * 100) + '%', legend: [{ label: '最终结果（模拟）', color: 's2' }, { label: '实际 = 要求', color: 'ink3', dash: [4, 4] }], legendPos: 'br' });
      const curve = (() => {
        const Ts = M.linspace(0, 0.85, 18), ys = [];
        for (const T of Ts) { const w = schellingWorld(40, T, 77); for (let k = 0; k < 60 && w.step(); k++); ys.push(w.seg()); }
        return { Ts, ys };
      })();
      ch.fn = (p) => {
        p.hline(0.5, { color: 'ink3', label: '随机混居 ≈ 50%', align: 'right' });
        p.func((x) => x, { color: 'ink3', dash: [4, 4], width: 1.5 });
        p.line(curve.Ts, curve.ys, { color: 's2', width: 2.5 });
        p.point(st.T, W.seg(), { color: 's1', label: '现在', labelStyle: { dx: 8, dy: 14 } });
      };
      const stats = pn.stats([
        { key: 'T', label: '每个人的要求', color: 's7' },
        { key: 'seg', label: '实际：平均同类邻居比例', color: 's2' },
        { key: 'un', label: '不满意、准备搬家的人', color: 's6' },
        { key: 'r', label: '已经过去的轮数', color: 's4' },
      ]);
      function update() {
        unhappySet = new Set(W.unhappy());
        const s = W.seg();
        stats.set('T', '≥ ' + PL.pct(st.T, 0));
        stats.set('seg', PL.pct(s, 0), s > st.T + 0.25 ? '远远超过任何人的要求' : '', s > st.T + 0.25 ? 'bad' : '');
        stats.set('un', PL.int(unhappySet.size), unhappySet.size === 0 ? '人人满意，城市稳定了' : '');
        stats.set('r', String(W.rounds));
        city.render(); ch.render();
      }
      update();
      let acc = 0;
      PL.loop((dt) => {
        if (!st.running) return;
        acc += dt;
        if (acc < 0.18) return;
        acc = 0;
        if (W.step()) update(); else if (st.running) { st.running = false; runBtn.textContent = '继续'; update(); }
      });
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>1971 年，经济学家托马斯·谢林用棋盘和两种硬币做了一个实验：每枚硬币只要求周围有一定比例的同类，不满意就挪到空格。他发现，即使要求低到 1/3（换句话说，每个人都愿意当"少数派"，只是不想成为周围唯一的那一个），棋盘最终也会分成大片同色区域。上面的城市里，要求 30% 时，最后平均约 3/4 的邻居都是同类。</p>
        <p class="try">把要求从 0 慢慢往上调，看右边的曲线：到 25% 左右就开始明显隔离；超过 60% 后几乎完全隔离；要求太高（80% 以上）时，城市会一直动荡，因为很难有人满意。</p>

        <h2>为什么会放大</h2>
        <p>关键是<b>连锁反应</b>：一个蓝色居民搬走，原来邻居里的蓝色比例下降，可能让另一个蓝色居民也变得不满意；他搬进的新社区，黄色比例又下降了一点……每次搬家都在别处制造新的不满。个体之间的这种互相影响，把温和的偏好放大成了极端的整体格局。谢林因为这类关于冲突与合作的博弈分析，2005 年获得了诺贝尔经济学奖。</p>

        <h2>它说明了什么，没说明什么</h2>
        <ul>
          <li><b>看到严重隔离，不能反推出人们有强烈偏见。</b>宏观格局和微观动机之间可以差得很远，这是谢林最重要的提醒。</li>
          <li>同样的机制出现在社交网络里：每个人只是"稍微更愿意关注观点相近的人"，信息圈就可能分化成互不相通的回音室。</li>
          <li>这不是说真实的居住隔离只由温和偏好造成，房价、歧视性政策、收入差距都起着巨大作用。模型只说明：<b>即使</b>没有这些，隔离也会自己长出来。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>不要从结果的极端程度去推断个体动机的极端程度。在互相影响的系统里，温和的个体偏好可以叠加出谁都不想要的格局，就像${PL.link('braess', '布雷斯悖论')}，以及下面的${PL.link('percolation', '渗流')}：越过某个阈值以后，局部选择会突然连成整体。</div>
      `);
    },
  });

  // ======================================================================
  // 孔多塞悖论
  // ======================================================================
  const PERMS = ['ABC', 'ACB', 'BAC', 'BCA', 'CAB', 'CBA'];
  PL.register({
    id: 'condorcet', cat: 'collective', nav: '孔多塞悖论：多数票会转圈',
    title: '孔多塞悖论：每个人的偏好都很理性，"多数人的偏好"却在转圈',
    hook: 'A 以多数票胜过 B，B 以多数票胜过 C，C 又以多数票胜过 A。谁来安排投票顺序，谁就能决定结果。',
    related: ['braess', 'simpson', 'volunteer'],
    render(root) {
      const st = { groups: [{ p: 'ABC', n: 4 }, { p: 'BCA', n: 3 }, { p: 'CAB', n: 2 }] };
      const pn = PL.panel(root, '三组选民，三个候选人', '每组选民有自己的排序（比如 A&gt;B&gt;C 表示最喜欢 A，其次 B，最不喜欢 C）。下面两两对决，看多数人更偏好谁。').cols(2);
      st.groups.forEach((g, gi) => {
        pn.ctrl.seg({ label: `第 ${gi + 1} 组`, options: PERMS.map((p) => ({ value: p, label: p.split('').join('&gt;') })), value: g.p, onChange: (v) => { g.p = v; update(); } });
        pn.ctrl.slider({ label: '人数', min: 0, max: 10, step: 1, value: g.n, fmt: (v) => v + ' 人', onInput: (v) => { g.n = v; update(); } });
        pn.ctrl.break();
      });
      pn.ctrl.button('经典的循环（各 1 人）', () => { st.groups = [{ p: 'ABC', n: 1 }, { p: 'BCA', n: 1 }, { p: 'CAB', n: 1 }]; syncCtl(); update(); });
      function syncCtl() {
        const segs = pn.el.querySelectorAll('.seg'), sls = pn.el.querySelectorAll('input[type=range]'), outs = pn.el.querySelectorAll('.ctl output');
        st.groups.forEach((g, i) => {
          segs[i].querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', PERMS[k] === g.p));
          sls[i].value = g.n; outs[i].textContent = g.n + ' 人';
        });
      }
      let R;
      const tri = PL.stage(pn.box(), { height: 300 }, (c, w, hh) => {
        const P = { A: [w / 2, 48], B: [w / 2 - 130, hh - 56], C: [w / 2 + 130, hh - 56] };
        c.lineWidth = 2.5;
        for (const [x, y] of [['A', 'B'], ['B', 'C'], ['A', 'C']]) {
          const k = x + y, res = R.pair[k];
          const [win, lose] = res.a > res.b ? [x, y] : res.b > res.a ? [y, x] : [null, null];
          const p0 = P[x], p1 = P[y];
          if (!win) { c.strokeStyle = PL.col('ink3'); c.setLineDash([4, 4]); c.beginPath(); c.moveTo(...p0); c.lineTo(...p1); c.stroke(); c.setLineDash([]); }
          else {
            const a = P[win], b = P[lose], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
            c.strokeStyle = PL.col(R.cycle ? 's2' : 's1');
            PL.drawArrow(c, a[0] + (dx / L) * 28, a[1] + (dy / L) * 28, b[0] - (dx / L) * 30, b[1] - (dy / L) * 30, 11);
          }
          const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2;
          c.font = PL.font(12.5, 600); c.fillStyle = PL.col('ink2'); c.textAlign = 'center';
          c.fillText(`${x} ${res.a} : ${res.b} ${y}`, mx + (y === 'C' && x === 'B' ? 0 : x === 'A' && y === 'B' ? -44 : 44), my + (x === 'B' ? 22 : 0));
        }
        for (const k of 'ABC') {
          const [x, y] = P[k];
          c.fillStyle = PL.col(R.winner === k ? 's3' : 'panel'); c.strokeStyle = PL.col('ink'); c.lineWidth = 2;
          c.beginPath(); c.arc(x, y, 22, 0, 7); c.fill(); c.stroke();
          c.fillStyle = PL.col(R.winner === k ? 'paper' : 'ink'); c.font = PL.font(18, 700); c.textBaseline = 'middle'; c.fillText(k, x, y + 1); c.textBaseline = 'alphabetic';
        }
        c.font = PL.font(13, 600); c.fillStyle = PL.col(R.cycle ? 's2' : 's3');
        c.fillText(R.cycle ? '循环：没有人能赢过所有对手' : R.winner ? `${R.winner} 是孔多塞胜者：两两对决全胜` : '有平局', w / 2, hh - 14);
      });
      const right = pn.box();
      right.append(h('div', { class: 'fig-title', text: '谁来定议程，谁就定结果' }));
      right.append(h('p', { class: 'fig-cap', text: '议程 = 先让哪两个人对决，胜者再和第三个人对决。' }));
      const agTbl = PL.table(right, ['议程', '第一轮', '最终胜者']);
      function update() {
        const pair = {};
        for (const [x, y] of [['A', 'B'], ['B', 'C'], ['A', 'C']]) {
          let a = 0, b = 0;
          for (const g of st.groups) { if (g.p.indexOf(x) < g.p.indexOf(y)) a += g.n; else b += g.n; }
          pair[x + y] = { a, b };
        }
        const beats = (x, y) => { const k = [x, y].sort().join(''), r = pair[k]; return k[0] === x ? r.a > r.b : r.b > r.a; };
        let winner = null;
        for (const k of 'ABC') if ('ABC'.split('').every((o) => o === k || beats(k, o))) winner = k;
        const cycle = !winner && (beats('A', 'B') && beats('B', 'C') && beats('C', 'A') || beats('B', 'A') && beats('C', 'B') && beats('A', 'C'));
        R = { pair, winner, cycle };
        const duel = (x, y) => (beats(x, y) ? x : beats(y, x) ? y : x + '/' + y);
        const rows = [['A', 'B', 'C'], ['B', 'C', 'A'], ['A', 'C', 'B']].map(([x, y, z]) => {
          const w1 = duel(x, y), fin = w1.length === 1 ? duel(w1, z) : '—';
          return [`先 ${x} 对 ${y}，再对 ${z}`, `${w1} 胜`, `<b>${fin}</b>`];
        });
        agTbl.rows(rows);
        tri.render();
      }
      update();

      // ---- B: random electorates ----
      const pb = PL.panel(root, '随机的选民，出现循环有多常见？', '每个选民的排序完全随机（"公正文化"假设）。候选人越多，越可能根本不存在一个能赢过所有人的候选人。');
      const sb = { n: 51 };
      pb.ctrl.seg({ label: '选民人数', options: [3, 11, 51, 101].map((v) => ({ value: v, label: String(v) })), value: sb.n, onChange: (v) => { sb.n = v; buildB(); } });
      const chB = PL.plot(pb.box(), { height: 250, x: [3, 10], y: [0, 0.6], xticks: [3, 4, 5, 6, 7, 8, 9, 10], xlabel: '候选人数', ylabel: '不存在孔多塞胜者的概率', yfmt: (v) => Math.round(v * 100) + '%' });
      let CB = null;
      chB.fn = (p) => { if (!CB) return; p.line(CB.ms, CB.ps, { color: 's2', width: 2.5 }); p.dots(CB.ms, CB.ps, { color: 's2', r: 4 }); CB.ms.forEach((m, i) => p.text(m, CB.ps[i], PL.pct(CB.ps[i], 0), { dy: -10, align: 'center', size: 11, color: 'ink2' })); };
      function buildB() {
        const r = PL.rng(31), ms = [3, 4, 5, 6, 7, 8, 9, 10], ps = [], T = 700;
        for (const m of ms) {
          let cyc = 0;
          for (let t = 0; t < T; t++) {
            const wins = Array.from({ length: m }, () => new Int32Array(m));
            for (let v = 0; v < sb.n; v++) {
              const pm = r.shuffle([...Array(m).keys()]), pos = [];
              pm.forEach((cand, i) => (pos[cand] = i));
              for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) if (pos[a] < pos[b]) wins[a][b]++; else wins[b][a]++;
            }
            let found = false;
            for (let a = 0; a < m && !found; a++) { let ok = true; for (let b = 0; b < m; b++) if (b !== a && wins[a][b] * 2 <= sb.n) { ok = false; break; } if (ok) found = true; }
            if (!found) cyc++;
          }
          ps.push(cyc / T);
        }
        CB = { ms, ps };
        chB.render();
      }
      buildB();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>1785 年，法国数学家孔多塞注意到：每个选民的偏好都是"传递"的（喜欢 A 胜过 B、B 胜过 C，就一定喜欢 A 胜过 C），可把他们的偏好用多数票汇总起来，"集体偏好"却可以是循环的：A 胜 B，B 胜 C，C 又胜 A。经典的例子只需要三个人：</p>
        <div class="formula">甲：A &gt; B &gt; C　　乙：B &gt; C &gt; A　　丙：C &gt; A &gt; B</div>
        <p>A 对 B：甲、丙支持 A，2:1；B 对 C：甲、乙支持 B，2:1；C 对 A：乙、丙支持 C，2:1。没有任何一个候选人能赢过所有对手。于是右边的表格显示：<b>谁来决定先让哪两个人对决，谁就决定了最后的赢家</b>，三种议程正好产生三个不同的胜者。</p>
        <p class="try">点"经典的循环"，再看三种议程的结果。然后把某一组的人数调多一点，循环就会被打破，出现一个"孔多塞胜者"。</p>

        <h2>阿罗不可能定理</h2>
        <p>1951 年，肯尼斯·阿罗把这个问题推到了极致：只要候选项不少于 3 个，<b>不存在</b>任何一种把个人排序汇总成集体排序的规则，能同时满足几条看起来最起码的要求：所有人都偏好 A 胜过 B 时集体也应如此（一致性）；A 和 B 的集体排序只取决于大家对 A、B 的看法，不受无关的 C 影响（无关选项独立性）；不存在一个独裁者，其偏好总是直接成为集体偏好。阿罗因此获得 1972 年诺贝尔经济学奖。</p>

        <h2>真实的例子</h2>
        <ul>
          <li><b>2009 年美国伯灵顿市长选举</b>采用排序复选制（即时决选），进步党候选人 Kiss 当选；可事后分析选票发现，民主党候选人 Montroll 在两两对决中能赢过每一位对手，他才是孔多塞胜者，却在第一轮就被淘汰了。这次选举之后，该市一度废除了排序复选制。</li>
          <li><b>议会的议程控制</b>：修正案先表决还是后表决，常常决定法案能否通过，这是议事规则里真实的博弈。</li>
          <li><b>非传递骰子</b>：可以造出三颗骰子，A 大概率赢 B、B 大概率赢 C、C 大概率赢 A。"更强"不一定是一条能排序的关系。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>"集体的意愿"不是一个天然存在、等着被测量的东西，它在很大程度上是由汇总规则制造出来的。比较投票结果、评审打分、多指标排名时，要意识到规则本身就在影响结论，这和${PL.link('simpson', '辛普森悖论')}里"汇总方式改变结论"是一回事。</div>
      `);
    },
  });

  // ======================================================================
  // 旁观者 / 志愿者困境
  // ======================================================================
  PL.register({
    id: 'volunteer', cat: 'collective', nav: '旁观者困境：人越多越没人帮',
    title: '旁观者困境：在场的人越多，越可能没有一个人出手',
    hook: '这不是因为人变冷漠了。即使每个人都完全理性、都希望有人帮忙，人数一多，"没人出手"的概率反而会上升。',
    related: ['thrift', 'braess', 'condorcet'],
    render(root) {
      const st = { N: 5, c: 0.3, seed: PL.seed() };
      const pHelp = (N, c) => (N <= 1 ? 1 : 1 - Math.pow(c, 1 / (N - 1)));
      const pAny = (N, c) => (N <= 1 ? 1 : 1 - Math.pow(c, N / (N - 1)));
      const pn = PL.panel(root, '志愿者困境', '有人需要帮助。只要<b>至少一个人</b>出手，所有人都能松一口气（收益 1）；出手的人要付出代价 c（时间、尴尬、风险）。每个人都在想：要不要等别人先出手？下面是这个博弈的对称均衡。').cols(2);
      pn.ctrl.slider({ label: '在场人数 N', min: 1, max: 40, step: 1, value: st.N, fmt: (v) => v + ' 人', onInput: (v) => { st.N = v; update(); } });
      pn.ctrl.slider({ label: '出手的代价 c', min: 0.05, max: 0.9, step: 0.05, value: st.c, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.c = v; update(); } });
      pn.ctrl.button('再发生一次', () => { st.seed = PL.seed(); update(); });
      let ev;
      const crowd = PL.stage(pn.box(), { height: 280 }, (c, w, hh) => {
        const N = st.N, cols = Math.ceil(Math.sqrt(N * 1.6)), rows = Math.ceil(N / cols);
        const cell = Math.min((w - 40) / cols, (hh - 90) / rows, 60);
        const ox = (w - cols * cell) / 2 + cell / 2, oy = 40 + cell / 2;
        c.font = PL.font(13, 600); c.textAlign = 'center';
        c.fillStyle = PL.col(ev.any ? 's3' : 's2');
        c.fillText(ev.any ? `有 ${ev.k} 个人出手了` : '没有人出手', w / 2, 22);
        for (let i = 0; i < N; i++) {
          const x = ox + (i % cols) * cell, y = oy + Math.floor(i / cols) * cell, r = cell * 0.22;
          c.fillStyle = PL.col(ev.helped[i] ? 's3' : 's7'); c.globalAlpha = ev.helped[i] ? 1 : 0.6;
          c.beginPath(); c.arc(x, y - r * 0.9, r * 0.7, 0, 7); c.fill();
          c.beginPath(); c.ellipse(x, y + r * 0.7, r, r * 0.9, 0, Math.PI, 0); c.fill();
        }
        c.globalAlpha = 1;
        c.fillStyle = PL.col('ink3'); c.font = PL.font(12);
        c.fillText(`最近 1000 次里，有人出手的比例：${PL.pct(ev.rate, 0)}`, w / 2, hh - 10);
      });
      const cb = pn.box();
      const ch = PL.plot(cb, { height: 280, x: [1, 40], y: [0, 1], xlabel: '在场人数 N', yfmt: (v) => Math.round(v * 100) + '%', legend: [{ label: '至少有一人出手', color: 's3' }, { label: '某个人自己出手', color: 's1' }], legendPos: 'tr' });
      ch.fn = (p) => {
        const Ns = M.linspace(1, 40, 40);
        p.line(Ns, Ns.map((N) => pAny(N, st.c)), { color: 's3', width: 2.5 });
        p.line(Ns, Ns.map((N) => pHelp(N, st.c)), { color: 's1', width: 2.5 });
        p.hline(1 - st.c, { color: 's3', dash: [3, 4], label: `人再多也只有 ${PL.pct(1 - st.c, 0)}`, align: 'right' });
        p.point(st.N, pAny(st.N, st.c), { color: 's3' });
        p.point(st.N, pHelp(st.N, st.c), { color: 's1' });
      };
      const stats = pn.stats([
        { key: 'one', label: '每个人出手的概率', color: 's1' },
        { key: 'any', label: '至少有一个人出手', color: 's3' },
        { key: 'alone', label: '对比：只有你一个人在场时', color: 's7' },
      ]);
      function update() {
        const r = PL.rng(st.seed), p = pHelp(st.N, st.c);
        const helped = Array.from({ length: st.N }, () => r() < p);
        let ok = 0; for (let t = 0; t < 1000; t++) { let any = false; for (let i = 0; i < st.N; i++) if (r() < p) { any = true; break; } if (any) ok++; }
        ev = { helped, k: helped.filter(Boolean).length, any: helped.some(Boolean), rate: ok / 1000 };
        stats.set('one', PL.pct(p, 1), st.N > 1 ? '人越多，每个人越倾向于等别人' : '');
        stats.set('any', PL.pct(pAny(st.N, st.c), 1), null, st.N > 1 ? 'bad' : '');
        stats.set('alone', '100%', '代价小于收益，一定会出手');
        crowd.render(); ch.render();
      }
      update();
      PL.prose(root, `
        <h2>从实验到博弈</h2>
        <p>1968 年，心理学家 Darley 和 Latané 做了一个著名实验：被试通过对讲机和其他"参与者"交谈，其中一人突然癫痫发作。当被试以为只有自己听到时，约 85% 的人在发作结束前出去求助；以为还有 4 个人也听到时，这个比例降到约 31%。他们称之为<b>责任分散</b>。</p>
        <p>经济学家 Diekmann（1985）用"志愿者困境"把它写成了博弈：只要有一个人出手，所有人都受益；出手的人承担代价 c。每个人最希望的结果是"别人出手"。在对称的混合策略均衡里，每个人出手的概率是：</p>
        <div class="formula">每人出手的概率 = 1 − c<sup>1/(N−1)</sup>　　至少一人出手 = 1 − c<sup>N/(N−1)</sup></div>
        <p>N 增大时，第一项趋近 0，第二项单调<b>下降</b>，趋近 1 − c。也就是说：人越多，越可能没人出手。这不需要假设任何人冷漠或者非理性，它来自"每个人都在指望别人"的均衡本身。</p>
        <p class="try">把代价调高到 0.7，再把人数从 1 拉到 40：独自一人时一定出手，40 人时有 30% 以上的可能没人出手。</p>

        <h2>怎么打破</h2>
        <ul>
          <li><b>点名</b>："穿红衣服的那位，请帮忙打 120。"把 N 个人的博弈变成一个人的决定，责任不再分散。急救培训里会专门教这一点。</li>
          <li><b>降低代价</b>：c 越小，出手概率越高。好撒玛利亚人法（救助者免责）就是在降低 c。</li>
          <li><b>指定负责人</b>：开源项目里"总会有人修的 bug"、会议纪要、团队里没人认领的告警，都需要一个明确的负责人。</li>
        </ul>
        <p class="note">常被引用的"1964 年纽约 Kitty Genovese 案中 38 名邻居袖手旁观"，后来被证明严重失实：目击者远没有那么多，也有人报了警。旁观者效应本身由大量实验支持，但这个故事不是好例子。</p>
        <div class="takeaway"><b>带走什么：</b>"大家的事"在均衡里往往变成"没人的事"。想让事情发生，就把它变成某一个人的事。这和${PL.link('thrift', '节俭悖论')}一样，是"每个人都在等别人"的集体困境。</div>
      `);
    },
  });

  // ======================================================================
  // 柠檬市场
  // ======================================================================
  PL.register({
    id: 'lemons', cat: 'collective', nav: '柠檬市场：好东西被赶出市场',
    title: '柠檬市场：买家看不出好坏，好车就会一辆辆退出市场',
    hook: '每一笔交易对买卖双方都有利，可只要买家分不清好坏，市场就会一轮轮螺旋下沉，最后只剩次品，甚至整个消失。',
    related: ['winners', 'survivor', 'goodhart'],
    render(root) {
      const st = { b: 1.5, dist: 'uni', rounds: 12 };
      const DIST = {
        uni: { label: '质量均匀分布', f: (r) => r() },
        good: { label: '好车居多', f: (r) => { const a = r.gamma(4), b = r.gamma(1.6); return a / (a + b); } },
        two: { label: '好坏两极', f: (r) => M.clamp(r() < 0.5 ? 0.2 + 0.08 * r.normal() : 0.85 + 0.06 * r.normal(), 0, 1) },
      };
      let Q;
      const pn = PL.panel(root, '二手车市场', '每辆车的质量 q 在 0 到 1 之间，卖家知道，买家不知道。车对卖家值 q，对买家值 b·q（b &gt; 1，所以每一笔交易本来都应该发生）。买家只肯按"市场上在卖的车的平均价值"出价；卖家只有在价格不低于自己车的价值时才卖。').cols(2);
      pn.ctrl.slider({ label: '买家比卖家多看重多少 b', min: 1.05, max: 3, step: 0.05, value: st.b, fmt: (v) => '× ' + PL.fmt(v, 2), onInput: (v) => { st.b = v; update(); } });
      pn.ctrl.seg({ options: Object.entries(DIST).map(([k, v]) => ({ value: k, label: v.label })), value: st.dist, onChange: (v) => { st.dist = v; gen(); update(); } });
      function gen() { const r = PL.rng(5); Q = Float64Array.from({ length: 6000 }, () => DIST[st.dist].f(r)).sort(); }
      function run() {
        const prices = [];
        const meanQ = M.mean(Q);
        let p = st.b * meanQ;
        for (let t = 0; t < st.rounds; t++) {
          prices.push(p);
          let s = 0, n = 0; for (const q of Q) { if (q > p) break; s += q; n++; }
          p = n ? Math.min(st.b * (s / n), st.b) : 0;
          if (p < 1e-4) p = 0;
        }
        prices.push(p);
        return prices;
      }
      let P, round = 0;
      const hb = pn.box();
      hb.append(h('div', { class: 'fig-title', html: '车的质量分布：<b style="color:var(--s3)">绿色</b> = 在这一轮价格下愿意卖的车' }));
      const hist = PL.plot(hb, { height: 260, x: [0, 1], y: [0, 1], yticks: [], xlabel: '车的质量 q' });
      const pb = pn.box();
      pb.append(h('div', { class: 'fig-title', text: '每一轮的市场价格' }));
      const pp = PL.plot(pb, { height: 260, x: [0, 12], y: [0, 1.6], xlabel: '轮次', ylabel: '价格' });
      hist.fn = (p) => {
        const price = P[round];
        const bins = 40, cnt = new Array(bins).fill(0);
        for (const q of Q) cnt[Math.min(bins - 1, Math.floor(q * bins))]++;
        const mx = Math.max(...cnt);
        p.y = [0, mx * 1.15];
        cnt.forEach((c0, i) => { const x = (i + 0.5) / bins; p.bars([x], [c0], { color: x <= price ? 's3' : 's7', alpha: x <= price ? 0.85 : 0.35, w: 0.9 / bins }); });
        p.vline(Math.min(price, 1), { color: 's2', dash: [], width: 2, label: `价格 ${PL.fmt(price, 2)}` });
      };
      pp.fn = (p) => {
        const xs = P.map((_, i) => i);
        p.line(xs, P, { color: 's2', width: 2.5 });
        p.dots(xs, P, { color: 's2', r: 3 });
        p.point(round, P[round], { color: 's2', r: 6 });
      };
      const sl = pn.ctrl.slider({ label: '看第几轮', min: 0, max: st.rounds, step: 1, value: 0, fmt: (v) => '第 ' + v + ' 轮', onInput: (v) => { round = v; draw(); } });
      pn.ctrl.button('▶ 播放', () => { round = 0; sl.set(0); playing = true; });
      let playing = true, acc = 0;
      PL.loop((dt) => { if (!playing) return; acc += dt; if (acc < 0.45) return; acc = 0; round++; if (round >= st.rounds) { round = st.rounds; playing = false; } sl.set(round); draw(); });
      const stats = pn.stats([
        { key: 'p', label: '这一轮的价格', color: 's2' },
        { key: 'sold', label: '愿意卖的车', color: 's3' },
        { key: 'gain', label: '实现了的交易收益', color: 's4', sub: '相对于"信息完全透明"' },
      ]);
      function draw() {
        const price = P[round];
        const sold = Q.filter((q) => q <= price);
        const full = M.sum(Q.map((q) => (st.b - 1) * q)), real = M.sum(sold.map((q) => (st.b - 1) * q));
        stats.set('p', PL.fmt(price, 3), round === 0 ? '买家按全部车的平均质量出价' : '');
        stats.set('sold', PL.pct(sold.length / Q.length, 0), sold.length ? `平均质量 ${PL.fmt(M.mean(sold), 2)}` : '市场消失了', sold.length / Q.length < 0.2 ? 'bad' : '');
        stats.set('gain', PL.pct(real / full, 0), null, real / full < 0.3 ? 'bad' : '');
        hist.render(); pp.render();
      }
      function update() { P = run(); round = 0; sl.set(0); playing = true; draw(); }
      gen(); update();
      PL.prose(root, `
        <h2>螺旋是怎么转起来的</h2>
        <p>第一轮，买家不知道哪辆车好，就按所有车的平均质量出价。可对那些好车的车主来说，这个价格低于他们的车的价值，于是好车退出市场。剩下的车平均质量下降，买家察觉后压低出价，又一批相对较好的车退出……这就是乔治·阿克洛夫 1970 年的论文《"柠檬"市场》（美国俚语里"柠檬"指次品车）。</p>
        <p>在均匀分布、b = 1.5 的情况下，每一轮价格都乘以 b/2 = 0.75，最终趋于 0：<b>市场彻底消失</b>，尽管每一笔交易本来都能让买卖双方都更好。只有当 b ≥ 2，也就是买家对车的估值比卖家高出一倍以上时，市场才能维持。</p>
        <p class="try">把 b 从 1.5 慢慢拉到 2 以上，看价格曲线从螺旋下沉变成稳定。再切换到"好坏两极"，看市场怎样只剩下坏车。</p>

        <h2>到处都是"逆向选择"</h2>
        <ul>
          <li><b>保险的死亡螺旋</b>：保费按平均风险定价，健康的人觉得不划算，退出；剩下的人平均风险更高，保费再涨，又一批相对健康的人退出。这正是强制参保、按风险分层定价存在的原因。</li>
          <li><b>招聘与跳槽</b>：主动寻找新工作的人里，被现雇主挽留不住的比例更高；雇主也知道这一点，会对跳槽者打折扣。</li>
          <li><b>贷款</b>：愿意接受高利率的借款人，往往是违约风险更高的那一批，所以银行有时宁可限额，也不靠提高利率来筛选（Stiglitz &amp; Weiss 1981）。</li>
        </ul>
        <p>市场演化出了很多对策：保修（卖家敢保修，说明对质量有信心）、品牌和声誉、第三方检测认证、二手车平台的检测报告。阿克洛夫、斯彭斯（信号理论）和斯蒂格利茨（筛选理论）因为信息不对称的研究，共同获得 2001 年诺贝尔经济学奖。</p>
        <div class="takeaway"><b>带走什么：</b>"对方愿意和我成交"本身就是信息，而且往往是坏消息。这和${PL.link('winners', '赢家诅咒')}是同一个道理：在看不清质量的市场里，先问一句：为什么偏偏是这个东西留在了这里？</div>
      `);
    },
  });
})();
