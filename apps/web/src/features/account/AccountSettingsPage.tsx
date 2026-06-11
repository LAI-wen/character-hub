import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
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

type Section = "profile" | "commission" | "privacy" | "notif" | "appearance" | "data" | "projdef" | "account"

const SECTIONS: { id: Section; label: string; icon: string }[] = [
  { id: "profile",    label: "個人檔案",  icon: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>' },
  { id: "commission", label: "委託設定",  icon: '<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h5"/>' },
  { id: "privacy",    label: "隱私與分享", icon: '<path d="M12 3l7 3v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z"/>' },
  { id: "notif",      label: "通知",      icon: '<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/>' },
  { id: "appearance", label: "外觀",      icon: '<circle cx="12" cy="12" r="9"/><circle cx="9" cy="9" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="9" r="1" fill="currentColor" stroke="none"/>' },
  { id: "data",       label: "資料",      icon: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>' },
  { id: "projdef",    label: "企劃預設",  icon: '<path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/>' },
]

const ACCOUNT_SECTION = { id: "account" as Section, label: "帳號", icon: '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.3-2.5H9.4l-.3 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.3 2.5h4.9l.3-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1z"/>' }

function NavIcon({ d }: { d: string }) {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" dangerouslySetInnerHTML={{ __html: d }} />
  )
}

function ComingSoon({ label }: { label: string }) {
  return <div className="acc-coming">{label} — 功能開發中，敬請期待。</div>
}

function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
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
    onError: (e: Error) => setErr(e.message || "儲存失敗，請再試一次"),
  })

  function handleSubmit() {
    setErr("")
    if (next.length < 8) { setErr("密碼至少 8 個字元"); return }
    if (next !== confirm) { setErr("兩次密碼不相符"); return }
    mutation.mutate()
  }

  if (!open) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
        <button className="btn" onClick={() => { setOk(false); setOpen(true) }}>
          {hasPassword ? "變更密碼" : "設定密碼"}
        </button>
        {ok && <span style={{ fontSize: 13, color: "var(--ok)" }}>✓ 已更新</span>}
        {!hasPassword && (
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>
            設定後可用電子信箱 + 密碼登入
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
          placeholder="目前的密碼"
          value={current}
          onChange={e => setCurrent(e.target.value)}
          autoComplete="current-password"
        />
      )}
      <input
        className="inp"
        type="password"
        placeholder="新密碼（至少 8 個字元）"
        value={next}
        onChange={e => setNext(e.target.value)}
        autoComplete="new-password"
      />
      <input
        className="inp"
        type="password"
        placeholder="確認新密碼"
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
          {mutation.isPending ? "儲存中…" : "確認"}
        </button>
        <button className="btn btn-ghost" onClick={() => { setOpen(false); setErr("") }}>取消</button>
      </div>
    </div>
  )
}

