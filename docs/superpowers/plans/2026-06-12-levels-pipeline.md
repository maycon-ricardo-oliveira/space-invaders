# Levels Pipeline (PIPE) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the calibrator → levels.json → game pipeline end to end: the game loads real authored levels (canonical typeIds, stats resolved from the registry), and a contract test guarantees the pipeline never silently breaks again.

**Architecture:** A `LevelSource` interface in `@si/level-engine` (pure TS) with a `JsonLevelSource` implementation that validates the contract and resolves entity stats from the `EntityRegistry` (with optional partial overrides from JSON). The calibrator migrates to canonical typeIds and gains a pure `worldToLevelDefinitions` mapper (testable without Postgres). The game bootstraps the source at startup and the GameLoop gains the asteroid fuel drop at level 5+.

**Tech Stack:** TypeScript (npm workspaces), Jest, Zod (calibrator only), Prisma (calibrator only), Expo/React Native (game).

**Spec:** `docs/superpowers/specs/2026-06-12-levels-pipeline-design.md` (decisions D1–D8)
**Branch:** `feat/pipe-levels-pipeline` (already exists; spec committed). **Delivery = 1 PR** (D8).

**Canonical id mapping (D3):** `grunt → basic-enemy` · `rocket → fast-enemy` · `shield → strong-enemy` · `rock → asteroid`

---

### Task 1: Engine types — `LevelSource`, `LevelSummary`, level addressing fields

**Files:**
- Modify: `packages/level-engine/src/types.ts`
- Modify: `packages/level-engine/src/index.ts` (check exports)
- Test: `packages/level-engine/src/__tests__/types.test.ts`

- [ ] **Step 1: Write the failing test** — append to `types.test.ts`:

```ts
import type { LevelSource, LevelSummary, LevelDefinition } from '../types'

describe('LevelSource contract', () => {
  it('accepts a minimal LevelSource implementation', () => {
    const summary: LevelSummary = { id: 'story-1-1', phaseIndex: 1, levelIndex: 1, difficultyScore: 10 }
    const level: LevelDefinition = {
      id: 'story-1-1', style: 'classic', difficultyScore: 10,
      phaseIndex: 1, levelIndex: 1,
      entities: [], params: {
        numberOfEnemies: 0, enemySpeed: 2, enemyShotDelay: 1.5, enemyShotSpeed: 4,
        enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
        powerUpMinWait: 5, powerUpMaxWait: 15,
      },
    }
    const source: LevelSource = {
      load: async () => {},
      listLevels: () => [summary],
      getLevel: () => level,
    }
    expect(source.listLevels()[0].id).toBe('story-1-1')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx jest --selectProjects @si/level-engine 2>/dev/null || npm test -w packages/level-engine -- types`
Expected: FAIL — `Module '"../types"' has no exported member 'LevelSource'`

- [ ] **Step 3: Implement** — in `types.ts`, add `phaseIndex?: number` and `levelIndex?: number` to `LevelDefinition` (after `difficultyScore`), and append:

```ts
export interface LevelSummary {
  id: string
  phaseIndex: number
  levelIndex: number
  difficultyScore: number
}

export interface LevelSource {
  /** JSON source: validates in-memory data. Future Supabase source: fetches everything at startup. */
  load(): Promise<void>
  listLevels(): LevelSummary[]
  getLevel(id: string): LevelDefinition
}
```

- [ ] **Step 4: Ensure `index.ts` re-exports** — open `packages/level-engine/src/index.ts`; it must export all types (`export * from './types'` or equivalent) and the registry class. Add if missing:

```ts
export { EntityRegistry } from './registry/EntityRegistry'
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -w packages/level-engine -- types`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/level-engine/src/types.ts packages/level-engine/src/index.ts packages/level-engine/src/__tests__/types.test.ts
git commit -m "[ENGINE] feat(pipe): add LevelSource interface and level addressing fields"
```

---

### Task 2: Contract validator — `validateLevels`

**Files:**
- Create: `packages/level-engine/src/sources/validateLevels.ts`
- Test: `packages/level-engine/src/__tests__/validateLevels.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { validateLevels } from '../sources/validateLevels'

const KNOWN = new Set(['basic-enemy', 'fast-enemy', 'strong-enemy', 'asteroid'])

const validLevel = {
  id: 'story-1-1', style: 'classic', difficultyScore: 10, phaseIndex: 1, levelIndex: 1,
  entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }],
  params: {
    numberOfEnemies: 1, enemySpeed: 2, enemyShotDelay: 1.5, enemyShotSpeed: 4,
    enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
    powerUpMinWait: 5, powerUpMaxWait: 15, fuelDrainRate: 8,
  },
}

