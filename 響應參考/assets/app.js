/* ============================================================
   CharacterHub — shared interactivity
   Plain global helpers (no modules). Safe inside sandboxed iframes.
   ============================================================ */
(function () {
  // ---- appearance: apply persisted theme + accent site-wide, ASAP ----
  // Default = 灰白黃 (grey-white neutrals + gold-yellow accent), matching ds.css.
  window.AppTheme = (function () {
    const THEMES = {
      soft:  { '--bg':'#F2F2F4','--bg-tint':'#EAEAEE','--surface':'#FFFFFF','--surface-2':'#F8F8FA','--border':'#E1E1E5','--border-strong':'#CFCFD5' }, // 柔灰：偏灰、對比稍強
      gray:  { '--bg':'#F7F7F8','--bg-tint':'#F0F0F2','--surface':'#FFFFFF','--surface-2':'#FAFAFB','--border':'#E6E6E9','--border-strong':'#D5D5DA' }, // 灰白：預設
      light: { '--bg':'#FCFCFD','--bg-tint':'#F4F4F6','--surface':'#FFFFFF','--surface-2':'#FDFDFE','--border':'#ECECEF','--border-strong':'#DEDEE2' }, // 淡白：更淡、更通透
    };
    const ACCENTS = {
      '#A67F0E': { soft:'#FBF2CC', ink:'#6F560A' }, // 灰白黃（預設）
      '#B8890C': { soft:'#FCF3C9', ink:'#7C5D06' }, // 明黃
      '#2E6F6A': { soft:'#E4EEEC', ink:'#1E4B47' }, // 霧夜青
      '#C2702C': { soft:'#F6E9DA', ink:'#8A4E18' }, // 燈火橘
      '#54555A': { soft:'#ECECEE', ink:'#333438' }, // 墨灰
    };
    const DEFAULT_THEME = 'gray', DEFAULT_ACCENT = '#A67F0E';
    const S = () => document.documentElement.style;
    function applyTheme(t) { const m = THEMES[t] || THEMES[DEFAULT_THEME]; for (const k in m) S().setProperty(k, m[k]); }
    function applyAccent(c) { const a = ACCENTS[c] ? c : DEFAULT_ACCENT, d = ACCENTS[a]; S().setProperty('--accent', a); S().setProperty('--accent-soft', d.soft); S().setProperty('--accent-ink', d.ink); }
    function get() { let t, c; try { t = localStorage.getItem('ch:theme'); c = localStorage.getItem('ch:accent'); } catch (e) {} return { theme: THEMES[t] ? t : DEFAULT_THEME, accent: ACCENTS[c] ? c : DEFAULT_ACCENT }; }
    function save(t, c) { try { localStorage.setItem('ch:theme', t); localStorage.setItem('ch:accent', c); } catch (e) {} }
    function apply() { const g = get(); applyTheme(g.theme); applyAccent(g.accent); }
    apply(); // run immediately so a stored choice is in effect before paint
    return { THEMES, ACCENTS, DEFAULT_THEME, DEFAULT_ACCENT, applyTheme, applyAccent, get, save, apply };
  })();

  // ---- toast ----
  function host() {
    let h = document.getElementById('toast-host');
    if (!h) { h = document.createElement('div'); h.id = 'toast-host'; document.body.appendChild(h); }
    return h;
  }
  window.toast = function (msg, swatch) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = (swatch ? `<span class="sw" style="background:${swatch}"></span>` : '') + msg;
    host().appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    setTimeout(() => { t.classList.remove('in'); setTimeout(() => t.remove(), 250); }, 1500);
  };

  // ---- copy ----
  window.copyText = function (text) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).catch(() => {}); }
      else {
        const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove();
      }
    } catch (e) {}
  };

  // ---- swatch click-to-copy (.swatch[data-hex] / .cswatch[data-hex]) ----
  window.initSwatchCopy = function () {
    document.querySelectorAll('[data-hex]').forEach(el => {
      el.addEventListener('click', () => {
        const hex = el.getAttribute('data-hex');
        copyText(hex);
        toast(`已複製 <span class="mono">${hex}</span>`, hex);
        el.classList.add('copied');
        setTimeout(() => el.classList.remove('copied'), 900);
      });
    });
  };

  // ---- lightbox over a list of {label, sub} ----
  window.Lightbox = (function () {
    let items = [], idx = 0, box;
    function build() {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.innerHTML = `
        <button class="lb-close" aria-label="close">✕</button>
        <button class="lb-arrow l" aria-label="prev">‹</button>
        <button class="lb-arrow r" aria-label="next">›</button>
        <div class="lb-stage">
          <div class="ph lb-img" data-label=""><span class="ph-sub"></span></div>
          <div class="lb-cap"></div>
        </div>`;
      document.body.appendChild(box);
      box.querySelector('.lb-close').onclick = close;
      box.querySelector('.lb-arrow.l').onclick = e => { e.stopPropagation(); step(-1); };
      box.querySelector('.lb-arrow.r').onclick = e => { e.stopPropagation(); step(1); };
      box.addEventListener('click', e => { if (e.target === box) close(); });
      document.addEventListener('keydown', e => {
        if (!box.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'ArrowRight') step(1);
      });
    }
    function render() {
      const it = items[idx];
      const img = box.querySelector('.lb-img');
      img.setAttribute('data-label', it.label);
      img.querySelector('.ph-sub').textContent = `${idx + 1} / ${items.length}` + (it.sub ? ` · ${it.sub}` : '');
      box.querySelector('.lb-cap').innerHTML = `${it.label}` + (it.en ? ` <span class="en">${it.en}</span>` : '');
    }
    function step(d) { idx = (idx + d + items.length) % items.length; render(); }
    function open(list, i) { if (!box) build(); items = list; idx = i || 0; render(); box.classList.add('open'); }
    function close() { if (box) box.classList.remove('open'); }
    return { open, close };
  })();

  // ---- two-way hover sync between pins and a legend (data-mk="N") ----
  window.initMarkerSync = function (root) {
    root = root || document;
    const pins = root.querySelectorAll('[data-mk]');
    function setHi(n, on) {
      root.querySelectorAll(`[data-mk="${n}"]`).forEach(el => el.classList.toggle('hi', on));
    }
    pins.forEach(el => {
      const n = el.getAttribute('data-mk');
      el.addEventListener('mouseenter', () => setHi(n, true));
      el.addEventListener('mouseleave', () => setHi(n, false));
    });
  };

  document.addEventListener('DOMContentLoaded', function () {
    if (window.__autoInit !== false) { initSwatchCopy(); initMarkerSync(); }
  });
})();
