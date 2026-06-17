import { useCharacterStore } from '@/store/useCharacterStore'
import type { FieldType, SectionGroup } from '@/store/useCharacterStore'
import { Card } from './FormControls'

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: '短文字' },
  { value: 'longtext', label: '長文字' },
  { value: 'tags', label: '標籤' },
  { value: 'check', label: '必畫重點 ✓' },
  { value: 'avoid', label: '不可畫錯 ✕' },
  { value: 'attr', label: '屬性表' },
  { value: 'object', label: '物件' },
]

const fieldInput = { width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit', fontSize: 14.5, color: 'var(--text)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 11, padding: '10px 12px', outline: 'none' }
const addBtn = { fontFamily: 'inherit', fontSize: 12.5, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 9, padding: '7px 12px', cursor: 'pointer' }

export function SectionsEditor({ group }: { group: SectionGroup }) {
  const { character, addSection, updateSection, removeSection, addField, updateField, removeField } = useCharacterStore()
  const sections = character.sections.filter((s) => (s.group || 'text') === group)

  return (
    <>
      {sections.map((sec) => (
        <Card key={sec.id}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <span style={{ width: 7, height: 24, borderRadius: 4, background: 'var(--accent)', flexShrink: 0 }} />
            <input value={sec.title} onChange={(e) => updateSection(sec.id, 'title', e.target.value)}
              placeholder={group === 'image' ? '區塊名稱（例：繪圖規範）' : '區塊名稱'}
              style={{ flex: 1, minWidth: 0, fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 19, color: 'var(--text)', background: 'transparent', border: 'none', borderBottom: '1px dashed transparent', outline: 'none', padding: '2px 0' }} />
            <div title="把區塊歸到文設定／圖設定分頁" style={{ display: 'flex', gap: 3, background: 'var(--bg-3)', padding: 3, borderRadius: 9, flexShrink: 0 }}>
              {(['text', 'image'] as SectionGroup[]).map((g) => (
                <button key={g} onClick={() => updateSection(sec.id, 'group', g)}
                  style={{ fontFamily: 'inherit', fontSize: 11.5, fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 7, padding: '5px 10px', background: (sec.group || 'text') === g ? 'var(--accent)' : 'transparent', color: (sec.group || 'text') === g ? '#fff' : 'var(--text-2)' }}>
                  {g === 'text' ? '文設定' : '圖設定'}
                </button>
              ))}
            </div>
            <button onClick={() => removeSection(sec.id)}
              style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12.5, color: 'var(--text-2)', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
              刪除
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sec.fields.map((fd) => {
              const multi = fd.type === 'longtext' || fd.type === 'attr' || fd.type === 'object'
              return (
                <div key={fd.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input value={fd.label} onChange={(e) => updateField(sec.id, fd.id, 'label', e.target.value)} placeholder="欄位名稱"
                        style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--text-2)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 10px', outline: 'none' }} />
                      <select value={fd.type} onChange={(e) => updateField(sec.id, fd.id, 'type', e.target.value)}
                        style={{ flexShrink: 0, fontFamily: 'inherit', fontSize: 12.5, color: 'var(--text-2)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 9, padding: '7px 8px', outline: 'none', cursor: 'pointer' }}>
                        {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    {multi ? (
                      <textarea value={fd.value} onChange={(e) => updateField(sec.id, fd.id, 'value', e.target.value)} placeholder="輸入內容…" style={{ ...fieldInput, minHeight: 80, resize: 'vertical', lineHeight: 1.7 }} />
                    ) : (
                      <input value={fd.value} onChange={(e) => updateField(sec.id, fd.id, 'value', e.target.value)}
                        placeholder={fd.type === 'tags' || fd.type === 'check' || fd.type === 'avoid' ? '用、分隔多個項目' : '輸入內容…'}
                        style={fieldInput} />
                    )}
                  </div>
                  <button onClick={() => removeField(sec.id, fd.id)}
                    style={{ flexShrink: 0, width: 32, height: 32, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 15, marginTop: 1 }}>×</button>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginTop: 14 }}>
            <button style={addBtn} onClick={() => addField(sec.id, 'text')}>＋ 短文字</button>
            <button style={addBtn} onClick={() => addField(sec.id, 'longtext')}>＋ 長文字</button>
            <button style={addBtn} onClick={() => addField(sec.id, 'tags')}>＋ 標籤</button>
            <button style={addBtn} onClick={() => addField(sec.id, 'check')}>＋ 必畫重點 ✓</button>
            <button style={addBtn} onClick={() => addField(sec.id, 'avoid')}>＋ 不可畫錯 ✕</button>
            <button style={addBtn} onClick={() => addField(sec.id, 'attr')}>＋ 屬性表</button>
            <button style={addBtn} onClick={() => addField(sec.id, 'object')}>＋ 物件</button>
          </div>
        </Card>
      ))}

      <button onClick={() => addSection(group)}
        style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: 'var(--text-2)', background: 'var(--bg-2)', border: '1.5px dashed var(--border)', borderRadius: 16, padding: 15, cursor: 'pointer', width: '100%', boxSizing: 'border-box' }}>
        ＋ 新增{group === 'image' ? '繪圖規範' : '文設定'}區塊
      </button>
    </>
  )
}
