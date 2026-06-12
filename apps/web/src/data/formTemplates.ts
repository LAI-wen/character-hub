function uid() { return Math.random().toString(36).slice(2, 9) }

export interface FormTemplate {
  id: string
  name: string
  builtin?: boolean
  sections: { title: string; group: string; fields: { label: string; type: string }[] }[]
}

export function schemaFromSections(
  sections: { id: string; title: string; group: string; fields: { id: string; label: string; type: string; value: string }[] }[]
): FormTemplate['sections'] {
  return sections.map((s) => ({
    title: s.title || '',
    group: s.group || 'text',
    fields: s.fields.map((f) => ({ label: f.label || '', type: f.type || 'text' })),
  }))
}

export function sectionsFromSchema(
  schema: FormTemplate['sections']
): { id: string; title: string; group: 'text' | 'image'; fields: { id: string; label: string; type: string; value: string }[] }[] {
  return schema.map((s) => ({
    id: uid(),
    title: s.title || '',
    group: (s.group as 'text' | 'image') || 'text',
    fields: s.fields.map((f) => ({ id: uid(), label: f.label || '', type: f.type || 'text', value: '' })),
  }))
}

export const BUILTIN_FORMS: FormTemplate[] = [
  {
    id: 'bf-art',
    name: '繪師委託向',
    builtin: true,
    sections: [
      { title: '基本資料', group: 'text', fields: [{ label: '種族 / 身分', type: 'text' }, { label: '年齡', type: 'text' }, { label: '身高', type: 'text' }] },
      { title: '繪圖規範', group: 'image', fields: [{ label: '必畫重點', type: 'check' }, { label: '不可畫錯', type: 'avoid' }, { label: '配件', type: 'tags' }, { label: '自由發揮', type: 'longtext' }] },
    ],
  },
  {
    id: 'bf-novel',
    name: '文手向',
    builtin: true,
    sections: [
      { title: '基本', group: 'text', fields: [{ label: '一句話簡介', type: 'text' }, { label: '性格', type: 'longtext' }] },
      { title: '設定', group: 'text', fields: [{ label: '背景', type: 'longtext' }, { label: '行動動機', type: 'longtext' }, { label: '說話方式', type: 'tags' }, { label: '關係觀', type: 'longtext' }, { label: '禁忌', type: 'longtext' }] },
    ],
  },
  {
    id: 'bf-min',
    name: '精簡',
    builtin: true,
    sections: [
      { title: '基本資料', group: 'text', fields: [{ label: '種族 / 身分', type: 'text' }, { label: '年齡', type: 'text' }, { label: '身高', type: 'text' }, { label: '喜歡', type: 'tags' }, { label: '討厭', type: 'tags' }] },
    ],
  },
]

export const FORMS_KEY = 'octool:react:forms'

export function loadForms(): FormTemplate[] {
  try {
    const raw = localStorage.getItem(FORMS_KEY)
    const a = raw ? JSON.parse(raw) : []
    return Array.isArray(a) ? a : []
  } catch {
    return []
  }
}

export function saveForms(list: FormTemplate[]): void {
  localStorage.setItem(FORMS_KEY, JSON.stringify(list.filter((t) => !t.builtin)))
}
