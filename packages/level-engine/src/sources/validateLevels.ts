export interface LevelValidationError {
  levelId: string
  message: string
}

interface Bounds { width: number; height: number }
const DEFAULT_BOUNDS: Bounds = { width: 390, height: 844 }

// Calibrator slider ranges (Sprint 7 dashboard spec) — the engine owns the contract.
const PARAM_RANGES: Record<string, [number, number]> = {
  enemySpeed: [1, 5],
  enemyShotDelay: [0.5, 3.0],
  enemyShotSpeed: [2, 8],
  enemyAngerDelay: [5, 30],
  enemySpawnDelay: [0.3, 2],
  fuelDrainRate: [1, 20],
}

export function validateLevels(
  data: unknown,
  knownTypeIds: Set<string>,
  bounds: Bounds = DEFAULT_BOUNDS,
): LevelValidationError[] {
  if (!Array.isArray(data)) {
    return [{ levelId: '(root)', message: 'levels payload must be an array' }]
  }
  const errors: LevelValidationError[] = []
  const seenIds = new Set<string>()

  data.forEach((level: any, i: number) => {
    const levelId = typeof level?.id === 'string' ? level.id : `(index ${i})`
    if (typeof level?.id !== 'string' || level.id.length === 0) {
      errors.push({ levelId, message: 'missing or empty id' })
    } else if (seenIds.has(level.id)) {
      errors.push({ levelId, message: `duplicate level id '${level.id}'` })
    } else {
      seenIds.add(level.id)
    }

    if (!Array.isArray(level?.entities)) {
      errors.push({ levelId, message: 'entities must be an array' })
    } else {
      level.entities.forEach((e: any, j: number) => {
        if (typeof e?.entityTypeId !== 'string' || !knownTypeIds.has(e.entityTypeId)) {
          errors.push({ levelId, message: `unknown entityTypeId '${String(e?.entityTypeId)}' at entity ${j}` })
        }
        const x = typeof e?.x === 'number' ? e.x : NaN
        const y = typeof e?.y === 'number' ? e.y : NaN
        if (!(x >= 0 && x <= bounds.width) || !(y >= 0 && y <= bounds.height)) {
          errors.push({ levelId, message: `entity ${j} position out of bounds (x=${e?.x}, y=${e?.y})` })
        }
      })
    }

    const params = level?.params
    if (typeof params !== 'object' || params === null) {
      errors.push({ levelId, message: 'params must be an object' })
    } else {
      for (const [key, [min, max]] of Object.entries(PARAM_RANGES)) {
        const value = (params as Record<string, unknown>)[key]
        if (value === undefined) continue // optional params skip range check
        if (typeof value !== 'number' || value < min || value > max) {
          errors.push({ levelId, message: `${key} out of range [${min}, ${max}] (got ${String(value)})` })
        }
      }
    }
  })
  return errors
}
