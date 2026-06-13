import { useOctool } from '../../store/useOctool'
import { Icon, TYPE_ICON } from '../../components/Icon'
import { TYPE_LABEL } from '../../data/blocks'
import type { Block, BlockType } from '../../types'

const miniBtn = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: '1px solid var(--border)',
  background: 'var(--bg-2)',
  color: 'var(--text-2)',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  fontSize: 14,
} as const
const disabledBtn = { ...miniBtn, opacity: 0.35, cursor: 'default' } as const

function RowPill({
  block,
  label,
  selected,
  canUp,
  canDown,
  canLeft,
  canRight,
  onSelect,
  onUp,
  onDown,
  onLeft,
  onRight,
  onDup,
  onDel,
}: {
  block: Block
  label: string
  selected: boolean
  canUp: boolean
  canDown: boolean
  canLeft?: boolean
  canRight?: boolean
  onSelect: () => void
  onUp: () => void
  onDown: () => void
  onLeft?: () => void
  onRight?: () => void
  onDup: () => void
  onDel: () => void
}) {
  const stop = (fn: () => void, enabled = true) => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (enabled) fn()
  }
  const compact = !!onLeft // column children render stacked to fit narrow columns
  const buttons = (
    <>
      {onLeft ? <button title="移到左欄" style={canLeft ? miniBtn : disabledBtn} onClick={stop(onLeft, canLeft)}>‹</button> : null}
      {onRight ? <button title="移到右欄" style={canRight ? miniBtn : disabledBtn} onClick={stop(onRight, canRight)}>›</button> : null}
      <button title="上移" style={canUp ? miniBtn : disabledBtn} onClick={stop(onUp, canUp)}><Icon name="arrowUp" size={13} /></button>
      <button title="下移" style={canDown ? miniBtn : disabledBtn} onClick={stop(onDown, canDown)}><Icon name="arrowDown" size={13} /></button>
      <button title="複製" style={miniBtn} onClick={stop(onDup)}><Icon name="copy" size={13} /></button>
      <button title="刪除" style={{ ...miniBtn, color: '#c0584f', borderColor: '#e0b3ad' }} onClick={stop(onDel)}><Icon name="trash" size={13} /></button>
    </>
  )
  if (compact) {
    return (
      <div
        onClick={onSelect}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 7,
          padding: 9,
          borderRadius: 12,
          border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
          background: selected ? 'var(--accent-soft)' : 'var(--bg-2)',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name={TYPE_ICON[block.type] || 'list'} size={14} style={{ color: 'var(--text-2)' }} />
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end' }}>{buttons}</div>
      </div>
    )
  }
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 8px 7px 13px',
        borderRadius: 999,
        border: selected ? '1px solid var(--accent)' : '1px solid var(--border)',
        background: selected ? 'var(--accent-soft)' : 'var(--bg-2)',
        cursor: 'pointer',
      }}
    >
      <Icon name={TYPE_ICON[block.type] || 'list'} size={14} style={{ color: 'var(--text-2)' }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      {buttons}
    </div>
  )
}

export function BlockListPanel() {
  const { ui, activeTemplate, selectBlock, moveBlockDir, duplicateBlock, removeBlock, moveColChild } = useOctool()
  const blocks = activeTemplate?.blocks || []

  if (!blocks.length) {
    return (
      <div style={{ border: '1.5px dashed var(--border)', borderRadius: 14, padding: 28, textAlign: 'center', color: 'var(--text-2)', fontSize: 13 }}>
        還沒有積木，先到「新增」加一個。
      </div>
    )
  }

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 10 }}>積木列表</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {blocks.map((b, i) => {
          const isCol = b.type === 'columns'
          const cols = b.children || []
          return (
            <div key={b.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <RowPill
                block={b}
                label={isCol ? `佈局（${cols.length} 欄）` : TYPE_LABEL[b.type as BlockType] || b.type}
                selected={ui.selBlock === b.id}
                canUp={i > 0}
                canDown={i < blocks.length - 1}
                onSelect={() => selectBlock(b.id)}
                onUp={() => moveBlockDir(b.id, -1)}
                onDown={() => moveBlockDir(b.id, 1)}
                onDup={() => duplicateBlock(b.id)}
                onDel={() => removeBlock(b.id)}
              />
              {isCol ? (
                <div style={{ display: 'flex', gap: 6, paddingLeft: 14 }}>
                  {cols.map((col, ci) => (
                    <div key={ci} style={{ flex: 1, minWidth: 0, background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-2)', padding: '0 2px' }}>欄 {ci + 1}</div>
                      {col.length ? (
                        col.map((cb, cj) => (
                          <RowPill
                            key={cb.id}
                            block={cb}
                            label={TYPE_LABEL[cb.type as BlockType] || cb.type}
                            selected={ui.selBlock === cb.id}
                            canUp={cj > 0}
                            canDown={cj < col.length - 1}
                            canLeft={ci > 0}
                            canRight={ci < cols.length - 1}
                            onSelect={() => selectBlock(cb.id)}
                            onUp={() => moveBlockDir(cb.id, -1)}
                            onDown={() => moveBlockDir(cb.id, 1)}
                            onLeft={() => moveColChild(cb.id, -1)}
                            onRight={() => moveColChild(cb.id, 1)}
                            onDup={() => duplicateBlock(cb.id)}
                            onDel={() => removeBlock(cb.id)}
                          />
                        ))
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--text-2)', textAlign: 'center', padding: '10px 2px' }}>此欄為空</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
