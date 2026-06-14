// apps/calibrator/src/components/WaveEditor/EditorPane.tsx
'use client'
import React, { useState, useCallback, useTransition, useEffect } from 'react'
import { WaveStatsPanel } from '../WaveStatsPanel/WaveStatsPanel'
import { WaveEditor } from './WaveEditor'
import { updateWaveAction } from '../../../app/actions/wave.actions'
import { updateLevelParamsAction } from '../../../app/actions/level.actions'
import { savePatternAction } from '../../../app/actions/pattern.actions'
import type { Grid } from '../../lib/schemas'
import { GRID_COLS, GRID_ROWS } from '../../lib/gridConstants'

// Normalizes any stored grid to exactly GRID_ROWS × GRID_COLS (same shape the
// WaveEditor uses internally) so the stats panel always reads a full grid.
function ensureGrid(raw: unknown): Grid {
  const src = Array.isArray(raw) ? (raw as Grid) : []
  return Array.from({ length: GRID_ROWS }, (_, ri) =>
    Array.from({ length: GRID_COLS }, (_, ci) => src[ri]?.[ci] ?? null)
  )
}

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
  initialWave: Wave
  patterns: UserPattern[]
}

type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved'

export function EditorPane({ level, initialWave, patterns }: EditorPaneProps) {
  const [currentLevel, setCurrentLevel] = useState(level)
  // Derive directly from the prop so a new initialWave (even with the same id) is
  // reflected without a remount. This is a prop sync, not a user edit, so it must
  // NOT trigger auto-save — only handleWaveChange (user edits) saves.
  const selectedWave = initialWave
  const [userPatterns, setUserPatterns] = useState(patterns)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [, startTransition] = useTransition()

  // The grid being EDITED, lifted up from the WaveEditor so the stats panel
  // reflects live edits instead of the frozen server prop.
  const [currentGrid, setCurrentGrid] = useState<Grid>(() => ensureGrid(initialWave.grid))

  // Floating save toast — own element, fades in on 'saved' and out after ~2s.
  const [toastVisible, setToastVisible] = useState(false)

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const latestGridRef = React.useRef<{ waveId: number; grid: Grid } | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  // Swap waves / fresh server data → re-seed the lifted grid. NOT a user edit:
  // never triggers auto-save.
  useEffect(() => {
    setCurrentGrid(ensureGrid(initialWave.grid))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialWave.id])

  // Show the floating toast when a save completes; auto-hide after ~2s.
  useEffect(() => {
    if (saveStatus !== 'saved') return
    setToastVisible(true)
    const t = setTimeout(() => setToastVisible(false), 2000)
    return () => clearTimeout(t)
  }, [saveStatus])

  const handleWaveChange = useCallback((waveId: number, grid: Grid) => {
    latestGridRef.current = { waveId, grid }
    setCurrentGrid(grid)
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

  // The button no longer carries the "saved" state — success lives in the toast.
  const saveLabel = saveStatus === 'saving' ? 'Salvando...' : 'Salvar'

  const saveBg =
    saveStatus === 'unsaved' ? '#e67e22' :
    saveStatus === 'saving'  ? '#555' :
    '#2c2c3e'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Floating save toast — neon, own element, never affects layout */}
      <div
        data-testid="save-toast"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 9999,
          background: '#0d0d1a',
          border: '1px solid #5eead4',
          color: '#5eead4',
          boxShadow: '0 0 16px rgba(94,234,212,.55)',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: 0.5,
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          opacity: toastVisible ? 1 : 0,
          transform: toastVisible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity .25s ease, transform .25s ease',
        }}
      >
        ✓ Salvo
      </div>

      {/* Save bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 12px', background: '#0d0d1a', borderBottom: '1px solid #2c2c3e', flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, color: '#555' }}>
          W{selectedWave.order} — {currentLevel.name}
        </span>
        <button
          onClick={handleManualSave}
          disabled={saveStatus !== 'unsaved'}
          style={{
            background: saveBg,
            color: '#eee',
            border: 'none', borderRadius: 4, padding: '4px 12px',
            fontSize: 12, cursor: saveStatus === 'unsaved' ? 'pointer' : 'default',
          }}
        >
          {saveLabel}
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <WaveStatsPanel
          wave={{ ...selectedWave, grid: currentGrid }}
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
    </div>
  )
}
