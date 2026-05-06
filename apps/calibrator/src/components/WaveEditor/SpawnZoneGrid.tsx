// apps/calibrator/src/components/WaveEditor/SpawnZoneGrid.tsx
import React from 'react'
import type { EntityType, Grid } from '../../lib/schemas'
import { CELL_SIZE } from '../../lib/gridConstants'

const ENTITY_ICON: Record<EntityType, string> = {
  grunt: '👾', rocket: '🚀', shield: '🛡️', rock: '🪨',
}

interface SpawnZoneGridProps {
  grid: Grid
  selectedEntity: EntityType | 'eraser'
  onGridChange: (newGrid: Grid) => void
}

export function SpawnZoneGrid({ grid, selectedEntity, onGridChange }: SpawnZoneGridProps) {
  function handleClick(row: number, col: number) {
    const newGrid: Grid = grid.map((r, ri) =>
      r.map((cell, ci) => {
        if (ri !== row || ci !== col) return cell
        if (cell !== null) return null           // occupied → clear
        if (selectedEntity === 'eraser') return null
        return selectedEntity
      })
    )
    onGridChange(newGrid)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {grid.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 2 }}>
          {row.map((cell, ci) => (
            <div
              key={ci}
              data-testid="grid-cell"
              onClick={() => handleClick(ri, ci)}
              style={{
                width: CELL_SIZE, height: CELL_SIZE,
                background: cell ? '#1e2d1e' : '#1a1a2e',
                border: `1px solid ${cell ? '#2ecc71' : '#2c2c3e'}`,
                borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 14, userSelect: 'none',
              }}
            >
              {cell ? ENTITY_ICON[cell] : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
