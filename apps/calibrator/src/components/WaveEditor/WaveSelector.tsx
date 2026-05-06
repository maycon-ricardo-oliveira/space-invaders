// apps/calibrator/src/components/WaveEditor/WaveSelector.tsx
'use client'
import React, { useState } from 'react'
import { createWaveAction, deleteWaveAction, getWaves } from '../../../app/actions/wave.actions'
import { computeWaveScore } from '../../services/WaveScoreCalculator'
import type { Grid } from '../../lib/schemas'
import { GRID_COLS, GRID_ROWS } from '../../lib/gridConstants'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown }

const MAX_WAVES = 10

interface WaveSelectorProps {
  initialWaves: Wave[]
  levelId: number
  activeWaveId: number | undefined
  onSelectWave: (wave: Wave | null) => void
  onWavesChange: (waves: Wave[], selected: Wave | null) => void
}

export function WaveSelector({ initialWaves, levelId, activeWaveId, onSelectWave, onWavesChange }: WaveSelectorProps) {
  const [waves, setWaves] = useState<Wave[]>(initialWaves)

  async function handleCreate() {
    if (waves.length >= MAX_WAVES) return
    const emptyGrid: Grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null))
    await createWaveAction(levelId, { order: waves.length + 1, delay: 3.0, grid: emptyGrid })
    const updated = await getWaves(levelId) as Wave[]
    setWaves(updated)
    const newest = updated.at(-1) ?? null
    onWavesChange(updated, newest)
    if (newest) onSelectWave(newest)
  }

  async function handleDelete() {
    const toDelete = waves.find(w => w.id === activeWaveId)
    if (!toDelete || !confirm('Deletar esta wave?')) return
    await deleteWaveAction(toDelete.id)
    const updated = await getWaves(levelId) as Wave[]
    setWaves(updated)
    const next = updated[0] ?? null
    onWavesChange(updated, next)
    onSelectWave(next)
  }

  return (
    <div>
      <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 }}>Wave</div>
      <select
        value={activeWaveId ?? ''}
        onChange={e => {
          const wave = waves.find(w => w.id === Number(e.target.value))
          if (wave) onSelectWave(wave)
        }}
        disabled={waves.length === 0}
        style={{
          width: '100%', background: '#2c2c3e', color: waves.length ? '#eee' : '#555',
          border: '1px solid #3c3c4e', borderRadius: 4,
          padding: '5px 6px', fontSize: 12,
        }}
      >
        {waves.map(w => {
          const score = computeWaveScore(w.grid as Grid, w.delay)
          return <option key={w.id} value={w.id}>W{w.order} — score {score}</option>
        })}
        {waves.length === 0 && <option value="" disabled>—</option>}
      </select>
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        <button
          onClick={handleCreate}
          disabled={waves.length >= MAX_WAVES}
          title="Nova wave"
          style={{
            flex: 1, background: '#2c2c3e', border: '1px solid #3498db', borderRadius: 4,
            color: '#3498db', fontSize: 16, cursor: waves.length < MAX_WAVES ? 'pointer' : 'default',
            padding: '4px 0',
          }}
        >+</button>
        <button
          onClick={handleDelete}
          disabled={!activeWaveId}
          title="Deletar wave"
          style={{
            flex: 1, background: '#2c2c3e', border: '1px solid #555', borderRadius: 4,
            color: activeWaveId ? '#888' : '#333', fontSize: 12,
            cursor: activeWaveId ? 'pointer' : 'default', padding: '4px 0',
          }}
        >✕</button>
      </div>
    </div>
  )
}
