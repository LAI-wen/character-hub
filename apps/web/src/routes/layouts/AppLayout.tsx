import { useState, useEffect, useRef } from "react"
import { Outlet, NavLink, Link, useNavigate, useMatch, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/auth/context"
import { apiClient } from "@/lib/api/client"
import { CommandPalette } from "@/components/CommandPalette"
import type { ProjectListResponse, ProjectResponse } from "@oc-tools/contracts"

type AccountNavLink = { to: string; label: string; icon: string }
type AccountNavLabel = { kind: "label"; label: string }
type AccountNavItem = AccountNavLink | AccountNavLabel

const ACCOUNT_NAV: AccountNavItem[] = [
  { to: "/workspace",       label: "nav.workspace",    icon: "home" },
  { to: "/characters",      label: "nav.myCharacters",  icon: "mask" },
  { to: "/projects",        label: "nav.myProjects",  icon: "box" },
  { to: "/public-pages",    label: "nav.myPublicPages", icon: "window" },
  { kind: "label",          label: "nav.globalTools" },
  { to: "/gallery",         label: "nav.globalGallery",  icon: "image" },
  { to: "/commissions",     label: "nav.commissions",      icon: "star" },
  { to: "/height-compare",  label: "nav.heightCompare",  icon: "ruler" },
]

type ProjectNavItem = { path: string; label: string; icon: string } | { kind: "label"; label: string }
const PROJECT_NAV: ProjectNavItem[] = [
  { path: "overview",      label: "nav.projectOverview", icon: "grid" },
  { path: "roster",        label: "nav.projectRoster", icon: "mask" },
  { path: "worldview",     label: "nav.worldview",   icon: "globe" },
  { path: "relationships", label: "nav.relationships",   icon: "nodes" },
  { path: "story",         label: "nav.story",     icon: "book" },
  { path: "timeline",      label: "nav.timeline",   icon: "clock" },
  { path: "gallery",       label: "nav.gallery",     icon: "image" },
  { path: "inspiration",   label: "nav.inspiration",   icon: "bulb" },
  { path: "applications",  label: "nav.applications", icon: "check2" },
  { path: "submissions",   label: "nav.submissions", icon: "upload2" },
  { kind: "label",          label: "nav.projectManagement" },
  { path: "public-page",   label: "nav.publicPage",   icon: "window" },
  { path: "template",      label: "nav.characterTemplate", icon: "layout" },
  { path: "participants",  label: "nav.participants",   icon: "people" },
  { path: "settings",      label: "nav.settings",     icon: "gear" },
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
  search:  '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  bulb:    '<path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.5-1.3 4.7-3 6H9c-1.7-1.3-3-3.5-3-6a6 6 0 0 1 6-6Z"/><path d="M9 17h6"/>',
  check2:  '<path d="M9 12l2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="2"/>',
  upload2: '<path d="M12 16V8M8 12l4-4 4 4"/><rect x="3" y="16" width="18" height="4" rx="1.5"/>',
  layout:  '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
  people:  '<circle cx="9" cy="7" r="3"/><path d="M3 21v-1a6 6 0 0 1 6-6h0"/><circle cx="16" cy="9" r="3"/><path d="M12 21v-1a6 6 0 0 1 6-6h3"/>',
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
  const { t } = useTranslation()

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
        <Link className="sb-brand" to="/workspace">
          <img src="/logo.png" alt="CharacterHub" className="sb-logo" />
        </Link>

        {/* Search → opens command palette */}
        <button className="sb-search" onClick={() => setCmdOpen(true)}>
          <Icon k="search" size={16} />
          <span style={{ flex: 1, textAlign: "left" }}>{t("nav.search")}</span>
          <span className="kbd">⌘K</span>
        </button>

        {/* Scope toggle */}
        <div className="sb-scope">
          <button
            className={scope === "account" ? "on" : ""}
            onClick={() => handleScopeSwitch("account")}
          >
            {t("nav.mySpace")}
          </button>
          <button
            className={scope === "project" ? "on" : ""}
            onClick={() => handleScopeSwitch("project")}
          >
            {t("nav.currentProject")}
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
                  return <div key={`lbl-${i}`} className="sb-label">{t(item.label)}</div>
                }
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => "sb-item" + (isActive ? " on" : "")}
                  >
                    <Icon k={item.icon} />
                    {t(item.label)}
                  </NavLink>
                )
              })
            : PROJECT_NAV.map((item, i) => {
                if ("kind" in item) {
                  return <div key={`lbl-${i}`} className="sb-label">{t(item.label)}</div>
                }
                const to = `/p/${projectId}/${item.path}`
                const isActive = location.pathname === to || location.pathname.startsWith(to + "/")
                return (
                  <NavLink
                    key={item.path}
                    to={to}
                    className={"sb-item" + (isActive ? " on" : "")}
                  >
                    <Icon k={item.icon} />
                    {t(item.label)}
                  </NavLink>
                )
              })}
        </nav>


        {/* Quick add */}
        <div className="quick-wrap" ref={quickRef}>
          <button className="sb-quick" onClick={() => setQuickOpen(v => !v)}>
            <Icon k="plus" size={17} />
            <span style={{ flex: 1, textAlign: "left" }}>{t("nav.quickAdd")}</span>
            <span className="cv">▾</span>
          </button>
          {quickOpen && (
            <div className="quick-menu">
              <Link to="/characters/new" className="qm" onClick={() => setQuickOpen(false)}>
                <Icon k="mask" size={16} />
                {t("nav.newCharacter")}
              </Link>
              <button className="qm" onClick={() => { setQuickOpen(false); navigate("/projects") }}>
                <Icon k="box" size={16} />
                {t("nav.newProject")}
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
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      {/* Scrim (mobile) */}
      <div
        className={"app-scrim" + (sidebarOpen ? " open" : "")}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "var(--bg)", display: "flex", flexDirection: "column" }}>
        {/* Mobile top bar */}
        <div className="app-mtop">
          <button className="burger" onClick={() => setSidebarOpen(v => !v)} aria-label={t("nav.mySpace")}>
            ☰
          </button>
          <Link className="mt-brand" to="/workspace">
            <img src="/logo.png" alt="CharacterHub" className="sb-logo" style={{ height: 28 }} />
          </Link>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
