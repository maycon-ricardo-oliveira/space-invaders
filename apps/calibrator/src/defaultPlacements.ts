import type { EntityPlacement } from '@si/level-engine'

const COLS = 12
const ROWS = 16
const CELL_W = 30
const CELL_H = 40
const MAX_ENTITIES = ROWS * COLS

export function defaultPlacements(numberOfEnemies: number): EntityPlacement[] {
  const count = Math.min(numberOfEnemies, MAX_ENTITIES)
  const placements: EntityPlacement[] = []
  for (let i = 0; i < count; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    placements.push({
      entityTypeId: 'basic-enemy',
      x: col * CELL_W,
      y: row * CELL_H,
    })
  }
  return placements
}
