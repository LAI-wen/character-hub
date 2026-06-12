import React, { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
// import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import { useAuth } from "@/lib/auth/context"

type AccountProfile = {
  id: string
  email: string
  handle: string
  displayName: string
  bio: string | null
  hasPassword: boolean
}

type ConnectedAccount = {
  id: string
  provider: "google" | "github"
  connectedAt: string
}

type Section = "profile" | "commission" | "privacy" | "notif" | "appearance" | "data" | "projdef" | "invites" | "account"

const SECTIONS: { id: Section; labelKey: string; icon: string }[] = [
  { id: "profile",    labelKey: "settings.sections.profile",    icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' },
  { id: "commission", labelKey: "settings.sections.commission", icon: '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>' },
  { id: "privacy",    labelKey: "settings.sections.privacy",    icon: '<path d="M12 3l7 3v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z"/>' },
  { id: "notif",      labelKey: "settings.sections.notif",      icon: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>' },
  { id: "appearance", labelKey: "settings.sections.appearance", icon: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none"/>' },
  { id: "data",       labelKey: "settings.sections.data",       icon: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>' },
  { id: "projdef",    labelKey: "settings.sections.projdef",    icon: '<path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/>' },
  { id: "invites",    labelKey: "settings.sections.invites",    icon: '<path d="M21 5H3a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z"/><path d="m3 6 9 7 9-7"/>' },
]

const ACCOUNT_SECTION = {
  id: "account" as Section,
  labelKey: "settings.sections.account",
  icon: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5H9.4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4.9l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/>',
}

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" dangerouslySetInnerHTML={{ __html: d }} />
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, flexShrink: 0 }}>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" style={{ width: 20, height: 20, flexShrink: 0 }}>
      <path fill="currentColor" d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
    </svg>
  )
}

// fmtBytes reserved for future storage display

type TrashItem = { name: string; ty: string; c: string; when: string }

function StoragePanel() {
  const [autoBackup, setAutoBackup] = useState(true)
  const [trash, setTrash] = useState<TrashItem[]>([
    { name: "灰（舊版）",       ty: "角色",  c: "#8A857C", when: "2 天前"  },
    { name: "試作 · 雙子設定", ty: "世界觀", c: "#3B5E6B", when: "6 天前"  },
    { name: "廢棄構圖",         ty: "圖片",  c: "#C2702C", when: "3 週前" },
  ])

  function restoreItem(i: number) {
    setTrash(prev => prev.filter((_, idx) => idx !== i))
  }
  function purgeItem(i: number) {
    setTrash(prev => prev.filter((_, idx) => idx !== i))
  }

  return (
    <>
      {/* Export / Import */}
      <div className="set-card">
        <div className="card-h">
          <h2>資料</h2>
          <p className="desc">把你的角色與設定帶著走——匯出備份，或從別處匯入。</p>
        </div>
        <div className="card-body">
          <div className="acc-drow">
            <div className="dt">匯出 JSON<span className="sub">所有企劃、角色、世界觀與靈感的結構化資料。</span></div>
            <div className="da"><button className="btn btn-sm">匯出 JSON</button></div>
          </div>
          <div className="acc-drow">
            <div className="dt">匯出 PDF 設定書<span className="sub">把一個企劃的角色與世界觀排成可印的設定書。</span></div>
            <div className="da"><button className="btn btn-sm">匯出 PDF</button></div>
          </div>
          <div className="acc-drow">
            <div className="dt">匯入資料<span className="sub">從匯出的 JSON 還原，或從其他工具搬入。</span></div>
            <div className="da"><button className="btn btn-sm">匯入…</button></div>
          </div>
          <div className="acc-drow">
            <div className="dt">自動備份<span className="sub">每週把一份備份寄到你的信箱。</span></div>
            <div className="da"><Toggle checked={autoBackup} onChange={setAutoBackup} /></div>
          </div>
        </div>
      </div>

      {/* Trash / Recycle bin */}
      <div className="set-card">
        <div className="card-h">
          <h2>回收站</h2>
          <p className="desc">刪除的角色、條目與圖片會先進回收站，30 天內可復原。</p>
        </div>
        <div className="card-body">
          <div className="trash">
            {trash.length === 0
              ? <div className="tempty">回收站是空的。</div>
              : trash.map((item, i) => (
                  <div key={i} className="titem">
                    <span className="tav" style={{ background: item.c }}>{item.name.slice(0, 1)}</span>
                    <span className="tn">{item.name}<span className="ty">{item.ty}</span></span>
                    <span className="tw">{item.when}刪除</span>
                    <button className="tb" onClick={() => restoreItem(i)}>復原</button>
                    <button className="tb" onClick={() => purgeItem(i)}>永久刪除</button>
                  </div>
                ))
            }
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="set-card acc-danger">
        <div className="card-h">
          <h2>清除本地資料</h2>
          <p className="desc">清掉這個瀏覽器存的草稿與預覽狀態，不影響雲端資料。</p>
        </div>
        <div className="card-body">
          <div className="acc-drow">
            <div className="dt">清除本地草稿<span className="sub">編輯器快照、主題、面板狀態等。</span></div>
            <div className="da">
              <button
                className="btn btn-sm"
                style={{ color: "var(--avoid)", borderColor: "var(--avoid)" }}
                onClick={() => { localStorage.clear(); alert("本地資料已清除") }}
              >
                清除本地
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [err, setErr] = useState("")
  const [ok, setOk] = useState(false)

  const mutation = useMutation({
    mutationFn: () =>
      apiClient("/api/app/account/password", {
        method: "PATCH",
        body: {
          ...(hasPassword ? { currentPassword: current } : {}),
          newPassword: next,
        },
      }),
    onSuccess: () => {
      setOk(true)
      setOpen(false)
      setCurrent(""); setNext(""); setConfirm(""); setErr("")
    },
    onError: (e: Error) => setErr(e.message || t("common.saveFailed")),
  })

  function handleSubmit() {
    setErr("")
    if (next.length < 8) { setErr(t("settings.account.passwordTooShort")); return }
    if (next !== confirm) { setErr(t("settings.account.passwordMismatch")); return }
    mutation.mutate()
  }

  if (!open) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
        <button className="btn" onClick={() => { setOk(false); setOpen(true) }}>
          {hasPassword ? t("settings.account.changePassword") : t("settings.account.setPassword")}
        </button>
        {ok && <span style={{ fontSize: 13, color: "var(--ok)" }}>{t("common.saved")}</span>}
        {!hasPassword && (
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
            {t("settings.account.setPasswordHint")}
          </span>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)", maxWidth: 320 }}>
      {hasPassword && (
        <input
          className="inp"
          type="password"
          placeholder={t("settings.account.currentPassword")}
          value={current}
          onChange={e => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
      )}
      <input
        className="inp"
        type="password"
        placeholder={t("settings.account.newPassword")}
        value={next}
        onChange={e => setNext(e.target.value)}
        autoComplete="new-password"
      />
      <input
        className="inp"
        type="password"
        placeholder={t("settings.account.confirmPassword")}
        value={confirm}
        onChange={e => setConfirm(e.target.value)}
        autoComplete="new-password"
      />
      {err && <p style={{ fontSize: 12, color: "var(--avoid)", margin: 0 }}>{err}</p>}
      <div style={{ display: "flex", gap: "var(--s2)" }}>
        <button
          className="btn btn-accent"
          onClick={handleSubmit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? t("common.saving") : t("common.confirm")}
        </button>
        <button className="btn btn-ghost" onClick={() => { setOpen(false); setErr("") }}>{t("common.cancel")}</button>
      </div>
    </div>
  )
}

function ConnectedAccountsPanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()

  const { data, status } = useQuery({
    queryKey: ["account", "connected"],
    queryFn: () => apiClient<{ accounts: ConnectedAccount[] }>("/api/app/account/connected"),
  })

  const disconnectMutation = useMutation({
    mutationFn: (provider: string) =>
      apiClient(`/api/app/account/connected/${provider}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", "connected"] })
    },
  })

  const accounts = data?.accounts ?? []
  const connectedProviders = new Set(accounts.map(a => a.provider))

  const PROVIDERS: { id: "google" | "github"; name: string; Icon: () => React.ReactElement }[] = [
    { id: "google", name: "Google", Icon: GoogleIcon },
    { id: "github", name: "GitHub", Icon: GitHubIcon },
  ]

  return (
    <div className="set-card">
      <div className="set-ch">
        <h2>{t("settings.account.connectedAccounts")}</h2>
        <p className="desc">{t("settings.account.connectedAccountsDesc")}</p>
      </div>
      <div className="set-body">
        {status === "pending" && <p style={{ color: "var(--text-faint)", fontSize: 14 }}>{t("common.loading")}</p>}
        {status !== "pending" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
            {PROVIDERS.map(({ id, name, Icon }) => {
              const acct = accounts.find(a => a.provider === id)
              const isConnected = connectedProviders.has(id)
              return (
                <div
                  key={id}
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--s3)",
                    padding: "var(--s3) var(--s4)",
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--r-card)",
                  }}
                >
                  <Icon />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                    {isConnected && acct ? (
                      <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>
                        {t("settings.account.connectedSince", {
                          date: new Date(acct.connectedAt).toLocaleDateString(),
                        })}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 1 }}>
                        {t("settings.account.notConnected")}
                      </div>
                    )}
                  </div>
                  {isConnected ? (
                    <button
                      className="btn btn-sm"
                      style={{ borderColor: "var(--avoid)", color: "var(--avoid)" }}
                      onClick={() => disconnectMutation.mutate(id)}
                      disabled={disconnectMutation.isPending}
                    >
                      {t("common.disconnect")}
                    </button>
                  ) : (
                    <button className="btn btn-sm" disabled title={t("settings.account.connectComingSoon")}>
                      {t("common.connect")}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        {disconnectMutation.isError && (
          <p style={{ fontSize: 12, color: "var(--avoid)", marginTop: "var(--s3)" }}>
            {(disconnectMutation.error as Error)?.message || t("common.saveFailed")}
          </p>
        )}
      </div>
    </div>
  )
}

type InviteCode = {
  id: string
  code: string
  usedByUserId: string | null
  createdAt: string
  usedAt: string | null
}

function InviteCodesPanel() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const { data, status } = useQuery({
    queryKey: ["account", "invites"],
    queryFn: () => apiClient<{ invites: InviteCode[]; limit: number | null; remaining: number | null; isAdmin: boolean }>("/api/app/account/invites"),
  })

  const createMutation = useMutation({
    mutationFn: () => apiClient<{ invite: InviteCode }>("/api/app/account/invites", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["account", "invites"] }),
  })

  function copyCode(invite: InviteCode) {
    navigator.clipboard.writeText(invite.code).then(() => {
      setCopiedId(invite.id)
      setTimeout(() => setCopiedId(null), 2000)
    }).catch(() => {})
  }

  const invites = data?.invites ?? []
  const remaining = data?.remaining ?? null
  const isAdmin = data?.isAdmin ?? false
  const atLimit = remaining !== null && remaining <= 0

  return (
    <div className="set-card">
      <div className="set-ch">
        <h2>{t("settings.invites.title")}</h2>
        <p className="desc">{t("settings.invites.desc")}</p>
      </div>
      <div className="set-body">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s4)" }}>
          <div>
            <p style={{ fontSize: 13, color: "var(--text-faint)", margin: 0 }}>
              {t("settings.invites.shareHint")}
            </p>
            {status === "success" && (
              <p style={{ fontSize: 12, color: atLimit ? "var(--avoid)" : "var(--text-faint)", margin: "4px 0 0" }}>
                {isAdmin
                  ? t("settings.invites.adminUnlimited")
                  : atLimit
                    ? t("settings.invites.limitReached", { limit: data?.limit })
                    : t("settings.invites.remaining", { count: remaining })}
              </p>
            )}
          </div>
          <button
            className="btn btn-accent btn-sm"
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || atLimit}
            title={atLimit ? t("settings.invites.limitReached", { limit: data?.limit }) : undefined}
            style={{ flexShrink: 0, marginLeft: "var(--s4)" }}
          >
            {createMutation.isPending ? t("settings.invites.generating") : t("settings.invites.generate")}
          </button>
        </div>

        {status === "pending" && <p style={{ color: "var(--text-faint)", fontSize: 13 }}>{t("common.loading")}</p>}

        {status === "success" && invites.length === 0 && (
          <p style={{ color: "var(--text-faint)", fontSize: 13, textAlign: "center", padding: "var(--s5) 0" }}>
            {t("settings.invites.empty")}
          </p>
        )}

        {status === "success" && invites.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
            {invites.map(inv => (
              <div
                key={inv.id}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--s3)",
                  padding: "var(--s3) var(--s4)",
                  background: "var(--surface)",
                  border: `1px solid ${inv.usedAt ? "var(--border)" : "var(--border-strong)"}`,
                  borderRadius: "var(--r-card)",
                  opacity: inv.usedAt ? 0.6 : 1,
                }}
              >
                <span style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 16, fontWeight: 700, letterSpacing: "0.1em",
                  flex: 1, color: inv.usedAt ? "var(--text-faint)" : "var(--text)",
                }}>
                  {inv.code}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "2px 8px",
                  borderRadius: "var(--r-pill)",
                  background: inv.usedAt ? "var(--surface-2)" : "color-mix(in srgb, var(--ok, #27AE60) 12%, transparent)",
                  border: `1px solid ${inv.usedAt ? "var(--border)" : "color-mix(in srgb, var(--ok, #27AE60) 40%, transparent)"}`,
                  color: inv.usedAt ? "var(--text-faint)" : "var(--ok, #1B5E20)",
                }}>
                  {inv.usedAt
                    ? t("settings.invites.usedOn", { date: new Date(inv.usedAt).toLocaleDateString() })
                    : t("settings.invites.unused")}
                </span>
                {!inv.usedAt && (
                  <button
                    className="btn btn-sm"
                    onClick={() => copyCode(inv)}
                    style={{ minWidth: 60 }}
                  >
                    {copiedId === inv.id ? t("settings.invites.copied") : t("settings.invites.copy")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AppearancePanel() {
  const { t, i18n } = useTranslation()

  const LANGUAGES = [
    { code: "zh-TW", label: "繁體中文" },
    { code: "en",    label: "English" },
    { code: "ja",    label: "日本語" },
  ]

  function switchLang(code: string) {
    i18n.changeLanguage(code)
  }

  return (
    <div className="set-card">
      <div className="set-ch">
        <h2>{t("settings.appearance.title")}</h2>
        <p className="desc">{t("settings.appearance.desc")}</p>
      </div>
      <div className="set-body">
        <div className="set-row set-row-compact">
          <div className="set-lab">
            {t("settings.appearance.language")}
            <span className="set-sub">{t("settings.appearance.languageDesc")}</span>
          </div>
          <div className="set-ctl">
            <div style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap" }}>
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  className={"btn btn-sm" + (i18n.language === lang.code ? " btn-accent" : "")}
                  onClick={() => switchLang(lang.code)}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="set-row">
          <div className="set-lab" />
          <div className="set-ctl">
            <p style={{ fontSize: 12, color: "var(--text-faint)", margin: 0 }}>
              {t("settings.appearance.themeSoon")}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="sw">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="track" />
    </label>
  )
}

function SetSeg<T extends string>({
  value, onChange, options, statusColors,
}: {
  value: T
  onChange: (v: T) => void
  options: { v: T; label: string }[]
  statusColors?: boolean
}) {
  return (
    <div className={"set-seg" + (statusColors ? " status" : "")}>
      {options.map(opt => (
        <button
          key={opt.v}
          type="button"
          className={"" +
            (value === opt.v ? "on" : "") +
            (statusColors && value === opt.v ? ` status-${opt.v}` : "")
          }
          onClick={() => onChange(opt.v)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function CommissionPanel() {
  const [status, setStatus] = useState<"open" | "waitlist" | "paused">("open")
  const [tagline, setTagline] = useState("7 月檔期額滿，8 月開放候補")
  const [cap, setCap] = useState<"2" | "3" | "5" | "0">("3")
  const [usage, setUsage] = useState<"personal" | "commercial">("personal")
  const [autoReply, setAutoReply] = useState("謝謝你的來信！我會在 3 個工作天內回覆。在這之前，麻煩先確認角色頁的「必畫／避免」重點，以及授權範圍，謝謝。")

  type Perm = { key: string; label: string; en: string; allow: boolean; checked: boolean }
  const [perms, setPerms] = useState<Perm[]>([
    { key: "repost", label: "標註出處後可轉載", en: "Repost w/ credit", allow: true, checked: true },
    { key: "edit",   label: "允許個人二改",     en: "Personal edits",  allow: true, checked: true },
    { key: "ai",     label: "用於 AI 訓練",      en: "AI training",     allow: false, checked: false },
    { key: "comm",   label: "商業 / 營利用途",   en: "Commercial",      allow: false, checked: false },
  ])

  function togglePerm(key: string) {
    setPerms(ps => ps.map(p => p.key === key ? { ...p, checked: !p.checked, allow: !p.checked } : p))
  }

  return (
    <>
      <div className="set-card">
        <div className="set-ch">
          <h2>接案狀態</h2>
          <p className="desc">顯示在你的公開檔案與每個角色的委託名片上。</p>
        </div>
        <div className="set-body">
          <div className="set-row set-row-compact">
            <div className="set-lab">目前狀態</div>
            <div className="set-ctl">
              <SetSeg
                value={status}
                onChange={setStatus}
                statusColors
                options={[
                  { v: "open",     label: "接案中" },
                  { v: "waitlist", label: "候補中" },
                  { v: "paused",   label: "暫停接案" },
                ]}
              />
            </div>
          </div>
          <div className="set-row set-row-compact">
            <div className="set-lab">
              狀態短語
              <span className="set-sub">附在狀態旁的一句話。</span>
            </div>
            <div className="set-ctl">
              <input
                className="inp"
                value={tagline}
                maxLength={40}
                onChange={e => setTagline(e.target.value)}
              />
            </div>
          </div>
          <div className="set-row set-row-compact">
            <div className="set-lab">
              同時進行上限
              <span className="set-sub">超過時新洽談自動進候補。</span>
            </div>
            <div className="set-ctl">
              <SetSeg
                value={cap}
                onChange={setCap}
                options={[
                  { v: "2", label: "2 件" },
                  { v: "3", label: "3 件" },
                  { v: "5", label: "5 件" },
                  { v: "0", label: "不限" },
                ]}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="set-card">
        <div className="set-ch">
          <h2>新委託預設</h2>
          <p className="desc">建立新委託名片時自動帶入這些預設，仍可逐筆調整。</p>
        </div>
        <div className="set-body">
          <div className="set-row set-row-compact">
            <div className="set-lab">預設用途</div>
            <div className="set-ctl">
              <SetSeg
                value={usage}
                onChange={setUsage}
                options={[
                  { v: "personal",   label: "個人用途" },
                  { v: "commercial", label: "商業用途" },
                ]}
              />
            </div>
          </div>
          <div className="set-row">
            <div className="set-lab">
              預設授權
              <span className="set-sub">繪師打開委託即看到的授權重點。</span>
            </div>
            <div className="set-ctl">
              <div className="set-perms">
                {perms.map(p => (
                  <div key={p.key} className={"set-perm " + (p.allow ? "allow" : "deny")}>
                    <span className="px">{p.allow ? "✓" : "✕"}</span>
                    <span className="pt">
                      {p.label}
                      <span className="en">{p.en}</span>
                    </span>
                    <Toggle checked={p.checked} onChange={() => togglePerm(p.key)} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="set-row">
            <div className="set-lab">
              自動回覆範本
              <span className="set-sub">收到新委託洽談時自動回覆。</span>
            </div>
            <div className="set-ctl">
              <textarea
                className="inp"
                rows={4}
                placeholder="收到委託訊息時的自動回覆…"
                value={autoReply}
                onChange={e => setAutoReply(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function PrivacyPanel() {
  const [defPriv, setDefPriv] = useState<"public" | "unlisted" | "password" | "private">("unlisted")
  const [watermark, setWatermark] = useState(true)
  const [seo, setSeo] = useState(false)
  const [branding, setBranding] = useState(true)

  return (
    <div className="set-card">
      <div className="set-ch">
        <h2>隱私與分享</h2>
        <p className="desc">控制新角色的預設可見範圍，以及公開頁面的呈現。</p>
      </div>
      <div className="set-body">
        <div className="set-row set-row-compact">
          <div className="set-lab">新角色預設隱私</div>
          <div className="set-ctl">
            <SetSeg
              value={defPriv}
              onChange={setDefPriv}
              options={[
                { v: "public",   label: "公開" },
                { v: "unlisted", label: "限連結" },
                { v: "password", label: "密碼" },
                { v: "private",  label: "草稿" },
              ]}
            />
          </div>
        </div>
        <div className="set-row set-row-compact">
          <div className="set-lab">
            圖片浮水印
            <span className="set-sub">在公開角色圖右下角加上代號。</span>
          </div>
          <div className="set-ctl">
            <Toggle checked={watermark} onChange={setWatermark} />
          </div>
        </div>
        <div className="set-row set-row-compact">
          <div className="set-lab">
            允許搜尋引擎索引
            <span className="set-sub">關閉後，公開頁不會出現在 Google。</span>
          </div>
          <div className="set-ctl">
            <Toggle checked={seo} onChange={setSeo} />
          </div>
        </div>
        <div className="set-row set-row-compact">
          <div className="set-lab">
            顯示「Made with CharacterHub」
            <span className="set-sub">公開頁頁尾的小標。</span>
          </div>
          <div className="set-ctl">
            <Toggle checked={branding} onChange={setBranding} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Notifications panel ───────────────────────────────────────────────────────

const NOTIF_ROWS = [
  { t: "新委託訊息",       s: "有人寄來委託洽談或回覆",  email: true,  discord: true  },
  { t: "委託狀態變更",     s: "委託進入下一階段時",      email: true,  discord: false },
  { t: "截止日提醒",       s: "委託到期前 3 天",         email: true,  discord: true  },
  { t: "有人收藏你的角色", s: "公開角色被加入收藏",       email: false, discord: false },
  { t: "產品更新",         s: "新功能與公告",            email: false, discord: false },
]

function NotificationsPanel() {
  const [rows, setRows] = useState(() =>
    NOTIF_ROWS.map(r => ({ ...r }))
  )

  function toggle(idx: number, col: "email" | "discord") {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [col]: !r[col] } : r))
  }

  return (
    <div className="set-card">
      <div className="card-h">
        <h2>通知</h2>
        <p className="desc">選擇要在哪裡收到提醒。重要的委託訊息建議至少開一個。</p>
      </div>
      <div className="notif">
        <div className="nrow">
          <span className="nhead l">類型</span>
          <span className="nhead">Email</span>
          <span className="nhead">Discord</span>
        </div>
        {rows.map((row, i) => (
          <div key={i} className="nrow">
            <span className="nlabel">
              {row.t}
              <span className="sub">{row.s}</span>
            </span>
            <span className="cell">
              <Toggle checked={row.email} onChange={() => toggle(i, "email")} />
            </span>
            <span className="cell">
              <Toggle checked={row.discord} onChange={() => toggle(i, "discord")} />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProjectDefaultsPanel() {
  const { data } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<{ projects: { id: string; name: string }[] }>("/api/app/projects"),
  })
  const projects = data?.projects ?? []

  const [defProj, setDefProj] = useState("")
  const [defVis, setDefVis] = useState<"public" | "unlisted" | "private">("unlisted")
  const [defView, setDefView] = useState<"general" | "art" | "writer">("general")
  const [coCreate, setCoCreate] = useState(true)

  return (
    <div className="set-card">
      <div className="set-ch">
        <h2>企劃預設</h2>
        <p className="desc">新建角色、條目與分享時套用的預設值。</p>
      </div>
      <div className="set-body">
        <div className="set-row set-row-compact">
          <div className="set-lab">
            預設企劃
            <span className="sub">開啟工作台時預設進入的企劃。</span>
          </div>
          <div className="set-ctl">
            <select
              className="inp"
              value={defProj}
              onChange={e => setDefProj(e.target.value)}
            >
              <option value="">（不指定）</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="set-row set-row-compact">
          <div className="set-lab">
            新角色預設可見
            <span className="sub">建立角色時的初始隱私。</span>
          </div>
          <div className="set-ctl">
            <SetSeg
              value={defVis}
              onChange={v => setDefVis(v as "public" | "unlisted" | "private")}
              options={[
                { v: "public",   label: "公開" },
                { v: "unlisted", label: "限連結" },
                { v: "private",  label: "私密" },
              ]}
            />
          </div>
        </div>
        <div className="set-row set-row-compact">
          <div className="set-lab">
            預設分享視角
            <span className="sub">複製分享連結時預選的視角。</span>
          </div>
          <div className="set-ctl">
            <SetSeg
              value={defView}
              onChange={v => setDefView(v as "general" | "art" | "writer")}
              options={[
                { v: "general", label: "一般" },
                { v: "art",     label: "圖設定" },
                { v: "writer",  label: "文設定" },
              ]}
            />
          </div>
        </div>
        <div className="set-row set-row-compact">
          <div className="set-lab">
            共創模式
            <span className="sub">開啟後側邊欄顯示企劃管理（模板/名冊/審核/參與者）。</span>
          </div>
          <div className="set-ctl">
            <Toggle checked={coCreate} onChange={setCoCreate} />
          </div>
        </div>
      </div>
    </div>
  )
}


export function AccountSettingsPage() {
  const { viewer } = useAuth()
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [sec, setSec] = useState<Section>("profile")

  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [dirty, setDirty] = useState(false)

  const { data: profile } = useQuery({
    queryKey: ["account", "profile"],
    queryFn: () => apiClient<AccountProfile>("/api/app/account"),
    enabled: !!viewer,
  })

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName)
      setBio(profile.bio ?? "")
      setDirty(false)
    }
  }, [profile])

  const mutation = useMutation({
    mutationFn: () =>
      apiClient<AccountProfile>("/api/app/account", {
        method: "PATCH",
        body: { display_name: displayName.trim() || undefined, bio: bio.trim() || undefined },
      }),
    onSuccess: (data) => {
      qc.setQueryData(["account", "profile"], data)
      setDirty(false)
    },
  })

  function discard() {
    if (profile) {
      setDisplayName(profile.displayName)
      setBio(profile.bio ?? "")
      setDirty(false)
    }
  }

  return (
    <div className="page narrow">
      <ContextHeader scope="account" crumbs={[t("settings.title")]} />
      <PageHeader title={t("settings.title")} eyebrow={t("settings.eyebrow")} />

      <div className="acc-set">
        <nav className="acc-secnav">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={sec === s.id ? "on" : ""}
              onClick={() => setSec(s.id)}
            >
              <NavIcon d={s.icon} />
              {t(s.labelKey)}
            </button>
          ))}
          <div className="div" />
          <button
            className={sec === "account" ? "on" : ""}
            onClick={() => setSec("account")}
          >
            <NavIcon d={ACCOUNT_SECTION.icon} />
            {t(ACCOUNT_SECTION.labelKey)}
          </button>
        </nav>

        <div className="acc-panels">

          {/* ── PROFILE ── */}
          <div className={"acc-panel" + (sec === "profile" ? " on" : "")}>
            <div className="set-card">
              <div className="set-ch">
                <h2>{t("settings.profile.title")}</h2>
                <p className="desc">{t("settings.profile.desc")}</p>
              </div>
              <div className="set-body">
                <div className="set-row set-row-compact">
                  <div className="set-lab">{t("settings.profile.avatar")}</div>
                  <div className="set-ctl" style={{ display: "flex", alignItems: "center", gap: "var(--s4)" }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: "var(--accent)", color: "#fff",
                      display: "grid", placeItems: "center",
                      fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 800,
                    }}>
                      {(displayName || viewer?.displayName || "?").slice(0, 1)}
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text-faint)" }}>{t("settings.profile.avatarComingSoon")}</span>
                  </div>
                </div>

                <div className="set-row set-row-compact">
                  <div className="set-lab">{t("settings.profile.displayName")}</div>
                  <div className="set-ctl">
                    <input
                      className="inp"
                      value={displayName}
                      maxLength={40}
                      placeholder={t("settings.profile.displayNamePlaceholder")}
                      onChange={e => { setDisplayName(e.target.value); setDirty(true) }}
                    />
                  </div>
                </div>

                <div className="set-row set-row-compact">
                  <div className="set-lab">
                    {t("settings.profile.handle")}
                    <span className="set-sub">{t("settings.profile.handleDesc")}</span>
                  </div>
                  <div className="set-ctl">
                    <div className="set-slugwrap">
                      <span className="set-pfx">{t("settings.profile.handlePrefix")}</span>
                      <input
                        className="inp"
                        value={profile?.handle ?? ""}
                        readOnly
                        style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}
                      />
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>{t("settings.profile.handleChangeSoon")}</p>
                  </div>
                </div>

                <div className="set-row">
                  <div className="set-lab">
                    {t("settings.profile.bio")}
                    <span className="set-sub">{t("settings.profile.bioDesc")}</span>
                  </div>
                  <div className="set-ctl">
                    <textarea
                      className="inp"
                      rows={3}
                      maxLength={160}
                      placeholder={t("settings.profile.bioPlaceholder")}
                      value={bio}
                      onChange={e => { setBio(e.target.value); setDirty(true) }}
                      style={{ resize: "vertical" }}
                    />
                    <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4, textAlign: "right" }}>
                      {bio.length} / 160 {t("settings.profile.chars")}
                    </p>
                  </div>
                </div>

                <div className="set-row">
                  <div className="set-lab">
                    {t("settings.profile.externalLinks")}
                    <span className="set-sub">{t("settings.profile.externalLinksDesc")}</span>
                  </div>
                  <div className="set-ctl">
                    <div className="ext-links">
                      <div className="ext-link-item">
                        <span className="ext-pfx">X / Twitter</span>
                        <input className="inp" placeholder="@username" disabled style={{ background: "var(--surface-2)", color: "var(--text-faint)" }} />
                      </div>
                      <div className="ext-link-item">
                        <span className="ext-pfx">Pixiv</span>
                        <input className="inp" placeholder="users/00000" disabled style={{ background: "var(--surface-2)", color: "var(--text-faint)" }} />
                      </div>
                      <div className="ext-link-item">
                        <span className="ext-pfx">Discord</span>
                        <input className="inp" placeholder="username" disabled style={{ background: "var(--surface-2)", color: "var(--text-faint)" }} />
                      </div>
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>{t("settings.profile.externalLinksSoon")}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── COMMISSION ── */}
          <div className={"acc-panel" + (sec === "commission" ? " on" : "")}>
            <CommissionPanel />
          </div>

          {/* ── PRIVACY ── */}
          <div className={"acc-panel" + (sec === "privacy" ? " on" : "")}>
            <PrivacyPanel />
          </div>

          {/* ── NOTIFICATIONS ── */}
          <div className={"acc-panel" + (sec === "notif" ? " on" : "")}>
            <NotificationsPanel />
          </div>

          {/* ── APPEARANCE ── */}
          <div className={"acc-panel" + (sec === "appearance" ? " on" : "")}>
            <AppearancePanel />
          </div>

          {/* ── DATA ── */}
          <div className={"acc-panel" + (sec === "data" ? " on" : "")}>
            <StoragePanel />
          </div>

          {/* ── PROJECT DEFAULTS ── */}
          <div className={"acc-panel" + (sec === "projdef" ? " on" : "")}>
            <ProjectDefaultsPanel />
          </div>

          {/* ── INVITES ── */}
          <div className={"acc-panel" + (sec === "invites" ? " on" : "")}>
            <InviteCodesPanel />
          </div>

          {/* ── ACCOUNT ── */}
          <div className={"acc-panel" + (sec === "account" ? " on" : "")}>
            <div className="set-card">
              <div className="set-ch">
                <h2>{t("settings.account.title")}</h2>
                <p className="desc">{t("settings.account.desc")}</p>
              </div>
              <div className="set-body">
                <div className="set-row set-row-compact">
                  <div className="set-lab">{t("settings.account.email")}</div>
                  <div className="set-ctl">
                    <input
                      className="inp"
                      value={profile?.email ?? viewer?.email ?? ""}
                      readOnly
                      style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}
                    />
                  </div>
                </div>
                <div className="set-row">
                  <div className="set-lab">{t("settings.account.password")}</div>
                  <div className="set-ctl">
                    <PasswordForm hasPassword={profile?.hasPassword ?? false} />
                  </div>
                </div>
              </div>
            </div>

            <ConnectedAccountsPanel />

            <div className="set-card acc-danger">
              <div className="set-ch">
                <h2>{t("settings.account.dangerZone")}</h2>
                <p className="desc">{t("settings.account.dangerZoneDesc")}</p>
              </div>
              <div className="set-body">
                <div className="acc-drow">
                  <div className="dt">
                    {t("settings.account.deleteAccount")}
                    <span className="sub">{t("settings.account.deleteAccountDesc")}</span>
                  </div>
                  <div className="da">
                    <button className="btn" disabled style={{ opacity: 0.5 }}>{t("settings.account.deleteAccountBtn")}</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {sec === "profile" && (
        <div className={"savebar" + (dirty ? " show" : "")}>
          <span className="msg">
            {mutation.isPending ? t("common.saving") : mutation.isError ? t("common.saveFailed") : t("common.unsavedChanges")}
          </span>
          <button className="btn btn-ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,.3)" }} onClick={discard}>
            {t("common.discard")}
          </button>
          <button
            className="btn"
            style={{ background: "#fff", color: "var(--text)" }}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {t("common.save")}
          </button>
        </div>
      )}
    </div>
  )
}
