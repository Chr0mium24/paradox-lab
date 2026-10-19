/* 类别六（续）：反馈、延迟与耦合 */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ======================================================================
  // 卡皮查摆
  // ======================================================================
  PL.register({
    id: 'kapitza', cat: 'feedback', nav: '卡皮查摆：晃一晃，倒立就稳了',
    title: '卡皮查摆：快速上下晃动支点，倒立的摆竟然不倒',
    hook: '一根倒立的棍子，一松手就会倒。可如果让它的支点以足够高的频率上下抖动，它会稳稳地立着，碰一下还会自己弹回竖直。',
    related: ['orbit', 'dzhanibekov', 'resonance'],
    render(root) {
      const g = 9.81, l = 0.3, gamma = 0.6;
      const st = { a: 0.03, f: 20, slow: 0.15 };
      let th = Math.PI - 0.12, om = 0, t = 0, hist = [];
      const pn = PL.panel(root, '支点上下振动的摆', '摆长 30 cm。支点以振幅 a、频率 f 上下振动。默认是慢放的（振动太快，肉眼看不清）。').cols(2);
      pn.ctrl.slider({ label: '振幅 a', min: 0, max: 0.06, step: 0.002, value: st.a, fmt: (v) => PL.fmt(v * 100, 1) + ' cm', onInput: (v) => { st.a = v; } });
      pn.ctrl.slider({ label: '频率 f', min: 0, max: 40, step: 0.5, value: st.f, fmt: (v) => PL.fmt(v, 1) + ' Hz', onInput: (v) => { st.f = v; } });
      pn.ctrl.slider({ label: '慢放', min: 0.02, max: 1, step: 0.01, log: true, value: st.slow, fmt: (v) => '× ' + PL.fmt(v, 2), onInput: (v) => { st.slow = v; } });
      pn.ctrl.break();
      pn.ctrl.button('倒立放好', () => { th = Math.PI - 0.12; om = 0; }, 'primary');
      pn.ctrl.button('推一下', () => { om += 3; });
      pn.ctrl.button('正常挂着', () => { th = 0.3; om = 0; });
      const stage = PL.stage(pn.box(), { height: 340 }, (c, w, hh) => {
        const Lp = Math.min(hh * 0.4, w * 0.38), sc = Lp / l, cx = w / 2, cy = hh / 2;
        const yp = st.a * Math.cos(2 * Math.PI * st.f * t);
        const px = cx, py = cy - yp * sc;
        c.strokeStyle = PL.col('grid'); c.lineWidth = 10; c.lineCap = 'round';
        c.beginPath(); c.moveTo(px, cy - st.a * sc); c.lineTo(px, cy + st.a * sc); c.stroke();
        c.lineCap = 'butt';
        c.setLineDash([3, 5]); c.strokeStyle = PL.col('ink3'); c.lineWidth = 1;
        c.beginPath(); c.moveTo(px, cy - Lp - 20); c.lineTo(px, cy + Lp + 20); c.stroke(); c.setLineDash([]);
        const bx = px + Lp * Math.sin(th), by = py + Lp * Math.cos(th);
        c.strokeStyle = PL.col('ink'); c.lineWidth = 4; c.beginPath(); c.moveTo(px, py); c.lineTo(bx, by); c.stroke();
        c.fillStyle = PL.col('s2'); c.beginPath(); c.arc(bx, by, 13, 0, 7); c.fill();
        c.fillStyle = PL.col('s1'); c.beginPath(); c.arc(px, py, 7, 0, 7); c.fill();
        c.font = PL.font(12); c.fillStyle = PL.col('ink3'); c.textAlign = 'left';
        c.fillText(`支点振动：${PL.fmt(st.a * 100, 1)} cm × ${PL.fmt(st.f, 1)} Hz`, 10, 18);
      });
      const rb = pn.box();
      rb.append(h('div', { class: 'fig-title', text: '偏离"竖直向上"的角度（0° = 倒立，±180° = 正常挂着）' }));
      const ch = PL.plot(rb, { height: 240, x: [0, 10], y: [-190, 190], yticks: [-180, -90, 0, 90, 180], xlabel: '时间（秒，真实时间）', ylabel: '角度（°）' });
      ch.fn = (p) => {
        p.hline(0, { color: 's3', dash: [3, 4], label: '倒立', align: 'right' });
        if (hist.length > 1) { const t0 = hist[hist.length - 1][0] - 10; p.x = [Math.max(0, t0), Math.max(10, hist[hist.length - 1][0])]; p.line(hist.map((q) => q[0]), hist.map((q) => q[1]), { color: 's2', width: 1.6 }); }
      };
      const stats = pn.stats([
        { key: 'aw', label: '支点最大速度 aω', color: 's1' },
        { key: 'need', label: '倒立稳定需要 aω &gt; √(2gl)', color: 's7', sub: '= ' + PL.fmt(Math.sqrt(2 * g * l), 2) + ' m/s' },
        { key: 'state', label: '理论判断', color: 's3' },
      ]);
      const deriv = (th0, om0, tt) => {
        const w = 2 * Math.PI * st.f, ypdd = -st.a * w * w * Math.cos(w * tt);
        return [om0, -((g + ypdd) / l) * Math.sin(th0) - gamma * om0];
      };
      let acc = 0;
      PL.loop((dt) => {
        let simT = dt * st.slow;
        const hstep = st.f > 0 ? Math.min(1 / (st.f * 60), 2e-3) : 2e-3;
        while (simT > 0) {
          const d = Math.min(hstep, simT);
          const k1 = deriv(th, om, t), k2 = deriv(th + (d / 2) * k1[0], om + (d / 2) * k1[1], t + d / 2), k3 = deriv(th + (d / 2) * k2[0], om + (d / 2) * k2[1], t + d / 2), k4 = deriv(th + d * k3[0], om + d * k3[1], t + d);
          th += (d / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); om += (d / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
          t += d; simT -= d;
        }
        acc += dt;
        if (acc > 0.03) {
          acc = 0;
          let deg = (((th - Math.PI) * 180) / Math.PI) % 360; if (deg > 180) deg -= 360; if (deg < -180) deg += 360;
          hist.push([t, deg]); if (hist.length > 1500) hist.shift();
          const aw = st.a * 2 * Math.PI * st.f, need = Math.sqrt(2 * g * l);
          stats.set('aw', PL.fmt(aw, 2) + ' m/s'); stats.set('need', PL.fmt(need, 2) + ' m/s', '摆长 30 cm');
          stats.set('state', aw > need ? '倒立是稳定的' : '倒立不稳定', aw > need ? '有效势在 180° 处出现了一个"坑"' : '', aw > need ? 'good' : 'bad');
          ch.render();
        }
        stage.render();
      });
      stage.render();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>1908 年，Stephenson 最先注意到这个现象；1951 年，苏联物理学家彼得·卡皮查给出了漂亮的解释，并做成了演示装置。支点以振幅 a、角频率 ω 上下振动时，只要振动足够快、足够有力，满足</p>
        <div class="formula">a²ω² &gt; 2 g l　（支点的最大速度 aω 超过 √(2gl)）</div>
        <p>倒立的位置就会从不稳定变成稳定。30 cm 长的摆，振幅 3 cm 时，频率超过约 13 Hz 就够了。</p>
        <p class="try">把频率从 20 Hz 慢慢降到 10 Hz，看摆从立着到倒下；再调回 20 Hz，点"倒立放好"，它又立住了。点几下"推一下"，看它怎样被拉回竖直。</p>

        <h2>为什么：有效势</h2>
        <p>快速振动在摆的每一次"倒向一侧"中都会施加一个不对称的力：支点向上加速时，等效重力变大，把摆往下拉；向下加速时，等效重力变小。对一个已经稍微偏离竖直的摆，一个周期平均下来，这些力不会抵消，而是净余一个<b>把摆推回竖直方向</b>的力。把快速振动平均掉之后，摆感受到的等效势能是：</p>
        <div class="formula">U<sub>eff</sub>(θ) = −m g l cos θ + m (aω)²/4 · sin² θ</div>
        <p>第二项在 θ = 180°（倒立）处是一个凹坑。当它够深，压过了重力在倒立处的那个"山顶"，倒立就成了一个稳定的平衡点。</p>

        <h2>它在哪里</h2>
        <ul>
          <li><b>保罗离子阱</b>：静电场无法把带电粒子稳定地困在一个点（恩肖定理），但快速振荡的电场可以，原理和卡皮查摆相同。沃尔夫冈·保罗因此获得 1989 年诺贝尔物理学奖，离子阱今天是原子钟和离子阱量子计算机的核心部件。</li>
          <li><b>手上竖棍子</b>：人能让扫帚立在手心，靠的是不停地快速微调，虽然是主动控制，但"快速的小动作造出稳定性"是相通的。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>"晃动会让东西更不稳"并不总对。快速的振动、${PL.link('resonance', '噪声')}，以及${PL.link('orbit', '轨道上的反向操作')}，都可能产生和直觉相反的稳定效果。判断稳定性要看平均之后的有效力，而不是瞬时的推拉。</div>
      `);
    },
  });

  // ======================================================================
  // 网球拍定理（贾尼别科夫效应）
  // ======================================================================
  PL.register({
    id: 'dzhanibekov', cat: 'feedback', nav: '网球拍定理：绕中间轴转不稳',
    title: '网球拍定理：绕"中间那根轴"旋转的物体，会周期性地自己翻面',
    hook: '把手机抛起来让它旋转：绕长轴转、绕垂直于屏幕的轴转都很稳；绕横着的那根中间轴转，它几乎每次都会多翻半圈。没有任何外力，角动量守恒，它还是翻了。',
    related: ['orbit', 'kapitza', 'sync'],
    render(root) {
      const A = 1.6, B = 0.8, Cc = 0.12;
      const I = [(B * B + Cc * Cc) / 12, (A * A + Cc * Cc) / 12, (A * A + B * B) / 12];
      const st = { axis: 1, eps: 0.02, speed: 0.5 };
      let w, R, t, hist, flips = 0, lastSign = 1;
      function reset() {
        const r = PL.rng(3);
        w = [0, 0, 0]; w[st.axis] = 2 * Math.PI;
        for (let k = 0; k < 3; k++) if (k !== st.axis) w[k] += st.eps * 2 * Math.PI * (r() < 0.5 ? 1 : -1);
        R = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
        t = 0; hist = []; flips = 0; lastSign = 1;
      }
      reset();
      const pn = PL.panel(root, '在太空里转动一部"手机"', '长 16、宽 8、厚 1.2 的长方体。三个主轴的转动惯量：长轴最小，厚度方向（垂直屏幕）最大，宽度方向（横轴）居中。蓝色面是屏幕，红线是我们让它绕着转的那根轴。').cols(2);
      pn.ctrl.seg({ label: '绕哪根轴转', options: [{ value: 0, label: '长轴（最小惯量）' }, { value: 1, label: '横轴（中间）' }, { value: 2, label: '垂直屏幕（最大惯量）' }], value: st.axis, onChange: (v) => { st.axis = v; reset(); } });
      pn.ctrl.slider({ label: '初始的微小扰动', min: 0.001, max: 0.1, step: 0.001, log: true, value: st.eps, fmt: (v) => PL.pct(v, 1), onInput: (v) => { st.eps = v; reset(); } });
      pn.ctrl.slider({ label: '播放速度', min: 0.1, max: 2, step: 0.05, value: st.speed, fmt: (v) => '× ' + PL.fmt(v, 2), onInput: (v) => { st.speed = v; } });
      const cam = (() => { const ax = -0.45, ay = 0.6; const cx = Math.cos(ax), sx = Math.sin(ax), cy = Math.cos(ay), sy = Math.sin(ay); return (v) => { const x1 = cy * v[0] + sy * v[2], z1 = -sy * v[0] + cy * v[2]; return [x1, cx * v[1] - sx * z1, sx * v[1] + cx * z1]; }; })();
      const mul = (Rm, v) => [Rm[0][0] * v[0] + Rm[0][1] * v[1] + Rm[0][2] * v[2], Rm[1][0] * v[0] + Rm[1][1] * v[1] + Rm[1][2] * v[2], Rm[2][0] * v[0] + Rm[2][1] * v[1] + Rm[2][2] * v[2]];
      const stage = PL.stage(pn.box(), { height: 340 }, (c, w0, hh) => {
        const S = Math.min(w0, hh) * 0.3, cx = w0 / 2, cy = hh / 2;
        const P = (v) => { const q = cam(mul(R, v)); return [cx + q[0] * S, cy - q[1] * S, q[2]]; };
        const hx = A / 2, hy = B / 2, hz = Cc / 2;
        const V = [];
        for (const sxv of [-1, 1]) for (const syv of [-1, 1]) for (const szv of [-1, 1]) V.push([sxv * hx, syv * hy, szv * hz]);
        const idx = (sxv, syv, szv) => ((sxv > 0) << 2) | ((syv > 0) << 1) | (szv > 0);
        const faces = [
          { n: [0, 0, 1], v: [idx(-1, -1, 1), idx(1, -1, 1), idx(1, 1, 1), idx(-1, 1, 1)], col: 's1' },
          { n: [0, 0, -1], v: [idx(-1, -1, -1), idx(-1, 1, -1), idx(1, 1, -1), idx(1, -1, -1)], col: 's7' },
          { n: [1, 0, 0], v: [idx(1, -1, -1), idx(1, 1, -1), idx(1, 1, 1), idx(1, -1, 1)], col: 'ink3' },
          { n: [-1, 0, 0], v: [idx(-1, -1, -1), idx(-1, -1, 1), idx(-1, 1, 1), idx(-1, 1, -1)], col: 'ink3' },
          { n: [0, 1, 0], v: [idx(-1, 1, -1), idx(-1, 1, 1), idx(1, 1, 1), idx(1, 1, -1)], col: 'ink3' },
          { n: [0, -1, 0], v: [idx(-1, -1, -1), idx(1, -1, -1), idx(1, -1, 1), idx(-1, -1, 1)], col: 'ink3' },
        ];
        const light = [0.3, 0.5, 0.8];
        const drawn = faces.map((f) => {
          const nw = cam(mul(R, f.n));
          const pts = f.v.map((i) => P(V[i]));
          return { f, nw, pts, z: M.mean(pts.map((p) => p[2])) };
        }).filter((d) => d.nw[2] > 0).sort((a, b) => a.z - b.z);
        // angular momentum (fixed in space)
        const Lb = [I[0] * w[0], I[1] * w[1], I[2] * w[2]], Lw = cam(mul(R, Lb)), Ln = Math.hypot(...Lw) || 1;
        c.strokeStyle = PL.col('s3'); c.lineWidth = 2; c.setLineDash([5, 4]);
        PL.drawArrow(c, cx - (Lw[0] / Ln) * S * 1.6, cy + (Lw[1] / Ln) * S * 1.6, cx + (Lw[0] / Ln) * S * 1.6, cy - (Lw[1] / Ln) * S * 1.6, 10);
        c.setLineDash([]);
        for (const d of drawn) {
          const sh = 0.45 + 0.55 * Math.max(0, d.nw[0] * light[0] + d.nw[1] * light[1] + d.nw[2] * light[2]);
          c.fillStyle = PL.col(d.f.col); c.globalAlpha = 0.35 + 0.6 * sh;
          c.beginPath(); d.pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); c.fill();
          c.globalAlpha = 1; c.strokeStyle = PL.col('ink'); c.lineWidth = 1; c.stroke();
        }
        const ax = [0, 0, 0]; ax[st.axis] = st.axis === 0 ? A * 0.75 : st.axis === 1 ? B * 1.1 : 0.9;
        const p0 = P(ax.map((v) => -v)), p1 = P(ax);
        c.strokeStyle = PL.col('s2'); c.lineWidth = 2.5; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
        c.font = PL.font(12); c.fillStyle = PL.col('s3'); c.textAlign = 'left';
        c.fillText('绿色虚线：角动量方向（始终不变）', 10, hh - 10);
      });
      const rb = pn.box();
      rb.append(h('div', { class: 'fig-title', text: '绕三根轴的角速度（在物体自己的坐标系里）' }));
      const ch = PL.plot(rb, { height: 300, x: [0, 20], y: [-8, 8], xlabel: '时间（秒）', ylabel: '角速度', legend: [{ label: '长轴', color: 's5' }, { label: '横轴（中间）', color: 's2' }, { label: '垂直屏幕', color: 's4' }], legendPos: 'tr' });
      ch.fn = (p) => {
        if (hist.length < 2) return;
        const T = hist[hist.length - 1][0];
        p.x = [Math.max(0, T - 20), Math.max(20, T)];
        [[1, 's5'], [2, 's2'], [3, 's4']].forEach(([k, col]) => p.line(hist.map((q) => q[0]), hist.map((q) => q[k]), { color: col, width: 1.8 }));
      };
      const stats = pn.stats([
        { key: 'flips', label: '整体翻转的次数', color: 's2' },
        { key: 'E', label: '动能（守恒）', color: 's7' },
        { key: 'L', label: '角动量大小（守恒）', color: 's3' },
      ]);
      const eul = (v) => [((I[1] - I[2]) / I[0]) * v[1] * v[2], ((I[2] - I[0]) / I[1]) * v[2] * v[0], ((I[0] - I[1]) / I[2]) * v[0] * v[1]];
      let acc = 0;
      function step(dt) {
        const k1 = eul(w), k2 = eul(w.map((v, i) => v + (dt / 2) * k1[i])), k3 = eul(w.map((v, i) => v + (dt / 2) * k2[i])), k4 = eul(w.map((v, i) => v + dt * k3[i]));
        const wm = w.map((v, i) => v + (dt / 2) * k1[i]);
        w = w.map((v, i) => v + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
        // R' = R [w]x, using mid-step w
        const W = [[0, -wm[2], wm[1]], [wm[2], 0, -wm[0]], [-wm[1], wm[0], 0]];
        const dR = R.map((row) => [0, 1, 2].map((j) => row[0] * W[0][j] + row[1] * W[1][j] + row[2] * W[2][j]));
        R = R.map((row, i) => row.map((v, j) => v + dt * dR[i][j]));
        // re-orthonormalise columns (Gram–Schmidt)
        const col = (j) => [R[0][j], R[1][j], R[2][j]];
        let c0 = col(0), n0 = Math.hypot(...c0); c0 = c0.map((v) => v / n0);
        let c1 = col(1); const d01 = c1[0] * c0[0] + c1[1] * c0[1] + c1[2] * c0[2]; c1 = c1.map((v, i) => v - d01 * c0[i]); const n1 = Math.hypot(...c1); c1 = c1.map((v) => v / n1);
        const c2 = [c0[1] * c1[2] - c0[2] * c1[1], c0[2] * c1[0] - c0[0] * c1[2], c0[0] * c1[1] - c0[1] * c1[0]];
        R = [0, 1, 2].map((i) => [c0[i], c1[i], c2[i]]);
        t += dt;
      }
      PL.loop((dt) => {
        let s = dt * st.speed;
        while (s > 0) { const d = Math.min(0.002, s); step(d); s -= d; }
        // a flip = the spin axis reverses relative to the (fixed) angular momentum, i.e. ω along that axis changes sign
        const sgn = w[st.axis] >= 0 ? 1 : -1;
        if (sgn !== lastSign) { flips++; lastSign = sgn; }
        acc += dt;
        if (acc > 0.04) {
          acc = 0;
          hist.push([t, w[0], w[1], w[2]]); if (hist.length > 2000) hist.shift();
          stats.set('flips', String(flips), st.axis === 1 ? '每隔一段时间就整个翻过来' : '绕这根轴转是稳定的，不会翻');
          stats.set('E', PL.fmt(0.5 * (I[0] * w[0] ** 2 + I[1] * w[1] ** 2 + I[2] * w[2] ** 2), 3));
          stats.set('L', PL.fmt(Math.hypot(I[0] * w[0], I[1] * w[1], I[2] * w[2]), 3));
          ch.render();
        }
        stage.render();
      });
      stage.render();
      PL.prose(root, `
        <h2>太空里的蝶形螺母</h2>
        <p>1985 年，苏联宇航员弗拉基米尔·贾尼别科夫在礼炮 7 号空间站上拧下一个蝶形螺母，螺母离开螺杆后在失重中旋转，每飞行一段距离就突然翻转 180°，然后继续沿原方向旋转，再翻转……这个现象在地面上也能看到：网球拍、书、手机，绕某一根特定的轴抛起来旋转，都会多翻半圈。这就是<b>网球拍定理</b>（也叫中间轴定理）。</p>
        <p class="try">分别选三根轴：长轴、垂直屏幕的轴转起来都很稳，扰动不会长大；选"横轴（中间）"，扰动指数增长，屏幕每隔一段时间就整个翻过来。把扰动调到 0.1%，翻转来得更晚，但一定会来。</p>

        <h2>为什么偏偏是中间那根轴</h2>
        <p>没有外力时，刚体守恒两个量：动能和角动量。在角速度空间里，动能守恒把角速度限制在一个椭球面上，角动量守恒把它限制在另一个椭球面上，运动只能沿着两者的交线进行。绕最大惯量轴和最小惯量轴转时，交线是围绕该轴的小闭合圈，角速度只能在附近小幅摆动，是稳定的。绕中间轴转时，那里恰好是交线的"鞍点"：交线从这里出发，绕到物体的另一侧，于是角速度沿着它走到相反的方向，表现为物体整个翻过来。线性化欧拉方程也能看到同样的结论：中间轴的扰动满足 ε̈ = λ ε，其中 λ ∝ (I₂ − I₁)(I₃ − I₂) &gt; 0，扰动指数增长。</p>
        <p>注意看图里的绿色虚线：角动量方向始终不变，翻转的是物体本身。</p>

        <h2>一个代价昂贵的推论</h2>
        <p>如果物体不是完全刚性，内部会有能量耗散（晃动的液体、天线的振动），动能会缓慢下降而角动量保持不变，这时只有<b>最大惯量轴</b>是真正稳定的。美国第一颗卫星"探索者 1 号"（1958）被设计成绕长轴（最小惯量轴）自旋，可它柔软的鞭状天线不断耗散能量，几圈之后卫星就变成了绕最大惯量轴的翻滚。这次事故之后，"自旋稳定的航天器必须绕最大惯量轴转"成了航天器设计的基本规则。</p>
        <div class="takeaway"><b>带走什么：</b>哪种运动稳定，由守恒律和线性化后的符号决定，而不是由"看起来对称、看起来平衡"决定。和${PL.link('kapitza', '卡皮查摆')}、${PL.link('orbit', '轨道交会')}一样，力学系统的稳定性常常和直觉反着来。</div>
      `);
    },
  });

  // ======================================================================
  // 两个选择的力量
  // ======================================================================
  PL.register({
    id: 'twochoices', cat: 'feedback', nav: '两个选择：多看一眼，好上指数级',
    title: '两个选择的力量：随机挑两个、放进较空的那个，最拥挤处就好了指数级',
    hook: '把 100 万个球随机扔进 100 万个箱子，最满的箱子约有 9 个球。每次随机挑两个箱子、放进较空的那个，最满的只有 4 个。只多看了一眼。',
    related: ['queue', 'friends', 'bus'],
    render(root) {
      const st = { n: 10000, d: 2, seed: PL.seed() };
      const pn = PL.panel(root, 'n 个球扔进 n 个箱子', '每个球依次放入：随机挑 d 个箱子，放进其中最空的那一个（d = 1 就是纯随机）。').cols(2);
      pn.ctrl.slider({ label: '箱子数 n', min: 100, max: 1000000, step: 100, log: true, value: st.n, fmt: (v) => PL.int(v), onInput: PL.debounce((v) => { st.n = v; update(); }, 80), wide: true });
      pn.ctrl.seg({ label: '每次看几个箱子', options: [1, 2, 3].map((v) => ({ value: v, label: 'd = ' + v })), value: st.d, onChange: (v) => { st.d = v; update(); } });
      pn.ctrl.button('重新扔', () => { st.seed = PL.seed(); update(); });
      function throwBalls(n, d, r) {
        const L = new Int32Array(n);
        let mx = 0;
        for (let i = 0; i < n; i++) { let b = r.int(n); for (let j = 1; j < d; j++) { const c = r.int(n); if (L[c] < L[b]) b = c; } L[b]++; if (L[b] > mx) mx = L[b]; }
        return { L, mx };
      }
      let res = {};
      const hb = pn.box();
      hb.append(h('div', { class: 'fig-title', text: '每个箱子里有几个球：三种策略并排比较' }));
      const hist = PL.plot(hb, { height: 290, x: [-0.6, 10.6], y: [0, 0.5], xticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10], xfmt: (v) => String(v), xlabel: '箱子里的球数', ylabel: '箱子的比例', yfmt: (v) => Math.round(v * 100) + '%', legend: [{ label: 'd = 1（随机）', color: 's2', type: 'box' }, { label: 'd = 2', color: 's3', type: 'box' }, { label: 'd = 3', color: 's1', type: 'box' }], legendPos: 'tr' });
      hist.fn = (p) => {
        [[1, 's2', -0.27], [2, 's3', 0], [3, 's1', 0.27]].forEach(([d, col, off]) => {
          const R0 = res[d]; if (!R0) return;
          p.bars(R0.frac.map((_, i) => i + off), R0.frac, { color: col, w: 0.25, alpha: d === st.d ? 0.95 : 0.45 });
        });
      };
      const cb = pn.box();
      cb.append(h('div', { class: 'fig-title', text: '最满的箱子有几个球' }));
      const NS = [100, 1000, 1e4, 1e5, 1e6];
      const curve = (() => { const r = PL.rng(8), out = {}; for (const d of [1, 2, 3]) out[d] = NS.map((n) => { let s = 0; const T = n > 1e5 ? 2 : 4; for (let t = 0; t < T; t++) s += throwBalls(n, d, r).mx; return s / T; }); return out; })();
      const ch = PL.plot(cb, { height: 290, x: [100, 1e6], y: [0, 12], xlog: true, xlabel: '箱子数 n', ylabel: '最大装载' });
      ch.fn = (p) => {
        p.func((n) => Math.log(n) / Math.log(Math.log(n)), { color: 's2', dash: [4, 4], width: 1.3 });
        p.func((n) => Math.log(Math.log(n)) / Math.log(2) + 1, { color: 's3', dash: [4, 4], width: 1.3 });
        [[1, 's2'], [2, 's3'], [3, 's1']].forEach(([d, col]) => { p.line(NS, curve[d], { color: col, width: d === st.d ? 3 : 1.8 }); p.dots(NS, curve[d], { color: col, r: 3 }); });
        p.text(1e6, curve[1][4], 'd = 1', { dx: -6, dy: -8, align: 'right', color: 's2', size: 11 });
        p.text(1e6, curve[2][4], 'd = 2', { dx: -6, dy: -8, align: 'right', color: 's3', size: 11 });
        p.vline(st.n, { color: 'ink3' });
      };
      cb.append(h('div', { class: 'fig-cap', text: '虚线：理论增长速度 ln n / ln ln n（随机）与 ln ln n / ln 2（两个选择）' }));
      const stats = pn.stats([
        { key: 'mx', label: '最满的箱子', color: 's2' },
        { key: 'empty', label: '空箱子的比例', color: 's7' },
        { key: 'cmp', label: '和纯随机比', color: 's3' },
      ]);
      function update() {
        const r = PL.rng(st.seed);
        res = { 1: throwBalls(st.n, 1, r), 2: throwBalls(st.n, 2, r), 3: throwBalls(st.n, 3, r) };
        let fmax = 0;
        for (const d of [1, 2, 3]) { const cnt = new Array(11).fill(0); for (const v of res[d].L) cnt[Math.min(10, v)]++; res[d].frac = cnt.map((c) => c / st.n); fmax = Math.max(fmax, ...res[d].frac); }
        hist.setY(0, fmax * 1.12);
        const R0 = res[st.d];
        let empty = 0; for (const v of R0.L) if (!v) empty++;
        stats.set('mx', R0.mx + ' 个球');
        stats.set('empty', PL.pct(empty / st.n, 1), st.d === 1 ? '理论 1/e ≈ 36.8%' : '');
        stats.set('cmp', `${res[1].mx} → ${R0.mx}`, '随机 → 当前策略', st.d > 1 ? 'good' : '');
        hist.render(); ch.render();
      }
      update();
      PL.prose(root, `
        <h2>发生了什么</h2>
        <p>把 n 个球随机扔进 n 个箱子，平均每箱 1 个，但运气总会让某些箱子特别满：最满的箱子大约有 ln n / ln ln n 个球，n = 100 万时约 8–9 个。Azar、Broder、Karlin 和 Upfal（1994）证明了一个惊人的结果：每次随机挑<b>两个</b>箱子、放进较空的那个，最大装载降为 ln ln n / ln 2 + O(1)，n = 100 万时只有 4 个左右。从"对数级"变成"对数的对数级"，这是指数级的改进。更惊人的是，再往上加选择（d = 3、4……）只能再改进一个常数倍：最大的飞跃来自"从 1 到 2"。</p>
        <p class="try">把 n 拉到 100 万，在 d = 1 和 d = 2 之间切换：左图里装了 5 个以上球的那条长尾，在 d = 2 时几乎完全消失。</p>

        <h2>为什么一点点信息这么值钱</h2>
        <p>纯随机时，"已经很满的箱子"和其他箱子一样容易再被选中，满的会越来越满。看两个箱子以后，一个箱子要再加一个球，必须<b>两次</b>都选中装载很高的箱子。装载 ≥ k 的箱子比例为 β<sub>k</sub> 时，下一层的比例大约是 β<sub>k</sub>²，平方会让比例以双指数的速度掉到 0。这和排队论里"每个窗口各排各的"与"挑短的队"之间的巨大差距是同一回事。</p>

        <h2>它在哪里</h2>
        <ul>
          <li><b>负载均衡</b>：Nginx 等负载均衡器提供"随机挑两个、选连接数较少的那个"策略（power of two choices）。它几乎和"全局选最空的服务器"一样好，却不需要实时掌握所有服务器的状态，在大规模分布式系统里尤其重要。</li>
          <li><b>哈希表</b>：每个键有两个候选位置，放进较空的那个（以及由此发展出的布谷鸟哈希），能让冲突链的最长长度大幅下降。</li>
          <li><b>排队</b>：Mitzenmacher 的"超市模型"表明，顾客随机看两个收银台、排较短的那个，平均等待时间会以双指数速度随队长下降，接近${PL.link('queue', '一条队多个窗口')}的效果。</li>
        </ul>
        <div class="takeaway"><b>带走什么：</b>从"完全不看"到"看一点点"，收益往往大得不成比例。不需要全局最优的信息，局部随机的两次比较就够了。${PL.link('friends', '熟人免疫')}也是这个思路：问一句"你的朋友是谁"，就能找到网络里的枢纽。</div>
      `);
    },
  });
})();
