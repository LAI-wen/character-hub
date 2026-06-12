import { Link } from "react-router-dom"

type Crumb = string | { label: string; href: string }

interface ContextHeaderProps {
  scope: "account" | "project"
  crumbs: Crumb[]
}

export function ContextHeader({ scope, crumbs }: ContextHeaderProps) {
  return (
    <div className="ctxh">
      <span className={`scope ${scope}`}>
        <span className="d" />
        {scope === "project" ? "目前企劃 · PROJECT" : "我的空間 · ACCOUNT"}
      </span>
      <div className="crumb">
        {crumbs.map((c, i) => {
          const label = typeof c === "string" ? c : c.label
          const href = typeof c === "string" ? undefined : c.href
          const isLast = i === crumbs.length - 1
          return (
            <span key={i}>
              {i > 0 && <span className="sep">/</span>}
              {isLast ? (
                <span className="cur">{label}</span>
              ) : href ? (
                <Link to={href}>{label}</Link>
              ) : (
                <b>{label}</b>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
