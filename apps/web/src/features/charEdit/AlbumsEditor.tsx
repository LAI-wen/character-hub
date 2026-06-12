import { useCharacterStore } from '@/store/useCharacterStore'
import type { AlbumKind } from '@/store/useCharacterStore'
import { Icon } from '@/components/Icon'
import { Card, CardHead, softBtn } from './FormControls'

const smallInput = { width: '100%', boxSizing: 'border-box' as const, fontFamily: 'inherit', fontSize: 13, color: 'var(--text)', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', outline: 'none' }

export function AlbumsEditor({ kind }: { kind: AlbumKind }) {
  const { character, ui, addAlbum, updateAlbum, removeAlbum, toggleAlbumCollapse, addImage, updateImage, removeImage, setPreview, uploadManyImages, uploadAlbumImage, openAnnot } = useCharacterStore()
  const albums = character.albums.filter((a) => kind === 'ref' ? a.kind === 'ref' : a.kind !== 'ref')
  const refOpts = [{ value: '', label: '不關聯' }].concat(character.albums.filter((a) => a.kind === 'ref').map((a) => ({ value: a.id, label: a.name || '設定相簿' })))
  const title = kind === 'ref' ? '設定相簿' : '圖庫・作品'
  const badge = kind === 'ref' ? '官方設定' : '作品'

  return (
    <Card>
      <CardHead icon={<Icon name="images" size={15} />} title={title}
        right={<button style={softBtn()} onClick={() => addAlbum(kind)}><Icon name="plus" size={14} /> {kind === 'ref' ? '設定相簿' : '相簿'}</button>}
      />
      <div style={{ marginTop: -8, marginBottom: 14 }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '0.04em', color: kind === 'ref' ? '#fff' : 'var(--accent)', background: kind === 'ref' ? 'var(--accent)' : 'transparent', border: kind === 'ref' ? 'none' : '1.5px solid var(--accent)', borderRadius: 999, padding: '3px 9px' }}>
          {badge}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {albums.map((al) => {
          const collapsed = !!ui.albClosed[al.id]
          return (
            <div key={al.id} style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 15, background: 'var(--bg-3)' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
                <button onClick={() => toggleAlbumCollapse(al.id)} title="展開／收合相簿"
                  style={{ flexShrink: 0, width: 30, height: 34, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', borderRadius: 9, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name={collapsed ? 'chevDown' : 'chevUp'} size={16} />
                </button>
                <input value={al.name} onChange={(e) => updateAlbum(al.id, 'name', e.target.value)} placeholder="相簿名稱"
                  style={{ flex: 1, minWidth: 130, fontFamily: 'inherit', fontWeight: 700, fontSize: 15, color: 'var(--text)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 9, padding: '8px 11px', outline: 'none' }} />
                <span style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: 'var(--text-2)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 8px' }}>
                  {al.images.length} 張
                </span>
                <button title="一次選多張圖片批次上傳" style={{ ...softBtn(), background: 'var(--bg-2)', color: 'var(--text-2)', border: '1px solid var(--border)' }} onClick={() => uploadManyImages(al.id)}>
                  <Icon name="upload" size={14} /> 上傳多張
                </button>
                <button style={softBtn()} onClick={() => addImage(al.id)}><Icon name="plus" size={14} /> 圖片</button>
                <button onClick={() => removeAlbum(al.id)}
                  style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 9, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer' }}>
                  <Icon name="trash" size={15} />
                </button>
              </div>

              {!collapsed && kind !== 'ref' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 700, whiteSpace: 'nowrap' }}>關聯設定 <span style={{ fontWeight: 400, opacity: 0.75 }}>（選填）</span></span>
                  <select value={al.linkRef || ''} onChange={(e) => updateAlbum(al.id, 'linkRef', e.target.value)}
                    style={{ flex: 1, minWidth: 0, fontFamily: 'inherit', fontSize: 12.5, color: 'var(--text)', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 9px', outline: 'none', cursor: 'pointer' }}>
                    {refOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              ) : null}

              {collapsed ? (
                <div onClick={() => toggleAlbumCollapse(al.id)} style={{ border: '1px dashed var(--border)', borderRadius: 11, padding: 11, textAlign: 'center', color: 'var(--text-2)', fontSize: 12.5, cursor: 'pointer' }}>
                  已收合 · 共 {al.images.length} 張圖片（點此展開）
                </div>
              ) : al.images.length === 0 ? (
                <div style={{ border: '1.5px dashed var(--border)', borderRadius: 11, padding: 18, textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
                  這個相簿還沒有圖片
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {al.images.map((im) => (
                    <div key={im.id} style={{ display: 'flex', gap: 9, alignItems: 'center', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 12, padding: 9 }}>
                      <div onClick={() => im.url && setPreview(im.url)} title="點擊放大預覽"
                        style={{ width: 50, height: 50, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'var(--accent-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: im.url ? 'zoom-in' : 'default' }}>
                        {im.url ? <img src={im.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 16, opacity: 0.5 }}>❀</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <input value={im.url} onChange={(e) => updateImage(al.id, im.id, 'url', e.target.value)} placeholder="圖片 URL https://…" style={smallInput} />
                        <input value={im.caption} onChange={(e) => updateImage(al.id, im.id, 'caption', e.target.value)} placeholder="說明（選填）" style={smallInput} />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => uploadAlbumImage(al.id, im.id)}
                          style={{ fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                          <Icon name="upload" size={13} /> 上傳
                        </button>
                        {kind === 'ref' ? (
                          <button onClick={() => openAnnot(al.id, im.id)}
                            style={{ fontSize: 12, fontWeight: 700, color: im.annotations.length ? '#fff' : 'var(--text-2)', background: im.annotations.length ? 'var(--accent)' : 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', cursor: 'pointer', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5, justifyContent: 'center' }}>
                            <Icon name="pin" size={13} /> 標記 {im.annotations.length || ''}
                          </button>
                        ) : null}
                        <button onClick={() => removeImage(al.id, im.id)}
                          style={{ width: '100%', height: 28, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-2)', color: 'var(--text-2)', cursor: 'pointer', fontSize: 14 }}>×</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {albums.length === 0 ? (
          <div style={{ border: '1.5px dashed var(--border)', borderRadius: 14, padding: 24, textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
            還沒有{title}，點右上新增一本
          </div>
        ) : null}
      </div>
    </Card>
  )
}
