import type { EntityPlacement } from '@si/level-engine'

interface Props {
  entity: EntityPlacement | null
  onChange: (updated: EntityPlacement) => void
}

export function PropertiesPanel({ entity }: Props) {
  if (!entity) {
    return <div style={{ padding: 8, color: '#888' }}>No entity selected</div>
  }

  return (
    <div style={{ padding: 8, fontSize: 13 }}>
      <p style={{ margin: '4px 0' }}>Type: {entity.entityTypeId}</p>
      <p style={{ margin: '4px 0' }}>x: {entity.x}</p>
      <p style={{ margin: '4px 0' }}>y: {entity.y}</p>
    </div>
  )
}
