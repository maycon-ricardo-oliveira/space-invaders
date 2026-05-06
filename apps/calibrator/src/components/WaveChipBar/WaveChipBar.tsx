// apps/calibrator/src/components/WaveChipBar/WaveChipBar.tsx
'use client'
import React, { useState } from 'react'
import { createWaveAction, deleteWaveAction, getWaves } from '../../../app/actions/wave.actions'
import { computeWaveScore } from '../../services/WaveScoreCalculator'
import type { Grid } from '../../lib/schemas'
import { GRID_COLS, GRID_ROWS } from '../../lib/gridConstants'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown }

const MAX_WAVES = 10

interface WaveChipBarProps {
  initialWaves: Wave[]
  levelId: number
  onSelectWave?: (wave: Wave | null) => void
}

export function WaveChipBar({ initialWaves, levelId, onSelectWave }: WaveChipBarProps) {
  const [waves, setWaves] = useState<Wave[]>(initialWaves)
  const [activeId, setActiveId] = useState(initialWaves[0]?.id)

  function select(wave: Wave) {
    setActiveId(wave.id)
    onSelectWave?.(wave)
  }

  async function handleCreateWave() {
    if (waves.length >= MAX_WAVES) return
    const emptyGrid: Grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null))
    await createWaveAction(levelId, { order: waves.length + 1, delay: 3.0, grid: emptyGrid })
    const updated = await getWaves(levelId)
    const typedWaves = updated as Wave[]
    setWaves(typedWaves)
    const newest = typedWaves.at(-1)
    if (newest) select(newest)
  }

  async function handleDeleteWave() {
    const toDelete = waves.find(w => w.id === activeId)
    if (!toDelete || !confirm('Deletar esta wave?')) return
    await deleteWaveAction(toDelete.id)
    const updated = await getWaves(levelId)
    const typedWaves = updated as Wave[]
    setWaves(typedWaves)
    const next = typedWaves[0] ?? null
    setActiveId(next?.id)
    onSelectWave?.(next)
  }

  return (
    <div style={{
      display: 'flex', gap: 8, padding: '8px 12px', background: '#111',
      borderBottom: '1px solid #2c2c3e', alignItems: 'center', flexShrink: 0,
    }}>
      <span style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0 }}>Wave</span>
      <select
        value={activeId ?? ''}
        onChange={e => {
          const wave = waves.find(w => w.id === Number(e.target.value))
          if (wave) select(wave)
        }}
        style={{
          flex: 1, background: '#2c2c3e', color: '#eee',
          border: '1px solid #3c3c4e', borderRadius: 4,
          padding: '4px 8px', fontSize: 13,
        }}
      >
        {waves.map(w => {
          const score = computeWaveScore(w.grid as Grid, w.delay)
          return <option key={w.id} value={w.id}>W{w.order} — score {score}</option>
        })}
        {waves.length === 0 && <option value="" disabled>Sem waves</option>}
      </select>
      {waves.length < MAX_WAVES && (
        <button
          onClick={handleCreateWave}
          title="Nova wave"
          style={{ background: '#2c2c3e', border: '1px solid #3498db', borderRadius: 4, padding: '4px 10px', color: '#3498db', fontSize: 16, cursor: 'pointer', flexShrink: 0 }}
        >+</button>
      )}
      {waves.length > 0 && (
        <button
          onClick={handleDeleteWave}
          title="Deletar wave"
          style={{ background: '#2c2c3e', border: '1px solid #555', borderRadius: 4, padding: '4px 10px', color: '#888', fontSize: 12, cursor: 'pointer', flexShrink: 0 }}
        >✕</button>
      )}
    </div>
  )
}
