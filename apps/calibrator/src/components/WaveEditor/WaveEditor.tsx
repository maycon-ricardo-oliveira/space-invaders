// apps/calibrator/src/components/WaveEditor/WaveEditor.tsx
'use client'
import React, { useState, useCallback } from 'react'
import { EntityToolbox } from './EntityToolbox'
import { PatternPicker } from './PatternPicker'
import { SpawnZoneGrid } from './SpawnZoneGrid'
import { WaveSelector } from './WaveSelector'
import type { EntityType, Grid } from '../../lib/schemas'
import { GRID_COLS, GRID_ROWS } from '../../lib/gridConstants'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown }
type UserPattern = { id: number; name: string; grid: unknown }

interface WaveEditorProps {
  wave: Wave | null
  userPatterns: UserPattern[]
  initialWaves: Wave[]
  levelId: number
  onWaveChange: (waveId: number, grid: Grid) => void
  onSavePattern: (name: string, grid: Grid) => void
  onWavesChange: (waves: Wave[], selected: Wave | null) => void
  onSelectWave: (wave: Wave | null) => void
}

// Always normalizes to exactly GRID_ROWS × GRID_COLS, padding/trimming as needed.
function ensureGrid(raw: unknown): Grid {
  const src = Array.isArray(raw) ? (raw as Grid) : []
  return Array.from({ length: GRID_ROWS }, (_, ri) =>
    Array.from({ length: GRID_COLS }, (_, ci) => src[ri]?.[ci] ?? null)
  )
}

const LEFT_PANEL_WIDTH = 176

export function WaveEditor({ wave, userPatterns, initialWaves, levelId, onWaveChange, onSavePattern, onWavesChange, onSelectWave }: WaveEditorProps) {
  const [grid, setGrid] = useState<Grid>(() => ensureGrid(wave?.grid))
  const [selectedEntity, setSelectedEntity] = useState<EntityType | 'eraser'>('grunt')

  const handleGridChange = useCallback((newGrid: Grid) => {
    setGrid(newGrid)
    if (wave) onWaveChange(wave.id, newGrid)
  }, [wave, onWaveChange])

  const enemyCount = grid.flat().filter(Boolean).length

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
      {/* Left panel: entity picker + patterns + wave selector */}
      <div style={{
        width: LEFT_PANEL_WIDTH, flexShrink: 0,
        display: 'flex', flexDirection: 'column', gap: 8,
        padding: '10px 8px',
        borderRight: '1px solid #2c2c3e',
        overflow: 'hidden',
      }}>
        <EntityToolbox selected={selectedEntity} onSelect={setSelectedEntity} />
        <div style={{ flex: 1 }} />
        <PatternPicker
          userPatterns={userPatterns}
          selectedEntity={selectedEntity === 'eraser' ? 'grunt' : selectedEntity}
          enemyCount={enemyCount || 4}
          onApplyPattern={handleGridChange}
          onSavePattern={name => onSavePattern(name, grid)}
        />
        <div style={{ borderTop: '1px solid #2c2c3e', paddingTop: 8 }}>
          <WaveSelector
            initialWaves={initialWaves}
            levelId={levelId}
            activeWaveId={wave?.id}
            onSelectWave={onSelectWave}
            onWavesChange={onWavesChange}
          />
        </div>
      </div>

      {/* Grid area — fills height, grid scales via aspect-ratio */}
      <div style={{
        flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
        overflow: 'hidden', padding: 8, minHeight: 0,
      }}>
        {wave ? (
          <SpawnZoneGrid
            grid={grid}
            selectedEntity={selectedEntity}
            onGridChange={handleGridChange}
          />
        ) : (
          <div style={{ color: '#555', fontSize: 13, fontStyle: 'italic', textAlign: 'center' }}>
            Sem waves — clique em + para criar
          </div>
        )}
      </div>
    </div>
  )
}
