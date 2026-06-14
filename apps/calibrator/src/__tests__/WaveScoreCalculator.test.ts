/**
 * @jest-environment node
 */
import { computeWaveScore } from '../services/WaveScoreCalculator'
import type { Grid } from '../lib/schemas'

describe('computeWaveScore', () => {
  it('returns 0 for an empty grid', () => {
    const grid: Grid = [Array(12).fill(null), Array(12).fill(null)]
    expect(computeWaveScore(grid, 3.0)).toBe(0)
  })

  it('strong-enemy enemies score higher than basic-enemy', () => {
    // Use a full row so scores survive rounding
    const fullRowBasic = Array(11).fill('basic-enemy') as Grid[0]
    const fullRowStrong = Array(11).fill('strong-enemy') as Grid[0]
    const basics: Grid = [fullRowBasic]
    const strongs: Grid = [fullRowStrong]
    expect(computeWaveScore(strongs, 3.0)).toBeGreaterThan(computeWaveScore(basics, 3.0))
  })

  it('lower delay produces higher score', () => {
    // Use enough enemies so scores don't round to the same integer
    const row = Array(11).fill('basic-enemy') as Grid[0]
    const grid: Grid = [row, row, row]
    const scoreHighDelay = computeWaveScore(grid, 6.0)
    const scoreLowDelay = computeWaveScore(grid, 1.0)
    expect(scoreLowDelay).toBeGreaterThan(scoreHighDelay)
  })

  it('more enemies = higher score', () => {
    const few: Grid = [['basic-enemy', null, null, null, null, null, null, null, null, null, null, null]]
    const many: Grid = [['basic-enemy', 'basic-enemy', 'basic-enemy', 'basic-enemy', 'basic-enemy', 'basic-enemy', null, null, null, null, null, null]]
    expect(computeWaveScore(many, 3.0)).toBeGreaterThan(computeWaveScore(few, 3.0))
  })

  it('returns score in range [0, 100]', () => {
    const grid: Grid = Array.from({ length: 4 }, () => Array(12).fill('strong-enemy'))
    const score = computeWaveScore(grid, 0)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
