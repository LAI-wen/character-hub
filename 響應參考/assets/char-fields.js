/* ============================================================
   CharacterHub — typed field widgets for the character editor.
   Replaces "everything is a textarea" with the right input per
   data shape: text, textarea, tags, list (checklist), color list,
   chips, keyvalue (屬性表). Plus custom sections/fields the user
   can add. Pure vanilla, operates on an in-memory model the editor
   persists via OCDemo.
   v2 — field-filling redesign:
     · tags: explicit ＋ add button + bigger targets
     · color: preset-palette picker (tap swatch) instead of fiddly
       native picker + 3 raw inputs
     · keyvalue: new 屬性表 widget (年齡/身高/種族…)
     · fieldBlock: clear 必填/選填 + live 已填/待填 status
   Load AFTER components.js, before the editor inline script.
   ============================================================ */
(function () {
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }
  var ic = function (n) { return window.OCIcon ? OCIcon(n) : ''; };
  function fire(node) { node.dispatchEvent(new Event('input', { bubbles: true })); }

  // curated swatch palette — earthy + a few brights, tasteful for OC refs
  var PRESETS = ['#2E3138', '#5A6470', '#8FA3B0', '#B8C2CC', '#F2EEE6',
    '#C7A14A', '#A67F0E', '#E2C766', '#9E332B', '#B5654A',
    '#5E7E55', '#3E6B57', '#7FA8C9', '#3D5A80', '#8A6FA0', '#1A1714'];

  // FIELD TYPES the editor offers when adding a custom field
  var TYPES = [
    ['text', '短文字', 'edit', '一行字，例如稱號、CP'],
    ['textarea', '長文', 'book', '段落，例如背景故事'],
    ['tags', '標籤', 'tag', '多個關鍵詞，用來分類'],
    ['keyvalue', '屬性表', 'list', '成對的屬性，例如身高 178cm'],
    ['list', '清單', 'check', '可勾選的條列，例如必畫重點'],
    ['color', '色票', 'palette', '顏色 + 名稱'],
    ['chips', '物件', 'box', '並列的小項，例如配件'],
  ];

  // ---------- individual widgets ----------

  function wText(val, onChange, ph) {
    var i = el('input', 'input'); i.value = val || ''; if (ph) i.placeholder = ph;
    i.oninput = function () { onChange(i.value); };
    return i;
  }
  function wTextarea(val, onChange, ph, rows) {
    var t = el('textarea', 'input'); t.rows = rows || 3; t.value = val || ''; if (ph) t.placeholder = ph;
    t.oninput = function () { onChange(t.value); };
    return t;
  }

  // tags: array of strings. add via Enter OR the explicit ＋ button; remove via ×
  function wTags(arr, onChange, ph) {
    arr = (arr || []).slice();
    var wrap = el('div', 'fw-tags');
    function commit(v) { v = (v || '').trim(); if (!v) return false; if (arr.indexOf(v) >= 0) return false; arr.push(v); onChange(arr.slice()); return true; }
    function repaint(focusInput) {
      wrap.innerHTML = '';
      arr.forEach(function (t, i) {
        var chip = el('span', 'fw-tag', '<span class="t">' + t + '</span><button class="x" aria-label="移除 ' + t + '">' + ic('x') + '</button>');
        chip.querySelector('.x').onclick = function () { arr.splice(i, 1); onChange(arr.slice()); fire(wrap); repaint(); };
        wrap.appendChild(chip);
      });
      var inp = el('input', 'fw-taginput'); inp.placeholder = ph || '輸入關鍵詞…'; inp.setAttribute('aria-label', '新增標籤');
      inp.onkeydown = function (e) {
        if ((e.key === 'Enter' || e.key === ',' || e.key === '、') && inp.value.trim()) { e.preventDefault(); if (commit(inp.value)) { fire(wrap); repaint(true); } }
        else if (e.key === 'Backspace' && !inp.value && arr.length) { arr.pop(); onChange(arr.slice()); fire(wrap); repaint(true); }
      };
      var add = el('button', 'fw-tagadd', ic('plus')); add.type = 'button'; add.setAttribute('aria-label', '新增標籤');
      add.onclick = function () { var v = wrap.querySelector('.fw-taginput'); if (commit(v.value)) { fire(wrap); repaint(true); } else { v.focus(); } };
      wrap.appendChild(inp); wrap.appendChild(add);
      if (focusInput) wrap.querySelector('.fw-taginput').focus();
    }
    repaint();
    return wrap;
  }

  // list: array of strings as add/removable rows (checklist look)
  function wList(arr, onChange, ph, glyph) {
    arr = (arr || []).slice();
    var box = el('div', 'fw-list');
    function repaint() {
      box.innerHTML = '';
      arr.forEach(function (t, i) {
        var row = el('div', 'fw-row');
        row.innerHTML = '<span class="mk">' + ic(glyph || 'check') + '</span>';
        var inp = el('input', 'fw-rowinput'); inp.value = t; inp.placeholder = ph || '輸入一項…';
        inp.oninput = function () { arr[i] = inp.value; onChange(arr.slice()); };
        inp.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); addRow(i + 1); } };
        var del = el('button', 'fw-del', ic('x')); del.type = 'button'; del.setAttribute('aria-label', '移除');
        del.onclick = function () { arr.splice(i, 1); onChange(arr.slice()); fire(box); repaint(); };
        row.appendChild(inp); row.appendChild(del); box.appendChild(row);
      });
      var add = el('button', 'fw-add', ic('plus') + ' 新增一項'); add.type = 'button';
      add.onclick = function () { addRow(arr.length); };
      box.appendChild(add);
    }
    function addRow(at) { arr.splice(at, 0, ''); onChange(arr.slice()); fire(box); repaint(); var inps = box.querySelectorAll('.fw-rowinput'); if (inps[at]) inps[at].focus(); }
    repaint();
    return box;
  }

  // keyvalue: array of [label, value] pairs → a tidy 屬性表 (年齡/身高/種族…)
  function wKeyValue(arr, onChange, opts) {
    opts = opts || {};
    arr = (arr || []).map(function (p) { return p.slice(); });
    var box = el('div', 'fw-kv');
    function clone() { return arr.map(function (p) { return p.slice(); }); }
    function repaint(focusAt, focusCol) {
      box.innerHTML = '';
      arr.forEach(function (p, i) {
        var row = el('div', 'fw-kvrow');
        var k = el('input', 'fw-kvk'); k.value = p[0] || ''; k.placeholder = opts.kPh || '屬性';
        k.oninput = function () { p[0] = k.value; onChange(clone()); };
        var sep = el('span', 'fw-kvsep', ic('chevron-right'));
        var v = el('input', 'fw-kvv'); v.value = p[1] || ''; v.placeholder = opts.vPh || '值';
        v.oninput = function () { p[1] = v.value; onChange(clone()); };
        v.onkeydown = function (e) { if (e.key === 'Enter') { e.preventDefault(); addRow(i + 1); } };
        var del = el('button', 'fw-del', ic('x')); del.type = 'button'; del.setAttribute('aria-label', '移除屬性');
        del.onclick = function () { arr.splice(i, 1); onChange(clone()); fire(box); repaint(); };
        row.appendChild(k); row.appendChild(sep); row.appendChild(v); row.appendChild(del);
        box.appendChild(row);
      });
      var add = el('button', 'fw-add', ic('plus') + ' 新增屬性'); add.type = 'button';
      add.onclick = function () { addRow(arr.length); };
      box.appendChild(add);
      if (focusAt != null) { var sel = focusCol === 'v' ? '.fw-kvv' : '.fw-kvk'; var inps = box.querySelectorAll(sel); if (inps[focusAt]) inps[focusAt].focus(); }
    }
    function addRow(at) { arr.splice(at, 0, ['', '']); onChange(clone()); fire(box); repaint(at, 'k'); }
    repaint();
    return box;
  }

  // color: array of [name, hex] → swatch cards + a preset-first editor
  function wColor(arr, onChange) {
    arr = (arr || []).map(function (p) { return p.slice(); });
    var box = el('div', 'fw-palette');
    var editing = -1; // index currently open in the editor
    function clone() { return arr.map(function (p) { return p.slice(); }); }
    function repaint() {
      box.innerHTML = '';
      var grid = el('div', 'fw-swgrid');
      arr.forEach(function (p, i) {
        var card = el('button', 'fw-swcard' + (editing === i ? ' on' : '')); card.type = 'button';
        card.innerHTML = '<span class="sw" style="background:' + (p[1] || '#ccc') + '"></span>'
          + '<span class="meta"><span class="nm">' + (p[0] || '未命名') + '</span><span class="hex">' + (p[1] || '') + '</span></span>';
        card.onclick = function () { editing = editing === i ? -1 : i; repaint(); };
        grid.appendChild(card);
      });
      var add = el('button', 'fw-swadd', ic('plus') + '<span>新增顏色</span>'); add.type = 'button';
      add.onclick = function () { arr.push(['', PRESETS[arr.length % PRESETS.length]]); editing = arr.length - 1; onChange(clone()); fire(box); repaint(); };
      grid.appendChild(add);
      box.appendChild(grid);

      if (editing >= 0 && arr[editing]) {
        var p = arr[editing];
        var ed = el('div', 'fw-swedit');
        // preset palette — tap to set hex
        var pal = el('div', 'fw-presets');
        PRESETS.forEach(function (hx) {
          var dot = el('button', 'fw-preset' + (String(p[1]).toLowerCase() === hx.toLowerCase() ? ' on' : '')); dot.type = 'button';
          dot.style.background = hx; dot.title = hx; dot.setAttribute('aria-label', hx);
          dot.onclick = function () { p[1] = hx; onChange(clone()); fire(box); repaint(); };
          pal.appendChild(dot);
        });
        ed.appendChild(pal);
        // name + hex + native picker + remove
        var row = el('div', 'fw-swfields');
        var nm = el('input', 'fw-cname'); nm.value = p[0] || ''; nm.placeholder = '名稱（髮／瞳／衣…）'; nm.setAttribute('aria-label', '顏色名稱');
        nm.oninput = function () { p[0] = nm.value; onChange(clone()); grid.querySelectorAll('.fw-swcard')[editing].querySelector('.nm').textContent = nm.value || '未命名'; };
        var hex = el('input', 'fw-chex'); hex.value = p[1] || ''; hex.placeholder = '#色碼'; hex.setAttribute('aria-label', '色碼');
        hex.oninput = function () { p[1] = hex.value; onChange(clone()); fire(box); var c = grid.querySelectorAll('.fw-swcard')[editing]; if (c) { c.querySelector('.sw').style.background = hex.value; c.querySelector('.hex').textContent = hex.value; } };
        var pick = el('label', 'fw-cpick', ic('palette')); pick.title = '自訂顏色';
        var picker = el('input'); picker.type = 'color'; picker.value = /^#[0-9a-f]{6}$/i.test(p[1]) ? p[1] : '#888888';
        picker.oninput = function () { p[1] = picker.value; onChange(clone()); fire(box); repaint(); };
        pick.appendChild(picker);
        var del = el('button', 'fw-swdel', ic('trash') + ' 移除'); del.type = 'button';
        del.onclick = function () { arr.splice(editing, 1); editing = -1; onChange(clone()); fire(box); repaint(); };
        row.appendChild(nm); row.appendChild(hex); row.appendChild(pick); row.appendChild(del);
        ed.appendChild(row);
        box.appendChild(ed);
      }
    }
    repaint();
    return box;
  }

  // chips: array of strings shown as filled chips + add inline (objects/accessories)
  function wChips(arr, onChange, ph) {
    arr = (arr || []).slice();
    var wrap = el('div', 'fw-chips');
    function commit(v) { v = (v || '').trim(); if (!v) return false; arr.push(v); onChange(arr.slice()); return true; }
    function repaint(focusInput) {
      wrap.innerHTML = '';
      arr.forEach(function (t, i) {
        var c = el('span', 'fw-chip', ic('box') + '<span>' + t + '</span><button class="x" aria-label="移除">' + ic('x') + '</button>');
        c.querySelector('.x').onclick = function () { arr.splice(i, 1); onChange(arr.slice()); fire(wrap); repaint(); };
        wrap.appendChild(c);
      });
      var inp = el('input', 'fw-taginput'); inp.placeholder = ph || '輸入後按 Enter…';
      inp.onkeydown = function (e) { if (e.key === 'Enter' && inp.value.trim()) { e.preventDefault(); if (commit(inp.value)) { fire(wrap); repaint(true); } } };
      var add = el('button', 'fw-tagadd', ic('plus')); add.type = 'button'; add.setAttribute('aria-label', '新增');
      add.onclick = function () { var v = wrap.querySelector('.fw-taginput'); if (commit(v.value)) { fire(wrap); repaint(true); } else { v.focus(); } };
      wrap.appendChild(inp); wrap.appendChild(add);
      if (focusInput) wrap.querySelector('.fw-taginput').focus();
    }
    repaint();
    return wrap;
  }

  // image: a single slot. value = hex 'image' stand-in (prototype) or null.
  // (No real uploads in the prototype — a coloured block represents the image.)
  function wImage(val, onChange) {
    var POOL = ['#8FA3B0', '#5E7E55', '#9E332B', '#B8AE9C', '#7FA8C9', '#C9B79C', '#8A6FA0', '#3D5A80', '#C7A14A'];
    var cur = val || null;
    var box = el('div', 'fw-image');
    function repaint() {
      box.innerHTML = '';
      var thumb = el('div', 'fw-imgthumb' + (cur ? '' : ' empty'));
      if (cur) { thumb.style.background = cur; thumb.innerHTML = '<span class="lb">' + ic('image') + ' 圖片</span>'; }
      else thumb.innerHTML = '<span class="ph">' + ic('image') + '</span>';
      box.appendChild(thumb);
      var acts = el('div', 'fw-imgacts');
      var pick = el('button', 'btn btn-sm', cur ? '更換' : '指定圖片'); pick.type = 'button';
      pick.onclick = function () { cur = POOL[Math.floor(Math.random() * POOL.length)]; onChange(cur); fire(box); repaint(); };
      acts.appendChild(pick);
      if (cur) { var rm = el('button', 'btn btn-sm', '移除'); rm.type = 'button'; rm.onclick = function () { cur = null; onChange(null); fire(box); repaint(); }; acts.appendChild(rm); }
      box.appendChild(acts);
    }
    repaint();
    return box;
  }

  // dispatcher: build a widget by type
  function widget(type, value, onChange, opts) {
    opts = opts || {};
    switch (type) {
      case 'textarea': return wTextarea(value, onChange, opts.ph, opts.rows);
      case 'tags': return wTags(value, onChange, opts.ph);
      case 'keyvalue': return wKeyValue(value, onChange, opts);
      case 'list': return wList(value, onChange, opts.ph, opts.glyph);
      case 'color': return wColor(value, onChange);
      case 'chips': return wChips(value, onChange, opts.ph);
      case 'image': return wImage(value, onChange);
      default: return wText(value, onChange, opts.ph);
    }
  }

  // does a built widget node currently hold any value? (for live 已填/待填)
  function hasValue(node) {
    if (!node) return false;
    if (node.classList.contains('fw-tags') || node.classList.contains('fw-chips')) return node.querySelectorAll('.fw-tag, .fw-chip').length > 0;
    if (node.classList.contains('fw-palette')) return node.querySelectorAll('.fw-swcard').length > 0;
    if (node.classList.contains('fw-list')) return [].some.call(node.querySelectorAll('.fw-rowinput'), function (i) { return i.value.trim(); });
    if (node.classList.contains('fw-kv')) return [].some.call(node.querySelectorAll('.fw-kvv, .fw-kvk'), function (i) { return i.value.trim(); });
    if (node.classList.contains('fw-image')) return !node.querySelector('.fw-imgthumb.empty');
    if (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA') return !!node.value.trim();
    var inp = node.querySelector && node.querySelector('input, textarea');
    return inp ? !!inp.value.trim() : false;
  }

  // a labelled field block (label + status + optional hint + widget)
  // o: { label, hint, required, optional, vis, widget, onRemove }
  function fieldBlock(o) {
    var b = el('div', 'ed-field');
    var head = el('div', 'ed-flabel');
    var lab = el('label', null, o.label + (o.vis && window.OCChar ? ' ' + OCChar.visBadge(o.vis) : ''));
    var status = el('span', 'ed-fstatus');
    head.appendChild(lab); head.appendChild(status);
    b.appendChild(head);
    if (o.hint) b.appendChild(el('div', 'ed-hint', o.hint));
    b.appendChild(o.widget);
    if (o.onRemove) { var rm = el('button', 'fw-fieldremove', ic('x') + ' 移除欄位'); rm.type = 'button'; rm.onclick = o.onRemove; b.appendChild(rm); }

    function refresh() {
      var filled = hasValue(o.widget);
      if (filled) { b.dataset.state = 'filled'; status.className = 'ed-fstatus filled'; status.innerHTML = ic('check') + '已填'; }
      else if (o.required) { b.dataset.state = 'req'; status.className = 'ed-fstatus req'; status.textContent = '待填'; }
      else { b.dataset.state = 'opt'; status.className = 'ed-fstatus opt'; status.textContent = '選填'; }
    }
    refresh();
    b.addEventListener('input', refresh);
    b.addEventListener('change', refresh);
    b._refresh = refresh;
    return b;
  }

  window.OCFields = { TYPES: TYPES, PRESETS: PRESETS, widget: widget, fieldBlock: fieldBlock, hasValue: hasValue };
})();
