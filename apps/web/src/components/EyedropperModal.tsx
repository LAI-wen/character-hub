import { useRef, useState } from 'react'

interface Props {
  avatarUrl: string
  mainVisualUrl: string
  albums: { images: { url: string }[] }[]
  onAddSwatch: (hex: string) => void
  onClose: () => void
}

function collectSources(avatarUrl: string, mainVisualUrl: string, albums: { images: { url: string }[] }[]): string[] {
  const out: string[] = []
  if (avatarUrl) out.push(avatarUrl)
  if (mainVisualUrl) out.push(mainVisualUrl)
  albums.forEach((a) => a.images.forEach((im) => im.url && out.push(im.url)))
  return Array.from(new Set(out))
}

function loadImageWithCORS(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export function EyedropperModal({ avatarUrl, mainVisualUrl, albums, onAddSwatch, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [taint, setTaint] = useState(false)
  const imgRef = useRef<HTMLImageElement | null>(null)

  const sources = collectSources(avatarUrl, mainVisualUrl, albums)

  const pickFromUrl = async (u: string) => {
    setTaint(false)
    setUrl(u)
    try { imgRef.current = await loadImageWithCORS(u) } catch { imgRef.current = null }
  }

  const upload = () => {
    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = 'image/*'
    inp.onchange = () => {
      const file = inp.files?.[0]
      if (!file) return
      const fr = new FileReader()
      fr.onload = () => {
        const u = String(fr.result)
        setTaint(false)
        setUrl(u)
        const img = new Image()
        img.onload = () => { imgRef.current = img }
        img.src = u
      }
      fr.readAsDataURL(file)
    }
    inp.click()
  }

  const onPick = (e: React.MouseEvent<HTMLImageElement>) => {
    const disp = e.currentTarget
    if (!disp.naturalWidth) return
    const r = disp.getBoundingClientRect()
    const fx = (e.clientX - r.left) / r.width
    const fy = (e.clientY - r.top) / r.height
    const src = imgRef.current?.complete && imgRef.current.naturalWidth ? imgRef.current : disp
    const cv = document.createElement('canvas')
    cv.width = src.naturalWidth
    cv.height = src.naturalHeight
    const ctx = cv.getContext('2d')!
    ctx.drawImage(src, 0, 0)
    try {
      const p = ctx.getImageData(Math.floor(fx * cv.width), Math.floor(fy * cv.height), 1, 1).data
      const hex = '#' + [p[0], p[1], p[2]].map((n) => n.toString(16).padStart(2, '0')).join('')
      onAddSwatch(hex)
    } catch {
      setTaint(true)
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 85, background: 'rgba(20,16,13,0.55)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.4)', maxWidth: 560, width: '100%', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <h2 style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 17, margin: 0, color: 'var(--text)' }}>圖片吸色</h2>
          <button aria-label="關閉" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 17 }}>×</button>
        </div>

        {url ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 12px' }}>在圖片上點一下，取色加入配色。</p>
            <img src={url} alt="" onClick={onPick} draggable={false}
              style={{ maxWidth: '100%', maxHeight: '48vh', display: 'block', margin: '0 auto', borderRadius: 12, border: '1px solid var(--border)', cursor: 'crosshair' }} />
            {taint && <p style={{ fontSize: 12, color: '#c0584f', textAlign: 'center', margin: '10px 0 0' }}>這張圖無法吸色（跨網域限制），請改用「上傳圖片」。</p>}
            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button onClick={upload} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--text-dim)', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer' }}>
                上傳其他圖片
              </button>
            </div>
          </>
        ) : sources.length ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: '0 0 10px' }}>選一張角色圖片來吸色，或上傳新圖片。</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(74px,1fr))', gap: 8, marginBottom: 14, maxHeight: 240, overflowY: 'auto' }}>
              {sources.map((s, i) => (
                <button key={i} onClick={() => pickFromUrl(s)}
                  style={{ padding: 0, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', aspectRatio: '1 / 1', background: 'var(--surface-2)' }}>
                  <img src={s} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={upload} style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 11, padding: '10px 20px', cursor: 'pointer' }}>
                上傳新圖片
              </button>
            </div>
          </>
        ) : (
          <div style={{ border: '1.5px dashed var(--border)', borderRadius: 14, padding: '44px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
            <p style={{ margin: '0 0 16px', fontSize: 14 }}>上傳一張圖片，點選即可取出顏色</p>
            <button onClick={upload} style={{ fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: '#fff', background: 'var(--accent)', border: 'none', borderRadius: 11, padding: '11px 22px', cursor: 'pointer' }}>
              選擇圖片
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
