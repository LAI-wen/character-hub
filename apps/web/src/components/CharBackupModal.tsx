import { useState } from 'react'
import { showConfirm } from '@/components/ConfirmModal'
import { BUILTIN_FORMS, type FormTemplate, loadForms, saveForms, schemaFromSections, sectionsFromSchema } from '@/data/formTemplates'

function uid() { return Math.random().toString(36).slice(2, 9) }

type Section = { id: string; title: string; group: string; fields: { id: string; label: string; type: string; value: string }[] }

interface Props {
  charName: string
  sections: Section[]
  onExport: () => void
  onImport: () => void
  onApplySections: (sections: Section[]) => void
  onClose: () => void
}

export function CharBackupModal({ charName: _charName, sections, onExport, onImport, onApplySections, onClose }: Props) {
  const [formTemplates, setFormTemplates] = useState<FormTemplate[]>(() => [...BUILTIN_FORMS, ...loadForms()])

  const persist = (list: FormTemplate[]) => { setFormTemplates(list); saveForms(list) }

  const saveCurrentAsTemplate = () => {
    const name = prompt('格式名稱？')
    if (!name) return
    const tpl: FormTemplate = { id: uid(), name, sections: schemaFromSections(sections) }
    persist([...formTemplates, tpl])
  }

  const applyTemplate = async (t: FormTemplate) => {
    if (!await showConfirm('這會換掉目前的設定區塊（但不影響模板和圖庫）。', { title: `套用「${t.name}」格式？`, confirmLabel: '套用' })) return
    onApplySections(sectionsFromSchema(t.sections) as Section[])
    onClose()
  }

  const removeTemplate = (id: string) => {
    persist(formTemplates.filter((t) => t.id !== id))
  }

  const exportTemplate = () => {
    const user = formTemplates.filter((t) => !t.builtin)
    if (!user.length) { alert('還沒有自訂格式。'); return }
    const blob = new Blob([JSON.stringify(user, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'form-templates.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const importTemplate = () => {
    const inp = document.createElement('input')
    inp.type = 'file'; inp.accept = 'application/json,.json'
    inp.onchange = () => {
      const f = inp.files?.[0]; if (!f) return
      const fr = new FileReader()
      fr.onload = () => {
        try {
          const arr = JSON.parse(String(fr.result))
          if (!Array.isArray(arr)) throw new Error()
          const imported: FormTemplate[] = arr.map((t: unknown) => ({
            id: uid(), name: (t as FormTemplate).name || '匯入格式', sections: (t as FormTemplate).sections || [],
          }))
          persist([...formTemplates, ...imported])
        } catch { alert('格式檔案讀取失敗。') }
      }
      fr.readAsText(f)
    }
    inp.click()
  }

  const primaryBtn = { fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 10, padding: '9px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 } as const
  const softBtn   = { fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' } as const
  const ghost     = { fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 14px', cursor: 'pointer' } as const
  const sectionStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 14 } as const

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(20,16,13,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', maxWidth: 560, width: '100%', maxHeight: '88vh', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
          <h2 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 18, margin: 0, color: 'var(--text)' }}>備份與格式</h2>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 18px', lineHeight: 1.6 }}>
          <b style={{ color: 'var(--text)' }}>內容</b>是你填的資料，<b style={{ color: 'var(--text)' }}>格式</b>只是欄位的結構。
        </p>

        <section style={sectionStyle}>
          <h3 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 15, margin: '0 0 4px', color: 'var(--text)' }}>內容備份</h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.6 }}>所有文字、圖片、相簿、配色、模板。匯出成 JSON 儲存或搬到別台裝置。</p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            <button style={primaryBtn} onClick={() => { onExport(); onClose() }}>匯出內容備份</button>
            <button style={ghost} onClick={() => { onImport(); onClose() }}>匯入內容檔</button>
          </div>
        </section>

        <section style={sectionStyle}>
          <h3 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 15, margin: '0 0 4px', color: 'var(--text)' }}>欄位格式（只有結構）</h3>
          <p style={{ fontSize: 12, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.6 }}>只記住「有哪些區塊、哪些欄位」，不含填的內容。套用格式會換掉目前的設定區塊。</p>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 16 }}>
            <button style={softBtn} onClick={saveCurrentAsTemplate}>＋ 儲存目前格式</button>
            <button style={ghost} onClick={importTemplate}>匯入格式</button>
            <button style={ghost} onClick={exportTemplate}>匯出格式</button>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-dim)', marginBottom: 9 }}>套用格式</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {formTemplates.map((t) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 13, padding: '11px 13px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text)' }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>{t.sections.length} 個區塊{t.builtin ? ' · 範例' : ''}</div>
                </div>
                <button style={{ ...softBtn, padding: '8px 14px' }} onClick={() => applyTemplate(t)}>套用</button>
                {!t.builtin && (
                  <button onClick={() => removeTemplate(t.id)} style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
