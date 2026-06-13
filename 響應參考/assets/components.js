/* ============================================================
   CharacterHub — components.js
   Tiny vanilla helpers for the shared interactive components:
   Toast, Modal, Confirm dialog, plus markup builders for Context
   Header / Page Header / state blocks / loading skeletons.
   No framework, no data layer. Load AFTER components.css.
   Every "save" here is Demo interaction only.
   ============================================================ */
(function () {
  function el(tag, cls, html) { var n = document.createElement(tag); if (cls) n.className = cls; if (html != null) n.innerHTML = html; return n; }

  // ---------- Toast ----------
  function toast(msg, opts) {
    opts = opts || {};
    var host = document.getElementById('oc-toast-host');
    if (!host) { host = el('div'); host.id = 'oc-toast-host'; host.setAttribute('role', 'status'); host.setAttribute('aria-live', 'polite'); host.setAttribute('aria-atomic', 'false'); document.body.appendChild(host); }
    var t = el('div', 'oc-toast');
    t.innerHTML = msg + (opts.demo ? '<span class="demo">demo</span>' : '');
    host.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('in'); });
    setTimeout(function () { t.classList.remove('in'); setTimeout(function () { t.remove(); }, 240); }, opts.ms || 2200);
  }

  // ---------- Modal ----------
  // OCUI.modal({ title, body(node|html), actions:[{label,kind,onClick,close}], onClose })
  function modal(cfg) {
    cfg = cfg || {};
    var scrim = el('div', 'oc-modal-scrim');
    var box = el('div', 'oc-modal');
    var head = el('div', 'mh', '<div class="mt">' + (cfg.title || '') + '</div>');
    var x = el('button', 'mx', '✕'); head.appendChild(x);
    var body = el('div', 'mb');
    if (cfg.body instanceof Node) body.appendChild(cfg.body); else body.innerHTML = cfg.body || '';
    box.appendChild(head); box.appendChild(body);
    function close() { scrim.classList.remove('in'); setTimeout(function () { scrim.remove(); }, 180); document.removeEventListener('keydown', onKey); if (cfg.onClose) cfg.onClose(); }
    if (cfg.actions && cfg.actions.length) {
      var foot = el('div', 'mf');
      cfg.actions.forEach(function (a) {
        var b = el('button', 'btn ' + (a.kind === 'primary' ? 'btn-primary' : a.kind === 'accent' ? 'btn-accent' : a.kind === 'danger' ? 'btn' : ''), a.label);
        if (a.kind === 'danger') { b.style.borderColor = 'var(--avoid)'; b.style.color = 'var(--avoid)'; }
        b.onclick = function () { var keep = a.onClick && a.onClick(); if (a.close !== false && !keep) close(); };
        foot.appendChild(b);
      });
      box.appendChild(foot);
    }
    x.onclick = close;
    scrim.addEventListener('click', function (e) { if (e.target === scrim) close(); });
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    if (cfg.title) box.setAttribute('aria-label', cfg.title);
    var lastFocus = document.activeElement;
    function onKey(e) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab') return;
      var foc = Array.prototype.filter.call(box.querySelectorAll('button, [tabindex], input, select, textarea, a[href]'), function (n) { return !n.disabled && n.offsetParent !== null; });
      if (!foc.length) return;
      var first = foc[0], last = foc[foc.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    var origClose = close;
    close = function () { origClose(); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
    scrim.appendChild(box); document.body.appendChild(scrim);
    requestAnimationFrame(function () { scrim.classList.add('in'); var f = box.querySelector('button.btn-primary, button.btn-accent, input,textarea,select,button.btn'); if (f && f.focus) f.focus(); });
    return { close: close, box: box };
  }

  // ---------- Confirm ----------
  function confirmDialog(cfg) {
    cfg = cfg || {};
    return modal({
      title: cfg.title || '確認',
      body: '<p style="margin:0">' + (cfg.message || '確定要執行嗎？') + '</p>',
      actions: [
        { label: cfg.cancelLabel || '取消' },
        { label: cfg.confirmLabel || '確認', kind: cfg.danger ? 'danger' : 'primary', onClick: function () { if (cfg.onConfirm) cfg.onConfirm(); } },
      ],
      onClose: cfg.onClose,
    });
  }

  // ---------- markup builders ----------
  // Context Header — scope: 'account'|'project'|'public'
  function contextHeader(o) {
    o = o || {};
    var scopeLabel = { account: '我的空間 · Account', project: '目前企劃 · Project', public: '公開頁 · Public' }[o.scope] || '';
    var crumbs = (o.crumbs || []).map(function (c, i, a) {
      return i === a.length - 1 ? '<span class="cur">' + c + '</span>' : '<b>' + c + '</b>';
    }).join('<span class="sep">/</span>');
    return '<div class="ctxh"><span class="scope ' + o.scope + '"><span class="d"></span>' + scopeLabel + '</span>'
      + (crumbs ? '<span class="crumb">' + crumbs + '</span>' : '') + '</div>';
  }

  // state blocks
  var ICONS = {
    empty: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 9h16M9 14h6"/></svg>',
    error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 4.3 2.5 18a2 2 0 0 0 1.7 3h15.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z"/></svg>',
    forbidden: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v6M15 2v6M7 8h10v3a5 5 0 0 1-10 0V8ZM12 16v6"/></svg>',
  };
  function stateBlock(kind, o) {
    o = o || {};
    var btn = o.ctaLabel ? '<button class="btn btn-accent" data-state-cta>' + o.ctaLabel + '</button>' : '';
    var code = o.code ? '<div class="code">' + o.code + '</div>' : '';
    var html = '<div class="state ' + (kind === 'empty' ? '' : kind) + '"><div class="ic">' + (ICONS[o.icon] || ICONS[kind] || ICONS.empty) + '</div>'
      + '<div class="ti">' + (o.title || '') + '</div>'
      + (o.body ? '<p class="bd">' + o.body + '</p>' : '') + code + btn + '</div>';
    var wrap = el('div', '', html);
    if (o.onCta) { var b = wrap.querySelector('[data-state-cta]'); if (b) b.onclick = o.onCta; }
    return wrap.firstChild;
  }
  function emptyState(o) { return stateBlock('empty', o); }
  function errorState(o) { return stateBlock('error', Object.assign({ code: 'ERROR', title: '載入時發生問題。' }, o || {})); }
  function forbiddenState(o) { return stateBlock('forbidden', Object.assign({ code: 'FORBIDDEN · 403', title: '你沒有權限檢視這個頁面。' }, o || {})); }

  function skeletonCards(n) {
    var g = el('div', 'skel-grid');
    for (var i = 0; i < (n || 6); i++) {
      g.appendChild(el('div', 'skel-card',
        '<div class="skel-row"><div class="skel av"></div><div style="flex:1"><div class="skel ln w70" style="margin-bottom:7px"></div><div class="skel ln w40"></div></div></div>'
        + '<div class="skel ln w90"></div><div class="skel ln w50"></div>'));
    }
    return g;
  }

  // ---------- inline SVG icon set (replaces emoji used as UI glyphs) ----------
  // 16px stroke icons drawn on currentColor. Usage: OCIcon('lock') → '<svg…>'
  // OCIcon('lock', 'cls') adds a class. Sized via font-size/width on the parent.
  var ICON_PATHS = {
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
    unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 16l-5-5-7 7"/>',
    images: '<rect x="7" y="3" width="14" height="12" rx="2"/><path d="M3 8v11a2 2 0 0 0 2 2h12"/><circle cx="11" cy="7.5" r="1.3"/><path d="M21 12l-4-4-6 5"/>',
    link: '<path d="M9 15l6-6"/><path d="M11 6.5l1-1a4 4 0 0 1 5.7 5.7l-2 2"/><path d="M13 17.5l-1 1a4 4 0 0 1-5.7-5.7l2-2"/>',
    book: '<path d="M5 4h10a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2H5Z"/><path d="M5 4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2"/>',
    tag: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9Z"/><circle cx="8" cy="8" r="1.4"/>',
    palette: '<circle cx="13" cy="12" r="9"/><circle cx="9" cy="9" r="1.2"/><circle cx="13.5" cy="7.5" r="1.2"/><circle cx="17" cy="11" r="1.2"/><path d="M13 21a3 3 0 0 0 0-6 2 2 0 0 1 0-4"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.3"/><rect x="14" y="3" width="7" height="7" rx="1.3"/><rect x="3" y="14" width="7" height="7" rx="1.3"/><rect x="14" y="14" width="7" height="7" rx="1.3"/>',
    nodes: '<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="7" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M8 7l8 .5M7 8l4 8M17 9l-4 7"/>',
    user: '<circle cx="12" cy="8" r="3.4"/><path d="M5 20a7 7 0 0 1 14 0"/>',
    users: '<circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2 20a6 6 0 0 1 12 0M15 14a5 5 0 0 1 6 5"/>',
    mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1.5"/><path d="M5 9v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9M10 13h4"/>',
    chat: '<path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"/>',
    quote: '<path d="M8 7C5.5 8 4 10.5 4 13.5V17h5v-5H6.5C6.5 9.5 7.5 8.3 9 8Zm10 0c-2.5 1-4 3.5-4 6.5V17h5v-5h-2.5c0-2.5 1-3.7 2.5-4Z"/>',
    edit: '<path d="M14 5l5 5M4 20l1-4L16 5a2 2 0 0 1 3 0l0 0a2 2 0 0 1 0 3L8 19l-4 1Z"/>',
    sparkle: '<path d="M12 3l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5Z"/><path d="M18 14l1 2.5L21.5 18 19 19l-1 2.5L17 19l-2.5-1L17 16.5Z"/>',
    monitor: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    tablet: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M11 18h2"/>',
    phone: '<rect x="7" y="3" width="10" height="18" rx="2.4"/><path d="M11 18h2"/>',
    text: '<path d="M5 6h14M5 12h14M5 18h9"/>',
    paragraph: '<path d="M9 4h8M13 4v16M9 4a4 4 0 0 0 0 8h4"/>',
    hash: '<path d="M9 4L7 20M17 4l-2 16M5 9h14M4 15h14"/>',
    radio: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/>',
    check: '<path d="M4 12l5 5L20 6"/>',
    checkbox: '<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 12l3 3 5-5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    warn: '<path d="M12 4l9 16H3L12 4Z"/><path d="M12 10v4M12 18h.01"/>',
    ban: '<circle cx="12" cy="12" r="8.5"/><path d="M6.5 6.5l11 11"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    dot: '<circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none"/>',
    section: '<path d="M5 12h14"/>',
    swatch: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M12 4v16"/>',
    columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
    gridsm: '<rect x="3" y="3" width="8" height="8" rx="1.3"/><rect x="13" y="3" width="8" height="8" rx="1.3"/><rect x="3" y="13" width="8" height="8" rx="1.3"/><rect x="13" y="13" width="8" height="8" rx="1.3"/>',
    block: '<rect x="4" y="4" width="16" height="16" rx="2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
    heart: '<path d="M12 20s-7-4.3-9.3-8.5C1 8 3 5 6 5c2 0 3 1.2 4 2.5C11 6.2 12 5 14 5c3 0 5 3 3.3 6.5C19 15.7 12 20 12 20Z"/>',
    swords: '<path d="M4 4l8 8M3 7l3-3 2 2M14 12l6 6M20 17l-3 3-2-2M14 12l6-6M20 7l-3-3-2 2"/>',
    home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v9h12v-9"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
    'chevron-right': '<path d="M9 5l7 7-7 7"/>',
    box: '<path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7M12 11v10"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  };
  function OCIcon(name, cls) {
    var p = ICON_PATHS[name] || ICON_PATHS.dot;
    return '<svg class="ocic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
  }

  window.OCUI = {
    el: el, toast: toast, modal: modal, confirm: confirmDialog,
    contextHeader: contextHeader,
    emptyState: emptyState, errorState: errorState, forbiddenState: forbiddenState,
    skeletonCards: skeletonCards, icon: OCIcon,
  };
  window.OCIcon = OCIcon;
  // convenience global used by existing pages
  if (!window.toast) window.toast = function (m) { toast(m); };
})();
