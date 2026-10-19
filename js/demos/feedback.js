/* 类别六：反馈、延迟与耦合 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 轨道交会
  // ======================================================================
  PL.register({
    id: 'orbit', cat: 'feedback', nav: '轨道交会：想追上要先减速',
    title: '轨道交会：想追上前面的飞船，要先减速',
    hook: '对准前面的目标踩油门，目标反而越来越远。在轨道上，加速会让你变慢，减速才能让你追上。',
    related: ['bullwhip', 'parrondo'],
    render(root) {
      const st = { dv: 0.02, warp: 1, drag: false, paused: false };
      const PHI0 = 0.35;
      let ship, t, trail, rel, auto, msg, crashed;
      function reset() {
        t = 0; ship = { x: 1, y: 0, vx: 0, vy: 1 };
        trail = []; rel = []; auto = null; msg = '目标在你前方约 20°。试着追上它（距离 &lt; 0.02）。'; crashed = false;
      }
      reset();
      const tgtAt = (tt) => { const th = PHI0 + tt; return { x: Math.cos(th), y: Math.sin(th), vx: -Math.sin(th), vy: Math.cos(th), th }; };
      const dragK = (r) => 0.0012 * Math.exp(-(r - 1) / 0.08);
      function deriv(s) {
        const r2 = s.x * s.x + s.y * s.y, r = Math.sqrt(r2), g = -1 / (r2 * r);
        let ax = g * s.x, ay = g * s.y;
        if (st.drag) { const v = Math.hypot(s.vx, s.vy), k = dragK(r) * v; ax -= k * s.vx; ay -= k * s.vy; }
        return [s.vx, s.vy, ax, ay];
      }
      function rk4(s, dt) {
        const add = (a, d, f) => ({ x: a.x + d[0] * f, y: a.y + d[1] * f, vx: a.vx + d[2] * f, vy: a.vy + d[3] * f });
        const k1 = deriv(s), k2 = deriv(add(s, k1, dt / 2)), k3 = deriv(add(s, k2, dt / 2)), k4 = deriv(add(s, k3, dt));
        return { x: s.x + dt / 6 * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]), y: s.y + dt / 6 * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]), vx: s.vx + dt / 6 * (k1[2] + 2 * k2[2] + 2 * k3[2] + k4[2]), vy: s.vy + dt / 6 * (k1[3] + 2 * k2[3] + 2 * k3[3] + k4[3]) };
      }
      const energy = (s) => 0.5 * (s.vx * s.vx + s.vy * s.vy) - 1 / Math.hypot(s.x, s.y);
      const period = (s) => { const E = energy(s); return E < 0 ? 2 * Math.PI * Math.pow(-1 / (2 * E), 1.5) : Infinity; };
      const phase = () => { const T = tgtAt(t); let d = T.th - Math.atan2(ship.y, ship.x); d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; return d; };
      function burn(kind, dv = st.dv) {
        if (crashed) return;
        let ux, uy;
        if (kind === 'target') { const T = tgtAt(t); ux = T.x - ship.x; uy = T.y - ship.y; }
        else { ux = ship.vx; uy = ship.vy; if (kind === 'retro') { ux = -ux; uy = -uy; } }
        const L = Math.hypot(ux, uy) || 1;
        ship.vx += (dv * ux) / L; ship.vy += (dv * uy) / L;
        if (kind !== 'auto') auto = null;
        if (kind === 'target') msg = '你对准目标点了火……接下来看它是不是靠近了。';
        if (kind === 'pro') msg = '向前加速：你的轨道变高、周期变长，你会<b>落后</b>。';
        if (kind === 'retro') msg = '向后减速：你的轨道变低、周期变短，你会<b>超过去</b>。';
        draw();
      }
      function autopilot() {
        const r = Math.hypot(ship.x, ship.y), v = Math.hypot(ship.vx, ship.vy);
        if (Math.abs(r - 1) > 0.03 || Math.abs(v - 1) > 0.03) { msg = '自动驾驶需要你在原来的圆轨道上，先点"重置"。'; draw(); return; }
        const phi = phase();
        const Tp = 2 * Math.PI - phi;
        const a = Math.pow(Tp / (2 * Math.PI), 2 / 3);
        const vNeed = Math.sqrt(2 / r - 1 / a);
        burn('auto', vNeed - v);
        auto = { at: t + Tp };
        msg = phi > 0 ? `目标领先 ${PL.fmt((phi * 180) / Math.PI, 1)}°：先<b>减速</b> ${PL.fmt(v - vNeed, 4)}，降到低一点的轨道，绕一圈只要 ${PL.fmt(Tp, 2)}（目标要 ${PL.fmt(2 * Math.PI, 2)}）……` : `目标在后面：先<b>加速</b>，升到高一点的轨道，等它追上来……`;
      }
      const pn = PL.panel(root, '你在圆轨道上，目标在前方 20°', '中心是地球，你（蓝）和目标（橙）在同一条圆轨道上逆时针飞行。虚线是你当前的预测轨道。右上角小图：以目标为中心的相对位置（向上 = 比目标高，向右 = 在目标前面）。');
      pn.ctrl.button('▲ 向前点火（加速）', () => burn('pro'), 'primary');
      pn.ctrl.button('▼ 向后点火（减速）', () => burn('retro'), 'primary');
      pn.ctrl.button('→ 对准目标点火', () => burn('target'));
      pn.ctrl.button('演示正确做法', autopilot);
      pn.ctrl.button('重置', () => { reset(); draw(); });
      const pauseBtn = pn.ctrl.button('暂停', () => { st.paused = !st.paused; pauseBtn.textContent = st.paused ? '继续' : '暂停'; });
      pn.ctrl.break();
      pn.ctrl.slider({ label: '每次点火 Δv', min: 0.005, max: 0.1, step: 0.005, value: st.dv, fmt: (v) => PL.fmt(v, 3), onInput: (v) => { st.dv = v; } });
      pn.ctrl.slider({ label: '时间流速', min: 0.25, max: 4, step: 0.25, value: st.warp, fmt: (v) => '× ' + v, onInput: (v) => { st.warp = v; } });
      pn.ctrl.toggle({ label: '大气阻力（只作用于你）', value: st.drag, onChange: (v) => { st.drag = v; msg = v ? '阻力在消耗你的能量。看看你的速度是变快还是变慢。' : msg; } });
      const msgEl = pn.html('', 'panel-html');
      let pred = [];
      const stage = PL.stage(pn.box(), { height: (w) => Math.min(520, Math.max(360, w * 0.62)) }, (c, w, hh) => {
        const S = Math.min(w * 0.5, hh) * 0.42, cx = w * 0.42, cy = hh / 2;
        const P = (x, y) => [cx + x * S, cy - y * S];
        // target orbit
        c.strokeStyle = PL.col('line'); c.lineWidth = 1; c.beginPath(); c.arc(cx, cy, S, 0, 7); c.stroke();
        // earth
        const grd = c.createRadialGradient(cx - S * 0.1, cy - S * 0.1, S * 0.05, cx, cy, S * 0.33);
        grd.addColorStop(0, PL.col('s5')); grd.addColorStop(1, PL.col('s1'));
        c.fillStyle = grd; c.globalAlpha = 0.85; c.beginPath(); c.arc(cx, cy, S * 0.33, 0, 7); c.fill(); c.globalAlpha = 1;
        if (st.drag) { c.strokeStyle = PL.col('s5'); c.globalAlpha = 0.25; c.lineWidth = S * 0.5; c.beginPath(); c.arc(cx, cy, S * 0.6, 0, 7); c.stroke(); c.globalAlpha = 1; }
        // predicted orbit
        c.setLineDash([4, 5]); c.strokeStyle = PL.col('s1'); c.lineWidth = 1.5; c.globalAlpha = 0.7;
        c.beginPath(); pred.forEach(([x, y], i) => { const [X, Y] = P(x, y); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke();
        c.setLineDash([]); c.globalAlpha = 1;
        // trail
        c.strokeStyle = PL.col('s1'); c.lineWidth = 2;
        c.beginPath(); trail.forEach(([x, y], i) => { const [X, Y] = P(x, y); i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke();
        // bodies
        const T = tgtAt(t);
        const [tx, ty] = P(T.x, T.y), [sx, sy] = P(ship.x, ship.y);
        c.fillStyle = PL.col('s2'); c.beginPath(); c.arc(tx, ty, 6, 0, 7); c.fill();
        c.fillStyle = PL.col('s1'); c.beginPath(); c.arc(sx, sy, 6, 0, 7); c.fill();
        c.strokeStyle = PL.col('s1'); c.lineWidth = 1.5;
        const vv = Math.hypot(ship.vx, ship.vy);
        PL.drawArrow(c, sx, sy, sx + (ship.vx / vv) * 26, sy - (ship.vy / vv) * 26, 6);
        c.font = PL.font(12, 600); c.fillStyle = PL.col('s2'); c.textAlign = 'left'; c.fillText('目标', tx + 9, ty - 6);
        c.fillStyle = PL.col('s1'); c.fillText('你', sx + 9, sy + 14);
        // inset: relative frame
        const iw = Math.min(220, w * 0.3), ih = iw, ix = w - iw - 8, iy = 8;
        c.fillStyle = PL.col('paper'); c.strokeStyle = PL.col('line'); c.lineWidth = 1;
        c.beginPath(); c.roundRect(ix, iy, iw, ih, 10); c.fill(); c.stroke();
        let mx = 0.05; for (const [a, b] of rel) mx = Math.max(mx, Math.abs(a), Math.abs(b));
        const s2 = (iw / 2 - 16) / mx, icx = ix + iw / 2, icy = iy + ih / 2 + 8;
        c.strokeStyle = PL.col('grid'); c.beginPath(); c.moveTo(ix + 8, icy); c.lineTo(ix + iw - 8, icy); c.moveTo(icx, iy + 24); c.lineTo(icx, iy + ih - 8); c.stroke();
        c.strokeStyle = PL.col('s1'); c.lineWidth = 1.5; c.beginPath();
        rel.forEach(([a, b], i) => { const X = icx + a * s2, Y = icy - b * s2; i ? c.lineTo(X, Y) : c.moveTo(X, Y); }); c.stroke();
        c.fillStyle = PL.col('s2'); c.beginPath(); c.arc(icx, icy, 4, 0, 7); c.fill();
        if (rel.length) { const [a, b] = rel[rel.length - 1]; c.fillStyle = PL.col('s1'); c.beginPath(); c.arc(icx + a * s2, icy - b * s2, 4, 0, 7); c.fill(); }
        c.font = PL.font(11); c.fillStyle = PL.col('ink3'); c.textAlign = 'left';
        c.fillText('以目标为中心', ix + 10, iy + 16);
        c.textAlign = 'right'; c.fillText('前 →', ix + iw - 8, icy - 4);
        c.textAlign = 'left'; c.fillText('↑ 高', icx + 4, iy + 34);
      });
      const stats = pn.stats([
        { key: 'dist', label: '离目标的距离', color: 's2' },
        { key: 'phase', label: '目标领先你', color: 's4' },
        { key: 'v', label: '你的速度（目标 1.000）', color: 's1' },
        { key: 'T', label: '你绕一圈的时间（目标 6.283）', color: 's5' },
        { key: 'E', label: '你的机械能（目标 −0.500）', color: 's6' },
      ]);
      function predict() {
        pred = [];
        let s = { ...ship };
        const T = Math.min(period(ship), 12);
        const n = 360, dt = (isFinite(T) ? T : 8) / n;
        for (let i = 0; i <= n; i++) { pred.push([s.x, s.y]); for (let k = 0; k < 2; k++) s = rk4(s, dt / 2); if (Math.hypot(s.x, s.y) < 0.33) break; }
      }
      function draw() {
        predict();
        const T = tgtAt(t);
        const d = Math.hypot(T.x - ship.x, T.y - ship.y);
        stats.set('dist', PL.fmt(d, 3), null, d < 0.02 ? 'good' : '');
        stats.set('phase', PL.fmt((phase() * 180) / Math.PI, 1) + '°');
        stats.set('v', PL.fmt(Math.hypot(ship.vx, ship.vy), 3));
        const P = period(ship);
        stats.set('T', isFinite(P) ? PL.fmt(P, 3) : '逃逸');
        stats.set('E', PL.fmt(energy(ship), 3));
        msgEl.innerHTML = msg;
        stage.render();
      }
      let sinceTrail = 0;
      PL.loop((dt) => {
        if (st.paused || crashed) return;
        const simDt = dt * st.warp;
        const steps = Math.max(1, Math.ceil(simDt / 0.002));
        const hstep = simDt / steps;
        for (let i = 0; i < steps; i++) {
          if (auto && t + hstep >= auto.at) {
            const r = Math.hypot(ship.x, ship.y), v = Math.hypot(ship.vx, ship.vy);
            burn('auto', Math.sqrt(1 / r) - v);
            auto = null;
            msg = '绕完一圈回到原处，再<b>加速</b>回到圆轨道。看距离：你追上了。';
          }
          ship = rk4(ship, hstep);
          t += hstep;
          sinceTrail += hstep;
          if (sinceTrail > 0.02) {
            sinceTrail = 0;
            trail.push([ship.x, ship.y]); if (trail.length > 700) trail.shift();
            const T = tgtAt(t), dx = ship.x - T.x, dy = ship.y - T.y;
            rel.push([-Math.sin(T.th) * dx + Math.cos(T.th) * dy, Math.cos(T.th) * dx + Math.sin(T.th) * dy]); if (rel.length > 900) rel.shift();
          }
          if (Math.hypot(ship.x, ship.y) < 0.36) { crashed = true; msg = '你掉进大气层烧掉了。点"重置"再来。'; break; }
        }
        const T = tgtAt(t);
        if (Math.hypot(T.x - ship.x, T.y - ship.y) < 0.02 && !msg.startsWith('追上')) msg = '追上了！' + (st.drag ? '' : ' 现在试试只用"对准目标点火"能不能做到。');
        draw();
      });
      draw();
      PL.prose(root, `
        <h2>真实的故事</h2>
        <p>1965 年 6 月，双子座 4 号的任务之一是靠近并伴飞自己抛掉的火箭末级。宇航员麦克迪维特像开车一样，对准目标点火加速，目标却越来越远；换个角度再试，还是越追越远。燃料消耗掉一大截之后，任务只好放弃。同年 12 月，双子座 6A 用正确的方法完成了人类第一次轨道交会。巴兹·奥尔德林 1963 年在 MIT 写的博士论文，研究的正是载人轨道交会的方法。</p>
        <p class="try">先试试"对准目标点火"几次，看相对位置小图里你的轨迹怎么走；再点"重置"，按"演示正确做法"。</p>

        <h2>为什么加速反而变慢</h2>
        <p>圆轨道上 v = √(GM/r)：轨道越低越快，周期越短。向前点火会把你送上一个更高的椭圆轨道，平均高度变高，绕一圈的时间变长，于是在角度上你<b>落在后面</b>。正确的做法是反着来：向后点火，降到低一点的轨道，从内圈"抄近道"，绕一圈后正好追到目标身边，再向前点火升回原来的圆轨道。</p>
        <p>右上角的小图（以目标为中心）里，向前点火的轨迹会先往上翘，再向后漂走，形成一个个向后的圈；这就是飞行动力学里的 Hill 方程（Clohessy–Wiltshire 方程）描述的运动。</p>

        <h2>更深一层：能量越多越慢</h2>
        <p>对引力束缚的系统，维里定理给出：<b>总能量 = −动能</b>。给它加能量（向前点火），动能反而<b>减少</b>；让它损失能量，它反而变快。</p>
        <ul>
          <li><b>卫星阻力悖论</b>：打开"大气阻力"。阻力一直在消耗你的能量，你的速度却一直在<b>增加</b>，轨道越来越低、越来越快，最后坠入大气层。</li>
          <li><b>恒星有"负热容"</b>：恒星向外辐射能量，会收缩，然后变得<b>更热</b>。反过来，核心如果烧得太猛，恒星就膨胀、降温，反应随之变慢。这种自带的负反馈，是恒星能稳定燃烧几十亿年的原因之一。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>在有守恒量和强约束的系统里，"直接朝目标推"可能得到相反的效果。先弄清系统守恒的是什么、受什么约束，再决定往哪个方向用力。${PL.link('bullwhip', '牛鞭效应')}是同一类教训在供应链里的版本。</div>
      `);
    },
  });

  // ======================================================================
  // 排队论
  // ======================================================================
  PL.register({
    id: 'queue', cat: 'feedback', nav: '排队论：满负荷就是灾难',
    title: '排队论：利用率接近 100% 时，等待时间会爆炸',
    hook: '一个窗口从 80% 忙到 95% 忙，等待时间不是多 19%，而是多将近 5 倍。降低波动、合并队列，和增加人手一样有效。',
    related: ['braess', 'bus', 'bullwhip'],
    render(root) {
      // ---- A: P-K curve ----
      const a = { rho: 0.8, cs: 1 };
      const pa = PL.panel(root, '① 单个窗口：等待时间 vs. 利用率', '顾客随机到达（泊松过程），每人平均服务 1 分钟。等待时间由 Pollaczek–Khinchine 公式给出：等待 = ρ/(1−ρ) × (1 + C<sub>s</sub>²)/2 × 平均服务时间。');
      pa.ctrl.slider({ label: '利用率 ρ', min: 0.1, max: 0.98, step: 0.01, value: a.rho, fmt: (v) => PL.pct(v, 0), onInput: (v) => { a.rho = v; upA(); }, wide: true });
      pa.ctrl.slider({ label: '服务时间的变异系数 Cₛ', min: 0, max: 2, step: 0.05, value: a.cs, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { a.cs = v; upA(); } });
      const W = (rho, cs) => (rho / (1 - rho)) * (1 + cs * cs) / 2;
      const chA = PL.plot(pa.box(), { height: 270, x: [0, 1], y: [0, 25], xlabel: '利用率 ρ', xfmt: (v) => Math.round(v * 100) + '%', ylabel: '平均等待（分钟）', legend: [{ label: '服务时间固定（Cₛ = 0）', color: 's3' }, { label: '服务时间随机（Cₛ = 1）', color: 's7' }, { label: '当前 Cₛ', color: 's2' }], legendPos: 'tl' });
      chA.fn = (p) => {
        p.func((r) => W(r, 0), { color: 's3', width: 2, n: 400 });
        p.func((r) => W(r, 1), { color: 's7', width: 2, n: 400 });
        p.func((r) => W(r, a.cs), { color: 's2', width: 3, n: 400 });
        p.point(a.rho, W(a.rho, a.cs), { color: 's2', label: PL.fmt(W(a.rho, a.cs), 1) + ' 分钟' });
      };
      const sa = pa.stats([
        { key: 'w', label: '当前平均等待', color: 's2' },
        { key: 'r', label: '利用率 80% → 95%，等待变成', color: 's6' },
        { key: 'cs', label: '把服务时间的波动降到 0，等待变成', color: 's3' },
      ]);
      function upA() {
        sa.set('w', PL.fmt(W(a.rho, a.cs), 2) + ' 分钟');
        sa.set('r', '× ' + PL.fmt(W(0.95, a.cs) / W(0.8, a.cs), 2), '只多忙了 15 个百分点');
        sa.set('cs', a.cs > 0 ? '× ' + PL.fmt(W(a.rho, 0) / W(a.rho, a.cs), 2) : '—', '不加人，只减少波动');
        chA.render();
      }
      upA();

      // ---- B: pooled vs separate ----
      const b = { c: 4, rho: 0.85, cs: 1, speed: 4, seed: PL.seed() };
      const pb = PL.panel(root, '② 各排各的队 vs. 一条队多个窗口', '同样 c 个窗口、同样的顾客流、同样的服务时间。左边：顾客到达时随机分到某个窗口排队（像分诊到指定医生、每个收银台各排一队且不许换）。右边：所有人排一条队，哪个窗口空了谁就去。');
      pb.ctrl.slider({ label: '窗口数 c', min: 2, max: 8, step: 1, value: b.c, fmt: (v) => v + ' 个', onInput: (v) => { b.c = v; upB(); } });
      pb.ctrl.slider({ label: '利用率 ρ', min: 0.5, max: 0.97, step: 0.01, value: b.rho, fmt: (v) => PL.pct(v, 0), onInput: (v) => { b.rho = v; upB(); } });
      pb.ctrl.slider({ label: '服务时间波动 Cₛ', min: 0, max: 2, step: 0.05, value: b.cs, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { b.cs = v; upB(); } });
      pb.ctrl.slider({ label: '动画速度', min: 1, max: 20, step: 1, value: b.speed, fmt: (v) => '× ' + v, onInput: (v) => { b.speed = v; } });
      function simulate(n, seed, keep) {
        const r = PL.rng(seed), lam = b.rho * b.c;
        const k = b.cs < 0.02 ? 0 : Math.min(1e4, 1 / (b.cs * b.cs));
        const arr = new Float64Array(n), svc = new Float64Array(n), asg = new Int32Array(n);
        let t = 0;
        for (let i = 0; i < n; i++) { t += r.exp(1 / lam); arr[i] = t; svc[i] = k ? r.gamma(k, 1 / k) : 1; asg[i] = r.int(b.c); }
        const out = { arr };
        const run = (pooled) => {
          const free = new Float64Array(b.c), start = new Float64Array(n), end = new Float64Array(n), srv = new Int32Array(n);
          let wsum = 0;
          for (let i = 0; i < n; i++) {
            let s = asg[i];
            if (pooled) { s = 0; for (let j = 1; j < b.c; j++) if (free[j] < free[s]) s = j; }
            const st0 = Math.max(arr[i], free[s]);
            start[i] = st0; end[i] = st0 + svc[i]; srv[i] = s; free[s] = end[i];
            wsum += st0 - arr[i];
          }
          return { start, end, srv, mean: wsum / n };
        };
        out.sep = run(false); out.pool = run(true);
        return out;
      }
      let big, anim, tau = 0;
      const stage = PL.stage(pb.box(), { height: 300 }, (c, w, hh) => {
        if (!anim) return;
        const half = w / 2;
        c.font = PL.font(13, 600); c.textAlign = 'center'; c.fillStyle = PL.col('ink2');
        c.fillText('各排各的队', half / 2, 18); c.fillText('一条队，多个窗口', half + half / 2, 18);
        c.strokeStyle = PL.col('line'); c.beginPath(); c.moveTo(half, 30); c.lineTo(half, hh - 10); c.stroke();
        const { arr } = anim;
        const lo = lowerBound(arr, tau - 600), hi = lowerBound(arr, tau);
        const draw = (sys, x0, pooled) => {
          const cw = Math.min(56, (half - 30) / b.c), base = hh - 40, rr = Math.min(5, cw / 4);
          const qs = Array.from({ length: b.c }, () => 0), busy = new Array(b.c).fill(false);
          let qAll = 0;
          for (let i = lo; i < hi; i++) {
            if (sys.end[i] <= tau) continue;
            if (sys.start[i] <= tau) busy[sys.srv[i]] = true;
            else { if (pooled) qAll++; else qs[sys.srv[i]]++; }
          }
          const totalW = cw * b.c, left = x0 + (half - totalW) / 2;
          for (let j = 0; j < b.c; j++) {
            const x = left + j * cw + cw / 2;
            c.fillStyle = PL.col(busy[j] ? 's1' : 'grid'); c.strokeStyle = PL.col('s1'); c.lineWidth = 1.5;
            c.beginPath(); c.roundRect(x - cw * 0.38, base, cw * 0.76, 22, 5); c.fill(); c.stroke();
            if (!pooled) {
              c.fillStyle = PL.col('s2');
              for (let q = 0; q < qs[j]; q++) { const yy = base - 10 - q * (rr * 2 + 2); if (yy < 34) { c.fillText('…', x, 40); break; } c.beginPath(); c.arc(x, yy, rr, 0, 7); c.fill(); }
            }
          }
          if (pooled) {
            c.fillStyle = PL.col('s2');
            const perRow = Math.max(1, Math.floor(totalW / (rr * 2 + 3)));
            for (let q = 0; q < qAll; q++) { const row = Math.floor(q / perRow), col = q % perRow; const yy = base - 12 - row * (rr * 2 + 3); if (yy < 34) break; c.beginPath(); c.arc(left + rr + col * (rr * 2 + 3), yy, rr, 0, 7); c.fill(); }
          }
          const qn = pooled ? qAll : qs.reduce((s2, v) => s2 + v, 0);
          c.font = PL.font(12); c.fillStyle = PL.col('ink3'); c.textAlign = 'center';
          c.fillText(`正在排队：${qn} 人`, x0 + half / 2, hh - 4);
        };
        draw(anim.sep, 0, false); draw(anim.pool, half, true);
      });
      function lowerBound(a, v) { let l = 0, r = a.length; while (l < r) { const m = (l + r) >> 1; if (a[m] < v) l = m + 1; else r = m; } return l; }
      const sb = pb.stats([
        { key: 'sep', label: '各排各的队：平均等待', color: 's2' },
        { key: 'pool', label: '一条队：平均等待', color: 's3' },
        { key: 'ratio', label: '合并队列后，等待缩短到', color: 's4' },
      ]);
      function upB() {
        big = simulate(150000, b.seed, false);
        anim = simulate(6000, b.seed + 1, true);
        tau = 0;
        sb.set('sep', PL.fmt(big.sep.mean, 2) + ' 分钟', '每个窗口就是一个独立的单窗口队列');
        sb.set('pool', PL.fmt(big.pool.mean, 2) + ' 分钟', null, 'good');
        sb.set('ratio', PL.pct(big.pool.mean / big.sep.mean, 0), '人手一个没加');
        stage.render();
      }
      upB();
      PL.loop((dt) => {
        if (!anim) return;
        tau += dt * b.speed;
        if (tau > anim.arr[anim.arr.length - 1]) tau = 0;
        stage.render();
      });
      PL.prose(root, `
        <h2>为什么是 1/(1 − ρ)</h2>
        <p>利用率 ρ 是窗口忙碌的时间比例。ρ = 80% 时，窗口有 20% 的空闲时间来"消化"随机涌来的一波波顾客；ρ = 95% 时，只剩 5%。队列一旦排起来，要靠这些空闲时间慢慢消化，空闲越少，消化越慢，等待时间就按 ρ/(1−ρ) 增长：80% 时是 4 倍平均服务时间，90% 时是 9 倍，95% 时是 19 倍，99% 时是 99 倍。</p>
        <p class="try">把利用率从 80% 拖到 95%，看曲线有多陡。然后把 Cₛ 拖到 0：同样的利用率，等待减半。</p>

        <h2>两个比"加人"更便宜的办法</h2>
        <p><b>降低波动</b>。公式里的 (1 + C<sub>s</sub>²)/2 说明：服务时间越不稳定，等待越长。完全标准化的服务（C<sub>s</sub> = 0）比完全随机的服务（C<sub>s</sub> = 1）等待少一半。到达的波动也一样（Kingman 公式把两者放在一起）。这就是为什么丰田式生产强调"均衡化"，为什么${PL.link('bus', '公交串车')}比班次少更伤人。</p>
        <p><b>合并队列</b>。各排各的队时，常常出现"这边排了五个人，那边窗口却空着"的情况，空闲的产能被浪费了。一条队多个窗口，只要有人在等，就不会有窗口闲着。银行、机场安检、医院分诊台改成"一条蛇形队"，用的就是这个原理。</p>

        <h2>它在哪里</h2>
        <ul>
          <li><b>工程团队</b>：每个人都 100% 排满，任何一件新事都要等很久。留 20% 的余量不是浪费，是让系统能响应的必要条件。</li>
          <li><b>服务器</b>：CPU 利用率从 70% 涨到 90%，延迟可能翻好几倍。容量规划通常会给关键服务留出明显的余量。</li>
          <li><b>高速公路</b>：接近通行能力时，一次轻微刹车就会引发长时间的幽灵堵车。${PL.link('braess', '布雷斯悖论')}里的"窄路"就是这样一段接近饱和的路。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>"满负荷运转"听起来很高效，在有随机波动的系统里却是等待时间的灾难。想缩短等待，除了加产能，还可以减少波动、合并队列、留出余量。</div>
      `);
    },
  });

  // ======================================================================
  // 牛鞭效应
  // ======================================================================
  PL.register({
    id: 'bullwhip', cat: 'feedback', nav: '牛鞭效应：越往上游波动越大',
    title: '牛鞭效应：顾客只多买了一点，工厂的订单却剧烈震荡',
    hook: '零售商、批发商、分销商、工厂，每一环都在理性地应对延迟和不确定性。合在一起，需求的一点小波动，传到上游变成了大起大落。',
    related: ['orbit', 'queue', 'thrift'],
    render(root) {
      const TIERS = ['零售商', '批发商', '分销商', '工厂'], COLS = ['s1', 's5', 's6', 's2'];
      const WEEKS = 52;
      const st = { alpha: 0.3, beta: 0.2, L: 2, theta: 0.3, pattern: 'step', seed: PL.seed() };
      const pn = PL.panel(root, '啤酒游戏：一条四级供应链', '每一级每周：收到下游的订单 → 能发多少发多少（欠的记账） → 预测需求 → 给上游下单。货物在每两级之间运输需要 L 周。每一级都希望库存保持在 12 箱。').cols(2);
      pn.ctrl.seg({ label: '顾客需求', options: [{ value: 'step', label: '第 5 周从 4 箱涨到 8 箱' }, { value: 'noise', label: '每周随机波动' }, { value: 'promo', label: '一次促销' }], value: st.pattern, onChange: (v) => { st.pattern = v; update(); } });
      pn.ctrl.button('重新抽样', () => { st.seed = PL.seed(); update(); });
      pn.ctrl.break();
      pn.ctrl.slider({ label: '补库存的急切程度 α', min: 0.05, max: 1, step: 0.05, value: st.alpha, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.alpha = v; update(); } });
      pn.ctrl.slider({ label: '记得"已经在路上的货" β', min: 0, max: 1, step: 0.05, value: st.beta, fmt: (v) => PL.pct(v, 0), onInput: (v) => { st.beta = v; update(); } });
      pn.ctrl.slider({ label: '运输延迟 L', min: 1, max: 4, step: 1, value: st.L, fmt: (v) => v + ' 周', onInput: (v) => { st.L = v; update(); } });
      pn.ctrl.slider({ label: '预测的跟风程度 θ', min: 0.05, max: 1, step: 0.05, value: st.theta, fmt: (v) => PL.fmt(v, 2), onInput: (v) => { st.theta = v; update(); } });
      const ob = pn.box(); ob.append(h('div', { class: 'fig-title', text: '每一级每周下的订单（箱）' }));
      const chO = PL.plot(ob, { height: 300, x: [0, WEEKS], y: [0, 30], xlabel: '周', legend: [{ label: '顾客需求', color: 'ink', width: 3 }, ...TIERS.map((t, i) => ({ label: t, color: COLS[i] }))], legendPos: 'tr' });
      const ib = pn.box(); ib.append(h('div', { class: 'fig-title', text: '每一级的净库存（库存 − 欠货）' }));
      const chI = PL.plot(ib, { height: 300, x: [0, WEEKS], y: [-40, 40], xlabel: '周' });
      const stats = pn.stats(TIERS.map((t, i) => ({ key: 'a' + i, label: t + '：订单波动 ÷ 需求波动', color: COLS[i] })));
      let S;
      function demand(w, r) {
        if (st.pattern === 'step') return w < 5 ? 4 : 8;
        if (st.pattern === 'promo') return w >= 6 && w < 8 ? 10 : 4;
        return Math.max(0, Math.round(4 + 1.2 * r.normal()));
      }
      function sim() {
        const r = PL.rng(st.seed), L = st.L, n = 4;
        const inv = new Array(n).fill(12), back = new Array(n).fill(0), F = new Array(n).fill(4);
        const ordered = new Array(n).fill(0), received = new Array(n).fill(0);
        const pipe = Array.from({ length: n }, () => new Array(WEEKS + L + 2).fill(0));
        for (let i = 0; i < n; i++) for (let k = 0; k < L; k++) pipe[i][k] = 4;
        for (let i = 0; i < n; i++) { ordered[i] = 4 * L; }
        const out = { dem: [], ord: Array.from({ length: n }, () => []), net: Array.from({ length: n }, () => []) };
        for (let w = 0; w < WEEKS; w++) {
          const cust = demand(w, r);
          out.dem.push(cust);
          let incoming = cust;
          for (let i = 0; i < n; i++) {
            const arrive = pipe[i][w]; inv[i] += arrive; received[i] += arrive;
            const want = back[i] + incoming;
            const ship = Math.min(inv[i], want);
            inv[i] -= ship; back[i] = want - ship;
            if (i > 0) pipe[i - 1][w + L] += ship;
            F[i] += st.theta * (incoming - F[i]);
            const SL = ordered[i] - received[i];
            const SLstar = F[i] * L;
            const net = inv[i] - back[i];
            const o = Math.max(0, F[i] + st.alpha * (12 - net) + st.alpha * st.beta * (SLstar - SL));
            ordered[i] += o;
            if (i === n - 1) pipe[i][w + L] += o; // factory production
            out.ord[i].push(o); out.net[i].push(net);
            incoming = o;
          }
        }
        return out;
      }
      chO.fn = (p) => {
        const ws = Array.from({ length: WEEKS }, (_, i) => i);
        S.ord.forEach((o, i) => p.line(ws, o, { color: COLS[i], width: 2 }));
        p.line(ws, S.dem, { color: 'ink', width: 3 });
      };
      chI.fn = (p) => {
        const ws = Array.from({ length: WEEKS }, (_, i) => i);
        p.hline(0, { color: 'ink3' });
        S.net.forEach((o, i) => p.line(ws, o, { color: COLS[i], width: 2 }));
      };
      function update() {
        S = sim();
        const mx = Math.max(12, ...S.ord.flat()) * 1.1;
        chO.setY(0, mx);
        const ni = Math.max(20, ...S.net.flat().map(Math.abs)) * 1.1;
        chI.setY(-ni, ni);
        const sdD = M.sd(S.dem);
        S.ord.forEach((o, i) => stats.set('a' + i, '× ' + PL.fmt(M.sd(o) / sdD, 1), '峰值 ' + PL.fmt(Math.max(...o), 0) + ' 箱', M.sd(o) / sdD > 2 ? 'bad' : ''));
        chO.render(); chI.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>这是 MIT 斯隆商学院从 1960 年代开始玩的"啤酒游戏"。顾客需求在第 5 周从每周 4 箱涨到 8 箱，只翻了一倍，此后一直稳定。可是一层层传上去，工厂的订单会冲到几十箱，然后跌到 0，再反弹……整条链陷入剧烈震荡。每一级都只是在做看上去合理的事：</p>
        <ul>
          <li>需求涨了，就<b>调高预测</b>（预测的跟风程度 θ）；</li>
          <li>库存降了，就<b>多订一些来补</b>（补库存的急切程度 α）；</li>
          <li>但货在路上要走 L 周，人们常常<b>忘了已经订过、正在路上的货</b>（β 小），看到库存还没回来，就继续加订。等前面订的货一起到了，库存爆仓，于是停止下单……</li>
        </ul>
        <p>Sterman（1989）让数千人玩这个游戏，估计出玩家的 β 平均只有约 0.3：大多数人明显低估了"已经在路上"的东西。</p>
        <p class="try">把 β 拉到 100%（每一级都记得路上的货），震荡大幅减弱。再把运输延迟加到 4 周、α 调大，看看会发生什么。</p>

        <h2>现实里</h2>
        <p>"牛鞭效应"这个名字来自宝洁公司：婴儿纸尿裤的终端消费非常稳定（婴儿每天用多少尿布是固定的），可分销商给宝洁下的订单却大起大落，宝洁再给上游原料供应商下的订单波动更大（Lee、Padmanabhan &amp; Whang, 1997）。芯片行业的周期性短缺和过剩、疫情期间的"卫生纸荒"和随后的库存积压，都有这种结构。</p>

        <h2>为什么放在"反馈与延迟"里</h2>
        <p>它和${PL.link('orbit', '轨道交会')}是同一类问题：一个有延迟的负反馈回路，如果修正得太急、又不考虑已经在途的修正，就会<b>过冲</b>，然后反向过冲，形成振荡。洗澡时调水温也是这样：水温反应慢，你一冷就猛拧热水，等热水到了又被烫到，再猛拧回去。</p>
        <div class="takeaway"><b>带走什么：</b>在有延迟的系统里，"缺多少补多少"会导致振荡。对策：把在途的东西算进去（β → 1）；修正得慢一点（α 小一点）；缩短延迟；最根本的是共享真实的终端需求数据，让每一级不必靠下游的订单去猜。</div>
      `);
    },
  });

  // ======================================================================
  // 帕隆多悖论
  // ======================================================================
  PL.register({
    id: 'parrondo', cat: 'feedback', nav: '帕隆多悖论：两个输局变赢局',
    title: '帕隆多悖论：两个必输的游戏混着玩，变成了能赢',
    hook: '游戏 A 单独玩会输，游戏 B 单独玩也会输。把它们随机混着玩，或者按 AABB 的顺序轮流玩，资本却稳步增长。',
    related: ['orbit', 'bullwhip', 'simpson'],
    render(root) {
      const st = { eps: 0.005, show: 'R' };
      const STRATS = [
        { k: 'A', label: '只玩 A', col: 's7' },
        { k: 'B', label: '只玩 B', col: 's2' },
        { k: 'R', label: '随机混着玩', col: 's3' },
        { k: 'AB', label: 'ABAB…', col: 's1' },
        { k: 'AABB', label: 'AABB…', col: 's4' },
      ];
      const probs = (m) => ({ A: 0.5 - st.eps, B: (m === 0 ? 0.1 : 0.75) - st.eps });
      function exact(k) {
        const pat = k === 'R' ? ['R'] : k.split('');
        const L = pat.length, Ns = 3 * L;
        let pi = new Float64Array(Ns).fill(1 / Ns);
        const winp = (m, ph) => { const g = pat[ph], p = probs(m); return g === 'A' ? p.A : g === 'B' ? p.B : (p.A + p.B) / 2; };
        for (let it = 0; it < 3000; it++) {
          const nx = new Float64Array(Ns);
          for (let m = 0; m < 3; m++) for (let ph = 0; ph < L; ph++) {
            const s = m * L + ph, w = winp(m, ph), ph2 = (ph + 1) % L;
            nx[((m + 1) % 3) * L + ph2] += pi[s] * w;
            nx[((m + 2) % 3) * L + ph2] += pi[s] * (1 - w);
          }
          pi = nx;
        }
        let drift = 0, b0 = 0, bAll = 0;
        const occ = [0, 0, 0];
        for (let m = 0; m < 3; m++) for (let ph = 0; ph < L; ph++) {
          const s = m * L + ph, w = winp(m, ph);
          drift += pi[s] * (2 * w - 1);
          occ[m] += pi[s];
          if (pat[ph] !== 'A') { bAll += pi[s]; if (m === 0) b0 += pi[s]; }
        }
        return { drift, occ, b0: bAll ? b0 / bAll : NaN };
      }
      function simulate(k, runs, games, r) {
        const pat = k === 'R' ? null : k.split('');
        const avg = new Float64Array(games + 1);
        for (let run = 0; run < runs; run++) {
          let cap = 0;
          for (let g = 0; g < games; g++) {
            const which = pat ? pat[g % pat.length] : r() < 0.5 ? 'A' : 'B';
            const m = ((cap % 3) + 3) % 3, p = probs(m);
            cap += r() < (which === 'A' ? p.A : p.B) ? 1 : -1;
            avg[g + 1] += cap;
          }
        }
        for (let g = 0; g <= games; g++) avg[g] /= runs;
        return avg;
      }
      const pn = PL.panel(root, '两个游戏', '<b>游戏 A</b>：抛一枚略不公平的硬币，赢的概率 1/2 − ε。<b>游戏 B</b>：看你手上的钱数——如果是 3 的倍数，用一枚很差的硬币（赢 1/10 − ε）；否则用一枚很好的硬币（赢 3/4 − ε）。每局赢 +1，输 −1。下面是 500 次独立模拟的平均资本。').cols(2);
      pn.ctrl.slider({ label: '不公平程度 ε', min: 0, max: 0.02, step: 0.001, value: st.eps, fmt: (v) => PL.fmt(v, 3), onInput: PL.debounce((v) => { st.eps = v; update(); }, 40) });
      const ch = PL.plot(pn.box(), { height: 320, x: [0, 400], y: [-6, 10], xlabel: '局数', ylabel: '平均资本', legend: STRATS.map((s) => ({ label: s.label, color: s.col })), legendPos: 'tl' });
      const right = pn.box();
      right.append(h('div', { class: 'fig-title', text: '游戏 B 的"状态机"：资本除以 3 的余数' }));
      const segCtl = PL.controls(h('div', { class: 'controls' }));
      right.append(segCtl.el);
      segCtl.seg({ options: STRATS.filter((s) => s.k !== 'A').map((s) => ({ value: s.k, label: s.label })), value: st.show, onChange: (v) => { st.show = v; dg.render(); upNote(); } });
      const dg = PL.stage(right, { height: 290 });
      const note = h('div', { class: 'panel-html' });
      right.append(note);
      const tbl = PL.table(pn.el, ['策略', '每 100 局的期望盈亏（精确值）', '玩 B 时，资本是 3 的倍数的比例']);
      let curves = {}, ex = {};
      ch.fn = (p) => {
        p.hline(0, { color: 'ink3' });
        STRATS.forEach((s) => p.line(Array.from({ length: curves[s.k].length }, (_, i) => i), curves[s.k], { color: s.col, width: s.k === 'A' || s.k === 'B' ? 2 : 2.5 }));
      };
      dg.draw = (c, w, hh) => {
        const e = ex[st.show];
        const R0 = Math.min(w * 0.4, hh * 0.38), cx = w / 2, cy = hh / 2 + 14;
        const pos = [0, 1, 2].map((m) => [cx + R0 * Math.cos(-Math.PI / 2 + (m * 2 * Math.PI) / 3), cy + R0 * Math.sin(-Math.PI / 2 + (m * 2 * Math.PI) / 3)]);
        const edge = (a, bb, label, col, bend) => {
          const [x0, y0] = pos[a], [x1, y1] = pos[bb];
          const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, nx = -(y1 - y0), ny = x1 - x0, L = Math.hypot(nx, ny);
          const qx = mx + (nx / L) * bend, qy = my + (ny / L) * bend;
          c.strokeStyle = PL.col(col); c.lineWidth = 1.6;
          c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo(qx, qy, x1, y1); c.stroke();
          // arrow head near end
          const tx = x1 - qx, ty = y1 - qy, tl = Math.hypot(tx, ty);
          const ex2 = x1 - (tx / tl) * 26, ey2 = y1 - (ty / tl) * 26;
          PL.drawArrow(c, ex2 - tx / tl * 2, ey2 - ty / tl * 2, ex2, ey2, 8);
          c.font = PL.font(11); c.fillStyle = PL.col(col); c.textAlign = 'center';
          c.fillText(label, qx, qy + 4);
        };
        const pB = probs(0).B, pG = probs(1).B;
        // wins go clockwise on the outside, losses counter-clockwise on the inside
        edge(0, 1, '赢 ' + PL.fmt(pB, 3), 's3', -34); edge(1, 2, '赢 ' + PL.fmt(pG, 3), 's3', -34); edge(2, 0, '赢 ' + PL.fmt(pG, 3), 's3', -34);
        edge(0, 2, '输 ' + PL.fmt(1 - pB, 3), 's2', -14); edge(2, 1, '输 ' + PL.fmt(1 - pG, 3), 's2', -14); edge(1, 0, '输 ' + PL.fmt(1 - pG, 3), 's2', -14);
        pos.forEach(([x, y], m) => {
          const rr = 14 + 40 * e.occ[m];
          c.fillStyle = PL.col(m === 0 ? 's2' : 's3'); c.globalAlpha = 0.18; c.beginPath(); c.arc(x, y, rr, 0, 7); c.fill(); c.globalAlpha = 1;
          c.strokeStyle = PL.col(m === 0 ? 's2' : 's3'); c.lineWidth = 2; c.stroke();
          c.fillStyle = PL.col('ink'); c.font = PL.font(13, 700); c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText('余 ' + m, x, y - 6); c.font = PL.font(11); c.fillText(PL.pct(e.occ[m], 1), x, y + 9); c.textBaseline = 'alphabetic';
        });
      };
      function upNote() {
        const e = ex[st.show];
        note.innerHTML = `圆圈大小 = 长期停留在该状态的时间比例（${STRATS.find((s) => s.k === st.show).label}）。玩 B 的时候，有 <b>${PL.pct(e.b0, 1)}</b> 的时间落在"余 0"、只能用那枚很差的硬币${e.b0 > 1 / 3 + 0.01 ? '，比 1/3 还多：B 单独玩时，会被自己的规则困在坏状态里。' : '，降到了 1/3 附近：A 把资本"搅乱"了，B 就很少被困在坏状态。'}`;
      }
      function update() {
        STRATS.forEach((s) => { ex[s.k] = exact(s.k); curves[s.k] = simulate(s.k, 500, 400, PL.rng(11)); });
        const all = Object.values(curves).flatMap((c) => [c[c.length - 1]]);
        ch.setY(Math.min(-4, ...all) * 1.15, Math.max(4, ...all) * 1.15);
        tbl.rows(STRATS.map((s) => ({ cells: [`<span style="color:${PL.col(s.col)}">●</span> ${s.label}`, PL.signed(ex[s.k].drift * 100, 2), s.k === 'A' ? '—' : PL.pct(ex[s.k].b0, 1)], cls: ex[s.k].drift > 0 ? 'hl' : '' })));
        dg.render(); upNote(); ch.render();
      }
      update();
      PL.prose(root, `
        <h2>为什么 B 单独玩会输</h2>
        <p>B 有 2/3 的状态用好硬币（赢 75%），只有 1/3 的状态用坏硬币（赢 10%）。如果三个状态被访问的时间各占 1/3，B 显然是赚钱的。问题在于 B 的规则会把你<b>困在坏状态</b>附近：从"余 0"出发，大概率输一局到"余 2"，再大概率赢一局又回到"余 0"……在长期里，你有约 38% 的时间停在"余 0"，而不是 1/3。精确计算下，ε = 0 时 B 恰好打平，任何 ε &gt; 0 都让它变成输局。</p>

        <h2>为什么混着玩会赢</h2>
        <p>A 本身几乎是一枚公平硬币，它不关心你的资本是多少，于是每玩一局 A，就把你的"余数状态"随机搅动一下，打破 B 制造的那个陷阱。插入 A 之后，B 被玩到时落在"余 0"的比例降到约 1/3 以下，好硬币用得更多，B 的收益足以覆盖 A 的小亏损。</p>
        <p>不是怎么混都行：表格里 ABAB… 严格交替仍然是输的，AABB… 和随机混合才赢。ABAB 的问题是 A 和 B 的节奏和"余数"的周期纠缠在一起，B 被玩到时仍有约 38% 的时间落在"余 0"。</p>
        <p class="try">在右边切换策略，看圆圈大小和比例怎么变。再把 ε 调大到 0.015 以上，混合策略也会开始输：悖论只在 A 和 B 都"只差一点就公平"时出现。</p>

        <h2>它从哪里来，又意味着什么</h2>
        <p>西班牙物理学家 Juan Parrondo 在 1996 年构造了这个例子，用来说明"布朗棘轮"的原理：一个粒子在两种各自都无法产生定向运动的势场之间来回切换，却可以出现定向运动（Harmer &amp; Abbott, <i>Nature</i> 1999）。它和${PL.link('simpson', '辛普森悖论')}有相似之处：单独看每个部分得出的结论，在组合之后可以反过来，因为组合改变了"状态的分布"。</p>
        <p class="note">这不是赌场里的赚钱方法：真实赌博游戏之间没有这种依赖资本状态的耦合。悖论的关键是游戏 B 的输赢依赖于你当前的状态，而 A 能改变这个状态。</p>
        <div class="takeaway"><b>带走什么：</b>"两个坏东西加在一起只会更坏"在有状态耦合的系统里不成立。评价一个策略、一项政策或一个组件，要放在它和其他部分交替作用的整体里看，单独测试的结果可能完全反过来。</div>
      `);
    },
  });
})();
