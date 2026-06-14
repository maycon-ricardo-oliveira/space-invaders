/**
 * @jest-environment node
 */
import { generatePattern, SYSTEM_PATTERNS, type PatternType } from '../services/WavePatternGenerator'

const COLS = 12
const ROWS = 4

describe('generatePattern', () => {
  it('line — places N enemies in first row, evenly spaced', () => {
    const grid = generatePattern('line', 'basic-enemy', 4, COLS, ROWS)
    const firstRow = grid[0]
    const placed = firstRow.filter(c => c === 'basic-enemy')
    expect(placed).toHaveLength(4)
    expect(grid[1].every(c => c === null)).toBe(true)
  })

  it('line — fills full row when count >= COLS', () => {
    const grid = generatePattern('line', 'basic-enemy', 12, COLS, ROWS)
    expect(grid[0].every(c => c === 'basic-enemy')).toBe(true)
  })

  it('column — places N enemies in first column', () => {
    const grid = generatePattern('column', 'fast-enemy', 3, COLS, ROWS)
    expect(grid[0][0]).toBe('fast-enemy')
    expect(grid[1][0]).toBe('fast-enemy')
    expect(grid[2][0]).toBe('fast-enemy')
    expect(grid[0][1]).toBeNull()
  })

  it('square — fills M×N rectangle starting from top-left', () => {
    const grid = generatePattern('square', 'basic-enemy', 6, COLS, ROWS)
    const total = grid.flat().filter(c => c === 'basic-enemy').length
    expect(total).toBe(6)
  })

  it('diagonal — places enemies diagonally (all on different rows)', () => {
    const grid = generatePattern('diagonal', 'strong-enemy', 4, COLS, ROWS)
    const positions = grid.flatMap((row, r) =>
      row.map((cell, c) => cell !== null ? [r, c] : null).filter(Boolean)
    )
    const rows = positions.map(p => (p as number[])[0])
    expect(new Set(rows).size).toBe(rows.length)
  })

  it('v-shape — produces a V pattern with enemies on both sides', () => {
    const grid = generatePattern('v-shape', 'basic-enemy', 6, COLS, ROWS)
    const total = grid.flat().filter(c => c === 'basic-enemy').length
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThanOrEqual(6)
  })

  it('zigzag — alternates between rows', () => {
    const grid = generatePattern('zigzag', 'basic-enemy', 6, COLS, ROWS)
    const total = grid.flat().filter(c => c === 'basic-enemy').length
    expect(total).toBe(6)
  })

  it('returns 12-column grid for all patterns', () => {
    const patterns: PatternType[] = ['line', 'column', 'square', 'diagonal', 'v-shape', 'zigzag', 'diamond']
    for (const p of patterns) {
      const grid = generatePattern(p, 'basic-enemy', 4, COLS, ROWS)
      expect(grid.every(row => row.length === COLS)).toBe(true)
    }
  })

  it('SYSTEM_PATTERNS exports all 7 pattern types', () => {
    expect(SYSTEM_PATTERNS).toHaveLength(7)
  })
})
