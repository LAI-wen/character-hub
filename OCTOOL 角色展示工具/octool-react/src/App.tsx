import type { CSSProperties } from 'react'
import { OctoolProvider, useOctool } from './store/useOctool'
import { THEMES } from './data/themes'
import { PageHeader } from './components/PageHeader'
import { FormPage } from './features/form/FormPage'
import { DesignPage } from './features/design/DesignPage'
import { HelpPage } from './features/help/HelpPage'
import { AnnotationModal } from './features/modals/AnnotationModal'
import { AvatarCropper } from './features/modals/AvatarCropper'
import { EyedropperModal } from './features/modals/EyedropperModal'
import { BackupModal } from './features/modals/BackupModal'

function Shell() {
  const { ui, setPreview } = useOctool()
  const themeVars = THEMES[ui.theme].vars

  return (
    <div
      style={{
        ...(themeVars as CSSProperties),
        minHeight: '100vh',
        background: 'var(--bg)',
        color: 'var(--text)',
        fontFamily: "'Nunito Sans', system-ui, sans-serif",
        transition: 'background .35s ease, color .35s ease',
      }}
    >
      <PageHeader />
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '26px 22px 90px' }}>
        {ui.view === 'form' ? <FormPage /> : ui.view === 'design' ? <DesignPage /> : <HelpPage />}
      </main>

      {/* global image lightbox */}
      {ui.preview ? (
        <div
          onClick={() => setPreview(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 80,
            background: 'rgba(20,16,13,0.82)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 28,
          }}
        >
          <img
            src={ui.preview}
            alt=""
            style={{ maxWidth: '92vw', maxHeight: '88vh', borderRadius: 12, boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}
          />
          <button
            onClick={() => setPreview(null)}
            style={{
              position: 'absolute',
              top: 20,
              right: 22,
              width: 42,
              height: 42,
              borderRadius: 12,
              border: 'none',
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 20,
            }}
          >
            ×
          </button>
        </div>
      ) : null}

      {/* modals */}
      <AnnotationModal />
      <AvatarCropper />
      <EyedropperModal />
      <BackupModal />
    </div>
  )
}

export default function App() {
  return (
    <OctoolProvider>
      <Shell />
    </OctoolProvider>
  )
}
