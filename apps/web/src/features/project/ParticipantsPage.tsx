import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { useAuth } from "@/lib/auth/context"
import { apiClient } from "@/lib/api/client"
import { fmtDate } from "@/lib/formatDate"

type Member = {
  id: string
  userId: string
  role: string
  status: string
  joinedAt: string
  displayName: string
  handle: string
  charCount: number
  isCurrentUser: boolean
  invitedByHandle?: string | null
}


// ── Permission groups definition ───────────────────────────────────────────────

type PermEffect = "allow" | "deny"
type PermSource = "preset" | "allow" | "deny" | "ownerFixed"

type PermRow = { code: string; label: string; desc?: string }
type PermGroup = { id: string; label: string; rows: PermRow[]; defaultOpen?: boolean }

const PERM_GROUPS: PermGroup[] = [
  {
    id: "mem", label: "成員管理", defaultOpen: true, rows: [
      { code: "member:view",               label: "查看成員名單",           desc: "可查看此企劃的成員列表與基本資訊" },
      { code: "member:invite",             label: "邀請新成員",             desc: "可寄送邀請連結給外部使用者" },
      { code: "member:update_role",        label: "變更成員角色",           desc: "可調整其他成員的角色預設" },
      { code: "member:remove",             label: "移除成員",               desc: "可從企劃移除非擁有者成員" },
      { code: "member:update_permissions", label: "自訂成員權限",           desc: "可針對個別成員覆蓋角色預設" },
    ],
  },
  {
    id: "content", label: "內容管理", rows: [
      { code: "character:approve",         label: "審核角色申請",           desc: "可批准或拒絕角色加入企劃的請求" },
      { code: "character:update_link",     label: "編輯企劃角色設定",       desc: "可修改陣營、職位、限定欄位" },
      { code: "world:create",             label: "新增世界觀條目",          desc: "可在企劃的世界觀中建立新條目" },
      { code: "world:update",             label: "編輯世界觀條目",          desc: "可修改世界觀條目內容" },
      { code: "story:update",             label: "編輯故事分幕",            desc: "可修改企劃的故事架構與內容" },
    ],
  },
  {
    id: "page", label: "公開頁", rows: [
      { code: "publicPage:update",         label: "編輯公開頁草稿",         desc: "可編輯但不可直接發布" },
      { code: "publicPage:publish",        label: "發布公開頁",             desc: "可將草稿正式發布為公開版本" },
      { code: "pageTemplate:update",       label: "設計企劃版型",           desc: "可修改角色頁的版型設計" },
      { code: "pageOverride:update_own",   label: "調整自己頁面 Override",   desc: "可覆寫自己角色頁的樣式覆蓋" },
    ],
  },
  {
    id: "danger", label: "危險操作", defaultOpen: true, rows: [
      { code: "project:transfer_ownership", label: "移交企劃擁有權",       desc: "擁有者固定，無法調整" },
      { code: "project:archive",            label: "封存企劃",              desc: "擁有者固定，無法調整" },
    ],
  },
]

// Role presets: which permissions each role grants by default
const ROLE_PRESETS: Record<string, Set<string>> = {
  owner: new Set(PERM_GROUPS.flatMap(g => g.rows.map(r => r.code))),
  admin: new Set([
    "member:view", "member:invite", "member:update_role", "member:remove",
    "character:approve", "character:update_link", "world:create", "world:update", "story:update",
    "publicPage:update", "publicPage:publish", "pageTemplate:update", "pageOverride:update_own",
  ]),
  member: new Set([
    "member:view",
    "character:update_link",
    "world:create",
    "publicPage:update", "pageOverride:update_own",
  ]),
}

const OWNER_FIXED = new Set(["project:transfer_ownership", "project:archive"])

const ROLE_LABEL: Record<string, string> = {
  owner: "企劃擁有者",
  admin: "主持人",
  member: "參與者",
}

// ── Member list panel ──────────────────────────────────────────────────────────

