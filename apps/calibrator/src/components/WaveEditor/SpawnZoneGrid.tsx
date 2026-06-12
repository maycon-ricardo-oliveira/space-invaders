// apps/calibrator/src/components/WaveEditor/SpawnZoneGrid.tsx
import React from 'react'
import type { EntityType, Grid } from '../../lib/schemas'
import { GRID_COLS, GRID_ROWS, PLAYER_SPAWN_ROW, PLAYER_SPAWN_COL } from '../../lib/gridConstants'

const ENTITY_ICON: Record<EntityType, string> = {
  grunt: '👾', rocket: '🚀', shield: '🛡️', rock: '🪨',
}

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

  function handleClick(ri: number, ci: number) {
    if (ri === PLAYER_SPAWN_ROW && ci === PLAYER_SPAWN_COL) return
    const newGrid: Grid = normalized.map((r, row) =>
      r.map((cell, col) => {
        if (row !== ri || col !== ci) return cell
        if (cell !== null) return null
        if (selectedEntity === 'eraser') return null
        return selectedEntity
      })
    )
    onGridChange(newGrid)
  }

  return (
    <div
      style={{
        // Fills available height while keeping portrait phone aspect ratio.
        // gap:0 + container background as "border color" keeps cells square.
        height: '100%',
        aspectRatio: `${GRID_COLS} / ${GRID_ROWS}`,
        display: 'grid',
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        gap: 1,
        background: '#111',  // gap color
        border: '1px solid #111',
        boxSizing: 'border-box',
      }}
    >
      {normalized.flatMap((row, ri) =>
        row.map((cell, ci) => {
          const isPlayerSpawn = ri === PLAYER_SPAWN_ROW && ci === PLAYER_SPAWN_COL
          return (
            <div
              key={`${ri}-${ci}`}
              data-testid="grid-cell"
              onClick={() => handleClick(ri, ci)}
              title={isPlayerSpawn ? 'Player spawn — locked' : undefined}
              style={{
                background: isPlayerSpawn ? '#0a0a16' : cell ? '#1e2d1e' : '#1a1a2e',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: isPlayerSpawn ? 'default' : 'pointer',
                fontSize: 12, userSelect: 'none',
                opacity: isPlayerSpawn ? 0.35 : 1,
              }}
            >
              {isPlayerSpawn ? '🎮' : cell ? ENTITY_ICON[cell] : ''}
            </div>
          )
        })
      )}
    </div>
  )
}
