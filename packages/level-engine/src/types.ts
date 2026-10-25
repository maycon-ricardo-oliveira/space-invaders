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
  /** Damage one enemy bullet deals to the player. Defaults per planet in the game. */
  enemyBulletDamage?: number
  /** Damage body contact with an enemy deals to the player. */
  enemyContactDamage?: number
  /** Player movement speed in px/s. */
  playerSpeed?: number
  /** Player bullet travel speed in px/s. */
  playerBulletSpeed?: number
  /** How long the player stays invincible after a hit, in ms. */
  playerInvincibilityMs?: number
  /** Auto-fire cadence in ms between shots. */
  playerFireIntervalMs?: number
}

export interface Wave {
  order: number
  /** Pause before this wave spawns, in SECONDS (the calibrator edits it as such). */
  delay: number
  entities: EntityPlacement[]
}

export interface LevelDefinition {
  id: string
  style: 'classic' | 'freeRoam' | 'mixed'
  difficultyScore: number
  phaseIndex?: number
  levelIndex?: number
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

export interface LevelSummary {
  id: string
  phaseIndex: number
  levelIndex: number
  difficultyScore: number
}

export interface LevelSource {
  /** Must resolve before listLevels()/getLevel() are called. */
  load(): Promise<void>
  listLevels(): LevelSummary[]
  /** @throws Error if id is unknown. */
  getLevel(id: string): LevelDefinition
}
