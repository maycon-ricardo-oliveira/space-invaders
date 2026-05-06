// apps/calibrator/src/components/WaveEditor/WaveEditor.tsx
'use client'
import React, { useState, useCallback } from 'react'
import { EntityToolbox } from './EntityToolbox'
import { PatternPicker } from './PatternPicker'
import { SpawnZoneGrid } from './SpawnZoneGrid'
import { WaveSelector } from './WaveSelector'
import { computeWaveScore } from '../../services/WaveScoreCalculator'
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

function ensureGrid(raw: unknown): Grid {
  const src = Array.isArray(raw) ? (raw as Grid) : []
  return Array.from({ length: GRID_ROWS }, (_, ri) =>
    Array.from({ length: GRID_COLS }, (_, ci) => src[ri]?.[ci] ?? null)
  )
}

function scoreColor(score: number): string {
  if (score <= 33) return '#2ecc71'
  if (score <= 66) return '#f39c12'
  return '#e74c3c'
}

const WAVE_PANEL_W = 156
const TOOLS_PANEL_W = 130

export function WaveEditor({ wave, userPatterns, initialWaves, levelId, onWaveChange, onSavePattern, onWavesChange, onSelectWave }: WaveEditorProps) {
  const [grid, setGrid] = useState<Grid>(() => ensureGrid(wave?.grid))
  const [selectedEntity, setSelectedEntity] = useState<EntityType | 'eraser'>('grunt')

  const handleGridChange = useCallback((newGrid: Grid) => {
    setGrid(newGrid)
    if (wave) onWaveChange(wave.id, newGrid)
  }, [wave, onWaveChange])

  const enemyCount = grid.flat().filter(Boolean).length
  const liveScore = wave ? computeWaveScore(grid, wave.delay) : null

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

      {/* ── Wave panel ── */}
      <div style={{
        width: WAVE_PANEL_W, flexShrink: 0,
        background: '#0d0d1a',
        borderRight: '1px solid #2c2c3e',
        display: 'flex', flexDirection: 'column',
        padding: '10px 8px', gap: 8, overflow: 'hidden',
      }}>
        <WaveSelector
          initialWaves={initialWaves}
          levelId={levelId}
          activeWaveId={wave?.id}
          onSelectWave={onSelectWave}
          onWavesChange={onWavesChange}
        />

        {liveScore !== null && (
          <div style={{ borderTop: '1px solid #1e1e2e', paddingTop: 10, marginTop: 4 }}>
            <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 }}>
              Dificuldade
            </div>
            <div style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: scoreColor(liveScore) }}>
              {liveScore}
            </div>
            <div style={{ fontSize: 10, color: '#3c3c4e', marginTop: 4 }}>
              ao vivo
            </div>
          </div>
        )}
      </div>

      {/* ── Editor tools panel ── */}
      <div style={{
        width: TOOLS_PANEL_W, flexShrink: 0,
        background: '#1a1a2e',
        borderRight: '1px solid #2c2c3e',
        display: 'flex', flexDirection: 'column',
        padding: '10px 8px', gap: 8, overflow: 'hidden',
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
      </div>

      {/* ── Grid area ── */}
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
