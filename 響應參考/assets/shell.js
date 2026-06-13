/* ============================================================
   CharacterHub — App Shell (prototype)
   Injects the sidebar on any page that includes shell.css + data.js.
   v2 adds: 我的空間 / 目前企劃 scope switch, capability-filtered
   project nav (by Demo viewer role), quick-add, and a Demo role
   switcher. Single mock source = window.OCData. Reads current
   project from ?project= or localStorage; nav carries it forward.
   Everything that "saves" is Demo interaction only.
   ============================================================ */
(function () {
  var OD = window.OCData;
  var PROJECTS = (OD && OD.activeProjects ? OD.activeProjects() : (OD && OD.projects)) || [];
  var ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    mask: '<path d="M4 5c0 8 4 13 8 13s8-5 8-13c-3 1-5 1-8 1s-5 0-8-1Z"/><circle cx="9" cy="10" r=".6" fill="currentColor"/><circle cx="15" cy="10" r=".6" fill="currentColor"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
    nodes: '<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="7" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M8 7l8 .5M7 8l4 8M17 9l-4 7"/>',
    bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z"/>',
    ruler: '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
    star: '<path d="M12 4l2.3 4.8 5.2.7-3.8 3.6 1 5.1L12 15.8 7.3 18.2l1-5.1-3.8-3.6 5.2-.7Z"/>',
    box: '<path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
    book: '<path d="M5 4h10a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2H5Z"/><path d="M5 4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2"/><path d="M9 8h5M9 11h5"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 16l-5-5-7 7"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.4-2.5H9.5l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h4.9l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
    window: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5 9-5Z"/><path d="M3 13l9 5 9-5"/>',
    cast: '<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 6a3 3 0 0 1 0 6M21 20a5 5 0 0 0-4-5"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    users: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2 20a6 6 0 0 1 12 0M15 14a5 5 0 0 1 6 5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
  };
  function icon(k) { return '<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[k] || '') + '</svg>'; }

  var file = (location.pathname.split('/').pop() || '').toLowerCase();
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var cur = new URLSearchParams(location.search).get('project') || get('ch:proj') || (PROJECTS[0] && PROJECTS[0].id) || 'tokoyo';
  if (!PROJECTS.some(function (p) { return p.id === cur; })) cur = PROJECTS[0] ? PROJECTS[0].id : 'tokoyo';
  set('ch:proj', cur);
  if (OD) OD.setCurrent(cur);
  function proj() { return PROJECTS.filter(function (p) { return p.id === cur; })[0] || PROJECTS[0]; }
  var Q = '?project=' + cur;
  var role = OD ? OD.getRole() : 'owner';
  function can(c) { return OD ? OD.can(c) : true; }

  // ---- which scope is this page? (route + query, via Scope Resolver) ----
  var SR = OD && OD.resolveScope ? OD.resolveScope(file, location.search) : { scope: 'account' };
  var scope = SR.scope;
  // invalid project context → keep the Account shell (page renders an explicit
  // error); never silently treat as a valid project.
  if (scope === 'invalid') scope = 'account';
  // a Project-scope resolution may carry its own project id (e.g. character
  // opened with ?project=&link=); honor it so the right project shell shows.
  if (SR.scope === 'project' && SR.currentProjectId) { cur = SR.currentProjectId; set('ch:proj', cur); if (OD) OD.setCurrent(cur); Q = '?project=' + cur; role = OD.getRole(cur); }
  // Account scope must NEVER show the project content sidebar, even if a
  // currentProject is remembered. Public/Builder render no workspace shell.
  if (scope === 'public' || scope === 'builder') { return; }

  // ---- nav models ----
  // account: [key,label,icon,href,activeFiles]
  var ACCOUNT_NAV = [
    ['home', '工作台', 'home', 'workspace.html', ['workspace.html', '']],
    ['mychars', '我的角色', 'mask', 'dashboard.html', ['dashboard.html', 'character.html', 'editor.html']],
    ['myprojects', '我的企劃', 'box', 'my-projects.html', ['my-projects.html']],
    ['mypages', '我的公開頁', 'window', 'public-pages.html', ['public-pages.html']],
    ['_label', '全域工具'],
    ['comms', '委託', 'star', 'commissions.html', ['commissions.html']],
    ['height', '身高比較', 'ruler', 'height-compare.html', ['height-compare.html']],
  ];
  // project: [key,label,icon,href,activeFiles,statKey,gate,feat]
  // gate: 'view' (all) | 'member' (not visitor) | 'manage' (viewManage cap)
  // feat: enabledFeatures key | 'portalEnabled' | 'submissionsEnabled' | 'collab' | null
  var PROJECT_NAV = [
    ['overview', '企劃總覽', 'grid', 'overview.html', ['overview.html'], null, 'view', null],
    ['chars', '企劃角色', 'mask', 'roster.html', ['roster.html'], 'chars', 'view', null],
    ['world', '世界觀', 'globe', 'worldview.html', ['worldview.html'], 'world', 'view', 'worldview'],
    ['rels', '關係圖', 'nodes', 'relationships.html', ['relationships.html'], 'rels', 'view', 'relationships'],
    ['story', '故事', 'book', 'story.html', ['story.html'], null, 'view', 'story'],
    ['gallery', '圖庫', 'image', 'gallery.html', ['gallery.html'], null, 'view', 'gallery'],
    ['inbox', '靈感匣', 'bulb', 'inspiration.html', ['inspiration.html'], 'ideas', 'member', 'inbox'],
    ['apps', '角色申請', 'check', 'submissions.html', ['submissions.html'], null, 'member', 'collab'],
    ['review', '作品投稿', 'image', 'content-submissions.html', ['content-submissions.html'], null, 'member', 'submissionsEnabled'],
    ['_label', '企劃管理'],
    ['portal', '公開頁', 'window', 'public-pages.html', ['public-pages.html', 'portal.html'], null, 'manage', 'portalEnabled'],
    ['tpl', '角色卡模板', 'layers', 'template-builder.html', ['template-builder.html'], null, 'manage', null],
    ['members', '參與者', 'users', 'participants.html', ['participants.html'], null, 'manage', 'collab'],
  ];
  function projItemVisible(it) {
    var gate = it[6], feat = it[7], p = proj();
    if (gate === 'member' && role === 'visitor') return false;
    if (gate === 'manage' && !can('viewManage')) return false;
    if (feat) {
      if (feat === 'portalEnabled') { if (!p.portalEnabled) return false; }
      else if (feat === 'submissionsEnabled') { if (!p.submissionsEnabled) return false; }
      else if (feat === 'collab') { if (p.collaborationMode === 'solo') return false; }
      else if (OD && !OD.hasFeature(cur, feat)) return false;
    }
    return true;
  }

  function navHTML() {
    var p = proj();
    if (scope === 'account') {
      return ACCOUNT_NAV.map(function (it) {
        if (it[0] === '_label') return '<div class="sb-label">' + it[1] + '</div>';
        var on = it[4].indexOf(file) >= 0 ? ' on' : '';
        return '<a class="sb-item' + on + '" href="' + it[3] + '">' + icon(it[2]) + it[1] + '</a>';
      }).join('');
    }
    // project scope
    var out = '';
    for (var i = 0; i < PROJECT_NAV.length; i++) {
      var it = PROJECT_NAV[i];
      if (it[0] === '_label') {
        // show 管理 label only if at least one following manage item is visible
        var any = false;
        for (var j = i + 1; j < PROJECT_NAV.length; j++) { if (PROJECT_NAV[j][0] !== '_label' && PROJECT_NAV[j][6] === 'manage' && projItemVisible(PROJECT_NAV[j])) { any = true; break; } }
        if (any) out += '<div class="sb-label">' + it[1] + '</div>';
        continue;
      }
      if (!projItemVisible(it)) continue;
      var on = it[4].indexOf(file) >= 0 ? ' on' : '';
      var href = it[3] === '__soon' ? '#' : it[3] + Q;
      var soon = it[3] === '__soon' ? ' data-soon="1"' : '';
      var ct = it[5] && p.stats && p.stats[it[5]] != null ? '<span class="ct">' + p.stats[it[5]] + '</span>' : '';
      out += '<a class="sb-item' + on + '" href="' + href + '"' + soon + '>' + icon(it[2]) + it[1] + ct + '</a>';
    }
    return out;
  }

  function menuHTML() {
    return PROJECTS.map(function (x) {
      return '<button class="pm' + (x.id === cur ? ' cur' : '') + '" data-p="' + x.id + '"><span class="pc" style="background:' + x.c + '"></span>' + x.name + '<span class="tick">✓</span></button>';
    }).join('') + '<button class="pm new" id="appPmNew"><span class="plus">＋</span>建立企劃</button>';
  }

  // quick-add menu items by scope/capability
  function quickItems() {
    if (scope === 'account') {
      return [['＋ 新角色', 'mask', '__newchar'], ['＋ 新企劃', 'box', '__newproj']];
    }
    var items = [];
    if (can('addCharacter')) items.push(['＋ 加入角色', 'mask', 'roster.html' + Q]);
    if (can('editWorld')) items.push(['＋ 世界觀條目', 'globe', 'worldview.html' + Q]);
    if (role !== 'visitor') items.push(['＋ 新靈感', 'bulb', '__soon']);
    return items;
  }
  function quickHTML() {
    var items = quickItems();
    if (!items.length) return '';
    return '<div class="quick-wrap"><button class="sb-quick" id="appQuick">' + icon('plus') + '<span style="flex:1;text-align:left">快速新增</span><span class="cv">▾</span></button>'
      + '<div class="quick-menu" id="appQuickMenu">' + items.map(function (a, i) {
        return '<button class="qm" data-href="' + a[2] + '">' + icon(a[1]) + a[0] + '</button>';
      }).join('') + '</div></div>';
  }

  var ROLE_SHORT = { owner: '主持', member: '參與', visitor: '預覽' };
  function roleHTML() {
    return '<div class="sb-role"><span class="rl">視角</span><div class="seg">'
      + ['owner', 'member', 'visitor'].map(function (r) { return '<button data-role="' + r + '"' + (r === role ? ' class="on"' : '') + '>' + ROLE_SHORT[r] + '</button>'; }).join('')
      + '</div><span class="demo-only">Demo</span></div>'
      + resetOnlyHTML();
  }
  function resetOnlyHTML() {
    return '<button class="sb-reset" id="appReset" title="清除本分頁的 Demo 操作，回到初始資料">' + icon('refresh') + '<span>重設 Demo 資料</span></button>';
  }

  var scopeHTML = '<div class="sb-scope"><button data-scope="account"' + (scope === 'account' ? ' class="on"' : '') + '>我的空間</button><button data-scope="project"' + (scope === 'project' ? ' class="on"' : '') + '>目前企劃</button></div>';

  var projSwitchHTML = scope === 'project'
    ? '<div class="proj-switch"><button class="proj-btn" id="appProjBtn"><span class="pc" style="background:' + proj().c + '"></span><span class="nm">' + proj().name + '</span><span class="cv">▼</span></button><div class="proj-menu" id="appProjMenu">' + menuHTML() + '</div></div>'
    : '<div class="proj-switch"><button class="proj-btn ghost" id="appProjBtn"><span class="pc" style="background:var(--text-faint)"></span><span class="nm" style="color:var(--text-faint)">進入企劃…</span><span class="cv">▼</span></button><div class="proj-menu" id="appProjMenu">' + menuHTML() + '</div></div>';

  var sb = document.createElement('aside');
  sb.className = 'appsb';
  sb.innerHTML =
    '<a class="sb-brand" href="workspace.html"><span class="mk">霧</span>CharacterHub</a>' +
    '<button class="sb-search" id="appSearch">' + icon('search') + '<span style="flex:1;text-align:left">搜尋…</span><span class="kbd">⌘K</span></button>' +
    scopeHTML +
    projSwitchHTML +
    '<div class="sb-nav">' + navHTML() + '</div>' +
    quickHTML() +
    '<div class="sb-spacer"></div>' +
    (scope === 'project' ? roleHTML() : resetOnlyHTML()) +
    '<a class="sb-item' + (file === 'settings.html' ? ' on' : '') + '" href="settings.html">' + icon('gear') + '設定</a>' +
    '<a class="sb-user" href="settings.html"><span class="av"></span><span><span class="un" style="display:block">' + (OD ? OD.viewer.name : 'Yoi Studio') + '</span><span class="uh">' + (OD ? OD.viewer.handle : '@yoi') + '</span></span></a>';

  // wrap existing body content into a scroller, then mount sidebar first
  var main = document.createElement('main');
  main.className = 'appmain';
  while (document.body.firstChild) main.appendChild(document.body.firstChild);
  document.body.appendChild(sb);
  document.body.appendChild(main);
  document.body.classList.add('has-shell');

  // mobile top bar
  var mtop = document.createElement('div');
  mtop.className = 'app-mtop';
  mtop.innerHTML = '<button class="burger" aria-label="選單"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button><span class="mt-brand"><span class="mk">霧</span>CharacterHub</span>';
  main.insertBefore(mtop, main.firstChild);
  var burger = mtop.querySelector('.burger');

  // Visitor = PUBLIC-PAGE PREVIEW, not a workspace visitor. Make that explicit:
  // a real visitor uses the Public Renderer (portal.html) with no sidebar.
  if (role === 'visitor') {
    document.body.classList.add('preview-mode');
    var pv = document.createElement('div');
    pv.className = 'preview-banner';
    pv.innerHTML = '<span class="pv-dot"></span><b>公開頁預覽</b>'
      + '<span class="pv-t">這是訪客在公開頁看到的內容。正式訪客走 Public Renderer，沒有工作台側欄、快速新增或管理。</span>'
      + '<a class="pv-link" href="portal.html' + Q + '">看公開頁 ↗</a>'
      + '<button class="pv-exit" type="button">結束預覽</button>';
    main.insertBefore(pv, mtop.nextSibling);
    pv.querySelector('.pv-exit').onclick = function () { if (OD) OD.setRole('owner'); location.reload(); };
  }

  var scrim = document.createElement('div'); scrim.className = 'app-scrim';
  document.body.appendChild(scrim);
  function closeDrawer() { sb.classList.remove('open'); scrim.classList.remove('open'); }
  burger.onclick = function () { sb.classList.toggle('open'); scrim.classList.toggle('open'); };
  scrim.onclick = closeDrawer;

  // scope switch
  sb.querySelectorAll('.sb-scope button').forEach(function (b) {
    b.onclick = function () {
      var s = b.dataset.scope;
      if (s === scope) return;
      location.href = s === 'account' ? 'workspace.html' : 'overview.html' + Q;
    };
  });

  // role switch (Demo) — reload to re-derive capability nav
  sb.querySelectorAll('.sb-role [data-role]').forEach(function (b) {
    b.onclick = function () { if (OD) OD.setRole(b.dataset.role); location.reload(); };
  });
  // reset demo session state (Phase 0)
  var rb = sb.querySelector('#appReset');
  if (rb) rb.onclick = function () {
    if (window.OCDemo) OCDemo.resetDemoData();
    if (window.OCUI && OCUI.toast) OCUI.toast('已重設 Demo 資料，回到初始狀態', { demo: true });
    setTimeout(function () { location.reload(); }, 300);
  };

  // soft links (coming soon)
  sb.querySelectorAll('[data-soon]').forEach(function (a) {
    a.onclick = function (e) { e.preventDefault(); if (window.toast) toast('這個功能在下一批設計中 · Coming soon'); closeDrawer(); };
  });

  // project switcher
  var btn = sb.querySelector('#appProjBtn'), menu = sb.querySelector('#appProjMenu');
  if (btn) {
    btn.onclick = function (e) { e.stopPropagation(); menu.classList.toggle('open'); };
    document.addEventListener('click', function () { menu.classList.remove('open'); });
    menu.querySelectorAll('.pm[data-p]').forEach(function (b) {
      b.onclick = function () {
        cur = b.dataset.p; set('ch:proj', cur);
        // account scope: picking a project enters its overview (does NOT
        // silently turn the current account page into project scope).
        if (scope === 'account') location.href = 'overview.html?project=' + cur;
        else location.search = '?project=' + cur;
      };
    });
    var pmNew = menu.querySelector('#appPmNew');
    if (pmNew) pmNew.onclick = function () { menu.classList.remove('open'); if (window.toast) toast('建立新企劃 · Demo interaction only'); };
  }

  // quick-add menu
  var qBtn = sb.querySelector('#appQuick'), qMenu = sb.querySelector('#appQuickMenu');
  if (qBtn) {
    qBtn.onclick = function (e) { e.stopPropagation(); qMenu.classList.toggle('open'); };
    document.addEventListener('click', function () { qMenu.classList.remove('open'); });
    qMenu.querySelectorAll('.qm').forEach(function (b) {
      b.onclick = function () {
        var h = b.dataset.href;
        if (h === '__soon') { if (window.toast) toast('這個功能在下一批設計中 · Coming soon'); }
        else if (h === '__newchar') {
          if (window.OCDemo) { var nc = OCDemo.createCharacter({}); location.href = 'editor.html?c=' + nc.id + '&new=1'; }
        }
        else if (h === '__newproj') {
          if (window.OCDemo) { var np = OCDemo.createProject({}); location.href = 'overview.html?project=' + np.id + '&new=1'; }
        }
        else { var sep = h.indexOf('?') >= 0 ? '&' : '?'; location.href = h; }
        qMenu.classList.remove('open');
      };
    });
  }

  // ============================================================
  // search palette + hover cards (unchanged engine)
  // ============================================================
  var CHARDB = {}; PROJECTS.forEach(function (p) {
    CHARDB[p.id] = OD ? OD.characters(p.id).map(function (e) { return { id: e.id, name: e.name, sub: e.sub, c: e.c, role: e.role, blurb: e.blurb }; }) : [];
  });
  var WORLDDB = {}; PROJECTS.forEach(function (p) {
    WORLDDB[p.id] = OD ? OD.worldview(p.id).map(function (e) { return { name: e.name, sub: (OD.typeLabel[e.type] || e.type), href: e.href || 'worldview.html' }; }) : [];
  });
  window.__CHARDB = CHARDB;

  var PAGES = [
    ['工作台', 'home', 'workspace.html'], ['我的角色', 'mask', 'dashboard.html'], ['我的企劃', 'box', 'my-projects.html'], ['我的公開頁', 'window', 'public-pages.html'],
    ['企劃總覽', 'grid', 'overview.html' + Q], ['企劃角色', 'mask', 'roster.html' + Q],
    ['世界觀', 'globe', 'worldview.html' + Q], ['故事', 'book', 'story.html' + Q], ['圖庫', 'image', 'gallery.html' + Q],
    ['關係圖', 'nodes', 'relationships.html' + Q], ['身高比較', 'ruler', 'height-compare.html'],
    ['委託', 'star', 'commissions.html'], ['設定', 'gear', 'settings.html'],
  ];
  var ACTIONS = [
    ['＋ 新角色', 'mask', 'editor.html' + Q], ['＋ 新世界觀條目', 'globe', 'worldview.html' + Q],
  ];
  function indexItems() {
    var out = [];
    (CHARDB[cur] || []).forEach(function (c) { out.push({ g: '角色', label: c.name, sub: c.sub, av: c.name[0], color: c.c, href: 'character.html' + Q, hc: c.id }); });
    (WORLDDB[cur] || []).forEach(function (w) { out.push({ g: '世界觀', label: w.name, sub: w.sub, icon: 'globe', href: w.href + (w.href.indexOf('?') >= 0 ? '&' : '?') + 'project=' + cur }); });
    PAGES.forEach(function (p) { out.push({ g: '前往', label: p[0], sub: '頁面', icon: p[1], href: p[2] }); });
    ACTIONS.forEach(function (a) { out.push({ g: '動作', label: a[0], sub: '建立', icon: a[1], href: a[2] }); });
    return out;
  }
  function recents() { try { return JSON.parse(get('ch:recent') || '[]'); } catch (e) { return []; } }
  function pushRecent(it) { if (!it) return; var arr = recents().filter(function (x) { return x.label !== it.label; }); arr.unshift(it); set('ch:recent', JSON.stringify(arr.slice(0, 6))); }
  function favs() { try { return JSON.parse(get('ch:fav') || '[]'); } catch (e) { return []; } }
  function isFav(l) { return favs().some(function (x) { return x.label === l; }); }
  function toggleFav(it) { var arr = favs(); var i = arr.map(function (x) { return x.label; }).indexOf(it.label); if (i >= 0) arr.splice(i, 1); else arr.unshift({ g: '收藏', label: it.label, sub: it.sub, icon: it.icon, av: it.av, color: it.color, href: it.href }); set('ch:fav', JSON.stringify(arr.slice(0, 12))); }
  (function () { var here = PAGES.filter(function (p) { return p[2].split('?')[0] === file; })[0]; if (here && file !== 'workspace.html') pushRecent({ g: '最近', label: here[0], sub: proj().name, icon: here[1], href: here[2] }); })();

  var pal = document.createElement('div'); pal.className = 'cmdk';
  pal.innerHTML = '<div class="box"><div class="field">' + icon('search') + '<input id="cmdkInput" placeholder="搜尋角色、世界觀，或前往…" autocomplete="off"><span class="esc">esc</span></div><div class="results" id="cmdkResults"></div></div>';
  document.body.appendChild(pal);
  var input = pal.querySelector('#cmdkInput'), results = pal.querySelector('#cmdkResults');
  var ALL = indexItems(), filtered = [], selIdx = 0;
  function rowHTML(it, i) {
    var lead = it.av != null ? '<span class="av round" style="background:' + (it.color || '#999') + '">' + it.av + '</span>' : '<span class="ico">' + icon(it.icon || 'grid') + '</span>';
    var star = '<button class="fav' + (isFav(it.label) ? ' on' : '') + '" data-fav="' + i + '" title="收藏">' + (isFav(it.label) ? '★' : '☆') + '</button>';
    return '<div class="row' + (i === selIdx ? ' sel' : '') + '" data-i="' + i + '">' + lead + '<span class="tx"><span class="lb">' + it.label + '</span><span class="sub">' + (it.sub || '') + '</span></span>' + star + '<span class="go">↵</span></div>';
  }
  function draw() {
    var q = input.value.trim().toLowerCase();
    if (!q) {
      var fv = favs(), rec = recents();
      if (fv.length || rec.length) {
        filtered = fv.concat(rec); if (selIdx < 0) selIdx = 0; selIdx = Math.min(selIdx, filtered.length - 1);
        var html0 = ''; if (fv.length) { html0 += '<div class="grp">收藏</div>'; fv.forEach(function (it, i) { html0 += rowHTML(it, i); }); }
        if (rec.length) { html0 += '<div class="grp">最近</div>'; rec.forEach(function (it, i) { html0 += rowHTML(it, fv.length + i); }); }
        results.innerHTML = html0;
      } else { filtered = ALL.filter(function (x) { return x.g === '前往'; }).slice(0, 6); results.innerHTML = '<div class="grp">前往</div>' + filtered.map(rowHTML).join(''); }
    } else {
      filtered = ALL.filter(function (x) { return (x.label + ' ' + (x.sub || '')).toLowerCase().indexOf(q) >= 0; });
      if (selIdx >= filtered.length) selIdx = 0;
      if (!filtered.length) { results.innerHTML = '<div class="none">找不到「' + input.value + '」</div>'; return; }
      var html = '', lastG = null; filtered.forEach(function (it, i) { if (it.g !== lastG) { html += '<div class="grp">' + it.g + '</div>'; lastG = it.g; } html += rowHTML(it, i); });
      results.innerHTML = html;
    }
    results.querySelectorAll('.row').forEach(function (r) {
      r.onmouseenter = function () { selIdx = +r.dataset.i; paintSel(); };
      r.onclick = function (e) { if (e.target.closest('.fav')) return; go(filtered[+r.dataset.i]); };
    });
    results.querySelectorAll('.fav').forEach(function (b) { b.onclick = function (e) { e.stopPropagation(); toggleFav(filtered[+b.dataset.fav]); draw(); }; });
  }
  function paintSel() { results.querySelectorAll('.row').forEach(function (r) { r.classList.toggle('sel', +r.dataset.i === selIdx); }); }
  function go(it) { if (!it) return; pushRecent({ g: '最近', label: it.label, sub: it.sub, icon: it.icon, av: it.av, color: it.color, href: it.href }); location.href = it.href; }
  function openPal() { pal.classList.add('open'); input.value = ''; selIdx = 0; draw(); setTimeout(function () { input.focus(); }, 20); }
  function closePal() { pal.classList.remove('open'); }
  input.addEventListener('input', function () { selIdx = 0; draw(); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); selIdx = Math.min(selIdx + 1, filtered.length - 1); paintSel(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); selIdx = Math.max(selIdx - 1, 0); paintSel(); }
    else if (e.key === 'Enter') { e.preventDefault(); go(filtered[selIdx]); }
    else if (e.key === 'Escape') { closePal(); }
  });
  pal.addEventListener('click', function (e) { if (e.target === pal) closePal(); });
  sb.querySelector('#appSearch').onclick = openPal;
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); pal.classList.contains('open') ? closePal() : openPal(); }
    else if (e.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName) && !pal.classList.contains('open')) { e.preventDefault(); openPal(); }
  });

  // hover cards
  var hc = document.createElement('div'); hc.className = 'hcard'; document.body.appendChild(hc);
  var hcTimer = null;
  function charById(id) { for (var k in CHARDB) { var f = (CHARDB[k] || []).filter(function (c) { return c.id === id; })[0]; if (f) return f; } return null; }
  function showHC(elm) {
    var c = charById(elm.getAttribute('data-hc-id')); if (!c) return;
    hc.innerHTML = '<div class="hh"><span class="av" style="background:' + c.c + '">' + c.name[0] + '</span><span><span class="nm" style="display:block">' + c.name + '</span><span class="ro">' + (c.role || '') + '</span></span></div><div class="hb">' + (c.blurb || '') + '</div>';
    var r = elm.getBoundingClientRect(); var top = r.bottom + 8, left = Math.min(r.left, window.innerWidth - 252);
    if (top + 140 > window.innerHeight) top = r.top - 148;
    hc.style.top = top + 'px'; hc.style.left = Math.max(8, left) + 'px'; hc.classList.add('show');
  }
  document.addEventListener('mouseover', function (e) { var elm = e.target.closest && e.target.closest('[data-hc-id]'); if (!elm) return; clearTimeout(hcTimer); hcTimer = setTimeout(function () { showHC(elm); }, 280); });
  document.addEventListener('mouseout', function (e) { var elm = e.target.closest && e.target.closest('[data-hc-id]'); if (!elm) return; clearTimeout(hcTimer); hc.classList.remove('show'); });

  // expose a tiny shell API for pages
  window.OCShell = { project: cur, scope: scope, role: role, Q: Q };
})();
