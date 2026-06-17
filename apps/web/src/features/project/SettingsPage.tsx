import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useParams } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { PageHeader } from "@/components/PageHeader"
import { ContextHeader } from "@/components/ContextHeader"
import { useProjectContext } from "@/routes/layouts/ProjectLayout"
import type { ProjectResponse, PatchProjectRequest, Feature } from "@oc-tools/contracts"

const FEATURE_LIST = [
  { id: "story",    label: "故事",     desc: "章節、時間軸、劇情事件" },
  { id: "gallery",  label: "圖庫",     desc: "圖片上傳與角色/世界觀標記" },
  { id: "relationships", label: "關係圖", desc: "角色與世界觀的關係網絡" },
]

const THEME_COLORS = [
  "#8A857C","#3B5E6B","#5E7E55","#8B5E3C","#7B5EA7",
  "#B5654A","#9E332B","#4A7B8C","#6B4A1E","#C9A24B",
]

const VISIBILITY_OPTIONS = [
  { v: "private",  label: "私人",   desc: "只有你看得到" },
  { v: "unlisted", label: "限連結", desc: "有連結的人可以瀏覽" },
  { v: "public",   label: "公開",   desc: "所有人可以搜尋到" },
]

export function SettingsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const { project } = useProjectContext()
  const qc = useQueryClient()

  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState<{
    name: string
    slug: string
    description: string
    themeColor: string
    visibility: string
    enabledFeatures: Feature[]
  }>({
    name:        project.name,
    slug:        project.slug,
    description: project.description ?? "",
    themeColor:  project.themeColor ?? THEME_COLORS[0],
    visibility:  project.visibility as string,
    enabledFeatures: (project.enabledFeatures ?? []) as Feature[],
  })

  const { data } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => apiClient<ProjectResponse>(`/api/app/projects/${projectId}`),
    enabled: false, // rely on cached data from ProjectLayout
  })
  const viewerRole = data?.viewerRole

  const mutation = useMutation({
    mutationFn: (body: PatchProjectRequest) =>
      apiClient<ProjectResponse>(`/api/app/projects/${projectId}`, {
        method: "PATCH",
        body,
      }),
    onSuccess: (res) => {
      qc.setQueryData(["project", projectId], res)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: () => alert('儲存設定失敗，請稍後再試'),
  })

  function toggleFeature(id: string) {
    const fid = id as Feature
    setForm(f => ({
      ...f,
      enabledFeatures: f.enabledFeatures.includes(fid)
        ? f.enabledFeatures.filter(x => x !== fid)
        : [...f.enabledFeatures, fid],
    }))
  }

  function handleSave() {
    mutation.mutate({
      name:        form.name,
      slug:        form.slug,
      description: form.description || undefined,
      visibility:  form.visibility as "private" | "unlisted" | "public",
      enabledFeatures: form.enabledFeatures,
    })
  }

  const canEdit = !viewerRole || viewerRole === "owner" || viewerRole === "admin"

  return (
    <div className="page narrow">
      <ContextHeader scope="project" crumbs={[project.name, "企劃設定"]} />
      <PageHeader
        eyebrow="Settings"
        title="企劃設定"
        sub="管理企劃的基本資訊、可見範圍與功能模組。"
        action={
          canEdit ? (
            <button
              className="btn btn-accent"
              onClick={handleSave}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? "儲存中…" : saved ? "✓ 已儲存" : "儲存設定"}
            </button>
          ) : undefined
        }
      />

      {mutation.isError && (
        <p style={{ color: "var(--avoid)", marginBottom: "var(--s4)" }}>
          儲存失敗，請重試。
        </p>
      )}

      <div className="set-layout">
        {/* Basic info */}
        <div className="set-card">
          <div className="set-ch">
            <h2>基本資訊</h2>
            <p className="desc">企劃名稱與說明會顯示在總覽頁與公開頁。</p>
          </div>
          <div className="set-body">
            <div className="set-row">
              <label className="set-lab">企劃名稱</label>
              <div className="set-ctl">
                <input
                  className="inp"
                  value={form.name}
                  maxLength={100}
                  disabled={!canEdit}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>
            </div>
            <div className="set-row">
              <label className="set-lab">
                URL 代號
                <span className="set-sub">只能使用小寫英數與連字號。</span>
              </label>
              <div className="set-ctl">
                <div className="set-slugwrap">
                  <span className="set-pfx">/p/</span>
                  <input
                    className="inp"
                    value={form.slug}
                    maxLength={50}
                    pattern="[a-z0-9-]+"
                    disabled={!canEdit}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  />
                </div>
                {form.visibility !== "private" && !form.slug && (
                  <p style={{ fontSize: 12, color: "var(--warn, #c08a00)", marginTop: 4 }}>
                    企劃設為公開或限連結時，建議設定一個易讀的 URL 代號。
                  </p>
                )}
              </div>
            </div>
            <div className="set-row">
              <label className="set-lab">企劃說明</label>
              <div className="set-ctl">
                <textarea
                  className="inp"
                  value={form.description}
                  maxLength={1000}
                  rows={3}
                  disabled={!canEdit}
                  placeholder="簡短介紹這個企劃…"
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="set-card">
          <div className="set-ch">
            <h2>外觀</h2>
            <p className="desc">企劃主題色用於側欄標示與總覽強調色。</p>
          </div>
          <div className="set-body">
            <div className="set-row set-row-compact">
              <label className="set-lab">主題色</label>
              <div className="set-ctl">
                <div className="set-swatches">
                  {THEME_COLORS.map(c => (
                    <button
                      key={c}
                      className={"set-swatch" + (form.themeColor === c ? " on" : "")}
                      style={{ background: c }}
                      disabled={!canEdit}
                      onClick={() => setForm(f => ({ ...f, themeColor: c }))}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Visibility */}
        <div className="set-card">
          <div className="set-ch">
            <h2>可見範圍</h2>
            <p className="desc">控制誰可以看到這個企劃的公開頁面與角色。</p>
          </div>
          <div className="set-body">
            <div className="set-row set-row-compact">
              <label className="set-lab">可見度</label>
              <div className="set-ctl">
                <div className="set-vis">
                  {VISIBILITY_OPTIONS.map(({ v, label, desc }) => (
                    <button
                      key={v}
                      className={"set-visopt" + (form.visibility === v ? " on" : "")}
                      disabled={!canEdit}
                      onClick={() => setForm(f => ({ ...f, visibility: v }))}
                    >
                      <span className="vl">{label}</span>
                      <span className="vd">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="set-card">
          <div className="set-ch">
            <h2>功能模組</h2>
            <p className="desc">啟用的模組才會在側欄顯示並允許存取。</p>
          </div>
          <div className="set-body">
            {FEATURE_LIST.map(f => (
              <div key={f.id} className="set-row set-row-compact set-feat">
                <div className="set-lab">
                  {f.label}
                  <span className="set-sub">{f.desc}</span>
                </div>
                <div className="set-ctl">
                  <label className="sw">
                    <input
                      type="checkbox"
                      checked={form.enabledFeatures.includes(f.id as Feature)}
                      disabled={!canEdit}
                      onChange={() => toggleFeature(f.id)}
                    />
                    <span className="track" />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {!canEdit && (
          <p style={{ fontSize: 13, color: "var(--text-faint)" }}>
            你目前的角色無法修改企劃設定。
          </p>
        )}
      </div>
    </div>
  )
}
