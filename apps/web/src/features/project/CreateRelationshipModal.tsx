import { useState, useEffect } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import type { Character, WorldEntry, RelationshipGroup, Relationship, RelationshipResponse } from "@oc-tools/contracts"

type Props = {
  open: boolean
  onClose: () => void
  projectId: string
  characters: Character[]
  worldEntries: WorldEntry[]
  groups: RelationshipGroup[]
  editRel?: Relationship | null
}

type EntityRef = { type: "character" | "world_entry"; id: string }

export function CreateRelationshipModal({
  open, onClose, projectId, characters, worldEntries, groups, editRel,
}: Props) {
  const qc = useQueryClient()
  const isEdit = !!editRel

  const [srcRef,  setSrcRef]  = useState<EntityRef | null>(null)
  const [tgtRef,  setTgtRef]  = useState<EntityRef | null>(null)
  const [label,   setLabel]   = useState("")
  const [relType, setRelType] = useState("")
  const [desc,    setDesc]    = useState("")
  const [style,   setStyle]   = useState<"line" | "arrows">("line")
  const [srcView, setSrcView] = useState("")
  const [tgtView, setTgtView] = useState("")
  const [groupId, setGroupId] = useState("")

  useEffect(() => {
    if (!open) return
    if (editRel) {
      setSrcRef({ type: editRel.sourceType as "character" | "world_entry", id: editRel.sourceId })
      setTgtRef({ type: editRel.targetType as "character" | "world_entry", id: editRel.targetId })
      setLabel(editRel.label ?? "")
      setRelType(editRel.type ?? "")
      setDesc(editRel.description ?? "")
      setStyle(editRel.mapStyle ?? "line")
      setSrcView(editRel.srcView ?? "")
      setTgtView(editRel.tgtView ?? "")
      setGroupId(editRel.groupId ?? "")
    } else {
      setSrcRef(null); setTgtRef(null)
      setLabel(""); setRelType(""); setDesc("")
      setStyle("line"); setSrcView(""); setTgtView(""); setGroupId("")
    }
  }, [open, editRel])

  const mutation = useMutation({
    mutationFn: () => {
      if (isEdit && editRel) {
        return apiClient<RelationshipResponse>(
          `/api/app/projects/${projectId}/relationships/${editRel.id}`,
          {
            method: "PATCH",
            body: {
              sourceRef: srcRef ?? undefined,
              targetRef: tgtRef ?? undefined,
              label: label.trim(),
              type: relType.trim() || label.trim(),
              description: desc.trim() || undefined,
              mapStyle: style,
              srcView: style === "arrows" && srcView.trim() ? srcView.trim() : undefined,
              tgtView: style === "arrows" && tgtView.trim() ? tgtView.trim() : undefined,
              groupId: groupId || undefined,
            },
          },
        )
      }
      return apiClient<RelationshipResponse>(`/api/app/projects/${projectId}/relationships`, {
        method: "POST",
        body: {
          sourceRef: srcRef!,
          targetRef: tgtRef!,
          label: label.trim(),
          type: relType.trim() || label.trim(),
          description: desc.trim() || undefined,
          mapStyle: style,
          srcView: style === "arrows" && srcView.trim() ? srcView.trim() : undefined,
          tgtView: style === "arrows" && tgtView.trim() ? tgtView.trim() : undefined,
          groupId: groupId || undefined,
          direction: style === "arrows" ? "two-way" : "undirected",
        },
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["project", projectId, "relationships"] })
      onClose()
    },
  })

  const srcName = srcRef
    ? (srcRef.type === "character"
        ? characters.find(c => c.id === srcRef.id)?.name
        : worldEntries.find(e => e.id === srcRef.id)?.title) ?? srcRef.id
    : null
  const tgtName = tgtRef
    ? (tgtRef.type === "character"
        ? characters.find(c => c.id === tgtRef.id)?.name
        : worldEntries.find(e => e.id === tgtRef.id)?.title) ?? tgtRef.id
    : null

  const canSubmit = !!srcRef && !!tgtRef && srcRef.id !== tgtRef.id && label.trim().length > 0

  function parseSelect(value: string): EntityRef | null {
    if (!value) return null
    const [type, id] = value.split(":") as ["character" | "world_entry", string]
    return { type, id }
  }

  if (!open) return null

  return (
    <div className={"oc-modal-scrim" + (open ? " in" : "")} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="oc-modal" role="dialog" aria-modal>
        <div className="mh">
          <span className="mt">{isEdit ? "編輯關係" : "新增關係"}</span>
          <button className="mx" onClick={onClose} aria-label="關閉">✕</button>
        </div>

        <div className="mscroll">
          <div className="mf-pair">
            <div className="mf-row">
              <label>來源 · Source</label>
              <select
                className="inp"
                value={srcRef ? `${srcRef.type}:${srcRef.id}` : ""}
                onChange={e => setSrcRef(parseSelect(e.target.value))}
              >
                <option value="">選擇…</option>
                {characters.length > 0 && (
                  <optgroup label="角色">
                    {characters.map(c => (
                      <option key={c.id} value={`character:${c.id}`}
                        disabled={tgtRef?.id === c.id}
                      >{c.name}</option>
                    ))}
                  </optgroup>
                )}
                {worldEntries.length > 0 && (
                  <optgroup label="世界觀">
                    {worldEntries.map(e => (
                      <option key={e.id} value={`world_entry:${e.id}`}
                        disabled={tgtRef?.id === e.id}
                      >{e.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="mf-row">
              <label>目標 · Target</label>
              <select
                className="inp"
                value={tgtRef ? `${tgtRef.type}:${tgtRef.id}` : ""}
                onChange={e => setTgtRef(parseSelect(e.target.value))}
              >
                <option value="">選擇…</option>
                {characters.length > 0 && (
                  <optgroup label="角色">
                    {characters.map(c => (
                      <option key={c.id} value={`character:${c.id}`}
                        disabled={srcRef?.id === c.id}
                      >{c.name}</option>
                    ))}
                  </optgroup>
                )}
                {worldEntries.length > 0 && (
                  <optgroup label="世界觀">
                    {worldEntries.map(e => (
                      <option key={e.id} value={`world_entry:${e.id}`}
                        disabled={srcRef?.id === e.id}
                      >{e.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          <div className="mf-pair">
            <div className="mf-row">
              <label>關係標籤 <span style={{color:"var(--avoid)"}}>*</span></label>
              <input
                className="inp"
                placeholder="例：摯友、師徒、宿敵…"
                maxLength={160}
                value={label}
                onChange={e => setLabel(e.target.value)}
              />
            </div>
            <div className="mf-row">
              <label>關係分類（選填）</label>
              <input
                className="inp"
                placeholder="預設同標籤"
                maxLength={80}
                value={relType}
                onChange={e => setRelType(e.target.value)}
              />
            </div>
          </div>

          <div className="mf-row">
            <label>地圖邊線樣式</label>
            <div className="mf-seg">
              <button className={style === "line" ? "on" : ""} onClick={() => setStyle("line")}>
                ─ 單一標籤
              </button>
              <button className={style === "arrows" ? "on" : ""} onClick={() => setStyle("arrows")}>
                ⇄ 雙向視角
              </button>
            </div>
          </div>

          {style === "arrows" && (
            <div className="mf-pair">
              <div className="mf-row">
                <label>{srcName ?? "來源"} 眼中的對方</label>
                <input
                  className="inp"
                  placeholder="例：暗戀的人"
                  maxLength={500}
                  value={srcView}
                  onChange={e => setSrcView(e.target.value)}
                />
              </div>
              <div className="mf-row">
                <label>{tgtName ?? "目標"} 眼中的對方</label>
                <input
                  className="inp"
                  placeholder="例：討厭的同學"
                  maxLength={500}
                  value={tgtView}
                  onChange={e => setTgtView(e.target.value)}
                />
              </div>
            </div>
          )}

          <div className="mf-row">
            <label>關係描述（選填）</label>
            <textarea
              className="inp"
              rows={3}
              maxLength={4000}
              placeholder="兩者之間的故事或背景…"
              value={desc}
              onChange={e => setDesc(e.target.value)}
            />
          </div>

          {groups.length > 0 && (
            <div className="mf-row">
              <label>歸入群組（選填）</label>
              <select
                className="inp"
                value={groupId}
                onChange={e => setGroupId(e.target.value)}
              >
                <option value="">不歸組</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {mutation.isError && (
            <div className="mf-err">
              儲存失敗，請確認兩個對象已加入此企劃，再試一次。
            </div>
          )}
        </div>

        <div className="mf">
          <button className="btn" onClick={onClose}>取消</button>
          <button
            className="btn btn-accent"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (isEdit ? "儲存中…" : "建立中…") : (isEdit ? "儲存" : "建立關係")}
          </button>
        </div>
      </div>
    </div>
  )
}
