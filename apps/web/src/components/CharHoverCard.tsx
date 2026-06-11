import { useState, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api/client"
import { charColor } from "@/lib/charColor"
import type { Character, CharacterResponse } from "@oc-tools/contracts"

type Props = {
  charId?: string
  character?: Character
  children: React.ReactNode
}

export function CharHoverCard({ charId, character: charProp, children }: Props) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ x: 0, y: 0, flip: false })
  const triggerRef = useRef<HTMLSpanElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const id = charProp?.id ?? charId

  const { data } = useQuery({
    queryKey: ["character", id],
    queryFn: () => apiClient<CharacterResponse>(`/api/app/characters/${id}`),
    enabled: visible && !charProp && !!id,
    staleTime: 5 * 60 * 1000,
  })

  const char = charProp ?? data?.character

  const handleEnter = useCallback(() => {
    timerRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        const cardW = 260
        const cardH = 220
        const flip = rect.right + cardW + 16 > window.innerWidth
        const yFlip = rect.bottom + cardH > window.innerHeight
        setPos({
          x: flip ? rect.left - cardW - 8 : rect.right + 8,
          y: yFlip ? Math.max(8, rect.top - cardH) : rect.top,
          flip,
        })
      }
      setVisible(true)
    }, 150)
  }, [])

  const handleLeave = useCallback(() => {
    clearTimeout(timerRef.current)
    setVisible(false)
  }, [])

  const color = char ? charColor(char.id) : "#8A857C"

  return (
    <>
      <span ref={triggerRef} onMouseEnter={handleEnter} onMouseLeave={handleLeave} style={{ display: "contents" }}>
        {children}
      </span>

      {visible && createPortal(
        <div
          className="hc"
          style={{ left: pos.x, top: pos.y }}
          onMouseEnter={() => clearTimeout(timerRef.current)}
          onMouseLeave={handleLeave}
        >
          {!char ? (
            <div className="hc-loading">載入中⋯</div>
          ) : (
            <>
              <div className="hc-top" style={{ background: color }}>
                <div className="hc-av">
                  {char.avatarUrl
                    ? <img src={char.avatarUrl} alt={char.name} />
                    : <span>{char.name.slice(0, 1)}</span>
                  }
                </div>
                <div className="hc-id">
                  <div className="hc-nm">{char.name}</div>
                  {char.romaji && <div className="hc-rom">{char.romaji}</div>}
                </div>
              </div>
              <div className="hc-body">
                {(char.species || char.heightCm) && (
                  <div className="hc-meta">
                    {char.species && <span>{char.species}</span>}
                    {char.species && char.heightCm && <span className="hc-sep">·</span>}
                    {char.heightCm && <span>{char.heightCm} cm</span>}
                  </div>
                )}
                {char.summary && (
                  <p className="hc-sum">{char.summary.slice(0, 120)}{char.summary.length > 120 ? "…" : ""}</p>
                )}
                {(char.tags ?? []).length > 0 && (
                  <div className="hc-tags">
                    {(char.tags ?? []).slice(0, 4).map(t => <span key={t} className="hc-tag">{t}</span>)}
                  </div>
                )}
              </div>
            </>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
