import { worldToLevelDefinitions, type PlainWorld } from '../services/worldToLevelDefinitions'

const world: PlainWorld = {
  phases: [{
    index: 0,
    levels: [{
      index: 0,
      enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
      enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
      waves: [
        { order: 1, delay: 0, grid: [['basic-enemy', null, 'fast-enemy']] },
        { order: 2, delay: 3, grid: [[null, 'asteroid', null]] },
      ],
    }],
  }],
}

describe('worldToLevelDefinitions', () => {
  it('produces 1-based ids and addressing fields', () => {
    const [level] = worldToLevelDefinitions(world)
    expect(level.id).toBe('story-1-1')
    expect(level.phaseIndex).toBe(1)
    expect(level.levelIndex).toBe(1)
  })

  it('flattens wave grids into top-level entities with positions', () => {
    const [level] = worldToLevelDefinitions(world)
    expect(level.entities).toHaveLength(3)
    expect(level.entities.map(e => e.entityTypeId)).toEqual(['basic-enemy', 'fast-enemy', 'asteroid'])
    expect(level.entities[0].x).toBeGreaterThan(0)
  })

  it('keeps waves for Sprint 6B', () => {
    const [level] = worldToLevelDefinitions(world)
    expect(level.waves).toHaveLength(2)
    expect(level.waves![0].entities).toHaveLength(2)
  })

  it('maps params including fuelDrainRate', () => {
    const [level] = worldToLevelDefinitions(world)
    expect(level.params.fuelDrainRate).toBe(8)
    expect(level.params.numberOfEnemies).toBe(3)
    expect(level.params.enemyShotDelay).toBe(1.5)
  })

  it('sorts waves by order before flattening', () => {
    const shuffled: PlainWorld = {
      phases: [{ index: 0, levels: [{
        index: 0, enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
        enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
        waves: [
          { order: 2, delay: 3, grid: [[null, 'asteroid']] },
          { order: 1, delay: 0, grid: [['basic-enemy']] },
        ],
      }] }],
    }
    const [level] = worldToLevelDefinitions(shuffled)
    expect(level.entities.map(e => e.entityTypeId)).toEqual(['basic-enemy', 'asteroid'])
  })
})
