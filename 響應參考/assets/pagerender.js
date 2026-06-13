/* ============================================================
   PB0 — shared block tree renderer. Used by Builder canvas AND
   Public Renderer so both honor the same Block Registry contract.
   renderTree(node, dataRef, opts) → HTML string.
   opts.builder = true adds selection wrappers + lock badges.
   Blocks bind to EXISTING data via OCData.resolveBinding (render-only).
   ============================================================ */
(function () {
  var GAP = { sm: '10px', md: '18px', lg: '28px' };
  var PAD = { sm: '14px', md: '26px', lg: '40px' };

  function esc(s) { return (s == null ? '' : String(s)).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  function renderTree(node, dataRef, opts) {
    opts = opts || {};
    return node.children ? node.children.map(function (c) { return renderNode(c, dataRef, opts); }).join('') : '';
  }

  function wrap(node, inner, opts, extraTag) {
    if (!opts.builder) return inner;
    var lock = node.lock || {};
    var badge = (lock.locked || lock.required) ? '<span class="cv-lockbadge">' + (lock.locked ? OCIcon('lock') + ' 鎖定' : '＊ 必填') + '</span>' : '';
    return '<div class="cv-block" data-bid="' + node._id + '">' + '<span class="cv-tag">' + (extraTag || OCData.blockLabel(node.type)) + '</span>' + badge + inner + '</div>';
  }

  // assign stable ids for builder selection
  var _idc = 0;
  function ensureIds(node) { node._id = node._id || ('n' + (++_idc)); (node.children || []).forEach(ensureIds); }

  function renderNode(node, dataRef, opts) {
    var p = node.props || {};
    var inner;
    switch (node.type) {
      case 'page':
        return '<div style="--accent:' + (p.accent || '#3B5E6B') + '">' + renderTree(node, dataRef, opts) + '</div>';
      case 'section':
        inner = '<section class="rnd-section" style="padding:' + (PAD[p.pad] || PAD.md) + ' 20px">' + renderTree(node, dataRef, opts) + '</section>';
        break;
      case 'stack':
        inner = '<div style="display:flex;flex-direction:column;gap:' + (GAP[p.gap] || GAP.md) + ';align-items:' + (p.align === 'center' ? 'center' : p.align === 'end' ? 'flex-end' : 'flex-start') + '">' + renderTree(node, dataRef, opts) + '</div>';
        break;
      case 'grid':
        inner = '<div style="display:grid;grid-template-columns:repeat(' + (opts.vp === 'mobile' ? 1 : (p.cols || 2)) + ',1fr);gap:' + (GAP[p.gap] || GAP.md) + '">' + renderTree(node, dataRef, opts) + '</div>';
        break;
      case 'heading': {
        var hv = bindVal(p.bind, dataRef, p.text);
        if (hv.broken) { inner = brokenOrMissing(hv, opts); break; }
        var sz = { xl: '34px', lg: '26px', md: '20px', sm: '16px' }[p.size] || '24px';
        var hstyle = p.variant === 'note' ? 'font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.7;font-weight:400'
          : 'font-family:var(--font-serif);font-weight:800;font-size:' + sz;
        inner = '<h2 style="margin:0;color:inherit;' + hstyle + '">' + esc(hv.value || p.text || '標題') + '</h2>';
        break;
      }
      case 'text': {
        var tv = bindVal(p.bind, dataRef, p.text);
        if (tv.broken) { inner = brokenOrMissing(tv, opts); break; }
        var tstyle = p.variant === 'quote' ? 'font-size:16px;line-height:1.8;font-style:italic;border-left:3px solid var(--accent);padding-left:14px;color:inherit;opacity:.92'
          : 'font-size:15px;line-height:1.8;color:inherit;opacity:.85';
        inner = '<p style="margin:0 0 10px;' + tstyle + ';text-wrap:pretty">' + esc(tv.value || p.text || '') + '</p>';
        break;
      }
      case 'image': {
        inner = '<div style="aspect-ratio:4/3;border-radius:10px;background:linear-gradient(135deg,#8FA3B0,#5E7E55);display:grid;place-items:center;color:rgba(255,255,255,.85);font-size:12px">圖片</div>';
        break;
      }
      case 'project_logo': {
        var lv = bindVal(p.bind, dataRef, '');
        if (lv.broken) { inner = brokenOrMissing(lv, opts); break; }
        var pr = OCData.project((dataRef || {}).projectId) || {};
        inner = '<div style="display:inline-flex;align-items:center;gap:8px;font-family:var(--font-mono);font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--text-faint)"><span style="width:18px;height:18px;border-radius:5px;background:' + (pr.c || '#888') + '"></span>' + esc(pr.name || '') + '</div>';
        break;
      }
      case 'heading_done': inner = ''; break;
      case 'character_profile': {
        var c = OCData.entity((dataRef || {}).characterId);
        if (!c) { inner = brokenOrMissing({ broken: true, reason: '角色資料遺失' }, opts); break; }
        var fields = p.fields || ['summary', 'species'];
        inner = '<div style="display:flex;gap:14px;align-items:flex-start"><span style="width:56px;height:56px;border-radius:50%;background:' + c.c + ';display:grid;place-items:center;color:#fff;font-family:var(--font-serif);font-size:24px;font-weight:800;flex:none">' + esc(c.name[0]) + '</span><div><div style="font-family:var(--font-serif);font-size:20px;font-weight:800">' + esc(c.name) + '</div><div style="font-size:13.5px;color:var(--text-dim);line-height:1.6;margin-top:4px">' + esc(c.blurb || '') + '</div><div style="font-size:11.5px;color:var(--text-faint);margin-top:4px">' + esc(c.sp || '') + '</div></div></div>';
        break;
      }
      case 'project_fields': {
        var l = OCData.links.filter(function (x) { return x.id === (dataRef || {}).linkId; })[0];
        if (!l) { inner = brokenOrMissing({ broken: true, reason: '企劃角色連結遺失' }, opts); break; }
        var fac = (OCData.factionsOf(l.project) || []).filter(function (f) { return f.id === l.faction; })[0];
        inner = '<div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center">'
          + '<span style="font-size:12px;font-weight:600;padding:4px 11px;border-radius:var(--r-pill);background:var(--surface-2);border:1px solid var(--border)">' + esc((fac || {}).name || '未分組') + '</span>'
          + '<span style="font-size:12px;font-weight:600;padding:4px 11px;border-radius:var(--r-pill);background:var(--surface-2);border:1px solid var(--border)">' + esc(l.projectRole || '') + '</span></div>';
        break;
      }
      case 'color_palette': {
        var pv = OCData.resolveBinding({ source: 'character', field: 'palette' }, dataRef);
        var pal = (pv.value || []);
        if (!pal.length) { inner = '<div class="cv-missing">尚無色票資料</div>'; break; }
        inner = '<div style="display:flex;gap:8px;flex-wrap:wrap">' + pal.map(function (c) { return '<span style="display:flex;align-items:center;gap:6px;border:1px solid var(--border);border-radius:var(--r-pill);padding:4px 11px 4px 5px;font-size:11px"><span style="width:20px;height:20px;border-radius:50%;background:' + c[1] + '"></span>' + esc(c[0]) + '</span>'; }).join('') + '</div>';
        break;
      }
      case 'gallery': {
        var rows = (dataRef || {}).characterId ? OCData.assetsForTarget('character', dataRef.characterId, { role: 'gallery' }) : [];
        if (!rows.length) { inner = '<div class="cv-missing">尚無圖庫圖片</div>'; break; }
        inner = '<div style="display:grid;grid-template-columns:repeat(' + (opts.vp === 'mobile' ? 2 : 3) + ',1fr);gap:10px">' + rows.map(function (r) { return '<div style="aspect-ratio:4/5;border-radius:8px;background:linear-gradient(135deg,' + (r.asset.c || '#888') + ',#3B5E6B)"></div>'; }).join('') + '</div>';
        break;
      }
      case 'link_button':
        inner = '<a href="' + esc(p.href || '#') + '" style="display:inline-block;background:var(--text);color:#fff;font-size:13.5px;font-weight:600;padding:9px 18px;border-radius:var(--r-btn);text-decoration:none">' + esc(p.label || '按鈕') + '</a>';
        break;
      case 'divider': inner = '<hr style="border:none;border-top:1px solid var(--border);margin:8px 0">'; break;
      case 'spacer': inner = '<div style="height:' + (p.h || 24) + 'px"></div>'; break;
      default: inner = '<div class="cv-missing">未知區塊：' + esc(node.type) + '</div>';
    }
    return wrap(node, inner, opts);
  }

  function bindVal(bind, dataRef, fallback) {
    if (!bind) return { value: fallback };
    var r = OCData.resolveBinding(bind, dataRef || {});
    if (!r.ok) return { broken: true, reason: r.reason };
    return { value: r.value };
  }
  function brokenOrMissing(r, opts) {
    // Public Renderer (non-builder) must NOT leak engineering path/ID/errors.
    if (opts && !opts.builder) return '';
    if (r.broken) return '<div class="cv-broken">⚠ 資料綁定失效：' + esc(r.reason || '來源不存在') + '<button class="btn btn-sm" style="margin-left:8px" data-rebind>重新綁定</button></div>';
    return '<div class="cv-missing">尚無資料</div>';
  }

  window.OCPage = { renderTree: renderTree, renderNode: renderNode, ensureIds: ensureIds, esc: esc };
})();
