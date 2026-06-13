import { useOctool } from '../../store/useOctool'
import { Icon } from '../../components/Icon'

export function BackupModal() {
  const {
    ui,
    closeFormTpl,
    exportChar,
    importCharFile,
    saveFormTemplate,
    applyFormTemplate,
    removeFormTemplate,
    exportFormTemplate,
    importFormTemplate,
    formTemplates,
  } = useOctool()

  if (!ui.formTpl) return null

  const primaryBtn = {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    color: '#fff',
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 10,
    padding: '9px 14px',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
  } as const
  const softBtn = {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 700,
    color: 'var(--accent)',
    background: 'var(--accent-soft)',
    border: 'none',
    borderRadius: 10,
    padding: '9px 14px',
    cursor: 'pointer',
  } as const
  const ghost = {
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-2)',
    background: 'var(--bg-2)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '9px 14px',
    cursor: 'pointer',
  } as const
  const sectionStyle = {
    background: 'var(--bg-3)',
    border: '1px solid var(--border)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  } as const

  return (
    <div
      onClick={closeFormTpl}
      style={{ position: 'fixed', inset: 0, zIndex: 72, background: 'rgba(40,32,26,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-2)', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', maxWidth: 560, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 19, margin: 0, color: 'var(--text)' }}>備份與格式</h2>
          <button onClick={closeFormTpl} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 16 }}>
            ×
          </button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 18px', lineHeight: 1.6 }}>
          這裡分成兩件不同的事：<b style={{ color: 'var(--text)' }}>內容</b>是你填的資料，<b style={{ color: 'var(--text)' }}>格式</b>只是欄位的結構。
        </p>

        <section style={sectionStyle}>
          <h3 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 16, margin: '0 0 4px', color: 'var(--text)' }}>內容（你填的資料）</h3>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.6 }}>所有文字、圖片、相簿、配色、模板。匯出成一個檔案保存，或搬到別台裝置。</p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button style={primaryBtn} onClick={exportChar}>
              <Icon name="save" size={14} /> 匯出內容備份
            </button>
            <button style={ghost} onClick={importCharFile}>
              匯入內容檔
            </button>
          </div>
        </section>

        <section style={sectionStyle}>
          <h3 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 16, margin: '0 0 4px', color: 'var(--text)' }}>欄位格式（只有結構）</h3>
          <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '0 0 12px', lineHeight: 1.6 }}>只記住「有哪些區塊、哪些欄位」，不含你填的內容。套用一份格式會換掉目前的設定區塊。</p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
            <button style={softBtn} onClick={saveFormTemplate}>
              ＋ 儲存目前格式
            </button>
            <button style={ghost} onClick={importFormTemplate}>
              匯入格式
            </button>
            <button style={ghost} onClick={exportFormTemplate}>
              匯出格式
            </button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 9 }}>套用格式</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {formTemplates.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 13px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                    {t.sections.length} 個區塊
                    {t.builtin ? ' · 範例' : ''}
                  </div>
                </div>
                <button style={{ ...softBtn, padding: '8px 14px' }} onClick={() => applyFormTemplate(t)}>
                  套用
                </button>
                {!t.builtin ? (
                  <button onClick={() => removeFormTemplate(t.id)} style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="trash" size={15} />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
