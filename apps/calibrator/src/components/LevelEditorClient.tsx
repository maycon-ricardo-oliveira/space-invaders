'use client'
import React, { useState } from 'react'
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
  const [waves, setWaves] = useState<Wave[]>(level.waves)
  const [selectedWave, setSelectedWave] = useState<Wave | null>(level.waves[0] ?? null)

  function handleWavesChange(updatedWaves: Wave[], next: Wave | null) {
    setWaves(updatedWaves)
    setSelectedWave(next)
  }

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <EditorPane
        key={selectedWave?.id ?? 'no-wave'}
        level={level}
        initialWave={selectedWave}
        initialWaves={waves}
        levelId={level.id}
        patterns={patterns}
        onWavesChange={handleWavesChange}
        onSelectWave={setSelectedWave}
      />
    </div>
  )
}
