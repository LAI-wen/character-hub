export function LoadingSpinner({ className }: { className?: string }) {
  return (
    <p className={className} style={{ color: "var(--text-faint)" }}>載入中⋯</p>
  )
}

export function PageLoading() {
  return (
    <div className="page" style={{ color: "var(--text-faint)" }}>載入中⋯</div>
  )
}
