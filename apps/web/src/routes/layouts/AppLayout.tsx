import { useState, useEffect, useRef } from "react"
import { Outlet, NavLink, Link, useNavigate, useMatch, useLocation } from "react-router-dom"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useAuth } from "@/lib/auth/context"
import { apiClient } from "@/lib/api/client"
import { CommandPalette } from "@/components/CommandPalette"
import { Icon } from "@/components/Icon"
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
          <Icon name="search" size={16} />
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
                    <Icon name={item.icon} />
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
                    <Icon name={item.icon} />
                    {t(item.label)}
                  </NavLink>
                )
              })}
        </nav>


        {/* Quick add */}
        <div className="quick-wrap" ref={quickRef}>
          <button className="sb-quick" onClick={() => setQuickOpen(v => !v)}>
            <Icon name="plus" size={17} />
            <span style={{ flex: 1, textAlign: "left" }}>{t("nav.quickAdd")}</span>
            <span className="cv">▾</span>
          </button>
          {quickOpen && (
            <div className="quick-menu">
              <Link to="/characters/new" className="qm" onClick={() => setQuickOpen(false)}>
                <Icon name="mask" size={16} />
                {t("nav.newCharacter")}
              </Link>
              <button className="qm" onClick={() => { setQuickOpen(false); navigate("/projects") }}>
                <Icon name="box" size={16} />
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
