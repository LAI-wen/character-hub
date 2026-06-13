import { useOctool } from '../../store/useOctool'
import type { FormTab } from '../../types'
import { Icon } from '../../components/Icon'
import { TemplateCanvas } from '../../components/TemplateCanvas'
import { IdentityCard } from './IdentityCard'
import { ImagesCard, PaletteCard } from './ImagesPaletteCards'
import { SectionsEditor } from './SectionsEditor'
import { AlbumsEditor } from './AlbumsEditor'
import { ghostBtn } from './FormControls'

const TABS: { key: FormTab; label: string }[] = [
  { key: 'basic', label: '基本' },
  { key: 'image', label: '圖設定' },
  { key: 'text', label: '文設定' },
  { key: 'gallery', label: '圖庫' },
]

export function FormPage() {
  const { ui, activeTemplate, character, setFormTab, resetDemo, clearAll, openFormTpl } = useOctool()
  const tab = ui.formTab

  return (
    <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 26, margin: 0, color: 'var(--text)' }}>
              編輯角色
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-2)' }}>
              區塊與欄位都能自由新增、改名、刪除。右側即時預覽。
            </p>
          </div>
          <div className="octstrip" style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <span
              title="所有變更都會自動儲存在這台裝置的瀏覽器"
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                color: 'var(--text-2)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '8px 4px',
                opacity: 0.85,
              }}
            >
              <Icon name="check" size={14} /> 自動儲存
            </span>
            <button style={ghostBtn()} onClick={openFormTpl}>
              <Icon name="save" size={14} /> 備份與格式
            </button>
            <button style={ghostBtn()} onClick={resetDemo}>
              <Icon name="rotate" size={14} /> 載入範例
            </button>
            <button
              style={{ ...ghostBtn(), color: '#c0584f', borderColor: '#e0b3ad' }}
              onClick={clearAll}
            >
              <Icon name="trash" size={14} /> 清空
            </button>
          </div>
        </div>

        <div
          className="octstrip"
          style={{
            display: 'flex',
            gap: 5,
            background: 'var(--bg-3)',
            padding: 5,
            borderRadius: 14,
            flexWrap: 'wrap',
            alignSelf: 'flex-start',
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setFormTab(t.key)}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 13.5,
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 10,
                  padding: '8px 15px',
                  background: active ? 'var(--bg-2)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-2)',
                  boxShadow: active ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {tab === 'basic' ? <IdentityCard /> : null}
          {tab === 'image' ? (
            <>
              <ImagesCard />
              <PaletteCard />
              <AlbumsEditor kind="ref" />
              <SectionsEditor group="image" />
            </>
          ) : null}
          {tab === 'text' ? <SectionsEditor group="text" /> : null}
          {tab === 'gallery' ? <AlbumsEditor kind="gallery" /> : null}
        </div>
      </div>

      {/* live preview */}
      <aside style={{ width: 430, flexShrink: 0 }} className="oct-preview-aside">
        <div style={{ position: 'sticky', top: 84 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: 'var(--text-2)',
                textTransform: 'uppercase',
              }}
            >
              即時預覽
            </span>
          </div>
          <div
            style={{
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 22,
              padding: 18,
              maxHeight: 'calc(100vh - 130px)',
              overflowY: 'auto',
            }}
          >
            <TemplateCanvas
              character={character}
              template={activeTemplate}
              annotateMode={ui.annotateMode}
            />
          </div>
        </div>
      </aside>
    </div>
  )
}
