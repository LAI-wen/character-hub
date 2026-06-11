interface ContextHeaderProps {
  scope: "account" | "project"
  crumbs: string[]
}

export function ContextHeader({ scope, crumbs }: ContextHeaderProps) {
  return (
    <div className="ctxh">
      <span className={`scope ${scope}`}>
        <span className="d" />
        {scope === "project" ? "目前企劃 · PROJECT" : "我的空間 · ACCOUNT"}
      </span>
      <div className="crumb">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span className="sep">/</span>}
            {i === crumbs.length - 1 ? (
              <span className="cur">{c}</span>
            ) : (
              <b>{c}</b>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}