describe('validateLevels', () => {
  it('returns no errors for a valid payload', () => {
    expect(validateLevels([validLevel], KNOWN)).toEqual([])
  })

  it('rejects non-array payloads', () => {
    const errors = validateLevels({ nope: true }, KNOWN)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/array/i)
  })

  it('reports unknown entityTypeId with level address', () => {
    const bad = { ...validLevel, entities: [{ entityTypeId: 'grunt', x: 10, y: 10 }] }
    const errors = validateLevels([bad], KNOWN)
    expect(errors).toHaveLength(1)
    expect(errors[0].levelId).toBe('story-1-1')
    expect(errors[0].message).toContain("unknown entityTypeId 'grunt'")
  })

  it('reports out-of-bounds positions', () => {
    const bad = { ...validLevel, entities: [{ entityTypeId: 'asteroid', x: 9999, y: -5 }] }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(errors[0].message).toMatch(/out of bounds/i)
  })

  it('reports params outside calibrator ranges', () => {
    const bad = { ...validLevel, params: { ...validLevel.params, enemySpeed: 99 } }
    const errors = validateLevels([bad], KNOWN)
    expect(errors[0].message).toContain('enemySpeed')
  })

  it('reports duplicate level ids', () => {
    const errors = validateLevels([validLevel, { ...validLevel }], KNOWN)
    expect(errors.some(e => e.message.match(/duplicate/i))).toBe(true)
  })

  it('aggregates ALL errors instead of stopping at the first', () => {
    const bad1 = { ...validLevel, id: 'story-1-2', entities: [{ entityTypeId: 'grunt', x: 1, y: 1 }] }
    const bad2 = { ...validLevel, id: 'story-1-3', params: { ...validLevel.params, enemySpeed: 0 } }
    expect(validateLevels([bad1, bad2], KNOWN).length).toBeGreaterThanOrEqual(2)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -w packages/level-engine -- validateLevels`
Expected: FAIL — cannot find module `../sources/validateLevels`

- [ ] **Step 3: Implement** — `packages/level-engine/src/sources/validateLevels.ts`:

```ts
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

  data.forEach((level, i) => {
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
      level.entities.forEach((e: { entityTypeId?: unknown; x?: unknown; y?: unknown }, j: number) => {
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -w packages/level-engine -- validateLevels`
Expected: PASS (7 tests)

- [ ] **Step 5: Commit**

```bash
git add packages/level-engine/src/sources/validateLevels.ts packages/level-engine/src/__tests__/validateLevels.test.ts
git commit -m "[ENGINE] feat(pipe): add aggregated levels.json contract validator"
```

---

### Task 3: `JsonLevelSource`

**Files:**
- Create: `packages/level-engine/src/sources/JsonLevelSource.ts`
- Modify: `packages/level-engine/src/index.ts`
- Test: `packages/level-engine/src/__tests__/JsonLevelSource.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { JsonLevelSource, LevelContractError } from '../sources/JsonLevelSource'
import { EntityRegistry } from '../registry/EntityRegistry'

function makeRegistry(): EntityRegistry {
  const r = new EntityRegistry()
  r.register({ id: 'basic-enemy', label: 'Basic', icon: '👾', properties: { hp: 100, xpValue: 1, burstCount: 1 } })
  r.register({ id: 'fast-enemy', label: 'Fast', icon: '🚀', properties: { hp: 40, xpValue: 2, burstCount: 3 } })
  return r
}

const level = (over: object = {}) => ({
  id: 'story-1-1', style: 'classic' as const, difficultyScore: 10, phaseIndex: 1, levelIndex: 1,
  entities: [{ entityTypeId: 'fast-enemy', x: 50, y: 60 }],
  params: {
    numberOfEnemies: 1, enemySpeed: 2, enemyShotDelay: 1.5, enemyShotSpeed: 4,
    enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true, powerUpMinWait: 5, powerUpMaxWait: 15,
  },
  ...over,
})

describe('JsonLevelSource', () => {
  it('refuses construction with an empty registry', () => {
    expect(() => new JsonLevelSource([], new EntityRegistry())).toThrow(/registerEntities/)
  })

  it('load() throws LevelContractError with the aggregated report on invalid data', async () => {
    const source = new JsonLevelSource([level({ entities: [{ entityTypeId: 'grunt', x: 1, y: 1 }] })], makeRegistry())
    await expect(source.load()).rejects.toThrow(LevelContractError)
    await expect(source.load()).rejects.toThrow(/unknown entityTypeId 'grunt'/)
  })

  it('resolves entity properties from the registry', async () => {
    const source = new JsonLevelSource([level()], makeRegistry())
    await source.load()
    const loaded = source.getLevel('story-1-1')
    expect(loaded.entities[0].properties).toMatchObject({ hp: 40, xpValue: 2, burstCount: 3 })
  })

  it('JSON partial properties override registry defaults per key', async () => {
    const source = new JsonLevelSource(
      [level({ entities: [{ entityTypeId: 'fast-enemy', x: 50, y: 60, properties: { hp: 90 } }] })],
      makeRegistry(),
    )
    await source.load()
    const e = source.getLevel('story-1-1').entities[0]
    expect(e.properties).toMatchObject({ hp: 90, xpValue: 2, burstCount: 3 })
  })

  it('listLevels returns summaries in file order', async () => {
    const source = new JsonLevelSource(
      [level(), level({ id: 'story-1-2', levelIndex: 2 })],
      makeRegistry(),
    )
    await source.load()
    expect(source.listLevels().map(s => s.id)).toEqual(['story-1-1', 'story-1-2'])
    expect(source.listLevels()[1]).toMatchObject({ phaseIndex: 1, levelIndex: 2, difficultyScore: 10 })
  })

  it('getLevel throws for unknown id', async () => {
    const source = new JsonLevelSource([level()], makeRegistry())
    await source.load()
    expect(() => source.getLevel('story-9-9')).toThrow(/not found/i)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -w packages/level-engine -- JsonLevelSource`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement** — `packages/level-engine/src/sources/JsonLevelSource.ts`:

```ts
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
          ...this.registry.get(placement.entityTypeId).properties,
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
```

Note: `EntityRegistry.get()` — check the actual signature in `packages/level-engine/src/registry/EntityRegistry.ts`. If it returns `EntityType | undefined`, use `this.registry.get(placement.entityTypeId)!.properties` (safe: validated above).

- [ ] **Step 4: Export from index** — add to `packages/level-engine/src/index.ts`:

```ts
export { JsonLevelSource, LevelContractError } from './sources/JsonLevelSource'
export { validateLevels } from './sources/validateLevels'
export type { LevelValidationError } from './sources/validateLevels'
```

- [ ] **Step 5: Run all engine tests**

Run: `npm test -w packages/level-engine`
Expected: PASS (all suites, including pre-existing)

- [ ] **Step 6: Commit**

```bash
git add packages/level-engine/src/sources/ packages/level-engine/src/index.ts packages/level-engine/src/__tests__/JsonLevelSource.test.ts
git commit -m "[ENGINE] feat(pipe): add JsonLevelSource with registry stat resolution"
```

---

### Task 4: Calibrator — canonical typeIds everywhere

**Files:**
- Modify: `apps/calibrator/src/lib/schemas.ts:3`
- Modify: `apps/calibrator/src/components/WaveEditor/EntityToolbox.tsx:5-10`
- Modify: `apps/calibrator/src/services/WaveScoreCalculator.ts:4-9`
- Modify: `apps/calibrator/prisma/seed.ts:34-56`
- Modify: any other literal usage found by compiler/tests (e.g. `SpawnZoneGrid.tsx` cell colors, test fixtures)

- [ ] **Step 1: Update the Zod enum (single source for the calibrator)** — `schemas.ts:3`:

```ts
export const EntityTypeSchema = z.enum(['basic-enemy', 'fast-enemy', 'strong-enemy', 'asteroid'])
```

- [ ] **Step 2: Update EntityToolbox (canonical values, friendly labels stay)** — `EntityToolbox.tsx:5-10`:

```ts
const ENTITIES: { type: EntityType; label: string; icon: string }[] = [
  { type: 'basic-enemy',  label: 'Grunt',  icon: '👾' },
  { type: 'fast-enemy',   label: 'Rocket', icon: '🚀' },
  { type: 'strong-enemy', label: 'Shield', icon: '🛡️' },
  { type: 'asteroid',     label: 'Rock',   icon: '🪨' },
]
```

- [ ] **Step 3: Update score weights** — `WaveScoreCalculator.ts:4-9`:

```ts
const TYPE_WEIGHT: Record<string, number> = {
  'basic-enemy':  1.0,
  'asteroid':     1.5,
  'fast-enemy':   2.0,
  'strong-enemy': 3.0,
}
```

- [ ] **Step 4: Update seed grids** — `seed.ts:34-56`: replace every `'grunt'` → `'basic-enemy'`, `'rocket'` → `'fast-enemy'`, `'shield'` → `'strong-enemy'` in the three wave grids (`'rock'` does not appear in the current seed).

- [ ] **Step 5: Let the compiler and tests find every remaining literal**

Run: `npm test -w apps/calibrator`
Expected: FAILURES in tests using old literals (e.g. `schemas.test.ts`, `WaveScoreCalculator.test.ts`, `WavePatternGenerator.test.ts`, `SpawnZoneGrid.test.tsx`, component fixtures). Apply the mapping table to each failure — values change, labels/colors stay. Re-run until green.

Run: `cd apps/calibrator && npx tsc --noEmit` — fix any remaining literal type errors the tests didn't reach.

- [ ] **Step 6: Re-seed note** — dev-only DB (D3): no data migration. Document in the PR description that running `npx prisma db seed` refreshes local data with canonical ids.

- [ ] **Step 7: Commit**

```bash
git add apps/calibrator/src apps/calibrator/prisma/seed.ts
git commit -m "[CAL] refactor(pipe): migrate dashboard to canonical entity typeIds"
```

---

### Task 5: Calibrator — pure `worldToLevelDefinitions` mapper

**Files:**
- Create: `apps/calibrator/src/services/worldToLevelDefinitions.ts`
- Modify: `apps/calibrator/src/services/ExportService.ts`
- Test: `apps/calibrator/src/__tests__/worldToLevelDefinitions.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { worldToLevelDefinitions, type PlainWorld } from '../services/worldToLevelDefinitions'

const world: PlainWorld = {
  phases: [{
    index: 0,
    levels: [{
      index: 0,
      enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
      enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
      waves: [
        { order: 1, delay: 0, grid: [['basic-enemy', null, 'fast-enemy']] },
        { order: 2, delay: 3, grid: [[null, 'asteroid', null]] },
      ],
    }],
  }],
}

describe('worldToLevelDefinitions', () => {
  it('produces 1-based ids and addressing fields', () => {
    const [level] = worldToLevelDefinitions(world)
    expect(level.id).toBe('story-1-1')
    expect(level.phaseIndex).toBe(1)
    expect(level.levelIndex).toBe(1)
  })

  it('flattens wave grids into top-level entities with positions', () => {
    const [level] = worldToLevelDefinitions(world)
    expect(level.entities).toHaveLength(3)
    expect(level.entities.map(e => e.entityTypeId)).toEqual(['basic-enemy', 'fast-enemy', 'asteroid'])
    expect(level.entities[0].x).toBeGreaterThan(0)
  })

  it('keeps waves for Sprint 6B', () => {
    const [level] = worldToLevelDefinitions(world)
    expect(level.waves).toHaveLength(2)
    expect(level.waves![0].entities).toHaveLength(2)
  })

  it('maps params including fuelDrainRate', () => {
    const [level] = worldToLevelDefinitions(world)
    expect(level.params.fuelDrainRate).toBe(8)
    expect(level.params.numberOfEnemies).toBe(3)
    expect(level.params.enemyShotDelay).toBe(1.5)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -w apps/calibrator -- worldToLevelDefinitions`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement** — move the mapping logic out of `exportToJson` into `worldToLevelDefinitions.ts`:

```ts
import type { LevelDefinition, EntityPlacement, Wave } from '@si/level-engine'
import { PHONE_WIDTH, GRID_COLS, CELL_HEIGHT_EXPORT } from '../lib/gridConstants'

export interface PlainWave { order: number; delay: number; grid: (string | null)[][] }
export interface PlainLevel {
  index: number
  enemySpeed: number; shotDelay: number; fuelDrain: number
  enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number
  hasPowerUps: boolean
  waves: PlainWave[]
}
export interface PlainPhase { index: number; levels: PlainLevel[] }
export interface PlainWorld { phases: PlainPhase[] }

const CELL_WIDTH = PHONE_WIDTH / GRID_COLS
const CELL_HEIGHT = CELL_HEIGHT_EXPORT

function gridToEntityPlacements(grid: (string | null)[][]): EntityPlacement[] {
  const placements: EntityPlacement[] = []
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const cell = grid[row][col]
      if (cell !== null) {
        placements.push({
          entityTypeId: cell,
          x: col * CELL_WIDTH + CELL_WIDTH / 2,
          y: row * CELL_HEIGHT + CELL_HEIGHT / 2,
        })
      }
    }
  }
  return placements
}

export function worldToLevelDefinitions(world: PlainWorld): LevelDefinition[] {
  const levels: LevelDefinition[] = []
  for (const phase of world.phases) {
    for (const level of phase.levels) {
      const waves = [...level.waves].sort((a, b) => a.order - b.order)
      const levelWaves: Wave[] = waves.map(w => ({ entities: gridToEntityPlacements(w.grid) }))
      const allEntities = levelWaves.flatMap(w => w.entities)
      levels.push({
        id: `story-${phase.index + 1}-${level.index + 1}`,
        style: 'classic',
        difficultyScore: Math.round((level.index / 9) * 100),
        phaseIndex: phase.index + 1,
        levelIndex: level.index + 1,
        entities: allEntities,
        waves: levelWaves,
        params: {
          numberOfEnemies: allEntities.length,
          enemySpeed: level.enemySpeed,
          enemyShotDelay: level.shotDelay,
          enemyShotSpeed: level.enemyShotSpeed,
          enemyAngerDelay: level.enemyAngerDelay,
          enemySpawnDelay: level.enemySpawnDelay,
          hasPowerUps: level.hasPowerUps,
          powerUpMinWait: 5,
          powerUpMaxWait: 15,
          fuelDrainRate: level.fuelDrain,
        },
      })
    }
  }
  return levels
}
```

- [ ] **Step 4: Slim down `ExportService.ts`** — replace its body so Prisma access stays thin:

```ts
import path from 'path'
import { writeFileSync } from 'fs'
import prisma from '../lib/prisma'
import { worldToLevelDefinitions, type PlainWorld } from './worldToLevelDefinitions'

const OUTPUT_PATH = path.join(process.cwd(), '..', 'game', 'src', 'levels.json')

export async function exportToJson(worldId: number): Promise<string> {
  const world = await prisma.world.findUniqueOrThrow({
    where: { id: worldId },
    include: {
      phases: {
        orderBy: { index: 'asc' },
        include: {
          levels: {
            orderBy: { index: 'asc' },
            include: { waves: { orderBy: { order: 'asc' } } },
          },
        },
      },
    },
  })
  const levels = worldToLevelDefinitions(world as unknown as PlainWorld)
  writeFileSync(OUTPUT_PATH, JSON.stringify(levels, null, 2))
  return OUTPUT_PATH
}
```

- [ ] **Step 5: Run tests** (`ExportService.test.ts` may need fixture updates to canonical ids and the new fields — update expectations accordingly)

Run: `npm test -w apps/calibrator`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/calibrator/src/services/ apps/calibrator/src/__tests__/
git commit -m "[CAL] refactor(pipe): extract pure worldToLevelDefinitions mapper with level addressing"
```

---

### Task 6: Calibrator-side contract test (export speaks the engine contract)

**Files:**
- Test: `apps/calibrator/src/__tests__/exportContract.test.ts`

- [ ] **Step 1: Write the test** (should pass immediately if Tasks 4–5 are correct — it exists to catch FUTURE drift):

```ts
import { validateLevels } from '@si/level-engine'
import { worldToLevelDefinitions, type PlainWorld } from '../services/worldToLevelDefinitions'
import { EntityTypeSchema } from '../lib/schemas'

const world: PlainWorld = {
  phases: [{
    index: 0,
    levels: [{
      index: 0,
      enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
      enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
      waves: [{ order: 1, delay: 0, grid: [['basic-enemy', 'fast-enemy', 'strong-enemy', 'asteroid']] }],
    }],
  }],
}

describe('export contract', () => {
  it('every type the dashboard can place passes the engine validator', () => {
    const knownIds = new Set<string>(EntityTypeSchema.options)
    const errors = validateLevels(worldToLevelDefinitions(world), knownIds)
    expect(errors).toEqual([])
  })
})
```

- [ ] **Step 2: Run** — `npm test -w apps/calibrator -- exportContract` → Expected: PASS. If it FAILS, the export and the contract disagree — fix the export, never the test.

- [ ] **Step 3: Commit**

```bash
git add apps/calibrator/src/__tests__/exportContract.test.ts
git commit -m "[CAL] test(pipe): add export-side contract test against engine validator"
```

---

### Task 7: Shared seed data + initial `levels.json` artifact

**Files:**
- Create: `apps/calibrator/prisma/seedData.ts` (plain data extracted from `seed.ts`)
- Modify: `apps/calibrator/prisma/seed.ts` (consume seedData)
- Create: `apps/calibrator/scripts/generate-levels-json.ts`
- Create (generated): `apps/game/src/levels.json`

- [ ] **Step 1: Extract plain seed data** — `apps/calibrator/prisma/seedData.ts`:

```ts
import type { PlainWorld } from '../src/services/worldToLevelDefinitions'

export const SEED_WORLD: PlainWorld = {
  phases: [{
    index: 0,
    levels: [{
      index: 0,
      enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0, hasPowerUps: true,
      waves: [
        { order: 1, delay: 0, grid: [
          ['basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null, null, null, null, null],
          Array(12).fill(null),
        ] },
        { order: 2, delay: 3.0, grid: [
          [null, null, null, null, null, 'fast-enemy', null, null, null, null, null, null],
          [null, null, null, null, 'basic-enemy', null, 'basic-enemy', null, null, null, null, null],
        ] },
        { order: 3, delay: 3.0, grid: [
          ['strong-enemy', null, null, null, null, null, null, null, null, null, null, null],
          [null, null, 'basic-enemy', null, 'basic-enemy', null, null, null, null, null, null, null],
        ] },
      ],
    }],
  }],
}
```

- [ ] **Step 2: Make `seed.ts` consume it** — replace the inline `waves` array and level params with reads from `SEED_WORLD.phases[0].levels[0]` (import `{ SEED_WORLD } from './seedData'`; keep upsert structure identical).

- [ ] **Step 3: Generation script** — `apps/calibrator/scripts/generate-levels-json.ts`:

```ts
// Regenerates apps/game/src/levels.json from the seed data — no database needed.
// Run from apps/calibrator: npx tsx scripts/generate-levels-json.ts
import path from 'path'
import { writeFileSync } from 'fs'
import { worldToLevelDefinitions } from '../src/services/worldToLevelDefinitions'
import { SEED_WORLD } from '../prisma/seedData'

const OUTPUT = path.join(__dirname, '..', '..', 'game', 'src', 'levels.json')
writeFileSync(OUTPUT, JSON.stringify(worldToLevelDefinitions(SEED_WORLD), null, 2))
console.log(`levels.json written to ${OUTPUT}`)
```

- [ ] **Step 4: Generate and inspect**

Run: `cd apps/calibrator && npx tsx scripts/generate-levels-json.ts` (if `tsx` is unavailable, use `npx ts-node`)
Expected: `apps/game/src/levels.json` exists, contains 1 level `story-1-1` with 9 entities (4+1+2 grid cells from waves 1–2... count the non-null cells: wave1=4, wave2=3, wave3=3 → 10 entities) and `waves` array of 3.

- [ ] **Step 5: Run calibrator suite + commit**

```bash
npm test -w apps/calibrator
git add apps/calibrator/prisma/seedData.ts apps/calibrator/prisma/seed.ts apps/calibrator/scripts/generate-levels-json.ts apps/game/src/levels.json
git commit -m "[CAL] feat(pipe): share seed data and generate initial levels.json artifact"
```

---

### Task 8: Game — level source bootstrap

**Files:**
- Modify: `apps/game/src/entities/registerEntities.ts:1-3` (structural param type)
- Create: `apps/game/src/levels/source.ts`
- Modify: `apps/game/tsconfig.json` (ensure `"resolveJsonModule": true` in compilerOptions)
- Test: `apps/game/src/__tests__/source.test.ts` (follow the existing test dir convention — check where `GameLoop.test.ts` lives and place alongside)

- [ ] **Step 1: Loosen `registerEntities` signature** (so a bare registry can receive the types):

```ts
import type { EntityType } from '@si/level-engine'

export interface EntityTypeRegistrar {
  registerEntityType(type: EntityType): void
}

export function registerEntities(target: EntityTypeRegistrar): void {
  // body unchanged — same 4 registerEntityType calls
}
```

`GameScreen.tsx` keeps compiling (`LevelEngine` satisfies the structural type).

- [ ] **Step 2: Write the failing test**

```ts
import { initLevelSource, getLevelSource, resetLevelSourceForTests } from '../levels/source'

describe('level source bootstrap', () => {
  beforeEach(() => resetLevelSourceForTests())

  it('getLevelSource before init throws a helpful error', () => {
    expect(() => getLevelSource()).toThrow(/initLevelSource/)
  })

  it('initLevelSource loads the committed levels.json artifact', async () => {
    const source = await initLevelSource()
    const summaries = source.listLevels()
    expect(summaries.length).toBeGreaterThanOrEqual(1)
    expect(summaries[0].id).toBe('story-1-1')
    const level = source.getLevel('story-1-1')
    expect(level.entities.length).toBeGreaterThan(0)
    expect(level.entities.every(e => e.properties && typeof e.properties.hp === 'number')).toBe(true)
  })
})
```

- [ ] **Step 3: Run to verify it fails** — `npm test -w apps/game -- source` → FAIL (module not found)

- [ ] **Step 4: Implement** — `apps/game/src/levels/source.ts`:

```ts
import { EntityRegistry, JsonLevelSource } from '@si/level-engine'
import type { LevelSource } from '@si/level-engine'
import { registerEntities } from '../entities/registerEntities'
import levelsData from '../levels.json'

let source: LevelSource | null = null

export async function initLevelSource(): Promise<LevelSource> {
  const registry = new EntityRegistry()
  registerEntities({ registerEntityType: type => registry.register(type) })
  const json = new JsonLevelSource(levelsData, registry)
  await json.load()
  source = json
  return json
}

export function getLevelSource(): LevelSource {
  if (!source) throw new Error('Level source not ready — call initLevelSource() at startup')
  return source
}

export function resetLevelSourceForTests(): void {
  source = null
}
```

If TypeScript rejects the JSON import, add `"resolveJsonModule": true` to `apps/game/tsconfig.json` compilerOptions.

- [ ] **Step 5: Run test to verify it passes** — `npm test -w apps/game -- source` → PASS. Note: the package `dist/` must be fresh (`npm run build` at root) so `JsonLevelSource` resolves.

- [ ] **Step 6: Commit**

```bash
git add apps/game/src/levels/source.ts apps/game/src/entities/registerEntities.ts apps/game/tsconfig.json apps/game/src/__tests__/source.test.ts
git commit -m "[GAME] feat(pipe): bootstrap JsonLevelSource from committed levels.json"
```

---

### Task 9: Game — StoryModeScreen lists real levels (with fallback)

**Files:**
- Modify: `apps/game/src/screens/StoryModeScreen.tsx`
- Modify: `apps/game/App.tsx`
- Test: modify `apps/game/src/__tests__/StoryModeScreen.test.tsx` (or its actual location)

- [ ] **Step 1: Write/extend the failing tests**

```tsx
import { render, screen } from '@testing-library/react-native'
import { StoryModeScreen } from '../screens/StoryModeScreen'

describe('StoryModeScreen with level source', () => {
  it('renders one row per summary with phase/level label', () => {
    const summaries = [
      { id: 'story-1-1', phaseIndex: 1, levelIndex: 1, difficultyScore: 0 },
      { id: 'story-1-2', phaseIndex: 1, levelIndex: 2, difficultyScore: 11 },
    ]
    render(<StoryModeScreen summaries={summaries} onSelectLevel={jest.fn()} />)
    expect(screen.getByText('Fase 1 — Level 1')).toBeTruthy()
    expect(screen.getByText('Fase 1 — Level 2')).toBeTruthy()
  })

  it('falls back to 20 procedural levels when summaries are empty', () => {
    render(<StoryModeScreen summaries={[]} onSelectLevel={jest.fn()} />)
    expect(screen.getByText('Level 1')).toBeTruthy()
    expect(screen.getByText('Level 20')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run to verify it fails** — `npm test -w apps/game -- StoryModeScreen` → FAIL (no `summaries` prop)

- [ ] **Step 3: Implement** — `StoryModeScreen.tsx`:

```tsx
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { LevelSummary } from '@si/level-engine'
import { TOTAL_STORY_LEVELS } from '../game/GameLoop'

export type LevelSelection = { kind: 'authored'; levelId: string } | { kind: 'procedural'; levelIndex: number }

interface Props {
  summaries: LevelSummary[]
  onSelectLevel: (selection: LevelSelection) => void
}

const fallbackLevels = Array.from({ length: TOTAL_STORY_LEVELS }, (_, i) => i)

export function StoryModeScreen({ summaries, onSelectLevel }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Story Mode</Text>
      <ScrollView>
        {summaries.length > 0
          ? summaries.map(s => (
              <TouchableOpacity key={s.id} onPress={() => onSelectLevel({ kind: 'authored', levelId: s.id })} style={styles.row}>
                <Text style={styles.levelText}>{`Fase ${s.phaseIndex} — Level ${s.levelIndex}`}</Text>
              </TouchableOpacity>
            ))
          : fallbackLevels.map(i => (
              <TouchableOpacity key={i} onPress={() => onSelectLevel({ kind: 'procedural', levelIndex: i })} style={styles.row}>
                <Text style={styles.levelText}>Level {i + 1}</Text>
              </TouchableOpacity>
            ))}
      </ScrollView>
    </View>
  )
}
```

(keep the existing `styles` block unchanged)

- [ ] **Step 4: Wire `App.tsx`** — init the source at startup, pass summaries + selection through:

```tsx
import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import type { LevelSummary } from '@si/level-engine'
import { StoryModeScreen, type LevelSelection } from './src/screens/StoryModeScreen'
import { GameScreen } from './src/screens/GameScreen'
import { TOTAL_STORY_LEVELS } from './src/game/GameLoop'
import { initLevelSource } from './src/levels/source'

type Screen = 'story' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('story')
  const [selection, setSelection] = useState<LevelSelection>({ kind: 'procedural', levelIndex: 0 })
  const [summaries, setSummaries] = useState<LevelSummary[]>([])

  useEffect(() => {
    initLevelSource()
      .then(source => setSummaries(source.listLevels()))
      .catch(error => {
        if (__DEV__) throw error          // fail fast on contract violations in dev
        console.error('levels.json invalid — procedural fallback', error)
        setSummaries([])                   // prod: fallback, game never bricks
      })
  }, [])

  const handleSelectLevel = (sel: LevelSelection) => {
    setSelection(sel)
    setScreen('game')
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {screen === 'story' && <StoryModeScreen summaries={summaries} onSelectLevel={handleSelectLevel} />}
      {screen === 'game' && (
        <GameScreen selection={selection} totalLevels={TOTAL_STORY_LEVELS} onBack={() => setScreen('story')} />
      )}
    </View>
  )
}
```

- [ ] **Step 5: Run tests** — StoryModeScreen suite green; `GameScreen` will fail to compile until Task 10 — proceed directly.

- [ ] **Step 6: Commit (with Task 10 if compile-coupled)** — see Task 10 Step 6.

---

### Task 10: Game — GameScreen loads authored levels (with fallback)

**Files:**
- Modify: `apps/game/src/screens/GameScreen.tsx:11-40`
- Test: modify `apps/game/src/__tests__/GameScreen.test.tsx` (adjust props in existing tests)

- [ ] **Step 1: Update props and `buildLoop`**:

```tsx
import { getLevelSource } from '../levels/source'
import type { LevelSelection } from './StoryModeScreen'

interface Props {
  selection: LevelSelection
  totalLevels: number
  onBack: () => void
}

function buildLoop(selection: LevelSelection, totalLevels: number): GameLoop {
  if (selection.kind === 'authored') {
    try {
      return new GameLoop(getLevelSource().getLevel(selection.levelId))
    } catch (error) {
      if (__DEV__) throw error
      console.error(`level ${selection.levelId} failed to load — procedural fallback`, error)
    }
  }
  const levelIndex = selection.kind === 'procedural' ? selection.levelIndex : 0
  const engine = new LevelEngine(new CurveCalibratorStrategy())
  registerEntities(engine)
  const level = engine.generate({ mode: 'story', levelIndex, totalLevels })
  return new GameLoop(level)
}

export function GameScreen({ selection, totalLevels, onBack }: Props) {
  const [loop] = useState(() => buildLoop(selection, totalLevels))
  // ... rest unchanged
```

- [ ] **Step 2: Update existing GameScreen tests** — replace `levelIndex={0}` props with `selection={{ kind: 'procedural', levelIndex: 0 }}`.

- [ ] **Step 3: Run the game suite**

Run: `npm test -w apps/game`
Expected: PASS

- [ ] **Step 4: Type check** — `cd apps/game && npx tsc --noEmit` → zero errors

- [ ] **Step 5: Commit (Tasks 9+10 together — they form one compile unit)**

```bash
git add apps/game/src/screens/ apps/game/App.tsx apps/game/src/__tests__/
git commit -m "[GAME] feat(pipe): load authored levels from source in story mode with procedural fallback"
```

---

### Task 11: GameLoop — asteroid fuel drop at level 5+ (D6)

**Files:**
- Modify: `apps/game/src/game/GameLoop.ts` (constructor + `checkCollisions` kill block, lines ~300-315)
- Test: `apps/game/src/__tests__/GameLoop.test.ts` (append describe block)

- [ ] **Step 1: Write the failing tests** (follow the existing test file's level-fixture helpers):

```ts
describe('asteroid fuel drop (level 5+)', () => {
  const asteroidLevel = (levelIndex: number): LevelDefinition => ({
    id: `story-1-${levelIndex}`, style: 'classic', difficultyScore: 50, phaseIndex: 1, levelIndex,
    entities: [{
      entityTypeId: 'asteroid', x: 100, y: 100,
      properties: { hp: 20, xpValue: 1, movementType: 'vertical', burstCount: 0, dropsPickup: null, speedMultiplier: 0.8 },
    }],
    params: {
      numberOfEnemies: 1, enemySpeed: 0, enemyShotDelay: 99, enemyShotSpeed: 4,
      enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: false, powerUpMinWait: 5, powerUpMaxWait: 15,
    },
  })

  function killTheAsteroid(loop: GameLoop) {
    // position a bullet on top of the asteroid and tick
    const state = loop.getState()
    loop.fire()
    ;(loop as unknown as { state: { playerBullets: { x: number; y: number; active: boolean }[] } })
      .state.playerBullets[0] = { x: 100, y: 100, active: true }
    loop.update(16)
    return loop.getState()
  }

  it('drops a fuel pickup on asteroid kill at level 5 when the roll succeeds', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1) // below 0.3 chance
    const state = killTheAsteroid(new GameLoop(asteroidLevel(5)))
    expect(state.fuelPickups).toHaveLength(1)
    jest.restoreAllMocks()
  })

  it('does NOT drop fuel below level 5', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.1)
    const state = killTheAsteroid(new GameLoop(asteroidLevel(4)))
    expect(state.fuelPickups).toHaveLength(0)
    jest.restoreAllMocks()
  })

  it('does NOT drop fuel when the roll fails', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9) // above 0.3
    const state = killTheAsteroid(new GameLoop(asteroidLevel(5)))
    expect(state.fuelPickups).toHaveLength(0)
    jest.restoreAllMocks()
  })
})
```

Adapt the bullet-positioning to the file's existing private-state test idiom (the 993-line suite already manipulates internals — reuse its helper pattern instead of the cast above if one exists).

- [ ] **Step 2: Run to verify it fails** — `npm test -w apps/game -- GameLoop -t "fuel drop"` → FAIL

- [ ] **Step 3: Implement** — in `GameLoop.ts`:

Add constant near the others (line ~19): `const ASTEROID_FUEL_DROP_CHANCE = 0.3` and `const ASTEROID_FUEL_DROP_MIN_LEVEL = 5`
Add field: `private readonly levelIndex: number` — set in constructor: `this.levelIndex = level.levelIndex ?? 0`
In the kill block of `checkCollisions()` (right after the existing `dropsPickup === 'damage'` branch):

```ts
if (
  enemy.typeId === 'asteroid' &&
  this.levelIndex >= ASTEROID_FUEL_DROP_MIN_LEVEL &&
  Math.random() < ASTEROID_FUEL_DROP_CHANCE
) {
  this.state.fuelPickups.push({ x: enemy.x, y: enemy.y, active: true })
}
```

(The existing `checkFuelPickupCollisions` already restores the full tank on collection — D6 satisfied with no further change.)

- [ ] **Step 4: Run the full GameLoop suite** — `npm test -w apps/game -- GameLoop` → PASS (96+ tests; the random mock must not leak — `jest.restoreAllMocks()` in each test)

- [ ] **Step 5: Commit**

```bash
git add apps/game/src/game/GameLoop.ts apps/game/src/__tests__/GameLoop.test.ts
git commit -m "[GAME] feat(pipe): asteroid drops fuel pickup from level 5 per FUEL-1"
```

---

### Task 12: ⭐ Game-side artifact contract test

**Files:**
- Test: `apps/game/src/__tests__/levelsContract.test.ts`

- [ ] **Step 1: Write the test** — exercises the REAL committed artifact through the REAL registry into the REAL GameLoop:

```ts
import { EntityRegistry, JsonLevelSource } from '@si/level-engine'
import { registerEntities } from '../entities/registerEntities'
import { GameLoop } from '../game/GameLoop'
import levelsData from '../levels.json'

describe('levels.json artifact contract (the test that was missing for 7 sprints)', () => {
  async function loadedSource() {
    const registry = new EntityRegistry()
    registerEntities({ registerEntityType: t => registry.register(t) })
    const source = new JsonLevelSource(levelsData, registry)
    await source.load()
    return source
  }

  it('the committed artifact passes the engine contract', async () => {
    await expect(loadedSource()).resolves.toBeDefined()
  })

  it('GameLoop spawns the authored enemies with registry-resolved stats', async () => {
    const source = await loadedSource()
    const level = source.getLevel('story-1-1')
    const state = new GameLoop(level).getState()

    expect(state.enemies.length).toBe(level.entities.length)
    const fast = state.enemies.find(e => e.typeId === 'fast-enemy')
    expect(fast).toMatchObject({ hp: 40, burstCount: 3, xpValue: 2, speedMultiplier: 2.5 })
    const strong = state.enemies.find(e => e.typeId === 'strong-enemy')
    expect(strong).toMatchObject({ hp: 200, burstCount: 1, xpValue: 3 })
  })
})
```

- [ ] **Step 2: Run** — `npm test -w apps/game -- levelsContract`
Expected: PASS. If FAIL: the pipeline is broken somewhere between Tasks 4–8 — fix the code, never weaken the test.

- [ ] **Step 3: Commit**

```bash
git add apps/game/src/__tests__/levelsContract.test.ts
git commit -m "[GAME] test(pipe): add end-to-end artifact contract test"
```

---

### Task 13: Full verification, ROADMAP, PR

- [ ] **Step 1: Full suite + builds from the monorepo root**

```bash
npm run build && npm test
cd apps/game && npx tsc --noEmit && cd ../..
```
Expected: zero TS errors, all suites green.

- [ ] **Step 2: Manual DoD check (spec §8)** — `cd apps/game && npx expo start`: open story mode → "Fase 1 — Level 1" appears → enemies basic/fast/strong spawn at the authored positions (not the generic 5-column grid).

- [ ] **Step 3: Update `docs/ROADMAP.md`** — in the Tech Debt section, mark the two CRITICAL pipeline items as `🚧 In Progress (PR #N)` (fill N after opening the PR; switch to ✅ Done in the merge-time update).

- [ ] **Step 4: Push and open the single PR (D8)**

```bash
git push -u origin feat/pipe-levels-pipeline
gh pr create --title "[INFRA] feat(pipe): close calibrator→levels.json→game pipeline end to end" --body "<PR template per CLAUDE.md, listing spec + plan links, the contract tests, and the re-seed note>"
```

- [ ] **Step 5: Commit the ROADMAP update** (amend into the branch before merge per the living-document rule).

---

## Self-review (done at write time)

- **Spec coverage:** D1→Tasks 8–10 · D2→Tasks 3, 12 · D3→Task 4 · D4→Task 5 (waves kept, not consumed) · D5→Task 9 · D6→Task 11 · D7→Tasks 1–3, 8 · D8→Task 13. Error handling §6→Tasks 2–3 (aggregate/throw), Task 9–10 (`__DEV__` fail-fast + prod fallback), Task 8 (registry guard). Tests §7→Tasks 2, 3, 5, 6, 9, 11, 12.
- **Known adaptation points (not placeholders, verify on site):** exact game test directory layout (`src/__tests__/` assumed); `EntityRegistry.get()` return type (Task 3 note); GameLoop test file's private-state idiom (Task 11 note); `tsx` vs `ts-node` (Task 7).
- **Type consistency:** `LevelSelection` defined once (Task 9) and imported in Task 10; `worldToLevelDefinitions`/`PlainWorld` defined in Task 5, consumed in Tasks 6–7; `initLevelSource`/`getLevelSource` defined in Task 8, consumed in Tasks 9–10.
