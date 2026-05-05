'use client'
import React, { useState } from 'react'
import { WaveChipBar } from './WaveChipBar/WaveChipBar'
import { EditorPane } from './WaveEditor/EditorPane'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown; createdAt: Date; updatedAt: Date }
type Level = {
  id: number; phaseId: number; name: string; index: number;
  enemySpeed: number; shotDelay: number; fuelDrain: number;
  enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number;
  hasPowerUps: boolean; parallaxTheme: string | null; createdAt: Date; updatedAt: Date;
  waves: Wave[];
}
type UserPattern = { id: number; name: string; grid: unknown; createdAt: Date }

interface LevelEditorClientProps {
  level: Level
  patterns: UserPattern[]
}

export function LevelEditorClient({ level, patterns }: LevelEditorClientProps) {
  const [selectedWave, setSelectedWave] = useState<Wave>(level.waves[0])

  if (level.waves.length === 0) {
    return <div style={{ padding: 40, color: '#555' }}>No waves. Add a wave to begin.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <WaveChipBar
        waves={level.waves}
        levelId={level.id}
        onSelectWave={setSelectedWave}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <EditorPane
          key={selectedWave.id}
          level={level}
          initialWave={selectedWave}
          patterns={patterns}
        />
      </div>
    </div>
  )
}
