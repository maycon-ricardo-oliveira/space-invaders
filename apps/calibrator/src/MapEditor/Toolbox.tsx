'use client'
import type { EntityType } from '@si/level-engine'

interface Props {
  entityTypes: EntityType[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function Toolbox({ entityTypes, selectedId, onSelect }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {entityTypes.map((et) => (
        <button
          key={et.id}
          aria-pressed={et.id === selectedId}
          onClick={() => onSelect(et.id)}
          style={{
            background: et.id === selectedId ? '#4CAF50' : '#333',
            color: '#fff',
            border: 'none',
            padding: '6px 10px',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <span>{et.icon}</span>
          <span>{et.label}</span>
        </button>
      ))}
    </div>
  )
}
