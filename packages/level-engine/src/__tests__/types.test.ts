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
  IRenderer,
  Wave,
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

  it('IRenderer shape is assignable', () => {
    const renderer: IRenderer = {
      clear: () => {},
      drawSprite: (sprite, x, y, width, height) => {},
      drawRect: (x, y, width, height, color) => {},
    }
    expect(renderer).toBeDefined()
  })

  it('Wave has entities array', () => {
    const wave: Wave = {
      entities: [{ entityTypeId: 'basic-enemy', x: 0, y: 0 }],
    }
    expect(wave.entities).toHaveLength(1)
    expect(wave.entities[0].entityTypeId).toBe('basic-enemy')
  })

  it('Wave accepts empty entities array', () => {
    const wave: Wave = { entities: [] }
    expect(wave.entities).toHaveLength(0)
  })

  it('LevelDefinition accepts optional waves array', () => {
    const params: LevelParams = {
      numberOfEnemies: 0,
      enemySpeed: 1,
      enemyShotDelay: 2,
      enemyShotSpeed: 3,
      enemyAngerDelay: 10,
      enemySpawnDelay: 1,
      hasPowerUps: false,
      powerUpMinWait: 5,
      powerUpMaxWait: 10,
    }
    const wave: Wave = {
      entities: [{ entityTypeId: 'fast-enemy', x: 100, y: 0 }],
    }
    const def: LevelDefinition = {
      id: 'story-1',
      style: 'classic',
      difficultyScore: 10,
      entities: [],
      params,
      waves: [wave],
    }
    expect(def.waves).toHaveLength(1)
    expect(def.waves?.[0].entities[0].entityTypeId).toBe('fast-enemy')
  })

  it('LevelDefinition without waves is still valid', () => {
    const params: LevelParams = {
      numberOfEnemies: 5,
      enemySpeed: 1,
      enemyShotDelay: 2,
      enemyShotSpeed: 3,
      enemyAngerDelay: 10,
      enemySpawnDelay: 1,
      hasPowerUps: false,
      powerUpMinWait: 5,
      powerUpMaxWait: 10,
    }
    const def: LevelDefinition = {
      id: 'story-0',
      style: 'classic',
      difficultyScore: 0,
      entities: [],
      params,
    }
    expect(def.waves).toBeUndefined()
  })
})
