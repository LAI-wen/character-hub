import { useRef, useState, type CSSProperties } from 'react'
import { uid } from '@/lib/uid'

export type AnnotationKind = 'pin' | 'rect'

export interface Annotation {
  id: string
  kind: AnnotationKind
  x: number
  y: number
  w?: number
  h?: number
  label: string
  note: string
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

interface Props {
  imageUrl: string
  initialAnnotations: Annotation[]
  onUpdate: (anns: Annotation[]) => void
  onClose: () => void
}

export function AnnotationModal({ imageUrl, initialAnnotations, onUpdate, onClose }: Props) {
  const [anns, setAnns] = useState<Annotation[]>(initialAnnotations)
  const [mode, setMode] = useState<'pin' | 'rect'>('pin')
  const [drawing, setDrawing] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const surf = useRef<HTMLDivElement>(null)

  const update = (next: Annotation[]) => { setAnns(next); onUpdate(next) }

  const norm = (e: React.PointerEvent) => {
    const r = surf.current!.getBoundingClientRect()
    return { nx: clamp01((e.clientX - r.left) / r.width), ny: clamp01((e.clientY - r.top) / r.height) }
  }

  const onDown = (e: React.PointerEvent) => {
    const { nx, ny } = norm(e)
    if (mode === 'pin') {
      update([...anns, { id: uid(), kind: 'pin', x: nx, y: ny, label: '', note: '' }])
    } else {
      try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
      setDrawing({ x0: nx, y0: ny, x1: nx, y1: ny })
    }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drawing) return
    const { nx, ny } = norm(e)
    setDrawing((d) => (d ? { ...d, x1: nx, y1: ny } : d))
  }
  const onUp = () => {
    const d = drawing
    setDrawing(null)
    if (!d) return
    const x = Math.min(d.x0, d.x1)
    const y = Math.min(d.y0, d.y1)
    const w = Math.abs(d.x1 - d.x0)
    const h = Math.abs(d.y1 - d.y0)
    if (w > 0.02 && h > 0.02) update([...anns, { id: uid(), kind: 'rect', x, y, w, h, label: '', note: '' }])
  }

  const patch = (id: string, key: 'label' | 'note', val: string) =>
    update(anns.map((a) => (a.id === id ? { ...a, [key]: val } : a)))

  const remove = (id: string) => update(anns.filter((a) => a.id !== id))

  const tab = (m: 'pin' | 'rect', label: string) => (
    <button onClick={() => setMode(m)} style={{
      fontFamily: 'inherit', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 8, padding: '7px 13px',
      background: mode === m ? 'var(--accent)' : 'transparent', color: mode === m ? '#fff' : 'var(--text-dim)',
    }}>{label}</button>
  )

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,16,13,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 22, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', maxWidth: 980, width: '100%', maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 17, margin: 0, color: 'var(--text)' }}>圖片標記</h2>
            <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 11 }}>
              {tab('pin', '＋ Pin')}
              {tab('rect', '▭ 框選')}
            </div>
          </div>
          <button aria-label="關閉" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 17 }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 18, padding: 20, overflowY: 'auto', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
            <div ref={surf} style={{ position: 'relative', display: 'inline-block', lineHeight: 0, touchAction: 'none', cursor: 'crosshair', maxWidth: '100%' }}
              onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
              <img src={imageUrl} alt="" draggable={false}
                style={{ display: 'block', maxHeight: '54vh', maxWidth: '100%', borderRadius: 10, border: '1px solid var(--border)' }} />
              {anns.map((an, i) =>
                an.kind === 'pin' ? (
                  <span key={an.id} style={{ position: 'absolute', left: `${an.x * 100}%`, top: `${an.y * 100}%`, transform: 'translate(-50%,-50%)', width: 24, height: 24, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, border: '2px solid #fff', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' } as CSSProperties}>
                    {i + 1}
                  </span>
                ) : (
                  <span key={an.id} style={{ position: 'absolute', left: `${an.x * 100}%`, top: `${an.y * 100}%`, width: `${(an.w || 0) * 100}%`, height: `${(an.h || 0) * 100}%`, border: '2px solid var(--accent)', borderRadius: 6, background: 'rgba(201,138,94,0.16)' } as CSSProperties}>
                    <span style={{ position: 'absolute', left: -9, top: -9, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, border: '2px solid #fff' }}>{i + 1}</span>
                  </span>
                )
              )}
              {drawing && (
                <div style={{ position: 'absolute', left: `${Math.min(drawing.x0, drawing.x1) * 100}%`, top: `${Math.min(drawing.y0, drawing.y1) * 100}%`, width: `${Math.abs(drawing.x1 - drawing.x0) * 100}%`, height: `${Math.abs(drawing.y1 - drawing.y0) * 100}%`, border: '2px dashed var(--accent)', background: 'rgba(201,138,94,0.16)' }} />
              )}
            </div>
          </div>

          <div style={{ width: 300, flexShrink: 0 }}>
            <p style={{ fontSize: 12.5, color: 'var(--text-dim)', margin: '0 0 12px', lineHeight: 1.6 }}>
              選上方工具，在圖片上點 Pin 或拖出矩形；右側填寫每個標記的標題與說明。
            </p>
            {anns.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {anns.map((an, i) => (
                  <div key={an.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                      <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)', background: 'var(--surface)', borderRadius: 6, padding: '2px 7px' }}>{an.kind === 'pin' ? 'Pin' : '框選'}</span>
                      <button aria-label="刪除標記" onClick={() => remove(an.id)} style={{ marginLeft: 'auto', width: 26, height: 26, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}>×</button>
                    </div>
                    <input value={an.label} onChange={(e) => patch(an.id, 'label', e.target.value)}
                      placeholder="標記標題"
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', outline: 'none', marginBottom: 6 }} />
                    <textarea value={an.note} onChange={(e) => patch(an.id, 'note', e.target.value)}
                      placeholder="說明…"
                      style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 13, lineHeight: 1.6, color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', outline: 'none', minHeight: 48, resize: 'vertical' }} />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ border: '1.5px dashed var(--border)', borderRadius: 12, padding: 22, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                選上方工具，在圖片上點 Pin 或拖出矩形
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
