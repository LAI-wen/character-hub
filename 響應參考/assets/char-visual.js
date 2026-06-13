/* ============================================================
   CharacterHub — Character Visual Workspace (Phase 1A prerequisite)
   One integrated 圖設定 workspace: 視覺總覽 / 主要圖片槽位 / 相簿 /
   圖片標記 / 色票 / 繪師參考 — NOT separate pages, NOT one long form.
   Data lives under OCData.details[cid].art.visual and persists via
   OCDemo (sessionStorage). Reuses Asset / AssetLink / collection
   mental model; naming avoids hard-coding Character so the same
   AssetCollection / Annotation idea extends to WorldEntry/Relationship.
   Demo interaction only — no real upload / R2 / second media model.
   ============================================================ */
(function () {
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  var ic = function (n) { return window.OCIcon ? OCIcon(n) : ''; };

  // semantic image slots (role → human label). UI never shows raw ids/paths.
  var SLOTS = [
    ['avatar', '頭像'], ['hero', '主視覺'], ['fullbody', '全身立繪'],
    ['halfbody', '半身立繪'], ['cover', '角色封面'], ['commission_primary_reference', '委託主要參考'],
  ];
  var ALBUM_PRESETS = ['立繪', '服裝', '表情', '配件', '設定參考', '委託成品', '塗鴉'];
  var ANNO_CATS = [
    ['must', '必畫重點'], ['avoid', '不可畫錯'], ['accessory', '配件'], ['material', '材質'],
    ['color', '顏色'], ['optional', '可省略'], ['commission', '委託備註'], ['custom', '自訂'],
  ];
  function annoCatLabel(c) { var f = ANNO_CATS.filter(function (x) { return x[0] === c; })[0]; return f ? f[1] : c; }

  // ---- model access (stored on detail.art.visual; demo image pool per char) ----
  function ensure(d, cid) {
    d.art = d.art || {};
    var v = d.art.visual || (d.art.visual = {});
    v.slots = v.slots || {};
    v.albums = v.albums || [];
    v.annotations = v.annotations || [];
    // demo image pool: placeholder colored tiles the user "uploads"/picks
    if (!v.images) {
      var c = (window.OCData && OCData.entity(cid) || {}).c || '#8A857C';
      v.images = [
        { id: cid + '-img1', label: '立繪 · 正面', c: c, vis: 'public' },
        { id: cid + '-img2', label: '立繪 · 背面', c: c, vis: 'public' },
        { id: cid + '-img3', label: '表情集', c: c, vis: 'members' },
      ];
      // seed avatar/hero/fullbody so 視覺總覽 isn't empty
      v.slots.avatar = v.slots.avatar || v.images[0].id;
      v.slots.hero = v.slots.hero || v.images[0].id;
      v.slots.fullbody = v.slots.fullbody || v.images[0].id;
    }
    return v;
  }
  function img(v, id) { return v.images.filter(function (x) { return x.id === id; })[0] || null; }

  // ---- render the integrated workspace into a host element ----
  // opts: { cid, detail (M), canEdit, onChange(), inProject, projectId }
  function renderWorkspace(host, opts) {
    var cid = opts.cid, d = opts.detail, canEdit = opts.canEdit !== false;
    var v = ensure(d, cid);
    var sub = host.__visSub || 'overview';
    function go(s) { host.__visSub = s; renderWorkspace(host, opts); }
    function changed() { if (opts.onChange) opts.onChange(); }

    host.innerHTML = '';
    // sub-tabs for the visual workspace
    var tabs = el('div', 'vw-tabs');
    [['overview', '視覺總覽', 'grid'], ['slots', '主要圖片', 'image'], ['albums', '相簿', 'layers'], ['annos', '圖片標記', 'tag'], ['palette', '色票', 'palette'], ['refs', '繪師／委託參考', 'book']].forEach(function (t) {
      var b = el('button', 'vw-tab' + (sub === t[0] ? ' on' : ''), ic(t[2]) + t[1]);
      b.onclick = function () { go(t[0]); };
      tabs.appendChild(b);
    });
    host.appendChild(tabs);
    var body = el('div', 'vw-body'); host.appendChild(body);

    if (sub === 'overview') renderOverview(body, v, go, canEdit);
    else if (sub === 'slots') renderSlots(body, v, canEdit, changed);
    else if (sub === 'albums') renderAlbums(body, v, canEdit, changed, opts);
    else if (sub === 'annos') renderAnnos(body, v, canEdit, changed);
    else if (sub === 'palette') renderPalette(body, d, v, canEdit, changed);
    else if (sub === 'refs') renderRefs(body, d, v);
  }

  // 視覺總覽: completion of each visual facet + CTA to the right sub-tab
  function renderOverview(body, v, go, canEdit) {
    var rows = SLOTS.map(function (s) { return [s[1], !!v.slots[s[0]], 'slots', '上傳／選圖']; });
    rows.push(['色票', (v.paletteCount || 0) > 0 || true, 'palette', '建立色票']);
    rows.push(['必畫重點', v.annotations.some(function (a) { return a.category === 'must'; }), 'annos', '新增標記']);
    rows.push(['不可畫錯', v.annotations.some(function (a) { return a.category === 'avoid'; }), 'annos', '新增標記']);
    rows.push(['相簿', v.albums.length > 0, 'albums', '建立相簿']);
    body.appendChild(el('p', 'vw-intro', '一眼看角色的視覺資料齊不齊。缺的項目點右邊就能補。'));
    var grid = el('div', 'vw-overview');
    rows.forEach(function (r) {
      var card = el('div', 'vw-ovcard' + (r[1] ? ' done' : ''));
      card.innerHTML = '<div class="t">' + r[0] + '</div><div class="s">' + (r[1] ? ic('check') + ' 已設定' : '尚未設定') + '</div>';
      if (!r[1] && canEdit) { var b = el('button', 'vw-ovcta', '＋ ' + r[3]); b.onclick = function () { go(r[2]); }; card.appendChild(b); }
      grid.appendChild(card);
    });
    body.appendChild(grid);
  }

  // 主要圖片槽位
  function renderSlots(body, v, canEdit, changed) {
    body.appendChild(el('p', 'vw-intro', '把圖片指定到語意用途（更換用途只改 AssetLink，不刪圖；同一張圖可同時是多個用途）。'));
    var grid = el('div', 'vw-slots');
    SLOTS.forEach(function (s) {
      var im = img(v, v.slots[s[0]]);
      var cell = el('div', 'vw-slot');
      var thumb = el('div', 'vw-thumb' + (im ? '' : ' empty'));
      if (im) { thumb.style.background = im.c; thumb.innerHTML = '<span class="lb">' + im.label + '</span>'; }
      else thumb.innerHTML = '<span class="ph2">' + ic('image') + '</span>';
      cell.appendChild(thumb);
      cell.appendChild(el('div', 'vw-slotname', s[1]));
      if (canEdit) {
        var acts = el('div', 'vw-slotacts');
        var pick = el('button', 'btn btn-sm', im ? '更換' : '指定圖片');
        pick.onclick = function () { pickImage(v, function (id) { v.slots[s[0]] = id; changed(); renderSlots(body, v, canEdit, changed); }); };
        acts.appendChild(pick);
        if (im) { var rm = el('button', 'btn btn-sm', '移除用途'); rm.onclick = function () { delete v.slots[s[0]]; changed(); renderSlots(body, v, canEdit, changed); }; acts.appendChild(rm); }
        cell.appendChild(acts);
      }
      grid.appendChild(cell);
    });
    body.appendChild(grid);
    // character image pool
    body.appendChild(el('div', 'vw-subh', '角色圖片 · ' + v.images.length));
    var pool = el('div', 'vw-pool');
    v.images.forEach(function (im) {
      var t = el('div', 'vw-poolimg'); t.style.background = im.c;
      t.innerHTML = '<span class="lb">' + im.label + '</span><span class="vis">' + (im.vis === 'public' ? '公開' : im.vis === 'members' ? '僅成員' : '私人') + '</span>';
      pool.appendChild(t);
    });
    if (canEdit) { var up = el('button', 'vw-poolup', ic('image') + ' 上傳圖片（Demo）'); up.onclick = function () { var n = v.images.length + 1; v.images.push({ id: 'img-' + Math.random().toString(36).slice(2, 6), label: '新圖片 ' + n, c: '#8FA3B0', vis: 'public' }); changed(); renderSlots(body, v, canEdit, changed); }; pool.appendChild(up); }
    body.appendChild(pool);
  }

  // a tiny picker modal over the character image pool
  function pickImage(v, cb) {
    var wrap = el('div'); wrap.className = 'vw-pickgrid';
    v.images.forEach(function (im) { var t = el('button', 'vw-pickimg'); t.style.background = im.c; t.innerHTML = '<span class="lb">' + im.label + '</span>'; t.onclick = function () { cb(im.id); modalClose(); }; wrap.appendChild(t); });
    var m = OCUI.modal({ title: '從角色圖片選擇', body: wrap, actions: [{ label: '取消' }] });
    function modalClose() { m.close(); }
  }

  // 相簿
  function renderAlbums(body, v, canEdit, changed, opts) {
    body.appendChild(el('p', 'vw-intro', '預設與自訂相簿。移除圖片只解除收錄，不刪原圖。相簿可關聯企劃（不轉移擁有權）。'));
    if (canEdit) {
      var add = el('div', 'vw-addalbum');
      add.innerHTML = '<span class="lbl2">＋ 預設相簿</span>';
      ALBUM_PRESETS.forEach(function (nm) { if (v.albums.some(function (a) { return a.name === nm; })) return; var b = el('button', null, nm); b.onclick = function () { v.albums.push(newAlbum(nm)); changed(); renderAlbums(body, v, canEdit, changed, opts); }; add.appendChild(b); });
      var cu = el('button', 'cu', ic('plus') + ' 自訂相簿'); cu.onclick = function () {
        function add2(nm) { v.albums.push(newAlbum(nm || '自訂相簿')); changed(); renderAlbums(body, v, canEdit, changed, opts); }
        if (window.OCForm && OCForm.nameDialog) OCForm.nameDialog({ title: '新增自訂相簿', placeholder: '相簿名稱（例：冬季制服、常夜國版本）', confirmLabel: '建立', onConfirm: add2 });
        else { var bd = el('div', null, '<div class="field"><label>相簿名稱</label><input class="input" id="vw-albnm" placeholder="例：冬季制服、常夜國版本"></div>'); OCUI.modal({ title: '新增自訂相簿', body: bd, actions: [{ label: '取消' }, { label: '建立', kind: 'accent', onClick: function () { add2(bd.querySelector('#vw-albnm').value.trim()); } }] }); }
      }; add.appendChild(cu);
      body.appendChild(add);
    }
    if (!v.albums.length) { body.appendChild(el('div', 'vw-empty', '還沒有相簿。')); return; }
    var list = el('div', 'vw-albums');
    v.albums.forEach(function (al) {
      var card = el('div', 'vw-album');
      var proj = (al.projects || []).map(function (pid) { var p = OCData.project(pid); return p ? p.name : pid; });
      card.innerHTML = '<div class="ah"><span class="nm">' + al.name + '</span><span class="ct">' + (al.assetIds || []).length + ' 張</span></div>'
        + '<div class="am">' + (al.visibility === 'public' ? '公開' : al.visibility === 'members' ? '僅成員' : '私人') + (proj.length ? ' · 關聯：' + proj.join('、') : '') + '</div>';
      if (canEdit) {
        var acts = el('div', 'vw-albumacts');
        var addImg = el('button', 'btn btn-sm', '加入圖片'); addImg.onclick = function () { pickImage(v, function (id) { al.assetIds = al.assetIds || []; if (al.assetIds.indexOf(id) < 0) al.assetIds.push(id); changed(); renderAlbums(body, v, canEdit, changed, opts); }); };
        var link = el('button', 'btn btn-sm', (al.projects || []).length ? '關聯企劃 ✓' : '關聯企劃'); link.onclick = function () { linkAlbumProject(al, changed, function () { renderAlbums(body, v, canEdit, changed, opts); }); };
        var del = el('button', 'btn btn-sm', '刪除相簿'); del.onclick = function () { OCUI.confirm({ title: '刪除相簿？', message: '只刪除相簿，原始圖片仍保留在角色圖片。', confirmLabel: '刪除', danger: true, onConfirm: function () { v.albums = v.albums.filter(function (x) { return x !== al; }); changed(); renderAlbums(body, v, canEdit, changed, opts); } }); };
        acts.appendChild(addImg); acts.appendChild(link); acts.appendChild(del);
        card.appendChild(acts);
      }
      list.appendChild(card);
    });
    body.appendChild(list);
  }
  function newAlbum(nm) { return { id: 'al-' + Math.random().toString(36).slice(2, 6), name: nm, desc: '', cover: null, visibility: 'public', assetIds: [], projects: [] }; }
  function linkAlbumProject(al, changed, redraw) {
    var wrap = el('div');
    OCData.projects.filter(function (p) { return p.status !== 'archived'; }).forEach(function (p) {
      var on = (al.projects || []).indexOf(p.id) >= 0;
      var row = el('label', 'vw-projrow', '<span class="d" style="background:' + p.c + '"></span>' + p.name);
      var cb = el('input'); cb.type = 'checkbox'; cb.checked = on; cb.onchange = function () { al.projects = al.projects || []; if (cb.checked) { if (al.projects.indexOf(p.id) < 0) al.projects.push(p.id); } else al.projects = al.projects.filter(function (x) { return x !== p.id; }); changed(); }; row.insertBefore(cb, row.firstChild); wrap.appendChild(row);
    });
    wrap.appendChild(el('p', null, '<span style="font-size:11.5px;color:var(--text-faint)">關聯企劃不轉移相簿或圖片擁有權；主持人可收錄／排序／停止收錄，但不能刪原圖或改 Creator／License。</span>'));
    OCUI.modal({ title: '關聯企劃', body: wrap, actions: [{ label: '完成', kind: 'accent', onClick: redraw }] });
  }

  // 圖片標記 (rectangle regions, normalized) — list + add via region picker
  function renderAnnos(body, v, canEdit, changed) {
    body.appendChild(el('p', 'vw-intro', '在圖片上框選重點（矩形框，座標用相對比例，縮放不跑位）。標記綁定特定圖片，更換主視覺不會錯誤搬移。'));
    var heroId = v.slots.hero || (v.images[0] && v.images[0].id);
    var im = img(v, heroId);
    // drag-to-frame surface: pointer-draw a rectangle (normalized), then label it.
    var stage = el('div', 'vw-annostage'); if (im) stage.style.background = im.c;
    if (canEdit && im) stage.appendChild(el('div', 'vw-annohint', '在圖上拖曳框選重點'));
    (v.annotations.filter(function (a) { return a.assetId === heroId; })).forEach(function (a, i) {
      var box = el('div', 'vw-annobox'); box.style.cssText = 'left:' + (a.region.x * 100) + '%;top:' + (a.region.y * 100) + '%;width:' + (a.region.w * 100) + '%;height:' + (a.region.h * 100) + '%';
      box.innerHTML = '<span class="n">' + (i + 1) + '</span>';
      stage.appendChild(box);
    });
    if (canEdit && im) {
      var drawing = null, ghost = null;
      stage.style.cursor = 'crosshair';
      stage.addEventListener('pointerdown', function (e) {
        if (e.target.closest('.vw-annobox')) return;
        var r = stage.getBoundingClientRect();
        drawing = { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
        ghost = el('div', 'vw-annobox drawing'); stage.appendChild(ghost);
        stage.setPointerCapture(e.pointerId);
      });
      stage.addEventListener('pointermove', function (e) {
        if (!drawing) return;
        var r = stage.getBoundingClientRect();
        var cx = (e.clientX - r.left) / r.width, cy = (e.clientY - r.top) / r.height;
        var x = Math.min(drawing.x, cx), y = Math.min(drawing.y, cy), w = Math.abs(cx - drawing.x), h = Math.abs(cy - drawing.y);
        ghost.style.cssText = 'left:' + (x * 100) + '%;top:' + (y * 100) + '%;width:' + (w * 100) + '%;height:' + (h * 100) + '%';
      });
      stage.addEventListener('pointerup', function (e) {
        if (!drawing) return;
        var r = stage.getBoundingClientRect();
        var cx = (e.clientX - r.left) / r.width, cy = (e.clientY - r.top) / r.height;
        var reg = { x: Math.max(0, Math.min(drawing.x, cx)), y: Math.max(0, Math.min(drawing.y, cy)), w: Math.abs(cx - drawing.x), h: Math.abs(cy - drawing.y) };
        drawing = null; if (ghost) ghost.remove();
        if (reg.w < 0.04 || reg.h < 0.04) return; // ignore tiny click
        addAnno(v, heroId, changed, function () { renderAnnos(body, v, canEdit, changed); }, reg);
      });
    }
    body.appendChild(stage);
    body.appendChild(el('div', 'vw-subh', '標記 · ' + v.annotations.filter(function (a) { return a.assetId === heroId; }).length + '（主視覺）'));
    var list = el('div', 'vw-annolist');
    v.annotations.filter(function (a) { return a.assetId === heroId; }).forEach(function (a, i) {
      var row = el('div', 'vw-annorow');
      row.innerHTML = '<span class="n">' + (i + 1) + '</span><div class="b"><div class="lb">' + (a.label || '（未命名）') + '</div><div class="mt"><span class="cat">' + annoCatLabel(a.category) + '</span>' + (a.note ? ' · ' + a.note : '') + ' · ' + (a.visibility === 'public' ? '公開' : '內部') + '</div></div>';
      if (canEdit) { var del = el('button', 'vw-del', '×'); del.onclick = function () { v.annotations = v.annotations.filter(function (x) { return x !== a; }); changed(); renderAnnos(body, v, canEdit, changed); }; row.appendChild(del); }
      list.appendChild(row);
    });
    body.appendChild(list);
    if (canEdit && im) { var add = el('button', 'fw-add', '＋ 新增標記'); add.onclick = function () { addAnno(v, heroId, changed, function () { renderAnnos(body, v, canEdit, changed); }); }; body.appendChild(add); }
  }
  function addAnno(v, assetId, changed, redraw, region) {
    var f = el('div', 'vw-annoform');
    f.innerHTML = '<div class="ed-field"><label>標記文字</label><input class="input" id="an-lb" placeholder="例：袖口花紋不可左右顛倒"></div>'
      + '<div class="ed-field"><label>分類</label><select class="select" id="an-cat">' + ANNO_CATS.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + '</option>'; }).join('') + '</select></div>'
      + '<div class="ed-field"><label>備註（選填）</label><input class="input" id="an-note"></div>'
      + '<div class="ed-field"><label>可見性</label><select class="select" id="an-vis"><option value="public">公開（繪師參考可見）</option><option value="internal">內部</option></select></div>'
      + '<p style="font-size:11.5px;color:var(--text-faint);margin:0">' + (region ? '已框選位置 ✓ 可在圖上重畫調整。' : '未框選——將放在圖片中央，可之後在圖上重畫。') + '</p>';
    OCUI.modal({ title: '新增圖片標記', body: f, actions: [{ label: '取消' }, { label: '新增', kind: 'accent', onClick: function () {
      var lb = f.querySelector('#an-lb').value.trim();
      var reg = region || { x: 0.34 + Math.random() * 0.1, y: 0.3 + Math.random() * 0.2, w: 0.22, h: 0.16 };
      v.annotations.push({ id: 'an-' + Math.random().toString(36).slice(2, 6), assetId: assetId, targetType: 'character', category: f.querySelector('#an-cat').value, label: lb || '標記', note: f.querySelector('#an-note').value.trim(), region: reg, visibility: f.querySelector('#an-vis').value });
      changed(); redraw();
    } }] });
  }

  // 色票 (with eyedrop-from-image suggestion → 建議色票, never auto-overwrite)
  function renderPalette(body, d, v, canEdit, changed) {
    d.art = d.art || {}; var pal = d.art.palette = d.art.palette || [];
    v.paletteCount = pal.length;
    body.appendChild(el('p', 'vw-intro', '色票＝色塊＋名稱＋用途。可從主視覺「吸色」產生建議，確認後才加入（不自動覆蓋既有色票）。'));
    if (canEdit) { var eye = el('button', 'vw-eyedrop', ic('palette') + ' 從主視覺吸色'); eye.onclick = function () { eyedrop(v, pal, changed, function () { renderPalette(body, d, v, canEdit, changed); }); }; body.appendChild(eye); }
    var W = window.OCFields && OCFields.widget;
    if (W) { var w = OCFields.widget('color', pal, function (val) { d.art.palette = val; v.paletteCount = val.length; changed(); }); body.appendChild(w); }
  }
  function eyedrop(v, pal, changed, redraw) {
    var SUG = [['髮', '#2E3138'], ['瞳', '#C7A14A'], ['衣', '#8FA3B0'], ['點綴', '#9E332B']];
    var wrap = el('div', 'vw-sugwrap');
    wrap.innerHTML = '<p style="font-size:12.5px;color:var(--text-dim);margin:0 0 10px">從主視覺取得的<b>建議色票</b>（示範）。勾選要加入的，確認後加到色票，不覆蓋既有。</p>';
    var picks = {};
    SUG.forEach(function (s, i) {
      var row = el('label', 'vw-sugrow');
      var cb = el('input'); cb.type = 'checkbox'; cb.checked = true; picks[i] = true; cb.onchange = function () { picks[i] = cb.checked; };
      row.appendChild(cb);
      row.appendChild(el('span', 'sw', '')); row.lastChild.style.background = s[1];
      row.appendChild(el('span', 'nm', s[0] + ' · ' + s[1]));
      wrap.appendChild(row);
    });
    OCUI.modal({ title: '從主視覺吸色', body: wrap, actions: [{ label: '取消' }, { label: '加入建議色票', kind: 'accent', onClick: function () { SUG.forEach(function (s, i) { if (picks[i]) pal.push([s[0], s[1]]); }); changed(); redraw(); } }] });
  }

  // 繪師／委託參考摘要 (a shareable visual summary view)
  function renderRefs(body, d, v) {
    body.appendChild(el('p', 'vw-intro', '把主要圖片、色票、必畫／不可畫、配件、公開標記組成可分享的視覺參考摘要（Character 資料的分享視圖，非委託案件）。'));
    var card = el('div', 'vw-refcard');
    var heroIm = img(v, v.slots.hero || v.slots.fullbody);
    card.appendChild(el('div', 'rf-h', '繪師／委託參考 · 摘要'));
    if (heroIm) { var t = el('div', 'rf-hero'); t.style.background = heroIm.c; t.innerHTML = '<span class="lb">' + heroIm.label + '</span>'; card.appendChild(t); }
    var pal = (d.art && d.art.palette) || [];
    if (pal.length) { var sw = el('div', 'rf-sw'); pal.forEach(function (p) { var c = el('span'); c.style.background = p[1]; c.title = p[0] + ' ' + p[1]; sw.appendChild(c); }); card.appendChild(el('div', 'rf-sub', '主要色票')); card.appendChild(sw); }
    var must = v.annotations.filter(function (a) { return a.category === 'must' && a.visibility === 'public'; });
    var avoid = v.annotations.filter(function (a) { return a.category === 'avoid' && a.visibility === 'public'; });
    if (must.length) { card.appendChild(el('div', 'rf-sub', '必畫重點')); card.appendChild(el('ul', 'rf-list', must.map(function (a) { return '<li>' + a.label + '</li>'; }).join(''))); }
    if (avoid.length) { card.appendChild(el('div', 'rf-sub', '不可畫錯')); card.appendChild(el('ul', 'rf-list warn', avoid.map(function (a) { return '<li>' + a.label + '</li>'; }).join(''))); }
    card.appendChild(el('div', 'rf-note', '※ 只含公開的圖片標記與圖設定，不含私人筆記。'));
    body.appendChild(card);
  }

  window.OCVisual = {
    SLOTS: SLOTS, renderWorkspace: renderWorkspace, ensure: ensure,
    // derived helpers other pages read (cards / public page binding)
    slotImage: function (cid, role) { var d = (OCData.details || {})[cid]; if (!d) return null; var v = ensure(d, cid); var im = (v.images || []).filter(function (x) { return x.id === v.slots[role]; })[0]; return im || null; },
  };
})();
