import type { CSSProperties } from 'react'
import { useOctool } from '../store/useOctool'
import { THEMES, THEME_ORDER } from '../data/themes'
import type { ViewKey } from '../types'

const NAV: { key: ViewKey; label: string }[] = [
  { key: 'form', label: '編輯資料' },
  { key: 'design', label: '模板與展示' },
  { key: 'help', label: '使用說明' },
]

const tabBase: CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 14,
  fontWeight: 700,
  border: 'none',
  cursor: 'pointer',
  padding: '9px 16px',
  borderRadius: 10,
  transition: 'all .18s ease',
}

export function PageHeader() {
  const { ui, setView, setTheme } = useOctool()

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 20,
        background: 'var(--bg-2)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '13px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 11,
              background: 'var(--accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'Newsreader', serif",
              color: 'var(--bg-2)',
              fontSize: 19,
              fontWeight: 600,
              boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
            }}
          >
            O
          </div>
          <div>
            <div
              style={{
                fontFamily: "'Newsreader', serif",
                fontWeight: 600,
                fontSize: 20,
                lineHeight: 1,
                color: 'var(--text)',
                letterSpacing: '0.04em',
              }}
            >
              OCTOOL
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>角色整理與展示</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }} title="介面主題（淺色／深色）">
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>主題</span>
            {THEME_ORDER.map((key) => {
              const th = THEMES[key]
              const active = ui.theme === key
              return (
                <button
                  key={key}
                  title={th.label}
                  onClick={() => setTheme(key)}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 8,
                    cursor: 'pointer',
                    border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                    background: th.swatch[0],
                    position: 'relative',
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      right: 3,
                      bottom: 3,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: th.swatch[1],
                    }}
                  />
                </button>
              )
            })}
          </div>

          <nav
            className="octstrip"
            style={{
              display: 'flex',
              gap: 5,
              background: 'var(--bg-3)',
              padding: 5,
              borderRadius: 14,
            }}
          >
            {NAV.map((n) => {
              const active = ui.view === n.key
              return (
                <button
                  key={n.key}
                  onClick={() => setView(n.key)}
                  style={{
                    ...tabBase,
                    ...(active
                      ? {
                          background: 'var(--bg-2)',
                          color: 'var(--accent)',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        }
                      : { background: 'transparent', color: 'var(--text-2)' }),
                  }}
                >
                  {n.label}
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
