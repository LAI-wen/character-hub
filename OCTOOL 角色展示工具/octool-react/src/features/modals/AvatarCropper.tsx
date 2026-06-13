import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useOctool } from '../../store/useOctool'
import { pickRawImage } from '../../data/upload'

interface CropState {
  src: string
  img: HTMLImageElement
  natW: number
  natH: number
  zoom: number
  ox: number
  oy: number
}

const V = 300 // crop viewport (px)

export function AvatarCropper() {
  const { ui, updateCore, closeCropper } = useOctool()
  const [crop, setCrop] = useState<CropState | null>(null)
  const drag = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null)
  const started = useRef(false)

  // on open: pick a file, then initialise the crop view
  useEffect(() => {
    if (!ui.cropField) {
      started.current = false
      setCrop(null)
      return
    }
    if (started.current) return
    started.current = true
    pickRawImage((url, img) => {
      const base = V / Math.min(img.naturalWidth, img.naturalHeight)
      const ox = (V - img.naturalWidth * base) / 2
      const oy = (V - img.naturalHeight * base) / 2
      setCrop({ src: url, img, natW: img.naturalWidth, natH: img.naturalHeight, zoom: 1, ox, oy })
    })
    // if the user cancels the file dialog, nothing happens; they can close the modal
  }, [ui.cropField])

  if (!ui.cropField) return null

  const onDown = (e: React.PointerEvent) => {
    if (!crop) return
    drag.current = { sx: e.clientX, sy: e.clientY, ox: crop.ox, oy: crop.oy }
    try {
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    } catch {
      /* noop */
    }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !crop) return
    const ds = (V / Math.min(crop.natW, crop.natH)) * crop.zoom
    const imgW = crop.natW * ds
    const imgH = crop.natH * ds
    let ox = drag.current.ox + (e.clientX - drag.current.sx)
    let oy = drag.current.oy + (e.clientY - drag.current.sy)
    ox = Math.min(0, Math.max(V - imgW, ox))
    oy = Math.min(0, Math.max(V - imgH, oy))
    setCrop({ ...crop, ox, oy })
  }
  const onUp = () => {
    drag.current = null
  }
  const onZoom = (z: number) => {
    if (!crop) return
    const base = V / Math.min(crop.natW, crop.natH)
    const dsOld = base * crop.zoom
    const cx = (V / 2 - crop.ox) / dsOld
    const cy = (V / 2 - crop.oy) / dsOld
    const dsNew = base * z
    let ox = V / 2 - cx * dsNew
    let oy = V / 2 - cy * dsNew
    const imgW = crop.natW * dsNew
    const imgH = crop.natH * dsNew
    ox = Math.min(0, Math.max(V - imgW, ox))
    oy = Math.min(0, Math.max(V - imgH, oy))
    setCrop({ ...crop, zoom: z, ox, oy })
  }
  const confirm = () => {
    if (!crop) return
    const ds = (V / Math.min(crop.natW, crop.natH)) * crop.zoom
    const size = V / ds
    const x0 = (0 - crop.ox) / ds
    const y0 = (0 - crop.oy) / ds
    const OUT = 512
    const cv = document.createElement('canvas')
    cv.width = OUT
    cv.height = OUT
    cv.getContext('2d')!.drawImage(crop.img, x0, y0, size, size, 0, 0, OUT, OUT)
    let url: string
    try {
      url = cv.toDataURL('image/jpeg', 0.9)
    } catch {
      url = crop.src
    }
    updateCore(ui.cropField!, url)
    closeCropper()
  }

  const imgStyle: CSSProperties = crop
    ? {
        position: 'absolute',
        left: crop.ox,
        top: crop.oy,
        width: crop.natW * (V / Math.min(crop.natW, crop.natH)) * crop.zoom,
        height: crop.natH * (V / Math.min(crop.natW, crop.natH)) * crop.zoom,
        maxWidth: 'none',
        userSelect: 'none',
      }
    : {}

  return (
    <div
      onClick={closeCropper}
      style={{ position: 'fixed', inset: 0, zIndex: 75, background: 'rgba(40,32,26,0.6)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--bg-2)', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', width: '100%', maxWidth: 360, padding: 22 }}>
        <h2 style={{ fontFamily: "'Newsreader', serif", fontWeight: 600, fontSize: 18, margin: '0 0 4px', color: 'var(--text)' }}>裁切頭像</h2>
        <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '0 0 16px' }}>拖曳移動、滑桿縮放，框內就是頭像範圍。</p>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div
            style={{ position: 'relative', width: V, height: V, borderRadius: 14, overflow: 'hidden', background: '#2a221e', cursor: 'grab', touchAction: 'none' }}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
          >
            {crop ? <img src={crop.src} alt="" draggable={false} style={imgStyle} /> : (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13 }}>選擇圖片中…</div>
            )}
            <div style={{ position: 'absolute', inset: 0, boxShadow: '0 0 0 9999px rgba(20,16,13,0.5)', borderRadius: '50%', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', inset: 0, border: '2px solid rgba(255,255,255,0.85)', borderRadius: '50%', pointerEvents: 'none' }} />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700 }}>縮放</span>
          <input type="range" min={1} max={3} step={0.01} value={crop?.zoom ?? 1} onChange={(e) => onZoom(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--accent)' }} />
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={closeCropper} style={{ flex: 1, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text-2)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 11, padding: 11, cursor: 'pointer' }}>
            取消
          </button>
          <button onClick={confirm} disabled={!crop} style={{ flex: 1, fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 11, padding: 11, cursor: crop ? 'pointer' : 'default', opacity: crop ? 1 : 0.5 }}>
            套用
          </button>
        </div>
      </div>
    </div>
  )
}
