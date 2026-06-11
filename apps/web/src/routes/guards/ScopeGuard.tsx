import type { ReactNode } from "react"

type Props = {
  children: ReactNode
  projectId: string | undefined
}

export function ScopeGuard({ children, projectId }: Props) {
  if (!projectId) {
    return <div style={{ padding: "2rem" }}>No project selected.</div>
  }
  return <>{children}</>
}
