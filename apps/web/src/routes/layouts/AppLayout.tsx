import { useState, useEffect, useRef } from "react"
import { Outlet, NavLink, Link, useNavigate, useMatch, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/lib/auth/context"
import { apiClient } from "@/lib/api/client"
import { CommandPalette } from "@/components/CommandPalette"
import { useRecentItems } from "@/lib/recentlyViewed"
import type { ProjectListResponse, ProjectResponse } from "@oc-tools/contracts"

type AccountNavLink = { to: string; label: string; icon: string }
type AccountNavLabel = { kind: "label"; label: string }
type AccountNavItem = AccountNavLink | AccountNavLabel

const ACCOUNT_NAV: AccountNavItem[] = [
  { to: "/workspace",       label: "工作台",    icon: "home" },
  { to: "/characters",      label: "我的角色",  icon: "mask" },
  { to: "/projects",        label: "我的企劃",  icon: "box" },
  { to: "/public-pages",    label: "我的公開頁", icon: "window" },
  { kind: "label",          label: "全域工具" },
  { to: "/commissions",     label: "委託",      icon: "star" },
  { to: "/height-compare",  label: "身高比較",  icon: "ruler" },
]

const PROJECT_NAV = [
  { path: "overview",      label: "企劃總覽", icon: "grid" },
  { path: "roster",        label: "企劃角色", icon: "mask" },
  { path: "worldview",     label: "世界觀",   icon: "globe" },
  { path: "relationships", label: "關係圖",   icon: "nodes" },
  { path: "story",         label: "故事",     icon: "book" },
  { path: "timeline",      label: "時間軸",   icon: "clock" },
  { path: "gallery",       label: "圖庫",     icon: "image" },
  { path: "settings",      label: "設定",     icon: "gear" },
]

// Minimal SVG icons (same set as v3 shell.js ICONS)
const ICONS: Record<string, string> = {
  home:   '<path d="M3 11l9-7 9 7"/><path d="M5 10v9h14v-9"/>',
  mask:   '<path d="M4 5c0 8 4 13 8 13s8-5 8-13c-3 1-5 1-8 1s-5 0-8-1Z"/>',
  box:    '<path d="M3 7l9-4 9 4-9 4-9-4Z"/><path d="M3 7v10l9 4 9-4V7"/><path d="M12 11v10"/>',
  window: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',
  star:   '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  ruler:  '<rect x="3" y="8" width="18" height="8" rx="1.5"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>',
  plus:   '<path d="M12 5v14M5 12h14"/>',
  grid:   '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  globe:  '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/>',
  nodes:  '<circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="7" r="2.4"/><circle cx="12" cy="18" r="2.4"/><path d="M8 7l8 .5M7 8l4 8M17 9l-4 7"/>',
  book:   '<path d="M5 4h10a3 3 0 0 1 3 3v13a2.5 2.5 0 0 0-2.5-2H5Z"/><path d="M5 4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2"/><path d="M9 8h5M9 11h5"/>',
  image:  '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="M21 16l-5-5-7 7"/>',
  gear:   '<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.4-2.3 1a7 7 0 0 0-1.7-1l-.4-2.5H9.5l-.4 2.5a7 7 0 0 0-1.7 1l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 1.7 1l.4 2.5h4.9l.4-2.5a7 7 0 0 0 1.7-1l2.3 1 2-3.4-2-1.5a7 7 0 0 0 .1-1Z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  clock:  '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
}

function Icon({ k, size = 18 }: { k: string; size?: number }) {
  return (
    <svg
      className="ic"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ width: size, height: size, flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: ICONS[k] ?? "" }}
    />
  )
}

