import type { CSSProperties, ReactNode } from 'react'

// Small inline-styled primitives shared by the form editors.
// Mirrors the look of the original DC (rounded inputs, cream cards).

export const inputStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  fontSize: 15,
  color: 'var(--text)',
  background: 'var(--bg-3)',
  border: '1px solid var(--border)',
  borderRadius: 12,
  padding: '11px 13px',
  outline: 'none',
}

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <section
      style={{
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        borderRadius: 22,
        boxShadow: '0 10px 36px rgba(0,0,0,0.06)',
        padding: 24,
        ...style,
      }}
    >
      {children}
    </section>
  )
}

export function CardHead({ icon, title, right }: { icon?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {icon ? (
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </span>
        ) : null}
        <h2
          style={{
            fontFamily: "'Newsreader', serif",
            fontWeight: 600,
            fontSize: 19,
            margin: 0,
            color: 'var(--text)',
          }}
        >
          {title}
        </h2>
      </div>
      {right}
    </div>
  )
}

export function Labeled({
  label,
  children,
  style,
}: {
  label: string
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', ...style }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-2)', margin: '0 0 6px' }}>
        {label}
      </span>
      {children}
    </label>
  )
}

export function softBtn(active = false): CSSProperties {
  return {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    cursor: 'pointer',
    borderRadius: 10,
    padding: '8px 13px',
    border: 'none',
    background: active ? 'var(--accent)' : 'var(--accent-soft)',
    color: active ? '#fff' : 'var(--accent)',
  }
}

export function ghostBtn(): CSSProperties {
  return {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    borderRadius: 10,
    padding: '8px 13px',
    border: '1px solid var(--border)',
    background: 'var(--bg-2)',
    color: 'var(--text-2)',
  }
}