function MemberListPane({
  members, selId, onSelect, isOwner,
}: {
  members: Member[]
  selId: string | null
  onSelect: (id: string) => void
  isOwner: boolean
}) {
  const [q, setQ] = useState("")

  const filtered = q
    ? members.filter(m =>
        (m.displayName + " " + m.handle + " " + (ROLE_LABEL[m.role] ?? ""))
          .toLowerCase()
          .includes(q.toLowerCase())
      )
    : members

  return (
    <div className="pt-pane">
      <div className="ph">
        成員
        <span className="ct">{members.length}</span>
      </div>

      <div style={{ padding: "var(--s2) var(--s3)", borderBottom: "1px solid var(--border)" }}>
        <div className="searchf">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            placeholder="搜尋成員…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="mlist">
        {filtered.map(m => (
          <button
            key={m.id}
            type="button"
            className={"mrow" + (m.id === selId ? " sel" : "")}
            onClick={() => onSelect(m.id)}
          >
            <span className="av" style={{ background: "var(--accent)" }}>
              {m.displayName.slice(0, 1)}
            </span>
            <span className="id">
              <span className="nm">
                {m.displayName}
                {m.isCurrentUser && <span style={{ fontSize: 10, color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>（你）</span>}
              </span>
              <span className="hd">@{m.handle}</span>
              <span className="meta">
                <span className={`badge ${m.role === "owner" || m.role === "admin" ? "approved" : ""}`}>
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
                <span className="hd">{m.charCount} 角色</span>
              </span>
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: "var(--s6) var(--s4)", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
            {q ? "找不到符合的成員。" : "目前只有你一人。"}
          </div>
        )}
      </div>

      {isOwner && (
        <>
          <div className="grp-h">邀請 · Invitations</div>
          <div className="inv-row" style={{ borderBottom: "none" }}>
            <span className="id">
              <span className="em" style={{ color: "var(--text-faint)", fontStyle: "italic" }}>尚無待接受的邀請</span>
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// ── Member detail panel ────────────────────────────────────────────────────────

function MemberDetailPane({
  member,
}: {
  member: Member | null
  projectName?: string
  onRefetch?: () => void
}) {
  if (!member) {
    return (
      <div className="pt-pane">
        <div className="ph">成員詳情</div>
        <div style={{ padding: "var(--s8)", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
          選擇左側成員查看詳情。
        </div>
      </div>
    )
  }

  const roleLabel = ROLE_LABEL[member.role] ?? member.role

  return (
    <div className="pt-pane">
      <div className="ph">成員詳情 · Member</div>

      <div className="md-top">
        <span className="av" style={{ background: "var(--accent)" }}>
          {member.displayName.slice(0, 1)}
        </span>
        <div>
          <div className="nm">{member.displayName}</div>
          <div className="hd">@{member.handle} · {roleLabel}</div>
        </div>
      </div>

      <div className="md-stats">
        <div className="md-stat">
          <b>{member.charCount}</b>
          <span>企劃角色</span>
        </div>
        <div className="md-stat">
          <b>{fmtDate(member.joinedAt)}</b>
          <span>加入時間</span>
        </div>
        <div className="md-stat">
          <b>{member.invitedByHandle ? "@" + member.invitedByHandle : "—"}</b>
          <span>邀請者</span>
        </div>
      </div>

      <div className="md-sec">
        <h3>Ownership 邊界</h3>
        <div className="own-note">
          <div style={{ color: "var(--accent)", marginTop: 1, flexShrink: 0 }}>⚠</div>
          <div>
            權限通過後仍受<b>內容 ownership</b> 限制：主持人可管理 <b>ProjectCharacterLink</b>（陣營／職位／審核），但<b>不可修改 {member.displayName} 的角色本體</b>（名稱／外觀／圖文設定）、不可永久刪除其擁有的 Asset。
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.6 }}>
          角色擁有者、素材擁有者、頁面擁有者各自獨立，不因企劃身分而轉移。
        </div>
      </div>

      <div className="md-actions">
        {!member.isCurrentUser && member.role !== "owner" && (
          <button className="btn btn-sm" disabled title="角色管理功能即將推出">
            變更角色
          </button>
        )}
        <button className="btn btn-sm" disabled title="查看企劃角色">
          查看其角色
        </button>
      </div>

      {/* Danger zone */}
      {(member.isCurrentUser || member.role !== "owner") && (
        <div className="pt-danger">
          <h3>危險操作</h3>
          <div style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap" }}>
            {member.isCurrentUser && member.role !== "owner" && (
              <button className="btn btn-sm">離開企劃</button>
            )}
            {!member.isCurrentUser && member.role !== "owner" && (
              <>
                <button className="btn btn-sm">移除成員</button>
                <button className="btn btn-sm">移交企劃擁有權</button>
              </>
            )}
            {member.role === "owner" && member.isCurrentUser && (
              <div style={{ fontSize: 12.5, color: "#9E332B", lineHeight: 1.6 }}>
                你是唯一的企劃擁有者，<b>不能直接離開</b>。請先移交擁有權或封存企劃。
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Permission panel ───────────────────────────────────────────────────────────

function PermPane({ member, projectId }: { member: Member | null; projectId: string }) {
  const [overrides, setOverrides] = useState<Record<string, PermEffect>>({})
  const qc = useQueryClient()

  const saveMutation = useMutation({
    mutationFn: (permissions: Record<string, PermEffect>) =>
      apiClient(`/api/app/projects/${projectId}/members/${member!.id}`, {
        method: 'PATCH',
        body: { permissions },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId, 'members'] })
      setOverrides({})
    },
    onError: () => alert('儲存失敗，請稍後再試'),
  })

  if (!member) {
    return (
      <div className="pt-pane perm-pane">
        <div className="ph">權限</div>
      </div>
    )
  }

  const presetPerms = ROLE_PRESETS[member.role] ?? ROLE_PRESETS.member
  const roleLabel = ROLE_LABEL[member.role] ?? member.role
  const canEditPerms = member.role !== "owner"
  const dirtyCount = Object.keys(overrides).length

  function getEff(code: string): { effect: PermEffect; source: PermSource } {
    if (overrides[code]) return { effect: overrides[code], source: overrides[code] === "allow" ? "allow" : "deny" }
    if (OWNER_FIXED.has(code)) return { effect: member!.role === "owner" ? "allow" : "deny", source: "ownerFixed" }
    return { effect: presetPerms.has(code) ? "allow" : "deny", source: "preset" }
  }

  function toggle(code: string) {
    const cur = getEff(code).effect
    setOverrides(prev => {
      const next = { ...prev }
      const newEff = cur === "allow" ? "deny" : "allow"
      const defaultEff: PermEffect = presetPerms.has(code) ? "allow" : "deny"
      if (newEff === defaultEff) {
        delete next[code]
      } else {
        next[code] = newEff
      }
      return next
    })
  }

  function reset() {
    setOverrides({})
  }

  return (
    <div className="pt-pane perm-pane">
      <div className="ph">
        權限 · {roleLabel}{!canEditPerms ? "（唯讀）" : ""}
      </div>
      <div className="help-banner">
        每組顯示摘要，展開看細項。標示來源：
        <span className="src preset">預設</span>
        {" "}
        <span className="src allow">額外允許</span>
        {" "}
        <span className="src deny">明確禁止</span>
        {" "}
        <span className="src ownerFixed">擁有者固定</span>
      </div>

      {PERM_GROUPS.map(grp => {
        const allowN = grp.rows.filter(r => getEff(r.code).effect === "allow").length
        return (
          <details key={grp.id} className="pgrp" open={grp.defaultOpen}>
            <summary>
              <span className="cv">▸</span>
              <span className="gname">{grp.label}</span>
              <span className="gsum">{allowN}/{grp.rows.length}</span>
            </summary>
            <div className="pbody">
              {grp.rows.map(row => {
                const eff = getEff(row.code)
                const locked = !canEditPerms || OWNER_FIXED.has(row.code) || member.role === "owner"
                const srcCls = eff.source === "ownerFixed" ? "ownerFixed"
                  : eff.source === "preset" ? "preset"
                  : eff.effect === "allow" ? "allow" : "deny"
                const srcLabel = eff.source === "ownerFixed" ? "擁有者固定"
                  : eff.source === "allow" ? "額外允許"
                  : eff.source === "deny" ? "明確禁止"
                  : "預設"
                return (
                  <div key={row.code} className="prow">
                    <span className="pn">
                      <span className="pl">{row.label}</span>
                      {row.desc && <span className="pd">{row.desc}</span>}
                    </span>
                    <span className={`src ${srcCls}`}>{srcLabel}</span>
                    <button
                      type="button"
                      className={"psw" + (eff.effect === "allow" ? " on" : "")}
                      disabled={locked}
                      onClick={() => !locked && toggle(row.code)}
                      role="switch"
                      aria-checked={eff.effect === "allow"}
                      aria-label={row.label}
                    />
                  </div>
                )
              })}
            </div>
          </details>
        )
      })}

      <div className="perm-foot">
        {canEditPerms ? (
          <>
            <button
              className="btn btn-accent"
              disabled={dirtyCount === 0 || saveMutation.isPending}
              onClick={() => saveMutation.mutate(overrides)}
            >
              {saveMutation.isPending ? "儲存中⋯" : `儲存權限${dirtyCount > 0 ? `（${dirtyCount}）` : ""}`}
            </button>
            <button className="btn" disabled={saveMutation.isPending} onClick={reset}>
              恢復角色預設
            </button>
          </>
        ) : (
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
            你沒有調整此成員權限的權限。
          </span>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function ParticipantsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const { viewer } = useAuth()
  const [selId, setSelId] = useState<string | null>(null)

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "members"],
    queryFn: () => apiClient<{ members: Member[]; viewerIsOwner: boolean }>(`/api/app/projects/${projectId}/members`),
    enabled: !!projectId,
  })

  const members = data?.members ?? []
  const isOwner = data?.viewerIsOwner ?? project.ownerUserId === viewer?.id

  const effectiveSel = selId ?? (members[0]?.id ?? null)
  const selected = members.find(m => m.id === effectiveSel) ?? null

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "參與者"]} />
      <PageHeader
        eyebrow="Participants"
        title="參與者"
        sub={`「${project.name}」的成員與權限。角色預設只給初始權限，實際操作依 action permission 判斷，並仍受內容 ownership 限制。`}
        action={
          isOwner ? (
            <button className="btn btn-accent" disabled title="邀請功能即將推出">
              ＋ 邀請成員
            </button>
          ) : undefined
        }
      />

      {status === "pending" && <LoadingSpinner />}
      {status === "error" && <p style={{ color: "var(--avoid)" }}>無法載入成員</p>}

      {status === "success" && (
        <>
          <div className="toolbar" style={{ marginBottom: "var(--s4)" }}>
            <span className="badge">{members.length} 位成員</span>
          </div>

          <div className="pt-cols">
            <MemberListPane
              members={members}
              selId={effectiveSel}
              onSelect={setSelId}
              isOwner={isOwner}
            />
            <MemberDetailPane
              member={selected}
              projectName={project.name}
            />
            <PermPane member={selected} projectId={projectId!} />
          </div>
        </>
      )}
    </div>
  )
}
