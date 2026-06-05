/* ============================================================
   CharacterHub — shared interactivity
   Plain global helpers (no modules). Safe inside sandboxed iframes.
   ============================================================ */
(function () {
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
