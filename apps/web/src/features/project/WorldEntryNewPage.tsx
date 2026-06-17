import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { WorldEntryResponse } from "@oc-tools/contracts"
import { typeColor, ENTRY_TYPES } from "@/lib/worldviewTypes"

const NewSchema = z.object({
  title: z.string().min(1, "標題為必填").max(180),
  type: z.string().min(1),
  summary: z.string().max(4000).optional(),
  content: z.string().max(60000).optional(),
  visibility: z.enum(["private", "unlisted", "public"]),
})
type NewForm = z.infer<typeof NewSchema>

export function WorldEntryNewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const parentId = searchParams.get("parent")

  const { register, handleSubmit, watch, formState: { errors } } = useForm<NewForm>({
    resolver: zodResolver(NewSchema),
    defaultValues: { type: "lore", visibility: "private" },
  })

  const watchedTitle = watch("title") ?? ""
  const watchedType = watch("type") ?? "lore"

  const mutation = useMutation({
    mutationFn: (values: NewForm) =>
      apiClient<WorldEntryResponse>(`/api/app/projects/${projectId}/world-entries`, {
        method: "POST",
        body: {
          title: values.title,
          type: values.type,
          summary: values.summary || null,
          content: values.content || null,
          visibility: values.visibility,
          parentId: parentId || undefined,
        },
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "world-entries"] })
      navigate(`/p/${projectId}/worldview/${data.entry.id}`)
    },
  })

  const color = typeColor(watchedType)

  return (
    <div className="page narrow">
      <ContextHeader scope="project" crumbs={[project.name, "世界觀", "新增條目"]} />

      <div className="ed-top">
        <div className="id">
          <div className="av" style={{ background: color, fontSize: 16 }}>
            {watchedTitle.slice(0, 1) || "＋"}
          </div>
          <span className="nm">{watchedTitle || "新條目"}</span>
        </div>
        <span className="spacer" />
        {mutation.isError && (
          <span className="savest error"><span className="d" />新增失敗</span>
        )}
        <Link to={`/p/${projectId}/worldview`} className="btn">取消</Link>
        <button
          type="submit"
          form="entry-new-form"
          disabled={mutation.isPending}
          className="btn btn-accent"
        >
          {mutation.isPending ? "建立中⋯" : "建立條目"}
        </button>
      </div>

      <form
        id="entry-new-form"
        className="ed-form"
        onSubmit={handleSubmit(v => mutation.mutate(v))}
      >
        <div className="ed-region">
          <div className="rh">
            <span className="rt">基本資料</span>
            <span className="en">BASIC INFO</span>
          </div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>標題 <span style={{ color: "var(--avoid)" }}>*</span></label>
              <input className="inp" {...register("title")} placeholder="條目標題" autoFocus />
              {errors.title && <p className="ed-err">{errors.title.message}</p>}
            </div>
            <div className="ed-field">
              <label>類型</label>
              <select className="inp" {...register("type")}>
                {ENTRY_TYPES.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="ed-field">
              <label>公開設定</label>
              <select className="inp" {...register("visibility")}>
                <option value="private">私人</option>
                <option value="unlisted">限連結 — 有連結的人</option>
                <option value="public">公開 — 任何人可見</option>
              </select>
            </div>
          </div>
        </div>

        <div className="ed-region">
          <div className="rh">
            <span className="rt">摘要</span>
            <span className="en">SUMMARY</span>
          </div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>一句話描述 <span className="opt">選填</span></label>
              <textarea
                className="inp"
                {...register("summary")}
                rows={3}
                placeholder="一句話描述這個條目⋯"
                style={{ resize: "vertical" }}
              />
            </div>
          </div>
        </div>

        <div className="ed-region">
          <div className="rh">
            <span className="rt">詳細內容</span>
            <span className="en">CONTENT</span>
          </div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>詳細說明 <span className="opt">選填</span></label>
              <textarea
                className="inp"
                {...register("content")}
                rows={10}
                placeholder="詳細的世界觀說明⋯"
                style={{ resize: "vertical", lineHeight: 1.65 }}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
