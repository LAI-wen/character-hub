import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ContextHeader } from '@/components/ContextHeader'
import { AvatarCropperModal } from '@/components/AvatarCropperModal'
import { EyedropperModal } from '@/components/EyedropperModal'
import { AnnotationModal } from '@/components/AnnotationModal'
import { CharBackupModal } from '@/components/CharBackupModal'
import { CharacterStoreProvider, useCharacterStore } from '@/store/useCharacterStore'
import { PageLoading } from '@/components/LoadingSpinner'
import { FormPage } from '@/features/charEdit/FormPage'
import { DesignPage } from '@/features/charEdit/DesignPage'
import { apiClient } from '@/lib/api/client'
import { compressImage } from '@/lib/compressImage'
import { useProjectContext } from '@/routes/layouts/ProjectLayout'
import type { ProjectCharacterLinkResponse } from '@oc-tools/contracts'

type View = 'form' | 'design'

const inputStyle = {
  flex: 1, minWidth: 0, boxSizing: 'border-box' as const, fontFamily: 'inherit', fontSize: 14,
  color: 'var(--text)', background: 'var(--bg-3)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '9px 12px', outline: 'none',
}

function ProjectLinkCard({ projectId, linkId }: { projectId: string; linkId: string }) {
  const [projectRole, setProjectRole] = useState('')
  const [factionLabel, setFactionLabel] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (loaded) return
    apiClient<ProjectCharacterLinkResponse>(`/api/app/projects/${projectId}/characters/${linkId}`)
      .then(d => {
        setProjectRole(d.projectLink?.projectRole ?? '')
        setFactionLabel(d.projectLink?.factionLabel ?? '')
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [projectId, linkId, loaded])

  const save = async () => {
    await apiClient(`/api/app/projects/${projectId}/characters/${linkId}`, {
      method: 'PATCH',
      body: { projectRole: projectRole || null, factionLabel: factionLabel || null },
    })
  }

  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 12, letterSpacing: '0.04em', textTransform: 'uppercase' }}>項目角色資訊</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>角色定位</div>
          <input value={projectRole} onChange={e => setProjectRole(e.target.value)} placeholder="例：主角、對立角" style={inputStyle} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>所屬勢力</div>
          <input value={factionLabel} onChange={e => setFactionLabel(e.target.value)} placeholder="例：帝國軍、反抗軍" style={inputStyle} />
        </div>
      </div>
      <button onClick={save} style={{ fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, color: 'var(--accent)', background: 'var(--accent-soft)', border: 'none', borderRadius: 9, padding: '7px 14px', cursor: 'pointer' }}>
        儲存項目資訊
      </button>
    </div>
  )
}

function CharacterEditInner({ charId, projectId, linkId }: { charId: string; projectId: string; linkId: string }) {
  const [view, setView] = useState<View>('form')
  const { project } = useProjectContext()

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
        .find(x => x.al.id === ui.annot?.aid && x.im.id === ui.annot?.iid)
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
        scope="project"
        crumbs={[
          { label: project?.name ?? '…', href: `/p/${projectId}` },
          { label: '角色列表', href: `/p/${projectId}/roster` },
          { label: character.name || '…', href: `/p/${projectId}/roster/${linkId}` },
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

      {view === 'form' ? (
        <>
          <ProjectLinkCard projectId={projectId} linkId={linkId} />
          <FormPage />
        </>
      ) : (
        <DesignPage />
      )}

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

function ProjectCharacterEditLoader() {
  const { projectId, linkId } = useParams<{ projectId: string; linkId: string }>()

  const { data, status } = useQuery({
    queryKey: ['project', projectId, 'roster', linkId],
    queryFn: () => apiClient<ProjectCharacterLinkResponse>(`/api/app/projects/${projectId}/characters/${linkId}`),
    enabled: !!projectId && !!linkId,
  })

  if (status === 'pending') return <PageLoading />
  if (status === 'error' || !data?.character?.id) return <div className="page"><div style={{ padding: 40, color: 'var(--text-dim)' }}>找不到角色</div></div>

  const charId = data.character.id

  return (
    <CharacterStoreProvider charId={charId}>
      <CharacterEditInner charId={charId} projectId={projectId!} linkId={linkId!} />
    </CharacterStoreProvider>
  )
}

export function CharacterEditPage() {
  return <ProjectCharacterEditLoader />
}
