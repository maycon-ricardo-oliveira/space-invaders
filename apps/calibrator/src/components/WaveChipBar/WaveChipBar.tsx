// apps/calibrator/src/components/WaveChipBar/WaveChipBar.tsx
'use client'
import React, { useState } from 'react'
import { WaveChip } from './WaveChip'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown }

interface WaveChipBarProps {
  waves: Wave[]
  levelId: number
  onSelectWave?: (wave: Wave) => void
}

export function WaveChipBar({ waves, levelId, onSelectWave }: WaveChipBarProps) {
  const [activeId, setActiveId] = useState(waves[0]?.id)

  function select(wave: Wave) {
    setActiveId(wave.id)
    onSelectWave?.(wave)
  }

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '8px 12px', background: '#111',
      borderBottom: '1px solid #2c2c3e', overflowX: 'auto', flexShrink: 0,
    }}>
      {waves.map(w => (
        <WaveChip key={w.id} wave={w} active={activeId === w.id} onClick={() => select(w)} />
      ))}
    </div>
  )
}
