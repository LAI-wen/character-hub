/* ============================================================
   CharacterHub — canonical mock data (single source of truth)
   THE ONLY mock source for the design prototype. Load before page
   scripts and before shell.js. Exposes window.OCData.

   Domain names follow the real model. Mock data for a clickable
   prototype — NOT a backend, NOT a Repository, NOT real
   persistence. Anything that "saves" is Demo interaction only.
   DATA GAP markers flag fields invented for the prototype.
   ============================================================ */
(function () {
  // ---- viewer (account owner) ----
  // DATA GAP: real role is per-project (ProjectMembership). viewer.projectRoles
  // maps projectId → role. The Demo switch overrides the CURRENT project only.
  var viewer = {
    id: 'me', name: 'Yoi Studio', handle: '@yoi-studio',
    projectRoles: { tokoyo: 'owner', hoshi: 'owner', school: 'member', commset: 'owner', yobanagari: 'owner' },
  };

  var ROLES = ['owner', 'member', 'visitor'];
  var ROLE_LABEL = { owner: '主持人', member: '參與者', visitor: '公開預覽' };
  // capability matrix derived from role (Demo). Drives nav + Forbidden states.
  var CAPS = {
    owner:   { addCharacter: 1, editWorld: 1, editRels: 1, manageProject: 1, review: 1, manageMembers: 1, editPublicPage: 1, viewManage: 1 },
    member:  { addCharacter: 1, editWorld: 1, editRels: 0, manageProject: 0, review: 0, manageMembers: 0, editPublicPage: 0, viewManage: 0 },
    visitor: {},
  };

  // Action-level permissions (the product concept). Buttons gate on ACTIONS,
  // not on the fixture role name. role→action grants below; a project could
  // later override per-membership. Owner/Host = full; Member = limited;
  // Visitor(=public preview) = none.
  var ACTION_GRANTS = {
    owner: { 'worldEntry:create': 1, 'worldEntry:update': 1, 'worldEntry:archive': 1, 'relationship:create': 1, 'relationship:update': 1, 'relationship:delete': 1, 'relationshipLayout:update': 1,
      'story:create': 1, 'story:update': 1, 'story:archive': 1, 'chapter:create': 1, 'chapter:update': 1, 'chapter:reorder': 1, 'chapter:archive': 1, 'storyEvent:create': 1, 'storyEvent:update': 1, 'storyEvent:delete': 1,
      'asset:upload': 1, 'asset:update': 1, 'asset:archive': 1, 'asset:delete': 1, 'assetLink:create': 1, 'assetLink:update': 1, 'assetLink:delete': 1, 'gallery:manage': 1,
      'inspiration:create': 1, 'inspiration:update': 1, 'inspiration:archive': 1, 'inspiration:share_to_project': 1, 'inspiration:convert': 1, 'inspiration:manage_project_items': 1,
      'template:create': 1, 'template:update': 1, 'template:publish': 1, 'template:archive': 1, 'templateField:create': 1, 'templateField:update': 1, 'templateField:delete': 1, 'templateField:reorder': 1,
      'application:create': 1, 'application:update_own': 1, 'application:submit': 1, 'application:withdraw': 1, 'application:view_own': 1, 'application:review': 1, 'application:approve': 1, 'application:reject': 1,
      'submission:create': 1, 'submission:update_own': 1, 'submission:submit': 1, 'submission:withdraw': 1, 'submission:view_own': 1, 'submission:review': 1, 'submission:request_changes': 1, 'submission:approve': 1, 'submission:reject': 1,
      'publicPage:create': 1, 'publicPage:update': 1, 'publicPage:publish': 1, 'publicPage:rollback': 1, 'publicPage:archive': 1, 'pageTemplate:create': 1, 'pageTemplate:update': 1, 'pageTemplate:publish': 1, 'pageTemplate:manage': 1, 'pageOverride:update_own': 1, 'pagePreview:view_draft': 1, 'pageSlug:update': 1, 'pageVisibility:update': 1 },
    // Member: may edit worldview entries + add story content but NOT reorder/archive/delete or rels (demo project policy)
    member: { 'worldEntry:create': 1, 'worldEntry:update': 1, 'worldEntry:archive': 0, 'relationship:create': 0, 'relationship:update': 0, 'relationship:delete': 0, 'relationshipLayout:update': 0,
      'story:create': 0, 'story:update': 0, 'story:archive': 0, 'chapter:create': 1, 'chapter:update': 1, 'chapter:reorder': 0, 'chapter:archive': 0, 'storyEvent:create': 1, 'storyEvent:update': 1, 'storyEvent:delete': 0 },
    // member can upload + link their own assets, but not delete others' assets or manage gallery
    visitor: {},
  };
  // member asset grants appended below (kept separate for readability)
  ACTION_GRANTS.member['asset:upload'] = 1; ACTION_GRANTS.member['asset:update'] = 1; ACTION_GRANTS.member['asset:archive'] = 0;
  ACTION_GRANTS.member['asset:delete'] = 0; ACTION_GRANTS.member['assetLink:create'] = 1; ACTION_GRANTS.member['assetLink:update'] = 1;
  ACTION_GRANTS.member['assetLink:delete'] = 1; ACTION_GRANTS.member['gallery:manage'] = 0;
  ACTION_GRANTS.member['inspiration:create'] = 1; ACTION_GRANTS.member['inspiration:update'] = 1; ACTION_GRANTS.member['inspiration:archive'] = 1;
  ACTION_GRANTS.member['inspiration:share_to_project'] = 1; ACTION_GRANTS.member['inspiration:convert'] = 1; ACTION_GRANTS.member['inspiration:manage_project_items'] = 0;
  // member can apply own characters + manage own applications; cannot review/approve/reject
  ACTION_GRANTS.member['application:create'] = 1; ACTION_GRANTS.member['application:update_own'] = 1; ACTION_GRANTS.member['application:submit'] = 1;
  ACTION_GRANTS.member['application:withdraw'] = 1; ACTION_GRANTS.member['application:view_own'] = 1;
  ACTION_GRANTS.member['application:review'] = 0; ACTION_GRANTS.member['application:approve'] = 0; ACTION_GRANTS.member['application:reject'] = 0;
  // member can build/publish their OWN character public page; not manage project templates
  ACTION_GRANTS.member['publicPage:create'] = 1; ACTION_GRANTS.member['publicPage:update'] = 1; ACTION_GRANTS.member['publicPage:publish'] = 1;
  ACTION_GRANTS.member['publicPage:archive'] = 1; ACTION_GRANTS.member['pageTemplate:manage'] = 0;
  // member can submit own content works + manage own submissions; cannot review/approve/reject
  ACTION_GRANTS.member['submission:create'] = 1; ACTION_GRANTS.member['submission:update_own'] = 1; ACTION_GRANTS.member['submission:submit'] = 1;
  ACTION_GRANTS.member['submission:withdraw'] = 1; ACTION_GRANTS.member['submission:view_own'] = 1;
  ACTION_GRANTS.member['submission:review'] = 0; ACTION_GRANTS.member['submission:request_changes'] = 0; ACTION_GRANTS.member['submission:approve'] = 0; ACTION_GRANTS.member['submission:reject'] = 0;

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // ---- projects ----
  // Capabilities are SEPARATE flags — never infer one from another:
  //   visibility          public | private        (is the project discoverable)
  //   collaborationMode   solo | closed | open     (does it have co-creators)
  //   portalEnabled       has a public page
  //   joinPolicy          closed | invite | open   (can others request to join)
  //   submissionsEnabled  accepts public submissions
  //   enabledFeatures     which content modules are on
  var ALL_FEATURES = ['worldview', 'relationships', 'story', 'gallery', 'inbox'];
  var projects = [
    { id: 'tokoyo', name: '常夜國', en: 'TOKOYO', c: '#3B5E6B',
      visibility: 'public', collaborationMode: 'open', portalEnabled: true, joinPolicy: 'open', submissionsEnabled: true,
      enabledFeatures: ['worldview', 'relationships', 'story', 'gallery', 'inbox'],
      blurb: '妖與神棲息的永夜之國——宵霧與夥伴們的主企劃。',
      stats: { chars: 6, world: 15, rels: 7, ideas: 4, comms: 3 },
      recent: [ { t: '宵霧', ty: '角色', ago: '昨天' }, { t: '廢稻荷神社', ty: '世界觀', ago: '2 天前' }, { t: '神明吃掉自己的名字', ty: '靈感', ago: '3 天前' }, { t: '宵霧 × 望 · 羈絆', ty: '關係', ago: '4 天前' } ] },
    { id: 'hoshi', name: '星海計畫', en: 'HOSHIKAI', c: '#4B5BA6',
      visibility: 'private', collaborationMode: 'solo', portalEnabled: false, joinPolicy: 'closed', submissionsEnabled: false,
      enabledFeatures: ['worldview', 'story', 'inbox'],
      blurb: '深海與星空交界的科幻向企劃，仍在大量發想階段。',
      stats: { chars: 5, world: 12, rels: 4, ideas: 18, comms: 1 },
      recent: [ { t: '觀星塔', ty: '世界觀', ago: '今天' }, { t: '深海其實有光', ty: '靈感', ago: '昨天' } ] },
    { id: 'school', name: '校園 AU', en: 'SCHOOL AU', c: '#C2702C',
      visibility: 'public', collaborationMode: 'closed', portalEnabled: true, joinPolicy: 'invite', submissionsEnabled: false,
      enabledFeatures: ['worldview', 'relationships', 'gallery'],
      blurb: '把本家角色丟進現代校園的同人 AU。',
      stats: { chars: 8, world: 4, rels: 9, ideas: 9, comms: 0 },
      recent: [ { t: '宵霧（學生會）', ty: '角色', ago: '2 天前' }, { t: '頂樓', ty: '世界觀', ago: '5 天前' } ] },
    { id: 'commset', name: '委託角色集', en: 'COMM SET', c: '#5E7E55',
      visibility: 'private', collaborationMode: 'solo', portalEnabled: false, joinPolicy: 'closed', submissionsEnabled: false,
      enabledFeatures: ['inbox'],
      blurb: '接委託用的雜項角色，不屬於特定宇宙。',
      stats: { chars: 6, world: 2, rels: 1, ideas: 3, comms: 2 },
      recent: [ { t: '冬季新衣', ty: '待委託', ago: '今天' } ] },
    // long name — for sidebar truncation / wrapping tests (20+ chars)
    { id: 'yobanagari', name: '常夜國：永夜之章與失落的燈火記錄', en: 'TOKOYO · LOST LIGHTS', c: '#6B5B95',
      visibility: 'public', collaborationMode: 'open', portalEnabled: true, joinPolicy: 'open', submissionsEnabled: true,
      enabledFeatures: ['worldview', 'relationships', 'story', 'gallery', 'inbox'],
      blurb: '常夜國的長篇外傳企劃，用來測試很長的企劃名稱在側欄與標題的表現。',
      stats: { chars: 3, world: 6, rels: 2, ideas: 7, comms: 0 },
      recent: [ { t: '失落的燈火', ty: '世界觀', ago: '今天' } ] },
  ];

  // ---- typed entity registry. `ownerUserId` on characters = account that
  // owns the Character BODY (name/appearance/art/text/background). ----
  var entities = [
    { id: 'yoi', project: 'tokoyo', type: 'character', name: '宵霧', rom: 'YOIGIRI', sp: '妖狐', sub: '妖狐 · 主角', c: '#8FA3B0', role: '妖狐', ownerUserId: 'me',
      blurb: '在無人的夜路替迷途者點一盞燈。寡言、毒舌，記得每一個人。' },
    { id: 'tomori', project: 'tokoyo', type: 'character', name: '燈守', rom: 'TOMORI', sp: '付喪神', sub: '付喪神 · 燈', c: '#C8463C', role: '付喪神', ownerUserId: 'me',
      blurb: '廢稻荷神社的舊燈成精，與宵霧立下守燈之約。' },
    { id: 'nozomi', project: 'tokoyo', type: 'character', name: '望', rom: 'NOZOMI', sp: '人類', sub: '人類 · 旅人', c: '#2E6F6A', role: '人類', ownerUserId: 'me',
      blurb: '雪夜被宵霧點燈引路，多年後重回神社。單方面暗戀宵霧。' },
    { id: 'hiru', project: 'tokoyo', type: 'character', name: '晝', rom: 'HIRU', sp: '半神', sub: '晝廷 · 半神', c: '#E0A23B', role: '晝廷', ownerUserId: 'me',
      blurb: '掌白晝秩序，句句帶刺，卻在月蝕之夜替宵霧擋劫。' },
    { id: 'aka', project: 'tokoyo', type: 'character', name: '緋', rom: 'AKA', sp: '鬼', sub: '鬼', c: '#9E332B', role: '鬼', ownerUserId: 'me',
      blurb: '性烈如火，與晝廷有舊怨。' },
    { id: 'hai', project: 'tokoyo', type: 'character', name: '灰', rom: 'HAI', sp: '未定', sub: '未定稿', c: '#8A857C', role: '未定稿', ownerUserId: 'me', visibility: 'private',
      blurb: '與宵霧之間有未言明的牽連——「他記得灰，灰卻不記得他。」' },
    // a teammate's character linked into 常夜國 (body owned by someone else)
    { id: 'guest1', project: 'tokoyo', type: 'character', name: '霜', rom: 'SHIMO', sp: '雪女', sub: '客座 · 雪女', c: '#7FA8C9', role: '客座', ownerUserId: '@hoshimi',
      blurb: '由共創夥伴帶入常夜國的客座角色。' },
    // worldview entries (WorldEntry): projectId/title/type/summary/content/parentId/sortOrder/visibility.
    // 3-level hierarchy under 常夜國 for the hierarchy scenario.
    { id: 'w-tokoyo', project: 'tokoyo', type: 'nation', name: '常夜國', sub: '國家', c: '#3B5E6B', parentId: null, sortOrder: 0, visibility: 'public',
      summary: '妖與神棲息的永夜之國。', content: '日光從未照進的國度，由古老的守燈契約維繫秩序。境內分為數個territory，彼此以夜路相連。' },
    { id: 'w-border', project: 'tokoyo', type: 'place', name: '邊境', sub: '地區', c: '#4A6B72', parentId: 'w-tokoyo', sortOrder: 0, visibility: 'public',
      summary: '常夜國與晝廷接壤的灰色地帶。', content: '日夜在此交界，最容易迷路，也最需要燈火。' },
    { id: 'w-shrine', project: 'tokoyo', type: 'place', name: '廢稻荷神社', sub: '地點', c: '#5E7E55', parentId: 'w-border', sortOrder: 0, visibility: 'public',
      summary: '宵霧與燈守相遇之地。', content: '邊境深處的廢棄神社，香火早斷，唯一盞舊燈仍亮著——那就是燈守。' },
    { id: 'w-capital', project: 'tokoyo', type: 'place', name: '常夜都', sub: '都城', c: '#3B5E6B', parentId: 'w-tokoyo', sortOrder: 1, visibility: 'public',
      summary: '永夜的中心都城。', content: '' },
    { id: 'w-tomoribito', project: 'tokoyo', type: 'org', name: '守燈人', sub: '組織', c: '#B5654A', parentId: 'w-tokoyo', sortOrder: 2, visibility: 'public',
      summary: '在夜路為迷途者點燈的古老結社。', content: '不分人妖神，只要願意守燈就能加入。宵霧是現任核心之一。' },
    { id: 'w-court', project: 'tokoyo', type: 'org', name: '晝廷', sub: '組織', c: '#E0A23B', parentId: null, sortOrder: 1, visibility: 'public',
      summary: '掌白晝秩序的半神官僚體系。', content: '與守燈人理念相左，認為夜應被驅散而非守護。' },
    { id: 'w-pact', project: 'tokoyo', type: 'event', name: '守燈之約', sub: '事件', c: '#9E332B', parentId: null, sortOrder: 2, visibility: 'public',
      summary: '宵霧與燈守立下的契約。', content: '只要還有一個人在夜路上迷途，燈就不能熄。' },
    { id: 'w-eclipse', project: 'tokoyo', type: 'event', name: '月蝕停戰', sub: '事件', c: '#6B5B95', parentId: null, sortOrder: 3, visibility: 'private',
      summary: '（私人）月蝕之夜守燈人與晝廷短暫停戰。', content: '主線伏筆，暫不公開。' },
    { id: 'w-hoshi1', project: 'hoshi', type: 'place', name: '觀星塔', sub: '地點', c: '#4B5BA6', parentId: null, sortOrder: 0, visibility: 'public', summary: '星海計畫主舞台。', content: '' },
    { id: 'h1', project: 'hoshi', type: 'character', name: '觀星者', sub: '主角', c: '#4B5BA6', role: '主角', ownerUserId: 'me', blurb: '星海計畫的主角（草稿）。' },
    { id: 's1', project: 'school', type: 'character', name: '宵霧（學生會）', sub: 'AU', c: '#8FA3B0', role: '學生會', ownerUserId: 'me', blurb: '校園 AU 的宵霧。' },
    // other-owned character in 校園 AU, where the viewer is a MEMBER (scenario 5)
    { id: 'guest2', project: 'school', type: 'character', name: '楓', rom: 'KAEDE', sp: '人類', sub: '一般生', c: '#C2702C', role: '一般生', ownerUserId: '@kaede', blurb: '校園 AU 的同班同學，由其他參與者維護。' },
    // applicant characters (owned, NOT yet linked to 常夜國) — for Character Application demo
    { id: 'cand-suzu', project: null, type: 'character', name: '鈴', rom: 'SUZU', sp: '鈴鐺付喪神', sub: '付喪神', c: '#B59A4A', role: '', ownerUserId: 'me', blurb: '一只被搖響千年的鈴，化成精靈。想加入守燈人。' },
    { id: 'cand-mori', project: null, type: 'character', name: '杜', rom: 'MORI', sp: '樹靈', sub: '樹靈', c: '#5E7E55', role: '', ownerUserId: 'me', blurb: '神社後山的老樹之靈。' },
    { id: 'cand-yuki', project: null, type: 'character', name: '雪緒', rom: 'YUKIO', sp: '雪童子', sub: '雪童子', c: '#7FA8C9', role: '', ownerUserId: '@hoshimi', blurb: '夥伴帶來想申請加入常夜國的雪童子。' },
  ];

  var factions = {
    tokoyo: [ { id: 'tomoribito', name: '守燈人', c: '#B5654A' }, { id: 'court', name: '晝廷', c: '#E0A23B' }, { id: 'neutral', name: '中立／旅人', c: '#5E7E55' } ],
    hoshi: [{ id: 'crew', name: '觀星隊', c: '#4B5BA6' }],
    school: [{ id: 'council', name: '學生會', c: '#C2702C' }, { id: 'class', name: '一般生', c: '#5E7E55' }],
    commset: [], yobanagari: [{ id: 'tomoribito', name: '守燈人', c: '#B5654A' }],
  };

  // ---- ProjectCharacterLink ----
  // Project-scoped data ONLY: faction, project role, project-only field VALUES,
  // review status, project-internal visibility. Identity NEVER lives here.
  // status: approved | pending | archived
  var links = [
    { id: 'lk1', character: 'yoi', project: 'tokoyo', faction: 'tomoribito', projectRole: '主角', status: 'approved', ownerUserId: 'me', templateVersionId: 'tpl-tokoyo-v3', projectVisibility: 'public', fieldValues: { 立場: '守夜', 暱稱: 'Yoi' } },
    { id: 'lk2', character: 'tomori', project: 'tokoyo', faction: 'tomoribito', projectRole: '守燈', status: 'approved', ownerUserId: 'me', templateVersionId: 'tpl-tokoyo-v3', projectVisibility: 'public', fieldValues: {} },
    { id: 'lk3', character: 'nozomi', project: 'tokoyo', faction: 'neutral', projectRole: '旅人', status: 'approved', ownerUserId: 'me', templateVersionId: 'tpl-tokoyo-v3', projectVisibility: 'public', fieldValues: {} },
    { id: 'lk4', character: 'hiru', project: 'tokoyo', faction: 'court', projectRole: '半神', status: 'approved', ownerUserId: 'me', templateVersionId: 'tpl-tokoyo-v3', projectVisibility: 'members', fieldValues: {} },
    { id: 'lk5', character: 'aka', project: 'tokoyo', faction: 'court', projectRole: '鬼', status: 'pending', ownerUserId: 'me', templateVersionId: 'tpl-tokoyo-v3', projectVisibility: 'members', fieldValues: {} },
    // 'hai' is intentionally UNLINKED — a Character can exist in no project.
    { id: 'lk6', character: 'guest1', project: 'tokoyo', faction: 'tomoribito', projectRole: '客座', status: 'approved', ownerUserId: '@hoshimi', templateVersionId: 'tpl-tokoyo-v3', projectVisibility: 'public', fieldValues: {} },
    { id: 'lk7', character: 'yoi', project: 'school', faction: 'council', projectRole: '學生會長', status: 'approved', ownerUserId: 'me', templateVersionId: 'tpl-school-v1', projectVisibility: 'public', fieldValues: {} },
    { id: 'lk8', character: 'h1', project: 'hoshi', faction: 'crew', projectRole: '主角', status: 'approved', ownerUserId: 'me', templateVersionId: 'tpl-hoshi-v1', projectVisibility: 'public', fieldValues: {} },
    // an archived link — shown in 企劃角色 (管理) but not in 角色名冊 (browse)
    { id: 'lk9', character: 'tomori', project: 'school', faction: 'class', projectRole: '舊設定', status: 'archived', ownerUserId: 'me', templateVersionId: 'tpl-school-v1', projectVisibility: 'private', fieldValues: {} },
    { id: 'lk10', character: 'guest2', project: 'school', faction: 'class', projectRole: '同班同學', status: 'approved', ownerUserId: '@kaede', templateVersionId: 'tpl-school-v1', projectVisibility: 'public', fieldValues: { 社團: '文藝社' } },
    // rejected link (with reviewMessage) — owner can see reason + resubmit
    { id: 'lk11', character: 'nozomi', project: 'school', faction: 'class', projectRole: '轉學生', status: 'rejected', reviewMessage: '背景與校園 AU 的時間線衝突，請調整後重新提交。', ownerUserId: 'me', templateVersionId: 'tpl-school-v1', projectVisibility: 'private', fieldValues: {} },
  ];

  var TYPE_LABEL = { character: '角色', nation: '國家', place: '地點', org: '組織', event: '事件', item: '物品' };

  // ============================================================
  // Slice 5B — ProjectMembership / ProjectInvitation / Permission Override
  // Demo fixtures. rolePreset gives INITIAL permissions; actual checks go
  // through can(action) which folds in per-member overrides. Visitor is
  // NOT a membership and never appears in the member list.
  // ============================================================
  var ROLE_PRESET_LABEL = { owner: '企劃擁有者', host: '主持人', cohost: '共同主持', member: '參與者' };

  // users referenced by memberships (display only; real identity is account-level)
  var users = {
    me: { id: 'me', name: 'Yoi Studio', handle: '@yoi-studio', c: '#3B5E6B' },
    '@hoshimi': { id: '@hoshimi', name: 'Hoshimi', handle: '@hoshimi', c: '#7FA8C9' },
    '@kazuki': { id: '@kazuki', name: 'Kazuki', handle: '@kazuki', c: '#B5654A' },
    '@rin': { id: '@rin', name: 'Rin', handle: '@rin', c: '#8A6FA0' },
    '@aoi': { id: '@aoi', name: 'Aoi', handle: '@aoi', c: '#5E7E55' },
  };

  // ProjectMembership: id, projectId, userId, rolePreset, status, joinedAt, invitedBy
  var memberships = [
    { id: 'm-tok-me', projectId: 'tokoyo', userId: 'me', rolePreset: 'owner', status: 'active', joinedAt: '2025-11-02', invitedBy: null },
    { id: 'm-tok-hoshimi', projectId: 'tokoyo', userId: '@hoshimi', rolePreset: 'host', status: 'active', joinedAt: '2025-12-10', invitedBy: 'me' },
    { id: 'm-tok-kazuki', projectId: 'tokoyo', userId: '@kazuki', rolePreset: 'cohost', status: 'active', joinedAt: '2026-01-15', invitedBy: 'me' },
    { id: 'm-tok-rin', projectId: 'tokoyo', userId: '@rin', rolePreset: 'member', status: 'active', joinedAt: '2026-02-20', invitedBy: '@hoshimi' },
    { id: 'm-tok-aoi', projectId: 'tokoyo', userId: '@aoi', rolePreset: 'member', status: 'active', joinedAt: '2026-03-05', invitedBy: '@hoshimi' },
    // solo projects: just the owner
    { id: 'm-hoshi-me', projectId: 'hoshi', userId: 'me', rolePreset: 'owner', status: 'active', joinedAt: '2025-10-01', invitedBy: null },
    { id: 'm-commset-me', projectId: 'commset', userId: 'me', rolePreset: 'owner', status: 'active', joinedAt: '2025-09-01', invitedBy: null },
    { id: 'm-school-me', projectId: 'school', userId: 'me', rolePreset: 'host', status: 'active', joinedAt: '2026-01-01', invitedBy: '@hoshimi' },
    { id: 'm-school-hoshimi', projectId: 'school', userId: '@hoshimi', rolePreset: 'owner', status: 'active', joinedAt: '2025-12-01', invitedBy: null },
    { id: 'm-yoba-me', projectId: 'yobanagari', userId: 'me', rolePreset: 'owner', status: 'active', joinedAt: '2026-04-01', invitedBy: null },
  ];

  // ProjectInvitation: pending | accepted | declined | expired | revoked
  var invitations = [
    { id: 'inv1', projectId: 'tokoyo', emailOrHandle: '@yuki', invitedRolePreset: 'member', status: 'pending', invitedBy: 'me', createdAt: '2026-05-28', expiresAt: '2026-06-11', acceptedAt: null },
    { id: 'inv2', projectId: 'tokoyo', emailOrHandle: 'mei@example.com', invitedRolePreset: 'cohost', status: 'pending', invitedBy: '@hoshimi', createdAt: '2026-06-01', expiresAt: '2026-06-15', acceptedAt: null },
    { id: 'inv3', projectId: 'tokoyo', emailOrHandle: '@sora', invitedRolePreset: 'member', status: 'expired', invitedBy: 'me', createdAt: '2026-04-01', expiresAt: '2026-04-15', acceptedAt: null },
    { id: 'inv4', projectId: 'tokoyo', emailOrHandle: '@old', invitedRolePreset: 'member', status: 'revoked', invitedBy: 'me', createdAt: '2026-03-01', expiresAt: '2026-03-15', acceptedAt: null },
  ];

  // Permission Override: per-membership allow/deny on top of role preset
  // { id, projectId, membershipId, permission, effect: 'allow'|'deny' }
  var permissionOverrides = [
    { id: 'ov1', projectId: 'tokoyo', membershipId: 'm-tok-rin', permission: 'publicPage:update', effect: 'allow' },
    { id: 'ov2', projectId: 'tokoyo', membershipId: 'm-tok-kazuki', permission: 'member:remove', effect: 'deny' },
  ];

  // ---- Action permission catalog (grouped, human-readable) ----
  // group → { label, actions: [ [code, label, desc] ] }
  var PERM_GROUPS = [
    ['content', '企劃內容', [
      ['project:view', '查看企劃', '進入並瀏覽此企劃'],
      ['project:update', '編輯企劃設定', '名稱、簡介、可見性等'],
    ]],
    ['cw', '角色與世界觀', [
      ['worldEntry:create', '建立世界觀條目', ''],
      ['worldEntry:update', '編輯世界觀條目', ''],
      ['worldEntry:archive', '封存世界觀條目', ''],
      ['relationship:create', '建立關係', ''],
      ['relationship:update', '編輯關係', ''],
      ['relationship:delete', '刪除關係', ''],
    ]],
    ['sa', '故事與圖片', [
      ['story:create', '建立故事', ''],
      ['story:update', '編輯故事', ''],
      ['asset:upload', '上傳圖片', '建立 Asset'],
      ['assetLink:manage_own', '管理自己的圖片關聯', '受 Asset ownership 限制'],
    ]],
    ['as', '申請與投稿', [
      ['application:view_own', '查看自己的申請', ''],
      ['application:review', '檢視申請', 'Host 看得到 submitted，但看不到私人筆記'],
      ['application:approve', '通過申請', '建立正式 ProjectCharacterLink'],
      ['submission:view_own', '查看自己的投稿', ''],
      ['submission:review', '審核投稿', ''],
    ]],
    ['pp', '公開頁', [
      ['publicPage:create', '建立公開頁', ''],
      ['publicPage:update', '編輯公開頁草稿', '能編輯不代表能發布'],
      ['publicPage:publish', '發布公開頁', '獨立權限'],
      ['publicPage:rollback', '回滾版本', ''],
      ['pagePreview:view_draft', '預覽草稿', ''],
      ['pageSlug:update', '修改網址代稱', ''],
      ['pageVisibility:update', '修改公開頁可見性', ''],
    ]],
    ['tpl', '版型與發布', [
      ['pageTemplate:create', '建立企劃版型', ''],
      ['pageTemplate:update', '編輯企劃版型', '影響所有套用的頁面'],
      ['pageTemplate:publish', '發布版型', ''],
      ['pageOverride:update_own', '調整自己頁面的版型 Override', '只影響自己的公開頁'],
    ]],
    ['mem', '成員管理', [
      ['member:view', '查看成員', ''],
      ['member:invite', '邀請成員', ''],
      ['member:update_role', '調整成員角色', ''],
      ['member:update_permissions', '調整個別權限', ''],
      ['member:remove', '移除成員', ''],
      ['invitation:revoke', '撤銷邀請', ''],
    ]],
    ['danger', '危險操作', [
      ['project:archive', '封存整個企劃', ''],
      ['project:transfer_ownership', '移交企劃擁有權', '只有企劃擁有者可執行'],
    ]],
  ];

  // role preset → allowed action codes (initial). '*' = all.
  var ROLE_PERMS = {
    owner: ['*'],
    host: ['project:view', 'project:update', 'worldEntry:create', 'worldEntry:update', 'worldEntry:archive',
      'relationship:create', 'relationship:update', 'relationship:delete', 'story:create', 'story:update',
      'asset:upload', 'assetLink:manage_own', 'application:view_own', 'application:review', 'application:approve',
      'submission:view_own', 'submission:review', 'publicPage:create', 'publicPage:update', 'publicPage:publish',
      'publicPage:rollback', 'pagePreview:view_draft', 'pageSlug:update', 'pageVisibility:update',
      'pageTemplate:create', 'pageTemplate:update', 'pageTemplate:publish', 'pageOverride:update_own',
      'member:view', 'member:invite', 'member:update_role', 'member:update_permissions', 'member:remove', 'invitation:revoke'],
    cohost: ['project:view', 'worldEntry:create', 'worldEntry:update', 'relationship:create', 'relationship:update',
      'story:create', 'story:update', 'asset:upload', 'assetLink:manage_own', 'application:view_own', 'application:review',
      'submission:view_own', 'submission:review', 'publicPage:update', 'pagePreview:view_draft', 'pageOverride:update_own', 'member:view'],
    member: ['project:view', 'worldEntry:create', 'worldEntry:update', 'asset:upload', 'assetLink:manage_own',
      'application:view_own', 'submission:view_own', 'pageOverride:update_own', 'member:view'],
  };
  var OWNER_FIXED = ['project:transfer_ownership', 'project:archive']; // owner-only, can't be granted to others


  // ---- EntityLink: the single source of truth for cross-entity relations
  // (worldentry↔character, worldentry↔worldentry). UI shows name/avatar/summary
  // but the LINK is the concept — never just a stored name string. ----
  // { id, projectId, sourceType, sourceId, targetType, targetId, relationType, label }
  var entityLinks = [
    { id: 'el1', projectId: 'tokoyo', sourceType: 'world', sourceId: 'w-shrine', targetType: 'character', targetId: 'yoi', relationType: 'resident', label: '駐守' },
    { id: 'el2', projectId: 'tokoyo', sourceType: 'world', sourceId: 'w-shrine', targetType: 'character', targetId: 'tomori', relationType: 'origin', label: '本體所在' },
    { id: 'el3', projectId: 'tokoyo', sourceType: 'world', sourceId: 'w-tomoribito', targetType: 'character', targetId: 'yoi', relationType: 'member', label: '核心成員' },
    { id: 'el4', projectId: 'tokoyo', sourceType: 'world', sourceId: 'w-tomoribito', targetType: 'character', targetId: 'tomori', relationType: 'member', label: '成員' },
    { id: 'el5', projectId: 'tokoyo', sourceType: 'world', sourceId: 'w-court', targetType: 'character', targetId: 'hiru', relationType: 'member', label: '半神官' },
    { id: 'el6', projectId: 'tokoyo', sourceType: 'world', sourceId: 'w-pact', targetType: 'character', targetId: 'yoi', relationType: 'party', label: '締約者' },
    { id: 'el7', projectId: 'tokoyo', sourceType: 'world', sourceId: 'w-pact', targetType: 'character', targetId: 'tomori', relationType: 'party', label: '締約者' },
    // worldentry ↔ worldentry
    { id: 'el8', projectId: 'tokoyo', sourceType: 'world', sourceId: 'w-pact', targetType: 'world', targetId: 'w-shrine', relationType: 'location', label: '締約地點' },
    // link to a PRIVATE entry — must be cropped in public preview (no name leak)
    { id: 'el9', projectId: 'tokoyo', sourceType: 'world', sourceId: 'w-court', targetType: 'world', targetId: 'w-eclipse', relationType: 'event', label: '參與停戰', visibility: 'public' },
    // StoryEvent ↔ Character / WorldEntry links
    { id: 'el10', projectId: 'tokoyo', sourceType: 'storyEvent', sourceId: 'se1', targetType: 'character', targetId: 'yoi', relationType: 'appears', label: '登場' },
    { id: 'el11', projectId: 'tokoyo', sourceType: 'storyEvent', sourceId: 'se1', targetType: 'world', targetId: 'w-shrine', relationType: 'location', label: '地點' },
    { id: 'el12', projectId: 'tokoyo', sourceType: 'storyEvent', sourceId: 'se2', targetType: 'character', targetId: 'nozomi', relationType: 'appears', label: '登場' },
    { id: 'el13', projectId: 'tokoyo', sourceType: 'storyEvent', sourceId: 'se3', targetType: 'character', targetId: 'hiru', relationType: 'appears', label: '登場' },
    { id: 'el14', projectId: 'tokoyo', sourceType: 'storyEvent', sourceId: 'se3', targetType: 'world', targetId: 'w-eclipse', relationType: 'relatesTo', label: '相關事件' },
    { id: 'el15', projectId: 'tokoyo', sourceType: 'chapter', sourceId: 'ch1', targetType: 'character', targetId: 'yoi', relationType: 'appears', label: '出場' },
    { id: 'el16', projectId: 'tokoyo', sourceType: 'chapter', sourceId: 'ch1', targetType: 'world', targetId: 'w-shrine', relationType: 'location', label: '地點' },
    { id: 'el17', projectId: 'tokoyo', sourceType: 'chapter', sourceId: 'ch2', targetType: 'character', targetId: 'nozomi', relationType: 'appears', label: '出場' },
    { id: 'el18', projectId: 'tokoyo', sourceType: 'chapter', sourceId: 'ch3', targetType: 'character', targetId: 'hiru', relationType: 'appears', label: '出場' },
  ];

  // ---- Story / Chapter / StoryEvent (Project-scoped) ----
  // NOTE: StoryEvent (narrative beat) is DISTINCT from a WorldEntry of type
  // 'event' (a worldview/historical fact). They may link via EntityLink but
  // are never the same record.
  var stories = [
    { id: 'st1', projectId: 'tokoyo', title: '守燈人記', summary: '宵霧與燈守相遇、立約，到月蝕之夜的主線。', status: 'draft', visibility: 'public', coverAssetId: null },
    { id: 'st2', projectId: 'tokoyo', title: '望的旅途', summary: '望離開常夜國後的外傳短篇。', status: 'completed', visibility: 'public', coverAssetId: null },
    { id: 'st3', projectId: 'tokoyo', title: '（封存）舊設定稿', summary: '初期世界觀設定，已封存。', status: 'archived', visibility: 'private', coverAssetId: null },
    { id: 'st4', projectId: 'hoshi', title: '星海序章', summary: '星海計畫的開場（草稿）。', status: 'draft', visibility: 'private', coverAssetId: null },
  ];
  // Chapter: storyId/title/summary/content/sortOrder/status
  var chapters = [
    { id: 'ch1', storyId: 'st1', title: '廢稻荷神社', summary: '雪夜，迷途的旅人遇見點燈的妖狐。', content: '雪落得很慢。望沿著結冰的石階往上，神社的鳥居在黑暗裡只剩輪廓……', sortOrder: 0, status: 'completed' },
    { id: 'ch2', storyId: 'st1', title: '守燈之約', summary: '宵霧與燈守立下契約。', content: '「只要還有一個人在夜路上迷途，這盞燈就不能熄。」', sortOrder: 1, status: 'completed' },
    { id: 'ch3', storyId: 'st1', title: '月蝕之夜', summary: '晝廷來襲，月蝕將至。', content: '', sortOrder: 2, status: 'draft' },
    { id: 'ch4', storyId: 'st1', title: '（未命名）', summary: '', content: '', sortOrder: 3, status: 'draft' },
    { id: 'ch5', storyId: 'st2', title: '離開常夜國', summary: '望踏上白晝的旅途。', content: '天亮了。這是望第一次在常夜國以外的地方睜開眼。', sortOrder: 0, status: 'completed' },
  ];
  // StoryEvent: projectId/storyId?/chapterId?/title/description/timeLabel/sortKey/visibility
  var storyEvents = [
    { id: 'se1', projectId: 'tokoyo', storyId: 'st1', chapterId: 'ch1', title: '初遇', description: '望在雪夜遇見宵霧。', timeLabel: '百年前 · 冬', sortKey: 100, visibility: 'public' },
    { id: 'se2', projectId: 'tokoyo', storyId: 'st1', chapterId: 'ch2', title: '立約', description: '宵霧與燈守立下守燈之約。', timeLabel: '初遇之後', sortKey: 200, visibility: 'public' },
    { id: 'se3', projectId: 'tokoyo', storyId: 'st1', chapterId: 'ch3', title: '月蝕停戰', description: '晝廷與守燈人在月蝕之夜短暫停戰。', timeLabel: '月蝕前夕', sortKey: 300, visibility: 'members' },
    { id: 'se4', projectId: 'tokoyo', storyId: 'st1', chapterId: null, title: '燈火重燃', description: '（同一時間點的另一事件）邊境的另一盞燈也亮了。', timeLabel: '月蝕前夕', sortKey: 300, visibility: 'public' },
    { id: 'se5', projectId: 'tokoyo', storyId: 'st2', chapterId: 'ch5', title: '白晝的第一步', description: '望走出常夜國。', timeLabel: '第三章後', sortKey: 400, visibility: 'public' },
    { id: 'se6', projectId: 'tokoyo', storyId: null, chapterId: null, title: '（無明確時間）某個夢', description: '宵霧夢見灰，醒來忘記。', timeLabel: '時間不明', sortKey: 9999, visibility: 'private' },
  ];

  // ---- Asset (file + own metadata). Creator ≠ Uploader ≠ Owner. ----
  // processingStatus: queued|uploading|processing|ready|failed|archived
  var assets = [
    { id: 'as1', projectId: 'tokoyo', ownerUserId: 'me', uploaderUserId: 'me', fileName: 'yoi-front.png', mimeType: 'image/png', width: 900, height: 1200, fileSize: 480000, title: '宵霧 立繪（正面）', description: '主視覺立繪。', altText: '黑髮金瞳、提著紙燈的妖狐青年，正面站姿', creatorName: '繪師 @kasumi', creatorUrl: 'https://example.com/kasumi', sourceUrl: '', license: '委託 · 禁二改', visibility: 'public', processingStatus: 'ready', createdAt: '2026-06-08', c: '#8FA3B0' },
    { id: 'as2', projectId: 'tokoyo', ownerUserId: 'me', uploaderUserId: 'me', fileName: 'yoi-back.png', mimeType: 'image/png', width: 900, height: 1200, fileSize: 470000, title: '宵霧 立繪（背面）', description: '', altText: '妖狐青年背面，尾巴末端褪成灰白', creatorName: '繪師 @kasumi', creatorUrl: '', sourceUrl: '', license: '委託 · 禁二改', visibility: 'public', processingStatus: 'ready', createdAt: '2026-06-08', c: '#7E8FA0' },
    { id: 'as3', projectId: 'tokoyo', ownerUserId: 'me', uploaderUserId: 'me', fileName: 'shrine.jpg', mimeType: 'image/jpeg', width: 1600, height: 900, fileSize: 720000, title: '廢稻荷神社', description: '場景參考。', altText: '雪中的廢棄神社鳥居', creatorName: '我', creatorUrl: '', sourceUrl: '', license: '自繪', visibility: 'public', processingStatus: 'ready', createdAt: '2026-06-05', c: '#5E7E55' },
    { id: 'as4', projectId: 'tokoyo', ownerUserId: 'me', uploaderUserId: 'me', fileName: 'pact-scene.png', mimeType: 'image/png', width: 1200, height: 1200, fileSize: 540000, title: '守燈之約', description: '事件配圖。', altText: '兩人在燈下立約', creatorName: '繪師 @rin', creatorUrl: 'https://example.com/rin', sourceUrl: '', license: '委託', visibility: 'public', processingStatus: 'ready', createdAt: '2026-06-02', c: '#9E332B' },
    { id: 'as5', projectId: 'tokoyo', ownerUserId: 'me', uploaderUserId: 'me', fileName: 'nozomi.png', mimeType: 'image/png', width: 800, height: 1100, fileSize: 360000, title: '望', description: '', altText: '披旅裝、圍圍巾的青年', creatorName: '', creatorUrl: '', sourceUrl: '', license: '', visibility: 'public', processingStatus: 'ready', createdAt: '2026-05-30', c: '#2E6F6A' },
    { id: 'as6', projectId: 'tokoyo', ownerUserId: 'me', uploaderUserId: 'me', fileName: 'sketch-hai.png', mimeType: 'image/png', width: 700, height: 700, fileSize: 210000, title: '灰 · 草稿', description: '未公開設定。', altText: '灰色調的人影草稿', creatorName: '我', creatorUrl: '', sourceUrl: '', license: '自繪', visibility: 'private', processingStatus: 'ready', createdAt: '2026-06-01', c: '#8A857C' },
    { id: 'as7', projectId: 'tokoyo', ownerUserId: '@hoshimi', uploaderUserId: '@hoshimi', fileName: 'shimo.png', mimeType: 'image/png', width: 850, height: 1150, fileSize: 410000, title: '霜（客座）', description: '夥伴上傳。', altText: '雪女角色立繪', creatorName: '繪師 @hoshimi', creatorUrl: '', sourceUrl: '', license: '夥伴作品', visibility: 'public', processingStatus: 'ready', createdAt: '2026-05-25', c: '#7FA8C9' },
    // unclassified inbox (no AssetLink yet)
    { id: 'as8', projectId: 'tokoyo', ownerUserId: 'me', uploaderUserId: 'me', fileName: 'inbox-1.jpg', mimeType: 'image/jpeg', width: 1000, height: 1400, fileSize: 600000, title: '', description: '', altText: '', creatorName: '', creatorUrl: '', sourceUrl: '', license: '', visibility: 'private', processingStatus: 'ready', createdAt: '今天', c: '#B8AE9C' },
    { id: 'as9', projectId: 'tokoyo', ownerUserId: 'me', uploaderUserId: 'me', fileName: 'inbox-2.png', mimeType: 'image/png', width: 1200, height: 800, fileSize: 350000, title: '', description: '', altText: '', creatorName: '', creatorUrl: '', sourceUrl: '', license: '', visibility: 'private', processingStatus: 'ready', createdAt: '今天', c: '#C9B79C' },
    // failed processing (for retry demo)
    { id: 'as10', projectId: 'tokoyo', ownerUserId: 'me', uploaderUserId: 'me', fileName: 'broken.tiff', mimeType: 'image/tiff', width: 0, height: 0, fileSize: 9200000, title: '處理失敗的檔案', description: '', altText: '', creatorName: '', creatorUrl: '', sourceUrl: '', license: '', visibility: 'private', processingStatus: 'failed', createdAt: '今天', c: '#9E332B' },
  ];
  // AssetLink: assetId/targetType/targetId/role/sortOrder/caption/visibility?
  var assetLinks = [
    { id: 'al1', projectId: 'tokoyo', assetId: 'as1', targetType: 'character', targetId: 'yoi', role: 'avatar', sortOrder: 0, caption: '' },
    { id: 'al2', projectId: 'tokoyo', assetId: 'as1', targetType: 'character', targetId: 'yoi', role: 'gallery', sortOrder: 1, caption: '正面立繪' },
    { id: 'al3', projectId: 'tokoyo', assetId: 'as2', targetType: 'character', targetId: 'yoi', role: 'gallery', sortOrder: 2, caption: '背面立繪' },
    { id: 'al4', projectId: 'tokoyo', assetId: 'as1', targetType: 'story', targetId: 'st1', role: 'cover', sortOrder: 0, caption: '' }, // same asset linked to multiple entities
    { id: 'al5', projectId: 'tokoyo', assetId: 'as3', targetType: 'worldEntry', targetId: 'w-shrine', role: 'world_entry_album', sortOrder: 0, caption: '神社場景' },
    { id: 'al6', projectId: 'tokoyo', assetId: 'as4', targetType: 'storyEvent', targetId: 'se2', role: 'event_image', sortOrder: 0, caption: '立約場景' },
    { id: 'al7', projectId: 'tokoyo', assetId: 'as5', targetType: 'character', targetId: 'nozomi', role: 'avatar', sortOrder: 0, caption: '' },
    { id: 'al8', projectId: 'tokoyo', assetId: 'as6', targetType: 'character', targetId: 'hai', role: 'reference', sortOrder: 0, caption: '草稿' }, // private asset on a character
    { id: 'al9', projectId: 'tokoyo', assetId: 'as7', targetType: 'character', targetId: 'guest1', role: 'avatar', sortOrder: 0, caption: '' },
    // project-inbox links: an Asset belongs to a project's Inbox EXPLICITLY via a
    // project-level Link (role:inbox) — not inferred from the current page (Scope Gap).
    // visibility 'inherit' = follow the Asset's own visibility.
    { id: 'al-ib8', projectId: 'tokoyo', assetId: 'as8', targetType: 'project', targetId: 'tokoyo', role: 'inbox', sortOrder: 0, caption: '', visibility: 'inherit' },
    { id: 'al-ib9', projectId: 'tokoyo', assetId: 'as9', targetType: 'project', targetId: 'tokoyo', role: 'inbox', sortOrder: 1, caption: '', visibility: 'inherit' },
  ];

  // ---- InspirationItem: low-friction capture layer. account-owned; optional
  // projectId for project context. NOT a substitute for Character/WorldEntry/Story.
  // type ≠ status. Images use Asset/AssetLink, not copied metadata. ----
  var inspirations = [
    { id: 'in1', ownerUserId: 'me', projectId: null, type: 'character_idea', title: '', content: '一個只在雨天出現的傘妖，借傘給人卻從不收回。', status: 'inbox', visibility: 'private', tags: ['妖怪', '雨'], sourceUrl: '', capturedAt: '今天 09:12', updatedAt: '今天 09:12' },
    { id: 'in2', ownerUserId: 'me', projectId: 'tokoyo', type: 'quote', title: '', content: '「燈會記得每一個被它照過的人。」', status: 'organizing', visibility: 'members', tags: ['台詞', '守燈人'], sourceUrl: '', capturedAt: '昨天', updatedAt: '昨天' },
    { id: 'in3', ownerUserId: 'me', projectId: 'tokoyo', type: 'link', title: '夜祭參考', content: '日本夜祭燈籠攝影集', status: 'inbox', visibility: 'private', tags: ['參考'], sourceUrl: 'https://example.com/yomatsuri', capturedAt: '2 天前', updatedAt: '2 天前' },
    { id: 'in4', ownerUserId: 'me', projectId: 'tokoyo', type: 'color_palette', title: '常夜配色', content: '#2E3138,#3B5E6B,#C7A14A,#9E332B', status: 'organizing', visibility: 'members', tags: ['配色'], sourceUrl: '', capturedAt: '3 天前', updatedAt: '3 天前' },
    { id: 'in5', ownerUserId: 'me', projectId: 'tokoyo', type: 'scene', title: '', content: '月蝕之夜，兩個敵對的人並肩守著同一盞燈，誰都沒先開口。', status: 'converted', visibility: 'members', tags: ['場景', '月蝕'], sourceUrl: '', capturedAt: '上週', updatedAt: '前天' },
    { id: 'in6', ownerUserId: 'me', projectId: null, type: 'text', title: '', content: '「被忘記」是不是一種死亡？這個主題可以做一個角色。', status: 'inbox', visibility: 'private', tags: ['主題'], sourceUrl: '', capturedAt: '上週', updatedAt: '上週' },
    { id: 'in7', ownerUserId: 'me', projectId: 'tokoyo', type: 'image', title: '神社雪景參考', content: '雪中鳥居', status: 'organizing', visibility: 'members', tags: ['場景', '參考'], sourceUrl: '', capturedAt: '上週', updatedAt: '上週', assetId: 'as3' },
    { id: 'in8', ownerUserId: 'me', projectId: 'tokoyo', type: 'dialogue', title: '', content: '「你要去哪？」「有燈的地方。」', status: 'archived', visibility: 'private', tags: ['台詞'], sourceUrl: '', capturedAt: '更早', updatedAt: '更早' },
    // a teammate's PRIVATE project inspiration — Host must NOT see it
    { id: 'in9', ownerUserId: '@hoshimi', projectId: 'tokoyo', type: 'character_idea', title: '', content: '（@hoshimi 的私人點子）霜的姊姊也是雪女。', status: 'inbox', visibility: 'private', tags: [], sourceUrl: '', capturedAt: '今天', updatedAt: '今天' },
    // a teammate's MEMBERS-shared project inspiration — visible to project members
    { id: 'in10', ownerUserId: '@hoshimi', projectId: 'tokoyo', type: 'scene', title: '', content: '（共享）雪女在神社屋簷下避雪的一幕。', status: 'inbox', visibility: 'members', tags: ['場景'], sourceUrl: '', capturedAt: '今天', updatedAt: '今天' },
  ];
  // conversion links: inspiration → formal content (EntityLink-shaped; relationType converted_to / inspired)
  var inspirationLinks = [
    { id: 'inl1', sourceType: 'inspiration', sourceId: 'in5', targetType: 'storyEvent', targetId: 'se3', relationType: 'converted_to' },
    { id: 'inl2', sourceType: 'inspiration', sourceId: 'in5', targetType: 'relationship', targetId: 'rel3', relationType: 'inspired' }, // one inspiration → multiple targets
  ];

  // ---- ProjectTemplate / ProjectTemplateField (project角色卡模板) ----
  // Defines PROJECT-scoped fields only — never Character body fields. Field
  // VALUES live in ProjectCharacterLink.fieldValues[fieldId], not here.
  var projectTemplates = [
    { id: 'tpl-tokoyo-v2', projectId: 'tokoyo', name: '常夜國 角色卡', status: 'published', version: 2, createdAt: '2026-04-10', publishedAt: '2026-04-12' },
    { id: 'tpl-tokoyo-v3', projectId: 'tokoyo', name: '常夜國 角色卡', status: 'draft', version: 3, createdAt: '2026-06-01', publishedAt: null }, // unpublished changes
    { id: 'tpl-school-v1', projectId: 'school', name: '校園 AU 角色卡', status: 'published', version: 1, createdAt: '2026-05-01', publishedAt: '2026-05-02' },
    // commset has NO template (empty-state scenario); hoshi solo no template
  ];
  // type: text | textarea | number | select | multiselect | checkbox | date | color | image | relation | section
  var templateFields = [
    // published v2 (3 fields)
    { id: 'tf1', templateId: 'tpl-tokoyo-v2', key: 'faction_role', label: '陣營職位', description: '', type: 'text', required: true, visibility: 'public', editableBy: 'both', sortOrder: 0, validation: { max: 20 }, options: null, defaultValue: '' },
    { id: 'tf2', templateId: 'tpl-tokoyo-v2', key: 'stance', label: '立場', description: '對守燈之約的立場', type: 'select', required: false, visibility: 'members', editableBy: 'character_owner', sortOrder: 1, validation: {}, options: ['守夜', '中立', '反對'], defaultValue: '' },
    { id: 'tf3', templateId: 'tpl-tokoyo-v2', key: 'host_note', label: '主持人備註', description: '僅主持人可見', type: 'textarea', required: false, visibility: 'host', editableBy: 'host', sortOrder: 2, validation: {}, options: null, defaultValue: '' },
    // draft v3 (adds, modifies, removes vs v2)
    { id: 'tf1b', templateId: 'tpl-tokoyo-v3', key: 'faction_role', label: '陣營職位', description: '', type: 'text', required: true, visibility: 'public', editableBy: 'both', sortOrder: 0, validation: { max: 24 }, options: null, defaultValue: '' },
    { id: 'tf-sec', templateId: 'tpl-tokoyo-v3', key: 'sec_abilities', label: '能力', description: '分隔標題', type: 'section', required: false, visibility: 'public', editableBy: 'host', sortOrder: 1, validation: {}, options: null, defaultValue: '' },
    { id: 'tf4', templateId: 'tpl-tokoyo-v3', key: 'ability_type', label: '能力類型', description: '新增欄位', type: 'multiselect', required: false, visibility: 'public', editableBy: 'character_owner', sortOrder: 2, validation: {}, options: ['火', '水', '光', '影', '無'], defaultValue: '' },
    { id: 'tf2b', templateId: 'tpl-tokoyo-v3', key: 'stance', label: '立場', description: '改為必填（破壞性）', type: 'select', required: true, visibility: 'members', editableBy: 'character_owner', sortOrder: 3, validation: {}, options: ['守夜', '中立'], defaultValue: '' }, // removed an option '反對' (destructive)
    { id: 'tf5', templateId: 'tpl-tokoyo-v3', key: 'theme_color', label: '主題色', description: '', type: 'color', required: false, visibility: 'public', editableBy: 'character_owner', sortOrder: 4, validation: {}, options: null, defaultValue: '#3B5E6B' },
    // tf3 (host_note) REMOVED in v3 → old values retained, not deleted
    // school v1
    { id: 'sf1', templateId: 'tpl-school-v1', key: 'club', label: '社團', description: '', type: 'text', required: false, visibility: 'public', editableBy: 'both', sortOrder: 0, validation: {}, options: null, defaultValue: '' },
    { id: 'sf2', templateId: 'tpl-school-v1', key: 'grade', label: '年級', description: '', type: 'number', required: false, visibility: 'public', editableBy: 'character_owner', sortOrder: 1, validation: { min: 1, max: 3 }, options: null, defaultValue: '' },
  ];

  // ---- CharacterApplication: precedes ProjectCharacterLink. Approval COPIES
  // fieldValues into a new Link. Application.fieldValues (pending) ≠
  // ProjectCharacterLink.fieldValues (joined). Keyed by fieldKey (stable). ----
  // status: draft | submitted | changes_requested | approved | rejected | withdrawn
  var applications = [
    { id: 'ap1', projectId: 'tokoyo', characterId: 'cand-suzu', applicantUserId: 'me', templateVersionId: 'tpl-tokoyo-v2', fieldValues: { faction_role: '守燈見習' }, status: 'draft', reviewMessage: '', submittedAt: null, reviewedAt: null, reviewedBy: null },
    { id: 'ap2', projectId: 'tokoyo', characterId: 'cand-mori', applicantUserId: 'me', templateVersionId: 'tpl-tokoyo-v2', fieldValues: { faction_role: '山靈', stance: '中立' }, status: 'submitted', reviewMessage: '', submittedAt: '2 天前', reviewedAt: null, reviewedBy: null },
    { id: 'ap3', projectId: 'tokoyo', characterId: 'hai', applicantUserId: 'me', templateVersionId: 'tpl-tokoyo-v2', fieldValues: { faction_role: '未定' }, status: 'changes_requested', reviewMessage: '請補充「立場」欄位，並說明與宵霧的關係。', submittedAt: '5 天前', reviewedAt: '3 天前', reviewedBy: 'host' },
    // a teammate's submitted application the Host reviews
    { id: 'ap4', projectId: 'tokoyo', characterId: 'cand-yuki', applicantUserId: '@hoshimi', templateVersionId: 'tpl-tokoyo-v2', fieldValues: { faction_role: '客座 · 雪童子', stance: '中立' }, status: 'submitted', reviewMessage: '', submittedAt: '昨天', reviewedAt: null, reviewedBy: null },
  ];

  // ---- ContentSubmission (Slice 5D) ----
  // SEPARATE from CharacterApplication. Image/text works submitted to a project.
  // Approval result is type-specific (AssetLink OR Story content) — never the
  // character roster. payload is typed per submissionType; we keep both an
  // assetPayload and textPayload shape, only one used per row.
  //   submissionType: asset | text
  //   status: draft | submitted | changes_requested | approved | rejected | withdrawn
  //   destinationType/destinationId: written ONLY on approval (provenance)
  //   revision: concurrency guard (handoff)
  var contentSubmissions = [
    // image draft → proposes gallery + character avatar links
    { id: 'cs1', projectId: 'tokoyo', submitterUserId: 'me', submissionType: 'asset', status: 'draft', revision: 1,
      payload: { assetId: 'as-fan1', caption: '宵霧的賀圖，想放進圖庫和角色頁。', visibility: 'public', attributionConfirmation: true,
        proposedLinks: [ { targetType: 'gallery', targetId: 'tokoyo', role: 'gallery' }, { targetType: 'character', targetId: 'yoi', role: 'gallery' } ] },
      destinationType: null, destinationId: null, submittedAt: null, reviewedAt: null, reviewedBy: null, reviewMessage: '' },
    // image submitted (teammate) → relationship album
    { id: 'cs2', projectId: 'tokoyo', submitterUserId: '@hoshimi', submissionType: 'asset', status: 'submitted', revision: 2,
      payload: { assetId: 'as-fan2', caption: '宵霧 × 望 的共鬥圖。', visibility: 'public', attributionConfirmation: true,
        proposedLinks: [ { targetType: 'relationshipAlbum', targetId: 'rel-yoi-nozomi', role: 'relationship_album' } ] },
      destinationType: null, destinationId: null, submittedAt: '昨天', reviewedAt: null, reviewedBy: null, reviewMessage: '' },
    // text draft → append to existing chapter
    { id: 'cs3', projectId: 'tokoyo', submitterUserId: 'me', submissionType: 'text', status: 'draft', revision: 1,
      payload: { title: '雪夜後記', summary: '望離開後的短記。', content: '雪停了。神社的燈還亮著，像是有人記得。', destinationIntent: 'append_to_chapter', targetId: 'ch1', visibility: 'members' },
      destinationType: null, destinationId: null, submittedAt: null, reviewedAt: null, reviewedBy: null, reviewMessage: '' },
    // text submitted (teammate) → create new story event
    { id: 'cs4', projectId: 'tokoyo', submitterUserId: '@kanata', submissionType: 'text', status: 'submitted', revision: 1,
      payload: { title: '月蝕停戰', summary: '晝廷與守燈人的短暫停戰。', content: '月蝕之夜，兩方在神社前對峙，卻誰也沒有舉劍。', destinationIntent: 'create_story_event', targetId: null, visibility: 'public' },
      destinationType: null, destinationId: null, submittedAt: '2 天前', reviewedAt: null, reviewedBy: null, reviewMessage: '' },
    // text changes_requested
    { id: 'cs5', projectId: 'tokoyo', submitterUserId: 'me', submissionType: 'text', status: 'changes_requested', revision: 3,
      payload: { title: '守燈人的起源', summary: '', content: '（草稿）守燈人結社的由來……', destinationIntent: 'create_story', targetId: null, visibility: 'public' },
      destinationType: null, destinationId: null, submittedAt: '6 天前', reviewedAt: '4 天前', reviewedBy: 'host', reviewMessage: '請補一段摘要，並確認是否與「守燈人記」重疊。' },
    // approved image → gallery (shows provenance)
    { id: 'cs6', projectId: 'tokoyo', submitterUserId: '@hoshimi', submissionType: 'asset', status: 'approved', revision: 2,
      payload: { assetId: 'as-fan3', caption: '常夜國風景。', visibility: 'public', attributionConfirmation: true,
        proposedLinks: [ { targetType: 'gallery', targetId: 'tokoyo', role: 'gallery' } ] },
      destinationType: 'gallery', destinationId: 'tokoyo', submittedAt: '上週', reviewedAt: '上週', reviewedBy: 'host', reviewMessage: '' },
    // approved text → chapter (provenance)
    { id: 'cs7', projectId: 'tokoyo', submitterUserId: '@kanata', submissionType: 'text', status: 'approved', revision: 1,
      payload: { title: '燈火不滅', summary: '守燈人記的後續章節。', content: '……', destinationIntent: 'create_chapter', targetId: 'st1', visibility: 'public' },
      destinationType: 'chapter', destinationId: 'ch-new-1', submittedAt: '上週', reviewedAt: '上週', reviewedBy: 'host', reviewMessage: '' },
    // rejected
    { id: 'cs8', projectId: 'tokoyo', submitterUserId: '@kanata', submissionType: 'asset', status: 'rejected', revision: 1,
      payload: { assetId: 'as-fan4', caption: '', visibility: 'public', attributionConfirmation: false,
        proposedLinks: [ { targetType: 'gallery', targetId: 'tokoyo', role: 'gallery' } ] },
      destinationType: null, destinationId: null, submittedAt: '上週', reviewedAt: '上週', reviewedBy: 'host', reviewMessage: '未確認授權來源，請補充後再投。' },
  ];
  // extra assets referenced by content submissions (fan works, varying processingStatus)
  var SUBMISSION_ASSETS = [
    { id: 'as-fan1', projectId: 'tokoyo', title: '宵霧賀圖', processingStatus: 'ready', ownerUserId: 'me', creatorName: '我', license: '自繪', kind: 'illustration', c: '#8FA3B0' },
    { id: 'as-fan2', projectId: 'tokoyo', title: '共鬥圖', processingStatus: 'ready', ownerUserId: '@hoshimi', creatorName: '@hoshimi', license: '原創', kind: 'illustration', c: '#2E6F6A' },
    { id: 'as-fan3', projectId: 'tokoyo', title: '常夜國風景', processingStatus: 'ready', ownerUserId: '@hoshimi', creatorName: '@hoshimi', license: '原創', kind: 'illustration', c: '#3B5E6B' },
    { id: 'as-fan4', projectId: 'tokoyo', title: '未確認授權圖', processingStatus: 'ready', ownerUserId: '@kanata', creatorName: '?', license: '未確認', kind: 'illustration', c: '#9E332B' },
    { id: 'as-fan5', projectId: 'tokoyo', title: '處理中的圖', processingStatus: 'processing', ownerUserId: 'me', creatorName: '我', license: '自繪', kind: 'illustration', c: '#C2702C' },
  ];


  // ---- Public Page Builder (PB0) ----
  // PublicPageTemplate (公開頁版型) = how a page is laid out/displayed. Distinct
  // from ProjectTemplate (角色卡欄位模板 = data input). Block tree:
  //   Page > Section > Stack|Grid > Block  (max 3 nesting levels).
  // Blocks BIND to existing data (Character/Link/Project/Asset…) via
  // {source, entity, field} — never copying a second source of truth.
  // purpose: character | project_character | project | commission | custom
  function blk(type, props, children, lock) { return { id: 'b' + (blk._n = (blk._n || 0) + 1), type: type, props: props || {}, children: children || null, lock: lock || null }; }

  // a host project page template (公開頁版型) with locked/required/member-overridable blocks
  var pageTemplates = [
    { id: 'ppt-tokoyo-char', projectId: 'tokoyo', name: '常夜國 · 角色頁版型', purpose: 'project_character', status: 'published', version: 1,
      tree: { type: 'page', props: { maxWidth: 960, bg: '#F7F7F8', accent: '#3B5E6B', font: 'serif' }, children: [
        { type: 'section', props: { pad: 'lg' }, lock: { locked: true, label: '企劃標頭（鎖定）' }, children: [
          { type: 'stack', props: { align: 'center', gap: 'sm' }, children: [
            { type: 'project_logo', props: { bind: { source: 'project', field: 'name' } }, lock: { locked: true } },
            { type: 'heading', props: { bind: { source: 'character', field: 'name' }, size: 'xl' }, lock: { locked: true, label: '角色名稱' } },
            { type: 'project_fields', props: { bind: { source: 'link', fields: ['faction', 'projectRole'] } }, lock: { required: true, memberCanHide: false, label: '陣營／職位（必填）' } },
          ] },
        ] },
        { type: 'section', props: { pad: 'md' }, children: [
          { type: 'grid', props: { cols: 2, gap: 'md' }, children: [
            { type: 'character_profile', props: { bind: { source: 'character' }, fields: ['summary', 'species'] }, lock: { memberCanReorder: true, memberCanRestyle: true } },
            { type: 'gallery', props: { bind: { source: 'assetLink', role: 'gallery' } }, lock: { memberCanHide: true } },
          ] },
        ] },
        { type: 'section', props: { pad: 'md' }, children: [
          { type: 'color_palette', props: { bind: { source: 'character', field: 'palette' } }, lock: { memberCanHide: true } },
          { type: 'link_button', props: { label: '聯絡委託', href: '#' }, lock: { memberCanHide: true, memberCanRestyle: true } },
        ] },
      ] } },
    // worldEntry 公開頁版型（暗色怪談主題）— 批次套用到地點/組織/事件/名詞
    { id: 'ppt-tokoyo-world', projectId: 'tokoyo', name: '常夜國 · 世界觀條目版型', purpose: 'worldEntry', status: 'published', version: 1,
      theme: { bg: '#1A1A1F', titleFont: 'serif', bodyFont: 'sans', primary: '#C7A14A', accent: '#9E332B', text: '#E8E4DC', card: '#23232A', radius: 'md', spacing: 'lg', maxWidth: 800 },
      tree: { type: 'page', props: { maxWidth: 800, bg: '#1A1A1F', accent: '#C7A14A', font: 'serif', theme: 'dark-kaidan' }, children: [
        { type: 'section', props: { pad: 'lg' }, lock: { locked: true, label: '標頭（鎖定）' }, children: [
          { type: 'heading', props: { bind: { source: 'project', field: 'name' }, size: 'sm', variant: 'note' }, lock: { locked: true } },
          { type: 'heading', props: { text: '世界觀條目', size: 'xl', variant: 'scroll' }, lock: { required: true } },
        ] },
        { type: 'section', props: { pad: 'md' }, children: [
          { type: 'text', props: { text: '條目摘要…', variant: 'quote' }, lock: { memberCanRestyle: true } },
          { type: 'text', props: { text: '條目內容…', variant: 'body' }, lock: { memberCanHide: true, memberCanReorder: true } },
        ] },
      ] } },
  ];

  // PublicPage instances (Draft/Published versions). dataRef points at the
  // source entities; layout is the editable block tree (Draft).
  var publicPages = [
    { id: 'pp1', projectId: 'tokoyo', ownerUserId: 'me', name: '宵霧 · 角色頁', purpose: 'project_character', templateId: 'ppt-tokoyo-char', dataRef: { characterId: 'yoi', linkId: 'lk1', projectId: 'tokoyo' }, slug: 'tokoyo/yoi', visibility: 'public', status: 'published', hasUnpublished: true, updatedAt: '昨天', publishedVersion: 1 },
    { id: 'pp2', projectId: 'tokoyo', ownerUserId: 'me', name: '常夜國 · 企劃頁', purpose: 'project', templateId: null, dataRef: { projectId: 'tokoyo' }, slug: 'tokoyo', visibility: 'public', status: 'published', hasUnpublished: false, updatedAt: '3 天前', publishedVersion: 2 },
    { id: 'pp3', projectId: 'tokoyo', ownerUserId: 'me', name: '望 · 角色頁', purpose: 'project_character', templateId: 'ppt-tokoyo-char', dataRef: { characterId: 'nozomi', linkId: 'lk3', projectId: 'tokoyo' }, slug: 'tokoyo/nozomi', visibility: 'unlisted', status: 'draft', hasUnpublished: true, updatedAt: '今天', publishedVersion: null },
    { id: 'pp4', projectId: null, ownerUserId: 'me', name: '委託資訊頁', purpose: 'commission', templateId: null, dataRef: {}, slug: 'me/commission', visibility: 'private', status: 'draft', hasUnpublished: true, updatedAt: '上週', publishedVersion: null },
    // worldEntry pages — ONE template batch-applied across place/org/event (no data copy)
    { id: 'pp5', projectId: 'tokoyo', ownerUserId: 'me', name: '廢稻荷神社 · 條目頁', purpose: 'worldEntry', templateId: 'ppt-tokoyo-world', dataRef: { worldEntryId: 'w-shrine', projectId: 'tokoyo' }, slug: 'tokoyo/w/shrine', visibility: 'public', status: 'published', hasUnpublished: false, updatedAt: '昨天', publishedVersion: 1 },
    { id: 'pp6', projectId: 'tokoyo', ownerUserId: 'me', name: '守燈人 · 條目頁', purpose: 'worldEntry', templateId: 'ppt-tokoyo-world', dataRef: { worldEntryId: 'w-tomoribito', projectId: 'tokoyo' }, slug: 'tokoyo/w/tomoribito', visibility: 'public', status: 'published', hasUnpublished: false, updatedAt: '昨天', publishedVersion: 1 },
    { id: 'pp7', projectId: 'tokoyo', ownerUserId: 'me', name: '守燈之約 · 條目頁', purpose: 'worldEntry', templateId: 'ppt-tokoyo-world', dataRef: { worldEntryId: 'w-pact', projectId: 'tokoyo' }, slug: 'tokoyo/w/pact', visibility: 'public', status: 'published', hasUnpublished: true, updatedAt: '今天', publishedVersion: 1 },
  ];

  // Block Registry: type → {label, category, defaultProps}. Single source for
  // block UI so every block uses the same inspector contract.
  var BLOCK_REGISTRY = [
    { type: 'section', label: 'Section 區段', cat: 'layout', def: { pad: 'md' } },
    { type: 'stack', label: 'Stack 直排', cat: 'layout', def: { gap: 'md', align: 'start' } },
    { type: 'grid', label: 'Grid 網格', cat: 'layout', def: { cols: 2, gap: 'md' } },
    { type: 'heading', label: '標題', cat: 'content', def: { size: 'lg', text: '標題' } },
    { type: 'text', label: '文字', cat: 'content', def: { text: '段落文字…' } },
    { type: 'image', label: '圖片', cat: 'content', def: {} },
    { type: 'character_profile', label: '角色檔案', cat: 'data', def: {} },
    { type: 'project_fields', label: '企劃限定欄位', cat: 'data', def: {} },
    { type: 'color_palette', label: '色票', cat: 'data', def: {} },
    { type: 'gallery', label: '圖庫', cat: 'data', def: {} },
    { type: 'link_button', label: '連結按鈕', cat: 'content', def: { label: '按鈕', href: '#' } },
    { type: 'divider', label: '分隔線', cat: 'layout', def: {} },
    { type: 'spacer', label: '間距', cat: 'layout', def: { h: 24 } },
    { type: 'project_logo', label: '企劃標誌', cat: 'data', def: {} },
  ];




  var relationships = [
    { id: 'rel1', projectId: 'tokoyo', sourceRef: { type: 'character', id: 'yoi' }, targetRef: { type: 'character', id: 'tomori' }, type: 'pact', group: 'bond', label: '守燈之約', description: '舊燈成精，與宵霧立約同守夜路。', direction: 'both', visibility: 'public', srcView: '唯一能託付背後的存在。宵霧把燈守當作同行的老搭檔。', tgtView: '點燈的人。燈守說，只要這盞燈還在，就不會讓宵霧獨行。', timeline: [['建社之初', '舅燈成精，認出夜行的宵霧'], ['立約', '二人立下守燈之約'], ['月蝕之夜', '共守神社，未曾分離']], album: ['立約 · 夜', '神社', '老燈', '守夜'] },
    { id: 'rel2', projectId: 'tokoyo', sourceRef: { type: 'character', id: 'nozomi' }, targetRef: { type: 'character', id: 'yoi' }, type: 'longing', group: 'romance', label: '單戀', description: '望多年後重回神社，暗自記掛宵霧。', direction: 'forward', visibility: 'public', srcView: '被點過燈、又回來的人。望說不清那是感激還是別的什麼，只知道每到雪夜就想往神社走。', tgtView: '少數能好好說話的人類。宵霧把望當作「被點過燈、卻又回來」的稀有存在——談不上更多，但願他平安。', timeline: [['雪夜', '迷途的望被宵霧點燈引路'], ['多年後', '望重回神社道謝'], ['現在', '少數能與宵霧對話的人']], album: ['初遇 · 雪夜', '望 · 立繪', '重逢 · 神社', '茶席'] },
    { id: 'rel3', projectId: 'tokoyo', sourceRef: { type: 'character', id: 'hiru' }, targetRef: { type: 'character', id: 'yoi' }, type: 'rivalry', group: 'conflict', label: '對立 · 牽絆', description: '立場相反，卻在月蝕之夜替宵霧擋劫。', direction: 'both', visibility: 'public' },
    { id: 'rel4', projectId: 'tokoyo', sourceRef: { type: 'character', id: 'aka' }, targetRef: { type: 'character', id: 'hiru' }, type: 'feud', group: 'conflict', label: '舊怨', description: '緋與晝廷有未了的恩怨。', direction: 'both', visibility: 'members' },
    // character ↔ worldview relation
    { id: 'rel5', projectId: 'tokoyo', sourceRef: { type: 'character', id: 'yoi' }, targetRef: { type: 'world', id: 'w-shrine' }, type: 'belong', group: '', label: '駐守', description: '宵霧長居廢稻荷神社。', direction: 'forward', visibility: 'public' },
    { id: 'rel6', projectId: 'tokoyo', sourceRef: { type: 'character', id: 'hai' }, targetRef: { type: 'character', id: 'yoi' }, type: 'unspoken', group: 'bond', label: '未言明', description: '他記得灰，灰卻不記得他。', direction: 'forward', visibility: 'private' },
  ];

  // RelationshipGroup — project-scoped clusters (好朋友／戀愛線／敵對…).
  // A relationship's `group` references one of these ids ('' = 未分組).
  var relationshipGroups = {
    tokoyo: [
      { id: 'bond', name: '羈絆', c: '#5E7E55' },
      { id: 'romance', name: '戀愛線', c: '#B5654A' },
      { id: 'conflict', name: '敵對', c: '#9E332B' },
    ],
  };

  // ---- RelationshipLayout (Project-scoped). Stores ONLY canvas placement:
  // nodePositions / groupPositions / collapsedGroups / viewport / edgeRoutes.
  // label, direction, source/target, type all come from Relationship — never
  // duplicated here. edgeRoutes[relationshipId] holds optional manual curves;
  // deleting a Relationship must drop its edgeRoute too. ----
  var relationshipLayouts = {
    tokoyo: {
      nodePositions: { yoi: { x: 0.5, y: 0.46 }, tomori: { x: 0.26, y: 0.30 }, nozomi: { x: 0.76, y: 0.28 }, hiru: { x: 0.78, y: 0.66 }, aka: { x: 0.52, y: 0.82 }, hai: { x: 0.22, y: 0.66 }, 'w-shrine': { x: 0.30, y: 0.50 } },
      groupPositions: {}, collapsedGroups: [], viewport: null, edgeRoutes: {},
    },
  };


  // ---- Character BODY detail (account-owned). DATA GAP: these live on the
  // Character, NOT on any ProjectCharacterLink. privateNotes is owner-only and
  // must NEVER be shared. shareDefaults / hostOnly belong elsewhere (see below).
  // entity: { general, art, text, gallery } — each a Character sub-document.
  var DETAILS = {
    yoi: {
      general: { tagline: '在無人的夜路替迷途者點一盞燈。', basics: [['年齡', '外觀二十出頭'], ['身高', '178cm'], ['性別', '無固定'], ['種族', '妖狐']], personality: '寡言、毒舌，記得每一個遇過的人。對「被忘記」這件事格外敏感。', tags: ['妖狐', '夜行', '毒舌', '溫柔', '守燈'] },
      art: {
        palette: [['髮', '#2E3138'], ['瞳', '#C7A14A'], ['衣', '#8FA3B0'], ['點綴', '#9E332B']],
        mustDraw: ['左眼下的淚痣', '尾巴末端褪成灰白', '提燈不離手'],
        avoid: ['雙眼同色（右眼偏金）', '尾巴畫成純白', '笑得太開'],
        accessories: ['舊紙燈', '褪色的紅繩', '狐面（掛在腰側）'],
        freeform: '服裝時代感可自由，但保留「夜」的低彩度。',
      },
      text: {
        background: '常夜國邊境廢稻荷神社的守夜者。與舊燈成精的「燈守」立下守燈之約。',
        motivation: '不讓任何人在夜路上被忘記、被留下。',
        speech: '短句、偏冷，偶爾毒舌；極少用敬語。',
        relations: '與望有跨越歲月的牽絆；與晝立場相對卻互相在意。',
        taboo: '不可被描寫成主動傾訴情感的人；不提「灰」的名字。',
        canUse: ['夜間場景', '點燈儀式', '與望重逢'],
        cannotUse: ['原創死亡結局', '與晝廷和解的官方化'],
      },
      gallery: [['立繪 · 正面', 'art'], ['立繪 · 背面', 'art'], ['表情集', 'ref'], ['提燈設定', 'ref']],
      visibility: 'public', updatedAt: '2026-06-08',
      privateNotes: '（私人筆記）灰的真實身分先不公開，等主線推進。', // owner-only, never shared
    },
    nozomi: {
      general: { tagline: '雪夜被點燈引路，多年後重回神社。', basics: [['年齡', '27'], ['身高', '170cm'], ['種族', '人類']], personality: '溫和、固執，記性極好。', tags: ['人類', '旅人', '暗戀'] },
      art: { palette: [['髮', '#3A4A47'], ['瞳', '#2E6F6A'], ['衣', '#6F7E6A']], mustDraw: ['圍巾', '左手舊傷'], avoid: ['過於年輕'], accessories: ['舊地圖', '圍巾'], freeform: '旅裝為主。' },
      text: { background: '幼時雪夜迷路被宵霧點燈引導，長大後成為旅人重回常夜國。', motivation: '想再見宵霧一面，確認那一夜不是夢。', speech: '禮貌、帶點距離。', relations: '單方面記掛宵霧。', taboo: '不要寫成輕浮的人。', canUse: ['重逢', '旅途'], cannotUse: [] },
      gallery: [['立繪', 'art']], visibility: 'public', updatedAt: '2026-05-30', privateNotes: '',
    },
    hai: {
      general: { tagline: '他記得灰，灰卻不記得他。', basics: [['種族', '未定']], personality: '（未定稿）', tags: ['未定稿'] },
      art: { palette: [['主色', '#8A857C']], mustDraw: [], avoid: [], accessories: [], freeform: '草稿，外觀未定。' },
      text: { background: '與宵霧之間有未言明的牽連。', motivation: '', speech: '', relations: '', taboo: '', canUse: [], cannotUse: [] },
      gallery: [], visibility: 'private', updatedAt: '2026-06-01', privateNotes: '（私人筆記）這隻其實是宵霧失去的記憶具象化。',
    },
    guest1: {
      general: { tagline: '由共創夥伴帶入常夜國的客座角色。', basics: [['種族', '雪女']], personality: '安靜、疏離。', tags: ['雪女', '客座'] },
      art: { palette: [['髮', '#D8E4EC'], ['瞳', '#7FA8C9']], mustDraw: ['結霜的睫毛'], avoid: [], accessories: ['冰簪'], freeform: '' },
      text: { background: '雪山來的雪女，受守燈人之托暫居常夜國。', motivation: '', speech: '輕、慢。', relations: '', taboo: '', canUse: [], cannotUse: [] },
      gallery: [['立繪', 'art']], visibility: 'public', updatedAt: '2026-05-20', privateNotes: '',
    },
    guest2: {
      general: { tagline: '校園 AU 的同班同學。', basics: [['年齡', '17'], ['社團', '文藝社']], personality: '愛看書、怕生。', tags: ['一般生', '文藝社'] },
      art: { palette: [['髮', '#C2702C']], mustDraw: ['總是抱著書'], avoid: [], accessories: ['書', '眼鏡'], freeform: '' },
      text: { background: '校園 AU 的同班同學。', motivation: '', speech: '小聲。', relations: '', taboo: '', canUse: [], cannotUse: [] },
      gallery: [], visibility: 'public', updatedAt: '2026-06-02', privateNotes: '' },
  };
  function blankDetail() {
    return { general: { tagline: '', basics: [], personality: '', tags: [] }, art: { palette: [], mustDraw: [], avoid: [], accessories: [], freeform: '' }, text: { background: '', motivation: '', speech: '', relations: '', taboo: '', canUse: [], cannotUse: [] }, gallery: [], visibility: 'public', updatedAt: '', privateNotes: '' };
  }

  var current = 'tokoyo';

  function ownerSummary(uid) {
    if (uid === viewer.id) return { id: uid, label: '你', mine: true };
    return { id: uid, label: uid, mine: false };
  }

  window.OCData = {
    viewer: viewer, roles: ROLES, roleLabel: ROLE_LABEL,
    projects: projects, entities: entities, factions: factions, links: links, typeLabel: TYPE_LABEL,
    features: ALL_FEATURES, entityLinks: entityLinks, relationships: relationships, relationshipLayouts: relationshipLayouts,
    stories: stories, chapters: chapters, storyEvents: storyEvents, assets: assets, assetLinks: assetLinks,
    inspirations: inspirations, inspirationLinks: inspirationLinks,
    projectTemplates: projectTemplates, templateFields: templateFields, applications: applications,
    contentSubmissions: contentSubmissions,
    pageTemplates: pageTemplates, publicPages: publicPages, blockRegistry: BLOCK_REGISTRY,

    // ---- current project context (set by shell) ----
    setCurrent: function (pid) { if (this.project(pid)) current = pid; },
    current: function () { return current; },

    // ---- role / capability (Demo) ----
    // currentProjectMembership.role: demo override (localStorage) wins, else the
    // viewer's stored projectRoles[pid], else visitor.
    getRole: function (pid) {
      var ov = get('ch:role'); if (ROLES.indexOf(ov) >= 0) return ov;
      return viewer.projectRoles[pid || current] || 'visitor';
    },
    setRole: function (r) { if (ROLES.indexOf(r) >= 0) set('ch:role', r); },
    currentMembership: function (pid) { pid = pid || current; return { projectId: pid, role: this.getRole(pid) }; },
    caps: function (pid) { return CAPS[this.getRole(pid)] || {}; },
    can: function (cap, pid) { return !!this.caps(pid)[cap]; },
    // action-level permission (product concept). Use this for buttons.
    canAction: function (action, pid) { var g = ACTION_GRANTS[this.getRole(pid)] || {}; return !!g[action]; },
    isPreview: function (pid) { return this.getRole(pid) === 'visitor'; },

    // ---- projects ----
    project: function (id) { return projects.filter(function (p) { return p.id === id; })[0] || null; },
    hasFeature: function (pid, feat) { var p = this.project(pid); return !!(p && p.enabledFeatures && p.enabledFeatures.indexOf(feat) >= 0); },

    // ---- entities ----
    byProject: function (id, type) { return entities.filter(function (e) { return e.project === id && (!type || e.type === type); }); },
    characters: function (id) { return this.byProject(id, 'character'); },
    worldview: function (id) { return entities.filter(function (e) { return e.project === id && e.type !== 'character'; }); },
    entity: function (id) { return entities.filter(function (e) { return e.id === id; })[0] || null; },
    identity: function (id) { var e = this.entity(id); return e ? { name: e.name, rom: e.rom, sp: e.sp, c: e.c } : null; },
    ownerSummary: ownerSummary,

    // ---- account-scope: the viewer's own Character bodies ----
    myCharacters: function () {
      var self = this;
      var mine = entities.filter(function (e) { return e.type === 'character' && e.ownerUserId === viewer.id && e.status !== 'archived'; });
      var seen = {}, out = [];
      mine.forEach(function (e) { if (!seen[e.id]) { seen[e.id] = 1; out.push(e); } });
      return out.map(function (e) { return Object.assign({}, e, { links: self.linksOfCharacter(e.id) }); });
    },
    // archived account characters (separate list, kept out of normal views)
    myArchivedCharacters: function () { var v = viewer.id; return entities.filter(function (e) { return e.type === 'character' && e.ownerUserId === v && e.status === 'archived'; }); },
    // active projects only (archived kept out of switcher / lists)
    activeProjects: function () { return projects.filter(function (p) { return p.status !== 'archived'; }); },

    // ---- ProjectCharacterLink helpers ----
    linksFor: function (project, opts) {
      opts = opts || {};
      return links.filter(function (l) {
        if (l.project !== project) return false;
        if (opts.statuses) return opts.statuses.indexOf(l.status) >= 0;
        if (opts.approvedOnly) return l.status === 'approved';
        return l.status !== 'archived' || opts.includeArchived;
      });
    },
    linksOfCharacter: function (charId) {
      return links.filter(function (l) { return l.character === charId && l.status !== 'archived' && l.status !== 'removed'; })
        .map(function (l) {
          var p = window.OCData.project(l.project);
          return { id: l.id, project: l.project, projectName: p ? p.name : l.project, projectColor: p ? p.c : '#8A857C',
            faction: l.faction, projectRole: l.projectRole, status: l.status, reviewMessage: l.reviewMessage || '' };
        });
    },
    // roster rows: link + resolved identity. opts.statuses / approvedOnly / includeArchived
    roster: function (project, opts) {
      var self = this;
      return this.linksFor(project, opts).map(function (l) {
        var e = self.entity(l.character) || {};
        var f = (factions[project] || []).filter(function (x) { return x.id === l.faction; })[0];
        var os = ownerSummary(l.ownerUserId);
        return {
          linkId: l.id, character: l.character, ownerUserId: l.ownerUserId, ownerSummary: os, mine: os.mine,
          name: e.name, rom: e.rom, sp: e.sp, c: e.c, blurb: e.blurb,
          faction: l.faction, factionName: f ? f.name : '未分組', factionColor: f ? f.c : '#8A857C',
          projectRole: l.projectRole, status: l.status, templateVersionId: l.templateVersionId,
          projectVisibility: l.projectVisibility, fieldValues: l.fieldValues || {}, reviewMessage: l.reviewMessage || '',
        };
      });
    },
    pendingCount: function (project) { return links.filter(function (l) { return l.project === project && l.status === 'pending'; }).length; },
    factionsOf: function (project) { return (factions[project] || []).slice(); },

    // ---- Slice 5B: Membership / Invitation / Permissions ----
    users: users,
    user: function (id) { return users[id] || { id: id, name: id, handle: id, c: '#8A857C' }; },
    rolePresetLabel: function (p) { return ROLE_PRESET_LABEL[p] || p; },
    permGroups: PERM_GROUPS,
    permLabel: function (code) {
      for (var i = 0; i < PERM_GROUPS.length; i++) { var a = PERM_GROUPS[i][2]; for (var j = 0; j < a.length; j++) if (a[j][0] === code) return a[j][1]; }
      return code;
    },
    members: function (projectId) {
      return memberships.filter(function (m) { return m.projectId === projectId && m.status === 'active'; })
        .map(function (m) {
          var u = users[m.userId] || { id: m.userId, name: m.userId, handle: m.userId, c: '#8A857C' };
          var charCount = links.filter(function (l) { return l.project === projectId && l.ownerUserId === m.userId && l.status !== 'removed'; }).length;
          var overrides = permissionOverrides.filter(function (o) { return o.membershipId === m.id; });
          return { id: m.id, userId: m.userId, name: u.name, handle: u.handle, c: u.c,
            rolePreset: m.rolePreset, rolePresetLabel: ROLE_PRESET_LABEL[m.rolePreset], joinedAt: m.joinedAt,
            invitedBy: m.invitedBy, charCount: charCount, overrideCount: overrides.length, overrides: overrides,
            isOwner: m.rolePreset === 'owner' };
        });
    },
    membership: function (id) { return memberships.filter(function (m) { return m.id === id; })[0] || null; },
    myMembership: function (projectId) { return memberships.filter(function (m) { return m.projectId === projectId && m.userId === viewer.id && m.status === 'active'; })[0] || null; },
    invitations: function (projectId) { return invitations.filter(function (i) { return i.projectId === projectId; }).slice(); },
    pendingInvites: function (projectId) { return invitations.filter(function (i) { return i.projectId === projectId && i.status === 'pending'; }).length; },
    isMember: function (projectId, handle) { return memberships.some(function (m) { return m.projectId === projectId && m.status === 'active' && (m.userId === handle); }); },
    hasPendingInvite: function (projectId, handle) { return invitations.some(function (i) { return i.projectId === projectId && i.status === 'pending' && i.emailOrHandle === handle; }); },
    ownerCount: function (projectId) { return memberships.filter(function (m) { return m.projectId === projectId && m.status === 'active' && m.rolePreset === 'owner'; }).length; },

    // resolve effective permissions for a membership: preset + overrides
    // returns { code: { effect:'allow'|'deny', source:'preset'|'allow'|'deny'|'ownerFixed' } }
    effectivePerms: function (membership) {
      var out = {}; var preset = membership.rolePreset;
      var presetList = ROLE_PERMS[preset] || [];
      var all = preset === 'owner';
      PERM_GROUPS.forEach(function (g) {
        g[2].forEach(function (row) {
          var code = row[0];
          if (all) { out[code] = { effect: 'allow', source: OWNER_FIXED.indexOf(code) >= 0 ? 'ownerFixed' : 'preset' }; return; }
          var granted = presetList.indexOf(code) >= 0;
          out[code] = { effect: granted ? 'allow' : 'deny', source: granted ? 'preset' : 'none' };
        });
      });
      // apply per-member overrides
      permissionOverrides.filter(function (o) { return o.membershipId === membership.id; }).forEach(function (o) {
        if (OWNER_FIXED.indexOf(o.permission) >= 0 && preset !== 'owner') { out[o.permission] = { effect: 'deny', source: 'ownerFixed' }; return; }
        out[o.permission] = { effect: o.effect, source: o.effect === 'allow' ? 'allow' : 'deny' };
      });
      return out;
    },
    canAction: function (action, projectId, handle) {
      var pid = projectId || current; var uid = handle || viewer.id;
      // Demo role toggle (ch:role) overrides the viewer's stored preset so the
      // sidebar "視角" switch also drives action-permission previews.
      var demo = (!handle) && get('ch:role');
      if (demo && ROLES.indexOf(demo) >= 0 && uid === viewer.id) {
        if (demo === 'visitor') return false;
        if (demo === 'owner') return true;
        if (OWNER_FIXED.indexOf(action) >= 0) return false;
        return (ROLE_PERMS[demo] || []).indexOf(action) >= 0;
      }
      var m = memberships.filter(function (x) { return x.projectId === pid && x.userId === uid && x.status === 'active'; })[0];
      if (!m) return false;
      if (m.rolePreset === 'owner') return true;
      if (OWNER_FIXED.indexOf(action) >= 0) return false;
      var ov = permissionOverrides.filter(function (o) { return o.membershipId === m.id && o.permission === action; })[0];
      if (ov) return ov.effect === 'allow';
      return (ROLE_PERMS[m.rolePreset] || []).indexOf(action) >= 0;
    },


    worldEntries: function (projectId, opts) {
      opts = opts || {};
      return entities.filter(function (e) {
        if (e.project !== projectId || e.type === 'character') return false;
        if (e.status === 'archived' || e.status === 'removed') return false;
        if (opts.publicOnly && e.visibility !== 'public') return false;
        return true;
      }).slice().sort(function (a, b) { return (a.sortOrder || 0) - (b.sortOrder || 0); });
    },
    worldEntry: function (id) { var e = this.entity(id); return e && e.type !== 'character' ? e : null; },
    worldChildren: function (projectId, parentId, opts) {
      return this.worldEntries(projectId, opts).filter(function (e) { return (e.parentId || null) === (parentId || null); });
    },
    worldAncestors: function (id) {
      var out = [], cur = this.entity(id), guard = 0;
      while (cur && cur.parentId && guard++ < 20) { var p = this.entity(cur.parentId); if (!p) break; out.unshift(p); cur = p; }
      return out;
    },
    // would setting entry.parentId = newParent create a cycle?
    wouldCycle: function (id, newParentId) {
      var cur = newParentId, guard = 0;
      while (cur && guard++ < 50) { if (cur === id) return true; var p = this.entity(cur); cur = p ? p.parentId : null; }
      return false;
    },
    descendantCount: function (id) {
      var self = this, n = 0;
      (function walk(pid) { entities.forEach(function (e) { if (e.parentId === pid && e.type !== 'character' && e.status !== 'archived' && e.status !== 'removed') { n++; walk(e.id); } }); })(id);
      return n;
    },

    // is an entity (char or worldentry) publicly visible? characters use
    // body visibility (DETAILS) else entity.visibility; worldentries use .visibility.
    isEntityPublic: function (id) {
      var e = this.entity(id); if (!e) return false;
      if (e.type === 'character') { var d = DETAILS[id]; return (d ? d.visibility : e.visibility || 'public') === 'public'; }
      return (e.visibility || 'public') === 'public';
    },
    // ---- EntityLink (cross-entity relations source of truth) ----
    // opts.publicOnly: crop a link unless the link AND source AND target are all
    // public — never leak a private character/entry's name or avatar. Reverse
    // relations are read from the SAME link (no duplicate link rows).
    linksOfEntity: function (projectId, entityId, opts) {
      opts = opts || {};
      var self = this;
      return entityLinks.filter(function (l) {
        if (l.projectId !== projectId || (l.sourceId !== entityId && l.targetId !== entityId)) return false;
        if (opts.publicOnly) {
          if (l.visibility && l.visibility !== 'public') return false;
          if (!self.isEntityPublic(l.sourceId) || !self.isEntityPublic(l.targetId)) return false;
        }
        return true;
      }).map(function (l) {
          var otherIsSource = l.targetId === entityId;
          var otherId = otherIsSource ? l.sourceId : l.targetId;
          var otherType = otherIsSource ? l.sourceType : l.targetType;
          var e = window.OCData.entity(otherId) || {};
          return { id: l.id, label: l.label, relationType: l.relationType, dir: otherIsSource ? 'in' : 'out',
            targetType: otherType, targetId: otherId, name: e.name || otherId, color: e.c || '#8A857C',
            summary: e.summary || e.blurb || '', isChar: otherType === 'character' };
        });
    },

    // ---- Relationships (Project-scoped) ----
    // public cropping for relationships: link visible AND both ends public
    relationshipsOf: function (projectId, opts) {
      opts = opts || {};
      var self = this;
      return relationships.filter(function (r) {
        if (r.projectId !== projectId) return false;
        if (opts.publicOnly) {
          if (r.visibility !== 'public') return false;
          if (!self.isEntityPublic(r.sourceRef.id) || !self.isEntityPublic(r.targetRef.id)) return false;
        }
        return true;
      }).map(function (r) {
        var s = window.OCData.entity(r.sourceRef.id) || {}, t = window.OCData.entity(r.targetRef.id) || {};
        return Object.assign({}, r, {
          source: { id: r.sourceRef.id, type: r.sourceRef.type, name: s.name || r.sourceRef.id, color: s.c || '#8A857C' },
          target: { id: r.targetRef.id, type: r.targetRef.type, name: t.name || r.targetRef.id, color: t.c || '#8A857C' },
        });
      });
    },
    // relationships touching a specific character, grouped per project (for char detail)
    relationshipsForCharacter: function (charId, opts) {
      var out = {};
      relationships.forEach(function (r) {
        if (opts && opts.publicOnly && r.visibility !== 'public') return;
        if (r.sourceRef.id !== charId && r.targetRef.id !== charId) return;
        (out[r.projectId] = out[r.projectId] || []).push(r);
      });
      return out;
    },
    relationshipLayout: function (projectId) { return relationshipLayouts[projectId] || { nodePositions: {}, groupPositions: {}, collapsedGroups: [], viewport: null, edgeRoutes: {} }; },

    // ---- Story / Chapter / StoryEvent (Project-scoped) ----
    storiesOf: function (projectId, opts) {
      opts = opts || {};
      return stories.filter(function (s) {
        if (s.projectId !== projectId) return false;
        if (opts.publicOnly && s.visibility !== 'public') return false;
        if (!opts.includeArchived && s.status === 'archived') return false;
        return true;
      });
    },
    story: function (id) { return stories.filter(function (s) { return s.id === id; })[0] || null; },
    chaptersOf: function (storyId, opts) {
      opts = opts || {};
      return chapters.filter(function (c) { return c.storyId === storyId && (opts.includeArchived || c.status !== 'archived'); }).slice().sort(function (a, b) { return a.sortOrder - b.sortOrder; });
    },
    chapter: function (id) { return chapters.filter(function (c) { return c.id === id; })[0] || null; },
    eventsOf: function (projectId, opts) {
      opts = opts || {};
      var self = this;
      return storyEvents.filter(function (e) {
        if (e.projectId !== projectId) return false;
        if (opts.storyId && e.storyId !== opts.storyId) return false;
        if (opts.publicOnly && e.visibility !== 'public') return false;
        return true;
      }).slice().sort(function (a, b) { return a.sortKey - b.sortKey; });
    },
    storyEvent: function (id) { return storyEvents.filter(function (e) { return e.id === id; })[0] || null; },
    // links for any story-domain entity (chapter/storyEvent), public-cropped like worldview
    linksOfSource: function (projectId, sourceId, opts) {
      opts = opts || {};
      var self = this;
      return entityLinks.filter(function (l) {
        if (l.projectId !== projectId || l.sourceId !== sourceId) return false;
        if (opts.publicOnly) {
          if (l.visibility && l.visibility !== 'public') return false;
          if (!self.isEntityPublic(l.targetId) && (l.targetType === 'character' || l.targetType === 'world')) return false;
        }
        return true;
      }).map(function (l) {
        var e = self.entity(l.targetId) || self.storyEvent(l.targetId) || {};
        return { id: l.id, label: l.label, relationType: l.relationType, targetType: l.targetType, targetId: l.targetId,
          name: e.name || e.title || l.targetId, color: e.c || '#8A857C', isChar: l.targetType === 'character' };
      });
    },
    storyStatusLabel: function (s) { return ({ draft: '草稿', completed: '已完成', archived: '已封存' })[s] || s; },
    chapterStatusLabel: function (s) { return ({ draft: '未完成', completed: '已完成', archived: '已封存' })[s] || s; },

    // ---- Gallery: Asset / AssetLink ----
    assetsOf: function (projectId, opts) {
      opts = opts || {};
      var self = this;
      return assets.filter(function (a) {
        if (a.projectId !== projectId) return false;
        if (!opts.includeArchived && a.processingStatus === 'archived') return false;
        if (opts.publicOnly) {
          // public Gallery: asset must be public AND ready (no failed/processing/private)
          if (a.visibility !== 'public' || a.processingStatus !== 'ready') return false;
          // AND have at least one public link whose target is public
          if (!self.linksForAsset(a.id, { publicOnly: true }).length) return false;
        }
        return true;
      });
    },
    asset: function (id) { return assets.filter(function (a) { return a.id === id; })[0] || null; },
    // links FROM an asset (which content it's attached to)
    linksForAsset: function (assetId, opts) {
      opts = opts || {};
      var self = this;
      return assetLinks.filter(function (l) {
        if (l.assetId !== assetId) return false;
        if (opts.publicOnly) {
          if (l.visibility && l.visibility !== 'public') return false;
          if (!self.isTargetPublic(l.targetType, l.targetId)) return false;
        }
        return true;
      }).map(function (l) { return Object.assign({}, l, self.resolveTarget(l.targetType, l.targetId)); });
    },
    // assets attached to a target entity (e.g. a character's album), with role filter
    assetsForTarget: function (targetType, targetId, opts) {
      opts = opts || {};
      var self = this;
      var rows = assetLinks.filter(function (l) {
        if (l.targetType !== targetType || l.targetId !== targetId) return false;
        if (opts.role && l.role !== opts.role) return false;
        return true;
      });
      return rows.map(function (l) {
        var a = self.asset(l.assetId) || {};
        return { link: l, asset: a };
      }).filter(function (r) {
        if (!opts.publicOnly) return true;
        return r.asset.visibility === 'public' && r.asset.processingStatus === 'ready' && (!r.link.visibility || r.link.visibility === 'public') && self.isTargetPublic(targetType, targetId);
      });
    },
    // unclassified inbox: ready assets whose ONLY links (if any) are project-inbox
    // links — i.e. not yet attached to any content (character/world/story…).
    unclassifiedAssets: function (projectId) {
      return assets.filter(function (a) {
        if (a.projectId !== projectId || a.processingStatus !== 'ready') return false;
        var contentLinks = assetLinks.filter(function (l) { return l.assetId === a.id && !(l.targetType === 'project' && l.role === 'inbox'); });
        return contentLinks.length === 0;
      });
    },
    // classificationStatus is SEPARATE from processingStatus: unclassified|organized.
    classificationStatus: function (assetId) {
      var contentLinks = assetLinks.filter(function (l) { return l.assetId === assetId && !(l.targetType === 'project' && l.role === 'inbox'); });
      return contentLinks.length ? 'organized' : 'unclassified';
    },
    // attribution completeness (complete|incomplete|not_required). Owner's own
    // work or commissions without a public URL don't strictly need a source.
    attributionStatus: function (assetId) {
      var a = this.asset(assetId); if (!a) return 'incomplete';
      if (a.license === '自繪' || (a.ownerUserId === viewer.id && a.creatorName === '我')) return 'not_required';
      if (a.creatorName) return 'complete';
      return 'incomplete';
    },
    // effective visibility of an AssetLink: 'inherit' follows the Asset.
    linkEffectiveVisibility: function (link) {
      if (!link.visibility || link.visibility === 'inherit') { var a = this.asset(link.assetId); return a ? a.visibility : 'private'; }
      return link.visibility;
    },
    // single-role targets (only one effective avatar/cover per target)
    singleRoles: ['avatar', 'cover'],
    isTargetPublic: function (type, id) {
      if (type === 'character' || type === 'world' || type === 'worldEntry') return this.isEntityPublic(id);
      if (type === 'story') { var s = this.story(id); return s && s.visibility === 'public'; }
      if (type === 'storyEvent') { var e = this.storyEvent(id); return e && e.visibility === 'public'; }
      if (type === 'chapter') { var c = this.chapter(id); var st = c && this.story(c.storyId); return st && st.visibility === 'public'; }
      return true;
    },
    resolveTarget: function (type, id) {
      var e = this.entity(id) || this.story(id) || this.storyEvent(id) || this.chapter(id) || {};
      var typeLabel = { character: '角色', worldEntry: '世界觀', world: '世界觀', story: '故事', chapter: '章節', storyEvent: '事件', relationship: '關係', project: '企劃' }[type] || type;
      return { targetName: e.name || e.title || id, targetColor: e.c || '#8A857C', targetTypeLabel: typeLabel };
    },
    assetRoleLabel: function (r) { return ({ avatar: '代表圖', cover: '封面', reference: '參考', gallery: '圖庫', illustration: '插圖', event_image: '事件圖', relationship_album: '關係相簿', world_entry_album: '世界觀相簿', inbox: '未分類' })[r] || r; },
    assetStatusLabel: function (s) { return ({ queued: '排隊中', uploading: '上傳中', processing: '處理中', ready: '完成', failed: '失敗', archived: '已封存' })[s] || s; },

    // ---- Inspiration (account-owned; optional project context) ----
    // Visibility/permission: a Project Host does NOT automatically see members'
    // PRIVATE project inspirations. opts: { scope:'account'|'project', projectId, viewerId }
    inspirationsFor: function (opts) {
      opts = opts || {};
      var vid = OCData.viewer.id;
      return inspirations.filter(function (it) {
        if (opts.status && it.status !== opts.status) return false;
        if (opts.includeArchived === false && it.status === 'archived') return false;
        if (opts.scope === 'account') {
          // my account inspirations = I own them AND no project assigned
          return it.ownerUserId === vid && !it.projectId;
        }
        if (opts.scope === 'project') {
          if (it.projectId !== opts.projectId) return false;
          if (it.ownerUserId === vid) return true;             // my own (any visibility)
          // others' items: only members-shared are visible; private stays hidden even to Host
          return it.visibility === 'members' || it.visibility === 'public';
        }
        return it.ownerUserId === vid; // default: everything I own
      });
    },
    inspiration: function (id) { return inspirations.filter(function (i) { return i.id === id; })[0] || null; },
    // conversion targets recorded for an inspiration
    conversionsOf: function (inspId) {
      return inspirationLinks.filter(function (l) { return l.sourceId === inspId; }).map(function (l) {
        var t = OCData.entity(l.targetId) || OCData.storyEvent(l.targetId) || OCData.story(l.targetId) || OCData.relationships.filter(function (r) { return r.id === l.targetId; })[0] || {};
        var tlabel = { character: '角色', worldEntry: '世界觀', world: '世界觀', story: '故事', chapter: '章節', storyEvent: '事件', relationship: '關係', asset: '圖片' }[l.targetType] || l.targetType;
        return { id: l.id, relationType: l.relationType, targetType: l.targetType, targetId: l.targetId, targetTypeLabel: tlabel, name: t.name || t.title || t.label || l.targetId, color: t.c || '#8A857C' };
      });
    },
    inspTypeLabel: function (t) { return ({ text: '文字', image: '圖片', link: '連結', quote: '引言', color_palette: '色票', character_idea: '角色點子', scene: '場景', dialogue: '對白' })[t] || t; },
    inspTypeGlyph: function (t) { return (window.OCIcon ? OCIcon(({ text: 'edit', image: 'image', link: 'link', quote: 'quote', color_palette: 'palette', character_idea: 'user', scene: 'image', dialogue: 'chat' })[t] || 'dot') : ''); },
    inspStatusLabel: function (s) { return ({ inbox: '待整理', organizing: '整理中', converted: '已轉換', archived: '已封存' })[s] || s; },
    inspConvertTargets: function () { return [ ['character', '角色'], ['worldEntry', '世界觀條目'], ['story', '故事'], ['chapter', '章節'], ['storyEvent', '事件'], ['asset', '圖片／圖庫'], ['wishlist', 'Wishlist'], ['commission', '委託 brief'] ]; },

    // ---- CharacterApplication ----
    // my applications (applicant view)
    myApplications: function (projectId) {
      var vid = this.viewer.id;
      return applications.filter(function (a) { return a.applicantUserId === vid && (!projectId || a.projectId === projectId); });
    },
    // review queue (host view): submitted / changes_requested across all applicants
    reviewQueue: function (projectId, opts) {
      opts = opts || {};
      return applications.filter(function (a) {
        if (a.projectId !== projectId) return false;
        if (opts.status) return a.status === opts.status;
        return ['submitted', 'changes_requested', 'approved', 'rejected'].indexOf(a.status) >= 0;
      });
    },
    application: function (id) { return applications.filter(function (a) { return a.id === id; })[0] || null; },
    appStatusLabel: function (s) { return ({ draft: '草稿', submitted: '審核中', changes_requested: '待修改', approved: '已通過', rejected: '已拒絕', withdrawn: '已撤回' })[s] || s; },
    appPendingCount: function (projectId) { return applications.filter(function (a) { return a.projectId === projectId && a.status === 'submitted'; }).length; },

    // ---- ContentSubmission (Slice 5D) — image/text works, separate from CharacterApplication ----
    mySubmissions: function (projectId, opts) {
      opts = opts || {};
      var vid = this.viewer.id;
      return contentSubmissions.filter(function (s) {
        if (s.submitterUserId !== vid || (projectId && s.projectId !== projectId)) return false;
        if (opts.type) return s.submissionType === opts.type;
        return true;
      });
    },
    submissionReviewQueue: function (projectId, opts) {
      opts = opts || {};
      return contentSubmissions.filter(function (s) {
        if (s.projectId !== projectId) return false;
        if (opts.type && s.submissionType !== opts.type) return false;
        if (opts.status) return s.status === opts.status;
        return ['submitted', 'changes_requested', 'approved', 'rejected'].indexOf(s.status) >= 0;
      });
    },
    submission: function (id) { return contentSubmissions.filter(function (s) { return s.id === id; })[0] || null; },
    submissionPendingCount: function (projectId) { return contentSubmissions.filter(function (s) { return s.projectId === projectId && s.status === 'submitted'; }).length; },
    subStatusLabel: function (s) { return ({ draft: '草稿', submitted: '審核中', changes_requested: '待修改', approved: '已通過', rejected: '已拒絕', withdrawn: '已撤回' })[s] || s; },
    subTypeLabel: function (t) { return ({ asset: '圖片', text: '文章' })[t] || t; },
    // submission asset (looks in main assets, then submission-only assets)
    submissionAsset: function (id) {
      return assets.filter(function (a) { return a.id === id; })[0] || SUBMISSION_ASSETS.filter(function (a) { return a.id === id; })[0] || null;
    },
    destIntentLabel: function (i) { return ({ create_story: '建立新故事', create_chapter: '建立新章節', append_to_chapter: '附加到既有章節', create_story_event: '建立時間軸事件' })[i] || i; },
    destTargetTypeLabel: function (t) { return ({ gallery: '企劃圖庫', character: '角色', worldEntry: '世界觀條目', story: '故事', chapter: '章節', storyEvent: '時間軸事件', relationshipAlbum: '關係相簿' })[t] || t; },
    // resolve a proposed link target to a display name (render-only)
    resolveSubTarget: function (targetType, targetId) {
      if (targetType === 'gallery') { var p = this.project(targetId); return p ? p.name + ' 圖庫' : '企劃圖庫'; }
      if (targetType === 'character') { var c = this.entity(targetId); return c ? c.name : targetId; }
      if (targetType === 'worldEntry') { var w = this.worldEntry ? this.worldEntry(targetId) : null; return w ? w.title : targetId; }
      if (targetType === 'story') { var s = this.story(targetId); return s ? s.title : targetId; }
      if (targetType === 'chapter') { var ch = this.chapter(targetId); return ch ? ch.title : targetId; }
      if (targetType === 'relationshipAlbum') { return '關係相簿'; }
      return targetId;
    },
    // resolve a text submission's destination preview (what gets created/updated)
    textDestPreview: function (sub) {
      var pl = sub.payload || {};
      if (pl.destinationIntent === 'append_to_chapter') { var ch = this.chapter(pl.targetId); return { verb: '附加到章節', name: ch ? ch.title : pl.targetId, exists: !!ch }; }
      if (pl.destinationIntent === 'create_chapter') { var st = this.story(pl.targetId); return { verb: '在故事下建立章節', name: st ? st.title : pl.targetId, exists: !!st }; }
      if (pl.destinationIntent === 'create_story') return { verb: '建立新故事', name: pl.title, exists: true };
      if (pl.destinationIntent === 'create_story_event') return { verb: '建立時間軸事件', name: pl.title, exists: true };
      return { verb: '', name: '', exists: true };
    },
    // is a submission's source asset usable (ready + not archived/missing)?
    submissionSourceState: function (sub) {
      if (sub.submissionType !== 'asset') {
        // text: check destination target still exists
        var pl = sub.payload || {};
        if (pl.destinationIntent === 'append_to_chapter' && !this.chapter(pl.targetId)) return 'dest_missing';
        if (pl.destinationIntent === 'create_chapter' && !this.story(pl.targetId)) return 'dest_missing';
        return 'ok';
      }
      var a = this.submissionAsset(sub.payload.assetId);
      if (!a) return 'missing';
      if (a.processingStatus === 'archived') return 'archived';
      if (a.processingStatus !== 'ready') return 'processing';
      return 'ok';
    },

    // ---- Public Page Builder (PB0) ----
    publicPagesOf: function (projectId) { var vid = this.viewer.id; return publicPages.filter(function (pg) { return !projectId || pg.projectId === projectId || (pg.projectId === null && pg.ownerUserId === vid); }); },
    // ---- PublicPage ownership classification (Public Page Scope correction) ----
    // pageOwnerType/sourceType are DERIVED from existing fields (no second model):
    //   purpose project|worldEntry → project-owned (official). story too.
    //   purpose project_character  → user-owned, project-context (member's page,
    //                                 owner = the character owner; template = project)
    //   purpose character|commission|custom → user-owned, no project
    pageOwnerType: function (pg) {
      if (!pg) return 'user';
      if (pg.purpose === 'project' || pg.purpose === 'worldEntry' || pg.purpose === 'story') return 'project';
      return 'user';
    },
    pageSourceType: function (pg) {
      return pg.purpose === 'project_character' ? 'projectCharacterLink' : (pg.purpose || 'custom');
    },
    // page owner id: user pages → character owner / viewer; project pages → projectId
    pageOwnerId: function (pg) {
      if (this.pageOwnerType(pg) === 'project') return pg.projectId;
      if (pg.dataRef && pg.dataRef.characterId) { var c = this.entity(pg.dataRef.characterId); return c ? c.ownerUserId : this.viewer.id; }
      return pg.ownerUserId || this.viewer.id;
    },
    // 我的公開頁 (Account scope): pages this user owns — incl. project-context
    // character pages and pages bound to no project.
    myPublicPages: function () {
      var self = this, vid = this.viewer.id;
      return publicPages.filter(function (pg) { return self.pageOwnerType(pg) === 'user' && self.pageOwnerId(pg) === vid; });
    },
    // 企劃公開頁 (Project scope): project-owned official pages + member pages
    // surfaced for official-roster management (flagged, not owned by host).
    projectPublicPages: function (projectId) {
      var self = this;
      var owned = publicPages.filter(function (pg) { return pg.projectId === projectId && self.pageOwnerType(pg) === 'project'; });
      var memberPages = publicPages.filter(function (pg) { return pg.projectId === projectId && self.pageOwnerType(pg) === 'user'; });
      return { owned: owned, memberPages: memberPages };
    },
    publicPage: function (id) { return publicPages.filter(function (pg) { return pg.id === id; })[0] || null; },
    publicPageBySlug: function (slug) { return publicPages.filter(function (pg) { return pg.slug === slug; })[0] || null; },
    pageTemplate: function (id) { return pageTemplates.filter(function (t) { return t.id === id; })[0] || null; },
    pageTemplatesOf: function (projectId, purpose) { return pageTemplates.filter(function (t) { return t.projectId === projectId && (!purpose || t.purpose === purpose); }); },
    purposeLabel: function (p) { return ({ character: '角色頁', project_character: '企劃角色頁', project: '企劃頁', commission: '委託頁', custom: '自訂頁' })[p] || p; },
    pageVisLabel: function (v) { return ({ public: '公開', unlisted: '限連結', members: '成員', private: '私人', hidden: '隱藏' })[v] || v; },
    blockLabel: function (t) { var b = BLOCK_REGISTRY.filter(function (x) { return x.type === t; })[0]; return b ? b.label : t; },
    // resolve a block binding to a display value from EXISTING data (render-only PageDataContext)
    resolveBinding: function (bind, dataRef) {
      if (!bind || !bind.source) return { ok: true, value: null };
      var src = bind.source;
      if (src === 'character') { var c = this.entity(dataRef.characterId); if (!c) return { ok: false, reason: '角色不存在' }; if (bind.field === 'palette') { var d = this.details[dataRef.characterId]; return { ok: true, value: d && d.art ? d.art.palette : [] }; } return { ok: true, value: bind.field ? c[bind.field] : c }; }
      if (src === 'link') { var l = this.links.filter(function (x) { return x.id === dataRef.linkId; })[0]; if (!l) return { ok: false, reason: '企劃角色連結不存在' }; return { ok: true, value: l }; }
      if (src === 'project') { var pr = this.project(dataRef.projectId); if (!pr) return { ok: false, reason: '企劃不存在' }; return { ok: true, value: bind.field ? pr[bind.field] : pr }; }
      if (src === 'assetLink') {
        // prefer Character Visual Workspace semantic slots (hero/fullbody/avatar…);
        // fall back to legacy assetLink rows. role names map 1:1 to slots.
        if (dataRef.characterId && window.OCVisual) {
          var slotIm = OCVisual.slotImage(dataRef.characterId, bind.role);
          if (slotIm) return { ok: true, value: [{ id: slotIm.id, label: slotIm.label, c: slotIm.c, fromSlot: true }] };
        }
        var rows = dataRef.characterId ? this.assetsForTarget('character', dataRef.characterId, { role: bind.role }) : []; return { ok: true, value: rows };
      }
      if (src === 'worldEntry') { var w = this.worldEntry(dataRef.worldEntryId); if (!w) return { ok: false, reason: '世界觀條目不存在' }; return { ok: true, value: bind.field ? w[bind.field] : w }; }
      return { ok: true, value: null };
    },
    // public crop: a published page only renders if its data is public-visible
    pagePublicData: function (pageId) {
      var pg = this.publicPage(pageId); if (!pg) return null;
      var d = pg.dataRef || {};
      var charOk = !d.characterId || this.isEntityPublic(d.characterId);
      var projOk = !d.projectId || (this.project(d.projectId) || {}).visibility === 'public';
      return { page: pg, charPublic: charOk, projPublic: projOk, renderable: pg.status === 'published' && pg.visibility !== 'private' && charOk && projOk };
    },
    // characters the viewer owns that CAN be applied to a project (not already linked, no open app)
    applicableCharacters: function (projectId) {
      var self = this, vid = this.viewer.id;
      return this.entities.filter(function (e) { return e.type === 'character' && e.ownerUserId === vid; })
        .filter(function (e) {
          var linked = self.links.some(function (l) { return l.character === e.id && l.project === projectId && l.status !== 'removed'; });
          var openApp = applications.some(function (a) { return a.characterId === e.id && a.projectId === projectId && ['draft', 'submitted', 'changes_requested'].indexOf(a.status) >= 0; });
          return !linked && !openApp;
        });
    },
    // application state for a character in a project: linked | open-app(status) | applicable
    charAppState: function (charId, projectId) {
      var l = this.links.filter(function (x) { return x.character === charId && x.project === projectId && x.status !== 'removed'; })[0];
      if (l) return { state: 'linked', link: l };
      var a = applications.filter(function (x) { return x.characterId === charId && x.projectId === projectId; }).sort(function (x, y) { return 0; })[0];
      if (a) return { state: 'application', status: a.status, app: a };
      return { state: 'applicable' };
    },

    // ---- ProjectTemplate / ProjectTemplateField ----
    templatesOf: function (projectId) { return projectTemplates.filter(function (t) { return t.projectId === projectId; }); },
    template: function (id) { return projectTemplates.filter(function (t) { return t.id === id; })[0] || null; },
    publishedTemplate: function (projectId) { return projectTemplates.filter(function (t) { return t.projectId === projectId && t.status === 'published'; }).sort(function (a, b) { return b.version - a.version; })[0] || null; },
    draftTemplate: function (projectId) { return projectTemplates.filter(function (t) { return t.projectId === projectId && t.status === 'draft'; }).sort(function (a, b) { return b.version - a.version; })[0] || null; },
    fieldsOf: function (templateId) { return templateFields.filter(function (f) { return f.templateId === templateId; }).slice().sort(function (a, b) { return a.sortOrder - b.sortOrder; }); },
    templateField: function (id) { return templateFields.filter(function (f) { return f.id === id; })[0] || null; },
    fieldTypeLabel: function (t) { return ({ text: '單行文字', textarea: '多行文字', number: '數字', select: '單選', multiselect: '多選', checkbox: '勾選', date: '日期', color: '色票', image: '圖片', relation: '關聯', section: '分隔標題' })[t] || t; },
    fieldVisLabel: function (v) { return ({ public: '公開', members: '僅成員', host: '僅主持人', owner_only: '僅角色擁有者' })[v] || v; },
    fieldEditLabel: function (e) { return ({ character_owner: '角色擁有者', host: '主持人', both: '雙方' })[e] || e; },
    // how many ProjectCharacterLinks already hold a value for this field key
    fieldAffectedCount: function (projectId, fieldKey) {
      return links.filter(function (l) { return l.project === projectId && l.fieldValues && Object.keys(l.fieldValues).some(function (k) { return k === fieldKey || k.indexOf(fieldKey) >= 0; }); }).length;
    },
    // diff draft vs published (added/modified/removed by key)
    templateDiff: function (projectId) {
      var pub = this.publishedTemplate(projectId), dr = this.draftTemplate(projectId);
      if (!pub || !dr) return null;
      var pf = this.fieldsOf(pub.id), df = this.fieldsOf(dr.id);
      var pByKey = {}; pf.forEach(function (f) { pByKey[f.key] = f; });
      var dByKey = {}; df.forEach(function (f) { dByKey[f.key] = f; });
      var added = df.filter(function (f) { return !pByKey[f.key] && f.type !== 'section'; }).map(function (f) { return f.label; });
      var removed = pf.filter(function (f) { return !dByKey[f.key]; }).map(function (f) { return f.label; });
      var modified = [];
      df.forEach(function (f) { var o = pByKey[f.key]; if (!o) return; var chg = []; if (o.type !== f.type) chg.push('類型'); if (o.required !== f.required) chg.push(f.required ? '改必填' : '改選填'); if (JSON.stringify(o.options) !== JSON.stringify(f.options)) chg.push('選項'); if (chg.length) modified.push(f.label + '（' + chg.join('、') + '）'); });
      return { pub: pub, draft: dr, added: added, removed: removed, modified: modified };
    },
    relationshipGroupsOf: function (projectId) { return (relationshipGroups[projectId] || []).slice(); },
    relationshipGroup: function (projectId, id) { return (relationshipGroups[projectId] || []).filter(function (g) { return g.id === id; })[0] || null; },
    relTypeLabel: function (t) { return ({ pact: '契約', longing: '思慕', rivalry: '對立', feud: '宿怨', belong: '歸屬', unspoken: '未言明', family: '家族', friend: '朋友', custom: '其他' })[t] || t; },


    // ---- Character BODY detail (account-owned) ----
    details: DETAILS,
    characterFull: function (id) {
      var e = this.entity(id); if (!e) return null;
      var d = DETAILS[id] || blankDetail();
      var os = ownerSummary(e.ownerUserId);
      return Object.assign({}, e, { detail: d, ownerSummary: os, mine: os.mine, visibility: d.visibility || e.visibility || 'public', links: this.linksOfCharacter(id) });
    },
    // derived completion per section (UI-only — never a stored field). 0–100.
    completion: function (id) {
      var d = DETAILS[id] || blankDetail();
      function pct(filled, total) { return total ? Math.round(filled / total * 100) : 0; }
      var g = d.general, gFilled = [g.tagline, g.personality, (g.basics || []).length, (g.tags || []).length].filter(Boolean).length;
      var a = d.art, aFilled = [(a.palette || []).length, (a.mustDraw || []).length, (a.avoid || []).length, (a.accessories || []).length, a.freeform].filter(Boolean).length;
      var t = d.text, tFilled = [t.background, t.motivation, t.speech, t.relations, t.taboo, (t.canUse || []).length].filter(Boolean).length;
      return { general: pct(gFilled, 4), art: pct(aFilled, 5), text: pct(tFilled, 6) };
    },
    // per-project-card completion (uses link fields)
    linkCompletion: function (linkId) {
      var l = links.filter(function (x) { return x.id === linkId; })[0]; if (!l) return 0;
      var filled = [l.faction, l.projectRole, Object.keys(l.fieldValues || {}).length, l.status === 'approved'].filter(Boolean).length;
      return Math.round(filled / 4 * 100);
    },
    // share scopes (Demo). DATA GAP: ShareLink entity (Character-owned).
    shareScopes: function () {
      return [
        { id: 'general', name: '一般分享', tabs: ['總覽', '圖庫'], desc: '給一般觀眾看的版本。' },
        { id: 'artist', name: '繪師設定', tabs: ['總覽', '圖設定', '圖庫'], desc: '給繪師：色票、必畫、不可畫。' },
        { id: 'writer', name: '文手設定', tabs: ['總覽', '文設定'], desc: '給文手：背景、動機、說話方式。' },
        { id: 'full', name: '完整可分享設定', tabs: ['總覽', '圖設定', '文設定', '圖庫', '關係'], desc: '本體完整公開（仍不含私人筆記、主持人限定欄位、審核紀錄）。' },
      ];
    },
  };

  // ============================================================
  // Demo Session State (Phase 0) — cross-page runtime built FROM OCData.
  // NOT real persistence, NOT a Repository, NOT a second data model:
  // it snapshots the SAME OCData arrays into sessionStorage so create/
  // edit/archive survive page navigation within one tab, and resets on
  // tab close (or via "重設 Demo 資料"). All pages read the same arrays.
  // ============================================================
  var SKEY = 'ch:demo:v1';
  var FIXTURE_VERSION = '2026-06-11.1'; // bump when OCData fixture shape changes
  var PERSIST = ['projects', 'entities', 'links', 'applications', 'contentSubmissions', 'relationships', 'stories', 'chapters', 'storyEvents', 'assets', 'assetLinks', 'inspirations', 'inspirationLinks'];
  var PERSIST_OBJ = ['details']; // object snapshots (keyed maps)
  function sget() { try { return sessionStorage.getItem(SKEY); } catch (e) { return null; } }
  function sset(v) { try { sessionStorage.setItem(SKEY, v); } catch (e) {} }
  function replaceInPlace(arr, items) { if (!Array.isArray(items)) return; arr.length = 0; items.forEach(function (i) { arr.push(i); }); }

  window.__CH_demoReset = false; // flag: session was version-busted this load
  function hydrateFromSession() {
    var raw = sget(); if (!raw) return;
    try {
      var snap = JSON.parse(raw);
      // version guard: stale snapshot from an older fixture shape → drop it
      if (snap.fixtureVersion !== FIXTURE_VERSION) { try { sessionStorage.removeItem(SKEY); } catch (e) {} window.__CH_demoReset = true; return; }
      PERSIST.forEach(function (k) { if (snap[k]) replaceInPlace(window.OCData[k], snap[k]); });
      PERSIST_OBJ.forEach(function (k) { if (snap[k]) { var o = window.OCData[k]; Object.keys(o).forEach(function (x) { delete o[x]; }); Object.assign(o, snap[k]); } });
    } catch (e) { try { sessionStorage.removeItem(SKEY); } catch (e2) {} }
  }
  function persist() {
    if (window.__CH_NO_PERSIST) return;
    var snap = { fixtureVersion: FIXTURE_VERSION, updatedAt: new Date().toISOString() };
    PERSIST.forEach(function (k) { snap[k] = window.OCData[k]; });
    PERSIST_OBJ.forEach(function (k) { snap[k] = window.OCData[k]; }); sset(JSON.stringify(snap));
  }
  function uid(pfx) { return pfx + '-' + Math.random().toString(36).slice(2, 8); }

  window.OCDemo = {
    hydrateFromOCData: hydrateFromSession,
    resetDemoData: function () { try { sessionStorage.removeItem(SKEY); } catch (e) {} },
    // ---- Character (body, account-owned) ----
    createCharacter: function (attrs) {
      attrs = attrs || {};
      var c = { id: uid('c'), type: 'character', name: attrs.name || '新角色', rom: attrs.rom || '', sp: attrs.sp || '未定', sub: attrs.sub || '草稿', c: attrs.c || '#8A857C', role: attrs.role || '', ownerUserId: window.OCData.viewer.id, blurb: attrs.blurb || '', status: 'active', createdAt: 'now' };
      window.OCData.entities.push(c); persist(); return c;
    },
    updateCharacter: function (id, patch) {
      var c = window.OCData.entity(id); if (!c) return null;
      Object.keys(patch || {}).forEach(function (k) { c[k] = patch[k]; }); persist(); return c;
    },
    archiveCharacter: function (id) { var c = window.OCData.entity(id); if (c) { c.status = 'archived'; persist(); } return c; },
    // ---- WorldEntry (worldview, lives in entities[] with a non-character type) ----
    createWorldEntry: function (attrs) {
      attrs = attrs || {};
      var pid = attrs.project;
      // sortOrder = after the last sibling under this parent
      var sibs = window.OCData.worldChildren(pid, attrs.parentId || null, {});
      var maxSort = sibs.reduce(function (m, s) { return Math.max(m, s.sortOrder || 0); }, -1);
      var e = { id: uid('w'), project: pid, type: attrs.type || 'place', name: attrs.name || '新條目',
        sub: attrs.sub || (window.OCData.typeLabel[attrs.type] || ''), c: attrs.c || '',
        parentId: attrs.parentId || null, sortOrder: maxSort + 1,
        visibility: attrs.visibility || 'private', summary: attrs.summary || '', content: attrs.content || '',
        status: 'active', createdAt: 'now' };
      window.OCData.entities.push(e); persist(); return e;
    },
    updateWorldEntry: function (id, patch) {
      var e = window.OCData.worldEntry(id); if (!e) return null;
      // guard against parent cycles when moving
      if (patch && 'parentId' in patch) {
        var np = patch.parentId || null;
        if (np && window.OCData.wouldCycle(id, np)) { delete patch.parentId; }
      }
      Object.keys(patch || {}).forEach(function (k) { e[k] = patch[k]; }); persist(); return e;
    },
    // mode: 'cascade' (archive entry + all descendants) | 'reparent' (lift children to grandparent, archive entry) | undefined (no children)
    archiveWorldEntry: function (id, mode) {
      var e = window.OCData.worldEntry(id); if (!e) return null;
      if (mode === 'reparent') {
        window.OCData.entities.forEach(function (x) {
          if (x.parentId === id && x.type !== 'character' && x.status !== 'archived') { x.parentId = e.parentId || null; }
        });
        e.status = 'archived';
      } else if (mode === 'cascade') {
        (function walk(pid) {
          window.OCData.entities.forEach(function (x) {
            if (x.parentId === pid && x.type !== 'character') { x.status = 'archived'; walk(x.id); }
          });
        })(id);
        e.status = 'archived';
      } else {
        e.status = 'archived';
      }
      persist(); return e;
    },
    // ---- Project ----
    createProject: function (attrs) {
      attrs = attrs || {};
      var p = { id: uid('p'), name: attrs.name || '新企劃', en: attrs.en || 'NEW', c: attrs.c || '#5E7E55', visibility: attrs.visibility || 'private', collaborationMode: attrs.collaborationMode || 'solo', portalEnabled: false, joinPolicy: 'closed', submissionsEnabled: false, enabledFeatures: ['worldview', 'inbox'], blurb: attrs.blurb || '', stats: { chars: 0, world: 0, rels: 0, ideas: 0, comms: 0 }, recent: [], status: 'active' };
      window.OCData.projects.push(p); window.OCData.viewer.projectRoles[p.id] = 'owner'; persist(); return p;
    },
    updateProject: function (id, patch) { var p = window.OCData.project(id); if (!p) return null; Object.keys(patch || {}).forEach(function (k) { p[k] = patch[k]; }); persist(); return p; },
    archiveProject: function (id) { var p = window.OCData.project(id); if (p) { p.status = 'archived'; persist(); } return p; },
    // ---- ProjectCharacterLink ----
    createLink: function (attrs) {
      var l = { id: uid('lk'), character: attrs.character, project: attrs.project, faction: attrs.faction || '', projectRole: attrs.projectRole || '', status: attrs.status || 'approved', ownerUserId: window.OCData.viewer.id, templateVersionId: attrs.templateVersionId || null, projectVisibility: attrs.projectVisibility || 'public', fieldValues: attrs.fieldValues || {} };
      window.OCData.links.push(l); persist(); return l;
    },
    removeLink: function (linkId) { var l = window.OCData.links.filter(function (x) { return x.id === linkId; })[0]; if (l) { l.status = 'removed'; persist(); } return l; },
    // ---- Relationship (project-scoped, lives in relationships[]) ----
    createRelationship: function (attrs) {
      attrs = attrs || {};
      function ref(id) { var e = window.OCData.entity(id) || {}; return { type: e.type === 'character' ? 'character' : 'world', id: id }; }
      var r = { id: uid('rel'), projectId: attrs.projectId, sourceRef: ref(attrs.sourceId), targetRef: ref(attrs.targetId),
        type: attrs.type || '', group: attrs.group || '', label: attrs.label || '關係', description: attrs.description || '',
        direction: attrs.direction || 'both', visibility: attrs.visibility || 'public' };
      window.OCData.relationships.push(r); persist(); return r;
    },
    updateRelationship: function (id, patch) {
      var r = window.OCData.relationships.filter(function (x) { return x.id === id; })[0]; if (!r) return null;
      patch = patch || {};
      function ref(eid) { var e = window.OCData.entity(eid) || {}; return { type: e.type === 'character' ? 'character' : 'world', id: eid }; }
      if (patch.sourceId) { r.sourceRef = ref(patch.sourceId); delete patch.sourceId; }
      if (patch.targetId) { r.targetRef = ref(patch.targetId); delete patch.targetId; }
      Object.keys(patch).forEach(function (k) { r[k] = patch[k]; }); persist(); return r;
    },
    deleteRelationship: function (id) {
      var arr = window.OCData.relationships, i = arr.findIndex(function (x) { return x.id === id; });
      if (i >= 0) arr.splice(i, 1);
      // drop any manual edgeRoute so no orphan curve remains
      var lays = window.OCData.relationshipLayouts || {};
      Object.keys(lays).forEach(function (pid) { if (lays[pid] && lays[pid].edgeRoutes) delete lays[pid].edgeRoutes[id]; });
      persist(); return id;
    },
    // ---- Story / Chapter / StoryEvent ----
    createStory: function (attrs) {
      attrs = attrs || {};
      var s = { id: uid('st'), projectId: attrs.projectId, title: attrs.title || '\u65b0\u6545\u4e8b', summary: attrs.summary || '', status: attrs.status || 'draft', visibility: attrs.visibility || 'private', coverAssetId: null };
      window.OCData.stories.push(s); persist(); return s;
    },
    updateStory: function (id, patch) { var s = window.OCData.story(id); if (!s) return null; Object.keys(patch || {}).forEach(function (k) { s[k] = patch[k]; }); persist(); return s; },
    archiveStory: function (id) { var s = window.OCData.story(id); if (s) { s.status = 'archived'; persist(); } return s; },
    createChapter: function (attrs) {
      attrs = attrs || {};
      var sibs = window.OCData.chaptersOf(attrs.storyId, { includeArchived: true });
      var maxSort = sibs.reduce(function (m, c) { return Math.max(m, c.sortOrder || 0); }, -1);
      var c = { id: uid('ch'), storyId: attrs.storyId, title: attrs.title || '\u65b0\u7ae0\u7bc0', summary: attrs.summary || '', content: attrs.content || '', sortOrder: maxSort + 1, status: attrs.status || 'draft' };
      window.OCData.chapters.push(c); persist(); return c;
    },
    updateChapter: function (id, patch) { var c = window.OCData.chapter(id); if (!c) return null; Object.keys(patch || {}).forEach(function (k) { c[k] = patch[k]; }); persist(); return c; },
    archiveChapter: function (id) { var c = window.OCData.chapter(id); if (c) { c.status = 'archived'; persist(); } return c; },
    // dir: -1 up, +1 down. swaps sortOrder with the adjacent active sibling.
    reorderChapter: function (id, dir) {
      var c = window.OCData.chapter(id); if (!c) return null;
      var sibs = window.OCData.chaptersOf(c.storyId);
      var i = sibs.map(function (x) { return x.id; }).indexOf(id);
      var j = i + (dir < 0 ? -1 : 1);
      if (j < 0 || j >= sibs.length) return c;
      var a = sibs[i], b = sibs[j], tmp = a.sortOrder; a.sortOrder = b.sortOrder; b.sortOrder = tmp;
      persist(); return c;
    },
    // drag-drop: write a full new order. orderedIds = chapter ids in desired order.
    reorderChapters: function (storyId, orderedIds) {
      (orderedIds || []).forEach(function (id, i) { var c = window.OCData.chapter(id); if (c && c.storyId === storyId) c.sortOrder = i; });
      persist();
    },
    createStoryEvent: function (attrs) {
      attrs = attrs || {};
      var sibs = window.OCData.eventsOf(attrs.projectId, { storyId: attrs.storyId });
      var maxKey = sibs.reduce(function (m, e) { return Math.max(m, e.sortKey || 0); }, 0);
      var e = { id: uid('se'), projectId: attrs.projectId, storyId: attrs.storyId || null, chapterId: attrs.chapterId || null, title: attrs.title || '\u65b0\u4e8b\u4ef6', description: attrs.description || '', timeLabel: attrs.timeLabel || '\u672a\u5b9a\u6642\u9593', sortKey: maxKey + 100, visibility: attrs.visibility || 'public' };
      window.OCData.storyEvents.push(e); persist(); return e;
    },
    updateStoryEvent: function (id, patch) { var e = window.OCData.storyEvent(id); if (!e) return null; Object.keys(patch || {}).forEach(function (k) { e[k] = patch[k]; }); persist(); return e; },
    // ---- Asset / AssetLink (gallery) ----
    createAsset: function (attrs) {
      attrs = attrs || {};
      var palette = ['#8FA3B0', '#5E7E55', '#9E332B', '#B8AE9C', '#7FA8C9', '#C9B79C', '#8A6FA0'];
      var a = { id: uid('as'), projectId: attrs.projectId, ownerUserId: window.OCData.viewer.id, uploaderUserId: window.OCData.viewer.id,
        fileName: attrs.fileName || 'upload.png', mimeType: attrs.mimeType || 'image/png',
        width: attrs.width || 1000, height: attrs.height || 1200, fileSize: attrs.fileSize || 400000,
        title: attrs.title || '', description: '', altText: '', creatorName: '', creatorUrl: '', sourceUrl: '', license: '',
        visibility: attrs.visibility || 'private', processingStatus: attrs.processingStatus || 'ready',
        createdAt: '今天', c: attrs.c || palette[Math.floor(Math.random() * palette.length)] };
      window.OCData.assets.push(a); persist(); return a;
    },
    deleteAsset: function (id) {
      var a = window.OCData.asset(id); if (!a) return null;
      a.processingStatus = 'archived';
      // drop all AssetLinks referencing it (no orphan references) — splice in place
      var ls = window.OCData.assetLinks;
      for (var i = ls.length - 1; i >= 0; i--) { if (ls[i].assetId === id) ls.splice(i, 1); }
      persist(); return a;
    },
    createAssetLink: function (attrs) {
      attrs = attrs || {};
      var l = { id: uid('al'), projectId: attrs.projectId, assetId: attrs.assetId, targetType: attrs.targetType, targetId: attrs.targetId, role: attrs.role || 'gallery', sortOrder: attrs.sortOrder || 0, caption: attrs.caption || '' };
      window.OCData.assetLinks.push(l); persist(); return l;
    },
    removeAssetLink: function (linkId) {
      var ls = window.OCData.assetLinks;
      for (var i = ls.length - 1; i >= 0; i--) { if (ls[i].id === linkId) ls.splice(i, 1); }
      persist(); return linkId;
    },
    // ---- Inspiration (account-owned; optional project context) ----
    createInspiration: function (attrs) {
      attrs = attrs || {};
      var it = { id: uid('in'), ownerUserId: window.OCData.viewer.id, projectId: attrs.projectId || null, type: attrs.type || 'text',
        title: attrs.title || '', content: attrs.content || '', status: 'inbox', visibility: attrs.visibility || 'private', tags: attrs.tags || [], createdAt: '今天' };
      window.OCData.inspirations.push(it); persist(); return it;
    },
    updateInspiration: function (id, patch) { var it = window.OCData.inspiration(id); if (!it) return null; Object.keys(patch || {}).forEach(function (k) { it[k] = patch[k]; }); persist(); return it; },
    archiveInspiration: function (id) { var it = window.OCData.inspiration(id); if (it) { it.status = 'archived'; persist(); } return it; },
    deleteInspiration: function (id) {
      var arr = window.OCData.inspirations, i = arr.findIndex(function (x) { return x.id === id; });
      if (i >= 0) arr.splice(i, 1);
      var ils = window.OCData.inspirationLinks;
      for (var j = ils.length - 1; j >= 0; j--) { if (ils[j].sourceId === id) ils.splice(j, 1); }
      persist(); return id;
    },
    // record a conversion: keep the original inspiration, mark converted, add a link row
    convertInspiration: function (id, targetType, targetId) {
      var it = window.OCData.inspiration(id); if (!it) return null;
      it.status = 'converted';
      window.OCData.inspirationLinks.push({ id: uid('inl'), sourceType: 'inspiration', sourceId: id, targetType: targetType, targetId: targetId || ('pending-' + targetType), relationType: 'converted_to' });
      persist(); return it;
    },
    // ---- Application / Invitation (lightweight) ----
    createApplication: function (attrs) { var a = { id: uid('ap'), projectId: attrs.projectId, characterId: attrs.characterId, applicantUserId: window.OCData.viewer.id, templateVersionId: attrs.templateVersionId, fieldValues: attrs.fieldValues || {}, status: 'draft', reviewMessage: '', revision: 1, submittedAt: null, reviewedAt: null, reviewedBy: null }; window.OCData.applications.push(a); persist(); return a; },
    updateApplication: function (id, patch) { var a = window.OCData.application(id); if (!a) return null; Object.keys(patch || {}).forEach(function (k) { a[k] = patch[k]; }); persist(); return a; },
    // persist a Character body detail document (typed fields + customSections)
    updateCharacterDetail: function (id, detail) { if (!window.OCData.details) return null; window.OCData.details[id] = detail; persist(); return detail; },
    _persist: persist,
  };

  // run hydration immediately so every page sees prior demo mutations
  hydrateFromSession();

  // ============================================================
  // Scope Resolver — scope decided by ROUTE + QUERY, never inferred from
  // currentProject / projectLinks / last-opened. Invalid project context
  // surfaces as scope:'invalid' (page shows an explicit error), NEVER a
  // silent fallback to account. (Phase 0.1)
  // ============================================================
  var DUAL_PAGES = ['character.html', 'editor.html'];
  var PROJECT_PAGES = ['overview.html', 'roster.html', 'cast.html', 'worldview.html', 'relationships.html', 'story.html', 'gallery.html', 'inspiration.html', 'submissions.html', 'content-submissions.html', 'template-builder.html', 'participants.html'];
  // validate a project-character context; returns reason code or null if ok
  window.OCData.validateProjectContext = function (pid, link, charId) {
    if (!pid && !link) return 'none';            // pure account entry
    if (pid && !window.OCData.project(pid)) return 'project_missing';
    if (pid && !link) return 'missing_link';     // project given but no link → NOT account
    if (link) {
      var l = window.OCData.links.filter(function (x) { return x.id === link; })[0];
      if (!l) return 'link_missing';
      if (pid && l.project !== pid) return 'link_mismatch';
      if (l.status === 'removed') return 'link_removed';
      if (charId && l.character !== charId) return 'char_mismatch';
    }
    return null;
  };
  window.OCData.resolveScope = function (fileName, search) {
    var file = (fileName || '').toLowerCase();
    var q = new URLSearchParams(search || '');
    var pid = q.get('project'), link = q.get('link'), c = q.get('c'), mode = q.get('mode');
    if (file === 'portal.html') return { scope: 'public' };
    // public-pages: ONLY ?mode=builder is BuilderShell; list/create use App Shell
    if (file === 'public-pages.html') {
      if (mode === 'builder') return { scope: 'builder', currentPageId: q.get('page') || null, currentProjectId: pid || null };
      return { scope: pid && window.OCData.project(pid) ? 'project' : 'account', currentProjectId: pid && window.OCData.project(pid) ? pid : null, viewerMode: pid ? window.OCData.getRole(pid) : undefined };
    }
    if (DUAL_PAGES.indexOf(file) >= 0) {
      // explicit account entry: ?c= with no project/link
      if (c && !pid && !link) return { scope: 'account', currentCharacterId: c };
      var reason = window.OCData.validateProjectContext(pid, link, c);
      if (!reason || reason === 'none') {
        if (!pid && !link && !c) return { scope: 'account' };
        if (reason === 'none') return { scope: 'account', currentCharacterId: c };
      }
      if (reason && reason !== 'none') {
        // invalid/forbidden project context — page must show explicit state
        return { scope: 'invalid', invalidReason: reason, currentProjectId: pid, currentProjectCharacterLinkId: link, currentCharacterId: c };
      }
      var l = window.OCData.links.filter(function (x) { return x.id === link; })[0];
      return { scope: 'project', currentProjectId: pid || l.project, currentProjectCharacterLinkId: link, currentCharacterId: c || l.character, viewerMode: window.OCData.getRole(pid || l.project) };
    }
    if (PROJECT_PAGES.indexOf(file) >= 0) { var p = pid && window.OCData.project(pid) ? pid : null; return { scope: 'project', currentProjectId: p, viewerMode: p ? window.OCData.getRole(p) : 'visitor' }; }
    return { scope: 'account' };
  };
  // link helpers so pages stop hand-rolling (and stop using ?c= in project ctx)
  window.OCData.accountCharHref = function (charId) { return 'character.html?c=' + charId; };
  window.OCData.projectCharHref = function (projectId, linkId, charId) { return 'character.html?project=' + projectId + '&link=' + linkId + (charId ? '&c=' + charId : ''); };
})();

