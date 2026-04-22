# Sprint 2 — Level Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete `@si/level-engine` package — types, EntityRegistry, CurveCalibratorStrategy, and LevelEngine — with full TDD coverage, exported via a clean barrel, split across 3 PRs.

**Architecture:** The Level Engine is a pure-TypeScript package (zero native deps). A shared `computeDifficultyScore()` helper converts a `LevelRequest` into a 0–100 score; `CurveCalibratorStrategy` uses that score to linearly interpolate `LevelParams`; `LevelEngine` orchestrates the registry and calibrator to return a `LevelDefinition`. No renderer or app code is touched in this sprint.

**Tech Stack:** TypeScript 5.x, Jest + ts-jest (already configured in `packages/level-engine/jest.config.js`), npm workspaces monorepo.

---

## Prerequisites — commit stale Expo-web files before branching

Running `expo start --web` auto-added dependencies to the root `package.json` and modified `tsconfig.json`. Commit them to `master` first so Sprint 2 branches have a clean base.

- [ ] **Verify build is green on master**

  ```bash
  cd /path/to/space-invaders
  npm run build && npm test
  ```

  Expected: 0 TypeScript errors, 3/3 tests passing (smoke tests for 3 packages).

- [ ] **Commit the stale Expo-web changes**

  ```bash
  git add package.json package-lock.json tsconfig.json
  git commit -m "[INFRA] chore(s2): commit expo-web deps added by expo start --web"
  ```

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `packages/level-engine/src/types.ts` | Create | All shared interfaces and types |
| `packages/level-engine/src/__tests__/types.test.ts` | Create | Verify type shapes are importable and structurally correct |
| `packages/level-engine/src/difficulty.ts` | Create | `computeDifficultyScore(request)` — single source of truth for 0–100 score |
| `packages/level-engine/src/__tests__/difficulty.test.ts` | Create | Unit tests for all score edge cases |
| `packages/level-engine/src/registry/EntityRegistry.ts` | Create | Register/retrieve entity types by id |
| `packages/level-engine/src/__tests__/EntityRegistry.test.ts` | Create | Unit tests for register, get, getAll, duplicate guard |
| `packages/level-engine/src/strategies/CurveCalibratorStrategy.ts` | Create | Linear interpolation from score → `LevelParams` |
| `packages/level-engine/src/__tests__/CurveCalibratorStrategy.test.ts` | Create | Unit tests for story mode, survival mode, missing fields guard |
| `packages/level-engine/src/LevelEngine.ts` | Create | Orchestrates calibrator + registry; produces `LevelDefinition` |
| `packages/level-engine/src/__tests__/LevelEngine.test.ts` | Create | Integration tests for generate(), setCalibrator(), registerEntityType() |
| `packages/level-engine/src/index.ts` | Modify | Barrel export of all public symbols |
| `docs/ROADMAP.md` | Modify | Mark Sprint 2 In Progress (PR #1 of 3) when first branch opens |

---

## PR 1 of 3 — `feat/s2-types`

**Opens:** when Task 1 is committed.
**Contains:** `types.ts` + `types.test.ts` (2 files).

### Task 1: Type Definitions

**Files:**
- Create: `packages/level-engine/src/types.ts`
- Create: `packages/level-engine/src/__tests__/types.test.ts`
- Modify: `docs/ROADMAP.md` (in same commit as first code change)

- [ ] **Step 1: Create the feature branch and update ROADMAP**

  ```bash
  git checkout master
  git checkout -b feat/s2-types
  ```

  Edit `docs/ROADMAP.md` — change Sprint 2 row from `⏳ Todo | —` to `🚧 In Progress (PR #1)`.

- [ ] **Step 2: Write the failing test**

  Create `packages/level-engine/src/__tests__/types.test.ts`:

  ```typescript
  import type {
    EntityType,
    EntityPlacement,
    GridPattern,
    LevelDefinition,
    LevelParams,
    LevelRequest,
    PlayerStats,
    CalibratorStrategy,
    ILevelEngine,
  } from '../types'

  describe('types', () => {
    it('LevelRequest accepts story mode shape', () => {
      const req: LevelRequest = { mode: 'story', levelIndex: 0, totalLevels: 20 }
      expect(req.mode).toBe('story')
      expect(req.levelIndex).toBe(0)
    })

    it('LevelRequest accepts survival mode with PlayerStats', () => {
      const stats: PlayerStats = {
        level: 3,
        killsThisSession: 10,
        deathsThisSession: 1,
        averageSurvivalTime: 45,
      }
      const req: LevelRequest = { mode: 'survival', playerStats: stats, currentScore: 500 }
      expect(req.mode).toBe('survival')
      expect(req.playerStats?.level).toBe(3)
    })

    it('EntityType has required fields', () => {
      const type: EntityType = {
        id: 'enemy-classic',
        label: 'Classic Enemy',
        icon: '👾',
        properties: { pointValue: 10 },
      }
      expect(type.id).toBe('enemy-classic')
    })

    it('EntityPlacement references an entity type by id', () => {
      const placement: EntityPlacement = { entityTypeId: 'enemy-classic', x: 2, y: 3 }
      expect(placement.entityTypeId).toBe('enemy-classic')
    })

    it('LevelDefinition has all required fields', () => {
      const params: LevelParams = {
        numberOfEnemies: 5,
        enemySpeed: 2,
        enemyShotDelay: 2.0,
        enemyShotSpeed: 4,
        enemyAngerDelay: 20,
        enemySpawnDelay: 1,
        hasPowerUps: true,
        powerUpMinWait: 5,
        powerUpMaxWait: 15,
      }
      const def: LevelDefinition = {
        id: 'story-0',
        style: 'classic',
        difficultyScore: 0,
        entities: [],
        params,
      }
      expect(def.style).toBe('classic')
      expect(def.difficultyScore).toBe(0)
    })
  })
  ```

- [ ] **Step 3: Run test — confirm it FAILS**

  ```bash
  cd packages/level-engine && npx jest --testPathPattern="types.test" --no-coverage
  ```

  Expected: FAIL — `Cannot find module '../types'`

- [ ] **Step 4: Create `packages/level-engine/src/types.ts`**

  ```typescript
  export type GridPattern = 'grid' | 'diamond' | 'chevron' | 'random'

  export interface Sprite {
    source: string
    width: number
    height: number
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
  }

  export interface LevelDefinition {
    id: string
    style: 'classic' | 'freeRoam' | 'mixed'
    difficultyScore: number
    entities: EntityPlacement[]
    params: LevelParams
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
  ```

- [ ] **Step 5: Run test — confirm it PASSES**

  ```bash
  cd packages/level-engine && npx jest --testPathPattern="types.test" --no-coverage
  ```

  Expected: PASS — 5 tests passing.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/level-engine/src/types.ts \
          packages/level-engine/src/__tests__/types.test.ts \
          docs/ROADMAP.md
  git commit -m "[ENGINE] feat(s2): add LevelEngine type definitions"
  ```

---

## PR 2 of 3 — `feat/s2-core`

**Opens:** after PR 1 merges into `master`.
**Contains:** `difficulty.ts`, `EntityRegistry.ts`, `CurveCalibratorStrategy.ts` + 3 test files (6 files).

### Task 2: Difficulty Score Helper

**Files:**
- Create: `packages/level-engine/src/difficulty.ts`
- Create: `packages/level-engine/src/__tests__/difficulty.test.ts`

- [ ] **Step 1: Create the feature branch**

  ```bash
  git checkout master
  git pull
  git checkout -b feat/s2-core
  ```

- [ ] **Step 2: Write the failing test**

  Create `packages/level-engine/src/__tests__/difficulty.test.ts`:

  ```typescript
  import { computeDifficultyScore } from '../difficulty'
  import type { LevelRequest } from '../types'

  describe('computeDifficultyScore', () => {
    describe('story mode', () => {
      it('returns 0 for the first level (index 0 of 20)', () => {
        const req: LevelRequest = { mode: 'story', levelIndex: 0, totalLevels: 20 }
        expect(computeDifficultyScore(req)).toBe(0)
      })

      it('returns 100 for the last level (index 19 of 20)', () => {
        const req: LevelRequest = { mode: 'story', levelIndex: 19, totalLevels: 20 }
        expect(computeDifficultyScore(req)).toBe(100)
      })

      it('returns ~47.37 for level 9 of 20', () => {
        const req: LevelRequest = { mode: 'story', levelIndex: 9, totalLevels: 20 }
        expect(computeDifficultyScore(req)).toBeCloseTo(47.37, 1)
      })

      it('returns 100 when totalLevels is 1 (edge case)', () => {
        const req: LevelRequest = { mode: 'story', levelIndex: 0, totalLevels: 1 }
        expect(computeDifficultyScore(req)).toBe(100)
      })

      it('throws when levelIndex is missing', () => {
        const req: LevelRequest = { mode: 'story', totalLevels: 20 }
        expect(() => computeDifficultyScore(req)).toThrow(
          'levelIndex and totalLevels are required for story mode',
        )
      })

      it('throws when totalLevels is missing', () => {
        const req: LevelRequest = { mode: 'story', levelIndex: 5 }
        expect(() => computeDifficultyScore(req)).toThrow(
          'levelIndex and totalLevels are required for story mode',
        )
      })
    })

    describe('survival mode', () => {
      it('returns 50 when no playerStats are provided', () => {
        const req: LevelRequest = { mode: 'survival' }
        expect(computeDifficultyScore(req)).toBe(50)
      })

      it('returns 100 for a high-performing player (max kills, no deaths, max survival)', () => {
        const req: LevelRequest = {
          mode: 'survival',
          playerStats: {
            level: 5,
            killsThisSession: 100,
            deathsThisSession: 0,
            averageSurvivalTime: 120,
          },
        }
        expect(computeDifficultyScore(req)).toBe(100)
      })

      it('returns a low score for a struggling player (few kills, many deaths, short survival)', () => {
        const req: LevelRequest = {
          mode: 'survival',
          playerStats: {
            level: 1,
            killsThisSession: 2,
            deathsThisSession: 10,
            averageSurvivalTime: 5,
          },
        }
        // kd=0.2, kdScore=min(1,100)=1; timeScore=min(4.17,100)=4.17; score=(1+4.17)/2≈2.58
        expect(computeDifficultyScore(req)).toBeCloseTo(2.58, 1)
      })

      it('clamps score to [0, 100]', () => {
        const req: LevelRequest = {
          mode: 'survival',
          playerStats: {
            level: 99,
            killsThisSession: 99999,
            deathsThisSession: 0,
            averageSurvivalTime: 99999,
          },
        }
        expect(computeDifficultyScore(req)).toBe(100)
      })
    })
  })
  ```

- [ ] **Step 3: Run test — confirm it FAILS**

  ```bash
  cd packages/level-engine && npx jest --testPathPattern="difficulty.test" --no-coverage
  ```

  Expected: FAIL — `Cannot find module '../difficulty'`

- [ ] **Step 4: Create `packages/level-engine/src/difficulty.ts`**

  ```typescript
  import type { LevelRequest } from './types'

  /**
   * Converts a LevelRequest into a difficulty score in [0, 100].
   * This is the single source of truth for difficulty scaling.
   *
   * Story mode:  score = (levelIndex / (totalLevels - 1)) * 100
   * Survival:    score derived from kill/death ratio and average survival time
   */
  export function computeDifficultyScore(request: LevelRequest): number {
    if (request.mode === 'story') {
      if (request.levelIndex == null || request.totalLevels == null) {
        throw new Error('levelIndex and totalLevels are required for story mode')
      }
      if (request.totalLevels <= 1) return 100
      return (request.levelIndex / (request.totalLevels - 1)) * 100
    }

    // survival
    if (!request.playerStats) return 50

    const { killsThisSession, deathsThisSession, averageSurvivalTime } = request.playerStats

    const kd =
      deathsThisSession === 0 ? killsThisSession : killsThisSession / deathsThisSession
    const kdScore = Math.min(kd * 5, 100)
    const timeScore = Math.min((averageSurvivalTime / 120) * 100, 100)

    return Math.min((kdScore + timeScore) / 2, 100)
  }
  ```

- [ ] **Step 5: Run test — confirm it PASSES**

  ```bash
  cd packages/level-engine && npx jest --testPathPattern="difficulty.test" --no-coverage
  ```

  Expected: PASS — 8 tests passing.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/level-engine/src/difficulty.ts \
          packages/level-engine/src/__tests__/difficulty.test.ts
  git commit -m "[ENGINE] feat(s2): add computeDifficultyScore helper"
  ```

---

### Task 3: EntityRegistry

**Files:**
- Create: `packages/level-engine/src/registry/EntityRegistry.ts`
- Create: `packages/level-engine/src/__tests__/EntityRegistry.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `packages/level-engine/src/__tests__/EntityRegistry.test.ts`:

  ```typescript
  import { EntityRegistry } from '../registry/EntityRegistry'
  import type { EntityType } from '../types'

  describe('EntityRegistry', () => {
    let registry: EntityRegistry

    beforeEach(() => {
      registry = new EntityRegistry()
    })

    it('registers an entity type and retrieves it by id', () => {
      const type: EntityType = {
        id: 'enemy-classic',
        label: 'Classic Enemy',
        icon: '👾',
        properties: { pointValue: 10 },
      }
      registry.register(type)
      expect(registry.get('enemy-classic')).toEqual(type)
    })

    it('returns undefined for an unknown entity type id', () => {
      expect(registry.get('does-not-exist')).toBeUndefined()
    })

    it('returns all registered entity types', () => {
      const typeA: EntityType = { id: 'a', label: 'A', icon: 'A', properties: {} }
      const typeB: EntityType = { id: 'b', label: 'B', icon: 'B', properties: {} }
      registry.register(typeA)
      registry.register(typeB)
      const all = registry.getAll()
      expect(all).toHaveLength(2)
      expect(all).toContainEqual(typeA)
      expect(all).toContainEqual(typeB)
    })

    it('returns an empty array when no entity types are registered', () => {
      expect(registry.getAll()).toEqual([])
    })

    it('throws when registering a duplicate id', () => {
      const type: EntityType = { id: 'dup', label: 'Dup', icon: 'D', properties: {} }
      registry.register(type)
      expect(() => registry.register(type)).toThrow('Entity type "dup" is already registered')
    })
  })
  ```

- [ ] **Step 2: Run test — confirm it FAILS**

  ```bash
  cd packages/level-engine && npx jest --testPathPattern="EntityRegistry.test" --no-coverage
  ```

  Expected: FAIL — `Cannot find module '../registry/EntityRegistry'`

- [ ] **Step 3: Create `packages/level-engine/src/registry/EntityRegistry.ts`**

  ```typescript
  import type { EntityType } from '../types'

  export class EntityRegistry {
    private readonly types = new Map<string, EntityType>()

    register(type: EntityType): void {
      if (this.types.has(type.id)) {
        throw new Error(`Entity type "${type.id}" is already registered`)
      }
      this.types.set(type.id, type)
    }

    get(id: string): EntityType | undefined {
      return this.types.get(id)
    }

    getAll(): EntityType[] {
      return Array.from(this.types.values())
    }
  }
  ```

- [ ] **Step 4: Run test — confirm it PASSES**

  ```bash
  cd packages/level-engine && npx jest --testPathPattern="EntityRegistry.test" --no-coverage
  ```

  Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

  ```bash
  git add packages/level-engine/src/registry/EntityRegistry.ts \
          packages/level-engine/src/__tests__/EntityRegistry.test.ts
  git commit -m "[ENGINE] feat(s2): add EntityRegistry with duplicate guard"
  ```

---

### Task 4: CurveCalibratorStrategy

**Files:**
- Create: `packages/level-engine/src/strategies/CurveCalibratorStrategy.ts`
- Create: `packages/level-engine/src/__tests__/CurveCalibratorStrategy.test.ts`

**Parameter ranges used by the curve:**

| Param | MIN (score=0) | MAX (score=100) |
|-------|--------------|----------------|
| numberOfEnemies | 3 | 20 |
| enemySpeed | 1 | 5 |
| enemyShotDelay | 3.0 | 0.5 |
| enemyShotSpeed | 2 | 8 |
| enemyAngerDelay | 30 | 5 |
| enemySpawnDelay | 2 | 0.3 |
| hasPowerUps | true (t < 0.8) | false (t ≥ 0.8) |
| powerUpMinWait | 5 | 15 |
| powerUpMaxWait | 15 | 30 |

Note: `enemyShotDelay` and `enemyAngerDelay` **decrease** as difficulty increases (min value = easy, max = hard for delay fields is intentionally reversed in lerp).

- [ ] **Step 1: Write the failing test**

  Create `packages/level-engine/src/__tests__/CurveCalibratorStrategy.test.ts`:

  ```typescript
  import { CurveCalibratorStrategy } from '../strategies/CurveCalibratorStrategy'
  import type { LevelRequest } from '../types'

  describe('CurveCalibratorStrategy', () => {
    const strategy = new CurveCalibratorStrategy()

    describe('story mode — minimum difficulty (level 0 of 20)', () => {
      const req: LevelRequest = { mode: 'story', levelIndex: 0, totalLevels: 20 }

      it('returns minimum numberOfEnemies', () => {
        expect(strategy.calibrate(req).numberOfEnemies).toBe(3)
      })

      it('returns minimum enemySpeed', () => {
        expect(strategy.calibrate(req).enemySpeed).toBeCloseTo(1)
      })

      it('returns maximum enemyShotDelay (easy — long pause between shots)', () => {
        expect(strategy.calibrate(req).enemyShotDelay).toBeCloseTo(3.0)
      })

      it('has powerUps enabled', () => {
        expect(strategy.calibrate(req).hasPowerUps).toBe(true)
      })
    })

    describe('story mode — maximum difficulty (level 19 of 20)', () => {
      const req: LevelRequest = { mode: 'story', levelIndex: 19, totalLevels: 20 }

      it('returns maximum numberOfEnemies', () => {
        expect(strategy.calibrate(req).numberOfEnemies).toBe(20)
      })

      it('returns maximum enemySpeed', () => {
        expect(strategy.calibrate(req).enemySpeed).toBeCloseTo(5)
      })

      it('returns minimum enemyShotDelay (hard — fast shots)', () => {
        expect(strategy.calibrate(req).enemyShotDelay).toBeCloseTo(0.5)
      })

      it('has powerUps disabled', () => {
        expect(strategy.calibrate(req).hasPowerUps).toBe(false)
      })
    })

    describe('story mode — midpoint (level 9 of 20, score ≈ 47.4)', () => {
      const req: LevelRequest = { mode: 'story', levelIndex: 9, totalLevels: 20 }

      it('returns numberOfEnemies between 3 and 20', () => {
        const { numberOfEnemies } = strategy.calibrate(req)
        expect(numberOfEnemies).toBeGreaterThan(3)
        expect(numberOfEnemies).toBeLessThan(20)
      })
    })

    describe('story mode — missing fields', () => {
      it('throws when levelIndex is missing', () => {
        const req: LevelRequest = { mode: 'story', totalLevels: 20 }
        expect(() => strategy.calibrate(req)).toThrow(
          'levelIndex and totalLevels are required for story mode',
        )
      })
    })

    describe('survival mode — no player stats (score = 50)', () => {
      const req: LevelRequest = { mode: 'survival' }

      it('returns 12 enemies at score 50 (lerp(3,20,0.5) = 11.5 → rounds to 12)', () => {
        expect(strategy.calibrate(req).numberOfEnemies).toBe(12)
      })

      it('has powerUps enabled at score 50', () => {
        expect(strategy.calibrate(req).hasPowerUps).toBe(true)
      })
    })

    describe('survival mode — player performance affects difficulty', () => {
      it('gives more enemies to a high-performing player', () => {
        const normalReq: LevelRequest = { mode: 'survival' }
        const hardReq: LevelRequest = {
          mode: 'survival',
          playerStats: {
            level: 5,
            killsThisSession: 100,
            deathsThisSession: 0,
            averageSurvivalTime: 120,
          },
        }
        const normalParams = strategy.calibrate(normalReq)
        const hardParams = strategy.calibrate(hardReq)
        expect(hardParams.numberOfEnemies).toBeGreaterThan(normalParams.numberOfEnemies)
      })

      it('gives fewer enemies to a struggling player', () => {
        const normalReq: LevelRequest = { mode: 'survival' }
        const easyReq: LevelRequest = {
          mode: 'survival',
          playerStats: {
            level: 1,
            killsThisSession: 2,
            deathsThisSession: 10,
            averageSurvivalTime: 5,
          },
        }
        const normalParams = strategy.calibrate(normalReq)
        const easyParams = strategy.calibrate(easyReq)
        expect(easyParams.numberOfEnemies).toBeLessThan(normalParams.numberOfEnemies)
      })
    })
  })
  ```

- [ ] **Step 2: Run test — confirm it FAILS**

  ```bash
  cd packages/level-engine && npx jest --testPathPattern="CurveCalibratorStrategy.test" --no-coverage
  ```

  Expected: FAIL — `Cannot find module '../strategies/CurveCalibratorStrategy'`

- [ ] **Step 3: Create `packages/level-engine/src/strategies/CurveCalibratorStrategy.ts`**

  ```typescript
  import { computeDifficultyScore } from '../difficulty'
  import type { CalibratorStrategy, LevelParams, LevelRequest } from '../types'

  const MIN: LevelParams = {
    numberOfEnemies: 3,
    enemySpeed: 1,
    enemyShotDelay: 3.0,
    enemyShotSpeed: 2,
    enemyAngerDelay: 30,
    enemySpawnDelay: 2,
    hasPowerUps: true,
    powerUpMinWait: 5,
    powerUpMaxWait: 15,
  }

  const MAX: LevelParams = {
    numberOfEnemies: 20,
    enemySpeed: 5,
    enemyShotDelay: 0.5,
    enemyShotSpeed: 8,
    enemyAngerDelay: 5,
    enemySpawnDelay: 0.3,
    hasPowerUps: false,
    powerUpMinWait: 15,
    powerUpMaxWait: 30,
  }

  function lerp(a: number, b: number, t: number): number {
    const clamped = Math.min(Math.max(t, 0), 1)
    return a + (b - a) * clamped
  }

  export class CurveCalibratorStrategy implements CalibratorStrategy {
    calibrate(request: LevelRequest): LevelParams {
      const score = computeDifficultyScore(request)
      const t = score / 100

      return {
        numberOfEnemies: Math.round(lerp(MIN.numberOfEnemies, MAX.numberOfEnemies, t)),
        enemySpeed: lerp(MIN.enemySpeed, MAX.enemySpeed, t),
        enemyShotDelay: lerp(MIN.enemyShotDelay, MAX.enemyShotDelay, t),
        enemyShotSpeed: lerp(MIN.enemyShotSpeed, MAX.enemyShotSpeed, t),
        enemyAngerDelay: lerp(MIN.enemyAngerDelay, MAX.enemyAngerDelay, t),
        enemySpawnDelay: lerp(MIN.enemySpawnDelay, MAX.enemySpawnDelay, t),
        hasPowerUps: t < 0.8,
        powerUpMinWait: Math.round(lerp(MIN.powerUpMinWait, MAX.powerUpMinWait, t)),
        powerUpMaxWait: Math.round(lerp(MIN.powerUpMaxWait, MAX.powerUpMaxWait, t)),
      }
    }
  }
  ```

- [ ] **Step 4: Run test — confirm it PASSES**

  ```bash
  cd packages/level-engine && npx jest --testPathPattern="CurveCalibratorStrategy.test" --no-coverage
  ```

  Expected: PASS — 11 tests passing.

- [ ] **Step 5: Run full package test suite — all green**

  ```bash
  cd packages/level-engine && npx jest --no-coverage
  ```

  Expected: PASS — smoke + types + difficulty + EntityRegistry + CurveCalibratorStrategy all passing.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/level-engine/src/strategies/CurveCalibratorStrategy.ts \
          packages/level-engine/src/__tests__/CurveCalibratorStrategy.test.ts
  git commit -m "[ENGINE] feat(s2): add CurveCalibratorStrategy with linear difficulty curve"
  ```

---

## PR 3 of 3 — `feat/s2-engine`

**Opens:** after PR 2 merges into `master`.
**Contains:** `LevelEngine.ts`, `LevelEngine.test.ts`, updated `index.ts`, updated `ROADMAP.md` (4 files).

### Task 5: LevelEngine

**Files:**
- Create: `packages/level-engine/src/LevelEngine.ts`
- Create: `packages/level-engine/src/__tests__/LevelEngine.test.ts`

- [ ] **Step 1: Create the feature branch**

  ```bash
  git checkout master
  git pull
  git checkout -b feat/s2-engine
  ```

- [ ] **Step 2: Write the failing test**

  Create `packages/level-engine/src/__tests__/LevelEngine.test.ts`:

  ```typescript
  import { LevelEngine } from '../LevelEngine'
  import { CurveCalibratorStrategy } from '../strategies/CurveCalibratorStrategy'
  import type { CalibratorStrategy, EntityType, LevelDefinition, LevelParams, LevelRequest } from '../types'

  const MOCK_PARAMS: LevelParams = {
    numberOfEnemies: 99,
    enemySpeed: 10,
    enemyShotDelay: 0.1,
    enemyShotSpeed: 10,
    enemyAngerDelay: 1,
    enemySpawnDelay: 0.1,
    hasPowerUps: false,
    powerUpMinWait: 1,
    powerUpMaxWait: 2,
  }

  describe('LevelEngine', () => {
    let engine: LevelEngine

    beforeEach(() => {
      engine = new LevelEngine(new CurveCalibratorStrategy())
    })

    // ── registerEntityType ────────────────────────────────────────────────
    describe('registerEntityType', () => {
      it('registers an entity type without throwing', () => {
        const type: EntityType = { id: 'enemy-classic', label: 'Classic Enemy', icon: '👾', properties: {} }
        expect(() => engine.registerEntityType(type)).not.toThrow()
      })

      it('throws when registering the same id twice', () => {
        const type: EntityType = { id: 'dup', label: 'Dup', icon: 'D', properties: {} }
        engine.registerEntityType(type)
        expect(() => engine.registerEntityType(type)).toThrow('Entity type "dup" is already registered')
      })
    })

    // ── generate — story mode ────────────────────────────────────────────
    describe('generate — story mode', () => {
      it('returns a LevelDefinition with all required fields', () => {
        const req: LevelRequest = { mode: 'story', levelIndex: 0, totalLevels: 20 }
        const level = engine.generate(req)
        expect(level.id).toBeDefined()
        expect(['classic', 'freeRoam', 'mixed']).toContain(level.style)
        expect(level.difficultyScore).toBeGreaterThanOrEqual(0)
        expect(level.difficultyScore).toBeLessThanOrEqual(100)
        expect(level.entities).toEqual([])
        expect(level.params).toBeDefined()
      })

      it('generates id "story-0" for levelIndex 0', () => {
        const level = engine.generate({ mode: 'story', levelIndex: 0, totalLevels: 20 })
        expect(level.id).toBe('story-0')
      })

      it('assigns "classic" style to levels 1–6 (index 0–5)', () => {
        for (let i = 0; i <= 5; i++) {
          const level = engine.generate({ mode: 'story', levelIndex: i, totalLevels: 20 })
          expect(level.style).toBe('classic')
        }
      })

      it('assigns "mixed" style to levels 7–12 (index 6–11)', () => {
        for (let i = 6; i <= 11; i++) {
          const level = engine.generate({ mode: 'story', levelIndex: i, totalLevels: 20 })
          expect(level.style).toBe('mixed')
        }
      })

      it('assigns "freeRoam" style to levels 13–18 (index 12–17)', () => {
        for (let i = 12; i <= 17; i++) {
          const level = engine.generate({ mode: 'story', levelIndex: i, totalLevels: 20 })
          expect(level.style).toBe('freeRoam')
        }
      })

      it('assigns "mixed" style to levels 19–20 (index 18–19)', () => {
        for (let i = 18; i <= 19; i++) {
          const level = engine.generate({ mode: 'story', levelIndex: i, totalLevels: 20 })
          expect(level.style).toBe('mixed')
        }
      })

      it('difficultyScore is 0 for level 0 and 100 for level 19', () => {
        const first = engine.generate({ mode: 'story', levelIndex: 0, totalLevels: 20 })
        const last = engine.generate({ mode: 'story', levelIndex: 19, totalLevels: 20 })
        expect(first.difficultyScore).toBe(0)
        expect(last.difficultyScore).toBe(100)
      })

      it('difficultyScore increases monotonically across story levels', () => {
        const scores = Array.from({ length: 20 }, (_, i) =>
          engine.generate({ mode: 'story', levelIndex: i, totalLevels: 20 }).difficultyScore,
        )
        for (let i = 1; i < scores.length; i++) {
          expect(scores[i]).toBeGreaterThan(scores[i - 1])
        }
      })
    })

    // ── generate — survival mode ─────────────────────────────────────────
    describe('generate — survival mode', () => {
      it('returns a LevelDefinition with a valid style', () => {
        const level = engine.generate({ mode: 'survival' })
        expect(['classic', 'freeRoam', 'mixed']).toContain(level.style)
      })

      it('returns difficultyScore of 50 with no player stats', () => {
        const level = engine.generate({ mode: 'survival' })
        expect(level.difficultyScore).toBe(50)
      })

      it('id starts with "survival-"', () => {
        const level = engine.generate({ mode: 'survival' })
        expect(level.id.startsWith('survival-')).toBe(true)
      })
    })

    // ── setCalibrator ────────────────────────────────────────────────────
    describe('setCalibrator', () => {
      it('replaces the active calibration strategy', () => {
        const mockStrategy: CalibratorStrategy = {
          calibrate: jest.fn().mockReturnValue(MOCK_PARAMS),
        }
        engine.setCalibrator(mockStrategy)
        const level = engine.generate({ mode: 'story', levelIndex: 0, totalLevels: 20 })
        expect(mockStrategy.calibrate).toHaveBeenCalledTimes(1)
        expect(level.params.numberOfEnemies).toBe(99)
      })
    })
  })
  ```

- [ ] **Step 3: Run test — confirm it FAILS**

  ```bash
  cd packages/level-engine && npx jest --testPathPattern="LevelEngine.test" --no-coverage
  ```

  Expected: FAIL — `Cannot find module '../LevelEngine'`

- [ ] **Step 4: Create `packages/level-engine/src/LevelEngine.ts`**

  ```typescript
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
  ```

- [ ] **Step 5: Run test — confirm it PASSES**

  ```bash
  cd packages/level-engine && npx jest --testPathPattern="LevelEngine.test" --no-coverage
  ```

  Expected: PASS — all tests passing.

- [ ] **Step 6: Commit**

  ```bash
  git add packages/level-engine/src/LevelEngine.ts \
          packages/level-engine/src/__tests__/LevelEngine.test.ts
  git commit -m "[ENGINE] feat(s2): add LevelEngine — generate(), setCalibrator(), registerEntityType()"
  ```

---

### Task 6: Barrel Exports + Final Verification

**Files:**
- Modify: `packages/level-engine/src/index.ts`
- Modify: `docs/ROADMAP.md`

- [ ] **Step 1: Update `packages/level-engine/src/index.ts`**

  Replace the entire file with:

  ```typescript
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
  } from './types'

  export { computeDifficultyScore } from './difficulty'
  export { EntityRegistry } from './registry/EntityRegistry'
  export { CurveCalibratorStrategy } from './strategies/CurveCalibratorStrategy'
  export { LevelEngine } from './LevelEngine'
  ```

- [ ] **Step 2: Run the full package test suite**

  ```bash
  cd packages/level-engine && npx jest --no-coverage
  ```

  Expected: PASS — all tests (smoke + types + difficulty + EntityRegistry + CurveCalibratorStrategy + LevelEngine) passing.

- [ ] **Step 3: Run coverage to verify ≥ 80%**

  ```bash
  cd packages/level-engine && npx jest --coverage
  ```

  Expected: Each file in `src/` (excluding `index.ts`) at ≥ 80% line coverage.

- [ ] **Step 4: Run full monorepo build — zero TS errors**

  ```bash
  cd /path/to/space-invaders && npm run build
  ```

  Expected: No TypeScript errors.

- [ ] **Step 5: Run full monorepo test — all green**

  ```bash
  npm test
  ```

  Expected: All packages green (level-engine + monetization-plugin + analytics-plugin smoke tests).

- [ ] **Step 6: Update ROADMAP**

  In `docs/ROADMAP.md`, update Sprint 2 row status from `🚧 In Progress (PR #1)` to `✅ Done (PR #3)`.

- [ ] **Step 7: Commit**

  ```bash
  git add packages/level-engine/src/index.ts \
          docs/ROADMAP.md
  git commit -m "[ENGINE] feat(s2): export public API + mark Sprint 2 done in ROADMAP"
  ```

---

## Summary

| PR | Branch | Files | Key Output |
|----|--------|-------|------------|
| #1 | `feat/s2-types` | types.ts + test + ROADMAP | All shared interfaces |
| #2 | `feat/s2-core` | difficulty.ts, EntityRegistry.ts, CurveCalibratorStrategy.ts + 3 tests | Score helper + registry + calibrator |
| #3 | `feat/s2-engine` | LevelEngine.ts + test + index.ts + ROADMAP | Full public API, ready for Sprint 3 |

After Sprint 2, `@si/level-engine` exposes:
- `LevelEngine` — main class, accepts any `CalibratorStrategy`
- `CurveCalibratorStrategy` — MVP, deterministic linear curve
- `EntityRegistry` — standalone registry (also used internally by LevelEngine)
- `computeDifficultyScore` — utility for calibrator or analytics
- All types: `LevelRequest`, `LevelDefinition`, `LevelParams`, `EntityType`, etc.
