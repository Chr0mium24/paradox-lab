/* 类别五：量法变了，东西没变 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 筛查悖论
  // ======================================================================
  PL.register({
    id: 'screening', cat: 'measure', nav: '筛查悖论：生存率涨了，没人多活',
    title: '筛查悖论：五年生存率大涨，却没有一个人多活一天',
    hook: '查得越早，"从确诊算起"的生存时间就越长，哪怕治疗完全无效。再加上查出一堆本来不会致命的"癌"，生存率能漂亮得惊人。',
    related: ['willrogers', 'bus', 'goodhart', 'regression'],
    render(root) {
      const N = 20000;
      const st = { iv: 2, cure: 0, ind: 0.25 };
      // fixed random draws, so sliders change outcomes smoothly and both arms see the same people
      const base = (() => {
        const r = PL.rng(20260419), P = [];
        for (let i = 0; i < N; i++) {
          const other = M.clamp(80 + 9 * r.normal(), 41, 106);
          const has = r() < 0.12;
          P.push({ other, has, T0: 45 + 35 * r(), S: Math.exp(Math.log(2.5) + 0.8 * r.normal()), Ds: r.exp(3), uInd: r(), uCure: r() });
        }
        return P;
      })();
      function run() {
        const screens = [];
        for (let a = 50; a <= 75 + 1e-9; a += st.iv) screens.push(a);
        const A = { dx: 0, surv5: 0, cdeath: 0, sojourn: [] }, B = { dx: 0, surv5: 0, cdeath: 0, over: 0, sojourn: [] };
        const examples = [];
        for (let i = 0; i < N; i++) {
          const p = base[i];
          if (!p.has || p.T0 >= p.other) continue;
          const indolent = p.uInd < st.ind;
          const Tc = indolent ? Infinity : p.T0 + p.S;
          const dCancer = Tc + p.Ds;
          // arm A
          let aDx = Tc < p.other ? Tc : null;
          const aDeath = Math.min(p.other, dCancer);
          const aCancerDeath = dCancer < p.other;
          if (aDx !== null) { A.dx++; if (aDeath > aDx + 5) A.surv5++; A.sojourn.push(p.S); }
          if (aCancerDeath) A.cdeath++;
          // arm B
          let sDx = null;
          for (const s of screens) { if (s >= p.T0 && s < Math.min(Tc, p.other)) { sDx = s; break; } }
          let bDx = aDx, bDeath = aDeath, bCancerDeath = aCancerDeath, how = aDx !== null ? 'clin' : null;
          if (sDx !== null) {
            bDx = sDx; how = 'screen';
            if (!indolent && p.uCure < st.cure) { bDeath = p.other; bCancerDeath = false; }
            B.sojourn.push(indolent ? 40 : p.S);
            if (aDx === null) B.over++;
          }
          if (bDx !== null) { B.dx++; if (bDeath > bDx + 5) B.surv5++; }
          if (bCancerDeath) B.cdeath++;
          if (examples.length < 12 && i % 7 === 3 && (aDx !== null || sDx !== null)) examples.push({ T0: p.T0, aDx, aDeath, aCancerDeath, bDx, bDeath, bCancerDeath, how, indolent });
        }
        return { A, B, examples };
      }
      const pn = PL.panel(root, '同一批 2 万人，两种世界', '左边：没有筛查，有症状才确诊。右边：50–75 岁定期筛查，在"能查到但还没症状"的阶段就确诊。两个世界里是<b>完全相同的人</b>，有着完全相同的肿瘤。');
      pn.ctrl.slider({ label: '筛查间隔', min: 1, max: 5, step: 1, value: st.iv, fmt: (v) => v + ' 年一次', onInput: (v) => { st.iv = v; update(); } });
      pn.ctrl.slider({ label: '早查早治能治好的比例', min: 0, max: 0.8, step: 0.05, value: st.cure, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.cure = v; update(); } });
      pn.ctrl.slider({ label: '惰性肿瘤的比例', min: 0, max: 0.6, step: 0.05, value: st.ind, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.ind = v; update(); } });
      pn.ctrl.text('（惰性肿瘤 = 一辈子都不会长大、不会致命的那种）');
      const lines = PL.plot(pn.box(), { height: 420, x: [40, 110], y: [-0.6, 23.6], yticks: [], xlabel: '年龄', pad: { l: 96 } });
      pn.box().append(h('div', { class: 'fig-cap', html: '每个病人两行：上 = 无筛查，下 = 有筛查。浅色 = 已经有肿瘤但还没确诊；深色 = 确诊之后（"生存时间"从这里开始计）。<b style="color:var(--s1)">■</b> 有症状确诊 <b style="color:var(--s3)">▲</b> 筛查发现 <b style="color:var(--s2)">✕</b> 死于癌症 <b style="color:var(--ink3)">✕</b> 死于其他原因' }));
      const tbl = PL.table(pn.el, ['每 1 万人', '无筛查', '有筛查', '变化']);
      const stats = pn.stats([
        { key: 's5', label: '确诊者的 5 年生存率', color: 's3' },
        { key: 'cd', label: '每万人癌症死亡', color: 's2' },
        { key: 'over', label: '每万人过度诊断', color: 's6', sub: '没有筛查就一辈子不会被诊断' },
        { key: 'len', label: '被查出的肿瘤：平均潜伏期', color: 's4', sub: '长度偏倚：慢的更容易被撞上' },
      ]);
      let R;
      lines.fn = (p) => {
        const c = p.ctx;
        R.examples.forEach((e, k) => {
          for (const arm of [0, 1]) {
            const y = 23 - (2 * k + arm);
            const dx = arm ? e.bDx : e.aDx, death = arm ? e.bDeath : e.aDeath, cd = arm ? e.bCancerDeath : e.aCancerDeath;
            p.line([40, Math.min(e.T0, death)], [y, y], { color: 'line', width: 3 });
            if (dx !== null) {
              p.line([e.T0, dx], [y, y], { color: arm ? 's3' : 's1', width: 5, alpha: 0.25 });
              p.line([dx, death], [y, y], { color: arm ? 's3' : 's1', width: 5, alpha: 0.85 });
              const X = p.X(dx), Y = p.Y(y);
              c.fillStyle = PL.col(arm && e.how === 'screen' ? 's3' : 's1');
              c.beginPath();
              if (arm && e.how === 'screen') { c.moveTo(X, Y - 6); c.lineTo(X + 5.5, Y + 4); c.lineTo(X - 5.5, Y + 4); } else c.rect(X - 4.5, Y - 4.5, 9, 9);
              c.fill();
              p.text(death, y, PL.fmt(death - dx, 1) + ' 年', { dx: 10, dy: 4, size: 10.5, color: 'ink3' });
            } else {
              p.line([e.T0, death], [y, y], { color: 's7', width: 5, alpha: 0.25 });
            }
            const X = p.X(death), Y = p.Y(y);
            c.strokeStyle = PL.col(cd ? 's2' : 'ink3'); c.lineWidth = 2;
            c.beginPath(); c.moveTo(X - 4, Y - 4); c.lineTo(X + 4, Y + 4); c.moveTo(X + 4, Y - 4); c.lineTo(X - 4, Y + 4); c.stroke();
          }
        });
      };
      lines.after = (p) => R.examples.forEach((e, k) => {
        for (const arm of [0, 1]) p.textPx(p.L - 8, p.Y(23 - (2 * k + arm)) + 4, arm ? '有筛查' : `病人 ${k + 1}${e.indolent ? '（惰性）' : ''}`, { align: 'right', size: 10.5, color: arm ? 'ink3' : 'ink2', halo: false });
      });
      function update() {
        R = run();
        const { A, B } = R, f = 10000 / N;
        const s5A = A.surv5 / A.dx, s5B = B.surv5 / B.dx;
        tbl.rows([
          ['确诊人数', PL.int(A.dx * f), PL.int(B.dx * f), PL.signedPct(B.dx / A.dx - 1)],
          ['确诊后活过 5 年的比例', PL.pct(s5A, 0), PL.pct(s5B, 0), PL.signed((s5B - s5A) * 100, 0, ' 个百分点')],
          ['死于这种癌症的人数', PL.int(A.cdeath * f), PL.int(B.cdeath * f), PL.signedPct(B.cdeath / A.cdeath - 1)],
        ]);
        stats.set('s5', `${PL.pct(s5A, 0)} → ${PL.pct(s5B, 0)}`, null, 'good');
        const dd = B.cdeath / A.cdeath - 1;
        stats.set('cd', `${PL.int(A.cdeath * f)} → ${PL.int(B.cdeath * f)}`, st.cure === 0 ? '一个都没少：治疗无效时只是提前知道' : `下降 ${PL.pct(-dd, 0)}：这才是真实的好处`, dd > -0.005 ? 'bad' : 'good');
        stats.set('over', PL.int(B.over * f));
        const lenA = M.mean(A.sojourn), lenB = M.mean(B.sojourn.filter((v) => v < 40));
        stats.set('len', `${PL.fmt(lenA, 1)} → ${PL.fmt(lenB, 1)} 年`, '症状确诊 → 筛查发现（不含惰性肿瘤）');
        lines.render();
      }
      update();
      PL.prose(root, `
        <h2>三种偏倚，叠在一起</h2>
        <p><b>提前期偏倚</b>（lead-time bias）。一个人 67 岁出现症状、确诊癌症，70 岁去世：从确诊算起活了 3 年，记为"没有活过 5 年"。如果 60 岁就通过筛查查出来，同样 70 岁去世：从确诊算起活了 10 年，记为"存活"。生存率从 0% 变成 100%，寿命一天没变，变的只是开始计时的那一刻。</p>
        <p class="try">先保持"早查早治能治好的比例" = 0%（治疗完全无效）：5 年生存率大幅上升，癌症死亡人数一个都没少。再把它调到 50%，看真正的好处出现在哪一行。</p>
        <p><b>长度偏倚</b>（length bias），其实就是${PL.link('bus', '检查悖论')}：长得慢的肿瘤处在"能查到、但还没有症状"的窗口里更久，所以更容易被定期筛查撞上。筛查查出来的病例天然偏向病情温和的那一批，它们本来预后就更好。</p>
        <p><b>过度诊断</b>（overdiagnosis）。有些"癌"一辈子都不会造成伤害：要么长得极慢，要么根本不长，要么病人会先死于别的原因。没有筛查，这些人一辈子都不会知道；有了筛查，他们被诊断为癌症患者，被手术、被治疗，并且全部计入"5 年生存者"，让生存率更好看。</p>
        <p class="try">把"惰性肿瘤的比例"调高：确诊人数暴涨，生存率更好看，死亡人数还是没变。</p>

        <h2>真实的例子</h2>
        <ul>
          <li><b>韩国的甲状腺癌</b>：1999 年起韩国推行国家癌症筛查，甲状腺超声作为便宜的附加项目被大量使用。到 2011 年，甲状腺癌的诊断率是 1993 年的 15 倍，成了韩国最常见的癌症，死亡率却基本没变（Ahn, Kim &amp; Welch, <i>NEJM</i> 2014）。多查出来的几乎都是本来不需要治疗的人，很多人因此切除了甲状腺、终身服药。</li>
          <li><b>朱利安尼的数字</b>：2007 年，朱利安尼说美国前列腺癌的 5 年生存率是 82%，英国只有 44%，以此攻击英国的公费医疗。这个差距主要来自美国普遍做 PSA 筛查；两国前列腺癌的死亡率几乎一样（Gigerenzer 等人用这个例子讲解过医疗统计的误读）。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>衡量一项筛查或干预有没有用，要看<b>按总人口算的死亡率</b>，不能看<b>从发现那一刻算起的生存率</b>。推广开来：凡是"从检测到它那一刻开始计时"的指标，都会因为检测得更早、更多而变好看。软件里也一样：监控做好以后，平均故障恢复时间会变好看（因为抓到了一堆小故障），bug 数会上升（因为测试变强了），这两个数字都不能直接说明系统变好了还是变差了。</div>
      `);
    },
  });

  // ======================================================================
  // 威尔·罗杰斯现象
  // ======================================================================
  PL.register({
    id: 'willrogers', cat: 'measure', nav: '威尔·罗杰斯现象：两组都变好了',
    title: '威尔·罗杰斯现象：病人一个没变，两组的生存率都提高了',
    hook: '把 I 期里病情最重的几个人改判为 II 期，I 期的平均预后变好了，II 期的平均预后也变好了，可没有任何一个病人的结局改变。',
    related: ['screening', 'simpson', 'goodhart'],
    render(root) {
      const T0 = 60;
      const st = { T: 45 };
      const pts = (() => { const r = PL.rng(1985); return Array.from({ length: 240 }, () => { const s = 100 * r(); return { s, y: 12 * Math.exp(-s / 45) * Math.exp(0.18 * r.normal()) }; }); })();
      const groupMeans = (T) => {
        const a = pts.filter((p) => p.s < T), b = pts.filter((p) => p.s >= T);
        return { I: M.mean(a.map((p) => p.y)), II: M.mean(b.map((p) => p.y)), all: M.mean(pts.map((p) => p.y)), nI: a.length, nII: b.length };
      };
      const pn = PL.panel(root, '移动分期的分界线', '每个点是一个病人：横轴是真实的病情严重程度，纵轴是他的预期生存年数（只取决于病情本身）。分界线左边算 I 期，右边算 II 期。原来的标准在 60。更灵敏的检查，相当于把分界线往左移：一些原本被当作 I 期的人，被发现其实有微小转移。').cols(2);
      const sl = pn.ctrl.slider({ label: '分期分界线', min: 15, max: 85, step: 1, value: st.T, fmt: (v) => String(v), onInput: (v) => { st.T = v; update(); }, wide: true });
      pn.ctrl.button('回到原来的标准（60）', () => { st.T = T0; sl.set(T0); update(); });
      const sc = PL.plot(pn.box(), { height: 320, x: [0, 100], y: [0, 16], xlabel: '真实病情严重程度', ylabel: '预期生存年数' });
      const mb = pn.box(); mb.append(h('div', { class: 'fig-title', text: '各组平均生存年数 vs. 分界线位置' }));
      const mp = PL.plot(mb, { height: 290, x: [15, 85], y: [0, 10], xlabel: '分期分界线', legend: [{ label: 'I 期平均', color: 's1' }, { label: 'II 期平均', color: 's2' }, { label: '全体平均（不变）', color: 'ink3', dash: [5, 4] }], legendPos: 'tr' });
      sc.fn = (p) => {
        const g = groupMeans(st.T), g0 = groupMeans(T0);
        p.rect(0, 0, st.T, 16, { color: 's1', alpha: 0.05 });
        p.rect(st.T, 0, 100, 16, { color: 's2', alpha: 0.05 });
        p.dots(pts.map((q) => q.s), pts.map((q) => q.y), { r: 3, alpha: 0.75, colors: pts.map((q) => (q.s < st.T ? 's1' : 's2')) });
        p.vline(T0, { color: 'ink3', dash: [2, 3], label: '原标准' });
        p.vline(st.T, { color: 'ink', dash: [], width: 2, label: '现标准', align: st.T < T0 ? 'left' : 'left' });
        p.line([0, st.T], [g.I, g.I], { color: 's1', width: 3 });
        p.line([st.T, 100], [g.II, g.II], { color: 's2', width: 3 });
        p.line([0, T0], [g0.I, g0.I], { color: 's1', width: 1.5, dash: [4, 4] });
        p.line([T0, 100], [g0.II, g0.II], { color: 's2', width: 1.5, dash: [4, 4] });
        if (st.T < T0) p.rect(st.T, 0, T0, 16, { color: 's6', alpha: 0.14 });
      };
      mp.fn = (p) => {
        const Ts = M.linspace(15, 85, 141);
        const gs = Ts.map(groupMeans);
        p.line(Ts, gs.map((g) => g.I), { color: 's1', width: 2.5 });
        p.line(Ts, gs.map((g) => g.II), { color: 's2', width: 2.5 });
        p.line(Ts, gs.map((g) => g.all), { color: 'ink3', width: 1.5, dash: [5, 4] });
        p.vline(st.T, { color: 'ink' });
        const g = groupMeans(st.T);
        p.point(st.T, g.I, { color: 's1' }); p.point(st.T, g.II, { color: 's2' });
      };
      const stats = pn.stats([
        { key: 'I', label: 'I 期平均生存', color: 's1' },
        { key: 'II', label: 'II 期平均生存', color: 's2' },
        { key: 'all', label: '全体平均生存', color: 's7' },
        { key: 'mv', label: '被"改判"的病人', color: 's6' },
      ]);
      function update() {
        const g = groupMeans(st.T), g0 = groupMeans(T0);
        const dl = (a, b) => `原标准 ${PL.fmt(b, 2)}，${PL.signed(a - b, 2, ' 年')}`;
        stats.set('I', PL.fmt(g.I, 2) + ' 年', dl(g.I, g0.I), g.I > g0.I + 0.005 ? 'good' : g.I < g0.I - 0.005 ? 'bad' : '');
        stats.set('II', PL.fmt(g.II, 2) + ' 年', dl(g.II, g0.II), g.II > g0.II + 0.005 ? 'good' : g.II < g0.II - 0.005 ? 'bad' : '');
        stats.set('all', PL.fmt(g.all, 2) + ' 年', '一个病人都没变');
        stats.set('mv', PL.int(Math.abs(g.nI - g0.nI)) + ' 人', st.T < T0 ? '从 I 期 → II 期' : st.T > T0 ? '从 II 期 → I 期' : '');
        sc.render(); mp.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>被改判的病人有一个特点：在 I 期里，他们是病情最重的（拉低了 I 期的平均）；在 II 期里，他们是病情最轻的（拉高了 II 期的平均）。把他们从 I 期挪到 II 期，两组的平均值<b>都</b>上升了，全体平均却纹丝不动。</p>
        <p class="try">把分界线从 60 往左拖到 30：两条实线（现在的组平均）都比虚线（原标准的组平均）高。往右拖则两组都变差。</p>
        <p>名字来自美国幽默作家威尔·罗杰斯的一句俏皮话，大意是：大萧条时期俄克拉何马人迁往加州，同时提高了两个州的平均智商。1985 年，Feinstein 等人在 <i>NEJM</i> 上用这个名字描述肺癌研究里的现象：新的影像技术（CT 等）发现了更多微小转移，许多病人被"升期"，于是各期的生存率都比旧数据好，但病人的实际结局并没有改善。他们称之为<b>分期迁移</b>（stage migration）。</p>

        <h2>到处都有</h2>
        <ul>
          <li><b>医院之间比较</b>：一家医院的分期标准更严格（查得更细），它的每一期生存率都会比另一家好看。</li>
          <li><b>学校分班</b>：把 A 班成绩最差的几个学生调到 B 班，如果他们仍高于 B 班平均，两个班的平均分都会上升。</li>
          <li><b>绩效分档</b>：调整"优秀/合格"的分档线，两档的平均绩效可以同时变好看。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>分组平均值的变化，不一定意味着组里任何个体有变化，可能只是分组的边界动了。比较不同时期、不同机构的分组数据前，先确认分组标准是否一致；最稳妥的是看<b>不分组</b>的总体指标。</div>
      `);
    },
  });

  // ======================================================================
  // 辛普森悖论
  // ======================================================================
  PL.register({
    id: 'simpson', cat: 'measure', nav: '辛普森悖论：分开看和合起来看',
    title: '辛普森悖论：每一组都是 A 更好，合起来却是 B 更好',
    hook: '分组看还是合并看，数据本身回答不了，要看因果结构。同样的数字，换一个故事，正确答案就反过来。',
    related: ['berkson', 'willrogers', 'smallsample'],
    render(root) {
      const R = { As: 81 / 87, Al: 192 / 263, Bs: 234 / 270, Bl: 55 / 80 };
      const st = { aHard: 263 / 350, bHard: 80 / 350, story: 'conf' };
      const STORY = {
        conf: { T: '治疗方案', A: '开放手术 A', B: '微创手术 B', Z: '结石大小', z0: '小结石', z1: '大结石', aHard: 'A 方案病人里大结石的比例', bHard: 'B 方案病人里大结石的比例', Y: '治疗成功' },
        med: { T: '药物', A: '药物 A', B: '药物 B', Z: '服药后的血压', z0: '血压正常', z1: '血压偏高', aHard: '服 A 后血压偏高的比例', bHard: '服 B 后血压偏高的比例', Y: '康复' },
      };
      const pn = PL.panel(root, '肾结石的两种手术', '数据来自 Charig 等（1986, <i>BMJ</i>）：每种手术 350 个病人。成功率在每一组内固定，滑块只改变"难治的病例怎么分配"。').cols(2);
      const segS = pn.ctrl.seg({ label: '故事', options: [{ value: 'conf', label: '第三个变量是混杂因素' }, { value: 'med', label: '第三个变量是中介' }], value: st.story, onChange: (v) => { st.story = v; update(); } });
      pn.ctrl.break();
      const sA = pn.ctrl.slider({ label: '', min: 0, max: 1, step: 0.01, value: st.aHard, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.aHard = v; update(); } });
      const sB = pn.ctrl.slider({ label: '', min: 0, max: 1, step: 0.01, value: st.bHard, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.bHard = v; update(); } });
      pn.ctrl.button('原始数据', () => { st.aHard = 263 / 350; st.bHard = 80 / 350; sA.set(st.aHard); sB.set(st.bHard); update(); });
      const bars = PL.plot(pn.box(), { height: 300, x: [-0.6, 2.6], y: [0.5, 1], xticks: [0, 1, 2], yfmt: (v) => Math.round(v * 100) + '%', ylabel: '成功率', legend: [{ label: 'A', color: 's1', type: 'box' }, { label: 'B', color: 's2', type: 'box' }], legendPos: 'tr' });
      const dag = PL.stage(pn.box(), { height: 300 });
      const tbl = PL.table(pn.el, ['', '', '', '']);
      const verdict = pn.html('', 'panel-html');
      let agg;
      bars.fn = (p) => {
        const vals = [[R.As, R.Bs], [R.Al, R.Bl], [agg.A, agg.B]];
        vals.forEach(([a, b], i) => {
          p.bars([i - 0.19], [a], { color: 's1', w: 0.34, base: 0.5, alpha: 0.85 });
          p.bars([i + 0.19], [b], { color: 's2', w: 0.34, base: 0.5, alpha: 0.85 });
          p.text(i - 0.19, a, PL.pct(a, 0), { dy: -5, align: 'center', size: 11.5, color: 's1' });
          p.text(i + 0.19, b, PL.pct(b, 0), { dy: -5, align: 'center', size: 11.5, color: 's2' });
        });
        p.vline(1.5, { color: 'line', dash: [], width: 1 });
      };
      dag.draw = (c, w, hh) => {
        const S = STORY[st.story];
        const node = (x, y, t, col) => {
          c.font = PL.font(13, 600);
          const tw = c.measureText(t).width + 22;
          c.fillStyle = PL.col('paper'); c.strokeStyle = PL.col(col); c.lineWidth = 2;
          c.beginPath(); c.roundRect(x - tw / 2, y - 17, tw, 34, 10); c.fill(); c.stroke();
          c.fillStyle = PL.col('ink'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, x, y + 1);
          return tw;
        };
        const Z = [w / 2, 60], T = [w * 0.2, hh - 90], Y = [w * 0.8, hh - 90];
        c.strokeStyle = PL.col('ink2'); c.lineWidth = 2;
        const arr = (a, b, sh = 0) => { const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); const ux = dx / L, uy = dy / L; PL.drawArrow(c, a[0] + ux * 42, a[1] + uy * 24, b[0] - ux * 50, b[1] - uy * 26, 9); };
        c.fillStyle = PL.col('ink2');
        if (st.story === 'conf') { arr(Z, T); arr(Z, Y); } else { arr(T, Z); arr(Z, Y); }
        arr(T, Y);
        node(Z[0], Z[1], S.Z, 's6'); node(T[0], T[1], S.T, 's1'); node(Y[0], Y[1], S.Y, 's3');
        c.font = PL.font(12); c.fillStyle = PL.col('ink2'); c.textAlign = 'center'; c.textBaseline = 'alphabetic';
        c.fillText(st.story === 'conf' ? '结石大小同时影响"选哪种手术"和"能否成功"' : '药物先改变血压，血压再影响康复', w / 2, hh - 40);
        c.fillStyle = PL.col('ink'); c.font = PL.font(13, 600);
        c.fillText(st.story === 'conf' ? '→ 应该分组看（控制混杂）' : '→ 应该合并看（不能控制中介）', w / 2, hh - 16);
      };
      function update() {
        const S = STORY[st.story];
        bars.o.xfmt = (v) => [S.z0, S.z1, '合并'][v] || '';
        sA.el.querySelector('.ctl-label').textContent = S.aHard;
        sB.el.querySelector('.ctl-label').textContent = S.bHard;
        agg = { A: (1 - st.aHard) * R.As + st.aHard * R.Al, B: (1 - st.bHard) * R.Bs + st.bHard * R.Bl };
        tbl.el.querySelector('thead tr').innerHTML = `<th></th><th>${S.z0}</th><th>${S.z1}</th><th>合并</th>`;
        const nA = 350, nB = 350;
        const cell = (rate, n) => `${PL.pct(rate, 0)} <span style="color:var(--ink3)">(${Math.round(rate * n)}/${Math.round(n)})</span>`;
        tbl.rows([
          [S.A, cell(R.As, nA * (1 - st.aHard)), cell(R.Al, nA * st.aHard), cell(agg.A, nA)],
          [S.B, cell(R.Bs, nB * (1 - st.bHard)), cell(R.Bl, nB * st.bHard), cell(agg.B, nB)],
        ]);
        const rev = agg.B > agg.A;
        const right = st.story === 'conf' ? `${S.A}（分组看，两组都更好）` : `${rev ? S.B : S.A}（合并看）`;
        verdict.innerHTML = (rev ? '<b style="color:var(--bad)">出现反转</b>：每一组里 A 都更好，合并后 B 更好。' : '没有反转：合并后仍是 A 更好。') + ` 在"${st.story === 'conf' ? '混杂' : '中介'}"的故事里，正确的结论是：<b>${right}</b>。`;
        bars.render(); dag.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>1986 年的一项研究比较了两种肾结石手术。小结石：开放手术 A 成功率 93%，微创 B 87%；大结石：A 73%，B 69%。<b>两组里都是 A 更好</b>。可把两组合在一起，A 是 78%，B 是 83%，<b>反而 B 更好</b>。</p>
        <p>原因在于病例分配：医生倾向于让难治的大结石病人做开放手术，A 的 350 个病人里有 75% 是大结石，B 只有 23%。合并后，A 的成功率被大量难治病例拉低了。</p>
        <p class="try">把两个滑块调成一样（两种手术分到的大结石比例相同），反转立刻消失。</p>

        <h2>真正的难点：数据回答不了该信哪个</h2>
        <p>Judea Pearl 指出，辛普森悖论真正难的地方不是算术，而是：<b>同样一张表，该分组看还是合并看，取决于你对因果结构的判断</b>，数据本身给不出答案。</p>
        <ul>
          <li><b>混杂因素</b>（结石大小 → 选哪种手术，结石大小 → 成功率）：结石大小影响了"谁做了哪种手术"，合并比较时 A 吃了亏。应当<b>分组</b>，结论是 A 更好。</li>
          <li><b>中介变量</b>（药物 → 血压 → 康复）：切到"中介"的故事，数字一模一样，但第三个变量是药物<b>造成</b>的结果。分组比较等于问"在血压一样的人里，哪种药更好"，这把药物通过降血压起作用的那部分效果抹掉了。应当<b>合并</b>，结论是 B 更好。</li>
        </ul>
        <p>反过来，如果第三个变量是${PL.link('berkson', '对撞因子')}，按它分组会无中生有地制造相关。三种结构，三种处理方法。</p>

        <h2>更多例子</h2>
        <ul>
          <li><b>伯克利录取</b>（1973）：总体上男性录取率明显高于女性，看起来像性别歧视；分院系看，大多数院系女性录取率并不低。原因是女性更多地申请了竞争激烈、录取率低的院系。</li>
          <li><b>新冠病死率</b>：2020 年有比较显示，意大利的总体病死率高于中国，但在每个年龄组里意大利都更低。意大利的确诊病例里老年人比例高得多。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>看到"总体趋势"和"分组趋势"矛盾时，不要急着挑一个更顺眼的。先画出因果图：第三个变量是原因（混杂）、结果（中介），还是被筛选出来的（对撞）？答案决定了该信哪一个。</div>
      `);
    },
  });

  // ======================================================================
  // 古德哈特定律
  // ======================================================================
  PL.register({
    id: 'goodhart', cat: 'measure', nav: '古德哈特定律：指标一变成目标',
    title: '古德哈特定律：指标一旦变成目标，就不再是好指标',
    hook: '轻轻优化一个指标，真实目标也跟着变好；优化得太狠，挑出来的就变成了"最会钻指标空子的"，而不是"真正最好的"。',
    related: ['winners', 'screening', 'willrogers'],
    render(root) {
      const st = { nu: 2, sigma: 1, n: 300, seed: PL.seed() };
      const NS = [1, 2, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 2000, 5000, 10000];
      const pn = PL.panel(root, '从 n 个候选里挑"指标最高"的', '每个候选有一个真实价值 V ~ N(0, 1)。你看不到 V，只能看到指标 = V + 误差。"误差"代表指标里可以被钻空子、被刷出来的那部分。误差的尾巴越厚，越可能出现"指标极高、真实一般"的候选。').cols(2);
      pn.ctrl.slider({ label: '优化压力：候选数 n', min: 1, max: 10000, step: 1, log: true, value: st.n, fmt: (v) => PL.int(v), onInput: PL.debounce((v) => { st.n = v; upPoint(); }, 30) });
      pn.ctrl.slider({ label: '误差尾巴的厚度', min: 1, max: 30, step: 0.5, value: st.nu, fmt: (v) => (v >= 30 ? '薄（≈正态）' : 't 分布 ν=' + v), onInput: PL.debounce((v) => { st.nu = v; build(); }, 60) });
      pn.ctrl.slider({ label: '误差大小 σ', min: 0.2, max: 2, step: 0.05, value: st.sigma, fmt: (v) => PL.fmt(v, 2), onInput: PL.debounce((v) => { st.sigma = v; build(); }, 60) });
      const cb = pn.box(); cb.append(h('div', { class: 'fig-title', text: '被选中者的平均真实价值 vs. 优化压力' }));
      const ch = PL.plot(cb, { height: 300, x: [1, 10000], y: [-0.5, 3.5], xlog: true, xlabel: '候选数 n（越大 = 指标优化得越狠）', ylabel: '真实价值', legend: [{ label: '误差是正态的（薄尾）', color: 's1' }, { label: '误差是厚尾的（可以刷）', color: 's2' }, { label: '上帝视角：真正最好的', color: 'ink3', dash: [5, 4] }], legendPos: 'tl' });
      const sbx = pn.box(); sbx.append(h('div', { class: 'fig-title', text: '3000 个候选：指标 vs. 真实价值（厚尾误差）' }));
      const sc = PL.plot(sbx, { height: 300, x: [-4, 12], y: [-3.5, 3.5], xlabel: '指标（你看得到的）', ylabel: '真实价值（你看不到的）' });
      const stats = pn.stats([
        { key: 'thin', label: '薄尾误差：选中者的真实价值', color: 's1' },
        { key: 'fat', label: '厚尾误差：选中者的真实价值', color: 's2' },
        { key: 'share', label: '厚尾时，选中者的指标里"刷出来"的占比', color: 's6' },
      ]);
      let C, S;
      function sample(n, fat, r) {
        let bestP = -Infinity, bestV = 0, bestE = 0;
        for (let i = 0; i < n; i++) {
          const V = r.normal();
          const E = st.sigma * (fat ? r.t(st.nu) * (st.nu > 2 ? Math.sqrt((st.nu - 2) / st.nu) : 1) : r.normal());
          if (V + E > bestP) { bestP = V + E; bestV = V; bestE = E; }
        }
        return { V: bestV, E: bestE, P: bestP };
      }
      function stat(n, fat, trials, r) { let v = 0, e = 0, p = 0; for (let t = 0; t < trials; t++) { const s = sample(n, fat, r); v += s.V; e += s.E; p += s.P; } return { V: v / trials, E: e / trials, P: p / trials }; }
      function build() {
        C = { thin: [], fat: [], best: [] };
        for (const n of NS) {
          const tr = n > 2000 ? 40 : n > 300 ? 80 : 200;
          C.thin.push(stat(n, false, tr, PL.rng(n * 3 + 1)).V);
          C.fat.push(stat(n, true, tr, PL.rng(n * 3 + 2)).V);
          C.best.push(expMax(n));
        }
        const r = PL.rng(st.seed), pts = [];
        for (let i = 0; i < 3000; i++) { const V = r.normal(); const E = st.sigma * r.t(st.nu) * (st.nu > 2 ? Math.sqrt((st.nu - 2) / st.nu) : 1); pts.push([V + E, V]); }
        S = pts;
        upPoint();
      }
      const emCache = {};
      function expMax(n) { // E[max of n standard normals]
        if (emCache[n]) return emCache[n];
        const r = PL.rng(n + 999), tr = n > 2000 ? 30 : 200;
        let s = 0; for (let t = 0; t < tr; t++) { let m = -Infinity; for (let i = 0; i < n; i++) m = Math.max(m, r.normal()); s += m; }
        return (emCache[n] = s / tr);
      }
      let cur;
      ch.fn = (p) => {
        p.hline(0, { color: 'ink3', label: '随便挑一个', align: 'right' });
        p.line(NS, C.best, { color: 'ink3', width: 1.5, dash: [5, 4] });
        p.line(NS, C.thin, { color: 's1', width: 2.5 });
        p.line(NS, C.fat, { color: 's2', width: 2.5 });
        p.vline(st.n, { color: 'ink3' });
        p.point(st.n, cur.thin.V, { color: 's1' });
        p.point(st.n, cur.fat.V, { color: 's2' });
      };
      sc.fn = (p) => {
        const sorted = S.map((q) => q[0]).sort((a, b) => b - a);
        const k = Math.max(1, Math.round(3000 / st.n));
        const thr = sorted[Math.min(k, sorted.length) - 1];
        const sel = S.filter((q) => q[0] >= thr);
        p.dots(S.map((q) => Math.min(q[0], 11.8)), S.map((q) => q[1]), { color: 's7', r: 2.2, alpha: 0.4 });
        p.dots(sel.map((q) => Math.min(q[0], 11.8)), sel.map((q) => q[1]), { color: 's2', r: 3.5, alpha: 0.9 });
        p.vline(thr, { color: 's2', label: `前 ${k} 名` });
        p.hline(M.mean(sel.map((q) => q[1])), { color: 's2', label: '被选中者的平均真实价值', align: 'left' });
      };
      function upPoint() {
        const tr = st.n > 2000 ? 60 : st.n > 300 ? 120 : 300;
        cur = { thin: stat(st.n, false, tr, PL.rng(5)), fat: stat(st.n, true, tr, PL.rng(6)) };
        stats.set('thin', PL.fmt(cur.thin.V, 2), '指标越优化，真实越好');
        stats.set('fat', PL.fmt(cur.fat.V, 2), cur.fat.V < cur.thin.V * 0.6 ? '优化过头：挑出来的是钻空子的' : '', cur.fat.V < cur.thin.V * 0.6 ? 'bad' : '');
        stats.set('share', PL.pct(cur.fat.E / cur.fat.P, 0));
        ch.render(); sc.render();
      }
      build();
      PL.prose(root, `
        <h2>一句话的由来</h2>
        <p>英国经济学家 Charles Goodhart 在 1975 年观察到：央行一旦把某个货币统计量当作政策目标，这个统计量和经济之间原有的关系就会失效。后来人类学家 Marilyn Strathern 把它概括成今天流行的版本："当一个度量变成目标，它就不再是一个好的度量。"社会学里对应的说法叫坎贝尔定律。</p>

        <h2>这个模拟说明了什么</h2>
        <p>指标 = 真实价值 + 误差。<b>轻度优化</b>时（n 小），指标高的候选，真实价值通常也高，指标是好用的。<b>重度优化</b>时（n 大），能把指标推到极端的，主要是误差项极端的候选。如果误差是薄尾的（正态），真实价值仍会继续上升，只是被${PL.link('winners', '优化者诅咒')}打了折扣；如果误差是厚尾的，也就是存在"可以把指标刷得极高"的捷径，被选中者的真实价值会先升后降，最后回到和随便挑一个差不多的水平。</p>
        <p class="try">把"误差尾巴的厚度"调到 1–2，然后把优化压力从 1 拖到 10000：红线先升后降。再把尾巴调到 30（≈ 正态），红线一路上升。</p>
        <p>这和 AI 对齐研究里的观察一致：Gao 等人（2022）用一个"代理奖励模型"去优化语言模型，代理奖励一路上升，而用更可靠的"金标准"评估，真实质量先升后降，被称为<b>奖励过度优化</b>（reward overoptimization）。</p>

        <h2>现实里</h2>
        <ul>
          <li><b>河内的老鼠</b>：1902 年，法属河内为了灭鼠，按上交的老鼠尾巴发放赏金。很快街上出现了没有尾巴的活老鼠：人们剪下尾巴后把老鼠放生，让它们继续繁殖，甚至有人专门养鼠（历史学家 Michael Vann 记录了这段历史）。"眼镜蛇效应"是同类故事里更有名、但出处更模糊的一个。</li>
          <li><b>论文数和引用数</b>：当它们成为评价标准，切香肠式发表、互相引用、灌水期刊就会兴起。</li>
          <li><b>考核 KPI</b>：考核"工单关闭数"，工单就被拆碎、草草关闭；考核"代码行数"，代码就变长。</li>
          <li><b>${PL.link('screening', '五年生存率')}</b>：把它当作医疗质量的目标，最省力的提高办法是多筛查、早诊断，而不是让病人活得更久。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>指标在"观察"时是好指标，在"被优化"时会变质，优化越狠变质越快。对策：同时看多个难以一起造假的指标；定期更换或抽查指标背后的真实情况；对指标的极端值保持怀疑，它们最可能是钻空子钻出来的。</div>
      `);
    },
  });
})();
