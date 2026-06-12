// apps/calibrator/src/components/WaveEditor/PatternPicker.tsx
import React, { useState } from 'react'
import { SYSTEM_PATTERNS, generatePattern, type PatternType } from '../../services/WavePatternGenerator'
import type { EntityType, Grid } from '../../lib/schemas'
import { GRID_COLS, GRID_ROWS } from '../../lib/gridConstants'

type UserPattern = { id: number; name: string; grid: unknown }

interface PatternPickerProps {
  userPatterns: UserPattern[]
  selectedEntity: EntityType
  enemyCount: number
  onApplyPattern: (grid: Grid) => void
  onSavePattern: (name: string) => void
}

export function PatternPicker({ userPatterns, selectedEntity, enemyCount, onApplyPattern, onSavePattern }: PatternPickerProps) {
  const [saving, setSaving] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [value, setValue] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value
    setValue('')  // reset immediately so same option can be re-selected
    if (!val) return
    if (val.startsWith('system:')) {
      const type = val.replace('system:', '') as PatternType
      onApplyPattern(generatePattern(type, selectedEntity, enemyCount || 4, GRID_COLS, GRID_ROWS))
    } else if (val.startsWith('user:')) {
      const id = Number(val.replace('user:', ''))
      const pattern = userPatterns.find(p => p.id === id)
      if (pattern) onApplyPattern(pattern.grid as Grid)
    }
  }

  function handleSave() {
    if (saveName.trim()) {
      onSavePattern(saveName.trim())
      setSaveName('')
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <select
        value={value}
        onChange={handleChange}
        style={{
          width: '100%', background: '#2c2c3e', color: '#aaa',
          border: '1px solid #3c3c4e', borderRadius: 4,
          padding: '4px 2px', fontSize: 11, cursor: 'pointer',
        }}
      >
        <option value="" disabled>Pattern</option>
        <optgroup label="System">
          {SYSTEM_PATTERNS.map(p => (
            <option key={p.type} value={`system:${p.type}`}>{p.label}</option>
          ))}
        </optgroup>
        {userPatterns.length > 0 && (
          <optgroup label="Saved">
            {userPatterns.map(p => (
              <option key={p.id} value={`user:${p.id}`}>{p.name}</option>
            ))}
          </optgroup>
        )}
      </select>

      {saving ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <input
            autoFocus
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSave()
              if (e.key === 'Escape') { setSaving(false); setSaveName('') }
            }}
            placeholder="Nome..."
            style={{ width: '100%', background: '#2c2c3e', border: '1px solid #3498db', borderRadius: 3, padding: '3px 4px', color: '#eee', fontSize: 11, boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={handleSave} style={{ flex: 1, background: '#3498db', color: '#fff', border: 'none', borderRadius: 3, padding: '3px 0', fontSize: 11, cursor: 'pointer' }}>✓</button>
            <button onClick={() => { setSaving(false); setSaveName('') }} style={{ flex: 1, background: '#444', color: '#eee', border: 'none', borderRadius: 3, padding: '3px 0', fontSize: 11, cursor: 'pointer' }}>✕</button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setSaving(true)}
          style={{ width: '100%', background: 'none', border: '1px dashed #2ecc71', borderRadius: 4, color: '#2ecc71', fontSize: 10, padding: '4px 0', cursor: 'pointer' }}
        >+ Salvar</button>
      )}
    </div>
  )
}
