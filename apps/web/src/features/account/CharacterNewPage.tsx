import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useMutation } from "@tanstack/react-query"
import { Link, useNavigate } from "react-router-dom"
import { apiClient } from "@/lib/api/client"
import { ContextHeader } from "@/components/ContextHeader"
import type { CharacterResponse } from "@oc-tools/contracts"

const Schema = z.object({
  name:       z.string().min(1, "必填"),
  species:    z.string().max(100).optional(),
  summary:    z.string().max(5000).optional(),
  visibility: z.enum(["private", "unlisted", "public"]),
})
type Fields = z.infer<typeof Schema>

const PALETTE = ["#4A6FA5","#C0392B","#27AE60","#8E44AD","#E67E22","#16A085","#2C3E50","#7F8C8D","#D35400","#1A5276"]
function charColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}
function tempColor(name: string): string {
  return name ? charColor(name + "__preview") : "#8A857C"
}

export function CharacterNewPage() {
  const navigate = useNavigate()

  const { register, handleSubmit, watch, formState: { errors } } = useForm<Fields>({
    resolver: zodResolver(Schema),
    defaultValues: { visibility: "private" },
  })
  const name = watch("name") ?? ""

  const mutation = useMutation({
    mutationFn: (data: Fields) => apiClient<CharacterResponse>("/api/app/characters", {
      method: "POST",
      body: { name: data.name, species: data.species || undefined, summary: data.summary || undefined, visibility: data.visibility },
    }),
    onSuccess: (res) => navigate(`/characters/${res.character.id}/edit`),
  })

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["我的角色", "新角色"]} />

      <div className="ed-top">
        <div className="av" style={{ background: tempColor(name) }}>{name.slice(0, 1) || "？"}</div>
        <div className="nm">{name || "新角色"}</div>
        <div className="spacer" />
        {mutation.isError && <span className="savest err">建立失敗</span>}
        <Link to="/characters" className="btn btn-ghost">取消</Link>
        <button form="char-new-form" className="btn btn-accent" disabled={mutation.isPending}>
          {mutation.isPending ? "建立中…" : "建立角色"}
        </button>
      </div>

      <form id="char-new-form" className="ed-form" onSubmit={handleSubmit(d => mutation.mutate(d))}>
        <div className="ed-region">
          <div className="rh">基本資料</div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>角色名稱 <span style={{ color: "var(--avoid)" }}>*</span></label>
              <input className="inp" placeholder="角色的全名或常用稱呼" {...register("name")} />
              {errors.name && <span className="ed-err">{errors.name.message}</span>}
            </div>
            <div className="ed-field">
              <label>種族 / 類型</label>
              <input className="inp" placeholder="人類、精靈、人工智能…" {...register("species")} />
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
          <div className="rh">簡介</div>
          <div className="ed-sec">
            <div className="ed-field">
              <label>角色簡介</label>
              <textarea className="inp" rows={4} placeholder="簡短介紹這個角色…" {...register("summary")} />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
