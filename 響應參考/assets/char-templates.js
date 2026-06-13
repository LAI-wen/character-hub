/* ============================================================
   CharacterHub — character form TEMPLATES + store.
   A character's 設定 is NOT a fixed schema. Structure comes from a
   template: ordered sections, each an ordered list of field defs.
   Field def: { id, label, type, required, hint, seed?, ph? }
     type ∈ text|textarea|tags|keyvalue|list|color|chips|image
     required: per-field, defined IN the template (creator's choice)
     seed: optional flat key to pre-fill from existing character data
   Users pick a starter, start blank, freely edit structure, and save
   their own templates (personal library, session-persisted).
   Load AFTER components.js. Before char-form.js / editor.
   ============================================================ */
(function () {
  var MINE_KEY = 'oc:tpl:mine:v1';
  function uid(p) { return (p || 'x') + Math.random().toString(36).slice(2, 8); }
  function f(id, label, type, o) { o = o || {}; return { id: id, label: label, type: type, required: !!o.req, hint: o.hint || '', seed: o.seed || null, ph: o.ph || '' }; }
  function sec(id, title, fields) { return { id: id, title: title, fields: fields }; }

  // ---- 5 starter templates (the answers chose all five) ----
  var BUILTIN = [
    { id: 'basic', name: '基礎角色', icon: 'user', tone: '#A67F0E',
      desc: '名稱、簡介、外觀、個性 — 最通用的起手式。', sections: [
        sec('s_id', '身分', [
          f('name', '名稱', 'text', { req: 1, seed: 'name', ph: '例：宵霧' }),
          f('tagline', '一句話簡介', 'text', { req: 1, seed: 'tagline', hint: '一句話講清楚這個角色是誰。', ph: '在夜路替迷途者點燈的妖狐' }),
          f('blurb', '簡介', 'textarea', { seed: 'blurb', hint: '2–3 句的角色介紹。' }),
        ]),
        sec('s_look', '外觀', [
          f('basics', '基本資料', 'keyvalue', { seed: 'basics', hint: '身高／種族…成對填寫。' }),
          f('main', '主視覺', 'image', { hint: '代表這個角色的主要圖片。' }),
          f('palette', '色票', 'color', { seed: 'palette' }),
        ]),
        sec('s_pers', '個性', [
          f('impression', '核心印象', 'tags', { seed: 'personality', ph: '冷淡' }),
          f('tags', '個人標籤', 'tags', { seed: 'tags', ph: '妖狐' }),
        ]),
      ] },
    { id: 'artist', name: '繪師委託向', icon: 'palette', tone: '#9E332B',
      desc: '以圖片槽位、色票、必畫／不可畫為主。', sections: [
        sec('a_img', '參考圖', [
          f('avatar', '頭像', 'image', {}),
          f('full', '全身立繪', 'image', { req: 1 }),
          f('three', '三視圖', 'image', {}),
        ]),
        sec('a_col', '配色', [ f('palette', '色票', 'color', { req: 1, seed: 'palette', hint: '色塊＋名稱＋用途。' }) ]),
        sec('a_rule', '繪圖規範', [
          f('must', '必畫重點', 'list', { req: 1, hint: '一定要畫對的特徵。' }),
          f('avoid', '不可畫錯', 'list', { hint: '常見的雷區。' }),
        ]),
        sec('a_note', '備註', [ f('note', '其他注意事項', 'textarea', {}) ]),
      ] },
    { id: 'writer', name: '文手向', icon: 'book', tone: '#3E6B57',
      desc: '背景、動機、說話方式、關係觀。', sections: [
        sec('w_base', '基本', [
          f('name', '名稱', 'text', { req: 1, seed: 'name' }),
          f('tagline', '一句話簡介', 'text', { seed: 'tagline' }),
        ]),
        sec('w_set', '設定', [
          f('background', '背景', 'textarea', { req: 1, seed: 'background', hint: '角色的來歷與處境。' }),
          f('motivation', '行動動機', 'textarea', { req: 1, seed: 'motivation', hint: '他想要什麼？在乎什麼？' }),
          f('speech', '說話方式', 'tags', { seed: 'speech', ph: '冷淡' }),
          f('relations', '關係觀', 'textarea', { seed: 'relations' }),
          f('taboo', '禁忌', 'tags', { seed: 'taboo' }),
        ]),
      ] },
    { id: 'trpg', name: 'TRPG · 數值向', icon: 'list', tone: '#3D5A80',
      desc: '以屬性表與技能、裝備為主。', sections: [
        sec('t_char', '角色', [
          f('name', '名稱', 'text', { req: 1, seed: 'name' }),
          f('class', '種族／職業', 'text', {}),
        ]),
        sec('t_stat', '能力值', [ f('stats', '屬性表', 'keyvalue', { req: 1, seed: 'basics', hint: '力量／敏捷／HP…' }) ]),
        sec('t_skill', '技能與裝備', [
          f('skills', '技能', 'list', {}),
          f('gear', '持有物', 'chips', {}),
        ]),
      ] },
    { id: 'blank', name: '空白模板', icon: 'plus', tone: '#5A6470',
      desc: '從零開始，自己加區塊與欄位。', sections: [ sec('b_main', '新區塊', []) ] },
  ];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function loadMine() { try { return JSON.parse(sessionStorage.getItem(MINE_KEY)) || []; } catch (e) { return []; } }
  function saveMineArr(a) { try { sessionStorage.setItem(MINE_KEY, JSON.stringify(a)); } catch (e) {} }

  window.OCTemplates = {
    builtin: function () { return clone(BUILTIN); },
    mine: function () { return loadMine(); },
    // all, with a `kind` tag for the picker
    all: function () {
      return clone(BUILTIN).map(function (t) { t.kind = 'builtin'; return t; })
        .concat(loadMine().map(function (t) { t.kind = 'mine'; return t; }));
    },
    get: function (id) {
      var hit = BUILTIN.filter(function (t) { return t.id === id; })[0] || loadMine().filter(function (t) { return t.id === id; })[0];
      return hit ? clone(hit) : null;
    },
    // save the given structure as a personal, reusable template
    saveMine: function (tpl, name) {
      var arr = loadMine();
      var t = clone(tpl); t.id = uid('mt_'); t.name = name || tpl.name || '我的模板'; t.icon = 'edit'; t.tone = '#A67F0E';
      t.desc = '我的模板 · ' + countFields(t) + ' 個欄位'; t.kind = 'mine';
      // fresh field/section ids so applying doesn't collide
      t.sections.forEach(function (s) { s.id = uid('s_'); s.fields.forEach(function (fd) { fd.id = uid('f_'); }); });
      arr.push(t); saveMineArr(arr); return t;
    },
    deleteMine: function (id) { saveMineArr(loadMine().filter(function (t) { return t.id !== id; })); },
    // helpers for the structure editor
    newField: function (type, label, required) { return f(uid('f_'), label || '新欄位', type || 'text', { req: required }); },
    newSection: function (title) { return sec(uid('s_'), title || '新區塊', []); },
    countFields: countFields,
    fieldTypeLabel: function (t) { var m = { text: '短文字', textarea: '長文', tags: '標籤', keyvalue: '屬性表', list: '清單', color: '色票', chips: '物件', image: '圖片' }; return m[t] || t; },
    fieldTypeIcon: function (t) { var m = { text: 'edit', textarea: 'book', tags: 'tag', keyvalue: 'list', list: 'check', color: 'palette', chips: 'box', image: 'image' }; return m[t] || 'dot'; },
    TYPES: [ ['text', '短文字', 'edit'], ['textarea', '長文', 'book'], ['tags', '標籤', 'tag'], ['keyvalue', '屬性表', 'list'], ['list', '清單', 'check'], ['color', '色票', 'palette'], ['chips', '物件', 'box'], ['image', '圖片', 'image'] ],
  };
  function countFields(t) { return (t.sections || []).reduce(function (n, s) { return n + s.fields.length; }, 0); }
})();
