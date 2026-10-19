/* 类别三（续）：选择 + 噪声 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 为什么大多数发表的发现是假的
  // ======================================================================
  PL.register({
    id: 'falsefindings', cat: 'selection', nav: '为什么多数发现是假的',
    title: '为什么大多数发表的研究发现是假的',
    hook: 'p < 0.05 意味着"如果没有效应，只有 5% 的机会看到这样的结果"，不意味着"这个发现有 95% 是真的"。后者可能低到 10%。',
    related: ['peeking', 'lindley', 'winners', 'goodhart'],
    render(root) {
      const st = { prior: 0.1, power: 0.5, alpha: 0.05, bias: 0 };
      const PRESETS = [
        { label: '大型确证性临床试验', prior: 0.5, power: 0.8, alpha: 0.05, bias: 0.05 },
        { label: '典型的探索性研究', prior: 0.1, power: 0.35, alpha: 0.05, bias: 0.1 },
        { label: '小样本 + 灵活分析', prior: 0.05, power: 0.2, alpha: 0.05, bias: 0.25 },
        { label: '基因组关联扫描（严格阈值）', prior: 0.001, power: 0.6, alpha: 5e-8, bias: 0 },
      ];
      const pn = PL.panel(root, '1000 个被研究的假设', '每个方块是一个研究假设。只有一部分是真的。研究会以一定的"统计功效"发现真效应，也会以概率 α 把假效应误判为显著；"偏差 u"表示本来不显著、却被灵活分析或选择性报告变成了"显著"的比例。');
      const sP = pn.ctrl.slider({ label: '真假设的比例', min: 0.001, max: 0.5, step: 0.001, log: true, value: st.prior, fmt: (v) => PL.pct(v, v < 0.01 ? 1 : 0), onInput: (v) => { st.prior = v; update(); } });
      const sW = pn.ctrl.slider({ label: '统计功效', min: 0.05, max: 0.95, step: 0.05, value: st.power, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.power = v; update(); } });
      const sB = pn.ctrl.slider({ label: '偏差 u', min: 0, max: 0.4, step: 0.01, value: st.bias, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.bias = v; update(); } });
      const sA = pn.ctrl.seg({ label: 'α', options: [{ value: 0.05, label: '0.05' }, { value: 0.005, label: '0.005' }, { value: 5e-8, label: '5×10⁻⁸' }], value: st.alpha, onChange: (v) => { st.alpha = v; update(); } });
      pn.ctrl.break();
      PRESETS.forEach((ps) => pn.ctrl.button(ps.label, () => { Object.assign(st, ps); sP.set(ps.prior); sW.set(ps.power); sB.set(ps.bias); sA.set(ps.alpha); update(); }));
      let C;
      const grid = PL.stage(pn.box(), { height: (w) => Math.min(300, w * 0.4) + 30 }, (c, w, hh) => {
        const cols = 50, rows = 20, cs = Math.min((w - 4) / cols, (hh - 30) / rows);
        const ox = (w - cols * cs) / 2;
        let i = 0;
        const put = (n, col, alpha, ring) => {
          for (let k = 0; k < n; k++, i++) {
            const x = ox + (i % cols) * cs, y = Math.floor(i / cols) * cs;
            c.globalAlpha = alpha; c.fillStyle = PL.col(col);
            c.fillRect(x + 1, y + 1, cs - 2, cs - 2);
            if (ring) { c.globalAlpha = 1; c.strokeStyle = PL.col('ink'); c.lineWidth = 1.4; c.strokeRect(x + 1.5, y + 1.5, cs - 3, cs - 3); }
          }
        };
        put(C.TPi, 's3', 0.95, true); put(C.FNi, 's3', 0.25, false); put(C.FPi, 's2', 0.95, true); put(C.TNi, 's7', 0.18, false);
        c.globalAlpha = 1;
        const items = [['s3', 0.95, '真的，被发现了'], ['s3', 0.25, '真的，没发现'], ['s2', 0.95, '假的，却"显著"了'], ['s7', 0.25, '假的，没显著']];
        let lx = ox;
        c.font = PL.font(12); c.textBaseline = 'middle';
        for (const [col, a, t] of items) { c.globalAlpha = a; c.fillStyle = PL.col(col); c.fillRect(lx, hh - 16, 12, 12); c.globalAlpha = 1; c.fillStyle = PL.col('ink2'); c.fillText(t, lx + 16, hh - 9); lx += c.measureText(t).width + 34; }
        c.strokeStyle = PL.col('ink'); c.strokeRect(lx, hh - 16, 12, 12); c.fillText('= 被发表的"发现"', lx + 16, hh - 9);
        c.textBaseline = 'alphabetic';
      });
      const stats = pn.stats([
        { key: 'pub', label: '发表的"显著发现"', color: 's7' },
        { key: 'true', label: '其中是真的', color: 's3' },
        { key: 'ppv', label: '一个"显著发现"为真的概率', color: 's2', sub: 'PPV，阳性预测值' },
        { key: 'miss', label: '漏掉的真效应', color: 's6' },
      ]);
      function update() {
        const N = 1000, T = N * st.prior, F = N - T;
        const TP = T * st.power + st.bias * T * (1 - st.power);
        const FP = F * st.alpha + st.bias * F * (1 - st.alpha);
        const ppv = TP / (TP + FP);
        const TPi = Math.round(TP), FPi = Math.round(FP), Ti = Math.round(T);
        C = { TPi, FNi: Math.max(0, Ti - TPi), FPi, TNi: Math.max(0, N - Ti - FPi) };
        stats.set('pub', PL.fmt(TP + FP, 1) + ' 个');
        stats.set('true', PL.fmt(TP, 1) + ' 个');
        stats.set('ppv', PL.pct(ppv, 0), null, ppv < 0.5 ? 'bad' : 'good');
        stats.set('miss', PL.fmt(T - TP, 1) + ' 个', `功效 ${PL.pct(st.power, 0)}`);
        grid.render();
      }
      update();
      PL.prose(root, `
        <h2>一道基础概率题</h2>
        <p>2005 年，John Ioannidis 发表了被引用最多的方法学论文之一：《为什么大多数发表的研究发现是假的》。论证只是一道${PL.link('screening', '筛查')}式的基础概率题。假设 1000 个被研究的假设里只有 100 个是真的，研究的统计功效是 50%，显著性阈值 α = 0.05：</p>
        <ul>
          <li>真效应被发现：100 × 50% = 50 个；</li>
          <li>假效应被误判为显著：900 × 5% = 45 个；</li>
          <li>所以"显著发现"里只有 50 / 95 ≈ 53% 是真的。</li>
        </ul>
        <p>再加上一点"偏差"（灵活的数据分析、选择性报告、只发表阳性结果），这个比例会迅速掉到一半以下。真假设越少（探索性领域）、功效越低（小样本），情况越糟。</p>
        <div class="formula">PPV = 功效 × 先验 ÷ (功效 × 先验 + α × (1 − 先验))　（不含偏差时）</div>
        <p class="try">点"小样本 + 灵活分析"：发表的发现里大多数是假的。再点"基因组关联扫描"：真假设极少，但阈值极严（5×10⁻⁸），PPV 反而很高，这就是遗传学界在经历了大量无法复现的"候选基因"研究之后改用严格阈值的原因。</p>

        <h2>真实的复现危机</h2>
        <ul>
          <li>2015 年，"开放科学合作组织"重做了 100 项发表在顶级心理学期刊上的研究，原研究里 97 项是显著的，复现中只有约 36% 显著，效应量平均缩水一半左右。</li>
          <li>2012 年，安进公司的 Begley 和 Ellis 报告：他们尝试复现 53 项"里程碑式"的癌症基础研究，只成功了 6 项（约 11%）。</li>
        </ul>
        <p>同时，发表出来的效应量也系统性偏大：只有估计值"恰好偏大"的研究才能越过显著性门槛，这正是${PL.link('winners', '赢家诅咒')}。</p>
        <div class="takeaway"><b>带走什么：</b>"p &lt; 0.05"回答的是"如果没有效应，这样的数据有多罕见"，不是"这个结论有多大可能是真的"。后者还取决于先验有多大可能、研究有多大功效、过程中有多少灵活性。读到一个惊人的新发现时，先问：这个领域里真假设的比例大概是多少？</div>
      `);
    },
  });

  // ======================================================================
  // 偷看数据
  // ======================================================================
  PL.register({
    id: 'peeking', cat: 'selection', nav: '边看边停：p 值会说谎',
    title: '边看边停：只要一直看下去，假阳性终会出现',
    hook: '做一个其实没有任何差别的 A/B 测试，每来一批数据就看一眼 p 值，一显著就宣布胜利。看 10 次，假阳性率就从 5% 变成了约 20%。',
    related: ['falsefindings', 'arcsine', 'goodhart'],
    render(root) {
      const st = { K: 10, seed: PL.seed(), m: 20 };
      const NMAX = 1000;
      const pn = PL.panel(root, '40 次没有任何真实效应的实验', '每条线是一次实验的 z 统计量随样本量的变化（两组完全一样，只有噪声）。虚线是 ±1.96，越过它就是"p &lt; 0.05"。实验者会在等距的 K 个时刻查看结果，一旦显著就停下来宣布发现（<b style="color:var(--s2)">红点</b>）。').cols(2);
      pn.ctrl.slider({ label: '查看次数 K', min: 1, max: 200, step: 1, log: true, value: st.K, fmt: (v) => v + ' 次', onInput: (v) => { st.K = v; update(); } });
      pn.ctrl.button('换一批实验', () => { st.seed = PL.seed(); gen(); update(); });
      let paths;
      function gen() {
        const r = PL.rng(st.seed);
        paths = Array.from({ length: 40 }, () => { const z = new Float64Array(NMAX); let s = 0; for (let i = 0; i < NMAX; i++) { s += r.normal(); z[i] = s / Math.sqrt(i + 1); } return z; });
      }
      const pl = PL.plot(pn.box(), { height: 320, x: [1, NMAX], y: [-4, 4], xlabel: '样本量', ylabel: 'z 统计量' });
      let stops;
      pl.fn = (p) => {
        p.rect(1, 1.96, NMAX, 4, { color: 's2', alpha: 0.06 }); p.rect(1, -4, NMAX, -1.96, { color: 's2', alpha: 0.06 });
        p.hline(1.96, { color: 's2' }); p.hline(-1.96, { color: 's2' });
        const looks = Array.from({ length: st.K }, (_, i) => Math.round(((i + 1) * NMAX) / st.K) - 1);  // z[i] is the z after i+1 samples
        if (st.K <= 40) looks.forEach((L) => p.vline(L + 1, { color: 'grid', dash: [], width: 1 }));
        stops = 0;
        paths.forEach((z) => {
          let stop = -1;
          for (const L of looks) if (Math.abs(z[L]) > 1.96) { stop = L; break; }
          const end = stop >= 0 ? stop : NMAX - 1;
          const xs = [], ys = [];
          for (let i = 0; i <= end; i += 4) { xs.push(i + 1); ys.push(z[i]); }
          xs.push(end + 1); ys.push(z[end]);
          p.line(xs, ys, { color: stop >= 0 ? 's2' : 's7', width: stop >= 0 ? 1.6 : 1, alpha: stop >= 0 ? 0.9 : 0.4 });
          if (stop >= 0) { p.dots([stop + 1], [z[stop]], { color: 's2', r: 4 }); stops++; }
        });
      };
      const cb = pn.box();
      cb.append(h('div', { class: 'fig-title', text: '假阳性率 vs. 查看次数（4000 次模拟）' }));
      const ch = PL.plot(cb, { height: 300, x: [1, 200], y: [0, 0.6], xlog: true, xlabel: '查看次数 K', yfmt: (v) => Math.round(v * 100) + '%' });
      const KS = [1, 2, 3, 5, 10, 20, 50, 100, 200];
      const fpr = (() => {
        const r = PL.rng(4), T = 4000, out = KS.map(() => 0);
        const isLook = KS.map((K) => { const a = new Uint8Array(NMAX + 1); for (let j = 1; j <= K; j++) a[Math.round((j * NMAX) / K)] = 1; return a; });
        for (let t = 0; t < T; t++) {
          let s = 0;
          const done = KS.map(() => false);
          for (let i = 1; i <= NMAX; i++) {
            s += r.normal();
            if (Math.abs(s / Math.sqrt(i)) <= 1.96) continue;
            for (let k = 0; k < KS.length; k++) if (!done[k] && isLook[k][i]) { done[k] = true; out[k]++; }
          }
        }
        return out.map((c) => c / T);
      })();
      ch.fn = (p) => {
        p.hline(0.05, { color: 's3', label: '名义上的 5%', align: 'right' });
        p.line(KS, fpr, { color: 's2', width: 2.5 });
        p.dots(KS, fpr, { color: 's2', r: 3.5 });
        p.vline(st.K, { color: 'ink3' });
      };
      const stats = pn.stats([
        { key: 'here', label: '这 40 次实验里宣布"显著"的', color: 's2' },
        { key: 'theory', label: '长期假阳性率（模拟）', color: 's6' },
        { key: 'fork', label: `同时检验 ${st.m} 个指标，至少一个显著`, color: 's4', sub: '1 − 0.95ᵐ' },
      ]);
      function update() {
        pl.render(); ch.render();
        const K = st.K;
        let est = fpr[0];
        for (let i = 0; i < KS.length; i++) if (KS[i] <= K) est = fpr[i];
        const i1 = KS.findIndex((k) => k > K);
        if (i1 > 0) { const a = KS[i1 - 1], b = KS[i1], t = (Math.log(K) - Math.log(a)) / (Math.log(b) - Math.log(a)); est = fpr[i1 - 1] + t * (fpr[i1] - fpr[i1 - 1]); }
        stats.set('here', `${stops} / 40`, null, stops > 2 ? 'bad' : '');
        stats.set('theory', PL.pct(est, 0), null, est > 0.08 ? 'bad' : '');
        stats.set('fork', PL.pct(1 - Math.pow(0.95, st.m), 0));
      }
      gen(); update();
      PL.prose(root, `
        <h2>为什么偷看会出事</h2>
        <p>p &lt; 0.05 的保证只对"<b>事先定好样本量、只看一次</b>"的检验成立。每多看一次，就多给了噪声一次越过门槛的机会，而且一旦越过你就停下来，再也不给它退回去的机会。在没有任何真实效应时，z 统计量就是一条随机游走被 √n 缩放后的轨迹，它会反复地上下摆动；按照"重对数律"，只要你一直看下去，它<b>迟早会越过任何固定的门槛</b>。也就是说，允许无限次偷看时，假阳性率会趋近 100%。</p>
        <p>Armitage 等人早在 1969 年就算过这些数字：看 5 次约 14%，看 10 次约 19%，看 100 次接近 40%。这是 A/B 测试平台最常见的错误之一。</p>
        <p class="try">把查看次数从 1 拖到 200，数一数红点：每一个都是一篇"发现了显著效应"的报告，而真相是两组完全一样。</p>

        <h2>分岔小径的花园</h2>
        <p>偷看只是"研究者自由度"的一种。Simmons、Nelson 和 Simonsohn（2011）演示了：在不说谎的前提下，只要组合几种常见的灵活操作（多测几个因变量、看情况追加样本、选择性加入协变量、选择性报告实验条件），假阳性率可以达到约 61%。Gelman 把这叫"分岔小径的花园"：即使你只做了一次分析，"如果数据长得不一样，你会选择另一种分析"本身就让 p 值失效了。</p>

        <h2>正确的做法</h2>
        <ul>
          <li><b>预注册</b>：事先写下样本量、主要指标和分析方法。</li>
          <li><b>序贯设计</b>：如果确实需要中途查看，就使用为此设计的边界（如 O'Brien–Fleming），把总的 α 分配到各次查看上；现代 A/B 测试平台用"始终有效的 p 值"来允许随时查看。</li>
          <li><b>多重比较校正</b>：同时检验很多指标时，降低每个检验的阈值，或控制错误发现率。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>一个统计显著的结果值多少，取决于<b>它是怎么被找到的</b>。只要"停下来的时机"或"报告哪个指标"依赖于数据本身，p 值就不再是它表面上的意思。这正是${PL.link('falsefindings', '大多数发现为假')}的机制之一，背后则是${PL.link('arcsine', '随机游走')}的反直觉性质。</div>
      `);
    },
  });
})();
