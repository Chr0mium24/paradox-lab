/* 反直觉实验室 — the connection graph: data, force layout, home constellation map, sidebar mini-map. */
(function () {
  'use strict';
  const { h, m: M } = PL;

  // ---------------------------------------------------------------- data
  // Every edge says *why* the two ideas belong together.
  const EDGES = [
    ['braess', 'induced', '都是系统对"扩容"的反应：一个改路线，一个改需求'],
    ['induced', 'jevons', '同一条需求曲线：东西变便宜（包括时间变便宜），用量就上去'],
    ['braess', 'queue', '布雷斯路网里拥堵的窄路，就是一段接近满负荷的队列'],
    ['braess', 'thrift', '每个人都理性，合起来的均衡却让所有人更糟'],
    ['thrift', 'bullwhip', '每一环都理性地收缩，叠加成整条链的震荡'],
    ['bus', 'queue', '间隔或服务时间的波动越大，等得越久'],
    ['bus', 'screening', '长度偏倚就是检查悖论：慢的肿瘤"占的时间长"，更容易被撞上'],
    ['bus', 'friends', '被抽中的概率和"大小"成正比，平均值就系统性偏大'],
    ['survivor', 'berkson', '伯克森悖论是幸存者偏差的二维版本'],
    ['survivor', 'winners', '你看到的都是"赢家"，被筛掉的那些看不见'],
    ['berkson', 'simpson', '对撞因子不能分组，混杂因素必须分组'],
    ['friends', 'berkson', '"你认识的人"本身就是一个被筛选过的样本'],
    ['regression', 'winners', '挑出最好的那个，下一次就会回落'],
    ['regression', 'smallsample', '极端值里，噪声占了大头'],
    ['regression', 'screening', '人在最糟的时候才去治，随后的好转被当成了疗效'],
    ['smallsample', 'stein', '解法都是往均值收缩，样本越小收得越多'],
    ['stein', 'winners', '赢家诅咒的解药：先收缩，再挑最大的'],
    ['stein', 'highdim', '高维里噪声会把观测向量系统性地"拉长"'],
    ['stein', 'orthogonal', '噪声几乎总和真值垂直，所以往原点缩一缩反而更近'],
    ['stein', 'doubledescent', '最小范数解本身就是一种隐式的收缩'],
    ['winners', 'goodhart', '优化得越狠，挑出来的越是误差而不是真货'],
    ['goodhart', 'screening', '把生存率当目标，最省力的办法是早查、多查'],
    ['goodhart', 'willrogers', '挪一挪分档线，两档的指标同时变好看'],
    ['screening', 'willrogers', '都是"量法变了，病人没变"'],
    ['willrogers', 'simpson', '分组方式一变，组平均就跟着变'],
    ['highdim', 'average', '高维立方体的中心几乎没有体积，"全面平均"的人也就不存在'],
    ['highdim', 'distance', '体积全挤在边界上，所有点就几乎一样远'],
    ['distance', 'orthogonal', '同一套数学：找邻居变难，互不干扰变容易'],
    ['orthogonal', 'doubledescent', '高维有足够多的方向，可以把噪声藏起来'],
    ['highdim', 'peto', '小尺度上练出来的直觉，外推到大尺度就失效'],
    ['orbit', 'bullwhip', '有延迟或守恒约束时，"缺多少补多少"会过冲'],
    ['orbit', 'parrondo', '约束系统里，反着操作才能达到目的'],
    ['bullwhip', 'queue', '波动沿链条放大，而波动本身就是成本'],
    ['parrondo', 'simpson', '单独看各部分得出的结论，组合之后可以反过来'],
    // ---- second batch ----
    ['schelling', 'braess', '每个人只有温和的偏好，叠加出谁都没想要的格局'],
    ['schelling', 'percolation', '越过某个阈值，局部的选择突然连成整体格局'],
    ['condorcet', 'braess', '每个人的偏好都理性，"集体偏好"却可以自相矛盾'],
    ['condorcet', 'simpson', '汇总之后的结论，可以和每个部分都对不上'],
    ['volunteer', 'thrift', '每个人都在等别人先动，集体就什么也做不成'],
    ['volunteer', 'braess', '个体最优的均衡，对所有人都更差'],
    ['lemons', 'winners', '对方愿意跟你成交，本身就是坏消息（逆向选择）'],
    ['lemons', 'survivor', '留在市场上的，是被筛选过的那一批'],
    ['hothand', 'regression', '连中之后的回落，要先分清运气、回归和抽样偏差'],
    ['hothand', 'arcsine', '人对随机序列的直觉是错的：真随机比你想的更"成串"'],
    ['hothand', 'bus', '按条件挑出来的子样本，平均值被系统性地扭曲'],
    ['birthweight', 'berkson', '以对撞因子为条件，制造出"吸烟保护婴儿"的假象'],
    ['birthweight', 'simpson', '分层之后结论反转，答案在因果图里'],
    ['falsefindings', 'winners', '只发表显著结果 = 挑最大的，效应量被高估'],
    ['falsefindings', 'peeking', '偷看数据把假阳性率推高，假发现就更多'],
    ['falsefindings', 'goodhart', '把"p < 0.05"当目标，显著就不再意味着真'],
    ['falsefindings', 'lindley', 'p 值不是"原假设为真的概率"'],
    ['peeking', 'arcsine', '随机游走迟早会越过任何一条固定的边界'],
    ['lindley', 'smallsample', '样本量改变了同一个 p 值的含义'],
    ['lindley', 'bertrand', '"均匀"的先验取决于你怎么参数化'],
    ['lord', 'simpson', '同一份数据，分析方式决定结论；答案在因果图里'],
    ['lord', 'regression', '变化分数和协方差分析之争，核心就是回归均值'],
    ['bertrand', 'benford', '"随机"要先说清楚在哪个尺度上均匀'],
    ['polya', 'stein', '二维必回、三维不一定，和斯坦因悖论的 3 维分界同源'],
    ['polya', 'highdim', '维度一高，"回到原点"的机会就消失了'],
    ['polya', 'arcsine', '一维必然回家，但平均要等无穷久，所以领先很少换手'],
    ['benford', 'sandpile', '跨越多个数量级、没有特征尺度'],
    ['kapitza', 'orbit', '快速振动造出"有效势"：看似该失稳的地方反而稳了'],
    ['kapitza', 'resonance', '振动和噪声不总是破坏，有时让系统更好地工作'],
    ['dzhanibekov', 'orbit', '守恒律决定哪种运动稳定，而不是直觉'],
    ['dzhanibekov', 'kapitza', '稳定性要看线性化之后的符号'],
    ['twochoices', 'queue', '只多看一个窗口，最长的队就短了指数级'],
    ['twochoices', 'friends', '一点点本地信息就有不成比例的收益'],
    ['ergodicity', 'average', '平均值描述的那个人并不存在：系综平均 ≠ 个人经历'],
    ['ergodicity', 'arcsine', '时间平均和系综平均不是一回事'],
    ['ergodicity', 'parrondo', '乘性过程里，组合与再平衡会改变长期增长率'],
    ['arcsine', 'regression', '累计的领先不会"回归"：公平游戏里领先者常常一直领先'],
    ['drift', 'smallsample', '小群体里，噪声压倒信号'],
    ['drift', 'matthew', '早期的随机波动决定最终谁胜出'],
    ['resonance', 'sync', '非线性系统里，噪声和耦合都能让弱信号冒头'],
    ['matthew', 'friends', '朋友越多越容易交到新朋友：无标度网络就是这样长出来的'],
    ['matthew', 'survivor', '成功常是早期运气被放大；只看成功者会高估能力的作用'],
    ['percolation', 'friends', '熟人免疫就是在把传播网络推到渗流阈值以下'],
    ['percolation', 'sandpile', '临界点附近没有特征尺度'],
    ['sync', 'percolation', '超过临界耦合，局部的协调突然连成整体'],
    ['sandpile', 'bullwhip', '小扰动在系统里被放大成大事件'],
  ];
  const ROUTES = [
    { name: '为什么扩容没用', desc: '东西变便宜、路变宽、窗口变多，系统都会用你没想到的方式把它吃掉。', path: ['jevons', 'induced', 'braess', 'queue', 'bus'] },
    { name: '"挑最好的"陷阱', desc: '尖子会回落、小县霸占排行榜、赢家总是亏、KPI 会变质，解药只有一个：收缩。', path: ['regression', 'smallsample', 'stein', 'winners', 'goodhart'] },
    { name: '高维：诅咒与福音', desc: '从"没有平均人"到"参数越多越准"，背后是同一套高维几何。', path: ['average', 'highdim', 'distance', 'orthogonal', 'doubledescent'] },
    { name: '医疗数字为什么会骗人', desc: '抽样、分期、分组：病人一个没变，数字却全变了。', path: ['bus', 'screening', 'willrogers', 'simpson', 'berkson'] },
    { name: '推一下，系统反弹', desc: '集体收缩、补货、点火、交替下注：有反馈的系统不按直线走。', path: ['thrift', 'bullwhip', 'orbit', 'parrondo'] },
    { name: 'p 值的陷阱', desc: '边看边停、只发显著、超大样本：统计显著离"真的"有多远。', path: ['peeking', 'falsefindings', 'lindley', 'smallsample'] },
    { name: '运气的形状', desc: '期望在涨却人人在亏，公平游戏里领先不换手，连中之后的直觉需要先修正偏差。', path: ['ergodicity', 'arcsine', 'hothand', 'regression'] },
    { name: '没有典型尺度的世界', desc: '从温和偏好到城市隔离，从一粒沙到一场雪崩：临界点附近，小原因造成任意大的结果。', path: ['schelling', 'percolation', 'sandpile', 'benford'] },
    { name: '稳定从哪里来', desc: '旋转、振动、噪声、耦合：物理系统的稳定常常和直觉反着来。', path: ['dzhanibekov', 'kapitza', 'resonance', 'sync'] },
  ];
  const DOMAINS = [
    { id: 'traffic', name: '交通与城市' },
    { id: 'econ', name: '经济与商业' },
    { id: 'social', name: '社会与心理' },
    { id: 'sci', name: '科研与统计推断' },
    { id: 'med', name: '医学与生物' },
    { id: 'data', name: '数据与机器学习' },
    { id: 'phys', name: '物理与工程' },
  ];
  const DOMAIN = {
    braess: 'traffic', induced: 'traffic', bus: 'traffic', queue: 'traffic',
    jevons: 'econ', thrift: 'econ', bullwhip: 'econ', winners: 'econ', goodhart: 'econ',
    friends: 'social', berkson: 'social', regression: 'social',
    screening: 'med', willrogers: 'med', peto: 'med', simpson: 'med', smallsample: 'med',
    highdim: 'data', distance: 'data', orthogonal: 'data', doubledescent: 'data', stein: 'data',
    orbit: 'phys', parrondo: 'phys', average: 'phys', survivor: 'phys',
    schelling: 'social', condorcet: 'social', volunteer: 'social', hothand: 'social', matthew: 'social',
    lemons: 'econ', ergodicity: 'econ', arcsine: 'econ',
    birthweight: 'med', drift: 'med', resonance: 'med', sync: 'med',
    falsefindings: 'sci', peeking: 'sci', lindley: 'sci', lord: 'sci', bertrand: 'sci',
    benford: 'data', twochoices: 'data',
    polya: 'phys', kapitza: 'phys', dzhanibekov: 'phys', percolation: 'phys', sandpile: 'phys',
  };
  // ring order chosen so that categories with many cross-links sit next to each other
  const STRUCT_ORDER = ['collective', 'critical', 'feedback', 'chance', 'sampling', 'measure', 'selection', 'dimension'];
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a);
  const REASON = new Map(EDGES.map(([a, b, r]) => [key(a, b), r]));
  const neighbors = (id) => EDGES.filter((e) => e[0] === id || e[1] === id).map((e) => ({ id: e[0] === id ? e[1] : e[0], why: e[2] }));
  const short = (d) => (d.nav || d.title).split('：')[0];
  PL.graph = { EDGES, ROUTES, DOMAINS, DOMAIN, neighbors, reason: (a, b) => REASON.get(key(a, b)), short };

  const reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- force layout
  // Units: map height = 1, width = aspect. Each group has an anchor on an ellipse.
  function Sim(demos, aspect, seed = 7) {
    const r = PL.rng(seed);
    const index = Object.fromEntries(demos.map((d, i) => [d.id, i]));
    const nodes = demos.map((d) => ({ id: d.id, d, cat: d.cat, dom: DOMAIN[d.id] || 'data', x: 0, y: 0, vx: 0, vy: 0, pin: false, deg: 0, sx: 0, sy: 0, r: 6 }));
    const links = EDGES.filter((e) => e[0] in index && e[1] in index).map(([a, b, why]) => ({ s: index[a], t: index[b], why, bend: (r() < 0.5 ? -1 : 1) * (0.1 + 0.08 * r()) }));
    links.forEach((l) => { nodes[l.s].deg++; nodes[l.t].deg++; });
    const sim = { nodes, links, index, aspect, alpha: 1, mode: 'cat', anchors: {} };
    sim.group = (n) => (sim.mode === 'cat' ? n.cat : n.dom);
    sim.order = () => (sim.mode === 'cat' ? STRUCT_ORDER : DOMAINS.map((g) => g.id));
    function place() {
      const order = sim.order();
      const rx = Math.min(0.37 * sim.aspect, 0.8), ry = sim.aspect < 1 ? 0.38 : 0.34;
      order.forEach((g, i) => {
        const th = -Math.PI / 2 + Math.PI / order.length + (i * 2 * Math.PI) / order.length;
        sim.anchors[g] = [Math.cos(th) * rx, Math.sin(th) * ry];
      });
    }
    sim.setAspect = (a) => { sim.aspect = a; place(); sim.alpha = Math.max(sim.alpha, 0.5); };
    sim.setMode = (m) => { sim.mode = m; place(); sim.alpha = 1; };
    place();
    nodes.forEach((n) => { const [ax, ay] = sim.anchors[sim.group(n)]; n.x = ax + (r() - 0.5) * 0.12; n.y = ay + (r() - 0.5) * 0.12; });
    sim.step = () => {
      const a = sim.alpha;
      if (a < 0.004) return false;
      for (const n of nodes) {
        const [ax, ay] = sim.anchors[sim.group(n)];
        n.vx += (ax - n.x) * 0.05 * a; n.vy += (ay - n.y) * 0.05 * a;
      }
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const p = nodes[i], q = nodes[j];
        let dx = p.x - q.x, dy = (p.y - q.y) * 1.25;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1e-6) { dx = 1e-3; dy = 0; d2 = 1e-6; }
        const d = Math.sqrt(d2), f = Math.min(0.012, 6e-5 / d2) * a;
        p.vx += (dx / d) * f; p.vy += (dy / d) * f; q.vx -= (dx / d) * f; q.vy -= (dy / d) * f;
      }
      for (const l of links) {
        const p = nodes[l.s], q = nodes[l.t], same = sim.group(p) === sim.group(q);
        const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1e-6;
        const f = (d - (same ? 0.15 : 0.32)) * (same ? 0.018 : 0.003) * a;
        p.vx += (dx / d) * f; p.vy += (dy / d) * f; q.vx -= (dx / d) * f; q.vy -= (dy / d) * f;
      }
      const X = sim.aspect / 2 - 0.06, Y = 0.44;
      for (const n of nodes) {
        if (n.pin) { n.vx = n.vy = 0; continue; }
        n.vx *= 0.78; n.vy *= 0.78;
        n.x = M.clamp(n.x + n.vx, -X, X); n.y = M.clamp(n.y + n.vy, -Y, Y);
      }
      sim.alpha *= 0.986;
      return true;
    };
    sim.settle = (k = 600) => { for (let i = 0; i < k; i++) sim.step(); };
    return sim;
  }

  // ---------------------------------------------------------------- drawing helpers
  function ctrlPoint(p, q, bend) {
    const mx = (p.sx + q.sx) / 2, my = (p.sy + q.sy) / 2, dx = q.sx - p.sx, dy = q.sy - p.sy;
    return [mx - dy * bend, my + dx * bend];
  }
  function bez(p, c, q, t) {
    const u = 1 - t;
    return [u * u * p.sx + 2 * u * t * c[0] + t * t * q.sx, u * u * p.sy + 2 * u * t * c[1] + t * t * q.sy];
  }
  const catCol = (id) => PL.col('cat-' + id);
  function withAlpha(hex, a) {
    if (!hex || hex[0] !== '#') return hex;
    let x = hex.slice(1);
    if (x.length === 3) x = x.split('').map((c) => c + c).join('');
    const n = parseInt(x, 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  // ---------------------------------------------------------------- home: big map
  PL.mountMap = function (root, { demos, cats }) {
    const CAT = Object.fromEntries(cats.map((c) => [c.id, c]));
    const DOM = Object.fromEntries(DOMAINS.map((g) => [g.id, g]));
    const byId = Object.fromEntries(demos.map((d) => [d.id, d]));
    const st = { hover: null, pinned: null, route: -1, previewRoute: -1, group: null, hoverEdge: null, mode: 'cat', drag: null };
    const activeRoute = () => (st.route >= 0 ? st.route : st.previewRoute);

    const wrap = h('div', { class: 'map-wrap' });
    const bar = h('div', { class: 'map-bar' });
    const card = h('div', { class: 'map-card' });
    root.append(wrap);
    wrap.append(bar);
    const stageHost = h('div', { class: 'map-stage' });
    wrap.append(stageHost, card);

    // toolbar
    const modeCtl = PL.controls(h('div', { class: 'map-ctl' }));
    bar.append(modeCtl.el);
    const modeSeg = modeCtl.seg({ options: [{ value: 'cat', label: '按背后的结构' }, { value: 'dom', label: '按现实领域' }], value: 'cat', onChange: (v) => { st.mode = v; st.group = null; sim.setMode(v); caption(); renderCard(); } });
    const cap = h('span', { class: 'map-cap' });
    bar.append(cap);
    function caption() {
      cap.innerHTML = st.mode === 'cat'
        ? '颜色 = 结构，连线 = 关系'
        : '颜色仍是结构：<b>同一种颜色散落在不同领域</b>';
    }
    caption();

    // layout
    let narrow = false, inset = 0, padT = 58, padB = 58;
    const frame = (w, hh) => { const S = hh - padT - padB; return { S, ox: (w - inset) / 2, oy: padT + S / 2 }; };
    const sim = Sim(demos, 1.6);
    sim.settle(700);
    const stars = (() => { const r = PL.rng(99); return Array.from({ length: 140 }, () => [r(), r(), r() * 1.2 + 0.3, r()]); })();
    let pulses = [], t0 = performance.now();
    const labelPos = {};

    const stage = PL.stage(stageHost, {
      height: (w) => {
        const W0 = wrap.clientWidth || w;
        narrow = W0 < 1040;                 // card moves below the map so the graph gets the full width
        const mobile = W0 < 640;
        wrap.classList.toggle('narrow', narrow);
        inset = narrow ? 0 : 324;
        padT = narrow ? 22 : 64; padB = narrow ? 22 : 34;
        const hh = mobile ? Math.round(Math.min(900, w * 1.55)) : narrow ? Math.round(Math.min(880, Math.max(600, w * 0.82))) : Math.round(Math.min(900, Math.max(720, w * 0.7)));
        const asp = (w - inset) / (hh - padT - padB);
        if (Math.abs(asp - sim.aspect) > 0.02) { sim.setAspect(asp); for (let i = 0; i < 400; i++) sim.step(); }
        return hh;
      },
    }, draw);

    function focusSet() {
      const id = st.hover || st.pinned;
      if (id) return new Set([id, ...neighbors(id).map((n) => n.id)]);
      if (activeRoute() >= 0) return new Set(ROUTES[activeRoute()].path);
      if (st.group) return new Set(sim.nodes.filter((n) => sim.group(n) === st.group).map((n) => n.id));
      return null;
    }
    function routeEdge(a, b) {
      if (activeRoute() < 0) return -1;
      const p = ROUTES[activeRoute()].path;
      for (let i = 0; i < p.length - 1; i++) if ((p[i] === a && p[i + 1] === b) || (p[i] === b && p[i + 1] === a)) return i;
      return -1;
    }

    function draw(c, w, hh) {
      const time = (performance.now() - t0) / 1000;
      const dark = matchMedia('(prefers-color-scheme: dark)').matches;
      const { S, ox, oy } = frame(w, hh);
      for (const n of sim.nodes) { n.sx = ox + n.x * S; n.sy = oy + n.y * S; n.r = 4 + 0.95 * n.deg; }
      // background
      const bg = c.createRadialGradient(ox, oy, 0, ox, oy, Math.max(w, hh) * 0.7);
      bg.addColorStop(0, PL.col('panel'));
      bg.addColorStop(1, PL.col('paper'));
      c.fillStyle = bg; c.fillRect(0, 0, w, hh);
      c.fillStyle = PL.col('ink');
      for (const [sx, sy, sr, ph] of stars) {
        c.globalAlpha = (dark ? 0.16 : 0.07) * (0.6 + 0.4 * Math.sin(time * 0.8 + ph * 6.28));
        c.beginPath(); c.arc(sx * w, sy * hh, sr, 0, 7); c.fill();
      }
      c.globalAlpha = 1;
      const F = focusSet();
      const fid = st.hover || st.pinned;
      // group halos + labels
      const groups = sim.order();
      for (const g of groups) {
        const mem = sim.nodes.filter((n) => sim.group(n) === g);
        if (!mem.length) continue;
        const cx = M.mean(mem.map((n) => n.sx)), cy = M.mean(mem.map((n) => n.sy));
        let rad = 0; for (const n of mem) rad = Math.max(rad, Math.hypot(n.sx - cx, n.sy - cy));
        rad += 46;
        const col = st.mode === 'cat' ? catCol(g) : PL.col('ink3');
        const on = !F || mem.some((n) => F.has(n.id)) || st.group === g;
        const grd = c.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad);
        grd.addColorStop(0, withAlpha(col, (st.group === g ? 0.2 : 0.11) * (on ? 1 : 0.4) * (dark ? 1.2 : 1)));
        grd.addColorStop(1, withAlpha(col, 0));
        c.fillStyle = grd; c.beginPath(); c.arc(cx, cy, rad, 0, 7); c.fill();
        // label: above the cluster in the upper half, below it in the lower half
        const top = Math.min(...mem.map((n) => n.sy - n.r)), bottom = Math.max(...mem.map((n) => n.sy + n.r));
        const lx = cx, ly = cy <= oy + 8 ? top - 16 : bottom + 24;
        const name = st.mode === 'cat' ? CAT[g].name : DOM[g].name;
        c.save();
        c.font = PL.font(12.5, 700);
        if ('letterSpacing' in c) c.letterSpacing = '1.5px';
        c.textAlign = 'center';
        c.globalAlpha = on ? 0.95 : 0.35;
        c.fillStyle = st.mode === 'cat' ? col : PL.col('ink2');
        const LX = M.clamp(lx, 80, w - inset - 80), LY = M.clamp(ly, padT - 4, hh - padB + 8);
        c.fillText(name, LX, LY);
        c.restore();
        labelPos[g] = [LX, LY];
      }
      // edges
      c.lineCap = 'round';
      sim.links.forEach((l, i) => {
        const p = sim.nodes[l.s], q = sim.nodes[l.t];
        const cp = ctrlPoint(p, q, l.bend);
        const incident = fid && (p.id === fid || q.id === fid);
        const ri = routeEdge(p.id, q.id);
        const lit = incident || ri >= 0 || (st.group && F && F.has(p.id) && F.has(q.id));
        const dim = F && !lit;
        const sameCat = p.cat === q.cat;
        let stroke;
        if (sameCat) stroke = withAlpha(catCol(p.cat), dim ? 0.07 : lit ? 0.95 : 0.4);
        else {
          const gr = c.createLinearGradient(p.sx, p.sy, q.sx, q.sy);
          gr.addColorStop(0, withAlpha(catCol(p.cat), dim ? 0.06 : lit ? 0.95 : 0.32));
          gr.addColorStop(1, withAlpha(catCol(q.cat), dim ? 0.06 : lit ? 0.95 : 0.32));
          stroke = gr;
        }
        c.strokeStyle = stroke;
        c.lineWidth = lit ? (st.hoverEdge === i ? 4 : 2.6) : 1.3;
        c.setLineDash(lit && !reduceMotion ? [7, 6] : sameCat ? [] : [2, 4]);
        c.lineDashOffset = lit ? -time * 26 : 0;
        c.beginPath(); c.moveTo(p.sx, p.sy); c.quadraticCurveTo(cp[0], cp[1], q.sx, q.sy); c.stroke();
        c.setLineDash([]);
        l._cp = cp;
      });
      // pulses
      if (!reduceMotion) {
        for (const pu of pulses) {
          const l = sim.links[pu.e], p = sim.nodes[l.s], q = sim.nodes[l.t];
          const tt = pu.dir > 0 ? pu.t : 1 - pu.t;
          const [x, y] = bez(p, l._cp || ctrlPoint(p, q, l.bend), q, tt);
          const col = catCol((pu.dir > 0 ? p : q).cat);
          const g2 = c.createRadialGradient(x, y, 0, x, y, 7);
          g2.addColorStop(0, withAlpha(col, 0.9 * Math.sin(Math.PI * pu.t)));
          g2.addColorStop(1, withAlpha(col, 0));
          c.fillStyle = g2; c.beginPath(); c.arc(x, y, 7, 0, 7); c.fill();
        }
      }
      // nodes
      const routeIdx = activeRoute() >= 0 ? ROUTES[activeRoute()].path : null;
      for (const n of sim.nodes) {
        const dim = F && !F.has(n.id);
        const col = catCol(n.cat);
        const isF = n.id === fid;
        c.globalAlpha = dim ? 0.22 : 1;
        if (!dim) {
          const glow = c.createRadialGradient(n.sx, n.sy, n.r * 0.6, n.sx, n.sy, n.r * (isF ? 4 : 2.6));
          glow.addColorStop(0, withAlpha(col, isF ? 0.55 : 0.28));
          glow.addColorStop(1, withAlpha(col, 0));
          c.fillStyle = glow; c.beginPath(); c.arc(n.sx, n.sy, n.r * (isF ? 4 : 2.6), 0, 7); c.fill();
        }
        c.fillStyle = col;
        const rr = n.r * (isF ? 1.25 : 1) * (1 + (reduceMotion ? 0 : 0.04 * Math.sin(time * 1.6 + n.x * 9)));
        c.beginPath(); c.arc(n.sx, n.sy, rr, 0, 7); c.fill();
        c.lineWidth = 2; c.strokeStyle = PL.col('panel'); c.stroke();
        if (routeIdx && routeIdx.includes(n.id)) {
          const k = routeIdx.indexOf(n.id) + 1;
          c.fillStyle = PL.col('ink'); c.beginPath(); c.arc(n.sx + rr * 0.9, n.sy - rr * 0.9, 8, 0, 7); c.fill();
          c.fillStyle = PL.col('paper'); c.font = PL.font(10.5, 700); c.textAlign = 'center'; c.textBaseline = 'middle';
          c.fillText(String(k), n.sx + rr * 0.9, n.sy - rr * 0.9 + 0.5); c.textBaseline = 'alphabetic';
        }
      }
      c.globalAlpha = 1;
      // labels: prefer the side facing away from the group's centre; greedily avoid other labels and dots
      const cent = {};
      for (const g of groups) { const mem = sim.nodes.filter((n) => sim.group(n) === g); cent[g] = M.mean(mem.map((n) => n.sx)); }
      const placed = [];
      const order = [...sim.nodes].sort((a, b) => (b.id === fid) - (a.id === fid) || b.deg - a.deg);
      const fs = narrow ? 11 : 12;
      for (const n of order) {
        const isF = n.id === fid, dim = F && !F.has(n.id);
        c.font = PL.font(isF ? 14 : fs, isF || (F && !dim) ? 650 : 500);
        const txt = short(n.d), tw = c.measureText(txt).width, th = isF ? 16 : 14;
        const prefRight = n.sx >= cent[sim.group(n)] - 2;
        const cands = [prefRight ? 'r' : 'l', prefRight ? 'l' : 'r', 'b', 't'];
        const rectOf = (side) => {
          if (side === 'r') return [n.sx + n.r + 6, n.sy - th / 2, tw, th];
          if (side === 'l') return [n.sx - n.r - 6 - tw, n.sy - th / 2, tw, th];
          if (side === 'b') return [n.sx - tw / 2, n.sy + n.r + 3, tw, th];
          return [n.sx - tw / 2, n.sy - n.r - 3 - th, tw, th];
        };
        const bad = (R) => {
          if (R[0] < 3 || R[0] + R[2] > w - inset - 3 || R[1] < 2 || R[1] + R[3] > hh - 2) return 2;
          for (const P of placed) if (R[0] < P[0] + P[2] && R[0] + R[2] > P[0] && R[1] < P[1] + P[3] && R[1] + R[3] > P[1]) return 1;
          for (const m of sim.nodes) if (m !== n && m.sx + m.r > R[0] && m.sx - m.r < R[0] + R[2] && m.sy + m.r > R[1] && m.sy - m.r < R[1] + R[3]) return 1;
          return 0;
        };
        let best = rectOf(cands[0]), bs = bad(best);
        for (const sd of cands) { const R = rectOf(sd), b = bad(R); if (b < bs) { best = R; bs = b; } if (b === 0) { best = R; break; } }
        placed.push(best);
        c.textAlign = 'left'; c.textBaseline = 'middle';
        c.globalAlpha = dim ? 0.25 : 1;
        c.lineWidth = 4; c.strokeStyle = PL.col('panel'); c.lineJoin = 'round';
        c.strokeText(txt, best[0], best[1] + th / 2);
        c.fillStyle = PL.col(isF ? 'ink' : 'ink2');
        c.fillText(txt, best[0], best[1] + th / 2);
      }
      c.globalAlpha = 1; c.textBaseline = 'alphabetic';
    }

    // animation
    let spawn = 0;
    PL.loop((dt) => {
      sim.step();
      if (!reduceMotion) {
        spawn += dt;
        const fid = st.hover || st.pinned;
        const rate = fid ? 0.12 : 0.45;
        while (spawn > rate) {
          spawn -= rate;
          let cand = sim.links.map((l, i) => i);
          if (fid) cand = cand.filter((i) => sim.nodes[sim.links[i].s].id === fid || sim.nodes[sim.links[i].t].id === fid);
          else if (activeRoute() >= 0) cand = cand.filter((i) => routeEdge(sim.nodes[sim.links[i].s].id, sim.nodes[sim.links[i].t].id) >= 0);
          if (!cand.length) break;
          const e = cand[Math.floor(Math.random() * cand.length)];
          const l = sim.links[e];
          let dir = Math.random() < 0.5 ? 1 : -1;
          if (fid) dir = sim.nodes[l.s].id === fid ? 1 : -1;
          pulses.push({ e, t: 0, dir, v: 0.6 + Math.random() * 0.4 });
        }
        for (const p of pulses) p.t += dt * p.v;
        pulses = pulses.filter((p) => p.t < 1);
      }
      stage.render();
    });
    stage.render();

    // interaction
    function hit(x, y) {
      let best = null, bd = Infinity;
      for (const n of sim.nodes) {
        const d = Math.hypot(n.sx - x, n.sy - y);
        if (d < n.r + 9 && d < bd) { bd = d; best = n; }
      }
      return best;
    }
    function hitGroup(x, y) {
      for (const g of sim.order()) { const p = labelPos[g]; if (p && Math.abs(p[0] - x) < 60 && Math.abs(p[1] - 4 - y) < 12) return g; }
      return null;
    }
    const cv = stage.canvas;
    cv.addEventListener('pointerdown', (e) => {
      const { x, y } = stage.pos(e);
      const n = hit(x, y);
      if (n) { st.drag = { n, x0: x, y0: y, moved: false, touch: e.pointerType !== 'mouse' }; cv.setPointerCapture(e.pointerId); }
    });
    cv.addEventListener('pointermove', (e) => {
      const { x, y } = stage.pos(e);
      if (st.drag) {
        const dr = st.drag;
        if (!dr.moved && Math.hypot(x - dr.x0, y - dr.y0) > 5) { dr.moved = true; dr.n.pin = true; }
        if (dr.moved) {
          const { S, ox, oy } = frame(stage.w, stage.h);
          dr.n.x = (x - ox) / S; dr.n.y = (y - oy) / S; sim.alpha = Math.max(sim.alpha, 0.3);
        }
        return;
      }
      if (e.pointerType !== 'mouse') return;
      const n = hit(x, y);
      const g = n ? null : hitGroup(x, y);
      cv.style.cursor = n || g ? 'pointer' : 'default';
      const id = n ? n.id : null;
      if (id !== st.hover) { st.hover = id; renderCard(); }
    });
    cv.addEventListener('pointerup', (e) => {
      const dr = st.drag;
      st.drag = null;
      const { x, y } = stage.pos(e);
      if (dr) {
        dr.n.pin = false;
        if (dr.moved) { sim.alpha = Math.max(sim.alpha, 0.4); return; }
        // tap / click on a node
        if (dr.touch && st.pinned !== dr.n.id) { st.pinned = dr.n.id; renderCard(); return; }
        location.hash = '#/' + dr.n.id;
        return;
      }
      const g = hitGroup(x, y);
      if (g) { st.group = st.group === g ? null : g; st.route = -1; st.pinned = null; renderCard(); return; }
      if (st.pinned || st.group) { st.pinned = null; st.group = null; renderCard(); }
    });
    cv.addEventListener('pointerleave', () => { if (st.hover) { st.hover = null; renderCard(); } cv.style.cursor = 'default'; });

    // info card
    function nodeLink(id, extra = '') {
      const d = byId[id];
      return `<a class="mc-row" href="#/${id}" data-id="${id}"><span class="mc-dot" style="background:var(--cat-${d.cat})"></span><span><b>${short(d)}</b>${extra}</span></a>`;
    }
    function renderCard() {
      const id = st.hover || st.pinned;
      let html;
      if (id) {
        const d = byId[id], c0 = CAT[d.cat];
        html = `<div class="mc-kicker" style="color:var(--cat-${d.cat})">${c0.name} · ${DOM[DOMAIN[id]].name}</div>
          <div class="mc-title">${d.title}</div>
          <p class="mc-hook">${d.hook}</p>
          <div class="mc-sec">它连着</div>
          ${neighbors(id).map((nb) => nodeLink(nb.id, `<small>${nb.why}</small>`)).join('')}
          <a class="mc-open" href="#/${id}">打开这一页 →</a>`;
      } else if (st.route >= 0) {
        const rt = ROUTES[st.route];
        html = `<button type="button" class="mc-back">← 全部路线</button><div class="mc-kicker">导览路线 ${st.route + 1}</div><div class="mc-title">${rt.name}</div><p class="mc-hook">${rt.desc}</p><ol class="mc-steps">` +
          rt.path.map((pid, i) => {
            const why = i < rt.path.length - 1 ? PL.graph.reason(pid, rt.path[i + 1]) : '';
            return `<li>${nodeLink(pid)}${why ? `<div class="mc-why">↓ ${why}</div>` : ''}</li>`;
          }).join('') + `</ol><a class="mc-open" href="#/${rt.path[0]}">从第一站开始 →</a>`;
      } else if (st.group) {
        const g = st.group, mem = sim.nodes.filter((n) => sim.group(n) === g);
        if (st.mode === 'cat') {
          const c0 = CAT[g];
          html = `<div class="mc-kicker" style="color:var(--cat-${g})">${c0.tag}</div><div class="mc-title">${c0.name}</div><p class="mc-hook">${c0.desc}</p><div class="mc-sec">这一类</div>${mem.map((n) => nodeLink(n.id)).join('')}`;
        } else {
          const cats = [...new Set(mem.map((n) => n.cat))];
          html = `<div class="mc-kicker">现实领域</div><div class="mc-title">${DOM[g].name}</div><p class="mc-hook">这个领域里的 ${mem.length} 个结论，分属 <b>${cats.length}</b> 种不同的结构。</p>${mem.map((n) => nodeLink(n.id, `<small>${CAT[n.cat].name}</small>`)).join('')}`;
        }
      } else {
        html = `<div class="mc-kicker">怎么看这张图</div>
          <div class="mc-title">${demos.length} 个结论，${EDGES.length} 条关系</div>
          <p class="mc-hook">点的颜色是背后的<b>结构</b>，连线是两个结论之间的具体关系，点越大连得越多。悬停（手机上轻点）一个点看它连着谁，再点一下进入；拖动可以拉扯整张网。也可以切到"按现实领域"，看同一副骨架怎样散落在交通、医学、AI 里。</p>
          <div class="mc-sec">${cats.length} 副骨架</div>` +
          cats.map((c0) => `<button type="button" class="mc-row mc-grp" data-g="${c0.id}"><span class="mc-dot" style="background:var(--cat-${c0.id})"></span><span><b>${c0.name}</b><small>${c0.tag}</small></span></button>`).join('') +
          `<div class="mc-sec">导览路线 · 沿着连线读</div>` +
          ROUTES.map((rt, i) => `<button type="button" class="mc-row mc-route" data-r="${i}"><span class="mc-num">${i + 1}</span><span><b>${rt.name}</b><small>${rt.path.map((pid) => short(byId[pid])).join(' → ')}</small></span></button>`).join('');
      }
      card.innerHTML = html;
      card.querySelectorAll('.mc-grp').forEach((b) => {
        b.addEventListener('mouseenter', () => { st.group = b.dataset.g; });
        b.addEventListener('mouseleave', () => { st.group = null; });
        b.addEventListener('click', () => { st.group = b.dataset.g; renderCard(); });
      });
      card.querySelectorAll('.mc-route').forEach((b) => {
        const i = +b.dataset.r;
        b.addEventListener('mouseenter', () => { st.previewRoute = i; });
        b.addEventListener('mouseleave', () => { st.previewRoute = -1; });
        b.addEventListener('click', () => { st.route = i; st.previewRoute = -1; st.pinned = null; st.group = null; renderCard(); });
      });
      const back = card.querySelector('.mc-back');
      if (back) back.addEventListener('click', () => { st.route = -1; renderCard(); });
      card.querySelectorAll('a.mc-row').forEach((a) => {
        a.addEventListener('mouseenter', () => {
          const other = a.dataset.id, base = st.hover || st.pinned;
          if (!base) return;
          st.hoverEdge = sim.links.findIndex((l) => key(sim.nodes[l.s].id, sim.nodes[l.t].id) === key(base, other));
        });
        a.addEventListener('mouseleave', () => { st.hoverEdge = null; });
      });
    }
    // keep the card on the hovered node while the pointer travels from the map to the card
    card.addEventListener('mouseenter', () => { if (st.hover) { st.pinned = st.hover; st.hover = null; } });
    renderCard();
    const onKey = (e) => { if (e.key === 'Escape') { st.route = -1; st.pinned = null; st.group = null; renderCard(); } };
    window.addEventListener('keydown', onKey);
    PL.onCleanup(() => window.removeEventListener('keydown', onKey));
    return {
      highlightGroup(g) {
        if (st.mode !== 'cat') { st.mode = 'cat'; modeSeg.set('cat'); sim.setMode('cat'); caption(); }
        st.group = g; st.route = -1; st.pinned = null; renderCard();
      },
    };
  };

  // ---------------------------------------------------------------- sidebar mini-map (persists across pages)
  PL.miniMap = function (host, demos) {
    const W = 248, H = 168;
    const canvas = h('canvas');
    const tip = h('div', { class: 'mini-tip' });
    host.append(canvas, tip);
    const sim = Sim(demos, W / H, 11);
    sim.settle(800);
    let current = null, hover = null;
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = host.clientWidth || W;
      canvas.style.width = w + 'px'; canvas.style.height = H + 'px';
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(H * dpr);
      const c = canvas.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { c, w };
    }
    function draw() {
      const { c, w } = size();
      const S = H * 0.98, ox = w / 2, oy = H / 2;
      for (const n of sim.nodes) { n.sx = ox + n.x * S; n.sy = oy + n.y * S; n.r = 2.4 + 0.45 * n.deg; }
      const focus = current ? new Set([current, ...neighbors(current).map((n) => n.id)]) : null;
      c.lineCap = 'round';
      for (const l of sim.links) {
        const p = sim.nodes[l.s], q = sim.nodes[l.t];
        const lit = current && (p.id === current || q.id === current);
        const cp = ctrlPoint(p, q, l.bend);
        c.strokeStyle = withAlpha(catCol(lit ? (p.id === current ? q.cat : p.cat) : p.cat), lit ? 0.9 : focus ? 0.1 : 0.3);
        c.lineWidth = lit ? 1.6 : 0.9;
        c.beginPath(); c.moveTo(p.sx, p.sy); c.quadraticCurveTo(cp[0], cp[1], q.sx, q.sy); c.stroke();
      }
      for (const n of sim.nodes) {
        const on = !focus || focus.has(n.id), me = n.id === current || n.id === hover;
        c.globalAlpha = on ? 1 : 0.28;
        if (me) {
          const g = c.createRadialGradient(n.sx, n.sy, 0, n.sx, n.sy, 14);
          g.addColorStop(0, withAlpha(catCol(n.cat), 0.6)); g.addColorStop(1, withAlpha(catCol(n.cat), 0));
          c.fillStyle = g; c.beginPath(); c.arc(n.sx, n.sy, 14, 0, 7); c.fill();
        }
        c.fillStyle = catCol(n.cat);
        c.beginPath(); c.arc(n.sx, n.sy, n.r * (me ? 1.5 : 1), 0, 7); c.fill();
        if (n.id === current) { c.strokeStyle = PL.col('ink'); c.lineWidth = 1.5; c.stroke(); }
      }
      c.globalAlpha = 1;
    }
    function hit(e) {
      const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best = null, bd = 10;
      for (const n of sim.nodes) { const d = Math.hypot(n.sx - x, n.sy - y); if (d < bd) { bd = d; best = n; } }
      return { n: best, x, y };
    }
    canvas.addEventListener('pointermove', (e) => {
      const { n, x, y } = hit(e);
      const id = n ? n.id : null;
      canvas.style.cursor = n ? 'pointer' : 'default';
      if (id !== hover) {
        hover = id; draw();
        if (n) { tip.textContent = short(n.d); tip.style.left = M.clamp(x, 40, host.clientWidth - 40) + 'px'; tip.style.top = Math.max(0, y - 30) + 'px'; tip.classList.add('on'); }
        else tip.classList.remove('on');
      }
    });
    canvas.addEventListener('pointerleave', () => { hover = null; tip.classList.remove('on'); draw(); });
    canvas.addEventListener('click', (e) => { const { n } = hit(e); if (n) location.hash = '#/' + n.id; });
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => setTimeout(draw, 0));
    new ResizeObserver(() => draw()).observe(host);
    draw();
    return { setCurrent(id) { current = id; draw(); } };
  };
})();
