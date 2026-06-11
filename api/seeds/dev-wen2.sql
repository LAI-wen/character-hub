-- Dev seed for wen2@local.dev (id: f9d8d338-c98c-4042-80e8-afa09c74be05)
-- Run: npx wrangler d1 execute oc-tools-db --local --file=seeds/dev-wen2.sql

-- ── Project ──────────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO projects (
  id, owner_user_id, slug, name, description,
  theme_color, preset, visibility, collaboration_mode,
  portal_enabled, join_policy, submissions_enabled,
  enabled_features_json, status, created_at, updated_at
) VALUES (
  'proj-stellar-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'stellar-frontier',
  '星際邊境',
  '在宇宙邊界上，一場關於命運與抉擇的故事。',
  '#5B6FA6',
  'private_collab',
  'private',
  'solo',
  0, 'closed', 0,
  '["characters","worldview","relationships","story","gallery"]',
  'active',
  datetime('now'), datetime('now')
);

-- owner membership
INSERT OR IGNORE INTO project_members (
  id, project_id, user_id, role, status,
  permissions_json, joined_at, created_at, updated_at
) VALUES (
  'mem-wen2-stellar-01',
  'proj-stellar-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'owner', 'active',
  '{}',
  datetime('now'), datetime('now'), datetime('now')
);

-- ── Characters ───────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO characters (
  id, owner_user_id, slug, name, romaji, species, summary,
  visibility, tags_json, created_at, updated_at
) VALUES
(
  'char-lingxing-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'ling-xiaoxing', '凌曉星', 'Ling Xiaoxing',
  '人類', '星際聯盟的年輕偵查員，擅長在混亂中尋找秩序。表面冷靜，內心燃燒著對真相的渴望。',
  'private',
  '["主角","偵查員","人類"]',
  datetime('now'), datetime('now')
),
(
  'char-shenwu-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'shen-wu', '沈霧', 'Shen Wu',
  '改造人', '曾是聯盟最優秀的特工，如今以「霧」為名活動於灰色地帶。目的不明，手段狠辣。',
  'private',
  '["反派","改造人","前特工"]',
  datetime('now'), datetime('now')
),
(
  'char-baiyu-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'bai-yu', '白羽', 'Bai Yu',
  '機械族', '來自機械族的工程師，凌曉星的摯友與技術後盾。話少但觀察力銳利，對友情極為忠誠。',
  'private',
  '["配角","工程師","機械族"]',
  datetime('now'), datetime('now')
),
(
  'char-ying-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'ying', '影', 'Ying',
  '不明', '身份成謎的情報掮客，與沈霧有不為人知的過去。只在需要時現身，從不說多餘的話。',
  'private',
  '["謎樣人物","情報員"]',
  datetime('now'), datetime('now')
);

-- ── Project Character Links ───────────────────────────────────────────────────

INSERT OR IGNORE INTO project_character_links (
  id, project_id, character_id, submitted_by_user_id,
  status, project_role, visibility, created_at, updated_at
) VALUES
(
  'pcl-lingxing-stellar',
  'proj-stellar-01', 'char-lingxing-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'active', '主角', 'private', datetime('now'), datetime('now')
),
(
  'pcl-shenwu-stellar',
  'proj-stellar-01', 'char-shenwu-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'active', '對立角', 'private', datetime('now'), datetime('now')
),
(
  'pcl-baiyu-stellar',
  'proj-stellar-01', 'char-baiyu-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'active', '夥伴', 'private', datetime('now'), datetime('now')
),
(
  'pcl-ying-stellar',
  'proj-stellar-01', 'char-ying-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'active', '謎樣存在', 'private', datetime('now'), datetime('now')
);

-- ── World Entries ─────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO world_entries (
  id, project_id, created_by_user_id,
  type, slug, title, summary, content,
  sort_order, visibility, created_at, updated_at
) VALUES
(
  'we-alliance-01',
  'proj-stellar-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'faction', 'stellar-alliance', '星際聯盟',
  '跨越三十七個星系的政治聯盟，以維護宇宙秩序為名，行使廣泛的軍事與執法權力。',
  '星際聯盟成立於第三次星際戰爭後，由七個創始星系簽署《星際和平協定》而建立。其核心機構包括聯盟議會、星際執法局（SEB）和技術研究委員會。

近年來，聯盟內部的腐敗問題日漸嚴重，部分高層涉嫌與灰色市場勢力勾結。凌曉星的調查正是從一起「意外」的情報洩漏開始。',
  0, 'private', datetime('now'), datetime('now')
),
(
  'we-obsidian-01',
  'proj-stellar-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'location', 'obsidian-base', '黑曜石基地',
  '廢棄的礦業站，現為灰色地帶的秘密集會點。沈霧的大本營。',
  '位於第十七小行星帶邊緣的黑曜石基地，表面上是一座廢棄的氦-3採礦站。站內的氧氣循環系統依然運作，可容納百人居住。

沈霧在此建立了一個獨立的情報網絡，不受聯盟管轄。基地的真實規模遠比外觀顯示的更大——地下三層的擴建工程從未出現在任何官方記錄中。',
  1, 'private', datetime('now'), datetime('now')
),
(
  'we-rift-01',
  'proj-stellar-01',
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  'concept', 'spacetime-rift', '時空裂縫',
  '宇宙邊境出現的神秘現象，物理規律在此處失效。整個故事的核心謎題。',
  '時空裂縫最早由邊境探測站於三年前記錄，初期被歸類為異常電磁風暴。隨後的調查發現，裂縫周圍的因果律出現紊亂——物質可以「提前」出現在尚未到達的位置。

聯盟技術研究委員會將此列為最高機密，但消息仍在灰色市場流傳。有人說，沈霧消失的原因與一次接近裂縫的任務有關。',
  2, 'private', datetime('now'), datetime('now')
);

-- ── Relationships ─────────────────────────────────────────────────────────────

INSERT OR IGNORE INTO relationships (
  id, project_id,
  source_type, source_id,
  target_type, target_id,
  type, label, description, direction,
  visibility, sort_order,
  created_by_user_id, created_at, updated_at
) VALUES
(
  'rel-ling-shen-01',
  'proj-stellar-01',
  'character', 'char-lingxing-01',
  'character', 'char-shenwu-01',
  '宿敵', '宿敵',
  '凌曉星追查的頭號目標，卻又在某次任務中被對方救下。兩人之間的關係遠比「追捕者與被追捕者」複雜得多。',
  'undirected',
  'private', 0,
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  datetime('now'), datetime('now')
),
(
  'rel-ling-bai-01',
  'proj-stellar-01',
  'character', 'char-lingxing-01',
  'character', 'char-baiyu-01',
  '摯友', '摯友',
  '從星際學院時期就認識的老朋友。白羽是凌曉星在這個混亂世界裡少數完全信任的人。',
  'undirected',
  'private', 1,
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  datetime('now'), datetime('now')
),
(
  'rel-shen-ying-01',
  'proj-stellar-01',
  'character', 'char-shenwu-01',
  'character', 'char-ying-01',
  '共謀', '共謀',
  '影為沈霧提供情報，但沈霧從不確定對方的真實目的。這段合作建立在互相利用與互相戒備之上。',
  'undirected',
  'private', 2,
  'f9d8d338-c98c-4042-80e8-afa09c74be05',
  datetime('now'), datetime('now')
);
