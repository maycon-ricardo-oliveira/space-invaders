'use client'
import React, { useState } from 'react'
import { WaveChipBar } from './WaveChipBar/WaveChipBar'
import { EditorPane } from './WaveEditor/EditorPane'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown }
type Level = {
  id: number; phaseId: number; name: string; index: number;
  enemySpeed: number; shotDelay: number; fuelDrain: number;
  enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number;
  hasPowerUps: boolean; parallaxTheme: string | null;
  waves: Wave[];
}
type UserPattern = { id: number; name: string; grid: unknown }

interface LevelEditorClientProps {
  level: Level
  patterns: UserPattern[]
}

export function LevelEditorClient({ level, patterns }: LevelEditorClientProps) {
  const [selectedWave, setSelectedWave] = useState<Wave | null>(level.waves[0] ?? null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <WaveChipBar
        initialWaves={level.waves}
        levelId={level.id}
        onSelectWave={setSelectedWave}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {selectedWave ? (
          <EditorPane
            key={selectedWave.id}
            level={level}
            initialWave={selectedWave}
            patterns={patterns}
          />
        ) : (
          <div style={{ padding: 40, color: '#555', fontSize: 14 }}>
            Sem waves. Clique em + para adicionar.
          </div>
        )}
      </div>
    </div>
  )
}
