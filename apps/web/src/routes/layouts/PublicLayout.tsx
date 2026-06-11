import { Outlet } from "react-router-dom"

export function PublicLayout() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <Outlet />
    </div>
  )
}