export function AccountSettingsPage() {
  const { viewer } = useAuth()
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
      <ContextHeader scope="account" crumbs={["帳號設定"]} />
      <PageHeader title="帳號設定" eyebrow="Settings" />

      <div className="acc-set">
        <nav className="acc-secnav">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              className={sec === s.id ? "on" : ""}
              onClick={() => setSec(s.id)}
            >
              <NavIcon d={s.icon} />
              {s.label}
            </button>
          ))}
          <div className="div" />
          <button
            className={sec === "account" ? "on" : ""}
            onClick={() => setSec("account")}
          >
            <NavIcon d={ACCOUNT_SECTION.icon} />
            {ACCOUNT_SECTION.label}
          </button>
        </nav>

        <div className="acc-panels">

          {/* ── PROFILE ── */}
          <div className={"acc-panel" + (sec === "profile" ? " on" : "")}>
            <div className="set-card">
              <div className="set-ch">
                <h2>個人檔案</h2>
                <p className="desc">這些資訊會顯示在你的公開角色頁與委託名片上。</p>
              </div>
              <div className="set-body">
                <div className="set-row set-row-compact">
                  <div className="set-lab">頭像</div>
                  <div className="set-ctl" style={{ display: "flex", alignItems: "center", gap: "var(--s4)" }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: "var(--accent)", color: "#fff",
                      display: "grid", placeItems: "center",
                      fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 800,
                    }}>
                      {(displayName || viewer?.displayName || "?").slice(0, 1)}
                    </div>
                    <span style={{ fontSize: 13, color: "var(--text-faint)" }}>頭像上傳即將推出</span>
                  </div>
                </div>

                <div className="set-row set-row-compact">
                  <div className="set-lab">顯示名稱</div>
                  <div className="set-ctl">
                    <input
                      className="inp"
                      value={displayName}
                      maxLength={40}
                      placeholder="你的顯示名稱"
                      onChange={e => { setDisplayName(e.target.value); setDirty(true) }}
                    />
                  </div>
                </div>

                <div className="set-row set-row-compact">
                  <div className="set-lab">
                    使用者代號
                    <span className="set-sub">公開頁面網址的一部分。</span>
                  </div>
                  <div className="set-ctl">
                    <div className="set-slugwrap">
                      <span className="set-pfx">characterhub.app/@</span>
                      <input
                        className="inp"
                        value={profile?.handle ?? ""}
                        readOnly
                        style={{ background: "var(--surface-2)", color: "var(--text-faint)" }}
                      />
                    </div>
                    <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>代號變更功能即將推出</p>
                  </div>
                </div>

                <div className="set-row">
                  <div className="set-lab">
                    自我介紹
                    <span className="set-sub">最多 160 字，支援換行。</span>
                  </div>
                  <div className="set-ctl">
                    <textarea
                      className="inp"
                      rows={3}
                      maxLength={160}
                      placeholder="介紹你自己與你的角色…"
                      value={bio}
                      onChange={e => { setBio(e.target.value); setDirty(true) }}
                      style={{ resize: "vertical" }}
                    />
                    <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4, textAlign: "right" }}>
                      {bio.length} / 160
                    </p>
                  </div>
                </div>

                <div className="set-row">
                  <div className="set-lab">
                    外部連結
                    <span className="set-sub">顯示在公開檔案的社群圖示。</span>
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
                    <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>外部連結即將推出</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── COMMISSION ── */}
          <div className={"acc-panel" + (sec === "commission" ? " on" : "")}>
            <ComingSoon label="委託設定" />
          </div>

          {/* ── PRIVACY ── */}
          <div className={"acc-panel" + (sec === "privacy" ? " on" : "")}>
            <ComingSoon label="隱私與分享" />
          </div>

          {/* ── NOTIFICATIONS ── */}
          <div className={"acc-panel" + (sec === "notif" ? " on" : "")}>
            <ComingSoon label="通知" />
          </div>

          {/* ── APPEARANCE ── */}
          <div className={"acc-panel" + (sec === "appearance" ? " on" : "")}>
            <ComingSoon label="外觀" />
          </div>

          {/* ── DATA ── */}
          <div className={"acc-panel" + (sec === "data" ? " on" : "")}>
            <ComingSoon label="資料匯出與備份" />
          </div>

          {/* ── PROJECT DEFAULTS ── */}
          <div className={"acc-panel" + (sec === "projdef" ? " on" : "")}>
            <ComingSoon label="企劃預設" />
          </div>

          {/* ── ACCOUNT ── */}
          <div className={"acc-panel" + (sec === "account" ? " on" : "")}>
            <div className="set-card">
              <div className="set-ch">
                <h2>帳號</h2>
                <p className="desc">登入方式與基本帳號資訊。</p>
              </div>
              <div className="set-body">
                <div className="set-row set-row-compact">
                  <div className="set-lab">電子信箱</div>
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
                  <div className="set-lab">密碼</div>
                  <div className="set-ctl">
                    <PasswordForm hasPassword={profile?.hasPassword ?? false} />
                  </div>
                </div>
              </div>
            </div>

            <div className="set-card acc-danger">
              <div className="set-ch">
                <h2>危險區</h2>
                <p className="desc">這些動作無法復原，請謹慎操作。</p>
              </div>
              <div className="set-body">
                <div className="acc-drow">
                  <div className="dt">
                    刪除帳號
                    <span className="sub">永久刪除帳號與全部角色資料。</span>
                  </div>
                  <div className="da">
                    <button className="btn" disabled style={{ opacity: 0.5 }}>刪除帳號（即將推出）</button>
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
            {mutation.isPending ? "儲存中…" : mutation.isError ? "儲存失敗，請再試一次" : "你有未儲存的變更"}
          </span>
          <button className="btn btn-ghost" style={{ color: "#fff", borderColor: "rgba(255,255,255,.3)" }} onClick={discard}>
            捨棄
          </button>
          <button
            className="btn"
            style={{ background: "#fff", color: "var(--text)" }}
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            儲存
          </button>
        </div>
      )}
    </div>
  )
}
