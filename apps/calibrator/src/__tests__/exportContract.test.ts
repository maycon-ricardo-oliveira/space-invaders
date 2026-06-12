import { validateLevels } from '@si/level-engine'
import { worldToLevelDefinitions, type PlainWorld } from '../services/worldToLevelDefinitions'
import { EntityTypeSchema } from '../lib/schemas'

const world: PlainWorld = {
  phases: [{
    index: 0,
    levels: [{
      index: 0,
      enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
      enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
      waves: [{ order: 1, delay: 0, grid: [['basic-enemy', 'fast-enemy', 'strong-enemy', 'asteroid']] }],
    }],
  }],
}

describe('export contract', () => {
  it('every type the dashboard can place passes the engine validator', () => {
    const knownIds = new Set<string>(EntityTypeSchema.options)
    const errors = validateLevels(worldToLevelDefinitions(world), knownIds)
    expect(errors).toEqual([])
  })
})
