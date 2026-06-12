export const LEVEL_ENGINE_VERSION = '0.1.0'

export type {
  GridPattern,
  Sprite,
  EntityType,
  EntityPlacement,
  LevelParams,
  Wave,
  LevelDefinition,
  PlayerStats,
  LevelRequest,
  CalibratorStrategy,
  ILevelEngine,
  IRenderer,
  LevelSummary,
  LevelSource,
} from './types'

export { computeDifficultyScore } from './difficulty'
export { EntityRegistry } from './registry/EntityRegistry'
export { CurveCalibratorStrategy } from './strategies/CurveCalibratorStrategy'
export { LevelEngine } from './LevelEngine'
export { JsonLevelSource, LevelContractError } from './sources/JsonLevelSource'
export { validateLevels } from './sources/validateLevels'
export type { LevelValidationError, Bounds } from './sources/validateLevels'
