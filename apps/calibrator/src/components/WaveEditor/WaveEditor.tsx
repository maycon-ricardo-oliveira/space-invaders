// apps/calibrator/src/components/WaveEditor/WaveEditor.tsx
'use client'
import React, { useState, useCallback, useEffect } from 'react'
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
  const [selectedEntity, setSelectedEntity] = useState<EntityType | 'eraser'>('basic-enemy')

  // Re-seed the local grid when the wave changes (swap waves / fresh server data).
  // This is NOT a user edit — bypass onWaveChange so the debounced auto-save stays quiet.
  useEffect(() => {
    setGrid(ensureGrid(wave.grid))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wave.id])

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
        selectedEntity={selectedEntity === 'eraser' ? 'basic-enemy' : selectedEntity}
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
