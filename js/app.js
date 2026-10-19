/* 反直觉实验室 — routing, navigation, home page (map lives in map.js). */
(function () {
  'use strict';
  const { h } = PL;

  const CATS = [
    {
      id: 'collective', name: '个体理性，集体变糟', tag: '个体最优 ≠ 整体最优',
      desc: '每个人都做了对自己最好的选择，合起来的结果却让所有人都更糟。看一个系统，要看它最后落到哪个<b>均衡</b>，而不是在现在的行为上做加法。',
    },
    {
      id: 'sampling', name: '你看到的样本是偏的', tag: '样本被大小 / 时长加权',
      desc: '一个东西被你看到的概率，跟它的大小、持续时间或"能否活下来"有关。于是你看到的平均值、相关性，都不是总体的样子。',
    },
    {
      id: 'selection', name: '选择 + 噪声', tag: '"挑最大的"本身就是有偏筛选',
      desc: '只要估计里有噪声，"挑出最好的那个"就会顺手挑出最大的正误差。解法几乎都一样：先往均值<b>收缩</b>，再做选择。',
    },
    {
      id: 'dimension', name: '维度与尺度', tag: '低维直觉在高维失效',
      desc: '三维世界里练出来的几何直觉，在几十、上千维里几乎条条反过来：平均的东西不典型，所有东西都挤在边界上，任意两点都一样远。',
    },
    {
      id: 'measure', name: '量法变了，东西没变', tag: '指标的起点被移动了',
      desc: '你改变的是测量方式、分组方式或者考核方式，事物本身没有变化，指标却漂亮地动了。',
    },
    {
      id: 'feedback', name: '反馈、延迟与耦合', tag: '约束系统里要反着操作',
      desc: '系统里有守恒量、延迟或者状态耦合时，最直接的那一推会被系统顶回来，甚至产生相反的效果。',
    },
    {
      id: 'chance', name: '运气的形状', tag: '期望 ≠ 典型',
      desc: '期望值、平均值、"公平"这些词在随机过程里会骗人：期望在涨的人大多在亏，公平的游戏里领先几乎不换手，有利的突变多半消失，而噪声有时反而帮了你。',
    },
    {
      id: 'critical', name: '临界与涌现', tag: '量变在某一点变成质变',
      desc: '很多系统在某个临界点附近会突然改变整体行为：连通、同步、雪崩。个体规则一点没变，全局却换了一副样子，而且临界点附近没有"典型大小"。',
    },
  ];
  const CAT = Object.fromEntries(CATS.map((c) => [c.id, c]));


  const side = document.getElementById('side');
  const main = document.getElementById('main');
  const menuBtn = document.getElementById('menuBtn');
  menuBtn.addEventListener('click', () => side.classList.toggle('open'));

  const ordered = [];
  for (const c of CATS) for (const d of PL.demos) if (d.cat === c.id) ordered.push(d);
  const byId = Object.fromEntries(ordered.map((d) => [d.id, d]));

  function catColor(id) { return `var(--cat-${id})`; }

  let mini = null;
  function buildNav() {
    side.innerHTML = '';
    side.append(h('a', { class: 'brand', href: '#/' },
      h('div', { class: 'brand-t', text: '反直觉实验室' }),
      h('div', { class: 'brand-s', text: `${ordered.length} 个违反直觉的结论 · ${PL.graph.EDGES.length} 条关系` })));
    const miniBox = h('div', { class: 'mini' });
    const miniHost = h('div', { class: 'mini-host' });
    miniBox.append(miniHost, h('a', { class: 'mini-cap', href: '#/', html: '全图 · 点亮的是当前页和它的邻居' }));
    side.append(miniBox);
    mini = PL.miniMap(miniHost, ordered);
    for (const c of CATS) {
      const items = ordered.filter((x) => x.cat === c.id);
      const box = h('div', { class: 'nav-cat', 'data-cat': c.id });
      box.style.setProperty('--c', catColor(c.id));
      const head = h('button', { type: 'button', class: 'nav-cat-h' }, h('span', { class: 'dot' }), h('span', { class: 'nav-cat-name', text: c.name }), h('span', { class: 'nav-count', text: String(items.length) }), h('span', { class: 'chev', text: '›' }));
      head.addEventListener('click', () => box.classList.toggle('open'));
      const list = h('div', { class: 'nav-items' });
      for (const d of items) list.append(h('a', { class: 'item', href: '#/' + d.id, 'data-id': d.id, text: d.nav || d.title }));
      box.append(head, list);
      side.append(box);
    }
  }

  function setActive(id) {
    side.querySelectorAll('a.item').forEach((a) => a.classList.toggle('active', a.dataset.id === id));
    if (id && byId[id]) { const box = side.querySelector(`.nav-cat[data-cat="${byId[id].cat}"]`); if (box) box.classList.add('open'); }
    side.classList.toggle('on-home', !id);
    if (mini) mini.setCurrent(id);
  }

  function link(id, label) {
    const d = byId[id];
    return d ? `<a href="#/${id}">${label || d.nav || d.title}</a>` : label || id;
  }
  PL.link = link;

  function renderHome(scrollCat) {
    document.title = '反直觉实验室';
    const root = h('div', { class: 'home' });
    main.append(root);
    root.append(h('section', { class: 'hero', html: `
      <h1>反直觉实验室</h1>
      <p>修路反而更堵，体检越多"生存率"越好看却没人多活一天，把毫不相干的估计一起往中间拉误差反而更小……这里的 ${ordered.length} 个结论不是孤立的：它们共用几副骨架，又彼此牵连。下面这张图里，<b>颜色是背后的结构，连线是它们之间的关系</b>。每一页都有一个能动手调的模拟。</p>` }));
    const mapSec = h('section', { class: 'map-section' });
    root.append(mapSec);
    const map = PL.mountMap(mapSec, { demos: ordered, cats: CATS });

    const sk = h('section', { class: 'cat-block' });
    sk.append(h('div', { class: 'cat-block-h' }, h('h2', { text: '八副骨架' })));
    sk.append(h('p', { class: 'cat-desc', text: `按结构看，这 ${ordered.length} 个结论只有八种骨架。点一张卡片，在图上点亮它。` }));
    const grid = h('div', { class: 'skeletons' });
    for (const c of CATS) {
      const n = ordered.filter((x) => x.cat === c.id);
      const crossN = PL.graph.EDGES.filter(([a, b]) => { const A = byId[a], B = byId[b]; return A && B && (A.cat === c.id) !== (B.cat === c.id); }).length;
      const card = h('button', { type: 'button', class: 'skel' });
      card.style.setProperty('--c', catColor(c.id));
      card.innerHTML = `<div class="skel-tag">${c.tag}</div><div class="skel-name">${c.name}</div><div class="skel-desc">${c.desc}</div>
        <div class="skel-foot"><span class="skel-dots">${n.map(() => '<i></i>').join('')}</span>${n.length} 个结论 · 向外 ${crossN} 条连线</div>`;
      card.addEventListener('click', () => { map.highlightGroup(c.id); mapSec.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
      grid.append(card);
    }
    sk.append(grid);
    root.append(sk);
    if (scrollCat && CAT[scrollCat]) { map.highlightGroup(scrollCat); }
  }

  function renderDemo(d) {
    const c = CAT[d.cat];
    document.title = d.title + ' · 反直觉实验室';
    const art = h('article', { class: 'demo' });
    art.style.setProperty('--c', catColor(d.cat));
    art.append(h('header', { class: 'demo-head' },
      h('a', { class: 'chip', href: '#/cat/' + c.id }, h('span', { class: 'dot' }), c.name + ' · ' + c.tag),
      h('h1', { text: d.title }),
      h('p', { class: 'hook', html: d.hook })));
    const body = h('div', { class: 'demo-body' });
    art.append(body);
    main.append(art);
    try {
      d.render(body);
    } catch (e) {
      console.error(e);
      body.append(h('pre', { text: '演示出错：' + e.message }));
    }
    // related + pager
    const foot = h('footer', { class: 'related' });
    const conns = PL.graph.neighbors(d.id).filter((x) => byId[x.id]);
    for (const id of d.related || []) if (byId[id] && !conns.some((x) => x.id === id)) conns.push({ id, why: '' });
    if (conns.length) {
      foot.append(h('div', { class: 'related-h', text: `它连着 ${conns.length} 个结论` }));
      const list = h('div', { class: 'conn-list' });
      conns.forEach(({ id, why }) => {
        const o = byId[id];
        const a = h('a', { class: 'conn', href: '#/' + id });
        a.style.setProperty('--c2', catColor(o.cat));
        a.innerHTML = `<span class="conn-dot"></span><span class="conn-t">${o.title}</span>${why ? `<span class="conn-why">${why}</span>` : ''}`;
        list.append(a);
      });
      foot.append(list);
    }
    const i = ordered.indexOf(d);
    const prev = ordered[i - 1], next = ordered[i + 1];
    const pager = h('div', { class: 'pager' });
    pager.append(prev ? h('a', { class: 'prev', href: '#/' + prev.id }, h('small', { text: '← 上一个' }), prev.title) : h('span'));
    pager.append(next ? h('a', { class: 'next', href: '#/' + next.id }, h('small', { text: '下一个 →' }), next.title) : h('span'));
    foot.append(pager);
    art.append(foot);
  }

  function route() {
    PL._runCleanups();
    main.innerHTML = '';
    side.classList.remove('open');
    const hash = location.hash.replace(/^#\/?/, '');
    const parts = hash.split('/');
    if (parts[0] === 'cat') {
      main.classList.add('wide');
      setActive(null);
      renderHome(parts[1]);
      return;
    }
    const d = byId[parts[0]];
    main.classList.toggle('wide', !d);
    window.scrollTo(0, 0);
    if (d) { setActive(d.id); renderDemo(d); } else { setActive(null); renderHome(); }
  }

  buildNav();
  window.addEventListener('hashchange', route);
  route();
})();
