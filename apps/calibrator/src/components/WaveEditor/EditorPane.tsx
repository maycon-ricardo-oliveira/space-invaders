// apps/calibrator/src/components/WaveEditor/EditorPane.tsx
'use client'
import React, { useState, useCallback, useTransition, useEffect } from 'react'
import { WaveStatsPanel } from '../WaveStatsPanel/WaveStatsPanel'
import { WaveEditor } from './WaveEditor'
import { updateWaveAction } from '../../../app/actions/wave.actions'
import { updateLevelParamsAction } from '../../../app/actions/level.actions'
import { savePatternAction } from '../../../app/actions/pattern.actions'
import type { Grid } from '../../lib/schemas'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown }
type Level = {
  id: number; phaseId: number; name: string; index: number;
  enemySpeed: number; shotDelay: number; fuelDrain: number;
  enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number;
  hasPowerUps: boolean; parallaxTheme: string | null;
  waves: Wave[];
}
type UserPattern = { id: number; name: string; grid: unknown }

interface EditorPaneProps {
  level: Level
  initialWave: Wave | null
  initialWaves: Wave[]
  levelId: number
  patterns: UserPattern[]
  onWavesChange: (waves: Wave[], selected: Wave | null) => void
  onSelectWave: (wave: Wave | null) => void
}

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved'

export function EditorPane({ level, initialWave, initialWaves, levelId, patterns, onWavesChange, onSelectWave }: EditorPaneProps) {
  const [currentLevel, setCurrentLevel] = useState(level)
  const [userPatterns, setUserPatterns] = useState(patterns)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [, startTransition] = useTransition()

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestGridRef = React.useRef<{ waveId: number; grid: Grid } | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleWaveChange = useCallback((waveId: number, grid: Grid) => {
    latestGridRef.current = { waveId, grid }
    setSaveStatus('unsaved')
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setSaveStatus('saving')
      startTransition(async () => {
        await updateWaveAction(waveId, { grid })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      })
    }, 500)
  }, [])

  async function handleManualSave() {
    if (!latestGridRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveStatus('saving')
    const { waveId, grid } = latestGridRef.current
    await updateWaveAction(waveId, { grid })
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  const handleLevelParamChange = useCallback((name: string, value: number) => {
    setCurrentLevel(prev => ({ ...prev, [name]: value }))
    startTransition(async () => {
      await updateLevelParamsAction(level.id, { [name]: value })
    })
  }, [level.id])

  async function handleSavePattern(name: string, grid: Grid) {
    try {
      const saved = await savePatternAction({ name, grid })
      setUserPatterns(prev => [saved as UserPattern, ...prev])
    } catch (e) {
      console.error('Failed to save pattern:', e)
    }
  }

  const saveLabel =
    saveStatus === 'saving'  ? 'Salvando...' :
    saveStatus === 'saved'   ? '✓ Salvo' :
    saveStatus === 'unsaved' ? 'Salvar' :
    'Salvo'

  const saveBg =
    saveStatus === 'saved'   ? '#2ecc71' :
    saveStatus === 'unsaved' ? '#e67e22' :
    saveStatus === 'saving'  ? '#555' :
    '#2c2c3e'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Save bar */}
      {initialWave && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', background: '#0d0d1a', borderBottom: '1px solid #2c2c3e', flexShrink: 0,
        }}>
          <span style={{ fontSize: 12, color: '#555' }}>
            W{initialWave.order} — {currentLevel.name}
          </span>
          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving' || saveStatus === 'idle' || saveStatus === 'saved'}
            style={{
              background: saveBg,
              color: saveStatus === 'saved' ? '#111' : '#eee',
              border: 'none', borderRadius: 4, padding: '4px 12px',
              fontSize: 12, cursor: saveStatus === 'unsaved' ? 'pointer' : 'default',
            }}
          >
            {saveLabel}
          </button>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {initialWave && (
          <WaveStatsPanel
            wave={initialWave}
            level={currentLevel}
            onLevelParamChange={handleLevelParamChange}
          />
        )}
        <WaveEditor
          wave={initialWave}
          userPatterns={userPatterns}
          initialWaves={initialWaves}
          levelId={levelId}
          onWaveChange={handleWaveChange}
          onSavePattern={handleSavePattern}
          onWavesChange={onWavesChange}
          onSelectWave={onSelectWave}
        />
      </div>
    </div>
  )
}
