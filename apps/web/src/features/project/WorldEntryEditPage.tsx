import { LoadingSpinner, PageLoading } from "@/components/LoadingSpinner"
import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useParams, useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { WorldEntryResponse } from "@oc-tools/contracts"
import { typeColor, ENTRY_TYPES } from "@/lib/worldviewTypes"

const EditSchema = z.object({
  title: z.string().min(1, "標題為必填").max(180),
  type: z.string().min(1),
  summary: z.string().max(4000).optional(),
  content: z.string().max(60000).optional(),
  visibility: z.enum(["private", "unlisted", "public"]),
})
type EditForm = z.infer<typeof EditSchema>

export function WorldEntryEditPage() {
  const { projectId, entryId } = useParams<{ projectId: string; entryId: string }>()
  const { project } = useProjectContext()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, status } = useQuery({
    queryKey: ["project", projectId, "world-entry", entryId],
    queryFn: () =>
      apiClient<WorldEntryResponse>(
        `/api/app/projects/${projectId}/world-entries/${entryId}`,
      ),
    enabled: !!projectId && !!entryId,
  })

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<EditForm>({
    resolver: zodResolver(EditSchema),
    defaultValues: { type: "lore", visibility: "private" },
  })

  const watchedTitle = watch("title")
  const watchedType = watch("type")

  useEffect(() => {
    if (data?.entry) {
      const e = data.entry
      reset({
        title: e.title,
        type: e.type,
        summary: e.summary ?? "",
        content: e.content ?? "",
        visibility: (e.visibility as "private" | "unlisted" | "public") ?? "private",
      })
    }
  }, [data, reset])

  const mutation = useMutation({
    mutationFn: (values: EditForm) =>
      apiClient<WorldEntryResponse>(
        `/api/app/projects/${projectId}/world-entries/${entryId}`,
        {
          method: "PATCH",
          body: {
            title: values.title,
            type: values.type,
            summary: values.summary || null,
            content: values.content || null,
            visibility: values.visibility,
          },
        },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "world-entries"] })
      queryClient.invalidateQueries({ queryKey: ["project", projectId, "world-entry", entryId] })
      navigate(`/p/${projectId}/worldview/${entryId}`)
    },
    onError: () => alert('儲存失敗，請稍後再試'),
  })

  if (status === "pending") {
    return <PageLoading />
  }

  if (status === "error" || !data?.entry) {
    return (
      <div className="page narrow">
        <div style={{ color: "var(--avoid)", marginBottom: "var(--s4)" }}>找不到條目。</div>
        <Link to={`/p/${projectId}/worldview`} className="lnk">← 回世界觀</Link>
      </div>
    )
  }

  const { entry } = data
  const displayTitle = watchedTitle || entry.title
  const color = typeColor(watchedType || entry.type)

  return (
    <div className="page narrow">
      <ContextHeader
        scope="project"
        crumbs={[project.name, "世界觀", entry.title, "編輯"]}
      />

      <div className="ed-top">
        <div className="id">
          <div className="av" style={{ background: color, fontSize: 16 }}>
            {displayTitle.slice(0, 1)}
          </div>
          <span className="nm">{displayTitle}</span>
        </div>
        <span className="spacer" />
        {mutation.isSuccess && (
          <span className="savest saved"><span className="d" />已儲存</span>
        )}
        {mutation.isError && (
          <span className="savest error"><span className="d" />儲存失敗</span>
        )}
        <Link to={`/p/${projectId}/worldview/${entryId}`} className="btn">取消</Link>
        <button
          type="submit"
          form="entry-edit-form"
          disabled={!isDirty || mutation.isPending}
          className="btn btn-accent"
        >
          {mutation.isPending ? "儲存中⋯" : "儲存"}
        </button>
      </div>

      <form
        id="entry-edit-form"
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
              <input className="inp" {...register("title")} />
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
                style={{ resize: "vertical", lineHeight: 1.65 }}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
