import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import { apiClient, clearCsrfToken } from "@/lib/api/client"
import { useAuth } from "@/lib/auth/context"
import type { Viewer } from "@oc-tools/contracts"
import styles from "./LoginPage.module.css"

type LoginForm = {
  email: string
  password: string
}

type RegisterForm = {
  email: string
  handle: string
  displayName: string
  password: string
}

export function LoginPage() {
  const [searchParams] = useSearchParams()
  const { } = useAuth()
  const [mode, setMode] = useState<"login" | "register">("login")

  const loginForm = useForm<LoginForm>()
  const registerForm = useForm<RegisterForm>()

  async function onLogin(data: LoginForm) {
    try {
      clearCsrfToken()
      await apiClient<{ data: Viewer }>("/api/v1/auth/login", {
        method: "POST",
        body: data,
      })
      window.location.href = searchParams.get("redirect") ?? "/workspace"
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
        },
      })
      window.location.href = searchParams.get("redirect") ?? "/workspace"
    } catch (err) {
      const msg = err instanceof Error ? err.message : "註冊失敗，請再試一次"
      registerForm.setError("root", { message: msg.includes("CONFLICT") ? "這個 Email 或帳號名稱已被使用" : msg })
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>CharacterHub</h1>
        <p className={styles.subtitle}>{mode === "login" ? "登入你的帳號" : "建立新帳號"}</p>

        <a
          href="/api/v1/auth/google"
          className={styles.oauthBtn}
        >
          <svg width="18" height="18" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M43.6 20.5h-1.6V20H24v8h11.3C33.9 32.2 29.4 35 24 35c-6.1 0-11-4.9-11-11s4.9-11 11-11c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.3 29 5 24 5 13 5 4 14 4 24s9 19 20 19c11 0 20-9 20-20 0-1.2-.1-2.4-.4-2.5z" fill="#FFC107"/>
            <path d="M6.3 14.7l6.6 4.8C14.5 16.1 19 13 24 13c2.8 0 5.3 1 7.2 2.7l5.7-5.7C33.5 7.3 29 5 24 5 16.3 5 9.7 9.2 6.3 14.7z" fill="#FF3D00"/>
            <path d="M24 43c4.9 0 9.4-1.9 12.8-4.9l-5.9-5c-1.9 1.4-4.2 2.2-6.9 2.2-5.3 0-9.8-3.6-11.4-8.4l-6.5 5C9.5 38.6 16.2 43 24 43z" fill="#4CAF50"/>
            <path d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.4l5.9 5C40.1 36.1 44 30.6 44 24c0-1.2-.1-2.4-.4-2.5z" fill="#1976D2"/>
          </svg>
          使用 Google 登入
        </a>

        <div className={styles.divider}><span>或</span></div>

        {mode === "login" ? (
          <form onSubmit={loginForm.handleSubmit(onLogin)} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                className={styles.input}
                {...loginForm.register("email", { required: "請輸入 Email" })}
              />
              {loginForm.formState.errors.email && (
                <span className={styles.error}>{loginForm.formState.errors.email.message}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="password">密碼</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                className={styles.input}
                {...loginForm.register("password", { required: "請輸入密碼" })}
              />
              {loginForm.formState.errors.password && (
                <span className={styles.error}>{loginForm.formState.errors.password.message}</span>
              )}
            </div>

            {loginForm.formState.errors.root && (
              <div className={styles.formError}>{loginForm.formState.errors.root.message}</div>
            )}

            <button type="submit" disabled={loginForm.formState.isSubmitting} className={styles.submitBtn}>
              {loginForm.formState.isSubmitting ? "登入中⋯" : "登入"}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
              還沒有帳號？{" "}
              <button type="button" onClick={() => setMode("register")}
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, padding: 0 }}>
                建立帳號
              </button>
            </p>
          </form>
        ) : (
          <form onSubmit={registerForm.handleSubmit(onRegister)} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="reg-email">Email</label>
              <input
                id="reg-email"
                type="email"
                autoComplete="email"
                className={styles.input}
                {...registerForm.register("email", { required: "請輸入 Email" })}
              />
              {registerForm.formState.errors.email && (
                <span className={styles.error}>{registerForm.formState.errors.email.message}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="reg-handle">帳號名稱 <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(英文小寫、數字、-)</span></label>
              <input
                id="reg-handle"
                type="text"
                autoComplete="username"
                className={styles.input}
                placeholder="wen-demo"
                {...registerForm.register("handle", {
                  required: "請輸入帳號名稱",
                  pattern: { value: /^[a-z0-9-]{2,32}$/, message: "只能用英文小寫、數字、連字號，2-32 字元" },
                })}
              />
              {registerForm.formState.errors.handle && (
                <span className={styles.error}>{registerForm.formState.errors.handle.message}</span>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="reg-dn">顯示名稱 <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(選填)</span></label>
              <input
                id="reg-dn"
                type="text"
                className={styles.input}
                {...registerForm.register("displayName")}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="reg-password">密碼 <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>(最少 8 字元)</span></label>
              <input
                id="reg-password"
                type="password"
                autoComplete="new-password"
                className={styles.input}
                {...registerForm.register("password", {
                  required: "請輸入密碼",
                  minLength: { value: 8, message: "密碼至少 8 個字元" },
                })}
              />
              {registerForm.formState.errors.password && (
                <span className={styles.error}>{registerForm.formState.errors.password.message}</span>
              )}
            </div>

            {registerForm.formState.errors.root && (
              <div className={styles.formError}>{registerForm.formState.errors.root.message}</div>
            )}

            <button type="submit" disabled={registerForm.formState.isSubmitting} className={styles.submitBtn}>
              {registerForm.formState.isSubmitting ? "建立中⋯" : "建立帳號"}
            </button>

            <p style={{ textAlign: "center", fontSize: 13, color: "var(--text-dim)", margin: 0 }}>
              已有帳號？{" "}
              <button type="button" onClick={() => setMode("login")}
                style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, padding: 0 }}>
                登入
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}
