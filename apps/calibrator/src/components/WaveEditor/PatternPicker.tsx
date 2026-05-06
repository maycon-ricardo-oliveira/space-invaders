// apps/calibrator/src/components/WaveEditor/PatternPicker.tsx
import React, { useState } from 'react'
import { SYSTEM_PATTERNS, generatePattern, type PatternType } from '../../services/WavePatternGenerator'
import type { EntityType, Grid } from '../../lib/schemas'

type UserPattern = { id: number; name: string; grid: unknown }

interface PatternPickerProps {
  userPatterns: UserPattern[]
  selectedEntity: EntityType
  enemyCount: number
  onApplyPattern: (grid: Grid) => void
  onSavePattern: (name: string) => void
}

export function PatternPicker({ userPatterns, selectedEntity, enemyCount, onApplyPattern, onSavePattern }: PatternPickerProps) {
  const [saveName, setSaveName] = useState('')
  const [showSave, setShowSave] = useState(false)

  function applySystem(type: PatternType) {
    const grid = generatePattern(type, selectedEntity, enemyCount || 4, 11, 4)
    onApplyPattern(grid)
  }

  function applyUser(pattern: UserPattern) {
    onApplyPattern(pattern.grid as Grid)
  }

  function handleSave() {
    if (saveName.trim()) {
      onSavePattern(saveName.trim())
      setSaveName('')
      setShowSave(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '4px 0' }}>
      <span style={{ fontSize: 12, color: '#555' }}>Pattern:</span>
      {SYSTEM_PATTERNS.map(p => (
        <button
          key={p.type}
          onClick={() => applySystem(p.type)}
          style={{ background: '#2c2c3e', border: '1px solid #3c3c4e', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: 12, color: '#aaa' }}
        >
          {p.label}
        </button>
      ))}
      {userPatterns.map(p => (
        <button
          key={p.id}
          onClick={() => applyUser(p)}
          style={{ background: '#1e3a1e', border: '1px solid #2ecc71', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: 12, color: '#2ecc71' }}
        >
          {p.name}
        </button>
      ))}
      {showSave ? (
        <>
          <input
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder="Nome do pattern"
            style={{ fontSize: 12, padding: '2px 6px', background: '#2c2c3e', border: '1px solid #3c3c4e', borderRadius: 3, color: '#eee' }}
          />
          <button onClick={handleSave} style={{ fontSize: 12, padding: '2px 6px', background: '#2ecc71', color: '#111', borderRadius: 3, border: 'none', cursor: 'pointer' }}>Salvar</button>
          <button onClick={() => setShowSave(false)} style={{ fontSize: 12, padding: '2px 6px', background: '#444', color: '#eee', borderRadius: 3, border: 'none', cursor: 'pointer' }}>✕</button>
        </>
      ) : (
        <button
          onClick={() => setShowSave(true)}
          style={{ fontSize: 12, padding: '2px 6px', background: '#2c2c3e', border: '1px dashed #2ecc71', borderRadius: 3, color: '#2ecc71', cursor: 'pointer' }}
        >
          + Salvar como pattern
        </button>
      )}
    </div>
  )
}
