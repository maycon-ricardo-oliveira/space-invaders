// apps/calibrator/src/components/WaveEditor/WaveEditor.tsx
'use client'
import React, { useState, useCallback } from 'react'
import { EntityToolbox } from './EntityToolbox'
import { PatternPicker } from './PatternPicker'
import { SpawnZoneGrid } from './SpawnZoneGrid'
import { GameAreaPreview } from './GameAreaPreview'
import type { EntityType, Grid } from '../../lib/schemas'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown }
type UserPattern = { id: number; name: string; grid: unknown }

interface WaveEditorProps {
  wave: Wave
  userPatterns: UserPattern[]
  onWaveChange: (waveId: number, grid: Grid) => void
  onSavePattern: (name: string, grid: Grid) => void
}

const DEFAULT_ROWS = 4
const DEFAULT_COLS = 11

function ensureGrid(raw: unknown): Grid {
  if (Array.isArray(raw) && raw.length > 0) return raw as Grid
  return Array.from({ length: DEFAULT_ROWS }, () => Array(DEFAULT_COLS).fill(null))
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
