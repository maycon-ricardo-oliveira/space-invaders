/**
 * @jest-environment node
 */
import { generatePattern, SYSTEM_PATTERNS, type PatternType } from '../services/WavePatternGenerator'

const COLS = 12
const ROWS = 4

describe('generatePattern', () => {
  it('line — places N enemies in first row, evenly spaced', () => {
    const grid = generatePattern('line', 'grunt', 4, COLS, ROWS)
    const firstRow = grid[0]
    const placed = firstRow.filter(c => c === 'grunt')
    expect(placed).toHaveLength(4)
    expect(grid[1].every(c => c === null)).toBe(true)
  })

  it('line — fills full row when count >= COLS', () => {
    const grid = generatePattern('line', 'grunt', 12, COLS, ROWS)
    expect(grid[0].every(c => c === 'grunt')).toBe(true)
  })

  it('column — places N enemies in first column', () => {
    const grid = generatePattern('column', 'rocket', 3, COLS, ROWS)
    expect(grid[0][0]).toBe('rocket')
    expect(grid[1][0]).toBe('rocket')
    expect(grid[2][0]).toBe('rocket')
    expect(grid[0][1]).toBeNull()
  })

  it('square — fills M×N rectangle starting from top-left', () => {
    const grid = generatePattern('square', 'grunt', 6, COLS, ROWS)
    const total = grid.flat().filter(c => c === 'grunt').length
    expect(total).toBe(6)
  })

  it('diagonal — places enemies diagonally (all on different rows)', () => {
    const grid = generatePattern('diagonal', 'shield', 4, COLS, ROWS)
    const positions = grid.flatMap((row, r) =>
      row.map((cell, c) => cell !== null ? [r, c] : null).filter(Boolean)
    )
    const rows = positions.map(p => (p as number[])[0])
    expect(new Set(rows).size).toBe(rows.length)
  })

  it('v-shape — produces a V pattern with enemies on both sides', () => {
    const grid = generatePattern('v-shape', 'grunt', 6, COLS, ROWS)
    const total = grid.flat().filter(c => c === 'grunt').length
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThanOrEqual(6)
  })

  it('zigzag — alternates between rows', () => {
    const grid = generatePattern('zigzag', 'grunt', 6, COLS, ROWS)
    const total = grid.flat().filter(c => c === 'grunt').length
    expect(total).toBe(6)
  })

  it('returns 12-column grid for all patterns', () => {
    const patterns: PatternType[] = ['line', 'column', 'square', 'diagonal', 'v-shape', 'zigzag', 'diamond']
    for (const p of patterns) {
      const grid = generatePattern(p, 'grunt', 4, COLS, ROWS)
      expect(grid.every(row => row.length === COLS)).toBe(true)
    }
  })

  it('SYSTEM_PATTERNS exports all 7 pattern types', () => {
    expect(SYSTEM_PATTERNS).toHaveLength(7)
  })
})
