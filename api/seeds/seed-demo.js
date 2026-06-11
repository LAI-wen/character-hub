#!/usr/bin/env node
/**
 * Creates 常夜國 demo project on production.
 *
 * Usage:
 *   1. Log in at https://oc-tools-8g5.pages.dev
 *   2. Open browser devtools → Application → Session Storage
 *   3. Copy the value of `access_token`
 *   4. TOKEN=<paste_token_here> node api/seeds/seed-demo.js
 */

const BASE   = process.env.API_BASE ?? "https://oc-tools-8g5.pages.dev/api"
const EMAIL  = process.env.EMAIL
const PASS   = process.env.PASS
let   TOKEN  = process.env.TOKEN

if (!TOKEN && (!EMAIL || !PASS)) {
  console.error("Error: provide credentials via env vars.")
  console.error("  Option A (login):  EMAIL=you@example.com PASS=yourpassword node api/seeds/seed-demo.js")
  console.error("  Option B (token):  TOKEN=<access_token>  node api/seeds/seed-demo.js")
  process.exit(1)
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { "Authorization": `Bearer ${TOKEN}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "(empty)")
    throw new Error(`${method} ${BASE}${path}\n  → ${res.status}: ${text}`)
  }
  return res.json()
}

async function login() {
  console.log(`Logging in as ${EMAIL}…`)

  // Step 1: login → get refresh_token cookie
  const loginRes = await fetch(`${BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASS }),
  })
  if (!loginRes.ok) {
    const t = await loginRes.text().catch(() => "(empty)")
    throw new Error(`Login failed ${loginRes.status}: ${t}`)
  }
  const setCookie = loginRes.headers.get("set-cookie") ?? ""
  const rtMatch = setCookie.match(/refresh_token=([^;,\s]+)/)
  if (!rtMatch) throw new Error("Login succeeded but no refresh_token cookie in response")

  // Step 2: exchange refresh_token → access_token
  const refreshRes = await fetch(`${BASE}/v1/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Cookie": `refresh_token=${rtMatch[1]}`,
    },
  })
  if (!refreshRes.ok) {
    const t = await refreshRes.text().catch(() => "(empty)")
    throw new Error(`Token refresh failed ${refreshRes.status}: ${t}`)
  }
  const data = await refreshRes.json()
  TOKEN = data.access_token
  if (!TOKEN) throw new Error("Refresh response missing access_token: " + JSON.stringify(data))
  console.log("  ✓ authenticated")
}

async function main() {
  if (!TOKEN) await login()

  // ── 1. Project ──────────────────────────────────────────────────────────────
  console.log("Creating project…")
  const { project } = await api("/app/projects", {
    method: "POST",
    body: {
      name: "常夜國",
      description: "以神權帝國「常夜國」為舞台的黑暗奇幻世界。夜幕永不散去，信仰與鮮血構築的秩序正在崩潰邊緣。",
      themeColor: "#3B2E5A",
      visibility: "public",
    },
  })
  const pid = project.id
  console.log(`  ✓ ${project.name}  id=${pid}  slug=${project.slug}`)

  // ── 2. Characters ───────────────────────────────────────────────────────────
  console.log("Creating characters…")
  const charDefs = [
    {
      name: "白霧　曉",   romaji: "Shirakiri Akira", species: "人類",
      visibility: "public", tags: ["主角", "流亡貴族", "劍士"],
      projectRole: "主角", factionLabel: "白霧家",
      summary: "白霧家遭滅族後唯一倖存的繼承人。帶著家族秘密在帝國陰影中流浪，試圖找出真相。外表冷靜，內心燃燒著無法熄滅的復仇之火。",
    },
    {
      name: "夜刃　零",   romaji: "Yaba Rei",        species: "人類",
      visibility: "public", tags: ["謎之劍客", "刃手", "冷酷"],
      projectRole: "刃手", factionLabel: "月輪教",
      summary: "月輪教最強的刃手，以黑劍聞名。奉命追殺曉，卻在反覆的交手中逐漸動搖。沉默寡言，只有刀語。",
    },
    {
      name: "幽蓮　花月", romaji: "Yuren Kazuki",    species: "人類",
      visibility: "public", tags: ["大祭司", "反派", "女性"],
      projectRole: "大祭司", factionLabel: "月輪教",
      summary: "月輪教現任大祭司，掌握帝國的實質權力。以「永夜之宴」維繫神聖秩序。笑容溫柔，手段冷酷，視人命為祭品。",
    },
    {
      name: "銀露　朔",   romaji: "Ginro Saku",      species: "人類",
      visibility: "public", tags: ["幼馴染", "流浪商人", "樂天派"],
      projectRole: "協力者", factionLabel: null,
      summary: "曉的幼時友伴，以流浪商人身份周遊各地打探情報。看似輕浮，一直在暗中守護著曉。",
    },
  ]

  const charIds  = []
  const linkIds  = []
  for (const def of charDefs) {
    const { factionLabel, ...rest } = def
    const data = await api("/app/characters", {
      method: "POST",
      body: { ...rest, projectId: pid },
    })
    const char = data.character
    const link = data.projectLink
    charIds.push(char.id)
    linkIds.push(link?.id ?? null)
    console.log(`  ✓ ${char.name}  id=${char.id}`)

    if (factionLabel && link?.id) {
      await api(`/app/projects/${pid}/characters/${link.id}`, {
        method: "PATCH",
        body: { factionLabel },
      })
    }
  }

  // ── 3. World entries ────────────────────────────────────────────────────────
  console.log("Creating world entries…")
  const worldDefs = [
    {
      title: "常夜國", type: "nation", visibility: "public",
      summary: "永夜籠罩的神權帝國。傳說太陽在千年前被月輪教的始祖吞噬，以換取人民的永生。帝國以神諭統治，夜幕從未散去。",
      content: "帝國歷史可追溯至「永夜之約」——祖神以黑月降臨，與第一代大祭司立下契約：以鮮血換永夜，以永夜換秩序。如今已傳至第十七代，信仰的裂縫悄悄蔓延。",
    },
    {
      title: "月輪教", type: "faction", visibility: "public",
      summary: "控制常夜國的宗教組織，以「永夜之宴」每年舉行血祭維繫黑月的降臨。大祭司是帝國最高權威。",
    },
    {
      title: "白霧家", type: "faction", visibility: "public",
      summary: "曾掌管帝國北境的古老貴族。三年前以「冒瀆神明」為由遭月輪教滅族，曉是唯一倖存者。據說握有能終結永夜的秘法。",
    },
    {
      title: "無影城", type: "location", visibility: "public",
      summary: "常夜國首都，建於終年不見光的盆地之中。月輪教的黑塔刺穿永夜的雲層。城中禁止火把，唯有神燈照明。",
    },
    {
      title: "永夜之宴", type: "event", visibility: "public",
      summary: "每年黑月最圓之時，月輪教於大神殿舉行的秘密血祭。據稱獻祭者的靈魂將被織入黑月，延續永夜的詛咒。民間只知是「聖典祭」，不知其真相。",
    },
    {
      title: "滅光之術", type: "concept", visibility: "public",
      summary: "白霧家秘傳的禁忌術法，能刺穿黑月、召回太陽。月輪教滅族白霧家的真正原因。曉並不知自己體內已封印著這個力量。",
    },
  ]

  for (const def of worldDefs) {
    const { entry } = await api(`/app/projects/${pid}/world-entries`, {
      method: "POST",
      body: def,
    })
    console.log(`  ✓ ${entry.title}`)
  }

  // ── 4. Relationships ────────────────────────────────────────────────────────
  console.log("Creating relationships…")
  const [akiraId, reiId, kazukiId, sakuId] = charIds

  const relDefs = [
    {
      sourceRef: { type: "character", id: akiraId },
      targetRef: { type: "character", id: reiId },
      label: "運命的追跡", type: "rivalry",
      mapStyle: "arrows", direction: "two-way",
      srcView: "必須打倒的障壁，卻無法恨得純粹",
      tgtView: "奉命獵殺的目標，卻讓劍遲疑了",
      description: "始於一場追殺，在反覆相遇中變得複雜。兩人都意識到對方身上有某種無法忽視的東西。",
      visibility: "public",
    },
    {
      sourceRef: { type: "character", id: akiraId },
      targetRef: { type: "character", id: sakuId },
      label: "幼馴染", type: "friend",
      description: "從兒時起便相識的友伴。白霧家滅族後，朔是曉唯一願意依靠的人。",
      visibility: "public",
    },
    {
      sourceRef: { type: "character", id: akiraId },
      targetRef: { type: "character", id: kazukiId },
      label: "宿敵", type: "feud",
      mapStyle: "arrows", direction: "two-way",
      srcView: "滅族之仇，不共戴天",
      tgtView: "礙事的遺孤，遲早要清除",
      description: "花月下令滅了白霧家，曉的復仇目標正是她。花月則視曉為必須消除的變數。",
      visibility: "public",
    },
    {
      sourceRef: { type: "character", id: reiId },
      targetRef: { type: "character", id: kazukiId },
      label: "主従", type: "belong",
      description: "零是花月親自培育的刃手，效命於月輪教。花月對零的忠誠始終保持距離，彷彿在等待某個時機。",
      visibility: "public",
    },
  ]

  for (const def of relDefs) {
    const { relationship } = await api(`/app/projects/${pid}/relationships`, {
      method: "POST",
      body: def,
    })
    console.log(`  ✓ ${relationship.label}`)
  }

  // ── Done ────────────────────────────────────────────────────────────────────
  console.log("\n✅ Demo data created!")
  console.log(`   Overview : https://oc-tools-8g5.pages.dev/p/${pid}/overview`)
  console.log(`   Public   : https://oc-tools-8g5.pages.dev/page/${project.slug}`)
}

main().catch(e => {
  console.error("\n❌ Error:", e.message)
  process.exit(1)
})
