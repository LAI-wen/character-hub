/* ============================================================
   CharacterHub — 角色頁「一般」首屏 探索渲染器
   renderHeroHTML(density, mode) → 完整 inner HTML 字串
     density: 'clean' | 'mid' | 'full'
     mode:    'full'  (完整立繪)  |  'avatar' (僅頭像)
   單一資料來源，同一套模組，依密度與模式重新編排。
   ============================================================ */
(function () {
  // ---------- 單一資料來源（取自 oc-reference.md） ----------
  const C = {
    name: '宵霧', romaji: 'YOIGIRI', reading: 'よいぎり', nick: 'Yoi',
    species: '妖狐', speciesEn: 'Kitsune',
    aka: '守燈的狐 · 三尾', akaEn: 'The Lantern Fox',
    taglineZh: '在無人的夜路，<br>替迷途者點一盞燈。',
    taglineEn: 'Lights a single lantern for the lost on empty night roads.',
    tags: ['沉靜', '守護', '毒舌', '夜行', '茶癮'],
  };
  const FIELDS = [
    ['身高', 'Height', '168 cm'],
    ['年齡', 'Age', '不詳（約 19）'],
    ['稱呼', 'Pronoun', '他／她皆可'],
    ['種族', 'Species', '妖狐'],
    ['尾巴', 'Tails', '三尾'],
    ['生日', 'Birthday', '11 / 07'],
  ];
  const SWATCHES = [
    { grp: 'Hair', nm: '霧灰藍', rom: 'KIRI-ASAGI', hex: '#8FA3B0', note: '主髮色' },
    { grp: 'Hair', nm: '雪白', rom: 'HAKU', hex: '#F2F4F5', note: '髮尾漸層' },
    { grp: 'Eyes', nm: '琥珀金', rom: 'KOHAKU', hex: '#E0A23B', note: '虹膜' },
    { grp: 'Eyes', nm: '深栗', rom: 'KOGECHA', hex: '#6B4A1E', note: '瞳孔 · 眼線' },
    { grp: 'Accent', nm: '緋紅', rom: 'KARAKURENAI', hex: '#C8463C', note: '燈籠繩 · 內裡' },
    { grp: 'Accent', nm: '古金', rom: 'YAMABUKI', hex: '#D4A84B', note: '耳環 · 紋飾' },
  ];
  const EXPR = ['平靜', '微笑', '毒舌', '怒', '羞'];
  // 圖上標記（必畫重點 → 帶引導線的編號標註，座標為百分比）
  const CALLOUTS = [
    { n: 1, x: 50, y: 22, side: 'r', nm: '琥珀金瞳孔', en: 'Amber eyes' },
    { n: 2, x: 42, y: 30, side: 'l', nm: '左眼下淚痣', en: 'Tear mole · LEFT' },
    { n: 3, x: 66, y: 26, side: 'r', nm: '右耳古金耳環', en: 'Gold ring' },
    { n: 4, x: 30, y: 60, side: 'l', nm: '緋紅燈籠繩', en: 'Crimson cord' },
    { n: 5, x: 70, y: 70, side: 'r', nm: '三尾 · 尾端雪白', en: 'Three tails' },
  ];

  const isLight = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150;
  };

  // ---------- 共用小元件 ----------
  function verticalName() {
    return `<div class="eh-namerow">
      <div class="eh-romaji">${C.romaji} · ${C.reading}</div>
      <div class="eh-name">${C.name}</div>
    </div>`;
  }
  function kicker() {
    return `<div class="eh-kicker">
      <span class="pill eh-species">${C.species} ${C.speciesEn}</span>
      <span class="priv public"><span class="d"></span>公開 Public</span>
    </div>`;
  }
  function tagline() {
    return `<p class="eh-tagline">${C.taglineZh}<span class="en">${C.taglineEn}</span></p>`;
  }
  function tags() {
    return `<div class="eh-tags">${C.tags.map(t => `<span class="pill">#${t}</span>`).join('')}</div>`;
  }
  function aka() {
    return `<div class="eh-aka">別名 ${C.aka}　/　aka. ${C.akaEn}</div>`;
  }

  function moduleHead(ix, zh, en, note) {
    return `<div class="eh-mh">
      ${ix ? `<span class="eh-ix">${ix}</span>` : ''}
      <h3>${zh}</h3><span class="en">${en}</span>
      <span class="eh-rule"></span>
      ${note ? `<span class="eh-note">${note}</span>` : ''}
    </div>`;
  }

  function statList(compact) {
    const rows = FIELDS.map(([k, en, v]) =>
      `<div class="eh-field"><span class="k">${k}<span class="en">${en}</span></span><span class="v">${v}</span></div>`
    ).join('');
    return `<div class="eh-stats ${compact ? 'compact' : ''}">${rows}</div>`;
  }

  // 清爽：一橫排小色塊＋hex
  function swatchStrip() {
    return `<div class="eh-swstrip">${SWATCHES.map(s =>
      `<div class="eh-swcell" data-hex="${s.hex}"><span class="chip" style="background:${s.hex}"></span><span class="hx">${s.hex}</span></div>`
    ).join('')}</div>`;
  }
  // 中等／滿版：附色名的色票卡
  function swatchChips() {
    return `<div class="eh-swgrid">${SWATCHES.map((s, i) =>
      `<div class="eh-swchip" data-hex="${s.hex}">
        <span class="chip" style="background:${s.hex}"></span>
        <span class="meta"><span class="idx">${String(i + 1).padStart(2, '0')} · ${s.grp}</span><span class="nm">${s.nm}</span><span class="hx">${s.hex}</span></span>
      </div>`
    ).join('')}</div>`;
  }
  function exprRow(n) {
    return `<div class="eh-exprs">${EXPR.slice(0, n || EXPR.length).map(e =>
      `<div class="ph" data-label="${e}"></div>`
    ).join('')}</div>`;
  }
  // 滿版：圖上編號 pin（名稱對應到右欄必畫清單）
  function calloutsOverlay() {
    return CALLOUTS.map(c =>
      `<span class="eh-co-pin" data-mk="${c.n}" style="left:${c.x}%;top:${c.y}%">${c.n}</span>`
    ).join('');
  }
  function mustList() {
    return `<div class="eh-must">${CALLOUTS.map(c =>
      `<div class="eh-must-row" data-mk="${c.n}"><span class="n">${c.n}</span><span class="t">${c.nm}<span class="en">${c.en}</span></span></div>`
    ).join('')}</div>`;
  }

  function topbar(mode) {
    return `<div class="eh-top">
      <div class="eh-brand"><span class="eh-mk">霧</span>CharacterHub</div>
      <span class="eh-crumb">/ <b>@yoi-studio</b> / 宵霧</span>
      <span class="eh-sp"></span>
      <div class="modetoggle"><button class="opt on">一般 General</button><button class="opt commission">委託 Commission</button></div>
      <span class="eh-mode-note">${mode === 'avatar' ? '僅頭像版' : '完整立繪版'}</span>
    </div>`;
  }

  // ---------- 立繪舞台 ----------
  function stageFull(density) {
    const overlay = density === 'full' ? calloutsOverlay() : '';
    const dots = density !== 'clean'
      ? `<div class="eh-dots"><i class="on"></i><i></i><i></i><i></i><i></i></div>` : '';
    return `<div class="eh-stage">
      <div class="ph eh-illu" data-label="主立繪 · MAIN">${overlay}${dots}</div>
      ${density !== 'clean' ? `<div class="eh-thumbs">${['巫裝', '微笑', '尾巴', '委託'].map(t => `<div class="ph" data-label="${t}"></div>`).join('')}</div>` : ''}
    </div>`;
  }

  // ====================================================================
  //  立繪模式：左識別 / 中立繪 / 右規格
  // ====================================================================
  function heroFull(density) {
    let specs = '';
    if (density === 'clean') {
      specs = `<div class="eh-specs">
        ${moduleHead('', '基本資料', 'Profile')}${statList(true)}
        ${moduleHead('', '色票', 'Palette', '點擊複製')}${swatchStrip()}
      </div>`;
    } else if (density === 'mid') {
      specs = `<div class="eh-specs">
        ${moduleHead('01', '基本資料', 'Profile')}${statList(true)}
        ${moduleHead('02', '色票', 'Palette', '點擊複製')}${swatchChips()}
        ${moduleHead('03', '表情差分', 'Expressions')}${exprRow(5)}
      </div>`;
    } else {
      specs = `<div class="eh-specs">
        ${moduleHead('02', '色票', 'Palette', '#COLOR')}${swatchChips()}
        ${moduleHead('03', '必畫重點', 'Must-draw')}${mustList()}
        ${moduleHead('04', '表情差分', 'Expressions')}${exprRow(5)}
      </div>`;
    }

    const identity = `<div class="eh-identity">
      ${verticalName()}
      <div class="eh-idmeta">
        ${kicker()}${aka()}${tagline()}${tags()}
        ${density === 'full' ? `<div class="eh-stats-mini">${moduleHead('01', '基本資料', 'Profile')}${statList(true)}</div>` : ''}
      </div>
    </div>`;

    const deco = density === 'full'
      ? `<div class="eh-bigtype">character&nbsp;sheet</div><div class="eh-corner tl"></div><div class="eh-corner br"></div><div class="eh-credit">No.01 · 漂浮之旅　<b>@yoi-studio</b></div>`
      : '';

    return `<section class="eh-hero ${density}" data-mode="full">
      ${deco}
      ${identity}
      ${stageFull(density)}
      ${specs}
    </section>`;
  }

  // ====================================================================
  //  頭像模式：頂部頭像＋識別帶 / 下方模組網格（無高立繪，不會留白）
  // ====================================================================
  function heroAvatar(density) {
    if (density === 'clean') {
      return `<section class="eh-hero-av clean" data-mode="avatar">
        <div class="eh-av-head center">
          <div class="ph eh-avatar" data-label="頭像"></div>
          <div class="eh-av-id">
            ${kicker()}
            <h2 class="eh-av-name">${C.name}<span class="rom">${C.romaji} · ${C.reading}</span></h2>
            ${tagline()}${tags()}
          </div>
        </div>
        <div class="eh-av-grid two">
          <div>${moduleHead('', '基本資料', 'Profile')}${statList(false)}</div>
          <div>${moduleHead('', '色票', 'Palette', '點擊複製')}${swatchChips()}</div>
        </div>
      </section>`;
    }
    if (density === 'mid') {
      return `<section class="eh-hero-av mid" data-mode="avatar">
        <div class="eh-av-head left">
          <div class="ph eh-avatar" data-label="頭像"></div>
          <div class="eh-av-id">
            ${kicker()}
            <h2 class="eh-av-name">${C.name}<span class="rom">${C.romaji} · ${C.reading}</span></h2>
            ${aka()}${tagline()}${tags()}
          </div>
        </div>
        <div class="eh-av-grid three">
          <div>${moduleHead('01', '基本資料', 'Profile')}${statList(false)}</div>
          <div>${moduleHead('02', '色票', 'Palette', '點擊複製')}${swatchChips()}</div>
          <div>${moduleHead('03', '表情差分', 'Expressions')}<div class="eh-exprs col">${EXPR.map(e => `<div class="ph" data-label="${e}"></div>`).join('')}</div></div>
        </div>
      </section>`;
    }
    // full
    return `<section class="eh-hero-av full" data-mode="avatar">
      <div class="eh-bigtype">character&nbsp;sheet</div>
      <div class="eh-corner tl"></div><div class="eh-corner br"></div>
      <div class="eh-av-head left">
        <div class="eh-av-stamp"><div class="ph eh-avatar" data-label="頭像"></div><span class="eh-av-tape"></span></div>
        <div class="eh-av-id">
          <div class="eh-romaji-h">${C.romaji} · ${C.reading}</div>
          <h2 class="eh-av-name big">${C.name}</h2>
          ${kicker()}${aka()}${tagline()}${tags()}
        </div>
      </div>
      <div class="eh-av-grid three">
        <div>${moduleHead('01', '基本資料', 'Profile')}${statList(false)}</div>
        <div>${moduleHead('02', '色票', 'Palette', '#COLOR')}${swatchChips()}</div>
        <div>${moduleHead('03', '必畫重點', 'Must-draw')}${mustList()}</div>
      </div>
      <div class="eh-credit">No.01 · 漂浮之旅　<b>@yoi-studio</b></div>
    </section>`;
  }

  window.renderHeroHTML = function (density, mode) {
    const hero = mode === 'avatar' ? heroAvatar(density) : heroFull(density);
    return `<div class="eh-root">${topbar(mode)}${hero}</div>`;
  };
})();
