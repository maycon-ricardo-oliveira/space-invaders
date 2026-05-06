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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {ENTITIES.map(e => (
        <button
          key={e.type}
          onClick={() => onSelect(e.type)}
          title={e.label}
          style={{
            background: selected === e.type ? '#1e3a5f' : '#2c2c3e',
            border: `2px solid ${selected === e.type ? '#3498db' : 'transparent'}`,
            borderRadius: 6, padding: '7px 10px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', textAlign: 'left' as const,
          }}
        >
          <span style={{ fontSize: 18 }}>{e.icon}</span>
          <span style={{ fontSize: 12, color: selected === e.type ? '#3498db' : '#aaa' }}>{e.label}</span>
        </button>
      ))}
      <button
        onClick={() => onSelect('eraser')}
        title="Apagador"
        style={{
          background: selected === 'eraser' ? '#3e1a1a' : '#2c2c3e',
          border: `2px solid ${selected === 'eraser' ? '#e74c3c' : 'transparent'}`,
          borderRadius: 6, padding: '7px 10px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          width: '100%', textAlign: 'left' as const,
        }}
      >
        <span style={{ fontSize: 14, color: '#e74c3c' }}>✕</span>
        <span style={{ fontSize: 12, color: selected === 'eraser' ? '#e74c3c' : '#aaa' }}>Apagador</span>
      </button>
    </div>
  )
}
