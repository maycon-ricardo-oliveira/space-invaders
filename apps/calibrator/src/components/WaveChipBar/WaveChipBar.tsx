// apps/calibrator/src/components/WaveChipBar/WaveChipBar.tsx
'use client'
import React, { useState } from 'react'
import { WaveChip } from './WaveChip'
import { createWaveAction, deleteWaveAction, getWaves } from '../../../app/actions/wave.actions'
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

  async function handleDeleteWave(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Deletar esta wave?')) return
    await deleteWaveAction(id)
    const updated = await getWaves(levelId)
    const typedWaves = updated as Wave[]
    setWaves(typedWaves)
    if (activeId === id) {
      const next = typedWaves[0] ?? null
      setActiveId(next?.id)
      onSelectWave?.(next)
    }
  }

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '8px 12px', background: '#111',
      borderBottom: '1px solid #2c2c3e', overflowX: 'auto', flexShrink: 0, alignItems: 'center',
    }}>
      {waves.map(w => (
        <WaveChip
          key={w.id}
          wave={w}
          active={activeId === w.id}
          onClick={() => select(w)}
          onDelete={e => handleDeleteWave(w.id, e)}
        />
      ))}
      {waves.length < MAX_WAVES && (
        <button
          onClick={handleCreateWave}
          style={{
            background: '#2c2c3e', border: '1px dashed #3498db', borderRadius: 4,
            padding: '6px 12px', cursor: 'pointer', color: '#3498db', fontSize: 18,
            lineHeight: 1, flexShrink: 0,
          }}
          title="Nova wave"
        >+</button>
      )}
    </div>
  )
}
