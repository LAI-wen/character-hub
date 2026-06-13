/* ============================================================
   CharacterHub — Slice 2 shared components (character + editor)
   Vanilla helpers shared by character.html & editor.html so the two
   pages use ONE visual system. Builds on OCUI (components.js).
   All "save" is Demo interaction only.
   ============================================================ */
(function () {
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  var VIS_LABEL = { public: '公開', members: '僅成員', host: '僅主持人', private: '私密', link: '限連結' };

  // FieldVisibilityBadge
  function visBadge(kind, label) { return '<span class="vis-b ' + kind + '"><span class="d"></span>' + (label || VIS_LABEL[kind] || kind) + '</span>'; }

  // CompletionIndicator
  function completion(pct) {
    return '<span class="compl' + (pct < 50 ? ' low' : '') + '"><span class="bar"><i style="width:' + pct + '%"></i></span><span class="pct">' + pct + '%</span></span>';
  }

  // OwnerNotice — host/member viewing someone else's character body
  function ownerNotice(ownerSummary, charId) {
    return '<div class="owner-notice"><span class="lock">' + OCIcon('lock') + '</span><div>角色本體由 <b>' + ownerSummary.label + '</b> 維護，你不能修改名稱／外觀／圖文設定。</div>'
      + '<a href="character.html?c=' + charId + '">查看角色 →</a></div>';
  }

  // CharacterHeader (shared). cfg: { full, onEdit, onShare, canEditBody }
  function characterHeader(cfg) {
    var c = cfg.full, os = c.ownerSummary;
    var visK = c.visibility === 'public' ? 'public' : c.visibility === 'private' ? 'private' : 'members';
    var ownerLine = os.mine ? '' : '<span class="owner-line">由 <span class="who">' + os.label + '</span> 擁有</span>';
    var joined = c.links.length;
    var meta = [
      visBadge(visK, c.visibility === 'public' ? '公開' : c.visibility === 'private' ? '私人' : '僅成員'),
      '<span class="badge">' + (joined ? '加入 ' + joined + ' 個企劃' : '未加入企劃') + '</span>',
      c.detail.updatedAt ? '<span class="badge">更新 ' + c.detail.updatedAt + '</span>' : '',
      ownerLine,
    ].filter(Boolean).join('');
    var acts = '';
    if (cfg.onEdit && cfg.canEditBody) acts += '<button class="btn" id="chEdit">✎ 編輯角色</button>';
    if (cfg.onShare) acts += '<button class="btn btn-accent" id="chShare">↗ 分享</button>';
    var wrap = el('div', 'ch-head',
      '<span class="av" style="background:' + c.c + '">' + c.name[0] + '</span>'
      + '<div class="id"><h1>' + c.name + (c.rom ? ' <span class="rom">' + c.rom + '</span>' : '') + '</h1>'
      + '<div class="tagline">' + (c.detail.general.tagline || c.blurb || '') + '</div>'
      + '<div class="meta">' + meta + '</div></div>'
      + (acts ? '<div class="acts">' + acts + '</div>' : ''));
    if (cfg.onEdit && cfg.canEditBody) { var e = wrap.querySelector('#chEdit'); if (e) e.onclick = cfg.onEdit; }
    if (cfg.onShare) { var s = wrap.querySelector('#chShare'); if (s) s.onclick = cfg.onShare; }
    return wrap;
  }

  // CharacterTabs
  function tabs(items, active, onChange) {
    var wrap = el('div', 'tabs');
    items.forEach(function (it) {
      var b = el('button', 'tab' + (it.id === active ? ' on' : ''), it.label + (it.ct != null ? ' <span class="ct">' + it.ct + '</span>' : ''));
      b.onclick = function () { onChange(it.id); };
      wrap.appendChild(b);
    });
    return wrap;
  }

  // ShareDrawer — Demo. cfg: { full }
  function shareDrawer(cfg) {
    var c = cfg.full;
    var scopes = OCData.shareScopes();
    var sel = 'general';
    // (1) explicit share scope for project data: null = none, or a single linkId.
    // Never default to "all project data".
    var opts = { visibility: 'link', showOwner: true, projectCharacterLinkId: null };
    // only approved/public-or-shareable links are even offered (private-project
    // links require explicit share authorization → here shown but flagged).
    var shareableLinks = c.links.filter(function (l) { return l.status === 'approved'; });
    var scrim = el('div', 'drawer-scrim');
    var dr = el('aside', 'drawer');
    dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-modal', 'true'); dr.setAttribute('aria-label', '分享角色');
    function close() { dr.classList.remove('in'); scrim.classList.remove('in'); document.removeEventListener('keydown', onKey); setTimeout(function () { scrim.remove(); dr.remove(); }, 240); if (lastFocus && lastFocus.focus) lastFocus.focus(); }

    function body() {
      var sc = scopes.filter(function (x) { return x.id === sel; })[0];
      var visPick = [['public', '公開'], ['link', '限連結'], ['private', '私密']].map(function (v) {
        return '<button class="fbtn' + (opts.visibility === v[0] ? ' on' : '') + '" data-vis="' + v[0] + '">' + v[1] + '</button>';
      }).join('');
      // project-version chooser: 不包含 + 每個可分享 link
      var pv = '<button class="fbtn' + (opts.projectCharacterLinkId === null ? ' on' : '') + '" data-pl="">不包含企劃限定資料</button>'
        + shareableLinks.map(function (l) {
          var priv = OCData.project(l.project) && OCData.project(l.project).visibility === 'private';
          return '<button class="fbtn' + (opts.projectCharacterLinkId === l.id ? ' on' : '') + '" data-pl="' + l.id + '"><span class="dot" style="background:' + l.projectColor + '"></span>' + l.projectName + (priv ? ' 🔒' : '') + '</button>';
        }).join('');
      var chosen = opts.projectCharacterLinkId ? shareableLinks.filter(function (l) { return l.id === opts.projectCharacterLinkId; })[0] : null;
      var chosenPriv = chosen && OCData.project(chosen.project) && OCData.project(chosen.project).visibility === 'private';
      return '<div class="lbl" style="margin-bottom:8px">分享類型</div>'
        + '<div class="share-types">' + scopes.map(function (s) { return '<button class="share-type' + (s.id === sel ? ' on' : '') + '" data-sc="' + s.id + '"><div class="n">' + s.name + '</div><div class="d">' + s.desc + '</div></button>'; }).join('') + '</div>'
        + '<div class="lbl" style="margin-bottom:8px">連結可見性</div><div class="filterbar" style="margin-bottom:var(--s4)">' + visPick + '</div>'
        + '<div class="lbl" style="margin-bottom:8px">企劃限定資料 <span style="text-transform:none;letter-spacing:0;color:var(--text-faint)">（一次只能選一個企劃版本）</span></div>'
        + '<div class="filterbar" style="margin-bottom:var(--s2)">' + pv + '</div>'
        + (chosenPriv ? '<div style="font-size:11.5px;color:var(--accent-ink);margin-bottom:var(--s3)">' + OCIcon('lock') + ' 這是私人企劃，分享前需符合企劃可見性或取得明確分享授權。</div>' : '')
        + '<div class="share-opt"><span class="lbl2">顯示分頁</span><span style="font-size:12px;color:var(--text-dim)">' + sc.tabs.join('、') + '</span></div>'
        + '<div class="share-opt"><span class="lbl2">顯示擁有者</span><span class="toggle' + (opts.showOwner ? ' on' : '') + '" data-t="showOwner" role="switch" tabindex="0" aria-checked="' + opts.showOwner + '"><i></i></span></div>'
        + '<div class="share-preview"><div class="pv-tag">' + OCIcon('eye') + ' Share Preview · Demo interaction only</div>'
        + '<div style="font-weight:700;font-family:var(--font-serif);font-size:17px">' + c.name + '</div>'
        + '<div style="font-size:13px;color:var(--text-dim);margin:4px 0 8px">' + (c.detail.general.tagline || '') + '</div>'
        + '<div style="font-size:12px;color:var(--text-faint)">顯示：' + sc.tabs.join('、') + (opts.showOwner ? ' · 擁有者' : '') + ' · ' + (chosen ? chosen.projectName + ' 版本' : '無企劃限定資料') + '</div>'
        + '<div style="font-size:11.5px;color:var(--must);margin-top:8px">✓ 永不分享：私人筆記、主持人限定欄位、審核紀錄、未授權的企劃資料</div></div>';
    }
    function paint() { dr.querySelector('.db').innerHTML = body(); wire(); }
    function wire() {
      dr.querySelectorAll('[data-sc]').forEach(function (b) { b.onclick = function () { sel = b.dataset.sc; paint(); }; });
      dr.querySelectorAll('[data-vis]').forEach(function (b) { b.onclick = function () { opts.visibility = b.dataset.vis; paint(); }; });
      dr.querySelectorAll('[data-pl]').forEach(function (b) { b.onclick = function () { opts.projectCharacterLinkId = b.dataset.pl || null; paint(); }; });
      dr.querySelectorAll('[data-t]').forEach(function (b) { var fn = function () { opts[b.dataset.t] = !opts[b.dataset.t]; paint(); }; b.onclick = fn; b.onkeydown = function (e) { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); fn(); } }; });
    }
    dr.innerHTML = '<div class="dh"><div class="t">分享角色</div><button class="x" aria-label="關閉">✕</button></div><div class="db"></div>'
      + '<div class="df"><span class="demo-only">Demo</span><span class="spacer" style="flex:1"></span><button class="btn" data-act="copy">複製連結</button><button class="btn btn-accent" data-act="done">完成</button></div>';
    dr.querySelector('.db').innerHTML = body();
    dr.querySelector('.x').onclick = close;
    dr.querySelector('[data-act="copy"]').onclick = function () { OCUI.toast('已複製分享連結', { demo: true }); };
    dr.querySelector('[data-act="done"]').onclick = close;
    scrim.onclick = close;
    var lastFocus = document.activeElement;
    document.body.appendChild(scrim); document.body.appendChild(dr);
    wire();
    requestAnimationFrame(function () { scrim.classList.add('in'); dr.classList.add('in'); var f = dr.querySelector('.share-type, .x'); if (f) f.focus(); });
    // focus trap + Esc
    var onKey = function (e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var foc = dr.querySelectorAll('button, [tabindex], input, select, textarea, a[href]');
      foc = Array.prototype.filter.call(foc, function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!foc.length) return;
      var first = foc[0], last = foc[foc.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
  }

  // ProjectVersionSwitcher. cfg: { links, current, onChange, guardDirty }
  function versionSwitcher(cfg) {
    var wrap = el('div', 'pvs');
    function cur() { return cfg.links.filter(function (l) { return l.project === cfg.current; })[0]; }
    function label() { var c = cur(); return c ? c.projectName : '選擇企劃'; }
    function color() { var c = cur(); return c ? c.projectColor : '#8A857C'; }
    function render() {
      wrap.innerHTML = '<button class="btn2"><span class="pc" style="background:' + color() + '"></span><span>' + label() + '</span><span class="cv">▼</span></button>'
        + '<div class="menu">' + (cfg.links.length ? cfg.links.map(function (l) {
          var stat = l.status === 'approved' ? '<span class="badge approved st">已通過</span>' : l.status === 'pending' ? '<span class="badge pending st">待審</span>' : '<span class="badge draft st">封存</span>';
          return '<button class="mi' + (l.project === cfg.current ? ' cur' : '') + '" data-p="' + l.project + '"><span class="pc" style="background:' + l.projectColor + '"></span>' + l.projectName + stat + '</button>';
        }).join('') : '<div class="none">尚未加入任何企劃</div>') + '</div>';
      var btn = wrap.querySelector('.btn2'), menu = wrap.querySelector('.menu');
      btn.onclick = function (e) { e.stopPropagation(); menu.classList.toggle('open'); };
      document.addEventListener('click', function () { menu.classList.remove('open'); });
      menu.querySelectorAll('[data-p]').forEach(function (b) {
        b.onclick = function () {
          menu.classList.remove('open');
          var to = b.dataset.p; if (to === cfg.current) return;
          if (cfg.guardDirty && cfg.guardDirty()) {
            var from = cfg.current;
            unsavedDialog({ context: 'switch',
              onSave: function () { if (cfg.onSaveSwitch) cfg.onSaveSwitch(); cfg.current = to; cfg.onChange(to); render(); },
              onDiscard: function () { if (cfg.onDiscardCurrent) cfg.onDiscardCurrent(from); cfg.current = to; cfg.onChange(to); render(); } });
          } else { cfg.current = to; cfg.onChange(to); render(); }
        };
      });
    }
    render();
    wrap.setCurrent = function (p) { cfg.current = p; render(); };
    return wrap;
  }

  // SaveStatus
  function saveStatus() {
    var node = el('span', 'savest saved', '<span class="d"></span>已儲存');
    node.set = function (state) {
      var map = { clean: ['saved', '已儲存'], dirty: ['dirty', '尚未儲存'], saving: ['saving', '儲存中…'], saved: ['saved', '已儲存'], error: ['error', '儲存失敗'] };
      var m = map[state] || map.clean;
      node.className = 'savest ' + m[0];
      node.innerHTML = '<span class="d"></span>' + m[1];
    };
    return node;
  }

  // UnsavedChangesDialog. cfg: { context:'switch'|'leave'|'reset', onSave, onDiscard }
  function unsavedDialog(cfg) {
    var isSwitch = cfg.context === 'switch';
    var msg = isSwitch ? '目前企劃版本還有未儲存的修改。'
      : cfg.context === 'reset' ? '確定要重設這個區段的欄位嗎？未儲存的修改會消失。'
      : '你有未儲存的修改，確定要離開嗎？';
    var actions = cfg.context === 'reset'
      ? [{ label: '取消' }, { label: '重設', kind: 'danger', onClick: function () { cfg.onDiscard && cfg.onDiscard(); } }]
      : [{ label: '取消' },
         { label: '放棄修改', kind: 'danger', onClick: function () { cfg.onDiscard && cfg.onDiscard(); } },
         { label: isSwitch ? '儲存後切換' : '儲存後離開', kind: 'primary', onClick: function () { cfg.onSave && cfg.onSave(); } }];
    return OCUI.modal({ title: cfg.context === 'reset' ? '重設欄位' : '未儲存的修改', body: '<p style="margin:0">' + msg + '</p>', actions: actions });
  }

  window.OCChar = {
    visBadge: visBadge, completion: completion, ownerNotice: ownerNotice,
    characterHeader: characterHeader, tabs: tabs, shareDrawer: shareDrawer,
    versionSwitcher: versionSwitcher, saveStatus: saveStatus, unsavedDialog: unsavedDialog,
  };
})();
