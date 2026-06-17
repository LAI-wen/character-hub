import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { ContextHeader } from '@/components/ContextHeader'
import { AvatarCropperModal } from '@/components/AvatarCropperModal'
import { EyedropperModal } from '@/components/EyedropperModal'
import { AnnotationModal } from '@/components/AnnotationModal'
import { CharBackupModal } from '@/components/CharBackupModal'
import { CharacterStoreProvider, useCharacterStore } from '@/store/useCharacterStore'
import { FormPage } from '@/features/charEdit/FormPage'
import { DesignPage } from '@/features/charEdit/DesignPage'
import { apiClient } from '@/lib/api/client'
import { compressImage } from '@/lib/compressImage'

type View = 'form' | 'design'

function CharacterEditInner({ charId }: { charId: string }) {
  const [view, setView] = useState<View>('form')

  const {
    ui, character,
    closeEyedrop, addSwatchHex,
    closeCropper, updateCore, setPreview,
    closeAnnot, setAnnotations,
    closeFormTpl, exportChar, importCharFile, importCharacter,
  } = useCharacterStore()

  const annotTarget = ui.annot
    ? character.albums
        .flatMap(al => al.images.map(im => ({ al, im })))
        .find(x => x.al.id === ui.annot!.aid && x.im.id === ui.annot!.iid)
    : null

  const handleCropComplete = async (file: File) => {
    const compressed = await compressImage(file)
    const form = new FormData()
    form.append('file', compressed)
    const res = await apiClient<{ avatarUrl: string }>(`/api/app/characters/${charId}/avatar`, { method: 'POST', body: form })
    if (res.avatarUrl) updateCore('avatarUrl', res.avatarUrl)
  }

  return (
    <div className="page">
      <ContextHeader
        scope="account"
        crumbs={[
          { label: '我的角色', href: '/characters' },
          { label: character.name || '…', href: `/characters/${charId}` },
          '編輯',
        ]}
      />

      {/* view toggle */}
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 11, width: 'fit-content', margin: '0 0 20px' }}>
        <button
          onClick={() => setView('form')}
          style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 8, padding: '8px 16px', background: view === 'form' ? 'var(--accent)' : 'transparent', color: view === 'form' ? '#fff' : 'var(--text-dim)' }}
        >
          編輯資料
        </button>
        <button
          onClick={() => setView('design')}
          style={{ fontFamily: 'inherit', fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', borderRadius: 8, padding: '8px 16px', background: view === 'design' ? 'var(--accent)' : 'transparent', color: view === 'design' ? '#fff' : 'var(--text-dim)' }}
        >
          模板與展示
        </button>
      </div>

      {view === 'form' ? <FormPage /> : <DesignPage />}

      {ui.preview ? (
        <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out' }}>
          <img src={ui.preview} alt="" style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
        </div>
      ) : null}

      {ui.eyedrop ? (
        <EyedropperModal
          avatarUrl={character.avatarUrl}
          mainVisualUrl={character.mainVisualUrl}
          albums={character.albums}
          onAddSwatch={hex => { addSwatchHex(hex); closeEyedrop() }}
          onClose={closeEyedrop}
        />
      ) : null}

      {ui.cropField ? (
        <AvatarCropperModal
          onClose={closeCropper}
          onComplete={handleCropComplete}
        />
      ) : null}

      {annotTarget ? (
        <AnnotationModal
          imageUrl={annotTarget.im.url}
          initialAnnotations={annotTarget.im.annotations}
          onUpdate={anns => setAnnotations(annotTarget.al.id, annotTarget.im.id, anns)}
          onClose={closeAnnot}
        />
      ) : null}

      {ui.formTpl ? (
        <CharBackupModal
          charName={character.name}
          sections={character.sections}
          onExport={exportChar}
          onImport={importCharFile}
          onApplySections={secs => importCharacter({ ...character, sections: secs as typeof character.sections })}
          onClose={closeFormTpl}
        />
      ) : null}
    </div>
  )
}

export function CharacterEditPage() {
  const { charId } = useParams<{ charId: string }>()
  if (!charId) return null
  return (
    <CharacterStoreProvider charId={charId}>
      <CharacterEditInner charId={charId} />
    </CharacterStoreProvider>
  )
}
