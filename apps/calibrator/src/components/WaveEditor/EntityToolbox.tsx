// apps/calibrator/src/components/WaveEditor/EntityToolbox.tsx
import React from 'react'
import type { EntityType } from '../../lib/schemas'

const ENTITIES: { type: EntityType; label: string; icon: string }[] = [
  { type: 'grunt',  label: 'Grunt',  icon: '👾' },
  { type: 'rocket', label: 'Rocket', icon: '🚀' },
  { type: 'shield', label: 'Shield', icon: '🛡️' },
  { type: 'rock',   label: 'Rock',   icon: '🪨' },
]

interface EntityToolboxProps {
  selected: EntityType | 'eraser'
  onSelect: (entity: EntityType | 'eraser') => void
}

export function EntityToolbox({ selected, onSelect }: EntityToolboxProps) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 0', flexWrap: 'wrap' }}>
      {ENTITIES.map(e => (
        <button
          key={e.type}
          onClick={() => onSelect(e.type)}
          title={e.label}
          style={{
            background: selected === e.type ? '#1e3a5f' : '#2c2c3e',
            border: `1px solid ${selected === e.type ? '#3498db' : '#3c3c4e'}`,
            borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 16,
          }}
        >
          {e.icon}
        </button>
      ))}
      <button
        onClick={() => onSelect('eraser')}
        title="Eraser"
        style={{
          background: selected === 'eraser' ? '#3e1a1a' : '#2c2c3e',
          border: `1px solid ${selected === 'eraser' ? '#e74c3c' : '#3c3c4e'}`,
          borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: '#e74c3c',
        }}
      >
        ✕
      </button>
    </div>
  )
}
