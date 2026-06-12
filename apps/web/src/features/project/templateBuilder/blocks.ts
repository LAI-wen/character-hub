import type { CanvasBlock, CanvasTemplate, CanvasDesign } from '@/components/TemplateCanvas'

type Block = CanvasBlock
type Template = CanvasTemplate
type Design = CanvasDesign
type MinChar = { sections?: { id: string }[]; albums?: { id: string }[] }

export const uid = (p = 'x'): string =>
  p + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3)

export const DEF_DESIGN: Design = {
  bg: '#ffffff',
  bgImage: '',
  bgRepeat: 'no-repeat',
  bgSize: 'cover',
  bgAttach: 'scroll',
  maskBright: 100,
  maskBlur: 0,
  maskSat: 100,
  primary: '#c98a5e',
  font: 'noto-serif',
  fontImport: '',
  align: 'left',
  width: 'normal',
  library: ['#ffffff', '#f0e8da', '#c98a5e', '#8d7c69', '#4a3f35'],
}

export const FONT_OPTS = [
  { key: 'noto-serif', label: '思源宋體' },
  { key: 'noto-sans', label: '思源黑體' },
  { key: 'wenkai', label: '霞鶩文楷' },
  { key: 'goround', label: 'Chiron GoRound' },
  { key: 'newsreader', label: 'Newsreader（英）' },
  { key: 'outfit', label: 'Outfit（英）' },
]

export const BLOCK_TYPES: { type: string; label: string }[] = [
  { type: 'heading', label: '名稱' },
  { type: 'tagline', label: '一句話' },
  { type: 'avatar', label: '頭像' },
  { type: 'cover', label: '主視覺' },
  { type: 'section', label: '區塊' },
  { type: 'palette', label: '配色' },
  { type: 'album', label: '相簿' },
  { type: 'badges', label: '標籤' },
  { type: 'popup', label: '小視窗' },
  { type: 'text', label: '文字' },
  { type: 'marquee', label: '跑馬燈' },
  { type: 'button', label: '按鈕' },
  { type: 'columns', label: '佈局' },
  { type: 'divider', label: '分隔線' },
  { type: 'spacer', label: '間距' },
  { type: 'pagebreak', label: '分頁' },
  { type: 'nav', label: '導覽條' },
]

export const INFO_TYPES: string[] = [
  'heading', 'tagline', 'avatar', 'cover', 'section', 'palette', 'album', 'badges', 'popup',
]

export const TYPE_LABEL: Record<string, string> = Object.fromEntries(
  BLOCK_TYPES.map(b => [b.type, b.label])
)

function defaultBlockStyle(type: string): Block['style'] {
  const base: Block['style'] = { align: 'left', padding: type === 'spacer' ? 36 : 14, opacity: 100 }
  if (['heading', 'avatar', 'cover', 'tagline', 'palette'].includes(type)) base.align = 'center'
  if (type === 'cover') base.radius = 16
  return base
}

export function makeBlock(type: string, char: MinChar): Block {
  const nb: Block = { id: uid('b'), type, style: defaultBlockStyle(type) }
  if (type === 'section') nb.sourceId = char.sections?.[0]?.id
  if (type === 'album') {
    nb.sourceId = char.albums?.[0]?.id
    nb.mode = 'grid'
    nb.ratio = 'square'
    nb.cols = 3
  }
  if (type === 'text') nb.text = '輸入文字…'
  if (type === 'button') nb.text = '按鈕'
  if (type === 'marquee') nb.text = '✦ 角色名稱 ✦'
  if (type === 'columns') { nb.cols = 2; nb.widths = [50, 50]; nb.children = [[], []]; nb.valign = 'start' }
  if (type === 'badges') {
    nb.tagStyle = 'solid'
    nb.tags = [
      { id: uid('tg'), label: '原創', color: '#c98a5e' },
      { id: uid('tg'), label: '可二創', color: '#7fa86b' },
      { id: uid('tg'), label: 'R18', color: '#b1577e' },
    ]
  }
  if (type === 'popup') {
    nb.text = '看更多'; nb.title = '更多內容'
    nb.body = '在這裡寫想讓人點開才看到的內容…'; nb.popupImg = ''; nb.trigger = 'button'
  }
  return nb
}

