import { useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { charColor } from "@/lib/charColor"
import type { CharacterResponse } from "@oc-tools/contracts"

const Schema = z.object({
  name:       z.string().min(1, "必填"),
  species:    z.string().max(100).optional(),
  summary:    z.string().max(5000).optional(),
  tagsRaw:    z.string().optional(),
  visibility: z.enum(["private", "unlisted", "public"]),
})
type Fields = z.infer<typeof Schema>

export function CharacterEditPage() {
  const { charId } = useParams<{ charId: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const avatarRef = useRef<HTMLInputElement>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const { data } = useQuery({
    queryKey: ["character", charId],
    queryFn: () => apiClient<CharacterResponse>(`/api/app/characters/${charId}`),
    enabled: !!charId,
  })
  const character = data?.character

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<Fields>({
    resolver: zodResolver(Schema),
    defaultValues: { visibility: "private" },
  })

  useEffect(() => {
    if (character) {
      reset({
        name: character.name,
        species: character.species ?? "",
        summary: character.summary ?? "",
        tagsRaw: (character.tags ?? []).join(", "),
        visibility: (character.visibility as Fields["visibility"]) ?? "private",
      })
    }
  }, [character, reset])

  const mutation = useMutation({
    mutationFn: (data: Fields) => apiClient<CharacterResponse>(`/api/app/characters/${charId}`, {
      method: "PATCH",
      body: {
        name: data.name,
        species: data.species || undefined,
        summary: data.summary || undefined,
        tags: data.tagsRaw ? data.tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : [],
        visibility: data.visibility,
      },
    }),
    onSuccess: (res) => {
      qc.setQueryData(["character", charId], res)
      navigate(`/characters/${charId}`)
    },
  })

  const name = watch("name") ?? ""
  const color = character ? charColor(character.id) : "#8A857C"

  async function handleAvatarFile(files: FileList | null) {
    if (!files || !files[0] || !charId) return
    setAvatarUploading(true)
    try {
      const form = new FormData()
      form.append("file", files[0])
      await apiClient(`/api/app/characters/${charId}/avatar`, { method: "POST", body: form })
      qc.invalidateQueries({ queryKey: ["character", charId] })
      qc.invalidateQueries({ queryKey: ["characters"] })
    } finally {
      setAvatarUploading(false)
      if (avatarRef.current) avatarRef.current.value = ""
    }
  }

  function copyUrl() {
    if (character?.slug && character.visibility !== "private") {
      navigator.clipboard.writeText(`${window.location.origin}/c/${character.slug}`)
    }
  }

  return (
    <div className="page narrow">
      <ContextHeader scope="account" crumbs={["我的角色", character?.name ?? "…", "編輯"]} />

      <div className="ed-top">
        <div className="av-upload" onClick={() => avatarRef.current?.click()} title="更換頭像">
          {character?.avatarUrl
            ? <img src={character.avatarUrl} alt={name} className="av-img" />
            : <div className="av" style={{ background: color }}>{name.slice(0, 1) || "？"}</div>
          }
          <div className="av-overlay">{avatarUploading ? "…" : "📷"}</div>
        </div>
        <input ref={avatarRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: "none" }} onChange={e => handleAvatarFile(e.target.files)} />
        <div className="nm">{name || "…"}</div>
        <div className="spacer" />
        {mutation.isError && <span className="savest err">儲存失敗</span>}
        {character?.visibility !== "private" && (
          <button type="button" className="btn btn-ghost" style={{ fontSize: 13 }} onClick={copyUrl}>複製公開網址</button>
        )}
        <Link to={`/characters/${charId}`} className="btn btn-ghost">取消</Link>
        <button form="char-edit-acc-form" className="btn btn-accent" disabled={mutation.isPending || !isDirty}>
          {mutation.isPending ? "儲存中…" : "儲存"}
        </button>
      </div>

      <form id="char-edit-acc-form" className="ed-form" onSubmit={handleSubmit(d => mutation.mutate(d))}>
        <div className="ed-region">
          <div className="rh">基本資料</div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>角色名稱 <span style={{ color: "var(--avoid)" }}>*</span></label>
              <input className="inp" {...register("name")} />
              {errors.name && <span className="ed-err">{errors.name.message}</span>}
            </div>
            <div className="ed-field">
              <label>種族 / 類型</label>
              <input className="inp" placeholder="人類、精靈…" {...register("species")} />
            </div>
            <div className="ed-field">
              <label>可見度</label>
              <select className="inp" {...register("visibility")}>
                <option value="private">私人 — 只有你</option>
                <option value="unlisted">限連結 — 有連結的人</option>
                <option value="public">公開</option>
              </select>
            </div>
          </div>
        </div>

        <div className="ed-region">
          <div className="rh">標籤</div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>標籤</label>
              <input className="inp" placeholder="以逗號分隔，例：活潑, 劍士" {...register("tagsRaw")} />
              <span className="ed-hint">用逗號分隔多個標籤</span>
            </div>
          </div>
        </div>

        <div className="ed-region">
          <div className="rh">簡介</div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>角色簡介</label>
              <textarea className="inp" rows={5} placeholder="簡短介紹這個角色…" {...register("summary")} />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
