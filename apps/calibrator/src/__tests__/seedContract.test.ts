import { validateLevels } from '@si/level-engine'
import { worldToLevelDefinitions } from '../services/worldToLevelDefinitions'
import { SEED_WORLD } from '../../prisma/seedData'

// Canonical entity type set the game knows about. The seed may only place
// these ids (plus empty cells). This is the contract the seed must honor.
const KNOWN = new Set(['basic-enemy', 'fast-enemy', 'strong-enemy', 'asteroid'])

describe('seed → canonical contract parity', () => {
  // Step 4: the parity fence that was missing — once the seed is exported via
  // worldToLevelDefinitions, the game's validator must accept it with zero errors.
  it('seed passes the canonical validateLevels fence (no errors)', () => {
    const levels = worldToLevelDefinitions(SEED_WORLD)
    expect(validateLevels(levels, KNOWN)).toEqual([])
  })

  it('every generated level has waves with valid timing (order int >=1 unique, delay number >=0)', () => {
    const levels = worldToLevelDefinitions(SEED_WORLD)
    expect(levels.length).toBeGreaterThan(0)
    for (const level of levels) {
      expect(level.waves).toBeDefined()
      const waves = level.waves!
      expect(waves.length).toBeGreaterThan(0)
      const orders = new Set<number>()
      for (const wave of waves) {
        expect(Number.isInteger(wave.order)).toBe(true)
        expect(wave.order).toBeGreaterThanOrEqual(1)
        expect(orders.has(wave.order)).toBe(false)
        orders.add(wave.order)
        expect(typeof wave.delay).toBe('number')
        expect(Number.isFinite(wave.delay)).toBe(true)
        expect(wave.delay).toBeGreaterThanOrEqual(0)
      }
    }
  })

  // Maycon's requirement: 2 waves per level (until it looks nice). Today the
  // seed level has 3 waves → this is the assert expected to go RED.
  it('every level in the seed has exactly 2 waves', () => {
    for (const phase of SEED_WORLD.phases) {
      for (const level of phase.levels) {
        expect(level.waves).toHaveLength(2)
      }
    }
  })

  it('seed grids have no ghost cells: every cell is null or a known entityTypeId', () => {
    for (const phase of SEED_WORLD.phases) {
      for (const level of phase.levels) {
        for (const wave of level.waves) {
          for (const row of wave.grid) {
            for (const cell of row) {
              if (cell === null) continue
              expect(typeof cell).toBe('string')
              expect(cell).not.toBe('')
              expect(KNOWN.has(cell)).toBe(true)
            }
          }
        }
      }
    }
  })

  // Publication: Fase 1 (Xeron) nasce 'published' — so the seed is exportable
  // out of the box. A draft seed would make the very first export block.
  it("seed phase 1 is born 'published'", () => {
    expect(SEED_WORLD.phases[0].status).toBe('published')
  })

  it('seed exports at least one level because its phase is published', () => {
    const levels = worldToLevelDefinitions(SEED_WORLD)
    expect(levels.length).toBeGreaterThan(0)
    expect(levels[0].id).toBe('story-1-1')
  })

  it('seed grid rows are all the same width within a wave', () => {
    for (const phase of SEED_WORLD.phases) {
      for (const level of phase.levels) {
        for (const wave of level.waves) {
          const width = wave.grid[0].length
          for (const row of wave.grid) {
            expect(row.length).toBe(width)
          }
        }
      }
    }
  })
})
