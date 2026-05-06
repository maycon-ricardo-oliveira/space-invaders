// apps/calibrator/src/components/WaveChipBar/WaveChip.tsx
'use client'
import React from 'react'
import { computeWaveScore } from '../../services/WaveScoreCalculator'
import type { Grid } from '../../lib/schemas'

interface WaveChipProps {
  wave: { id: number; order: number; delay: number; grid: unknown }
  active: boolean
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}

export function WaveChip({ wave, active, onClick, onDelete }: WaveChipProps) {
  const score = computeWaveScore(wave.grid as Grid, wave.delay)
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px', cursor: 'pointer', borderRadius: 4,
        background: active ? '#1e3a5f' : '#2c2c3e',
        border: `1px solid ${active ? '#3498db' : '#3c3c4e'}`,
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: active ? '#3498db' : '#aaa', fontWeight: 'bold' }}>
          W{wave.order}
        </span>
        <span data-testid="wave-score" style={{ fontSize: 11, color: '#f1c40f', marginTop: 2 }}>
          {score}
        </span>
      </div>
      <button
        onClick={onDelete}
        style={{ fontSize: 10, color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}
        title="Deletar wave"
      >
        ✕
      </button>
    </div>
  )
}
