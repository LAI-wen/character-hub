import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams, Link } from "react-router-dom"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import { useAuth } from "@/lib/auth/context"
import { apiClient } from "@/lib/api/client"
import { charColor } from "@/lib/charColor"

type RosterEntry = {
  projectLink: {
    id: string
    characterId: string
    submittedByUserId: string | null
    status: string
    projectRole: string | null
    factionLabel: string | null
    fieldValues: Record<string, unknown>
    submittedAt: string | null
    reviewedAt: string | null
    reviewMessage: string | null
    createdAt: string
    updatedAt: string
  }
  character: {
    id: string
    name: string
    romaji: string | null
    species: string | null
    summary: string | null
    avatarUrl: string | null
    themeColor: string | null
    ownerUserId: string
  } | null
}

const STATUS_LABELS: Record<string, string> = {
  draft:     "草稿",
  pending:   "審核中",
  active:    "已通過",
  approved:  "已通過",
  rejected:  "已拒絕",
  removed:   "已移除",
}

const REVIEW_STATUSES = ["pending"]
const MY_STATUSES = ["draft", "pending", "active", "approved", "rejected"]

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("zh-TW", { year: "numeric", month: "short", day: "numeric" })
}

export function ApplicationsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const { viewer } = useAuth()
  const queryClient = useQueryClient()

  const [tab, setTab] = useState<"mine" | "review">("mine")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const isOwner = project.ownerUserId === viewer?.id

  const { data, status: queryStatus } = useQuery({
    queryKey: ["project", projectId, "characters"],
    queryFn: () => apiClient<{ roster: RosterEntry[] }>(`/api/app/projects/${projectId}/characters`),
    enabled: !!projectId,
  })

  const roster = data?.roster ?? []

  // "My applications": all links submitted by me
  const myApps = roster.filter(r =>
    r.projectLink.submittedByUserId === viewer?.id &&
    MY_STATUSES.includes(r.projectLink.status)
  )

  // "Host review": all pending links
  const pendingApps = roster.filter(r => REVIEW_STATUSES.includes(r.projectLink.status))

  const displayList = tab === "mine" ? myApps : pendingApps
  const selected = displayList.find(r => r.projectLink.id === selectedId) ?? displayList[0] ?? null

  const patchMutation = useMutation({
    mutationFn: ({ linkId, status, reviewMessage }: { linkId: string; status: string; reviewMessage?: string }) =>
      apiClient(`/api/app/projects/${projectId}/characters/${linkId}`, {
        method: "PATCH",
        body: JSON.stringify({ status, reviewMessage }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "characters"] })
    },
  })

  function handleApprove(linkId: string) {
    patchMutation.mutate({ linkId, status: "active" })
  }

  function handleReject(linkId: string) {
    const msg = prompt("拒絕原因（可留空）")
    if (msg === null) return
    patchMutation.mutate({ linkId, status: "rejected", reviewMessage: msg || undefined })
  }

  function StatusBadge({ status }: { status: string }) {
    return (
      <span className={`ap-st ${status === "approved" ? "active" : status}`}>
        {STATUS_LABELS[status] ?? status}
      </span>
    )
  }

  const CHARACTER_COLOR = (entry: RosterEntry) =>
    entry.character?.themeColor ?? charColor(entry.character?.id ?? "")

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[{ label: project.name, href: `/p/${projectId}` }, "角色申請"]} />

      <div className="pageh">
        <div className="ht">
          <h1 style={{ fontFamily: "var(--font-serif)" }}>角色申請 <span className="en">Applications</span></h1>
          <p className="sub">角色申請加入「{project.name}」並由主持人審核</p>
        </div>
        {!isOwner && (
          <div className="ha">
            <Link to={`/p/${projectId}/roster/new`} className="btn btn-accent">＋ 申請加入</Link>
          </div>
        )}
      </div>

      <div className="ap-tabs">
        <button
          className={"ap-tab" + (tab === "mine" ? " on" : "")}
          onClick={() => setTab("mine")}
        >
          我的申請
        </button>
        {isOwner && (
          <button
            className={"ap-tab" + (tab === "review" ? " on" : "")}
            onClick={() => setTab("review")}
          >
            主持人審核
            {pendingApps.length > 0 && <span className="ct">{pendingApps.length}</span>}
          </button>
        )}
      </div>

      {queryStatus === "pending" && <p style={{ color: "var(--text-faint)" }}>載入中⋯</p>}
      {queryStatus === "error" && <p style={{ color: "var(--avoid)" }}>無法載入申請資料</p>}

      {queryStatus === "success" && (
        <div className="ap-cols">
          {/* Left: list */}
          <div>
            <div className="ap-list">
              <div className="lh">
                {tab === "mine" ? `我的申請 · ${myApps.length}` : `待審核 · ${pendingApps.length}`}
              </div>
              {displayList.map(r => (
                <button
                  key={r.projectLink.id}
                  className={"ap-item" + (selectedId === r.projectLink.id || (!selectedId && r === selected) ? " sel" : "")}
                  onClick={() => setSelectedId(r.projectLink.id)}
                >
                  {r.character?.avatarUrl ? (
                    <img
                      src={r.character.avatarUrl}
                      alt={r.character.name}
                      style={{ width: 34, height: 34, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <span
                      className="av"
                      style={{ background: CHARACTER_COLOR(r) }}
                    >
                      {r.character?.name.slice(0, 1) ?? "?"}
                    </span>
                  )}
                  <div className="b">
                    <div className="nm">{r.character?.name ?? "（角色已刪除）"}</div>
                    <div className="meta">
                      {r.character?.species && `${r.character.species} · `}
                      {r.projectLink.submittedAt ? fmtDate(r.projectLink.submittedAt) : fmtDate(r.projectLink.createdAt)}
                    </div>
                  </div>
                  <StatusBadge status={r.projectLink.status} />
                </button>
              ))}
              {displayList.length === 0 && (
                <div style={{ padding: "var(--s6) var(--s5)", textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>
                  {tab === "mine" ? "你還沒有申請任何角色" : "目前沒有待審核申請"}
                </div>
              )}
            </div>
          </div>

          {/* Center: detail */}
          <div>
            {selected ? (
              <div className="ap-main">
                <div className="mh">
                  <div className="top">
                    <h2>{selected.character?.name ?? "（角色已刪除）"}</h2>
                    <StatusBadge status={selected.projectLink.status} />
                  </div>
                  <div className="sub">
                    申請加入「{project.name}」
                    {selected.projectLink.submittedAt && (
                      <> · 送出於 {fmtDate(selected.projectLink.submittedAt)}</>
                    )}
                  </div>
                </div>

                <div className="ap-body">
                  {selected.projectLink.reviewMessage && (
                    <div className={`ap-msg${selected.projectLink.status === "rejected" ? " rej" : ""}`}>
                      <div className="lbl">
                        {selected.projectLink.status === "rejected" ? "已拒絕" : "主持人留言"}
                      </div>
                      {selected.projectLink.reviewMessage}
                    </div>
                  )}

                  {selected.character && (
                    <div className="ap-sec">
                      <div className="ap-sec-h">角色資訊</div>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--s4)" }}>
                        {selected.character.avatarUrl ? (
                          <img
                            src={selected.character.avatarUrl}
                            style={{ width: 64, height: 64, borderRadius: 14, objectFit: "cover", flexShrink: 0 }}
                            alt={selected.character.name}
                          />
                        ) : (
                          <div style={{
                            width: 64, height: 64, borderRadius: 14, background: CHARACTER_COLOR(selected),
                            display: "grid", placeItems: "center", fontFamily: "var(--font-serif)",
                            fontSize: 28, fontWeight: 700, color: "#fff", flexShrink: 0,
                          }}>
                            {selected.character.name.slice(0, 1)}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.character.name}</div>
                          {selected.character.romaji && (
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                              {selected.character.romaji}
                            </div>
                          )}
                          {selected.character.species && (
                            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 4 }}>
                              {selected.character.species}
                            </div>
                          )}
                          {selected.character.summary && (
                            <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 6, lineHeight: 1.6, maxWidth: 480 }}>
                              {selected.character.summary}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {Object.keys(selected.projectLink.fieldValues ?? {}).length > 0 && (
                    <div className="ap-sec">
                      <div className="ap-sec-h">企劃欄位</div>
                      {Object.entries(selected.projectLink.fieldValues).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: "var(--s3)" }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-faint)", marginBottom: 3 }}>{k}</div>
                          <div style={{ fontSize: 14 }}>{String(v)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isOwner && tab === "review" && selected.projectLink.status === "pending" && (
                  <div className="ap-foot">
                    <span style={{ fontSize: 13, color: "var(--text-faint)" }}>作為主持人審核此申請</span>
                    <span className="spacer" />
                    <button
                      className="btn btn-sm"
                      style={{ borderColor: "var(--avoid)", color: "var(--avoid)" }}
                      onClick={() => handleReject(selected.projectLink.id)}
                      disabled={patchMutation.isPending}
                    >
                      拒絕
                    </button>
                    <button
                      className="btn btn-sm btn-accent"
                      onClick={() => handleApprove(selected.projectLink.id)}
                      disabled={patchMutation.isPending}
                    >
                      通過
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="ap-main" style={{ padding: "var(--s8)", textAlign: "center" }}>
                <p style={{ color: "var(--text-faint)", fontSize: 14 }}>
                  {displayList.length === 0
                    ? (tab === "mine" ? "目前沒有申請記錄。" : "目前沒有待審核的申請。")
                    : "選擇左側申請查看詳情"}
                </p>
              </div>
            )}
          </div>

          {/* Right: sidebar */}
          <div className="ap-side">
            {selected?.character && (
              <div className="ap-panel">
                <div className="ph">角色摘要</div>
                <div className="ap-charsum">
                  {selected.character.avatarUrl ? (
                    <img
                      src={selected.character.avatarUrl}
                      style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover" }}
                      alt={selected.character.name}
                    />
                  ) : (
                    <span className="av" style={{ background: CHARACTER_COLOR(selected) }}>
                      {selected.character.name.slice(0, 1)}
                    </span>
                  )}
                  <div>
                    <div className="nm">{selected.character.name}</div>
                    {selected.character.romaji && (
                      <div className="rom">{selected.character.romaji}</div>
                    )}
                  </div>
                </div>
                {selected.character.species && (
                  <div className="ap-kv">
                    <span className="k">物種</span>
                    <span>{selected.character.species}</span>
                  </div>
                )}
              </div>
            )}

            {selected && (
              <div className="ap-panel">
                <div className="ph">申請進度</div>
                <div className="ap-timeline">
                  <div className={`ap-tl ${selected.projectLink.createdAt ? "done" : ""}`}>
                    <span className="dot" />
                    <div><div>建立</div></div>
                  </div>
                  <div className={`ap-tl ${selected.projectLink.submittedAt ? "done" : ""}`}>
                    <span className="dot" />
                    <div>
                      <div>提交</div>
                      {selected.projectLink.submittedAt && (
                        <div className="when">{fmtDate(selected.projectLink.submittedAt)}</div>
                      )}
                    </div>
                  </div>
                  <div className={`ap-tl ${selected.projectLink.reviewedAt ? "done" : ""}`}>
                    <span className="dot" />
                    <div>
                      <div>審核</div>
                      {selected.projectLink.reviewedAt && (
                        <div className="when">{fmtDate(selected.projectLink.reviewedAt)}</div>
                      )}
                    </div>
                  </div>
                  <div className={`ap-tl ${["active", "approved", "rejected"].includes(selected.projectLink.status) ? "done" : ""}`}>
                    <span className="dot" />
                    <div>
                      <div>結果</div>
                      {["active", "approved"].includes(selected.projectLink.status) && (
                        <span style={{ fontSize: 12, color: "#1B5E20" }}>已通過</span>
                      )}
                      {selected.projectLink.status === "rejected" && (
                        <span style={{ fontSize: 12, color: "#6B1A0F" }}>已拒絕</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
