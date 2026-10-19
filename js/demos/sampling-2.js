/* 类别二（续）：你看到的样本是偏的 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 热手谬误的反转
  // ======================================================================
  function streakProp(seq, k) { // proportion of hits right after k consecutive hits; null if no eligible shots
    let a = 0, b = 0;
    for (let i = k; i < seq.length; i++) {
      let ok = true;
      for (let j = 1; j <= k; j++) if (!seq[i - j]) { ok = false; break; }
      if (ok) { b++; if (seq[i]) a++; }
    }
    return b ? a / b : null;
  }
  function expectedProp(n, k, p, r) {
    if (n <= 14) { // exact
      let s = 0, wsum = 0;
      for (let m = 0; m < 1 << n; m++) {
        const seq = []; let hits = 0;
        for (let i = 0; i < n; i++) { const v = (m >> i) & 1; seq.push(v); hits += v; }
        const pr = streakProp(seq, k);
        if (pr === null) continue;
        const w = Math.pow(p, hits) * Math.pow(1 - p, n - hits);
        s += w * pr; wsum += w;
      }
      return s / wsum;
    }
    let s = 0, c = 0;
    const T = 6000;
    for (let t = 0; t < T; t++) {
      const seq = Array.from({ length: n }, () => (r() < p ? 1 : 0));
      const pr = streakProp(seq, k);
      if (pr !== null) { s += pr; c++; }
    }
    return s / c;
  }
  PL.register({
    id: 'hothand', cat: 'sampling', nav: '热手谬误的反转：连中之后',
    title: '热手谬误的反转：证明"手感不存在"的那组统计，本身就有偏差',
    hook: '抛一枚公平硬币，看"正面之后紧跟的那一次"是正面的比例。直觉说是 50%，但对每个序列算比例再取平均，期望值只有 40% 左右。',
    related: ['regression', 'arcsine', 'bus'],
    render(root) {
      // ---- A: the n=3 table ----
      const pa = PL.panel(root, '把所有可能的序列列出来', '抛 3 次硬币，共 8 种结果，每种概率相同。对每个序列，看"正面之后的下一次"里正面占多少，再把这些比例取平均。');
      const ta = { n: 3 };
      pa.ctrl.seg({ label: '抛几次', options: [{ value: 3, label: '3 次' }, { value: 4, label: '4 次' }], value: 3, onChange: (v) => { ta.n = v; upA(); } });
      const tbl = PL.table(pa.el, ['序列', '正面之后紧跟的那几次', '其中正面的比例']);
      const sa = pa.stats([{ key: 'avg', label: '各序列比例的平均值', color: 's2', sub: '直觉以为是 50%' }]);
      function upA() {
        const rows = [];
        let s = 0, c = 0;
        for (let m = 0; m < 1 << ta.n; m++) {
          const seq = Array.from({ length: ta.n }, (_, i) => (m >> (ta.n - 1 - i)) & 1);
          const str = seq.map((v) => (v ? '正' : '反')).join(' ');
          const follow = [];
          for (let i = 1; i < ta.n; i++) if (seq[i - 1]) follow.push(seq[i] ? '<b style="color:var(--s3)">正</b>' : '<b style="color:var(--s2)">反</b>');
          const pr = streakProp(seq, 1);
          if (pr !== null) { s += pr; c++; }
          rows.push({ cells: [str, follow.length ? follow.join(' ') : '—（没有可算的）', pr === null ? '不计入' : PL.pct(pr, 0)], cls: pr === null ? 'dim' : '' });
        }
        tbl.rows(rows);
        sa.set('avg', PL.pct(s / c, 1), `${c} 个序列的平均，抛 ${ta.n} 次`, 'bad');
      }
      upA();

      // ---- B: expected proportion vs n ----
      const pb = PL.panel(root, '偏差有多大？', '对随机生成的 n 次投篮（每次命中概率 p，彼此独立：<b>没有任何热手</b>），计算"连中 k 次之后再命中"的比例，再对很多序列取平均。').cols(2);
      const tb = { k: 3, p: 0.5 };
      pb.ctrl.seg({ label: '连中几次之后', options: [1, 2, 3].map((v) => ({ value: v, label: v + ' 次' })), value: tb.k, onChange: (v) => { tb.k = v; upB(); } });
      pb.ctrl.slider({ label: '真实命中率 p', min: 0.3, max: 0.7, step: 0.05, value: tb.p, fmt: (v) => PL.pct(v, 0), onInput: PL.debounce((v) => { tb.p = v; upB(); }, 60) });
      const chB = PL.plot(pb.box(), { height: 280, x: [3, 100], y: [0.2, 0.7], xlog: true, xticks: [3, 5, 10, 20, 50, 100], xlabel: '每个人投篮的次数 n', ylabel: '"连中之后"命中率的期望', yfmt: (v) => Math.round(v * 100) + '%' });
      let CB;
      chB.fn = (p) => {
        p.hline(tb.p, { color: 'ink3', label: '真实命中率', align: 'right' });
        p.line(CB.ns, CB.ys, { color: 's2', width: 2.5 });
        p.dots(CB.ns, CB.ys, { color: 's2', r: 3 });
      };
      const own = pb.box();
      own.append(h('div', { class: 'fig-title', text: '自己投 100 次（没有热手）' }));
      const ownCtl = PL.controls(h('div', { class: 'controls' }));
      own.append(ownCtl.el);
      let seqs = [];
      ownCtl.button('再投 100 次', () => { seqs.push(Array.from({ length: 100 }, () => (Math.random() < tb.p ? 1 : 0))); drawOwn(); }, 'primary');
      ownCtl.button('清空', () => { seqs = []; drawOwn(); });
      const grid = PL.stage(own, { height: 140 }, (c, w, hh) => {
        const seq = seqs[seqs.length - 1];
        if (!seq) { c.fillStyle = PL.col('ink3'); c.font = PL.font(13); c.fillText('点"再投 100 次"', 8, 20); return; }
        const cs = Math.min(w / 25, 26);
        for (let i = 0; i < 100; i++) {
          const x = (i % 25) * cs, y = Math.floor(i / 25) * cs;
          const after = i >= tb.k && seq.slice(i - tb.k, i).every(Boolean);
          c.fillStyle = PL.col(seq[i] ? 's3' : 'grid');
          c.fillRect(x + 1, y + 1, cs - 2, cs - 2);
          if (after) { c.strokeStyle = PL.col('s2'); c.lineWidth = 2; c.strokeRect(x + 2, y + 2, cs - 4, cs - 4); }
        }
      });
      own.append(h('div', { class: 'fig-cap', html: '绿 = 命中；<b style="color:var(--s2)">红框</b> = 紧跟在连中之后、被拿来计算的那几次' }));
      const ownStats = PL.stats(own, [{ key: 'one', label: '这一组', color: 's7' }, { key: 'avg', label: '所有组的平均', color: 's2' }]);
      function drawOwn() {
        const props = seqs.map((s) => streakProp(s, tb.k)).filter((v) => v !== null);
        const last = seqs.length ? streakProp(seqs[seqs.length - 1], tb.k) : null;
        ownStats.set('one', last === null ? '—' : PL.pct(last, 0));
        ownStats.set('avg', props.length ? PL.pct(M.mean(props), 1) : '—', `${props.length} 组`);
        grid.render();
      }
      const sb = pb.stats([
        { key: 'e100', label: 'n = 100 时的期望', color: 's2' },
        { key: 'bias', label: '偏差', color: 's6', sub: '没有热手时，"连中之后"看起来反而更容易失手' },
      ]);
      function upB() {
        const r = PL.rng(17), ns = [3, 4, 5, 6, 8, 10, 12, 14, 20, 30, 50, 100].filter((n) => n > tb.k);
        CB = { ns, ys: ns.map((n) => expectedProp(n, tb.k, tb.p, r)) };
        const e = CB.ys[CB.ys.length - 1];
        sb.set('e100', PL.pct(e, 1), `真实命中率 ${PL.pct(tb.p, 0)}`, 'bad');
        sb.set('bias', PL.signed((e - tb.p) * 100, 1, ' 个百分点'));
        chB.render(); drawOwn();
      }
      upB();

      PL.prose(root, `
        <h2>一个"心理学常识"的翻转</h2>
        <p>1985 年，Gilovich、Vallone 和 Tversky 研究了篮球里的"热手"：连续投中几球之后，球员是不是更容易命中？他们比较了"连中 3 球之后的命中率"和"连失 3 球之后的命中率"，发现几乎没有差别。结论是：热手是人们在随机序列里看出规律的错觉。这篇论文成了行为经济学的经典，"热手谬误"成了常识。</p>
        <p>2018 年，Miller 和 Sanjurjo 在《计量经济学》上指出：这个检验方法本身有偏差。对每个球员的有限投篮序列，先挑出"紧跟在连中之后"的那些投篮，算命中率，再在球员之间平均。即使命中完全独立，这个统计量的期望也<b>低于</b>真实命中率。100 次投篮、连中 3 次之后，期望值只有约 46%，而不是 50%。所以"连中之后的命中率和平时一样"，其实意味着连中之后的真实命中率<b>更高</b>。修正这个偏差后，GVT 原始的对照投篮实验里就出现了显著的热手效应。</p>
        <p class="try">先看上面 3 次抛硬币的表格：8 个等概率的序列，平均比例只有 41.7%。再自己多投几组 100 次，看平均值是不是稳定在 46% 左右。</p>

        <h2>偏差从哪里来</h2>
        <p>看表格里的"正 正 反"：第一个正面之后是正面，第二个正面之后是反面，比例 50%。而"正 正 正"虽然有两次正面接正面，也只贡献一个 100%。长串正面在"按序列平均"时被压缩成了一个数，权重被低估了；而"正面后面紧跟着反面"往往出现在只能算一次的短序列里，权重被高估了。在一个有限序列里，<b>你挑选样本的条件（前面是正面）和你要测的结果（后面是不是正面）用的是同一批数据</b>，这就像${PL.link('bus', '检查悖论')}一样，抽样方式改变了平均值。</p>
        <div class="takeaway"><b>带走什么：</b>"人们在随机里看出规律"是真的，但证明这一点的统计方法也可能有偏差。对"条件于历史的统计量"（连胜之后、上涨之后、大跌之后……）要格外小心，先在纯随机的数据上跑一遍你的方法，看它的期望是不是你以为的那个数。</div>
      `);
    },
  });

  // ======================================================================
  // 低出生体重悖论
  // ======================================================================
  PL.register({
    id: 'birthweight', cat: 'sampling', nav: '低出生体重悖论：吸烟"保护"婴儿？',
    title: '低出生体重悖论：在低体重新生儿里，吸烟母亲的孩子反而死得更少',
    hook: '这不是吸烟有好处，而是"只看低体重婴儿"这一步，打开了一条虚假的因果通道。',
    related: ['berkson', 'simpson', 'survivor'],
    render(root) {
      const st = { pU: 0.06, harm: 0.004, pS: 0.3 };
      const pn = PL.panel(root, '一个按真实结构搭的模型', '新生儿体重偏低（低体重）有两类原因：母亲吸烟（比较常见，危害相对温和），以及严重的先天问题（比较少见，但致死率很高）。吸烟本身<b>只会</b>增加死亡风险。').cols(2);
      pn.ctrl.slider({ label: '严重先天问题的发生率', min: 0.01, max: 0.2, step: 0.01, value: st.pU, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.pU = v; update(); } });
      pn.ctrl.slider({ label: '吸烟对死亡率的直接危害', min: 0, max: 0.03, step: 0.001, value: st.harm, fmt: (v) => '+' + PL.fmt(v * 1000, 0) + '‰', onInput: (v) => { st.harm = v; update(); } });
      const pLBW = (S, U) => 0.04 + 0.1 * S + 0.55 * U;
      const mort = (S, U, B) => 0.004 + st.harm * S + 0.12 * U + 0.02 * B;
      function calc() {
        const res = {};
        for (const S of [0, 1]) {
          let all = [0, 0], lbw = [0, 0], nor = [0, 0];
          for (const U of [0, 1]) {
            const pu = U ? st.pU : 1 - st.pU;
            for (const B of [0, 1]) {
              const pb = B ? pLBW(S, U) : 1 - pLBW(S, U), w = pu * pb, m = mort(S, U, B);
              all[0] += w * m; all[1] += w;
              if (B) { lbw[0] += w * m; lbw[1] += w; } else { nor[0] += w * m; nor[1] += w; }
            }
          }
          res[S] = { all: all[0] / all[1], lbw: lbw[0] / lbw[1], nor: nor[0] / nor[1], shareU: (st.pU * pLBW(S, 1)) / lbw[1] };
        }
        return res;
      }
      let R;
      const bars = PL.plot(pn.box(), { height: 300, x: [-0.6, 2.6], y: [0, 100], xticks: [0, 1, 2], xfmt: (v) => ['全部新生儿', '低体重新生儿', '正常体重新生儿'][v] || '', ylabel: '死亡率（‰）', legend: [{ label: '母亲不吸烟', color: 's1', type: 'box' }, { label: '母亲吸烟', color: 's2', type: 'box' }], legendPos: 'tl' });
      bars.fn = (p) => {
        const vals = [[R[0].all, R[1].all], [R[0].lbw, R[1].lbw], [R[0].nor, R[1].nor]].map((v) => v.map((x) => x * 1000));
        const mx = Math.max(...vals.flat()) * 1.25;
        p.y = [0, mx];
        vals.forEach(([a, b], i) => {
          p.bars([i - 0.19], [a], { color: 's1', w: 0.34, alpha: 0.85 });
          p.bars([i + 0.19], [b], { color: 's2', w: 0.34, alpha: 0.85 });
          p.text(i - 0.19, a, PL.fmt(a, 1), { dy: -5, align: 'center', size: 11, color: 's1' });
          p.text(i + 0.19, b, PL.fmt(b, 1), { dy: -5, align: 'center', size: 11, color: 's2' });
        });
      };
      const dag = PL.stage(pn.box(), { height: 300 }, (c, w, hh) => {
        const node = (x, y, t, col, dash) => {
          c.font = PL.font(13, 600); const tw = c.measureText(t).width + 24;
          c.fillStyle = PL.col('paper'); c.strokeStyle = PL.col(col); c.lineWidth = 2; c.setLineDash(dash ? [4, 4] : []);
          c.beginPath(); c.roundRect(x - tw / 2, y - 17, tw, 34, 10); c.fill(); c.stroke(); c.setLineDash([]);
          c.fillStyle = PL.col('ink'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x, y + 1); c.textBaseline = 'alphabetic';
        };
        const S = [w * 0.18, 60], U = [w * 0.82, 60], B = [w / 2, hh / 2 + 6], D = [w / 2, hh - 50];
        c.strokeStyle = PL.col('ink2'); c.fillStyle = PL.col('ink2'); c.lineWidth = 2;
        const arr = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); PL.drawArrow(c, a[0] + (dx / L) * 40, a[1] + (dy / L) * 22, b[0] - (dx / L) * 46, b[1] - (dy / L) * 24, 9); };
        arr(S, B); arr(U, B); arr(B, D); arr(S, D); arr(U, D);
        node(S[0], S[1], '母亲吸烟', 's2'); node(U[0], U[1], '严重先天问题', 's6', true); node(B[0], B[1], '低出生体重', 's4'); node(D[0], D[1], '婴儿死亡', 'ink3');
        c.font = PL.font(12); c.fillStyle = PL.col('ink3'); c.textAlign = 'center';
        c.fillText('虚线框：通常没有被测量', U[0], U[1] + 34);
        c.fillStyle = PL.col('s4'); c.font = PL.font(12.5, 600);
        c.fillText('只看低体重婴儿 = 以对撞因子为条件', w / 2, hh - 12);
      });
      const stats = pn.stats([
        { key: 'all', label: '全部新生儿：吸烟 vs 不吸烟', color: 's7' },
        { key: 'lbw', label: '只看低体重新生儿', color: 's2' },
        { key: 'share', label: '低体重婴儿里，有严重先天问题的比例', color: 's6' },
      ]);
      function update() {
        R = calc();
        const f = (x) => PL.fmt(x * 1000, 1) + '‰';
        stats.set('all', `${f(R[0].all)} vs ${f(R[1].all)}`, '吸烟的更高：符合常识');
        const rev = R[1].lbw < R[0].lbw;
        stats.set('lbw', `${f(R[0].lbw)} vs ${f(R[1].lbw)}`, rev ? '吸烟的反而更低！' : '没有反转', rev ? 'bad' : '');
        stats.set('share', `${PL.pct(R[0].shareU, 0)} vs ${PL.pct(R[1].shareU, 0)}`, '不吸烟 vs 吸烟');
        bars.render(); dag.render();
      }
      update();
      PL.prose(root, `
        <h2>一个困扰了几十年的发现</h2>
        <p>1960 年代起，流行病学家 Yerushalmy 等人就注意到：总体上，吸烟母亲的孩子更容易出生体重偏低，死亡率也更高；可如果<b>只看低体重的新生儿</b>，吸烟母亲的孩子死亡率反而比不吸烟母亲的孩子低。难道吸烟对低体重婴儿有保护作用？</p>
        <p>2006 年，Hernández-Díaz、Schisterman 和 Hernán 在《美国流行病学杂志》上给出了今天公认的解释：这是<b>对撞偏倚</b>。低出生体重有不止一个原因，吸烟是其中一个，相对温和；另一些原因（严重的先天缺陷、宫内感染等）少见得多，但致命得多。在不吸烟母亲的低体重婴儿里，体重低"需要另一个解释"，所以更大比例是由那些致命原因造成的；吸烟母亲的低体重婴儿，很多只是"因为吸烟而轻"。</p>
        <p class="try">看最后一个数字：低体重婴儿里，不吸烟一组有严重先天问题的比例高得多。把"严重先天问题的发生率"调低，反转会减弱；把"吸烟的直接危害"调高，反转会消失。</p>

        <h2>和伯克森悖论是同一件事</h2>
        <p>"低出生体重"同时受吸烟和先天问题影响，是一个对撞因子。只看低体重婴儿，就相当于在对撞因子上取条件，人为制造出"吸烟"和"先天问题"之间的负相关，正如${PL.link('berkson', '伯克森悖论')}里，住院病人中两种病显得互相排斥。这又进一步造成"吸烟"和"死亡"之间的虚假负相关。</p>
        <p>同类的现象还有<b>肥胖悖论</b>（某些疾病患者中，肥胖者死亡率反而更低）和一些"保护性"的研究发现：凡是"在某个由结果间接决定的人群里比较"，都要警惕。</p>
        <div class="takeaway"><b>带走什么：</b>"分层/控制变量总是更严谨"是错的。控制一个处于因果路径上的变量（中介），或者两个原因共同的结果（对撞因子），会制造出不存在的效应。先画因果图，再决定控制什么，这和${PL.link('simpson', '辛普森悖论')}是同一课。</div>
      `);
    },
  });
})();
