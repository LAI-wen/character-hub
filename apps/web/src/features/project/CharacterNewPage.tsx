import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { CharacterResponse } from "@oc-tools/contracts"

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

  const { register, handleSubmit, watch, formState: { errors } } = useForm<NewForm>({
    resolver: zodResolver(NewSchema),
    defaultValues: { visibility: "private" },
  })

  const watchedName = watch("name") ?? ""

  const mutation = useMutation({
    mutationFn: (values: NewForm) => {
      const tags = values.tagsRaw
        ? values.tagsRaw.split(",").map(t => t.trim()).filter(Boolean)
        : []
      return apiClient<CharacterResponse>("/api/app/characters", {
        method: "POST",
        body: {
          name: values.name,
          romaji: values.romaji || null,
          species: values.species || null,
          summary: values.summary || null,
          visibility: values.visibility,
          tags,
          projectId,
          projectRole: values.projectRole || null,
        },
      })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "roster"] })
      const linkId = data.projectLink?.id
      navigate(linkId ? `/p/${projectId}/roster/${linkId}` : `/p/${projectId}/roster`)
    },
  })

  const initial = watchedName.slice(0, 1) || "＋"

  return (
    <div className="page">
      <ContextHeader scope="project" crumbs={[project.name, "企劃角色", "新增角色"]} />

      <div className="ed-top">
        <div className="id">
          <div className="av" style={{ background: "#8A857C", fontSize: 16 }}>
            {initial}
          </div>
          <span className="nm">{watchedName || "新角色"}</span>
        </div>
        <span className="spacer" />
        {mutation.isError && (
          <span className="savest error"><span className="d" />新增失敗</span>
        )}
        <Link to={`/p/${projectId}/roster`} className="btn">取消</Link>
        <button
          type="submit"
          form="char-new-form"
          disabled={mutation.isPending}
          className="btn btn-accent"
        >
          {mutation.isPending ? "建立中⋯" : "建立角色"}
        </button>
      </div>

      <form
        id="char-new-form"
        className="ed-form"
        onSubmit={handleSubmit(values => mutation.mutate(values))}
      >
        <div className="ed-region">
          <div className="rh">
            <span className="rt">基本資料</span>
            <span className="en">BASIC INFO</span>
          </div>
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
          <div className="rh">
            <span className="rt">標籤與可見性</span>
            <span className="en">TAGS & VISIBILITY</span>
          </div>
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
                <option value="unlisted">不公開連結</option>
                <option value="public">公開</option>
              </select>
            </div>
          </div>
        </div>

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
                rows={5}
                placeholder="角色的背景或描述⋯"
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
