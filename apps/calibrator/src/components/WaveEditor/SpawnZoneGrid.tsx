// apps/calibrator/src/components/WaveEditor/SpawnZoneGrid.tsx
import React from 'react'
import type { EntityType, Grid } from '../../lib/schemas'
import { CELL_SIZE, GRID_COLS, GRID_ROWS, PLAYER_SPAWN_ROW, PLAYER_SPAWN_COL } from '../../lib/gridConstants'

const ENTITY_ICON: Record<EntityType, string> = {
  'basic-enemy': '👾', 'fast-enemy': '🚀', 'strong-enemy': '🛡️', 'asteroid': '🪨',
}

// Always returns exactly GRID_ROWS × GRID_COLS, padding with null or trimming.
function normalizeGrid(raw: Grid): Grid {
  return Array.from({ length: GRID_ROWS }, (_, ri) =>
    Array.from({ length: GRID_COLS }, (_, ci) => raw[ri]?.[ci] ?? null)
  )
}

interface SpawnZoneGridProps {
  grid: Grid
  selectedEntity: EntityType | 'eraser'
  onGridChange: (newGrid: Grid) => void
}

export function SpawnZoneGrid({ grid, selectedEntity, onGridChange }: SpawnZoneGridProps) {
  const normalized = normalizeGrid(grid)

  function handleClick(row: number, col: number) {
    if (row === PLAYER_SPAWN_ROW) return // player spawn row — whole row reserved
    const newGrid: Grid = normalized.map((r, ri) =>
      r.map((cell, ci) => {
        if (ri !== row || ci !== col) return cell
        if (cell !== null) return null
        if (selectedEntity === 'eraser') return null
        return selectedEntity
      })
    )
    onGridChange(newGrid)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {normalized.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 2 }}>
          {row.map((cell, ci) => {
            const isPlayerRow = ri === PLAYER_SPAWN_ROW
            const isPlayerCenter = isPlayerRow && ci === PLAYER_SPAWN_COL
            return (
              <div
                key={ci}
                data-testid="grid-cell"
                onClick={() => handleClick(ri, ci)}
                style={{
                  width: CELL_SIZE, height: CELL_SIZE,
                  background: isPlayerRow ? '#0d0d1a' : cell ? '#1e2d1e' : '#1a1a2e',
                  border: `1px solid ${isPlayerRow ? '#1e1e3e' : cell ? '#2ecc71' : '#2c2c3e'}`,
                  borderRadius: 2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isPlayerRow ? 'default' : 'pointer',
                  fontSize: 14, userSelect: 'none',
                  opacity: isPlayerRow ? 0.4 : 1,
                }}
                title={isPlayerRow ? 'Player spawn row — reserved' : undefined}
              >
                {isPlayerCenter ? '🚁' : isPlayerRow ? '' : cell ? ENTITY_ICON[cell] : ''}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
