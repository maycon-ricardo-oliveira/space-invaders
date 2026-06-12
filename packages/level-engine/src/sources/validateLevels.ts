export interface LevelValidationError {
  levelId: string
  message: string
}

export interface Bounds { width: number; height: number }
const DEFAULT_BOUNDS: Bounds = { width: 390, height: 844 }

// Required params — missing key is always an error (game would get NaN / undefined).
const REQUIRED_PARAMS: ReadonlyArray<string> = [
  'numberOfEnemies',
  'enemySpeed',
  'enemyShotDelay',
  'enemyShotSpeed',
  'enemyAngerDelay',
  'enemySpawnDelay',
  'hasPowerUps',
  'powerUpMinWait',
  'powerUpMaxWait',
]

// Calibrator slider ranges (Sprint 7 dashboard spec) — the engine owns the contract.
// fuelDrainRate is OPTIONAL: absent = skip, present = range-checked.
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
    const hasValidId = typeof level?.id === 'string' && level.id.length > 0
    const levelId = hasValidId ? level.id : `(index ${i})`

    if (!hasValidId) {
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
      const p = params as Record<string, unknown>

      // Check required params are present
      for (const key of REQUIRED_PARAMS) {
        if (!(key in p) || p[key] === undefined) {
          errors.push({ levelId, message: `missing required param '${key}'` })
        }
      }

      // numberOfEnemies: required finite number >= 0 (no upper bound)
      if ('numberOfEnemies' in p && p.numberOfEnemies !== undefined) {
        if (!Number.isFinite(p.numberOfEnemies) || (p.numberOfEnemies as number) < 0) {
          errors.push({ levelId, message: `numberOfEnemies must be a finite number >= 0 (got ${String(p.numberOfEnemies)})` })
        }
      }

      // hasPowerUps: required boolean
      if ('hasPowerUps' in p && p.hasPowerUps !== undefined) {
        if (typeof p.hasPowerUps !== 'boolean') {
          errors.push({ levelId, message: `hasPowerUps must be a boolean (got ${String(p.hasPowerUps)})` })
        }
      }

      // powerUpMinWait / powerUpMaxWait: required finite numbers >= 0 + cross-check
      if ('powerUpMinWait' in p && p.powerUpMinWait !== undefined) {
        if (!Number.isFinite(p.powerUpMinWait) || (p.powerUpMinWait as number) < 0) {
          errors.push({ levelId, message: `powerUpMinWait must be a finite number >= 0 (got ${String(p.powerUpMinWait)})` })
        }
      }
      if ('powerUpMaxWait' in p && p.powerUpMaxWait !== undefined) {
        if (!Number.isFinite(p.powerUpMaxWait) || (p.powerUpMaxWait as number) < 0) {
          errors.push({ levelId, message: `powerUpMaxWait must be a finite number >= 0 (got ${String(p.powerUpMaxWait)})` })
        }
      }
      if (
        Number.isFinite(p.powerUpMinWait) &&
        Number.isFinite(p.powerUpMaxWait) &&
        (p.powerUpMinWait as number) > (p.powerUpMaxWait as number)
      ) {
        errors.push({
          levelId,
          message: `powerUpMinWait (${String(p.powerUpMinWait)}) must be <= powerUpMaxWait (${String(p.powerUpMaxWait)})`,
        })
      }

      // Range checks for the 6 ranged keys (fuelDrainRate stays optional: absent = skip)
      for (const [key, [min, max]] of Object.entries(PARAM_RANGES)) {
        const value = p[key]
        if (value === undefined) continue // fuelDrainRate and any absent optional key
        if (!Number.isFinite(value) || (value as number) < min || (value as number) > max) {
          errors.push({ levelId, message: `${key} out of range [${min}, ${max}] (got ${String(value)})` })
        }
      }
    }
  })
  return errors
}
