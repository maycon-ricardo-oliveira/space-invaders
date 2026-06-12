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

  // Fix 4: phases/levels out of order → ids still reflect index
  it('sorts phases and levels by index so ids reflect index order, not arrival order', () => {
    const outOfOrder: PlainWorld = {
      phases: [
        {
          index: 1,
          levels: [{
            index: 0, enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
            enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: false,
            waves: [{ order: 1, delay: 0, grid: [['basic-enemy']] }],
          }],
        },
        {
          index: 0,
          levels: [{
            index: 0, enemySpeed: 1, shotDelay: 2, fuelDrain: 5,
            enemyShotSpeed: 3, enemyAngerDelay: 10, enemySpawnDelay: 2, hasPowerUps: true,
            waves: [{ order: 1, delay: 0, grid: [['fast-enemy']] }],
          }],
        },
      ],
    }
    const levels = worldToLevelDefinitions(outOfOrder)
    // phase index 0 must come first → first level id is 'story-1-1'
    expect(levels[0].id).toBe('story-1-1')
    expect(levels[0].entities[0].entityTypeId).toBe('fast-enemy')
    expect(levels[1].id).toBe('story-2-1')
    expect(levels[1].entities[0].entityTypeId).toBe('basic-enemy')
  })

  // Fix 4: level with waves: [] → entities [], numberOfEnemies 0
  it('handles level with no waves: entities is empty and numberOfEnemies is 0', () => {
    const emptyWaves: PlainWorld = {
      phases: [{
        index: 0,
        levels: [{
          index: 0, enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
          enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: false,
          waves: [],
        }],
      }],
    }
    const [level] = worldToLevelDefinitions(emptyWaves)
    expect(level.entities).toHaveLength(0)
    expect(level.params.numberOfEnemies).toBe(0)
  })

  // Fix 4: world with phases: [] → returns []
  it('returns empty array when world has no phases', () => {
    const emptyWorld: PlainWorld = { phases: [] }
    expect(worldToLevelDefinitions(emptyWorld)).toEqual([])
  })

  // Fix 4: strengthen position assert — first entity at col 0, row 0
  it('places first entity at the correct pixel position (col 0, row 0)', () => {
    const PHONE_WIDTH = 390
    const GRID_COLS = 11
    const CELL_WIDTH = PHONE_WIDTH / GRID_COLS
    const CELL_HEIGHT = 40
    const [level] = worldToLevelDefinitions(world)
    // basic-enemy is at col 0, row 0 of wave 1
    expect(level.entities[0].x).toBeCloseTo(CELL_WIDTH / 2)
    expect(level.entities[0].y).toBe(CELL_HEIGHT / 2)
  })
})
