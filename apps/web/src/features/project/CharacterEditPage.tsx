import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { ProjectCharacterLinkResponse, CharacterResponse } from "@oc-tools/contracts"

const EditSchema = z.object({
  name: z.string().min(1, "名稱為必填").max(120),
  romaji: z.string().max(120).optional(),
  species: z.string().max(120).optional(),
  summary: z.string().max(4000).optional(),
  visibility: z.enum(["private", "unlisted", "public"]),
  tagsRaw: z.string().optional(),
})
type EditForm = z.infer<typeof EditSchema>

const PALETTE = [
  "#4A6FA5","#C0392B","#27AE60","#8E44AD","#E67E22",
  "#16A085","#2C3E50","#7F8C8D","#D35400","#1A5276",
]
function charColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

export function CharacterEditPage() {
  const { projectId, linkId } = useParams<{ projectId: string; linkId: string }>()
  const { project } = useProjectContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "roster", linkId],
    queryFn: () =>
      apiClient<ProjectCharacterLinkResponse>(
        `/api/app/projects/${projectId}/characters/${linkId}`,
      ),
    enabled: !!projectId && !!linkId,
  })

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditForm>({
    resolver: zodResolver(EditSchema),
    defaultValues: { visibility: "private" },
  })

  const watchedName = watch("name")

  useEffect(() => {
    if (data?.character) {
      const c = data.character
      reset({
        name: c.name,
        romaji: c.romaji ?? "",
        species: c.species ?? "",
        summary: c.summary ?? "",
        visibility: (c.visibility as "private" | "unlisted" | "public") ?? "private",
        tagsRaw: (c.tags ?? []).join(", "),
      })
    }
  }, [data, reset])

  const mutation = useMutation({
    mutationFn: (values: EditForm) => {
      const tags = values.tagsRaw
        ? values.tagsRaw.split(",").map(t => t.trim()).filter(Boolean)
        : []
      return apiClient<CharacterResponse>(
        `/api/app/characters/${data!.character!.id}`,
        {
          method: "PATCH",
          body: {
            name: values.name,
            romaji: values.romaji || null,
            species: values.species || null,
            summary: values.summary || null,
            visibility: values.visibility,
            tags,
          },
        },
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "roster"] })
      navigate(`/p/${projectId}/roster/${linkId}`)
    },
  })

  if (status === "pending") {
    return <div className="page" style={{ color: "var(--text-faint)" }}>載入中⋯</div>
  }

  if (status === "error" || !data?.character) {
    return (
      <div className="page">
        <div style={{ color: "var(--avoid)", marginBottom: "var(--s4)" }}>找不到角色。</div>
        <Link to={`/p/${projectId}/roster`} className="lnk">← 回角色列表</Link>
      </div>
    )
  }

  const { character } = data
  const color = charColor(character.id)
  const displayName = watchedName || character.name

  return (
    <div className="page">
      <ContextHeader
        scope="project"
        crumbs={[project.name, "企劃角色", character.name, "編輯"]}
      />

      {/* Editor top bar */}
      <div className="ed-top">
        <div className="id">
          <div className="av" style={{ background: color }}>
            {displayName.slice(0, 1)}
          </div>
          <span className="nm">{displayName}</span>
        </div>
        <span className="spacer" />
        {mutation.isSuccess && (
          <span className="savest saved"><span className="d" />已儲存</span>
        )}
        {mutation.isError && (
          <span className="savest error"><span className="d" />儲存失敗</span>
        )}
        <Link to={`/p/${projectId}/roster/${linkId}`} className="btn">取消</Link>
        <button
          type="submit"
          form="char-edit-form"
          disabled={!isDirty || mutation.isPending}
          className="btn btn-accent"
        >
          {mutation.isPending ? "儲存中⋯" : "儲存"}
        </button>
      </div>

      <form
        id="char-edit-form"
        className="ed-form"
        onSubmit={handleSubmit(values => mutation.mutate(values))}
      >
        {/* Basic info */}
        <div className="ed-region">
          <div className="rh">
            <span className="rt">基本資料</span>
            <span className="en">BASIC INFO</span>
          </div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>名稱 <span style={{ color: "var(--avoid)" }}>*</span></label>
              <input className="inp" {...register("name")} placeholder="角色名稱" />
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
          </div>
        </div>

        {/* Tags & visibility */}
        <div className="ed-region">
          <div className="rh">
            <span className="rt">標籤與可見性</span>
            <span className="en">TAGS & VISIBILITY</span>
          </div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>標籤 <span className="opt">選填</span></label>
              <input
                className="inp"
                {...register("tagsRaw")}
                placeholder="e.g. 主角, 偵查員, 人類"
              />
              <p className="ed-hint">以逗號分隔多個標籤</p>
            </div>
            <div className="ed-field">
              <label>公開設定</label>
              <select className="inp" {...register("visibility")}>
                <option value="private">私人</option>
                <option value="unlisted">不公開連結</option>
                <option value="public">公開</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="ed-region">
          <div className="rh">
            <span className="rt">簡介</span>
            <span className="en">SUMMARY</span>
          </div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>角色簡介 <span className="opt">選填</span></label>
              <textarea
                className="inp"
                {...register("summary")}
                rows={6}
                placeholder="角色的背景或描述⋯"
                style={{ resize: "vertical" }}
              />
              {errors.summary && <p className="ed-err">{errors.summary.message}</p>}
            </div>
          </div>
        </div>

        {mutation.isError && (
          <p className="ed-err" style={{ marginBottom: "var(--s4)" }}>
            儲存失敗，請稍後再試。
          </p>
        )}
      </form>
    </div>
  )
}