export function AppLayout() {
  const { viewer, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Detect project scope from URL
  const projectMatch = useMatch("/p/:projectId/*")
  const projectId = projectMatch?.params?.projectId ?? null
  const scope = projectId ? "project" : "account"

  // Projects list (for switcher; shared cache with WorkspacePage)
  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListResponse>("/api/app/projects"),
  })

  // Current project (shared cache with ProjectLayout)
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiClient<ProjectResponse>(`/api/app/projects/${projectId}`),
    enabled: !!projectId,
  })

  const currentProject = projectQuery.data?.project
  const projects = projectsQuery.data?.projects ?? []

  const recentItems = useRecentItems()

  const initial = viewer?.displayName?.slice(0, 1) ?? "?"
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [cmdOpen, setCmdOpen] = useState(false)
  const quickRef = useRef<HTMLDivElement>(null)

  // Close sidebar on navigation
  useEffect(() => { setSidebarOpen(false) }, [location.pathname])

  // ⌘K / Ctrl+K / "/" to open command palette
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault()
        setCmdOpen(v => !v)
      } else if (e.key === "/" && !/^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement?.tagName ?? ""))) {
        e.preventDefault()
        setCmdOpen(true)
      }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [])

  // Close quick-add on outside click
  useEffect(() => {
    if (!quickOpen) return
    function close(e: MouseEvent) {
      if (!quickRef.current?.contains(e.target as Node)) setQuickOpen(false)
    }
    document.addEventListener("click", close)
    return () => document.removeEventListener("click", close)
  }, [quickOpen])

  async function handleLogout() {
    await logout()
    navigate("/login")
  }

  function handleScopeSwitch(target: "account" | "project") {
    if (target === scope) return
    if (target === "account") {
      navigate("/workspace")
    } else {
      // Go to first available project or /projects
      const first = projects[0]
      if (first) navigate(`/p/${first.id}/overview`)
      else navigate("/projects")
    }
  }

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

      {/* Sidebar */}
      <aside className={"appsb" + (sidebarOpen ? " open" : "")}>
        {/* Brand */}
        <a className="sb-brand" href="/workspace">
          <span className="mk">霧</span>
          CharacterHub
        </a>

        {/* Search → opens command palette */}
        <button className="sb-search" onClick={() => setCmdOpen(true)}>
          <Icon k="search" size={16} />
          <span style={{ flex: 1, textAlign: "left" }}>搜尋…</span>
          <span className="kbd">⌘K</span>
        </button>

        {/* Scope toggle */}
        <div className="sb-scope">
          <button
            className={scope === "account" ? "on" : ""}
            onClick={() => handleScopeSwitch("account")}
          >
            我的空間
          </button>
          <button
            className={scope === "project" ? "on" : ""}
            onClick={() => handleScopeSwitch("project")}
          >
            目前企劃
          </button>
        </div>

        {/* Project switcher (project scope only) */}
        {scope === "project" && (
          <div className="proj-switch">
            <div className="proj-btn" style={{ cursor: "default" }}>
              <span
                className="pc"
                style={{ background: currentProject?.themeColor ?? "#8A857C" }}
              />
              <span className="nm">{currentProject?.name ?? "載入中…"}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="sb-nav">
          {scope === "account"
            ? ACCOUNT_NAV.map((item, i) => {
                if ("kind" in item) {
                  return <div key={`lbl-${i}`} className="sb-label">{item.label}</div>
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => "sb-item" + (isActive ? " on" : "")}
                  >
                    <Icon k={item.icon} />
                    {item.label}
                  </NavLink>
                )
              })
            : PROJECT_NAV.map(({ path, label, icon }) => {
                const to = `/p/${projectId}/${path}`
                const isActive = location.pathname === to || location.pathname.startsWith(to + "/")
                return (
                  <NavLink
                    key={path}
                    to={to}
                    className={"sb-item" + (isActive ? " on" : "")}
                  >
                    <Icon k={icon} />
                    {label}
                  </NavLink>
                )
              })}
        </nav>

        {/* Recently viewed */}
        {recentItems.length > 0 && (
          <div className="sb-recent">
            <div className="sb-label">最近瀏覽</div>
            {recentItems.slice(0, 5).map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => "sb-item rv-item" + (isActive ? " on" : "")}
              >
                <span className="rv-dot" style={{ background: item.imgUrl ? "transparent" : item.color }}>
                  {item.imgUrl
                    ? <img src={item.imgUrl} alt={item.name} />
                    : item.name.slice(0, 1)
                  }
                </span>
                <span className="rv-nm">{item.name}</span>
              </NavLink>
            ))}
          </div>
        )}

        {/* Quick add */}
        <div className="quick-wrap" ref={quickRef}>
          <button className="sb-quick" onClick={() => setQuickOpen(v => !v)}>
            <Icon k="plus" size={17} />
            <span style={{ flex: 1, textAlign: "left" }}>快速新增</span>
            <span className="cv">▾</span>
          </button>
          {quickOpen && (
            <div className="quick-menu">
              <Link to="/characters/new" className="qm" onClick={() => setQuickOpen(false)}>
                <Icon k="mask" size={16} />
                新角色
              </Link>
              <button className="qm" onClick={() => { setQuickOpen(false); navigate("/projects") }}>
                <Icon k="box" size={16} />
                新企劃
              </button>
            </div>
          )}
        </div>

        {/* User */}
        <div className="sb-user">
          <Link to="/settings" className="sb-user-info">
            <span className="av">{initial}</span>
            <span>
              <span className="un" style={{ display: "block" }}>{viewer?.displayName}</span>
              <span className="uh">@{viewer?.email?.split("@")[0]}</span>
            </span>
          </Link>
          <button className="sb-logout" onClick={handleLogout}>
            登出
          </button>
        </div>
      </aside>

      {/* Scrim (mobile) */}
      <div
        className={"app-scrim" + (sidebarOpen ? " open" : "")}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        {/* Mobile top bar */}
        <div className="app-mtop">
          <button className="burger" onClick={() => setSidebarOpen(v => !v)} aria-label="選單">
            ☰
          </button>
          <a className="mt-brand" href="/workspace">
            <span className="mk">霧</span>
            CharacterHub
          </a>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
