import type { EntityPlacement } from '@si/level-engine'
import { COLS, ROWS, CELL_W, CELL_H } from './MapEditor/Grid'

const MAX_ENTITIES = ROWS * COLS

const CENTER_COL = 5.5

export function defaultPlacements(numberOfEnemies: number): EntityPlacement[] {
  const count = Math.min(numberOfEnemies, MAX_ENTITIES)

  // Generate all candidate cells
  const candidates = Array.from({ length: COLS * ROWS }, (_, i) => ({
    col: i % COLS,
    row: Math.floor(i / COLS),
  }))

  // Pre-compute scores (random offset computed ONCE per cell, not per comparison)
  const scored = candidates.map((c) => ({
    ...c,
    score: Math.abs(c.col - CENTER_COL) * 0.5 + Math.random() * 2,
  }))

  // Sort by pre-computed score (stable, deterministic per run)
  scored.sort((a, b) => a.score - b.score)

  // Take the first `count` cells, then sort for natural render order
  const selected = scored.slice(0, count)
  selected.sort((a, b) => a.row - b.row || a.col - b.col)

  return selected.map(({ col, row }) => ({
    entityTypeId: 'basic-enemy',
    x: col * CELL_W,
    y: row * CELL_H,
  }))
}
