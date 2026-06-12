import type { LevelDefinition, LevelSource, LevelSummary } from '../types'
import { EntityRegistry } from '../registry/EntityRegistry'
import { validateLevels, type LevelValidationError } from './validateLevels'

export class LevelContractError extends Error {
  constructor(public readonly errors: LevelValidationError[]) {
    super(
      'levels.json contract violation:\n' +
        errors.map(e => `  ${e.levelId}: ${e.message}`).join('\n'),
    )
    this.name = 'LevelContractError'
  }
}

export class JsonLevelSource implements LevelSource {
  private levels: LevelDefinition[] = []

  constructor(
    private readonly data: unknown,
    private readonly registry: EntityRegistry,
  ) {
    if (registry.getAll().length === 0) {
      throw new Error('JsonLevelSource requires a populated EntityRegistry — call registerEntities() before creating it')
    }
  }

  async load(): Promise<void> {
    const known = new Set(this.registry.getAll().map(t => t.id))
    const errors = validateLevels(this.data, known)
    if (errors.length > 0) throw new LevelContractError(errors)

    this.levels = (this.data as LevelDefinition[]).map(level => ({
      ...level,
      entities: level.entities.map(placement => ({
        ...placement,
        properties: {
          ...this.registry.get(placement.entityTypeId)!.properties,
          ...(placement.properties ?? {}),
        },
      })),
    }))
  }

  listLevels(): LevelSummary[] {
    return this.levels.map(l => ({
      id: l.id,
      phaseIndex: l.phaseIndex ?? 0,
      levelIndex: l.levelIndex ?? 0,
      difficultyScore: l.difficultyScore,
    }))
  }

  getLevel(id: string): LevelDefinition {
    const found = this.levels.find(l => l.id === id)
    if (!found) throw new Error(`Level not found: ${id}`)
    return found
  }
}
