import { computeDifficultyScore } from './difficulty'
import { EntityRegistry } from './registry/EntityRegistry'
import type {
  CalibratorStrategy,
  EntityType,
  ILevelEngine,
  LevelDefinition,
  LevelRequest,
} from './types'

const SURVIVAL_STYLES: LevelDefinition['style'][] = ['classic', 'freeRoam', 'mixed']

function storyStyle(levelIndex: number): LevelDefinition['style'] {
  if (levelIndex <= 5) return 'classic'
  if (levelIndex <= 11) return 'mixed'
  if (levelIndex <= 17) return 'freeRoam'
  return 'mixed'
}

export class LevelEngine implements ILevelEngine {
  private readonly registry = new EntityRegistry()
  private calibrator: CalibratorStrategy

  constructor(calibrator: CalibratorStrategy) {
    this.calibrator = calibrator
  }

  registerEntityType(type: EntityType): void {
    this.registry.register(type)
  }

  setCalibrator(strategy: CalibratorStrategy): void {
    this.calibrator = strategy
  }

  generate(request: LevelRequest): LevelDefinition {
    const params = this.calibrator.calibrate(request)
    const difficultyScore = computeDifficultyScore(request)

    if (request.mode === 'story') {
      const levelIndex = request.levelIndex ?? 0
      return {
        id: `story-${levelIndex}`,
        style: storyStyle(levelIndex),
        difficultyScore,
        entities: [],
        params,
      }
    }

    const style = SURVIVAL_STYLES[Math.floor(Math.random() * SURVIVAL_STYLES.length)]
    return {
      id: `survival-${Date.now()}`,
      style,
      difficultyScore,
      entities: [],
      params,
    }
  }
}
