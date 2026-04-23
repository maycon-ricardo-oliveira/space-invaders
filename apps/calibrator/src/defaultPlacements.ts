import type { EntityPlacement } from '@si/level-engine'

const COLS = 12
const ROWS = 16
const CELL_W = 30
const CELL_H = 40
const MAX_ENTITIES = ROWS * COLS

const CENTER_COL = 5.5

export function defaultPlacements(numberOfEnemies: number): EntityPlacement[] {
  const count = Math.min(numberOfEnemies, MAX_ENTITIES)

  // Generate all candidate cells and sort center-first with light randomness
  const candidates: { col: number; row: number }[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      candidates.push({ col, row })
    }
  }

  candidates.sort((a, b) => {
    const scoreA = Math.abs(a.col - CENTER_COL) * 0.5 + Math.random() * 2
    const scoreB = Math.abs(b.col - CENTER_COL) * 0.5 + Math.random() * 2
    return scoreA - scoreB
  })

  // Take the first `count` cells, then sort for natural render order
  const selected = candidates.slice(0, count)
  selected.sort((a, b) => a.row - b.row || a.col - b.col)

  return selected.map(({ col, row }) => ({
    entityTypeId: 'basic-enemy',
    x: col * CELL_W,
    y: row * CELL_H,
  }))
}
