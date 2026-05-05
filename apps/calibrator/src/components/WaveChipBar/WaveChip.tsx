// apps/calibrator/src/components/WaveChipBar/WaveChip.tsx
'use client'
import React from 'react'
import { computeWaveScore } from '../../services/WaveScoreCalculator'
import type { Grid } from '../../lib/schemas'

interface WaveChipProps {
  wave: { id: number; order: number; delay: number; grid: unknown }
  active: boolean
  onClick: () => void
}

export function WaveChip({ wave, active, onClick }: WaveChipProps) {
  const score = computeWaveScore(wave.grid as Grid, wave.delay)
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '6px 10px', cursor: 'pointer', borderRadius: 4, minWidth: 48,
        background: active ? '#1e3a5f' : '#2c2c3e',
        border: `1px solid ${active ? '#3498db' : '#3c3c4e'}`,
      }}
    >
      <span style={{ fontSize: 11, color: active ? '#3498db' : '#aaa', fontWeight: 'bold' }}>
        W{wave.order}
      </span>
      <span data-testid="wave-score" style={{ fontSize: 9, color: '#f1c40f', marginTop: 2 }}>
        {score}
      </span>
    </div>
  )
}
