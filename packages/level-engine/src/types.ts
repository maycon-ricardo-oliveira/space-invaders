export type GridPattern = 'grid' | 'diamond' | 'chevron' | 'random'

export interface Sprite {
  source: string
  width: number
  height: number
}

export interface IRenderer {
  clear(): void
  drawSprite(sprite: Sprite, x: number, y: number, width: number, height: number): void
  drawRect(x: number, y: number, width: number, height: number, color: string): void
}

export interface EntityType {
  id: string
  label: string
  icon: string
  properties: Record<string, unknown>
}

export interface EntityPlacement {
  entityTypeId: string
  x: number
  y: number
  properties?: Record<string, unknown>
}

export interface LevelParams {
  numberOfEnemies: number
  enemySpeed: number
  enemyShotDelay: number
  enemyShotSpeed: number
  enemyAngerDelay: number
  enemySpawnDelay: number
  hasPowerUps: boolean
  powerUpMinWait: number
  powerUpMaxWait: number
  formationPattern?: GridPattern
  survivalDuration?: number
  spawnWaveInterval?: number
  fuelDrainRate?: number
}

export interface Wave {
  entities: EntityPlacement[]
}

export interface LevelDefinition {
  id: string
  style: 'classic' | 'freeRoam' | 'mixed'
  difficultyScore: number
  entities: EntityPlacement[]
  params: LevelParams
  waves?: Wave[]
}

export interface PlayerStats {
  level: number
  killsThisSession: number
  deathsThisSession: number
  averageSurvivalTime: number
}

export interface LevelRequest {
  mode: 'story' | 'survival'
  levelIndex?: number
  totalLevels?: number
  playerStats?: PlayerStats
  currentScore?: number
}

export interface CalibratorStrategy {
  calibrate(request: LevelRequest): LevelParams
}

export interface ILevelEngine {
  generate(request: LevelRequest): LevelDefinition
  setCalibrator(strategy: CalibratorStrategy): void
  registerEntityType(type: EntityType): void
}
