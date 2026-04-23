'use client'
import type { EntityPlacement } from '@si/level-engine'

export const COLS = 12
export const ROWS = 16
export const CELL_W = 30
export const CELL_H = 40

interface Props {
  entities: EntityPlacement[]
  selectedEntityTypeId: string | null
  onPlace: (placement: EntityPlacement) => void
  onRemove: (index: number) => void
}

export function Grid({ entities, selectedEntityTypeId, onPlace, onRemove }: Props) {
  const entityMap = new Map<string, number>()
  entities.forEach((e, i) => entityMap.set(`${e.x},${e.y}`, i))

  const cells = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * CELL_W
      const y = row * CELL_H
      const entityIndex = entityMap.get(`${x},${y}`) ?? -1
      const hasEntity = entityIndex >= 0

      cells.push(
        <button
          key={`${col},${row}`}
          aria-label={`cell ${col},${row}`}
          style={{
            width: CELL_W,
            height: CELL_H,
            background: hasEntity ? '#4CAF50' : '#222',
            border: '1px solid #444',
            cursor: 'pointer',
            fontSize: 10,
            color: '#fff',
            padding: 0,
          }}
          onClick={() => {
            if (hasEntity) {
              onRemove(entityIndex)
            } else if (selectedEntityTypeId) {
              onPlace({ entityTypeId: selectedEntityTypeId, x, y })
            }
          }}
        >
          {hasEntity ? entities[entityIndex].entityTypeId.slice(0, 1).toUpperCase() : ''}
        </button>
      )
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, ${CELL_W}px)`,
        width: COLS * CELL_W,
      }}
    >
      {cells}
    </div>
  )
}