export function mapTree(bs: Block[], id: string, fn: (b: Block) => Block): Block[] {
  return (bs || []).map(b => {
    if (b.id === id) return fn(b)
    if (b.type === 'columns' && b.children) {
      return { ...b, children: b.children.map(col => col.map(cb => cb.id === id ? fn(cb) : cb)) }
    }
    return b
  })
}

export function removeTree(bs: Block[], id: string): Block[] {
  const out: Block[] = []
  for (const b of bs || []) {
    if (b.id === id) continue
    if (b.type === 'columns' && b.children) {
      out.push({ ...b, children: b.children.map(col => col.filter(cb => cb.id !== id)) })
    } else out.push(b)
  }
  return out
}

export function detachFrom(bs: Block[], id: string): Block | null {
  for (let i = 0; i < bs.length; i++) {
    if (bs[i].id === id) return bs.splice(i, 1)[0]
    if (bs[i].type === 'columns') {
      const ch = bs[i].children || []
      for (let c = 0; c < ch.length; c++) {
        for (let j = 0; j < ch[c].length; j++) {
          if (ch[c][j].id === id) return ch[c].splice(j, 1)[0]
        }
      }
    }
  }
  return null
}

export function insertRelId(bs: Block[], toId: string, blk: Block, after: boolean): boolean {
  for (let i = 0; i < bs.length; i++) {
    if (bs[i].id === toId) { bs.splice(i + (after ? 1 : 0), 0, blk); return true }
    if (bs[i].type === 'columns') {
      const ch = bs[i].children || []
      for (let c = 0; c < ch.length; c++) {
        for (let j = 0; j < ch[c].length; j++) {
          if (ch[c][j].id === toId) { ch[c].splice(j + (after ? 1 : 0), 0, blk); return true }
        }
      }
    }
  }
  return false
}

export function findParentArr(bs: Block[], id: string): { arr: Block[]; idx: number } | null {
  for (let i = 0; i < bs.length; i++) {
    if (bs[i].id === id) return { arr: bs, idx: i }
    if (bs[i].type === 'columns') {
      const ch = bs[i].children || []
      for (let c = 0; c < ch.length; c++) {
        for (let j = 0; j < ch[c].length; j++) {
          if (ch[c][j].id === id) return { arr: ch[c], idx: j }
        }
      }
    }
  }
  return null
}

export function cloneBlk(b: Block): Block {
  const n: Block = JSON.parse(JSON.stringify(b))
  const re = (x: Block) => {
    x.id = uid(x.type || 'b')
    if (x.type === 'columns' && x.children) x.children.forEach(col => col.forEach(re))
    if (x.tags) x.tags.forEach(t => { t.id = uid('tg') })
  }
  re(n)
  return n
}

