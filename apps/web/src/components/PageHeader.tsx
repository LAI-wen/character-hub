import type { ReactNode } from "react"

interface PageHeaderProps {
  title: string
  eyebrow: string
  sub?: string
  action?: ReactNode
}

export function PageHeader({ title, eyebrow, sub, action }: PageHeaderProps) {
  return (
    <div className="pageh">
      <div className="ht">
        <h1>
          {title} <span className="en">{eyebrow}</span>
        </h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {action && <div className="acts">{action}</div>}
    </div>
  )
}
