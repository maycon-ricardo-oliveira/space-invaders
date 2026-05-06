// apps/calibrator/src/components/WaveEditor/WaveEditor.tsx
'use client'
import React, { useState, useCallback } from 'react'
import { EntityToolbox } from './EntityToolbox'
import { PatternPicker } from './PatternPicker'
import { SpawnZoneGrid } from './SpawnZoneGrid'
import { GameAreaPreview } from './GameAreaPreview'
import type { EntityType, Grid } from '../../lib/schemas'
import { GRID_COLS, GRID_ROWS } from '../../lib/gridConstants'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown }
type UserPattern = { id: number; name: string; grid: unknown }

interface WaveEditorProps {
  wave: Wave
  userPatterns: UserPattern[]
  onWaveChange: (waveId: number, grid: Grid) => void
  onSavePattern: (name: string, grid: Grid) => void
}

// Always normalizes to exactly GRID_ROWS × GRID_COLS, padding/trimming as needed.
function ensureGrid(raw: unknown): Grid {
  const src = Array.isArray(raw) ? (raw as Grid) : []
  return Array.from({ length: GRID_ROWS }, (_, ri) =>
    Array.from({ length: GRID_COLS }, (_, ci) => src[ri]?.[ci] ?? null)
  )
}

export function WaveEditor({ wave, userPatterns, onWaveChange, onSavePattern }: WaveEditorProps) {
  const [grid, setGrid] = useState<Grid>(() => ensureGrid(wave.grid))
  const [selectedEntity, setSelectedEntity] = useState<EntityType | 'eraser'>('grunt')

  const handleGridChange = useCallback((newGrid: Grid) => {
    setGrid(newGrid)
    onWaveChange(wave.id, newGrid)
  }, [wave.id, onWaveChange])

  const enemyCount = grid.flat().filter(Boolean).length

  return (
    <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
      <EntityToolbox selected={selectedEntity} onSelect={setSelectedEntity} />
      <PatternPicker
        userPatterns={userPatterns}
        selectedEntity={selectedEntity === 'eraser' ? 'grunt' : selectedEntity}
        enemyCount={enemyCount || 4}
        onApplyPattern={handleGridChange}
        onSavePattern={name => onSavePattern(name, grid)}
      />
      <SpawnZoneGrid
        grid={grid}
        selectedEntity={selectedEntity}
        onGridChange={handleGridChange}
      />
      <GameAreaPreview />
    </div>
  )
}