export function makePreset(kind: string, c: MinChar): { name: string; design: Design; blocks: Block[] } {
  const sid = (i: number) => c.sections?.[i]?.id
  const aid = (i: number) => c.albums?.[i]?.id
  const B = (type: string, extra: Partial<Block> = {}): Block =>
    Object.assign({ id: uid('b'), type, style: { ...defaultBlockStyle(type) } }, extra) as Block
  const tg = () => uid('tg')

  if (kind === 'card') return {
    name: '名片', design: { bg: '#ffffff', primary: '#c98a5e', font: 'noto-sans', width: 'normal' },
    blocks: [
      B('cover', { size: 'sm', style: { align: 'center', padding: 0, radius: 18, opacity: 100 } }),
      B('avatar', { size: 'md', style: { align: 'center', padding: 8, opacity: 100 } }),
      B('heading', { size: 'md', style: { align: 'center', padding: 4, opacity: 100 } }),
      B('tagline', { size: 'md', style: { align: 'center', padding: 4, opacity: 100 } }),
      B('palette', { pvar: 'dots', style: { align: 'center', padding: 12, opacity: 100 } }),
      B('section', { sourceId: sid(0), style: { align: 'left', padding: 18, custom: true, bgColor: '#f7f3ec', radius: 16, opacity: 100 } }),
    ],
  }
  if (kind === 'sheet') return {
    name: '設定集', design: { bg: '#faf6ef', primary: '#6c8db0', font: 'wenkai', width: 'wide' },
    blocks: [
      B('heading', { size: 'lg', style: { align: 'left', padding: 4, opacity: 100 } }),
      B('tagline', { size: 'md', style: { align: 'left', padding: 4, opacity: 100 } }),
      B('section', { sourceId: sid(0), style: { align: 'left', padding: 18, custom: true, bgColor: '#ffffff', radius: 16, opacity: 100 } }),
      B('section', { sourceId: sid(1), style: { align: 'left', padding: 18, custom: true, bgColor: '#ffffff', radius: 16, opacity: 100 } }),
      B('palette', { pvar: 'swatch', style: { align: 'left', padding: 14, opacity: 100 } }),
      B('section', { sourceId: sid(2), style: { align: 'left', padding: 18, custom: true, bgColor: '#ffffff', radius: 16, opacity: 100 } }),
    ],
  }
  if (kind === 'gallery') return {
    name: '圖集', design: { bg: '#1f1a17', primary: '#dca06d', font: 'noto-serif', width: 'wide' },
    blocks: [
      B('cover', { size: 'lg', style: { align: 'center', padding: 0, radius: 18, opacity: 100 } }),
      B('heading', { size: 'lg', style: { align: 'center', padding: 6, opacity: 100 } }),
      B('album', { sourceId: aid(0), mode: 'grid', ratio: 'square', cols: 3, style: { align: 'left', padding: 10, opacity: 100 } }),
      B('album', { sourceId: aid(3), mode: 'carousel', ratio: 'portrait', cols: 3, style: { align: 'left', padding: 10, opacity: 100 } }),
    ],
  }
  if (kind === 'oc') return {
    name: '介紹這隻OC', design: { bg: '#fbf4ea', primary: '#d98a5a', font: 'wenkai', width: 'normal', pageFit: 'auto' },
    blocks: [
      B('cover', { size: 'lg', style: { align: 'center', padding: 0, radius: 22, opacity: 100 } }),
      B('avatar', { size: 'lg', style: { align: 'center', padding: 10, opacity: 100 } }),
      B('heading', { size: 'lg', style: { align: 'center', padding: 4, opacity: 100 } }),
      B('tagline', { size: 'md', style: { align: 'center', padding: 4, opacity: 100 } }),
      B('badges', { tagStyle: 'solid', tags: [{ id: tg(), label: '原創角色', color: '#d98a5a' }, { id: tg(), label: '歡迎來聊', color: '#7fa86b' }], style: { align: 'center', padding: 10, opacity: 100 } }),
      B('divider', { style: { align: 'center', padding: 12, opacity: 100, borderColor: '#e7c9a8', borderWidth: 1, borderStyle: 'dashed' } }),
      B('columns', { cols: 2, widths: [60, 40], valign: 'start', style: { align: 'left', padding: 6, opacity: 100 }, children: [[B('section', { sourceId: sid(0), style: { align: 'left', padding: 18, custom: true, bgColor: '#ffffff', radius: 16, opacity: 100 } })], [B('palette', { pvar: 'swatch', style: { align: 'center', padding: 14, opacity: 100 } })]] }),
      B('section', { sourceId: sid(1), variant: 'cards', style: { align: 'left', padding: 18, opacity: 100 } }),
      B('album', { sourceId: aid(0), mode: 'grid', ratio: 'portrait', cols: 3, style: { align: 'left', padding: 10, opacity: 100 } }),
    ],
  }
  if (kind === 'project') return {
    name: '企劃介紹', design: { bg: '#f2f4f3', primary: '#5b8a72', font: 'noto-sans', width: 'wide', pageFit: 'auto' },
    blocks: [
      B('cover', { size: 'lg', style: { align: 'center', padding: 0, radius: 20, opacity: 100 } }),
      B('heading', { size: 'lg', style: { align: 'center', padding: 6, opacity: 100 } }),
      B('tagline', { size: 'lg', style: { align: 'center', padding: 4, opacity: 100 } }),
      B('badges', { tagStyle: 'solid', tags: [{ id: tg(), label: '企劃進行中', color: '#5b8a72' }, { id: tg(), label: '成員募集中', color: '#c98a5e' }], style: { align: 'center', padding: 10, opacity: 100 } }),
      B('divider', { style: { align: 'center', padding: 12, opacity: 100, borderColor: '#5b8a72', borderWidth: 1, borderStyle: 'solid' } }),
      B('columns', { cols: 3, widths: [34, 33, 33], valign: 'start', style: { align: 'left', padding: 6, opacity: 100 }, children: [[B('section', { sourceId: sid(0), style: { align: 'left', padding: 16, custom: true, bgColor: '#ffffff', radius: 14, opacity: 100 } })], [B('section', { sourceId: sid(1), style: { align: 'left', padding: 16, custom: true, bgColor: '#ffffff', radius: 14, opacity: 100 } })], [B('section', { sourceId: sid(2), style: { align: 'left', padding: 16, custom: true, bgColor: '#ffffff', radius: 14, opacity: 100 } })]] }),
      B('pagebreak', {}),
      B('heading', { size: 'md', style: { align: 'left', padding: 4, opacity: 100 } }),
      B('album', { sourceId: aid(0), mode: 'grid', ratio: 'square', cols: 4, style: { align: 'left', padding: 10, opacity: 100 } }),
      B('button', { text: '加入我們', style: { align: 'center', padding: 14, opacity: 100 } }),
    ],
  }
  if (kind === 'au') {
    const auPage = (label: string, color: string, secI: number): Block[] => [
      B('heading', { size: 'lg', style: { align: 'center', padding: 6, opacity: 100 } }),
      B('badges', { tagStyle: 'solid', tags: [{ id: tg(), label, color }], style: { align: 'center', padding: 8, opacity: 100 } }),
      B('columns', { cols: 2, widths: [48, 52], valign: 'start', style: { align: 'left', padding: 6, opacity: 100 }, children: [[B('avatar', { size: 'lg', style: { align: 'center', padding: 8, opacity: 100 } }), B('palette', { pvar: 'dots', style: { align: 'center', padding: 10, opacity: 100 } })], [B('section', { sourceId: sid(secI), style: { align: 'left', padding: 16, custom: true, bgColor: '#2a2833', radius: 16, opacity: 100 } })]] }),
    ]
    return {
      name: 'paro／AU 設定', design: { bg: '#1c1b22', primary: '#b48ad0', font: 'noto-serif', width: 'normal', pageFit: 'auto', autoNav: true },
      blocks: [B('cover', { size: 'lg', style: { align: 'center', padding: 0, radius: 20, opacity: 100 } }), B('tagline', { size: 'md', style: { align: 'center', padding: 6, opacity: 100 } }), ...auPage('原設定', '#b48ad0', 0), B('pagebreak', {}), ...auPage('AU① 現代', '#6c9bd0', 1), B('pagebreak', {}), ...auPage('AU② 奇幻', '#cf8f5a', 2)],
    }
  }
  if (kind === 'all') return {
    name: '全部積木', design: { bg: '#faf6ef', primary: '#c98a5e', font: 'wenkai', width: 'wide', pageFit: 'auto' },
    blocks: [
      B('cover', { size: 'lg', style: { align: 'center', padding: 0, radius: 18, opacity: 100 } }),
      B('avatar', { size: 'md', style: { align: 'center', padding: 8, opacity: 100 } }),
      B('heading', { size: 'lg', style: { align: 'center', padding: 4, opacity: 100 } }),
      B('tagline', { size: 'md', style: { align: 'center', padding: 4, opacity: 100 } }),
      B('badges', { tagStyle: 'solid', tags: [{ id: tg(), label: '原創', color: '#c98a5e' }, { id: tg(), label: '可二創', color: '#7fa86b' }, { id: tg(), label: '禁商用', color: '#b1577e' }], style: { align: 'center', padding: 8, opacity: 100 } }),
      B('divider', { style: { align: 'center', padding: 10, opacity: 100, borderColor: '#c98a5e', borderWidth: 1, borderStyle: 'solid' } }),
      B('columns', { cols: 2, widths: [58, 42], valign: 'start', style: { align: 'left', padding: 6, opacity: 100 }, children: [[B('section', { sourceId: sid(0), style: { align: 'left', padding: 18, custom: true, bgColor: '#ffffff', radius: 16, opacity: 100 } })], [B('palette', { pvar: 'swatch', style: { align: 'center', padding: 14, opacity: 100 } }), B('popup', { trigger: 'button', text: '看更多設定', title: '更多內容', body: '這裡放點開後才顯示的補充設定。', popupImg: '', style: { align: 'center', padding: 8, opacity: 100 } })]] }),
      B('section', { sourceId: sid(1), variant: 'cards', style: { align: 'left', padding: 18, opacity: 100 } }),
      B('text', { text: '這是一段自由文字積木，可放任何補充說明或引言。', style: { align: 'left', padding: 8, opacity: 100 } }),
      B('spacer', { style: { align: 'left', padding: 28, opacity: 100 } }),
      B('button', { text: '聯絡我', style: { align: 'center', padding: 8, opacity: 100 } }),
      B('pagebreak', {}),
      B('nav', { style: { align: 'center', padding: 10, opacity: 100 } }),
      B('heading', { size: 'md', style: { align: 'left', padding: 4, opacity: 100 } }),
      B('album', { sourceId: aid(0), mode: 'grid', ratio: 'square', cols: 3, style: { align: 'left', padding: 10, opacity: 100 } }),
      B('album', { sourceId: aid(3), mode: 'carousel', ratio: 'portrait', cols: 3, style: { align: 'left', padding: 10, opacity: 100 } }),
      B('section', { sourceId: sid(2), style: { align: 'left', padding: 18, custom: true, bgColor: '#ffffff', radius: 16, opacity: 100 } }),
    ],
  }
  return { name: '新模板', design: {}, blocks: [] }
}

export function newTemplate(kind: string, c: MinChar): Template {
  const made = makePreset(kind, c)
  return { id: uid('t'), name: made.name, design: { ...DEF_DESIGN, ...made.design }, blocks: made.blocks }
}

export const PRESET_CARDS = [
  { kind: 'card',    title: '名片',           desc: '頭像、名稱、一句話、配色——最精簡的自我介紹。' },
  { kind: 'sheet',   title: '設定集',         desc: '標題＋多個資料區塊＋配色，完整的角色設定頁。' },
  { kind: 'gallery', title: '圖集',           desc: '深色背景，以大圖與相簿為主的視覺展示。' },
  { kind: 'oc',      title: '介紹這隻 OC',   desc: '雙欄圖文、標籤、相簿，適合社群自介。' },
  { kind: 'project', title: '企劃介紹',       desc: '三欄資訊＋主視覺，介紹一個團體或世界觀企劃。' },
  { kind: 'au',      title: 'paro／AU 設定', desc: '深色多頁，原設定與多個 AU 分頁切換。' },
  { kind: 'all',     title: '全部積木',       desc: '把所有積木種類放進來，當作功能總覽範例。' },
]
