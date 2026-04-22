export const LEVEL_ENGINE_VERSION = '0.1.0'

export type {
  GridPattern,
  Sprite,
  EntityType,
  EntityPlacement,
  LevelParams,
  LevelDefinition,
  PlayerStats,
  LevelRequest,
  CalibratorStrategy,
  ILevelEngine,
  IRenderer,
} from './types'

export { computeDifficultyScore } from './difficulty'
export { EntityRegistry } from './registry/EntityRegistry'
export { CurveCalibratorStrategy } from './strategies/CurveCalibratorStrategy'
export { LevelEngine } from './LevelEngine'
