// apps/calibrator/src/components/WaveStatsPanel/WaveStatsPanel.tsx
'use client'
import React from 'react'
import { ScoreCard } from './ScoreCard'
import { LevelParamsSliders } from './LevelParamsSliders'
import type { Grid } from '../../lib/schemas'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown; createdAt: Date; updatedAt: Date }
type Level = {
  id: number; phaseId: number; name: string; index: number;
  enemySpeed: number; shotDelay: number; fuelDrain: number;
  enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number;
  hasPowerUps: boolean; parallaxTheme: string | null; createdAt: Date; updatedAt: Date;
}

interface WaveStatsPanelProps {
  wave: Wave
  level: Level
  onLevelParamChange: (name: string, value: number) => void
}

export function WaveStatsPanel({ wave, level, onLevelParamChange }: WaveStatsPanelProps) {
  const enemyCount = (wave.grid as Grid).flat().filter(Boolean).length

  return (
    <div style={{ width: '25%', minWidth: 180, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, borderRight: '1px solid #2c2c3e', overflow: 'auto' }}>
      <div style={{ background: '#2c2c3e', borderRadius: 4, padding: 10 }}>
        <div style={{ fontSize: 9, color: '#666', marginBottom: 6 }}>Wave Info</div>
        <div style={{ fontSize: 10, color: '#aaa' }}>{enemyCount} inimigo{enemyCount !== 1 ? 's' : ''}</div>
        <div style={{ fontSize: 10, color: '#aaa' }}>Delay: {wave.delay.toFixed(1)}s</div>
      </div>
      <ScoreCard grid={wave.grid} delay={wave.delay} />
      <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>Level Params</div>
      <LevelParamsSliders level={level} onChange={onLevelParamChange} />
    </div>
  )
}
