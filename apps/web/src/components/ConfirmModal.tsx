import { useState, useCallback, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

export type ConfirmOptions = {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
}

type State = ConfirmOptions & {
  message: string
  resolve: (v: boolean) => void
}

// ── Hook version (for React components) ───────────────────────────────────────

export function useConfirm() {
  const [state, setState] = useState<State | null>(null)

  const confirm = useCallback((message: string, opts?: ConfirmOptions): Promise<boolean> => {
    return new Promise(resolve => setState({ message, ...opts, resolve }))
  }, [])

  const close = (value: boolean) => {
    state?.resolve(value)
    setState(null)
  }

  const modal = state ? <ConfirmDialog message={state.message} opts={state} onResolve={close} /> : null

  return { confirm, modal }
}

// ── Imperative version (for stores, utilities, non-React contexts) ─────────────

export function showConfirm(message: string, opts?: ConfirmOptions): Promise<boolean> {
  return new Promise(resolve => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    const cleanup = (value: boolean) => {
      root.unmount()
      document.body.removeChild(container)
      resolve(value)
    }

    root.render(<ConfirmDialog message={message} opts={opts} onResolve={cleanup} />)
  })
}

// ── Shared dialog component ───────────────────────────────────────────────────

function ConfirmDialog({
  message, opts, onResolve,
}: {
  message: string
  opts?: ConfirmOptions
  onResolve: (v: boolean) => void
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onResolve(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onResolve])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={opts?.title ? 'confirm-title' : undefined}
      onClick={() => onResolve(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(20,16,13,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--surface)', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.35)', maxWidth: 420, width: '100%', padding: '28px 28px 24px' }}
      >
        {opts?.title && (
          <h2 id="confirm-title" style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: 18, margin: '0 0 10px', color: 'var(--text)' }}>{opts.title}</h2>
        )}
        <p style={{ fontSize: 14.5, color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button
            onClick={() => onResolve(false)}
            style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 600, padding: '9px 20px', borderRadius: 11, border: '1.5px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            {opts?.cancelLabel ?? '取消'}
          </button>
          <button
            onClick={() => onResolve(true)}
            style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, padding: '9px 20px', borderRadius: 11, border: 'none', cursor: 'pointer', background: opts?.danger ? '#c0584f' : 'var(--accent)', color: '#fff' }}
          >
            {opts?.confirmLabel ?? '確定'}
          </button>
        </div>
      </div>
    </div>
  )
}
