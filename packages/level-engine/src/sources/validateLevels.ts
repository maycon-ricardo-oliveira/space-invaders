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

// Validate a list of entity placements: known type id + within canvas bounds.
// `context` is appended to messages (e.g. ' in wave 2') to locate the entity.
function validateEntities(
  entities: any[],
  knownTypeIds: Set<string>,
  bounds: Bounds,
  levelId: string,
  context: string,
  errors: LevelValidationError[],
): void {
  entities.forEach((e: any, j: number) => {
    if (typeof e?.entityTypeId !== 'string' || !knownTypeIds.has(e.entityTypeId)) {
      errors.push({ levelId, message: `unknown entityTypeId '${String(e?.entityTypeId)}' at entity ${j}${context}` })
    }
    const x = typeof e?.x === 'number' ? e.x : NaN
    const y = typeof e?.y === 'number' ? e.y : NaN
    if (!(x >= 0 && x <= bounds.width) || !(y >= 0 && y <= bounds.height)) {
      errors.push({ levelId, message: `entity ${j}${context} position out of bounds (x=${e?.x}, y=${e?.y})` })
    }
  })
}

// Two entities at the exact same (x,y) stack on top of each other in-game.
// Within a single wave that's a bug; across waves it's fine (they spawn at
// different times), so the caller scopes the list it passes in.
function detectCollisions(
  entities: any[],
  levelId: string,
  context: string,
  errors: LevelValidationError[],
): void {
  const seen = new Set<string>()
  entities.forEach((e: any) => {
    if (typeof e?.x !== 'number' || typeof e?.y !== 'number') return
    const key = `${e.x},${e.y}`
    if (seen.has(key)) {
      errors.push({ levelId, message: `collision: two entities at the same position (x=${e.x}, y=${e.y})${context}` })
    } else {
      seen.add(key)
    }
  })
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

    const hasWaves = level?.waves !== undefined

    if (!Array.isArray(level?.entities)) {
      errors.push({ levelId, message: 'entities must be an array' })
    } else {
      validateEntities(level.entities, knownTypeIds, bounds, levelId, '', errors)
      // `waves` is canonical; when present the flat `entities` is just a derived
      // flatten across waves, so collisions there are legitimate (same cell in
      // different waves). Only guard the flat array when there are no waves.
      if (!hasWaves) {
        detectCollisions(level.entities, levelId, '', errors)
      }
    }

    if (hasWaves) {
      if (!Array.isArray(level.waves)) {
        errors.push({ levelId, message: 'waves must be an array' })
      } else {
        const seenOrders = new Set<number>()
        level.waves.forEach((w: any, wi: number) => {
          const ctx = ` in wave ${typeof w?.order === 'number' ? w.order : `#${wi}`}`
          if (typeof w?.order !== 'number' || !Number.isInteger(w.order) || w.order < 1) {
            errors.push({ levelId, message: `wave order must be an integer >= 1 (got ${String(w?.order)})` })
          } else if (seenOrders.has(w.order)) {
            errors.push({ levelId, message: `duplicate wave order ${w.order}` })
          } else {
            seenOrders.add(w.order)
          }
          if (typeof w?.delay !== 'number' || !Number.isFinite(w.delay) || w.delay < 0) {
            errors.push({ levelId, message: `wave delay must be a finite number >= 0 (got ${String(w?.delay)})` })
          }
          if (!Array.isArray(w?.entities)) {
            errors.push({ levelId, message: `wave entities must be an array${ctx}` })
          } else {
            // Every wave needs at least one entity — a wave with 0 entities has no
            // win condition in-game (the game freezes waiting for enemies that never
            // spawn). Esse bug não volta.
            if (w.entities.length === 0) {
              errors.push({ levelId, message: `wave vazia (0 entities): cada wave precisa de pelo menos uma entidade${ctx}` })
            }
            validateEntities(w.entities, knownTypeIds, bounds, levelId, ctx, errors)
            detectCollisions(w.entities, levelId, ctx, errors)
          }
        })
      }
    }

    // A level with no entities at all (no waves and empty flat entities, OR waves
    // that are all empty) is unplayable — there is nothing to shoot, the win
    // condition never fires. Count the canonical source: waves when present, else
    // the flat entities array.
    const flatCount = Array.isArray(level?.entities) ? level.entities.length : 0
    const waveEntityCount = hasWaves && Array.isArray(level?.waves)
      ? level.waves.reduce(
          (sum: number, w: any) => sum + (Array.isArray(w?.entities) ? w.entities.length : 0),
          0,
        )
      : 0
    const totalEntities = hasWaves ? waveEntityCount : flatCount
    if (totalEntities === 0) {
      errors.push({ levelId, message: 'level sem entidades (no entities): o level precisa de pelo menos uma entidade' })
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
