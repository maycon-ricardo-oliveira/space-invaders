import type { EntityType, Grid } from '../lib/schemas'

export type PatternType = 'line' | 'column' | 'square' | 'diagonal' | 'v-shape' | 'zigzag' | 'diamond'

export interface SystemPattern {
  type: PatternType
  label: string
}

export const SYSTEM_PATTERNS: SystemPattern[] = [
  { type: 'line', label: 'Linha' },
  { type: 'column', label: 'Coluna' },
  { type: 'square', label: 'Quadrado' },
  { type: 'diagonal', label: 'Diagonal' },
  { type: 'v-shape', label: 'V-Shape' },
  { type: 'zigzag', label: 'Zigzag' },
  { type: 'diamond', label: 'Diamante' },
]

function emptyGrid(cols: number, rows: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(null))
}

export function generatePattern(
  type: PatternType,
  entity: EntityType,
  count: number,
  cols: number,
  rows: number,
): Grid {
  const grid = emptyGrid(cols, rows)
  const n = Math.min(count, cols * rows)

  switch (type) {
    case 'line': {
      const step = n >= cols ? 1 : Math.floor(cols / n)
      let placed = 0
      for (let c = 0; c < cols && placed < n; c += step) {
        grid[0][c] = entity
        placed++
      }
      break
    }
    case 'column': {
      for (let r = 0; r < rows && r < n; r++) {
        grid[r][0] = entity
      }
      break
    }
    case 'square': {
      const cols2 = Math.min(Math.ceil(Math.sqrt(n)), cols)
      const rows2 = Math.min(Math.ceil(n / cols2), rows)
      let placed = 0
      for (let r = 0; r < rows2 && placed < n; r++) {
        for (let c = 0; c < cols2 && placed < n; c++) {
          grid[r][c] = entity
          placed++
        }
      }
      break
    }
    case 'diagonal': {
      const step = Math.max(1, Math.floor(cols / n))
      for (let i = 0; i < n; i++) {
        const r = Math.min(i, rows - 1)
        const c = Math.min(i * step, cols - 1)
        grid[r][c] = entity
      }
      break
    }
    case 'v-shape': {
      const half = Math.ceil(n / 2)
      for (let i = 0; i < half; i++) {
        const r = Math.min(i, rows - 1)
        const c = Math.max(0, Math.floor((cols / 2) - 1 - (i * (cols / 2)) / Math.max(half, 1)))
        grid[r][c] = entity
      }
      for (let i = 0; i < n - half; i++) {
        const r = Math.min(i, rows - 1)
        const c = Math.min(cols - 1, Math.ceil((cols / 2) + (i * (cols / 2)) / Math.max(n - half, 1)))
        grid[r][c] = entity
      }
      break
    }
    case 'zigzag': {
      const step = Math.max(1, Math.ceil(cols / n))
      let placed = 0
      for (let i = 0; i < n; i++) {
        const c = (i * step) % cols
        const r = (i % 2 === 0) ? 0 : Math.min(1, rows - 1)
        grid[r][c] = entity
        placed++
      }
      break
    }
    case 'diamond': {
      const midRow = Math.floor(rows / 2)
      const midCol = Math.floor(cols / 2)
      const positions: [number, number][] = [
        [0, midCol],
        [midRow, midCol - 2],
        [midRow, midCol + 2],
        [Math.min(rows - 1, midRow * 2), midCol],
        [midRow, midCol - 1],
        [midRow, midCol + 1],
        [1, midCol - 1],
        [1, midCol + 1],
      ]
      for (let i = 0; i < Math.min(n, positions.length); i++) {
        const [r, c] = positions[i]
        if (r < rows && c >= 0 && c < cols) grid[r][c] = entity
      }
      break
    }
  }

  return grid
}
