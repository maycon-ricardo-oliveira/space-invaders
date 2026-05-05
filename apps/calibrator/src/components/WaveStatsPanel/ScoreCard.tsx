// apps/calibrator/src/components/WaveStatsPanel/ScoreCard.tsx
import React from 'react'
import { computeWaveScore } from '../../services/WaveScoreCalculator'
import type { Grid } from '../../lib/schemas'

export function ScoreCard({ grid, delay }: { grid: unknown; delay: number }) {
  const score = computeWaveScore(grid as Grid, delay)
  const color = score < 33 ? '#2ecc71' : score < 66 ? '#f1c40f' : '#e74c3c'
  return (
    <div style={{ background: '#2c2c3e', borderRadius: 4, padding: 10 }}>
      <div style={{ fontSize: 9, color: '#666', marginBottom: 4 }}>Difficulty Score</div>
      <div style={{ fontSize: 28, fontWeight: 'bold', color }}>{score}</div>
      <div style={{ fontSize: 9, color: '#555' }}>composition-based</div>
    </div>
  )
}
