/* ============================================================
   CharacterHub — template-driven character form engine.
   Renders a character's 設定 FROM a template (sections + field
   defs). Two modes:
     · fill      — fill in values; per-field 必填/選填 + 已填/待填
     · structure — edit the form itself: add/remove/reorder/rename
                   fields & sections, change type, toggle 必填
   Plus a template picker (starters / blank / my templates) and a
   "save as my template" dialog. Pure vanilla; uses OCFields widgets,
   OCTemplates store, OCUI/OCIcon. Load AFTER those, before editor.
   ============================================================ */
(function () {
  function el(t, c, h) { var n = document.createElement(t); if (c) n.className = c; if (h != null) n.innerHTML = h; return n; }
  var ic = function (n) { return window.OCIcon ? OCIcon(n) : ''; };

  function emptyFor(type) { return (type === 'tags' || type === 'list' || type === 'chips' || type === 'color' || type === 'keyvalue') ? [] : (type === 'image' ? null : ''); }
  // in-app name dialog (replaces native prompt() so it matches the app chrome)
  function nameDialog(o) {
    o = o || {};
    var body = el('div', null, '<div class="field"><label>' + (o.label || '名稱') + '</label><input class="input" id="cf-namein" placeholder="' + (o.placeholder || '') + '"></div>');
    var inp = body.querySelector('#cf-namein'); if (o.value) inp.value = o.value;
    function go(close) { var v = inp.value.trim(); if (!v && o.required) { OCUI.toast('請輸入名稱'); return true; } close && close(); o.onConfirm(v); }
    var m = OCUI.modal({ title: o.title || '命名', body: body, actions: [{ label: '取消' }, { label: o.confirmLabel || '新增', kind: 'accent', onClick: function () { return go(null); } }] });
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); go(m.close); } });
  }
  function valFilled(type, v) {
    if (type === 'image') return !!v;
    if (type === 'keyvalue') return Array.isArray(v) && v.some(function (p) { return (p[0] || '').trim() || (p[1] || '').trim(); });
    if (type === 'tags' || type === 'list' || type === 'chips' || type === 'color') return Array.isArray(v) && v.filter(function (x) { return Array.isArray(x) ? (x[0] || x[1]) : String(x).trim(); }).length > 0;
    return typeof v === 'string' && !!v.trim();
  }

  function completion(tpl, vals) {
    var out = { fields: { filled: 0, total: 0 }, required: { filled: 0, total: 0 }, bySection: {} };
    (tpl.sections || []).forEach(function (s) {
      var sf = 0, st = 0;
      s.fields.forEach(function (fd) {
        var ok = valFilled(fd.type, vals[fd.id]);
        out.fields.total++; st++; if (ok) { out.fields.filled++; sf++; }
        if (fd.required) { out.required.total++; if (ok) out.required.filled++; }
      });
      out.bySection[s.id] = { filled: sf, total: st };
    });
    return out;
  }

  // ---------- FILL MODE ----------
  function renderFill(host, o) {
    host.innerHTML = '';
    var tpl = o.tpl, vals = o.vals;
    var s = tpl.sections.filter(function (x) { return x.id === o.secId; })[0] || tpl.sections[0];
    if (!s) { host.appendChild(el('div', 'cf-empty', '這個模板還沒有區塊。切到「編輯欄位」新增。')); return; }
    var region = el('div', 'ed-region');
    region.appendChild(el('div', 'rh', '<span class="rt">' + s.title + '</span><span class="en">' + s.fields.length + ' 欄位</span>'));
    var W = OCFields.widget, FB = OCFields.fieldBlock;
    if (!s.fields.length) region.appendChild(el('div', 'cf-empty', '這個區塊還沒有欄位。下方可快速新增，或切到「編輯欄位」做更多調整。'));
    var wrap = el('div', 'ed-sec');
    s.fields.forEach(function (fd) {
      var w = W(fd.type, vals[fd.id], function (v) { vals[fd.id] = v; o.onChange && o.onChange(); }, { ph: fd.ph, kPh: '屬性', vPh: '值' });
      wrap.appendChild(FB({ label: fd.label, required: fd.required, hint: fd.hint, widget: w }));
    });
    region.appendChild(wrap);
    // inline quick-add (edit_mode = both: light add while filling)
    if (o.canEdit) {
      var qa = el('div', 'cf-quickadd');
      qa.innerHTML = '<span class="lbl">＋ 快速新增欄位</span>';
      OCTemplates.TYPES.forEach(function (ty) {
        var b = el('button', null, ic(ty[2]) + ty[1]); b.type = 'button';
        b.onclick = function () {
          nameDialog({ title: '新增' + ty[1] + '欄位', placeholder: '欄位名稱（例：身高、CP、代表台詞）', confirmLabel: '新增', onConfirm: function (label) {
            var nf = OCTemplates.newField(ty[0], label || ty[1], false);
            vals[nf.id] = emptyFor(ty[0]); s.fields.push(nf);
            o.onStructure && o.onStructure();
          } });
        };
        qa.appendChild(b);
      });
      region.appendChild(qa);
    }
    host.appendChild(region);
  }

  // ---------- STRUCTURE MODE ----------
  function renderStructure(host, o) {
    host.innerHTML = '';
    var tpl = o.tpl;
    var s = tpl.sections.filter(function (x) { return x.id === o.secId; })[0] || tpl.sections[0];
    if (!s) { host.appendChild(el('div', 'cf-empty', '沒有區塊。')); return; }
    var region = el('div', 'ed-region cf-struct');
    // section header: editable title + section controls
    var head = el('div', 'cf-sechead');
    var title = el('input', 'cf-sectitle'); title.value = s.title; title.setAttribute('aria-label', '區塊標題');
    title.oninput = function () { s.title = title.value; o.onChange && o.onChange({ light: true }); };
    head.appendChild(el('span', 'cf-seclabel', 'EDIT · 區塊'));
    head.appendChild(title);
    var idx = tpl.sections.indexOf(s);
    var up = el('button', 'cf-iconbtn', ic('chevron-right')); up.style.transform = 'rotate(-90deg)'; up.title = '上移區塊'; up.disabled = idx === 0;
    up.onclick = function () { tpl.sections.splice(idx - 1, 0, tpl.sections.splice(idx, 1)[0]); o.onChange(); };
    var dn = el('button', 'cf-iconbtn', ic('chevron-right')); dn.style.transform = 'rotate(90deg)'; dn.title = '下移區塊'; dn.disabled = idx === tpl.sections.length - 1;
    dn.onclick = function () { tpl.sections.splice(idx + 1, 0, tpl.sections.splice(idx, 1)[0]); o.onChange(); };
    var delS = el('button', 'cf-iconbtn danger', ic('trash')); delS.title = '刪除區塊';
    delS.onclick = function () {
      OCUI.confirm({ title: '刪除區塊？', message: '「' + s.title + '」與其中 ' + s.fields.length + ' 個欄位都會移除。', confirmLabel: '刪除', danger: true, onConfirm: function () {
        var i = tpl.sections.indexOf(s); tpl.sections.splice(i, 1); o.onChange();
      } });
    };
    head.appendChild(up); head.appendChild(dn); head.appendChild(delS);
    region.appendChild(head);

    // field rows (draggable to reorder within the section)
    var listEl = el('div', 'cf-fieldlist');
    s.fields.forEach(function (fd, i) { listEl.appendChild(fieldRow(fd, i, s, o)); });
    enableDrag(listEl, s.fields, function () { o.onChange(); });
    region.appendChild(listEl);

    // add field
    var add = el('div', 'cf-addfield');
    add.innerHTML = '<span class="lbl">＋ 新增欄位</span>';
    OCTemplates.TYPES.forEach(function (ty) {
      var b = el('button', null, ic(ty[2]) + ty[1]); b.type = 'button'; b.title = ty[1];
      b.onclick = function () {
        var nf = OCTemplates.newField(ty[0], '', false);
        s.fields.push(nf); o.vals && (o.vals[nf.id] = emptyFor(ty[0])); o.onChange();
        setTimeout(function () { var inps = listEl.querySelectorAll('.cf-flabel'); var last = inps[inps.length - 1]; if (last) last.focus(); }, 30);
      };
      add.appendChild(b);
    });
    region.appendChild(add);
    host.appendChild(region);

    // add section
    var addSec = el('button', 'ed-addsection', ic('plus') + ' 新增區塊');
    addSec.onclick = function () { var ns = OCTemplates.newSection(''); tpl.sections.push(ns); o.onChange({ goto: ns.id }); };
    host.appendChild(addSec);
  }

  function fieldRow(fd, i, s, o) {
    var row = el('div', 'cf-frow'); row.draggable = true; row.dataset.i = i;
    var handle = el('span', 'cf-drag', ic('move')); handle.title = '拖曳排序';
    row.appendChild(handle);
    var main = el('div', 'cf-fmain');
    var top = el('div', 'cf-ftop');
    var label = el('input', 'cf-flabel'); label.value = fd.label; label.placeholder = '欄位名稱'; label.setAttribute('aria-label', '欄位名稱');
    label.oninput = function () { fd.label = label.value; o.onChange && o.onChange({ light: true }); };
    top.appendChild(label);
    // type select
    var typeSel = el('select', 'cf-ftype'); typeSel.setAttribute('aria-label', '欄位型別');
    OCTemplates.TYPES.forEach(function (ty) { var op = el('option', null, ty[1]); op.value = ty[0]; if (ty[0] === fd.type) op.selected = true; typeSel.appendChild(op); });
    typeSel.onchange = function () { fd.type = typeSel.value; o.onChange(); };
    top.appendChild(typeSel);
    main.appendChild(top);
    // hint input
    var hint = el('input', 'cf-fhint'); hint.value = fd.hint || ''; hint.placeholder = '說明文字（選填）';
    hint.oninput = function () { fd.hint = hint.value; o.onChange && o.onChange({ light: true }); };
    main.appendChild(hint);
    row.appendChild(main);
    // required toggle
    var req = el('button', 'cf-reqtoggle' + (fd.required ? ' on' : '')); req.type = 'button';
    req.innerHTML = (fd.required ? ic('check') : '') + '<span>必填</span>'; req.title = '切換必填／選填';
    req.onclick = function () { fd.required = !fd.required; o.onChange(); };
    row.appendChild(req);
    // remove
    var rm = el('button', 'cf-iconbtn danger', ic('x')); rm.title = '移除欄位';
    rm.onclick = function () { var idx = s.fields.indexOf(fd); s.fields.splice(idx, 1); if (o.vals) delete o.vals[fd.id]; o.onChange(); };
    row.appendChild(rm);
    return row;
  }

  // simple HTML5 drag-reorder for field rows
  function enableDrag(listEl, arr, onReorder) {
    var dragI = null;
    listEl.querySelectorAll('.cf-frow').forEach(function (row) {
      row.addEventListener('dragstart', function (e) { dragI = +row.dataset.i; row.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
      row.addEventListener('dragend', function () { row.classList.remove('dragging'); listEl.querySelectorAll('.cf-frow').forEach(function (r) { r.classList.remove('over'); }); });
      row.addEventListener('dragover', function (e) { e.preventDefault(); row.classList.add('over'); });
      row.addEventListener('dragleave', function () { row.classList.remove('over'); });
      row.addEventListener('drop', function (e) {
        e.preventDefault(); var to = +row.dataset.i;
        if (dragI === null || dragI === to) return;
        arr.splice(to, 0, arr.splice(dragI, 1)[0]); onReorder();
      });
    });
  }

  // ---------- TEMPLATE PICKER ----------
  function picker(o) {
    var body = el('div', 'cf-picker');
    function paint() {
      body.innerHTML = '';
      var all = OCTemplates.all();
      var groups = [['起手式模板', all.filter(function (t) { return t.kind === 'builtin'; })], ['我的模板', all.filter(function (t) { return t.kind === 'mine'; })]];
      groups.forEach(function (g) {
        if (!g[1].length) return;
        body.appendChild(el('div', 'cf-pickgrp', g[0]));
        var grid = el('div', 'cf-pickgrid');
        g[1].forEach(function (t) {
          var card = el('button', 'cf-pickcard' + (t.id === o.currentId ? ' on' : '')); card.type = 'button';
          card.innerHTML = '<span class="ic" style="background:' + (t.tone || 'var(--accent)') + '1f;color:' + (t.tone || 'var(--accent-ink)') + '">' + ic(t.icon || 'user') + '</span>'
            + '<span class="b"><span class="nm">' + t.name + '</span><span class="ds">' + t.desc + '</span><span class="ct">' + OCTemplates.countFields(t) + ' 欄位 · ' + t.sections.length + ' 區塊</span></span>';
          card.onclick = function () { o.onPick(t); if (o._close) o._close(); };
          if (t.kind === 'mine') {
            var del = el('span', 'cf-pickdel', ic('trash')); del.title = '刪除我的模板';
            del.onclick = function (e) { e.stopPropagation(); OCUI.confirm({ title: '刪除模板？', message: '「' + t.name + '」會從你的模板庫移除。', confirmLabel: '刪除', danger: true, onConfirm: function () { OCTemplates.deleteMine(t.id); paint(); } }); };
            card.appendChild(del);
          }
          grid.appendChild(card);
        });
        body.appendChild(grid);
      });
    }
    paint();
    var m = OCUI.modal({ title: '選擇角色設定模板', body: body, actions: [{ label: '取消' }] });
    if (m && m.box) m.box.classList.add('oc-modal-wide');
    o._close = m.close;
  }

  function saveDialog(tpl, onSaved) {
    var body = el('div', null, '<div class="field"><label>模板名稱</label><input class="input" id="cf-tplname" placeholder="例：我的角色卡格式" value="' + (tpl.name && tpl.id !== 'blank' ? tpl.name : '') + '"></div>'
      + '<p style="font-size:12px;color:var(--text-faint);margin:10px 0 0">會把目前的<b>欄位結構</b>（不含填寫內容）存到「我的模板」，之後可套用到其他角色。</p>');
    OCUI.modal({ title: '存成我的模板', body: body, actions: [{ label: '取消' }, { label: '儲存', kind: 'accent', onClick: function () {
      var nm = body.querySelector('#cf-tplname').value.trim(); if (!nm) { OCUI.toast('請輸入模板名稱'); return true; }
      var t = OCTemplates.saveMine(tpl, nm); OCUI.toast('已存成模板「' + nm + '」', { demo: true }); onSaved && onSaved(t);
    } }] });
  }

  window.OCForm = { emptyFor: emptyFor, valFilled: valFilled, completion: completion, renderFill: renderFill, renderStructure: renderStructure, picker: picker, saveDialog: saveDialog, nameDialog: nameDialog };
})();
