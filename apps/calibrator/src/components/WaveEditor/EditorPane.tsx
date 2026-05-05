// apps/calibrator/src/components/WaveEditor/EditorPane.tsx
'use client'
import React, { useState, useCallback, useTransition } from 'react'
import { WaveStatsPanel } from '../WaveStatsPanel/WaveStatsPanel'
import { WaveEditor } from './WaveEditor'
import { updateWaveAction } from '../../../app/actions/wave.actions'
import { updateLevelParamsAction } from '../../../app/actions/level.actions'
import { savePatternAction } from '../../../app/actions/pattern.actions'
import type { Grid } from '../../lib/schemas'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown; createdAt: Date; updatedAt: Date }
type Level = {
  id: number; phaseId: number; name: string; index: number;
  enemySpeed: number; shotDelay: number; fuelDrain: number;
  enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number;
  hasPowerUps: boolean; parallaxTheme: string | null; createdAt: Date; updatedAt: Date;
  waves: Wave[];
}
type UserPattern = { id: number; name: string; grid: unknown; createdAt: Date }

interface EditorPaneProps {
  level: Level
  initialWave: Wave
  patterns: UserPattern[]
}

export function EditorPane({ level, initialWave, patterns }: EditorPaneProps) {
  const [currentLevel, setCurrentLevel] = useState(level)
  const [selectedWave] = useState(initialWave)  // controlled by parent via key prop
  const [userPatterns, setUserPatterns] = useState(patterns)
  const [, startTransition] = useTransition()

  // Debounce timer ref
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleWaveChange = useCallback((waveId: number, grid: Grid) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        await updateWaveAction(waveId, { grid })
      })
    }, 500)
  }, [])

  const handleLevelParamChange = useCallback((name: string, value: number) => {
    setCurrentLevel(prev => ({ ...prev, [name]: value }))
    startTransition(async () => {
      await updateLevelParamsAction(level.id, { [name]: value })
    })
  }, [level.id])

  async function handleSavePattern(name: string, grid: Grid) {
    const saved = await savePatternAction({ name, grid })
    setUserPatterns(prev => [saved as UserPattern, ...prev])
  }

  if (!selectedWave) return <div style={{ padding: 40, color: '#555' }}>No waves. Add a wave to begin.</div>

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <WaveStatsPanel
        wave={selectedWave}
        level={currentLevel}
        onLevelParamChange={handleLevelParamChange}
      />
      <WaveEditor
        wave={selectedWave}
        userPatterns={userPatterns}
        onWaveChange={handleWaveChange}
        onSavePattern={handleSavePattern}
      />
    </div>
  )
}
