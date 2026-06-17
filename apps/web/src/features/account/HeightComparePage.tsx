import { useState, useMemo, useCallback, useRef, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { charColor } from "@/lib/charColor"
import { ContextHeader } from "@/components/ContextHeader"
import { PageHeader } from "@/components/PageHeader"
import { LoadingSpinner } from "@/components/LoadingSpinner"
import type { CharacterListResponse, ProjectListResponse } from "@oc-tools/contracts"

const AXIS_MAX_DEFAULT = 200

function hexToRgba(hex: string, a: number): string {
  const n = parseInt(hex.replace("#", ""), 16)
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`
}

type CharEntry = {
  id: string
  name: string
  romaji: string | null
  species: string | null
  color: string
  heightCm: number
  on: boolean
  projectIds: string[]
}

export function HeightComparePage() {
  const qc = useQueryClient()
  const chartRef = useRef<HTMLDivElement>(null)
  const [scope, setScope] = useState<"*" | string>("*")

  const { data: charData, status } = useQuery({
    queryKey: ["characters"],
    queryFn: () => apiClient<CharacterListResponse>("/api/app/characters"),
  })
  const { data: projData } = useQuery({
    queryKey: ["projects"],
    queryFn: () => apiClient<ProjectListResponse>("/api/app/projects"),
  })

  const allProjects = projData?.projects ?? []

  // Local state: on/off toggles + editable heights (start from API data)
  const [toggles, setToggles] = useState<Record<string, boolean>>({})
  const [heights, setHeights] = useState<Record<string, number>>({})

  // Sync initial heights from API when data loads
  useEffect(() => {
    const chars = charData?.characters ?? []
    setHeights(prev => {
      const next = { ...prev }
      for (const c of chars) {
        if (!(c.id in next)) next[c.id] = c.heightCm ?? 160
      }
      return next
    })
    setToggles(prev => {
      const next = { ...prev }
      for (const c of chars) {
        if (!(c.id in next)) next[c.id] = true
      }
      return next
    })
  }, [charData])

  const saveMutation = useMutation({
    mutationFn: ({ id, heightCm }: { id: string; heightCm: number }) =>
      apiClient(`/api/app/characters/${id}`, { method: "PATCH", body: { heightCm } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["characters"] }),
  })

  const entries = useMemo<CharEntry[]>(() => {
    return (charData?.characters ?? []).map(c => ({
      id: c.id,
      name: c.name,
      romaji: c.romaji ?? null,
      species: c.species ?? null,
      color: charColor(c.id),
      heightCm: heights[c.id] ?? c.heightCm ?? 160,
      on: toggles[c.id] ?? true,
      projectIds: (c.memberships ?? []).map(m => m.projectId),
    }))
  }, [charData, heights, toggles])

  const projectsWithChars = useMemo(() => {
    const ids = new Set(entries.flatMap(e => e.projectIds))
    return allProjects.filter(p => ids.has(p.id))
  }, [allProjects, entries])

  const visible = useMemo(() =>
    scope === "*" ? entries : entries.filter(e => e.projectIds.includes(scope)),
    [entries, scope]
  )

  const active = useMemo(() => visible.filter(e => e.on), [visible])

  const axisMax = useMemo(() => {
    if (!active.length) return AXIS_MAX_DEFAULT
    const max = Math.max(...active.map(e => e.heightCm))
    return Math.max(AXIS_MAX_DEFAULT, Math.ceil(max * 1.08 / 10) * 10)
  }, [active])

  const toggle = useCallback((id: string) => {
    setToggles(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const setAll = useCallback((on: boolean) => {
    setToggles(prev => {
      const next = { ...prev }
      for (const e of visible) next[e.id] = on
      return next
    })
  }, [visible])

  function handleHeightChange(id: string, val: string) {
    const n = Math.max(50, Math.min(300, parseInt(val) || 0))
    setHeights(prev => ({ ...prev, [id]: n }))
  }

  function handleHeightBlur(id: string) {
    const h = heights[id]
    if (h && h >= 50 && h <= 300) {
      saveMutation.mutate({ id, heightCm: h })
    }
  }

  const tallest = active.length ? active.reduce((a, b) => a.heightCm >= b.heightCm ? a : b) : null
  const gridLines: number[] = []
  for (let cm = 50; cm < axisMax; cm += 50) gridLines.push(cm)

  return (
    <div className="page">
      <ContextHeader scope="account" crumbs={["身高比較"]} />
      <PageHeader
        title="身高比較"
        eyebrow="Height comparison"
        sub="勾選 2–8 位角色、可直接改身高，自動生成等比例剪影。"
      />

      {/* Scope filter */}
      {projectsWithChars.length > 0 && (
        <div className="hc-scopebar">
          <span className="hc-scope-lb">企劃</span>
          <div className="hc-scope-chips">
            <button className={"scope-chip" + (scope === "*" ? " on" : "")} onClick={() => setScope("*")}>全部</button>
            {projectsWithChars.map(p => (
              <button key={p.id} className={"scope-chip" + (scope === p.id ? " on" : "")} onClick={() => setScope(p.id)}>
                <span className="dot" style={{ background: p.themeColor ?? "#8A857C", width: 8, height: 8, borderRadius: "50%", display: "inline-block", marginRight: 6 }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === "pending" && <LoadingSpinner />}
      {status === "error"   && <p style={{ color: "var(--avoid)" }}>無法載入角色</p>}

      {status === "success" && (
        <div className="hc-wrap">
          {/* Controls panel */}
          <div className="hc-controls">
            <div className="hc-ct-h">納入比較</div>
            <div className="hc-rows">
              {visible.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--text-faint)", padding: "var(--s4)" }}>
                  {entries.length === 0 ? "還沒有角色。" : "此企劃沒有角色。"}
                </p>
              )}
              {visible.map(e => (
                <div key={e.id} className={"hc-row" + (e.on ? " on" : " off")}>
                  <div
                    className="hc-tick"
                    style={{ background: e.on ? e.color : "transparent", borderColor: e.on ? "transparent" : "var(--border-strong)", cursor: "pointer" }}
                    onClick={() => toggle(e.id)}
                  >
                    {e.on && "✓"}
                  </div>
                  <span className="hc-dot" style={{ background: e.color }} />
                  <span className="hc-nm" onClick={() => toggle(e.id)} style={{ cursor: "pointer" }}>
                    {e.name}
                    {e.species && <span className="hc-sp">{e.species}</span>}
                  </span>
                  <span className="hc-hgt">
                    <input
                      className="hc-h"
                      type="number"
                      value={heights[e.id] ?? e.heightCm}
                      min={50}
                      max={300}
                      onChange={ev => handleHeightChange(e.id, ev.target.value)}
                      onBlur={() => handleHeightBlur(e.id)}
                    />
                    <span className="hc-cm">cm</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="hc-ct-foot">
              <button className="btn btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAll(true)}>全選</button>
              <button className="btn btn-sm" style={{ flex: 1, justifyContent: "center" }} onClick={() => setAll(false)}>清除</button>
            </div>
          </div>

          {/* Chart */}
          <div className="hc-chart-card">
            <div className="hc-chart" ref={chartRef}>
              {/* Grid lines */}
              {gridLines.map(cm => (
                <div key={cm} className="hc-gridline" style={{ bottom: `${(cm / axisMax) * 100}%` }}>
                  <span className="hc-gl-lab">{cm}</span>
                </div>
              ))}

              {active.length === 0 ? (
                <div className="hc-empty">勾選至少一位角色開始比較</div>
              ) : (
                <div className="hc-figs">
                  {active.map(e => {
                    const CHART_H = 500
                    const totalH = (e.heightCm / axisMax) * CHART_H
                    const headD = 48
                    const bodyH = Math.max(8, totalH - headD - 3)
                    const col = e.color
                    return (
                      <div key={e.id} className="hc-fig">
                        <div className="hc-sil" style={{ height: totalH }}>
                          <div className="hc-htxt">{e.heightCm}</div>
                          <div
                            className="hc-avatar"
                            style={{
                              background: hexToRgba(col, 0.16),
                              color: col,
                              borderColor: col,
                            }}
                          >
                            {e.name.slice(0, 1)}
                          </div>
                          <div
                            className="hc-body"
                            style={{ height: bodyH, background: hexToRgba(col, 0.28), borderColor: col }}
                          />
                        </div>
                        <div className="hc-name">{e.name}</div>
                        {e.romaji && <div className="hc-nrom">{e.romaji} · {e.heightCm}cm</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="hc-chart-foot">
              {tallest
                ? <span>{active.length} 位角色 · 最高 <b style={{ color: "var(--text-dim)" }}>{tallest.name} {tallest.heightCm}cm</b></span>
                : <span style={{ color: "var(--text-faint)" }}>—</span>
              }
              <span style={{ flex: 1 }} />
              <span>基準刻度 0–{axisMax} cm · 等比例縮放</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
