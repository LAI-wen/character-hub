import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { apiClient, clearCsrfToken } from "@/lib/api/client"
import { AppApiError } from "@/lib/api/errors"
import { useAuth } from "@/lib/auth/context"
import type { Viewer } from "@oc-tools/contracts"
import styles from "./LoginPage.module.css"

type LoginForm = {
  email: string
  password: string
}

type RegisterForm = {
  inviteCode: string
  email: string
  handle: string
  displayName: string
  password: string
}

const ERROR_MESSAGES: Record<string, string> = {
  invite_required: "需要邀請碼才能建立帳號。請輸入邀請碼後再繼續。",
  invite_invalid: "邀請碼無效或已被使用，請確認後再試。",
}

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const { } = useAuth()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [inviteCode, setInviteCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showRegPassword, setShowRegPassword] = useState(false)

  const loginForm = useForm<LoginForm>()
  const registerForm = useForm<RegisterForm>()

  const oauthError = searchParams.get("error")

  function safeRedirect(): string {
    const r = searchParams.get("redirect") ?? ""
    return r.startsWith("/") && !r.startsWith("//") ? r : "/workspace"
  }

  async function onLogin(data: LoginForm) {
    try {
      clearCsrfToken()
      await apiClient<{ data: Viewer }>("/api/v1/auth/login", {
        method: "POST",
        body: data,
      })
      window.location.href = safeRedirect()
    } catch {
      loginForm.setError("root", { message: "Email 或密碼錯誤" })
    }
  }

  async function onRegister(data: RegisterForm) {
    try {
      clearCsrfToken()
      await apiClient<{ data: Viewer }>("/api/v1/auth/register", {
        method: "POST",
        body: {
          email: data.email,
          handle: data.handle,
          password: data.password,
          display_name: data.displayName || undefined,
          invite_code: data.inviteCode.trim().toUpperCase(),
        },
      })
      window.location.href = safeRedirect()
    } catch (err) {
      if (err instanceof AppApiError && err.code === "INVITE_INVALID") {
        registerForm.setError("inviteCode", { message: "邀請碼無效或已被使用" })
      } else if (err instanceof AppApiError && err.code === "CONFLICT") {
        registerForm.setError("root", { message: "這個 Email 或帳號名稱已被使用" })
      } else {
        registerForm.setError("root", { message: "註冊失敗，請再試一次" })
      }
    }
  }

  function buildOAuthUrl(provider: "google" | "github") {
    const base = provider === "google" ? "/api/v1/auth/google" : "/api/v1/auth/github"
    const code = inviteCode.trim()
    return code ? `${base}?invite=${encodeURIComponent(code.toUpperCase())}` : base
  }

  const isLogin = mode === "login"

  return (
    <div className={styles.auth}>
      {/* ===== LEFT — brand panel ===== */}
      <aside className={styles.aside}>
        <a className={styles.asideBrand} href="/">
          <span className={styles.mk}>霧</span>CharacterHub
        </a>

        <div className={styles.asideMid}>
          <div className={styles.eyebrow}>Commission Sheet Builder</div>
          <h1 className={styles.asideH1}>
            給每個角色，<br />一個被<span className={styles.ac}>委託</span>的家。
          </h1>
          <p className={styles.lead}>
            整理一次，到處委託。登入後，你的角色設定、色票、必畫重點與委託紀錄都在同一個地方。
          </p>

          {/* product mock card */}
          <div className={styles.mock}>
            <div className={styles.cardM}>
              <div className={styles.mTop}>
                <span className={styles.mDot} />
                <span className={styles.mDot} />
                <span className={styles.mDot} />
                <span className={styles.mTag}>委託模式 ⇄</span>
              </div>
              <div className={styles.mBody}>
                <div className={styles.mPh} />
                <div>
                  <div className={styles.mName}>宵霧</div>
                  <div className={styles.mRom}>YOIGIRI · 妖狐</div>
                  <div className={styles.mChips}>
                    <i className={styles.mChip} style={{ background: "#8FA3B0" }} />
                    <i className={styles.mChip} style={{ background: "#E0A23B" }} />
                    <i className={styles.mChip} style={{ background: "#C8463C" }} />
                    <i className={styles.mChip} style={{ background: "#D4A84B" }} />
                  </div>
                  <div className={styles.mCk}>
                    <span className={styles.mCkG}>✓</span>三尾狐尾
                  </div>
                  <div className={styles.mCk}>
                    <span className={styles.mCkG}>✓</span>左眼下淚痣
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.floatSw}>
              <i className={styles.floatSwI} />
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 10 }}>#E0A23B</div>
                <div className={styles.floatCp}>⧉ 已複製</div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.asideFoot}>
          <span><b>免費</b> · 無需信用卡</span>
          <span><b>社群優先</b> · 為 OC 圈打造</span>
        </div>
      </aside>

      {/* ===== RIGHT — form panel ===== */}
      <main className={styles.panel}>
        <div className={styles.panelTop}>
          <a className={styles.back} href="/">← 回首頁</a>
          <span className={styles.altText}>
            {isLogin ? (
              <>還沒有帳號？<button type="button" className={styles.altLink} onClick={() => setMode("register")}>免費註冊</button></>
            ) : (
              <>已經有帳號了？<button type="button" className={styles.altLink} onClick={() => setMode("login")}>登入</button></>
            )}
          </span>
        </div>

        <div className={styles.formwrap}>
          {/* mobile-only brand */}
          <a className={styles.brandSm} href="/">
            <span className={styles.mk}>霧</span>CharacterHub
          </a>

          <h2>
            {isLogin ? "歡迎回來" : "建立你的角色之家"}
          </h2>
          <p className={styles.formSub}>
            {isLogin
              ? "登入以管理你的角色與委託。"
              : "30 秒註冊，10 分鐘做出第一份委託設定頁。"}
          </p>

          {/* auth tabs */}
          <div className={styles.authtabs}>
            <button
              type="button"
              className={isLogin ? styles.tabOn : ""}
              onClick={() => setMode("login")}
            >
              登入 Sign in
            </button>
            <button
              type="button"
              className={!isLogin ? styles.tabOn : ""}
              onClick={() => setMode("register")}
            >
              註冊 Sign up
            </button>
          </div>

          {/* OAuth error from redirect */}
          {oauthError && ERROR_MESSAGES[oauthError] && (
            <div className={styles.formError}>
              {ERROR_MESSAGES[oauthError]}
            </div>
          )}

          {/* social buttons */}
          <div className={styles.social}>
            <a
              href={buildOAuthUrl("google")}
              className={styles.sbtn}
            >
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z" />
                <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
                <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
              </svg>
              使用 Google 繼續
            </a>

            <button type="button" className={styles.sbtn} disabled>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.9 1.7h3.5l-7.6 8.7 9 11.9h-7l-5.5-7.2-6.3 7.2H1.5l8.2-9.3L1 1.7h7.2l5 6.6 5.7-6.6Zm-1.2 18.4h1.9L6.4 3.6H4.3l13.4 16.5Z" />
              </svg>
              使用 X 繼續
            </button>

            <button type="button" className={styles.sbtn} disabled>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="#5865F2">
                <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.4a18.3 18.3 0 0 1 4.3 1.4 17 17 0 0 0-5.8-1c-2 0-3.9.3-5.8 1A18.3 18.3 0 0 1 12 3.4L11.8 3a19.8 19.8 0 0 0-4.9 1.4C3.6 9.4 2.7 14.2 3.2 19a20 20 0 0 0 6 3l.6-1a13 13 0 0 1-2-1c.2-.1.3-.2.5-.3a14.3 14.3 0 0 0 12.2 0l.5.3c-.6.4-1.3.7-2 1l.6 1a20 20 0 0 0 6-3c.6-5.6-.9-10.4-4-14.6ZM9.3 16c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm5.4 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
              </svg>
              使用 Discord 繼續
            </button>
          </div>

          <div className={styles.divider}>或用電子信箱</div>

          {/* ===== LOGIN FORM ===== */}
          {isLogin ? (
            <form onSubmit={loginForm.handleSubmit(onLogin)} noValidate>
              <div className={styles.field}>
                <label htmlFor="email">電子信箱 Email</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={styles.inp}
                  {...loginForm.register("email", { required: "請輸入 Email" })}
                />
                {loginForm.formState.errors.email && (
                  <span className={styles.fieldError}>{loginForm.formState.errors.email.message}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="password">密碼 Password</label>
                <div className={styles.pwdWrap}>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={styles.inp}
                    {...loginForm.register("password", { required: "請輸入密碼" })}
                  />
                  <button
                    type="button"
                    className={styles.eye}
                    title="顯示／隱藏密碼"
                    aria-label="顯示密碼"
                    onClick={() => setShowPassword(v => !v)}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {loginForm.formState.errors.password && (
                  <span className={styles.fieldError}>{loginForm.formState.errors.password.message}</span>
                )}
              </div>

              <div className={styles.rowBetween}>
                <label className={styles.remember}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.checkBox}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12.5l4.5 4.5L19 7" />
                    </svg>
                  </span>
                  記住我
                </label>
                <a className={styles.forgot} href="#">忘記密碼？</a>
              </div>

              {loginForm.formState.errors.root && (
                <div className={styles.formError}>{loginForm.formState.errors.root.message}</div>
              )}

              <button
                type="submit"
                disabled={loginForm.formState.isSubmitting}
                className={styles.submit}
              >
                {loginForm.formState.isSubmitting ? "登入中⋯" : "登入 →"}
              </button>

              <p className={styles.terms} style={{ marginTop: "var(--s6)" }}>
                CharacterHub · 純免費，社群優先
              </p>
            </form>
          ) : (
            /* ===== REGISTER FORM ===== */
            <form onSubmit={registerForm.handleSubmit(onRegister)} noValidate>
              {/* Invite code — required for registration */}
              <div className={styles.inviteField}>
                <label htmlFor="invite-code">
                  邀請碼 Invite Code
                  <span style={{ color: "var(--avoid)", marginLeft: 3 }}>*</span>
                </label>
                <input
                  id="invite-code"
                  type="text"
                  className={styles.inpMono}
                  placeholder="XXXX-XXXX"
                  value={inviteCode}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={e => {
                    const v = e.target.value.toUpperCase()
                    setInviteCode(v)
                    registerForm.setValue("inviteCode", v)
                  }}
                />
                <p className={styles.inviteHint}>由現有成員提供的邀請碼。沒有邀請碼請聯繫作者。</p>
                {registerForm.formState.errors.inviteCode && (
                  <span className={styles.fieldError}>{registerForm.formState.errors.inviteCode.message}</span>
                )}
              </div>

              {/* Hidden inviteCode field for react-hook-form validation */}
              <input
                type="hidden"
                value={inviteCode.trim().toUpperCase()}
                {...registerForm.register("inviteCode", { required: "請輸入邀請碼" })}
              />

              {/* Handle field */}
              <div className={`${styles.field} ${styles.handleField}`}>
                <label htmlFor="reg-handle">使用者代號 Handle</label>
                <div className={styles.hwrap}>
                  <span className={styles.pfx}>characterhub.app/@</span>
                  <input
                    id="reg-handle"
                    type="text"
                    className={styles.inpBorderless}
                    placeholder="yoi-studio"
                    autoComplete="username"
                    {...registerForm.register("handle", {
                      required: "請輸入帳號名稱",
                      pattern: { value: /^[a-z0-9-]{2,32}$/, message: "只能用英文小寫、數字、連字號，2-32 字元" },
                    })}
                  />
                </div>
                {registerForm.formState.errors.handle && (
                  <span className={styles.fieldError}>{registerForm.formState.errors.handle.message}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="reg-email">電子信箱 Email</label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  className={styles.inp}
                  {...registerForm.register("email", { required: "請輸入 Email" })}
                />
                {registerForm.formState.errors.email && (
                  <span className={styles.fieldError}>{registerForm.formState.errors.email.message}</span>
                )}
              </div>

              <div className={styles.field}>
                <label htmlFor="reg-dn">
                  顯示名稱 <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(選填)</span>
                </label>
                <input
                  id="reg-dn"
                  type="text"
                  className={styles.inp}
                  {...registerForm.register("displayName")}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="reg-password">
                  密碼 Password <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(最少 8 字元)</span>
                </label>
                <div className={styles.pwdWrap}>
                  <input
                    id="reg-password"
                    type={showRegPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className={styles.inp}
                    {...registerForm.register("password", {
                      required: "請輸入密碼",
                      minLength: { value: 8, message: "密碼至少 8 個字元" },
                    })}
                  />
                  <button
                    type="button"
                    className={styles.eye}
                    title="顯示／隱藏密碼"
                    aria-label="顯示密碼"
                    onClick={() => setShowRegPassword(v => !v)}
                  >
                    {showRegPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
                {registerForm.formState.errors.password && (
                  <span className={styles.fieldError}>{registerForm.formState.errors.password.message}</span>
                )}
              </div>

              {registerForm.formState.errors.root && (
                <div className={styles.formError}>{registerForm.formState.errors.root.message}</div>
              )}

              <button
                type="submit"
                disabled={registerForm.formState.isSubmitting || !inviteCode.trim()}
                className={styles.submit}
              >
                {registerForm.formState.isSubmitting ? "建立中⋯" : "免費建立帳號 →"}
              </button>

              <p className={styles.terms}>
                註冊即表示你同意我們的<a href="#">服務條款</a>與<a href="#">隱私政策</a>。
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  )
}
