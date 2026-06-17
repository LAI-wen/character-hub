import { useState, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { CharacterResponse, CharacterListResponse, ProjectCharacterLinkListResponse, ProjectCharacterLinkResponse } from "@oc-tools/contracts"
import { charColor } from "@/lib/charColor"

const NewSchema = z.object({
  name: z.string().min(1, "名稱為必填").max(120),
  romaji: z.string().max(120).optional(),
  species: z.string().max(120).optional(),
  summary: z.string().max(4000).optional(),
  visibility: z.enum(["private", "unlisted", "public"]),
  tagsRaw: z.string().optional(),
  projectRole: z.string().max(120).optional(),
})
type NewForm = z.infer<typeof NewSchema>

export function CharacterNewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [mode, setMode] = useState<"new" | "existing">("new")
  const [search, setSearch] = useState("")

  // ── New character form ────────────────────────────────────────────
  const { register, handleSubmit, watch, formState: { errors } } = useForm<NewForm>({
    resolver: zodResolver(NewSchema),
    defaultValues: { visibility: "private" },
  })
  const watchedName = watch("name") ?? ""

  const createMutation = useMutation({
    mutationFn: (values: NewForm) => {
      const tags = values.tagsRaw ? values.tagsRaw.split(",").map(t => t.trim()).filter(Boolean) : []
      return apiClient<CharacterResponse>("/api/app/characters", {
        method: "POST",
        body: { name: values.name, romaji: values.romaji || null, species: values.species || null, summary: values.summary || null, visibility: values.visibility, tags, projectId, projectRole: values.projectRole || null },
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "roster"] })
      const linkId = data.projectLink?.id
      navigate(linkId ? `/p/${projectId}/roster/${linkId}` : `/p/${projectId}/roster`)
    },
    onError: () => alert('建立角色失敗，請稍後再試'),
  })

  // ── Existing character selection ──────────────────────────────────
  const { data: myCharsData } = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiClient<CharacterListResponse>("/api/app/characters"),
    enabled: mode === "existing",
  })
  const { data: rosterData } = useQuery({
    queryKey: ["project", projectId, "roster"],
    queryFn: () => apiClient<ProjectCharacterLinkListResponse>(`/api/app/projects/${projectId}/characters`),
  })

  const alreadyLinked = useMemo(() => {
    const s = new Set<string>()
    for (const { character } of rosterData?.roster ?? []) if (character) s.add(character.id)
    return s
  }, [rosterData])

  const available = useMemo(() => {
    const all = myCharsData?.characters ?? []
    const q = search.toLowerCase()
    return all.filter(c => !alreadyLinked.has(c.id) && (!q || c.name.toLowerCase().includes(q) || (c.species ?? "").toLowerCase().includes(q)))
  }, [myCharsData, alreadyLinked, search])

  const linkMutation = useMutation({
    mutationFn: (characterId: string) => apiClient<ProjectCharacterLinkResponse>(`/api/app/projects/${projectId}/characters`, {
      method: "POST",
      body: { characterId },
    }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "roster"] })
      const linkId = data.projectLink?.id
      navigate(linkId ? `/p/${projectId}/roster/${linkId}` : `/p/${projectId}/roster`)
    },
    onError: () => alert('加入角色失敗，請稍後再試'),
  })

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "企劃角色", "新增角色"]} />

      {/* Top bar */}
      <div className="ed-top">
        <div className="id">
          <div className="av" style={{ background: "#8A857C", fontSize: 16 }}>
            {mode === "new" ? (watchedName.slice(0, 1) || "＋") : "＋"}
          </div>
          <span className="nm">{mode === "new" ? (watchedName || "新角色") : "加入現有角色"}</span>
        </div>
        <span className="spacer" />
        {(createMutation.isError || linkMutation.isError) && (
          <span className="savest error"><span className="d" />失敗，請再試</span>
        )}
        <Link to={`/p/${projectId}/roster`} className="btn">取消</Link>
        {mode === "new" && (
          <button type="submit" form="char-new-form" disabled={createMutation.isPending} className="btn btn-accent">
            {createMutation.isPending ? "建立中⋯" : "建立角色"}
          </button>
        )}
      </div>

      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: "var(--s6)", borderBottom: "1px solid var(--border)" }}>
        {(["new", "existing"] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              background: "none", border: "none", cursor: "pointer", padding: "var(--s3) var(--s5)",
              fontFamily: "inherit", fontSize: 14, fontWeight: mode === m ? 700 : 400,
              color: mode === m ? "var(--text)" : "var(--text-dim)",
              borderBottom: mode === m ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -1,
            }}
          >
            {m === "new" ? "建立新角色" : "加入現有角色"}
          </button>
        ))}
      </div>

      {/* New character form */}
      {mode === "new" && (
        <form id="char-new-form" className="ed-form" onSubmit={handleSubmit(values => createMutation.mutate(values))}>
          <div className="ed-region">
            <div className="rh"><span className="rt">基本資料</span><span className="en">BASIC INFO</span></div>
            <div className="ed-sec">
              <div className="ed-field">
                <label>名稱 <span style={{ color: "var(--avoid)" }}>*</span></label>
                <input className="inp" {...register("name")} placeholder="角色名稱" autoFocus />
                {errors.name && <p className="ed-err">{errors.name.message}</p>}
              </div>
              <div className="ed-field">
                <label>羅馬字 / 英文名 <span className="opt">選填</span></label>
                <input className="inp" {...register("romaji")} placeholder="e.g. Ling Xiaoxing" />
              </div>
              <div className="ed-field">
                <label>種族 / 物種 <span className="opt">選填</span></label>
                <input className="inp" {...register("species")} placeholder="e.g. 人類、精靈" />
              </div>
              <div className="ed-field">
                <label>企劃角色定位 <span className="opt">選填</span></label>
                <input className="inp" {...register("projectRole")} placeholder="e.g. 主角、配角、對立角" />
              </div>
            </div>
          </div>
          <div className="ed-region">
            <div className="rh"><span className="rt">標籤與可見性</span><span className="en">TAGS & VISIBILITY</span></div>
            <div className="ed-sec">
              <div className="ed-field">
                <label>標籤 <span className="opt">選填</span></label>
                <input className="inp" {...register("tagsRaw")} placeholder="e.g. 主角, 偵查員, 人類" />
                <p className="ed-hint">以逗號分隔多個標籤</p>
              </div>
              <div className="ed-field">
                <label>公開設定</label>
                <select className="inp" {...register("visibility")}>
                  <option value="private">私人</option>
                  <option value="unlisted">限連結 — 有連結的人</option>
                  <option value="public">公開</option>
                </select>
              </div>
            </div>
          </div>
          <div className="ed-region">
            <div className="rh"><span className="rt">簡介</span><span className="en">SUMMARY</span></div>
            <div className="ed-sec">
              <div className="ed-field">
                <label>角色簡介 <span className="opt">選填</span></label>
                <textarea className="inp" {...register("summary")} rows={5} placeholder="角色的背景或描述⋯" style={{ resize: "vertical" }} />
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Existing character picker */}
      {mode === "existing" && (
        <div>
          <div className="cc-search" style={{ maxWidth: 360, marginBottom: "var(--s5)" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
            <input type="search" placeholder="搜尋角色…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          {available.length === 0 && (
            <p style={{ color: "var(--text-faint)", fontSize: 14 }}>
              {(myCharsData?.characters ?? []).length === 0 ? "你還沒有角色。" : "所有角色已在這個企劃中。"}
            </p>
          )}

          <div className="cc-grid">
            {available.map(character => {
              const color = charColor(character.id)
              return (
                <div
                  key={character.id}
                  className="cc"
                  style={{ cursor: "pointer" }}
                  onClick={() => !linkMutation.isPending && linkMutation.mutate(character.id)}
                >
                  <div className="cc-inner">
                    <div className="cc-pic">
                      <div className="av" style={{ background: color }}>{character.name.slice(0, 1)}</div>
                    </div>
                    <div className="cc-info">
                      <div className="cc-nm">{character.name}</div>
                      {character.species && <div className="cc-sp">{character.species}</div>}
                    </div>
                  </div>
                  <div className="cc-acts" style={{ background: color }}>
                    <span className="qbtn">加入企劃</span>
                  </div>
                </div>
              )
            })}
          </div>
          {linkMutation.isPending && <p style={{ color: "var(--text-faint)", marginTop: "var(--s4)", fontSize: 14 }}>加入中⋯</p>}
        </div>
      )}
    </div>
  )
}
