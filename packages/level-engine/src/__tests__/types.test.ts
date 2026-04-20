import type {
  EntityType,
  EntityPlacement,
  GridPattern,
  LevelDefinition,
  LevelParams,
  LevelRequest,
  PlayerStats,
  CalibratorStrategy,
  ILevelEngine,
} from '../types'

describe('types', () => {
  it('LevelRequest accepts story mode shape', () => {
    const req: LevelRequest = { mode: 'story', levelIndex: 0, totalLevels: 20 }
    expect(req.mode).toBe('story')
    expect(req.levelIndex).toBe(0)
  })

  it('LevelRequest accepts survival mode with PlayerStats', () => {
    const stats: PlayerStats = {
      level: 3,
      killsThisSession: 10,
      deathsThisSession: 1,
      averageSurvivalTime: 45,
    }
    const req: LevelRequest = { mode: 'survival', playerStats: stats, currentScore: 500 }
    expect(req.mode).toBe('survival')
    expect(req.playerStats?.level).toBe(3)
  })

  it('EntityType has required fields', () => {
    const type: EntityType = {
      id: 'enemy-classic',
      label: 'Classic Enemy',
      icon: '👾',
      properties: { pointValue: 10 },
    }
    expect(type.id).toBe('enemy-classic')
  })

  it('EntityPlacement references an entity type by id', () => {
    const placement: EntityPlacement = { entityTypeId: 'enemy-classic', x: 2, y: 3 }
    expect(placement.entityTypeId).toBe('enemy-classic')
  })

  it('LevelDefinition has all required fields', () => {
    const params: LevelParams = {
      numberOfEnemies: 5,
      enemySpeed: 2,
      enemyShotDelay: 2.0,
      enemyShotSpeed: 4,
      enemyAngerDelay: 20,
      enemySpawnDelay: 1,
      hasPowerUps: true,
      powerUpMinWait: 5,
      powerUpMaxWait: 15,
    }
    const def: LevelDefinition = {
      id: 'story-0',
      style: 'classic',
      difficultyScore: 0,
      entities: [],
      params,
    }
    expect(def.style).toBe('classic')
    expect(def.difficultyScore).toBe(0)
  })
})
