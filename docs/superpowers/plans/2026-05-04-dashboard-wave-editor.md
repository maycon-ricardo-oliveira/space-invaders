# Dashboard Wave Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a unified dashboard in `apps/calibrator` (Next.js 15) for editing World → Phase → Level → Wave content, backed by a local PostgreSQL database via Docker, Prisma ORM, and a Zod-validated service layer, with an Export button that writes `levels.json` for the game.

**Architecture:** React Components → Services (pure TS + Zod) → Server Actions (thin wrappers) → Prisma → PostgreSQL (Docker). Services are pure TypeScript, testable with Jest without a real DB using Prisma mocks. UI is split into Sidebar (navigation), WaveChipBar (wave selection), WaveStatsPanel (stats + sliders), and WaveEditor (interactive grid).

**Tech Stack:** Next.js 15, Prisma 5, PostgreSQL 16, Zod 3, React 19, @testing-library/react, Jest 29

**Spec:** `docs/superpowers/specs/2026-05-04-dashboard-wave-editor-design.md`

---

## Phase 1 — Backend

### Task 1: Docker + Prisma infrastructure

**Files:**
- Create: `apps/calibrator/docker-compose.yml`
- Create: `apps/calibrator/.env.example`
- Create: `apps/calibrator/prisma/schema.prisma`
- Create: `apps/calibrator/src/lib/prisma.ts`
- Modify: `apps/calibrator/package.json`

- [ ] **Step 1: Create docker-compose.yml**

```yaml
# apps/calibrator/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: si_user
      POSTGRES_PASSWORD: si_password
      POSTGRES_DB: si_calibrator
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

- [ ] **Step 2: Create .env.example and .env**

```bash
# apps/calibrator/.env.example
DATABASE_URL="postgresql://si_user:si_password@localhost:5432/si_calibrator"
```

Copy `.env.example` to `.env` (do not commit `.env`).

Verify `.gitignore` at repo root contains `.env`. If not, add it.

- [ ] **Step 3: Install dependencies**

From `apps/calibrator/`:
```bash
npm install prisma @prisma/client zod
```

Add to `package.json` `scripts`:
```json
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:seed": "ts-node --project tsconfig.json prisma/seed.ts",
"db:studio": "prisma studio"
```

- [ ] **Step 4: Create prisma/schema.prisma**

```prisma
// apps/calibrator/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model World {
  id            Int      @id @default(autoincrement())
  name          String
  index         Int      @unique
  image         String?
  parallaxTheme String?  @default("space")

  phases        Phase[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Phase {
  id        Int      @id @default(autoincrement())
  worldId   Int
  world     World    @relation(fields: [worldId], references: [id], onDelete: Cascade)
  name      String
  index     Int

  levels    Level[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([worldId, index])
}

model Level {
  id              Int      @id @default(autoincrement())
  phaseId         Int
  phase           Phase    @relation(fields: [phaseId], references: [id], onDelete: Cascade)
  name            String
  index           Int

  enemySpeed      Float    @default(2.0)
  shotDelay       Float    @default(1.5)
  fuelDrain       Float    @default(8.0)
  enemyShotSpeed  Float    @default(4.0)
  enemyAngerDelay Float    @default(15.0)
  enemySpawnDelay Float    @default(1.0)
  hasPowerUps     Boolean  @default(true)
  parallaxTheme   String?

  waves           Wave[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([phaseId, index])
}

model Wave {
  id        Int      @id @default(autoincrement())
  levelId   Int
  level     Level    @relation(fields: [levelId], references: [id], onDelete: Cascade)
  order     Int
  delay     Float    @default(3.0)
  grid      Json

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([levelId, order])
}

model Pattern {
  id        Int      @id @default(autoincrement())
  name      String
  grid      Json

  createdAt DateTime @default(now())
}
```

- [ ] **Step 5: Create src/lib/prisma.ts**

```typescript
// apps/calibrator/src/lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

- [ ] **Step 6: Start Docker and run migration**

```bash
cd apps/calibrator
docker compose up -d
npx prisma generate
npx prisma migrate dev --name init
```

Expected: migration applied, `prisma/migrations/` directory created, Prisma Client generated in `node_modules/.prisma/client`.

- [ ] **Step 7: Commit**

```bash
git add apps/calibrator/docker-compose.yml apps/calibrator/.env.example \
        apps/calibrator/prisma/ apps/calibrator/src/lib/prisma.ts \
        apps/calibrator/package.json
git commit -m "[CAL] chore(s7): add Docker + Prisma infrastructure with World→Wave schema"
```

---

### Task 2: Zod schemas

**Files:**
- Create: `apps/calibrator/src/lib/schemas.ts`
- Create: `apps/calibrator/src/__tests__/schemas.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/calibrator/src/__tests__/schemas.test.ts
/**
 * @jest-environment node
 */
import {
  EntityTypeSchema,
  GridSchema,
  LevelParamsSchema,
  WaveInputSchema,
  PatternInputSchema,
  WorldInputSchema,
  PhaseInputSchema,
  LevelInputSchema,
} from '../lib/schemas'

describe('EntityTypeSchema', () => {
  it('accepts valid entity types', () => {
    expect(EntityTypeSchema.parse('grunt')).toBe('grunt')
    expect(EntityTypeSchema.parse('rocket')).toBe('rocket')
    expect(EntityTypeSchema.parse('shield')).toBe('shield')
    expect(EntityTypeSchema.parse('rock')).toBe('rock')
  })
  it('rejects unknown entity type', () => {
    expect(() => EntityTypeSchema.parse('boss')).toThrow()
  })
})

describe('GridSchema', () => {
  it('accepts a valid 12-column grid with nulls', () => {
    const grid = [
      ['grunt', null, null, 'grunt', null, null, null, null, null, null, null, null],
      Array(12).fill(null),
    ]
    expect(() => GridSchema.parse(grid)).not.toThrow()
  })
  it('rejects invalid entity type in grid', () => {
    const grid = [['boss', null, null, null, null, null, null, null, null, null, null, null]]
    expect(() => GridSchema.parse(grid)).toThrow()
  })
})

describe('LevelParamsSchema', () => {
  it('accepts valid params', () => {
    const params = {
      enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0,
      enemySpawnDelay: 1.0, hasPowerUps: true,
    }
    expect(() => LevelParamsSchema.parse(params)).not.toThrow()
  })
  it('rejects enemySpeed out of range', () => {
    expect(() => LevelParamsSchema.parse({ enemySpeed: 10, shotDelay: 1.5, fuelDrain: 8.0, enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0, hasPowerUps: true })).toThrow()
  })
})

describe('WaveInputSchema', () => {
  it('accepts valid wave input', () => {
    const wave = { order: 1, delay: 3.0, grid: [Array(12).fill(null)] }
    expect(() => WaveInputSchema.parse(wave)).not.toThrow()
  })
  it('rejects order outside 1-10', () => {
    expect(() => WaveInputSchema.parse({ order: 11, delay: 3.0, grid: [] })).toThrow()
  })
})

describe('PatternInputSchema', () => {
  it('rejects empty name', () => {
    expect(() => PatternInputSchema.parse({ name: '', grid: [] })).toThrow()
  })
  it('accepts valid pattern', () => {
    expect(() => PatternInputSchema.parse({ name: 'Linha', grid: [] })).not.toThrow()
  })
})

describe('WorldInputSchema', () => {
  it('accepts valid world', () => {
    expect(() => WorldInputSchema.parse({ name: 'Planeta X', index: 0 })).not.toThrow()
  })
  it('rejects empty name', () => {
    expect(() => WorldInputSchema.parse({ name: '', index: 0 })).toThrow()
  })
})

describe('LevelInputSchema', () => {
  it('accepts valid level input with defaults', () => {
    const level = {
      name: 'Level 1', index: 0,
      enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0,
      enemySpawnDelay: 1.0, hasPowerUps: true,
    }
    expect(() => LevelInputSchema.parse(level)).not.toThrow()
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd apps/calibrator && npx jest src/__tests__/schemas.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module '../lib/schemas'"

- [ ] **Step 3: Implement schemas.ts**

```typescript
// apps/calibrator/src/lib/schemas.ts
import { z } from 'zod'

export const EntityTypeSchema = z.enum(['grunt', 'rocket', 'shield', 'rock'])
export type EntityType = z.infer<typeof EntityTypeSchema>

export const GridSchema = z.array(z.array(EntityTypeSchema.nullable()))
export type Grid = z.infer<typeof GridSchema>

export const LevelParamsSchema = z.object({
  enemySpeed:      z.number().min(1).max(5),
  shotDelay:       z.number().min(0.5).max(3.0),
  fuelDrain:       z.number().min(1).max(20),
  enemyShotSpeed:  z.number().min(2).max(8),
  enemyAngerDelay: z.number().min(5).max(30),
  enemySpawnDelay: z.number().min(0.3).max(2),
  hasPowerUps:     z.boolean(),
})
export type LevelParams = z.infer<typeof LevelParamsSchema>

export const WaveInputSchema = z.object({
  order: z.number().int().min(1).max(10),
  delay: z.number().min(0).max(30),
  grid:  GridSchema,
})
export type WaveInput = z.infer<typeof WaveInputSchema>

export const PatternInputSchema = z.object({
  name: z.string().min(1).max(50),
  grid: GridSchema,
})
export type PatternInput = z.infer<typeof PatternInputSchema>

export const WorldInputSchema = z.object({
  name:          z.string().min(1).max(100),
  index:         z.number().int().min(0),
  image:         z.string().optional(),
  parallaxTheme: z.string().optional(),
})
export type WorldInput = z.infer<typeof WorldInputSchema>

export const PhaseInputSchema = z.object({
  name:  z.string().min(1).max(100),
  index: z.number().int().min(0).max(9),
})
export type PhaseInput = z.infer<typeof PhaseInputSchema>

export const LevelInputSchema = z.object({
  name:  z.string().min(1).max(100),
  index: z.number().int().min(0).max(9),
  ...LevelParamsSchema.shape,
})
export type LevelInput = z.infer<typeof LevelInputSchema>
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd apps/calibrator && npx jest src/__tests__/schemas.test.ts --no-coverage
```

Expected: PASS — 13 tests passing

- [ ] **Step 5: Commit**

```bash
git add apps/calibrator/src/lib/schemas.ts apps/calibrator/src/__tests__/schemas.test.ts
git commit -m "[CAL] test(s7): add Zod schema tests and implement schemas"
```

---

### Task 3: WavePatternGenerator

**Files:**
- Create: `apps/calibrator/src/services/WavePatternGenerator.ts`
- Create: `apps/calibrator/src/__tests__/WavePatternGenerator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/calibrator/src/__tests__/WavePatternGenerator.test.ts
/**
 * @jest-environment node
 */
import { generatePattern, SYSTEM_PATTERNS, PatternType } from '../services/WavePatternGenerator'

const COLS = 12
const ROWS = 4

describe('generatePattern', () => {
  it('line — places N enemies in first row, evenly spaced', () => {
    const grid = generatePattern('line', 'grunt', 4, COLS, ROWS)
    const firstRow = grid[0]
    const placed = firstRow.filter(c => c === 'grunt')
    expect(placed).toHaveLength(4)
    expect(grid[1].every(c => c === null)).toBe(true)
  })

  it('line — fills full row when count >= COLS', () => {
    const grid = generatePattern('line', 'grunt', 12, COLS, ROWS)
    expect(grid[0].every(c => c === 'grunt')).toBe(true)
  })

  it('column — places N enemies in first column', () => {
    const grid = generatePattern('column', 'rocket', 3, COLS, ROWS)
    expect(grid[0][0]).toBe('rocket')
    expect(grid[1][0]).toBe('rocket')
    expect(grid[2][0]).toBe('rocket')
    expect(grid[0][1]).toBeNull()
  })

  it('square — fills M×N rectangle from top-left', () => {
    const grid = generatePattern('square', 'grunt', 6, COLS, ROWS)
    // 6 enemies → 2 rows × 3 cols (or similar rectangle)
    const total = grid.flat().filter(c => c === 'grunt').length
    expect(total).toBe(6)
  })

  it('diagonal — places enemies diagonally', () => {
    const grid = generatePattern('diagonal', 'shield', 4, COLS, ROWS)
    // Each enemy at [i][i*step] — different row and col
    const positions = grid.flatMap((row, r) =>
      row.map((cell, c) => cell !== null ? [r, c] : null).filter(Boolean)
    )
    // All on different rows
    const rows = positions.map(p => (p as number[])[0])
    expect(new Set(rows).size).toBe(rows.length)
  })

  it('v-shape — produces a V pattern with enemies on both sides', () => {
    const grid = generatePattern('v-shape', 'grunt', 6, COLS, ROWS)
    const total = grid.flat().filter(c => c === 'grunt').length
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThanOrEqual(6)
  })

  it('zigzag — alternates between top and bottom rows', () => {
    const grid = generatePattern('zigzag', 'grunt', 6, COLS, ROWS)
    const total = grid.flat().filter(c => c === 'grunt').length
    expect(total).toBe(6)
  })

  it('returns 12-column grid for all patterns', () => {
    const patterns: PatternType[] = ['line', 'column', 'square', 'diagonal', 'v-shape', 'zigzag', 'diamond']
    for (const p of patterns) {
      const grid = generatePattern(p, 'grunt', 4, COLS, ROWS)
      expect(grid.every(row => row.length === COLS)).toBe(true)
    }
  })

  it('SYSTEM_PATTERNS exports all 7 pattern types', () => {
    expect(SYSTEM_PATTERNS).toHaveLength(7)
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/WavePatternGenerator.test.ts --no-coverage
```

Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement WavePatternGenerator.ts**

```typescript
// apps/calibrator/src/services/WavePatternGenerator.ts
import type { EntityType, Grid } from '../lib/schemas'

export type PatternType = 'line' | 'column' | 'square' | 'diagonal' | 'v-shape' | 'zigzag' | 'diamond'

export interface SystemPattern {
  type: PatternType
  label: string
}

export const SYSTEM_PATTERNS: SystemPattern[] = [
  { type: 'line',     label: 'Linha'     },
  { type: 'column',   label: 'Coluna'    },
  { type: 'square',   label: 'Quadrado'  },
  { type: 'diagonal', label: 'Diagonal'  },
  { type: 'v-shape',  label: 'V-Shape'   },
  { type: 'zigzag',   label: 'Zigzag'    },
  { type: 'diamond',  label: 'Diamante'  },
]

function emptyGrid(cols: number, rows: number): Grid {
  return Array.from({ length: rows }, () => Array(cols).fill(null))
}

export function generatePattern(
  type: PatternType,
  entity: EntityType,
  count: number,
  cols: number,
  rows: number,
): Grid {
  const grid = emptyGrid(cols, rows)
  const n = Math.min(count, cols * rows)

  switch (type) {
    case 'line': {
      // Distribute evenly in first row
      const step = n >= cols ? 1 : Math.floor(cols / n)
      let placed = 0
      for (let c = 0; c < cols && placed < n; c += step) {
        grid[0][c] = entity
        placed++
      }
      break
    }
    case 'column': {
      for (let r = 0; r < rows && r < n; r++) {
        grid[r][0] = entity
      }
      break
    }
    case 'square': {
      const cols2 = Math.min(Math.ceil(Math.sqrt(n)), cols)
      const rows2 = Math.min(Math.ceil(n / cols2), rows)
      let placed = 0
      for (let r = 0; r < rows2 && placed < n; r++) {
        for (let c = 0; c < cols2 && placed < n; c++) {
          grid[r][c] = entity
          placed++
        }
      }
      break
    }
    case 'diagonal': {
      const step = Math.max(1, Math.floor(cols / n))
      for (let i = 0; i < n; i++) {
        const r = Math.min(i, rows - 1)
        const c = Math.min(i * step, cols - 1)
        grid[r][c] = entity
      }
      break
    }
    case 'v-shape': {
      const half = Math.ceil(n / 2)
      // Left arm: diagonal top-left to bottom-center
      for (let i = 0; i < half; i++) {
        const r = Math.min(i, rows - 1)
        const c = Math.floor((cols / 2) - 1 - i * (cols / 2 / half))
        if (c >= 0) grid[r][c] = entity
      }
      // Right arm: diagonal top-right to bottom-center
      for (let i = 0; i < n - half; i++) {
        const r = Math.min(i, rows - 1)
        const c = Math.min(Math.ceil((cols / 2) + i * (cols / 2 / half)), cols - 1)
        grid[r][c] = entity
      }
      break
    }
    case 'zigzag': {
      const step = Math.max(1, Math.floor(cols / Math.ceil(n / 2)))
      let placed = 0
      for (let c = 0; c < cols && placed < n; c += step) {
        const r = (Math.floor(c / step) % 2 === 0) ? 0 : Math.min(1, rows - 1)
        grid[r][c] = entity
        placed++
      }
      break
    }
    case 'diamond': {
      // Center diamond: top point, two midpoints, bottom point
      const midRow = Math.floor(rows / 2)
      const midCol = Math.floor(cols / 2)
      const positions: [number, number][] = [
        [0, midCol],
        [midRow, midCol - 2], [midRow, midCol + 2],
        [Math.min(rows - 1, midRow * 2), midCol],
      ]
      for (let i = 0; i < Math.min(n, positions.length); i++) {
        const [r, c] = positions[i]
        if (r < rows && c >= 0 && c < cols) grid[r][c] = entity
      }
      // Fill remaining around diamond
      if (n > positions.length) {
        const extras: [number, number][] = [
          [midRow, midCol - 1], [midRow, midCol + 1],
          [1, midCol - 1], [1, midCol + 1],
        ]
        for (let i = 0; i < n - positions.length && i < extras.length; i++) {
          const [r, c] = extras[i]
          if (r < rows && c >= 0 && c < cols) grid[r][c] = entity
        }
      }
      break
    }
  }

  return grid
}
```

- [ ] **Step 4: Run tests — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/WavePatternGenerator.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/calibrator/src/services/WavePatternGenerator.ts \
        apps/calibrator/src/__tests__/WavePatternGenerator.test.ts
git commit -m "[CAL] feat(s7): add WavePatternGenerator — 7 system patterns"
```

---

### Task 4: WaveScoreCalculator

**Files:**
- Create: `apps/calibrator/src/services/WaveScoreCalculator.ts`
- Create: `apps/calibrator/src/__tests__/WaveScoreCalculator.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/calibrator/src/__tests__/WaveScoreCalculator.test.ts
/**
 * @jest-environment node
 */
import { computeWaveScore } from '../services/WaveScoreCalculator'
import type { Grid } from '../lib/schemas'

describe('computeWaveScore', () => {
  it('returns 0 for an empty grid', () => {
    const grid: Grid = [Array(12).fill(null), Array(12).fill(null)]
    expect(computeWaveScore(grid, 3.0)).toBe(0)
  })

  it('shield enemies score higher than grunts', () => {
    const grunts: Grid = [['grunt', null, null, null, null, null, null, null, null, null, null, null]]
    const shields: Grid = [['shield', null, null, null, null, null, null, null, null, null, null, null]]
    expect(computeWaveScore(shields, 3.0)).toBeGreaterThan(computeWaveScore(grunts, 3.0))
  })

  it('lower delay produces higher score', () => {
    const grid: Grid = [['grunt', 'grunt', null, null, null, null, null, null, null, null, null, null]]
    const scoreHighDelay = computeWaveScore(grid, 6.0)
    const scoreLowDelay = computeWaveScore(grid, 1.0)
    expect(scoreLowDelay).toBeGreaterThan(scoreHighDelay)
  })

  it('more enemies = higher score', () => {
    const few: Grid = [['grunt', null, null, null, null, null, null, null, null, null, null, null]]
    const many: Grid = [['grunt', 'grunt', 'grunt', 'grunt', 'grunt', 'grunt', null, null, null, null, null, null]]
    expect(computeWaveScore(many, 3.0)).toBeGreaterThan(computeWaveScore(few, 3.0))
  })

  it('returns score in range [0, 100]', () => {
    // Max case: all cells filled with shields, delay 0
    const grid: Grid = Array.from({ length: 4 }, () => Array(12).fill('shield'))
    const score = computeWaveScore(grid, 0)
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/WaveScoreCalculator.test.ts --no-coverage
```

- [ ] **Step 3: Implement WaveScoreCalculator.ts**

```typescript
// apps/calibrator/src/services/WaveScoreCalculator.ts
import type { Grid } from '../lib/schemas'

const TYPE_WEIGHT: Record<string, number> = {
  grunt:  1.0,
  rock:   1.5,
  rocket: 2.0,
  shield: 3.0,
}

// Max theoretical score: 12 cols × 4 rows × max weight 3 = 144
const MAX_RAW = 144

// delay → multiplier: 0s = 1.5, 3s = 1.0, 6s+ = 0.8
function delayMultiplier(delay: number): number {
  if (delay <= 0) return 1.5
  if (delay >= 6) return 0.8
  if (delay <= 3) return 1.5 - (delay / 3) * 0.5
  return 1.0 - ((delay - 3) / 3) * 0.2
}

export function computeWaveScore(grid: Grid, delay: number): number {
  let raw = 0
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== null) raw += TYPE_WEIGHT[cell] ?? 1
    }
  }
  if (raw === 0) return 0
  const score = (raw / MAX_RAW) * 100 * delayMultiplier(delay)
  return Math.min(100, Math.round(score))
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/WaveScoreCalculator.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add apps/calibrator/src/services/WaveScoreCalculator.ts \
        apps/calibrator/src/__tests__/WaveScoreCalculator.test.ts
git commit -m "[CAL] feat(s7): add WaveScoreCalculator — composition-based wave score"
```

---

### Task 5: WorldService + PhaseService

**Files:**
- Create: `apps/calibrator/src/services/WorldService.ts`
- Create: `apps/calibrator/src/services/PhaseService.ts`
- Create: `apps/calibrator/src/__tests__/WorldService.test.ts`
- Create: `apps/calibrator/src/__tests__/PhaseService.test.ts`

- [ ] **Step 1: Write failing tests for WorldService**

```typescript
// apps/calibrator/src/__tests__/WorldService.test.ts
/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  default: {
    world: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import prisma from '../lib/prisma'
import { getWorlds, getWorld, createWorld, updateWorld, deleteWorld } from '../services/WorldService'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

beforeEach(() => jest.clearAllMocks())

describe('getWorlds', () => {
  it('returns worlds ordered by index', async () => {
    const worlds = [{ id: 1, name: 'Planet X', index: 0, image: null, parallaxTheme: 'space', phases: [], createdAt: new Date(), updatedAt: new Date() }]
    ;(mockPrisma.world.findMany as jest.Mock).mockResolvedValue(worlds)
    const result = await getWorlds()
    expect(mockPrisma.world.findMany).toHaveBeenCalledWith({ orderBy: { index: 'asc' } })
    expect(result).toEqual(worlds)
  })
})

describe('createWorld', () => {
  it('creates a world with valid input', async () => {
    const input = { name: 'Planet Y', index: 1 }
    const created = { id: 2, ...input, image: null, parallaxTheme: 'space', createdAt: new Date(), updatedAt: new Date() }
    ;(mockPrisma.world.create as jest.Mock).mockResolvedValue(created)
    const result = await createWorld(input)
    expect(mockPrisma.world.create).toHaveBeenCalledWith({ data: input })
    expect(result).toEqual(created)
  })

  it('throws ZodError for empty name', async () => {
    await expect(createWorld({ name: '', index: 0 })).rejects.toThrow()
  })
})

describe('updateWorld', () => {
  it('updates world fields', async () => {
    const updated = { id: 1, name: 'Updated', index: 0, image: null, parallaxTheme: 'space', createdAt: new Date(), updatedAt: new Date() }
    ;(mockPrisma.world.update as jest.Mock).mockResolvedValue(updated)
    const result = await updateWorld(1, { name: 'Updated', index: 0 })
    expect(mockPrisma.world.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Updated', index: 0 } })
    expect(result).toEqual(updated)
  })
})
```

- [ ] **Step 2: Write failing tests for PhaseService**

```typescript
// apps/calibrator/src/__tests__/PhaseService.test.ts
/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  default: {
    phase: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import prisma from '../lib/prisma'
import { getPhases, createPhase, updatePhase, deletePhase } from '../services/PhaseService'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

beforeEach(() => jest.clearAllMocks())

describe('getPhases', () => {
  it('returns phases for a world ordered by index', async () => {
    const phases = [{ id: 1, worldId: 1, name: 'Fase 1', index: 0, createdAt: new Date(), updatedAt: new Date() }]
    ;(mockPrisma.phase.findMany as jest.Mock).mockResolvedValue(phases)
    const result = await getPhases(1)
    expect(mockPrisma.phase.findMany).toHaveBeenCalledWith({
      where: { worldId: 1 },
      orderBy: { index: 'asc' },
    })
    expect(result).toEqual(phases)
  })
})

describe('createPhase', () => {
  it('creates a phase in the given world', async () => {
    const created = { id: 1, worldId: 1, name: 'Fase 1', index: 0, createdAt: new Date(), updatedAt: new Date() }
    ;(mockPrisma.phase.create as jest.Mock).mockResolvedValue(created)
    const result = await createPhase(1, { name: 'Fase 1', index: 0 })
    expect(mockPrisma.phase.create).toHaveBeenCalledWith({ data: { worldId: 1, name: 'Fase 1', index: 0 } })
    expect(result).toEqual(created)
  })
})
```

- [ ] **Step 3: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/WorldService.test.ts src/__tests__/PhaseService.test.ts --no-coverage
```

- [ ] **Step 4: Implement WorldService.ts**

```typescript
// apps/calibrator/src/services/WorldService.ts
import prisma from '../lib/prisma'
import { WorldInputSchema, type WorldInput } from '../lib/schemas'

export async function getWorlds() {
  return prisma.world.findMany({ orderBy: { index: 'asc' } })
}

export async function getWorld(id: number) {
  return prisma.world.findUniqueOrThrow({ where: { id } })
}

export async function createWorld(input: WorldInput) {
  const data = WorldInputSchema.parse(input)
  return prisma.world.create({ data })
}

export async function updateWorld(id: number, input: Partial<WorldInput>) {
  const data = WorldInputSchema.partial().parse(input)
  return prisma.world.update({ where: { id }, data })
}

export async function deleteWorld(id: number) {
  return prisma.world.delete({ where: { id } })
}
```

- [ ] **Step 5: Implement PhaseService.ts**

```typescript
// apps/calibrator/src/services/PhaseService.ts
import prisma from '../lib/prisma'
import { PhaseInputSchema, type PhaseInput } from '../lib/schemas'

export async function getPhases(worldId: number) {
  return prisma.phase.findMany({ where: { worldId }, orderBy: { index: 'asc' } })
}

export async function createPhase(worldId: number, input: PhaseInput) {
  const data = PhaseInputSchema.parse(input)
  return prisma.phase.create({ data: { worldId, ...data } })
}

export async function updatePhase(id: number, input: Partial<PhaseInput>) {
  const data = PhaseInputSchema.partial().parse(input)
  return prisma.phase.update({ where: { id }, data })
}

export async function deletePhase(id: number) {
  return prisma.phase.delete({ where: { id } })
}
```

- [ ] **Step 6: Run — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/WorldService.test.ts src/__tests__/PhaseService.test.ts --no-coverage
```

- [ ] **Step 7: Commit**

```bash
git add apps/calibrator/src/services/WorldService.ts \
        apps/calibrator/src/services/PhaseService.ts \
        apps/calibrator/src/__tests__/WorldService.test.ts \
        apps/calibrator/src/__tests__/PhaseService.test.ts
git commit -m "[CAL] feat(s7): add WorldService and PhaseService with tests"
```

---

### Task 6: LevelService

**Files:**
- Create: `apps/calibrator/src/services/LevelService.ts`
- Create: `apps/calibrator/src/__tests__/LevelService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/calibrator/src/__tests__/LevelService.test.ts
/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  default: {
    level: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import prisma from '../lib/prisma'
import { getLevels, getLevel, createLevel, updateLevelParams, deleteLevel } from '../services/LevelService'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

beforeEach(() => jest.clearAllMocks())

const defaultParams = {
  enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
  enemyShotSpeed: 4.0, enemyAngerDelay: 15.0,
  enemySpawnDelay: 1.0, hasPowerUps: true,
}

describe('getLevels', () => {
  it('returns levels for a phase ordered by index', async () => {
    const levels = [{ id: 1, phaseId: 1, name: 'Level 1', index: 0, ...defaultParams, waves: [], createdAt: new Date(), updatedAt: new Date() }]
    ;(mockPrisma.level.findMany as jest.Mock).mockResolvedValue(levels)
    const result = await getLevels(1)
    expect(mockPrisma.level.findMany).toHaveBeenCalledWith({
      where: { phaseId: 1 },
      orderBy: { index: 'asc' },
      include: { waves: { orderBy: { order: 'asc' } } },
    })
    expect(result).toEqual(levels)
  })
})

describe('createLevel', () => {
  it('creates level with default params', async () => {
    const created = { id: 1, phaseId: 1, name: 'Level 1', index: 0, ...defaultParams, parallaxTheme: null, createdAt: new Date(), updatedAt: new Date() }
    ;(mockPrisma.level.create as jest.Mock).mockResolvedValue(created)
    const result = await createLevel(1, { name: 'Level 1', index: 0, ...defaultParams })
    expect(result).toEqual(created)
  })

  it('throws ZodError for enemySpeed out of range', async () => {
    await expect(createLevel(1, { name: 'X', index: 0, enemySpeed: 99, shotDelay: 1.5, fuelDrain: 8.0, enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0, hasPowerUps: true })).rejects.toThrow()
  })
})

describe('updateLevelParams', () => {
  it('updates only the provided params', async () => {
    const updated = { id: 1, phaseId: 1, name: 'Level 1', index: 0, ...defaultParams, enemySpeed: 3.0, parallaxTheme: null, createdAt: new Date(), updatedAt: new Date() }
    ;(mockPrisma.level.update as jest.Mock).mockResolvedValue(updated)
    const result = await updateLevelParams(1, { enemySpeed: 3.0 })
    expect(mockPrisma.level.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { enemySpeed: 3.0 } })
    expect(result).toEqual(updated)
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/LevelService.test.ts --no-coverage
```

- [ ] **Step 3: Implement LevelService.ts**

```typescript
// apps/calibrator/src/services/LevelService.ts
import prisma from '../lib/prisma'
import { LevelInputSchema, LevelParamsSchema, type LevelInput } from '../lib/schemas'

export async function getLevels(phaseId: number) {
  return prisma.level.findMany({
    where: { phaseId },
    orderBy: { index: 'asc' },
    include: { waves: { orderBy: { order: 'asc' } } },
  })
}

export async function getLevel(id: number) {
  return prisma.level.findUniqueOrThrow({
    where: { id },
    include: { waves: { orderBy: { order: 'asc' } } },
  })
}

export async function createLevel(phaseId: number, input: LevelInput) {
  const data = LevelInputSchema.parse(input)
  return prisma.level.create({ data: { phaseId, ...data } })
}

export async function updateLevelParams(id: number, input: Partial<LevelInput>) {
  const data = LevelParamsSchema.partial().parse(input)
  return prisma.level.update({ where: { id }, data })
}

export async function deleteLevel(id: number) {
  return prisma.level.delete({ where: { id } })
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/LevelService.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add apps/calibrator/src/services/LevelService.ts \
        apps/calibrator/src/__tests__/LevelService.test.ts
git commit -m "[CAL] feat(s7): add LevelService with CRUD and param update"
```

---

### Task 7: WaveService + PatternService

**Files:**
- Create: `apps/calibrator/src/services/WaveService.ts`
- Create: `apps/calibrator/src/services/PatternService.ts`
- Create: `apps/calibrator/src/__tests__/WaveService.test.ts`
- Create: `apps/calibrator/src/__tests__/PatternService.test.ts`

- [ ] **Step 1: Write failing tests for WaveService**

```typescript
// apps/calibrator/src/__tests__/WaveService.test.ts
/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  default: {
    wave: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

import prisma from '../lib/prisma'
import { getWaves, createWave, updateWave, deleteWave } from '../services/WaveService'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

beforeEach(() => jest.clearAllMocks())

const emptyGrid = [Array(12).fill(null)]

describe('getWaves', () => {
  it('returns waves ordered by order for a level', async () => {
    const waves = [{ id: 1, levelId: 1, order: 1, delay: 3.0, grid: emptyGrid, createdAt: new Date(), updatedAt: new Date() }]
    ;(mockPrisma.wave.findMany as jest.Mock).mockResolvedValue(waves)
    const result = await getWaves(1)
    expect(mockPrisma.wave.findMany).toHaveBeenCalledWith({ where: { levelId: 1 }, orderBy: { order: 'asc' } })
    expect(result).toEqual(waves)
  })
})

describe('createWave', () => {
  it('creates a wave with valid grid', async () => {
    const input = { order: 1, delay: 3.0, grid: emptyGrid }
    const created = { id: 1, levelId: 1, ...input, createdAt: new Date(), updatedAt: new Date() }
    ;(mockPrisma.wave.create as jest.Mock).mockResolvedValue(created)
    const result = await createWave(1, input)
    expect(mockPrisma.wave.create).toHaveBeenCalledWith({ data: { levelId: 1, ...input } })
    expect(result).toEqual(created)
  })

  it('throws ZodError when order > 10', async () => {
    await expect(createWave(1, { order: 11, delay: 3.0, grid: emptyGrid })).rejects.toThrow()
  })
})

describe('updateWave', () => {
  it('updates wave grid', async () => {
    const newGrid = [['grunt', null, null, null, null, null, null, null, null, null, null, null]]
    const updated = { id: 1, levelId: 1, order: 1, delay: 3.0, grid: newGrid, createdAt: new Date(), updatedAt: new Date() }
    ;(mockPrisma.wave.update as jest.Mock).mockResolvedValue(updated)
    const result = await updateWave(1, { order: 1, delay: 3.0, grid: newGrid })
    expect(mockPrisma.wave.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { order: 1, delay: 3.0, grid: newGrid } })
    expect(result).toEqual(updated)
  })
})
```

- [ ] **Step 2: Write failing tests for PatternService**

```typescript
// apps/calibrator/src/__tests__/PatternService.test.ts
/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  default: {
    pattern: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import prisma from '../lib/prisma'
import { getPatterns, savePattern, deletePattern } from '../services/PatternService'

const mockPrisma = prisma as jest.Mocked<typeof prisma>

beforeEach(() => jest.clearAllMocks())

describe('getPatterns', () => {
  it('returns all patterns ordered by createdAt desc', async () => {
    const patterns = [{ id: 1, name: 'Diagonal', grid: [], createdAt: new Date() }]
    ;(mockPrisma.pattern.findMany as jest.Mock).mockResolvedValue(patterns)
    const result = await getPatterns()
    expect(mockPrisma.pattern.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } })
    expect(result).toEqual(patterns)
  })
})

describe('savePattern', () => {
  it('creates a named pattern', async () => {
    const created = { id: 1, name: 'Boss Rush', grid: [], createdAt: new Date() }
    ;(mockPrisma.pattern.create as jest.Mock).mockResolvedValue(created)
    const result = await savePattern({ name: 'Boss Rush', grid: [] })
    expect(result).toEqual(created)
  })

  it('throws ZodError for empty name', async () => {
    await expect(savePattern({ name: '', grid: [] })).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/WaveService.test.ts src/__tests__/PatternService.test.ts --no-coverage
```

- [ ] **Step 4: Implement WaveService.ts**

```typescript
// apps/calibrator/src/services/WaveService.ts
import prisma from '../lib/prisma'
import { WaveInputSchema, type WaveInput } from '../lib/schemas'

export async function getWaves(levelId: number) {
  return prisma.wave.findMany({ where: { levelId }, orderBy: { order: 'asc' } })
}

export async function createWave(levelId: number, input: WaveInput) {
  const data = WaveInputSchema.parse(input)
  return prisma.wave.create({ data: { levelId, ...data } })
}

export async function updateWave(id: number, input: Partial<WaveInput>) {
  const data = WaveInputSchema.partial().parse(input)
  return prisma.wave.update({ where: { id }, data })
}

export async function deleteWave(id: number) {
  return prisma.wave.delete({ where: { id } })
}

export async function reorderWaves(levelId: number, orderedIds: number[]) {
  return prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.wave.update({ where: { id }, data: { order: i + 1 } })
    )
  )
}
```

- [ ] **Step 5: Implement PatternService.ts**

```typescript
// apps/calibrator/src/services/PatternService.ts
import prisma from '../lib/prisma'
import { PatternInputSchema, type PatternInput } from '../lib/schemas'

export async function getPatterns() {
  return prisma.pattern.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function savePattern(input: PatternInput) {
  const data = PatternInputSchema.parse(input)
  return prisma.pattern.create({ data })
}

export async function deletePattern(id: number) {
  return prisma.pattern.delete({ where: { id } })
}
```

- [ ] **Step 6: Run — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/WaveService.test.ts src/__tests__/PatternService.test.ts --no-coverage
```

- [ ] **Step 7: Commit**

```bash
git add apps/calibrator/src/services/WaveService.ts \
        apps/calibrator/src/services/PatternService.ts \
        apps/calibrator/src/__tests__/WaveService.test.ts \
        apps/calibrator/src/__tests__/PatternService.test.ts
git commit -m "[CAL] feat(s7): add WaveService and PatternService with tests"
```

---

### Task 8: ExportService

**Files:**
- Create: `apps/calibrator/src/services/ExportService.ts`
- Create: `apps/calibrator/src/__tests__/ExportService.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/calibrator/src/__tests__/ExportService.test.ts
/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  default: {
    level: { findMany: jest.fn() },
    wave:  { findMany: jest.fn() },
  },
}))
jest.mock('fs', () => ({ writeFileSync: jest.fn(), mkdirSync: jest.fn(), existsSync: jest.fn(() => true) }))

import prisma from '../lib/prisma'
import fs from 'fs'
import { exportToJson } from '../services/ExportService'

const mockPrisma = prisma as jest.Mocked<typeof prisma>
const mockFs = fs as jest.Mocked<typeof fs>

beforeEach(() => jest.clearAllMocks())

const mockPhaseWithLevels = {
  id: 1, worldId: 1, name: 'Fase 1', index: 0, createdAt: new Date(), updatedAt: new Date(),
  levels: [
    {
      id: 1, phaseId: 1, name: 'Level 1', index: 0,
      enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0,
      hasPowerUps: true, parallaxTheme: null, createdAt: new Date(), updatedAt: new Date(),
      waves: [
        { id: 1, levelId: 1, order: 1, delay: 3.0,
          grid: [['grunt', null, null, null, null, null, null, null, null, null, null, null]],
          createdAt: new Date(), updatedAt: new Date() }
      ],
    }
  ]
}

describe('exportToJson', () => {
  it('calls writeFileSync with a valid JSON array', async () => {
    ;(mockPrisma.level.findMany as jest.Mock).mockResolvedValue(mockPhaseWithLevels.levels)
    await exportToJson(1)
    expect(mockFs.writeFileSync).toHaveBeenCalledTimes(1)
    const [, json] = (mockFs.writeFileSync as jest.Mock).mock.calls[0]
    const parsed = JSON.parse(json as string)
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed).toHaveLength(1)
  })

  it('maps wave grid to EntityPlacement[] in waves field', async () => {
    ;(mockPrisma.level.findMany as jest.Mock).mockResolvedValue(mockPhaseWithLevels.levels)
    await exportToJson(1)
    const [, json] = (mockFs.writeFileSync as jest.Mock).mock.calls[0]
    const parsed = JSON.parse(json as string)
    expect(parsed[0].waves).toHaveLength(1)
    expect(parsed[0].waves[0].entities[0].entityTypeId).toBe('grunt')
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/ExportService.test.ts --no-coverage
```

- [ ] **Step 3: Implement ExportService.ts**

```typescript
// apps/calibrator/src/services/ExportService.ts
import path from 'path'
import fs from 'fs'
import prisma from '../lib/prisma'
import type { EntityType, Grid } from '../lib/schemas'

// __dirname = apps/calibrator/src/services
// 4 levels up = monorepo root
const LEVELS_PATH = path.join(
  __dirname, '..', '..', '..', '..', 'apps', 'game', 'src', 'levels.json'
)

const CELL_WIDTH  = 390 / 12  // ~32.5px per column
const CELL_HEIGHT = 40        // px per row in spawn zone

function gridToEntities(grid: Grid) {
  const entities: { entityTypeId: string; x: number; y: number }[] = []
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      const cell = grid[row][col]
      if (cell !== null) {
        entities.push({
          entityTypeId: cell,
          x: col * CELL_WIDTH + CELL_WIDTH / 2,
          y: row * CELL_HEIGHT + CELL_HEIGHT / 2,
        })
      }
    }
  }
  return entities
}

export async function exportToJson(worldId: number): Promise<void> {
  const levels = await prisma.level.findMany({
    where: { phase: { worldId } },
    orderBy: [{ phase: { index: 'asc' } }, { index: 'asc' }],
    include: { waves: { orderBy: { order: 'asc' } } },
  })

  const output = levels.map((level, i) => ({
    id:              `level-${i}`,
    style:           'classic' as const,
    difficultyScore: (i / Math.max(levels.length - 1, 1)) * 100,
    entities:        level.waves.flatMap(w => gridToEntities(w.grid as Grid)),
    params: {
      numberOfEnemies: level.waves.reduce((acc, w) => acc + (w.grid as Grid).flat().filter(Boolean).length, 0),
      enemySpeed:      level.enemySpeed,
      enemyShotDelay:  level.shotDelay,
      enemyShotSpeed:  level.enemyShotSpeed,
      enemyAngerDelay: level.enemyAngerDelay,
      enemySpawnDelay: level.enemySpawnDelay,
      hasPowerUps:     level.hasPowerUps,
      powerUpMinWait:  5,
      powerUpMaxWait:  15,
      fuelDrainRate:   level.fuelDrain,
    },
    waves: level.waves.map(w => ({
      entities: gridToEntities(w.grid as Grid),
    })),
  }))

  fs.writeFileSync(LEVELS_PATH, JSON.stringify(output, null, 2))
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/ExportService.test.ts --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add apps/calibrator/src/services/ExportService.ts \
        apps/calibrator/src/__tests__/ExportService.test.ts
git commit -m "[CAL] feat(s7): add ExportService — DB to levels.json with wave mapping"
```

---

### Task 9: Server Actions

**Files:**
- Create: `apps/calibrator/app/actions/world.actions.ts`
- Create: `apps/calibrator/app/actions/phase.actions.ts`
- Create: `apps/calibrator/app/actions/level.actions.ts`
- Create: `apps/calibrator/app/actions/wave.actions.ts`
- Create: `apps/calibrator/app/actions/pattern.actions.ts`
- Create: `apps/calibrator/app/actions/export.actions.ts`

Server Actions are thin wrappers — no additional tests needed (covered by service tests).

- [ ] **Step 1: Create world.actions.ts**

```typescript
// apps/calibrator/app/actions/world.actions.ts
'use server'
import { getWorlds, getWorld, createWorld, updateWorld, deleteWorld } from '../../src/services/WorldService'
import type { WorldInput } from '../../src/lib/schemas'

export { getWorlds, getWorld }
export async function createWorldAction(input: WorldInput) { return createWorld(input) }
export async function updateWorldAction(id: number, input: Partial<WorldInput>) { return updateWorld(id, input) }
export async function deleteWorldAction(id: number) { return deleteWorld(id) }
```

- [ ] **Step 2: Create phase.actions.ts**

```typescript
// apps/calibrator/app/actions/phase.actions.ts
'use server'
import { getPhases, createPhase, updatePhase, deletePhase } from '../../src/services/PhaseService'
import type { PhaseInput } from '../../src/lib/schemas'

export { getPhases }
export async function createPhaseAction(worldId: number, input: PhaseInput) { return createPhase(worldId, input) }
export async function updatePhaseAction(id: number, input: Partial<PhaseInput>) { return updatePhase(id, input) }
export async function deletePhaseAction(id: number) { return deletePhase(id) }
```

- [ ] **Step 3: Create level.actions.ts**

```typescript
// apps/calibrator/app/actions/level.actions.ts
'use server'
import { getLevels, getLevel, createLevel, updateLevelParams, deleteLevel } from '../../src/services/LevelService'
import type { LevelInput } from '../../src/lib/schemas'

export { getLevels, getLevel }
export async function createLevelAction(phaseId: number, input: LevelInput) { return createLevel(phaseId, input) }
export async function updateLevelParamsAction(id: number, input: Partial<LevelInput>) { return updateLevelParams(id, input) }
export async function deleteLevelAction(id: number) { return deleteLevel(id) }
```

- [ ] **Step 4: Create wave.actions.ts**

```typescript
// apps/calibrator/app/actions/wave.actions.ts
'use server'
import { getWaves, createWave, updateWave, deleteWave, reorderWaves } from '../../src/services/WaveService'
import type { WaveInput } from '../../src/lib/schemas'

export { getWaves }
export async function createWaveAction(levelId: number, input: WaveInput) { return createWave(levelId, input) }
export async function updateWaveAction(id: number, input: Partial<WaveInput>) { return updateWave(id, input) }
export async function deleteWaveAction(id: number) { return deleteWave(id) }
export async function reorderWavesAction(levelId: number, orderedIds: number[]) { return reorderWaves(levelId, orderedIds) }
```

- [ ] **Step 5: Create pattern.actions.ts**

```typescript
// apps/calibrator/app/actions/pattern.actions.ts
'use server'
import { getPatterns, savePattern, deletePattern } from '../../src/services/PatternService'
import type { PatternInput } from '../../src/lib/schemas'

export { getPatterns }
export async function savePatternAction(input: PatternInput) { return savePattern(input) }
export async function deletePatternAction(id: number) { return deletePattern(id) }
```

- [ ] **Step 6: Create export.actions.ts**

```typescript
// apps/calibrator/app/actions/export.actions.ts
'use server'
import { exportToJson } from '../../src/services/ExportService'

export async function exportToJsonAction(worldId: number) {
  await exportToJson(worldId)
}
```

- [ ] **Step 7: Commit**

```bash
git add apps/calibrator/app/actions/
git commit -m "[CAL] feat(s7): add 19 server actions as thin wrappers over services"
```

---

### Task 10: Prisma seed

**Files:**
- Create: `apps/calibrator/prisma/seed.ts`

- [ ] **Step 1: Create seed.ts**

```typescript
// apps/calibrator/prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const world = await prisma.world.upsert({
    where: { index: 0 },
    update: {},
    create: { name: 'Planeta Xeron', index: 0, parallaxTheme: 'space' },
  })

  const phase = await prisma.phase.upsert({
    where: { worldId_index: { worldId: world.id, index: 0 } },
    update: {},
    create: { worldId: world.id, name: 'Fase 1', index: 0 },
  })

  const level = await prisma.level.upsert({
    where: { phaseId_index: { phaseId: phase.id, index: 0 } },
    update: {},
    create: {
      phaseId: phase.id, name: 'Level 1', index: 0,
      enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0,
      enemySpawnDelay: 1.0, hasPowerUps: true,
    },
  })

  const waves = [
    {
      order: 1, delay: 0, // first wave — no delay
      grid: [
        ['grunt', null, 'grunt', null, 'grunt', null, 'grunt', null, null, null, null, null],
        Array(12).fill(null),
      ],
    },
    {
      order: 2, delay: 3.0,
      grid: [
        [null, null, null, null, null, 'rocket', null, null, null, null, null, null],
        [null, null, null, null, 'grunt', null, 'grunt', null, null, null, null, null],
      ],
    },
    {
      order: 3, delay: 3.0,
      grid: [
        ['shield', null, null, null, null, null, null, null, null, null, null, null],
        [null, null, 'grunt', null, 'grunt', null, null, null, null, null, null, null],
      ],
    },
  ]

  for (const wave of waves) {
    await prisma.wave.upsert({
      where: { levelId_order: { levelId: level.id, order: wave.order } },
      update: {},
      create: { levelId: level.id, ...wave },
    })
  }

  console.log(`Seed complete — World: ${world.name}, Phase: ${phase.name}, Level: ${level.name}, Waves: ${waves.length}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Add ts-node and run seed**

```bash
cd apps/calibrator
npm install ts-node --save-dev
npx ts-node --project tsconfig.json prisma/seed.ts
```

Expected: "Seed complete — World: Planeta Xeron, Phase: Fase 1, Level: Level 1, Waves: 3"

- [ ] **Step 3: Commit**

```bash
git add apps/calibrator/prisma/seed.ts apps/calibrator/package.json
git commit -m "[CAL] chore(s7): add Prisma seed — 1 world, 1 phase, 1 level, 3 waves"
```

---

## Phase 2 — Dashboard UI

### Task 11: Dashboard routing + DashboardLayout

**Files:**
- Modify: `apps/calibrator/app/layout.tsx`
- Create: `apps/calibrator/app/dashboard/layout.tsx`
- Create: `apps/calibrator/app/dashboard/page.tsx`
- Create: `apps/calibrator/app/dashboard/[worldId]/[phaseId]/[levelId]/page.tsx`

- [ ] **Step 1: Update root layout.tsx metadata**

```typescript
// apps/calibrator/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Space Invaders — Calibrator',
  description: 'Wave editor and level calibrator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0d0d1a', color: '#eee', fontFamily: 'monospace' }}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Create dashboard layout**

```typescript
// apps/calibrator/app/dashboard/layout.tsx
import { getWorlds } from '../actions/world.actions'
import { Sidebar } from '../../src/components/Sidebar/Sidebar'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ worldId?: string; phaseId?: string; levelId?: string }>
}) {
  const worlds = await getWorlds()
  const { worldId, phaseId } = await params

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        worlds={worlds}
        selectedWorldId={worldId ? parseInt(worldId) : undefined}
        selectedPhaseId={phaseId ? parseInt(phaseId) : undefined}
      />
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Create dashboard index page (redirect to first world)**

```typescript
// apps/calibrator/app/dashboard/page.tsx
import { redirect } from 'next/navigation'
import { getWorlds } from '../actions/world.actions'
import { getPhases } from '../actions/phase.actions'
import { getLevels } from '../actions/level.actions'

export default async function DashboardPage() {
  const worlds = await getWorlds()
  if (worlds.length === 0) {
    return (
      <div style={{ padding: 40, color: '#666' }}>
        No worlds yet. Create a world to get started.
      </div>
    )
  }
  const phases = await getPhases(worlds[0].id)
  if (phases.length === 0) redirect(`/dashboard`)
  const levels = await getLevels(phases[0].id)
  if (levels.length === 0) redirect(`/dashboard`)
  redirect(`/dashboard/${worlds[0].id}/${phases[0].id}/${levels[0].id}`)
}
```

- [ ] **Step 4: Create LevelEditorClient (connects WaveChipBar ↔ EditorPane)**

```typescript
// apps/calibrator/src/components/LevelEditorClient.tsx
'use client'
import React, { useState } from 'react'
import { WaveChipBar } from './WaveChipBar/WaveChipBar'
import { EditorPane } from './WaveEditor/EditorPane'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown; createdAt: Date; updatedAt: Date }
type Level = {
  id: number; phaseId: number; name: string; index: number;
  enemySpeed: number; shotDelay: number; fuelDrain: number;
  enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number;
  hasPowerUps: boolean; parallaxTheme: string | null; createdAt: Date; updatedAt: Date;
  waves: Wave[];
}
type UserPattern = { id: number; name: string; grid: unknown; createdAt: Date }

interface LevelEditorClientProps {
  level: Level
  patterns: UserPattern[]
}

export function LevelEditorClient({ level, patterns }: LevelEditorClientProps) {
  const [selectedWave, setSelectedWave] = useState<Wave>(level.waves[0])

  if (level.waves.length === 0) {
    return <div style={{ padding: 40, color: '#555' }}>No waves. Add a wave to begin.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <WaveChipBar
        waves={level.waves}
        levelId={level.id}
        onSelectWave={setSelectedWave}
      />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <EditorPane
          key={selectedWave.id}
          level={level}
          initialWave={selectedWave}
          patterns={patterns}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create editor page (uses LevelEditorClient)**

```typescript
// apps/calibrator/app/dashboard/[worldId]/[phaseId]/[levelId]/page.tsx
import { getLevel } from '../../../../actions/level.actions'
import { getPatterns } from '../../../../actions/pattern.actions'
import { LevelEditorClient } from '../../../../../src/components/LevelEditorClient'

export default async function LevelEditorPage({
  params,
}: {
  params: Promise<{ worldId: string; phaseId: string; levelId: string }>
}) {
  const { levelId } = await params
  const [level, patterns] = await Promise.all([
    getLevel(parseInt(levelId)),
    getPatterns(),
  ])

  return <LevelEditorClient level={level} patterns={patterns} />
}
```

- [ ] **Step 5: Write basic routing test**

```typescript
// apps/calibrator/src/__tests__/DashboardRouting.test.ts
/**
 * @jest-environment node
 */
// Smoke test: verify exported route components exist
describe('Dashboard route modules', () => {
  it('dashboard layout exports a default function', async () => {
    // If this import fails, routing is broken
    const mod = await import('../../app/dashboard/layout')
    expect(typeof mod.default).toBe('function')
  })
})
```

- [ ] **Step 6: Run test**

```bash
cd apps/calibrator && npx jest src/__tests__/DashboardRouting.test.ts --no-coverage
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/calibrator/app/layout.tsx \
        apps/calibrator/app/dashboard/
git commit -m "[CAL] feat(s7): add dashboard routing — World/Phase/Level URL structure"
```

---

### Task 12: Sidebar components

**Files:**
- Create: `apps/calibrator/src/components/Sidebar/Sidebar.tsx`
- Create: `apps/calibrator/src/components/Sidebar/PhaseList.tsx`
- Create: `apps/calibrator/src/components/Sidebar/LevelList.tsx`
- Create: `apps/calibrator/src/__tests__/Sidebar.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/calibrator/src/__tests__/Sidebar.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { Sidebar } from '../components/Sidebar/Sidebar'

const worlds = [
  { id: 1, name: 'Planeta X', index: 0, image: null, parallaxTheme: 'space', createdAt: new Date(), updatedAt: new Date() },
]

describe('Sidebar', () => {
  it('renders world name', () => {
    render(<Sidebar worlds={worlds} />)
    expect(screen.getByText('Planeta X')).toBeInTheDocument()
  })

  it('renders module navigation items', () => {
    render(<Sidebar worlds={worlds} />)
    expect(screen.getByText('Worlds')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/Sidebar.test.tsx --no-coverage
```

- [ ] **Step 3: Implement Sidebar.tsx**

```typescript
// apps/calibrator/src/components/Sidebar/Sidebar.tsx
'use client'
import React, { useState, useEffect } from 'react'
import { getPhases } from '../../../app/actions/phase.actions'
import { getLevels } from '../../../app/actions/level.actions'
import { useRouter, usePathname } from 'next/navigation'

type World = { id: number; name: string; index: number; image: string | null; parallaxTheme: string | null; createdAt: Date; updatedAt: Date }
type Phase = { id: number; worldId: number; name: string; index: number }
type Level = { id: number; phaseId: number; name: string; index: number }

interface SidebarProps {
  worlds: World[]
  selectedWorldId?: number
  selectedPhaseId?: number
}

const s = {
  sidebar: { width: 140, minWidth: 140, background: '#1a1a2e', borderRight: '1px solid #2c2c3e', display: 'flex', flexDirection: 'column' as const, gap: 0, overflow: 'auto', padding: '12px 0' },
  section: { padding: '0 10px 12px' },
  label: { color: '#555', fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 },
  item: (active: boolean) => ({ color: active ? '#3498db' : '#888', background: active ? '#1e2d3d' : 'transparent', borderLeft: active ? '2px solid #3498db' : '2px solid transparent', padding: '4px 8px', fontSize: 10, cursor: 'pointer', borderRadius: 3 }),
}

export function Sidebar({ worlds, selectedWorldId, selectedPhaseId }: SidebarProps) {
  const router = useRouter()
  const [worldId, setWorldId] = useState(selectedWorldId ?? worlds[0]?.id)
  const [phases, setPhases] = useState<Phase[]>([])
  const [phaseId, setPhaseId] = useState(selectedPhaseId)
  const [levels, setLevels] = useState<Level[]>([])

  useEffect(() => {
    if (!worldId) return
    getPhases(worldId).then(p => {
      setPhases(p as Phase[])
      if (!phaseId && p.length > 0) setPhaseId(p[0].id)
    })
  }, [worldId])

  useEffect(() => {
    if (!phaseId) return
    getLevels(phaseId).then(l => setLevels(l as Level[]))
  }, [phaseId])

  function navigateToLevel(lvl: Level) {
    router.push(`/dashboard/${worldId}/${phaseId}/${lvl.id}`)
  }

  return (
    <nav style={s.sidebar}>
      <div style={s.section}>
        <div style={s.label}>Módulos</div>
        <div style={s.item(true)}>Worlds</div>
        <div style={s.item(false)}>Analytics</div>
      </div>
      <div style={s.section}>
        <div style={s.label}>World</div>
        <select
          value={worldId}
          onChange={e => setWorldId(Number(e.target.value))}
          style={{ width: '100%', background: '#2c2c3e', color: '#eee', border: 'none', borderRadius: 3, padding: '3px 4px', fontSize: 10 }}
        >
          {worlds.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      {phases.length > 0 && (
        <div style={s.section}>
          <div style={s.label}>Fase</div>
          {phases.map(p => (
            <div key={p.id} style={s.item(phaseId === p.id)} onClick={() => setPhaseId(p.id)}>
              {p.name}
            </div>
          ))}
        </div>
      )}
      {levels.length > 0 && (
        <div style={s.section}>
          <div style={s.label}>Level</div>
          {levels.map(l => (
            <div key={l.id} style={s.item(false)} onClick={() => navigateToLevel(l)}>
              {l.name}
            </div>
          ))}
        </div>
      )}
      {worldId && (
        <div style={{ ...s.section, marginTop: 'auto' }}>
          <ExportButton worldId={worldId} />
        </div>
      )}
    </nav>
  )
}

function ExportButton({ worldId }: { worldId: number }) {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleExport() {
    setStatus('loading')
    try {
      const { exportToJsonAction } = await import('../../../app/actions/export.actions')
      await exportToJsonAction(worldId)
      setStatus('done')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const label = status === 'loading' ? '...' : status === 'done' ? '✓ Exported' : status === 'error' ? '✗ Error' : '💾 Export JSON'
  const bg = status === 'done' ? '#2ecc71' : status === 'error' ? '#e74c3c' : '#2c2c3e'

  return (
    <button
      onClick={handleExport}
      disabled={status === 'loading'}
      style={{ width: '100%', background: bg, color: status === 'done' ? '#111' : '#eee', border: 'none', borderRadius: 3, padding: '5px 0', fontSize: 9, cursor: 'pointer' }}
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 4: Run — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/Sidebar.test.tsx --no-coverage
```

- [ ] **Step 5: Commit**

```bash
git add apps/calibrator/src/components/Sidebar/ \
        apps/calibrator/src/__tests__/Sidebar.test.tsx
git commit -m "[CAL] feat(s7): add Sidebar with World/Phase/Level navigation"
```

---

### Task 13: WaveChipBar

**Files:**
- Create: `apps/calibrator/src/components/WaveChipBar/WaveChipBar.tsx`
- Create: `apps/calibrator/src/components/WaveChipBar/WaveChip.tsx`
- Create: `apps/calibrator/src/__tests__/WaveChipBar.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/calibrator/src/__tests__/WaveChipBar.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { WaveChipBar } from '../components/WaveChipBar/WaveChipBar'

const waves = [
  { id: 1, levelId: 1, order: 1, delay: 0, grid: [Array(12).fill(null)], createdAt: new Date(), updatedAt: new Date() },
  { id: 2, levelId: 1, order: 2, delay: 3.0, grid: [['grunt', null, null, null, null, null, null, null, null, null, null, null]], createdAt: new Date(), updatedAt: new Date() },
]

describe('WaveChipBar', () => {
  it('renders a chip for each wave', () => {
    render(<WaveChipBar waves={waves} levelId={1} />)
    expect(screen.getByText('W1')).toBeInTheDocument()
    expect(screen.getByText('W2')).toBeInTheDocument()
  })

  it('calls onSelectWave when a chip is clicked', () => {
    const onSelect = jest.fn()
    render(<WaveChipBar waves={waves} levelId={1} onSelectWave={onSelect} />)
    fireEvent.click(screen.getByText('W1'))
    expect(onSelect).toHaveBeenCalledWith(waves[0])
  })

  it('shows score below each chip', () => {
    render(<WaveChipBar waves={waves} levelId={1} />)
    // Wave 1 empty grid → score 0; Wave 2 has 1 grunt
    const scores = screen.getAllByTestId('wave-score')
    expect(scores).toHaveLength(2)
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/WaveChipBar.test.tsx --no-coverage
```

- [ ] **Step 3: Implement WaveChip.tsx**

```typescript
// apps/calibrator/src/components/WaveChipBar/WaveChip.tsx
'use client'
import React from 'react'
import { computeWaveScore } from '../../services/WaveScoreCalculator'
import type { Grid } from '../../lib/schemas'

interface WaveChipProps {
  wave: { id: number; order: number; delay: number; grid: unknown }
  active: boolean
  onClick: () => void
}

export function WaveChip({ wave, active, onClick }: WaveChipProps) {
  const score = computeWaveScore(wave.grid as Grid, wave.delay)
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        padding: '6px 10px', cursor: 'pointer', borderRadius: 4, minWidth: 48,
        background: active ? '#1e3a5f' : '#2c2c3e',
        border: `1px solid ${active ? '#3498db' : '#3c3c4e'}`,
      }}
    >
      <span style={{ fontSize: 11, color: active ? '#3498db' : '#aaa', fontWeight: 'bold' }}>
        W{wave.order}
      </span>
      <span data-testid="wave-score" style={{ fontSize: 9, color: '#f1c40f', marginTop: 2 }}>
        {score}
      </span>
    </div>
  )
}
```

- [ ] **Step 4: Implement WaveChipBar.tsx**

```typescript
// apps/calibrator/src/components/WaveChipBar/WaveChipBar.tsx
'use client'
import React, { useState } from 'react'
import { WaveChip } from './WaveChip'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown; createdAt: Date; updatedAt: Date }

interface WaveChipBarProps {
  waves: Wave[]
  levelId: number
  onSelectWave?: (wave: Wave) => void
}

export function WaveChipBar({ waves, levelId, onSelectWave }: WaveChipBarProps) {
  const [activeId, setActiveId] = useState(waves[0]?.id)

  function select(wave: Wave) {
    setActiveId(wave.id)
    onSelectWave?.(wave)
  }

  return (
    <div style={{
      display: 'flex', gap: 6, padding: '8px 12px', background: '#111',
      borderBottom: '1px solid #2c2c3e', overflowX: 'auto', flexShrink: 0,
    }}>
      {waves.map(w => (
        <WaveChip key={w.id} wave={w} active={activeId === w.id} onClick={() => select(w)} />
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Run — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/WaveChipBar.test.tsx --no-coverage
```

- [ ] **Step 6: Commit**

```bash
git add apps/calibrator/src/components/WaveChipBar/ \
        apps/calibrator/src/__tests__/WaveChipBar.test.tsx
git commit -m "[CAL] feat(s7): add WaveChipBar with score display per wave"
```

---

### Task 14: WaveStatsPanel

**Files:**
- Create: `apps/calibrator/src/components/WaveStatsPanel/WaveStatsPanel.tsx`
- Create: `apps/calibrator/src/components/WaveStatsPanel/ScoreCard.tsx`
- Create: `apps/calibrator/src/components/WaveStatsPanel/LevelParamsSliders.tsx`
- Create: `apps/calibrator/src/__tests__/WaveStatsPanel.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/calibrator/src/__tests__/WaveStatsPanel.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { WaveStatsPanel } from '../components/WaveStatsPanel/WaveStatsPanel'

const wave = {
  id: 1, levelId: 1, order: 1, delay: 3.0,
  grid: [['grunt', null, null, null, null, null, null, null, null, null, null, null]],
  createdAt: new Date(), updatedAt: new Date(),
}
const level = {
  id: 1, phaseId: 1, name: 'Level 1', index: 0,
  enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
  enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0,
  hasPowerUps: true, parallaxTheme: null, createdAt: new Date(), updatedAt: new Date(),
}

describe('WaveStatsPanel', () => {
  it('shows enemy count for the current wave', () => {
    render(<WaveStatsPanel wave={wave} level={level} onLevelParamChange={jest.fn()} />)
    expect(screen.getByText(/1 inimigo/i)).toBeInTheDocument()
  })

  it('shows the wave delay', () => {
    render(<WaveStatsPanel wave={wave} level={level} onLevelParamChange={jest.fn()} />)
    expect(screen.getByText(/3\.0s/)).toBeInTheDocument()
  })

  it('renders enemySpeed slider', () => {
    render(<WaveStatsPanel wave={wave} level={level} onLevelParamChange={jest.fn()} />)
    expect(screen.getByLabelText(/Enemy Speed/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/WaveStatsPanel.test.tsx --no-coverage
```

- [ ] **Step 3: Implement ScoreCard.tsx**

```typescript
// apps/calibrator/src/components/WaveStatsPanel/ScoreCard.tsx
import React from 'react'
import { computeWaveScore } from '../../services/WaveScoreCalculator'
import type { Grid } from '../../lib/schemas'

export function ScoreCard({ grid, delay }: { grid: unknown; delay: number }) {
  const score = computeWaveScore(grid as Grid, delay)
  const color = score < 33 ? '#2ecc71' : score < 66 ? '#f1c40f' : '#e74c3c'
  return (
    <div style={{ background: '#2c2c3e', borderRadius: 4, padding: 10 }}>
      <div style={{ fontSize: 9, color: '#666', marginBottom: 4 }}>Difficulty Score</div>
      <div style={{ fontSize: 28, fontWeight: 'bold', color }}>{score}</div>
      <div style={{ fontSize: 9, color: '#555' }}>composition-based</div>
    </div>
  )
}
```

- [ ] **Step 4: Implement LevelParamsSliders.tsx**

```typescript
// apps/calibrator/src/components/WaveStatsPanel/LevelParamsSliders.tsx
import React from 'react'

interface SliderProps {
  label: string
  name: string
  value: number
  min: number
  max: number
  step: number
  onChange: (name: string, value: number) => void
}

function Slider({ label, name, value, min, max, step, onChange }: SliderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label htmlFor={name} style={{ color: '#666', fontSize: 9, width: 90 }}>{label}</label>
      <input
        id={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(name, parseFloat(e.target.value))}
        style={{ flex: 1 }}
        aria-label={label}
      />
      <span style={{ color: '#eee', fontSize: 9, width: 30, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

interface LevelParamsSlidersProps {
  level: {
    enemySpeed: number; shotDelay: number; fuelDrain: number;
    enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number;
  }
  onChange: (name: string, value: number) => void
}

export function LevelParamsSliders({ level, onChange }: LevelParamsSlidersProps) {
  return (
    <div style={{ background: '#2c2c3e', borderRadius: 4, padding: 10 }}>
      <Slider label="Enemy Speed"     name="enemySpeed"      value={level.enemySpeed}      min={1}   max={5}   step={0.1}  onChange={onChange} />
      <Slider label="Shot Delay"      name="shotDelay"       value={level.shotDelay}       min={0.5} max={3.0} step={0.1}  onChange={onChange} />
      <Slider label="Fuel Drain"      name="fuelDrain"       value={level.fuelDrain}       min={1}   max={20}  step={0.5}  onChange={onChange} />
      <Slider label="Shot Speed"      name="enemyShotSpeed"  value={level.enemyShotSpeed}  min={2}   max={8}   step={0.5}  onChange={onChange} />
      <Slider label="Anger Delay"     name="enemyAngerDelay" value={level.enemyAngerDelay} min={5}   max={30}  step={1}    onChange={onChange} />
      <Slider label="Spawn Delay"     name="enemySpawnDelay" value={level.enemySpawnDelay} min={0.3} max={2}   step={0.1}  onChange={onChange} />
    </div>
  )
}
```

- [ ] **Step 5: Implement WaveStatsPanel.tsx**

```typescript
// apps/calibrator/src/components/WaveStatsPanel/WaveStatsPanel.tsx
'use client'
import React from 'react'
import { ScoreCard } from './ScoreCard'
import { LevelParamsSliders } from './LevelParamsSliders'
import type { Grid } from '../../lib/schemas'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown; createdAt: Date; updatedAt: Date }
type Level = {
  id: number; phaseId: number; name: string; index: number;
  enemySpeed: number; shotDelay: number; fuelDrain: number;
  enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number;
  hasPowerUps: boolean; parallaxTheme: string | null; createdAt: Date; updatedAt: Date;
}

interface WaveStatsPanelProps {
  wave: Wave
  level: Level
  onLevelParamChange: (name: string, value: number) => void
}

export function WaveStatsPanel({ wave, level, onLevelParamChange }: WaveStatsPanelProps) {
  const enemyCount = (wave.grid as Grid).flat().filter(Boolean).length

  return (
    <div style={{ width: '25%', minWidth: 180, padding: 12, display: 'flex', flexDirection: 'column', gap: 10, borderRight: '1px solid #2c2c3e', overflow: 'auto' }}>
      <div style={{ background: '#2c2c3e', borderRadius: 4, padding: 10 }}>
        <div style={{ fontSize: 9, color: '#666', marginBottom: 6 }}>Wave Info</div>
        <div style={{ fontSize: 10, color: '#aaa' }}>{enemyCount} inimigo{enemyCount !== 1 ? 's' : ''}</div>
        <div style={{ fontSize: 10, color: '#aaa' }}>Delay: {wave.delay}s</div>
      </div>
      <ScoreCard grid={wave.grid} delay={wave.delay} />
      <div style={{ fontSize: 9, color: '#555', marginTop: 4 }}>Level Params</div>
      <LevelParamsSliders level={level} onChange={onLevelParamChange} />
    </div>
  )
}
```

- [ ] **Step 6: Run — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/WaveStatsPanel.test.tsx --no-coverage
```

- [ ] **Step 7: Commit**

```bash
git add apps/calibrator/src/components/WaveStatsPanel/ \
        apps/calibrator/src/__tests__/WaveStatsPanel.test.tsx
git commit -m "[CAL] feat(s7): add WaveStatsPanel with score card and level param sliders"
```

---

### Task 15: SpawnZoneGrid + EntityToolbox + PatternPicker

**Files:**
- Create: `apps/calibrator/src/components/WaveEditor/EntityToolbox.tsx`
- Create: `apps/calibrator/src/components/WaveEditor/PatternPicker.tsx`
- Create: `apps/calibrator/src/components/WaveEditor/SpawnZoneGrid.tsx`
- Create: `apps/calibrator/src/components/WaveEditor/GameAreaPreview.tsx`
- Create: `apps/calibrator/src/__tests__/SpawnZoneGrid.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/calibrator/src/__tests__/SpawnZoneGrid.test.tsx
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpawnZoneGrid } from '../components/WaveEditor/SpawnZoneGrid'
import type { Grid } from '../lib/schemas'

const emptyGrid: Grid = [Array(12).fill(null), Array(12).fill(null)]

describe('SpawnZoneGrid', () => {
  it('renders 12 cells per row', () => {
    render(<SpawnZoneGrid grid={emptyGrid} selectedEntity="grunt" onGridChange={jest.fn()} />)
    const cells = screen.getAllByTestId('grid-cell')
    expect(cells).toHaveLength(24) // 2 rows × 12 cols
  })

  it('clicking an empty cell calls onGridChange with entity placed', () => {
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={emptyGrid} selectedEntity="grunt" onGridChange={onGridChange} />)
    fireEvent.click(screen.getAllByTestId('grid-cell')[0])
    expect(onGridChange).toHaveBeenCalledTimes(1)
    const newGrid: Grid = onGridChange.mock.calls[0][0]
    expect(newGrid[0][0]).toBe('grunt')
  })

  it('clicking an occupied cell clears it', () => {
    const grid: Grid = [['grunt', null, null, null, null, null, null, null, null, null, null, null], Array(12).fill(null)]
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={grid} selectedEntity="grunt" onGridChange={onGridChange} />)
    fireEvent.click(screen.getAllByTestId('grid-cell')[0])
    const newGrid: Grid = onGridChange.mock.calls[0][0]
    expect(newGrid[0][0]).toBeNull()
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/SpawnZoneGrid.test.tsx --no-coverage
```

- [ ] **Step 3: Implement EntityToolbox.tsx**

```typescript
// apps/calibrator/src/components/WaveEditor/EntityToolbox.tsx
import React from 'react'
import type { EntityType } from '../../lib/schemas'

const ENTITIES: { type: EntityType; label: string; icon: string }[] = [
  { type: 'grunt',  label: 'Grunt',  icon: '👾' },
  { type: 'rocket', label: 'Rocket', icon: '🚀' },
  { type: 'shield', label: 'Shield', icon: '🛡️' },
  { type: 'rock',   label: 'Rock',   icon: '🪨' },
]

interface EntityToolboxProps {
  selected: EntityType | 'eraser'
  onSelect: (entity: EntityType | 'eraser') => void
}

export function EntityToolbox({ selected, onSelect }: EntityToolboxProps) {
  return (
    <div style={{ display: 'flex', gap: 6, padding: '8px 0', flexWrap: 'wrap' }}>
      {ENTITIES.map(e => (
        <button
          key={e.type}
          onClick={() => onSelect(e.type)}
          title={e.label}
          style={{
            background: selected === e.type ? '#1e3a5f' : '#2c2c3e',
            border: `1px solid ${selected === e.type ? '#3498db' : '#3c3c4e'}`,
            borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 16,
          }}
        >
          {e.icon}
        </button>
      ))}
      <button
        onClick={() => onSelect('eraser')}
        title="Eraser"
        style={{
          background: selected === 'eraser' ? '#3e1a1a' : '#2c2c3e',
          border: `1px solid ${selected === 'eraser' ? '#e74c3c' : '#3c3c4e'}`,
          borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 12, color: '#e74c3c',
        }}
      >
        ✕
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Implement PatternPicker.tsx**

```typescript
// apps/calibrator/src/components/WaveEditor/PatternPicker.tsx
import React, { useState } from 'react'
import { SYSTEM_PATTERNS, generatePattern, type PatternType } from '../../services/WavePatternGenerator'
import type { EntityType, Grid } from '../../lib/schemas'

type UserPattern = { id: number; name: string; grid: unknown }

interface PatternPickerProps {
  userPatterns: UserPattern[]
  selectedEntity: EntityType
  enemyCount: number
  onApplyPattern: (grid: Grid) => void
  onSavePattern: (name: string) => void
}

export function PatternPicker({ userPatterns, selectedEntity, enemyCount, onApplyPattern, onSavePattern }: PatternPickerProps) {
  const [saveName, setSaveName] = useState('')
  const [showSave, setShowSave] = useState(false)

  function applySystem(type: PatternType) {
    const grid = generatePattern(type, selectedEntity, enemyCount || 4, 12, 4)
    onApplyPattern(grid)
  }

  function applyUser(pattern: UserPattern) {
    onApplyPattern(pattern.grid as Grid)
  }

  function handleSave() {
    if (saveName.trim()) {
      onSavePattern(saveName.trim())
      setSaveName('')
      setShowSave(false)
    }
  }

  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', padding: '4px 0' }}>
      <span style={{ fontSize: 9, color: '#555' }}>Pattern:</span>
      {SYSTEM_PATTERNS.map(p => (
        <button
          key={p.type}
          onClick={() => applySystem(p.type)}
          style={{ background: '#2c2c3e', border: '1px solid #3c3c4e', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: 9, color: '#aaa' }}
        >
          {p.label}
        </button>
      ))}
      {userPatterns.map(p => (
        <button
          key={p.id}
          onClick={() => applyUser(p)}
          style={{ background: '#1e3a1e', border: '1px solid #2ecc71', borderRadius: 3, padding: '2px 6px', cursor: 'pointer', fontSize: 9, color: '#2ecc71' }}
        >
          {p.name}
        </button>
      ))}
      {showSave ? (
        <>
          <input
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            placeholder="Nome do pattern"
            style={{ fontSize: 9, padding: '2px 6px', background: '#2c2c3e', border: '1px solid #3c3c4e', borderRadius: 3, color: '#eee' }}
          />
          <button onClick={handleSave} style={{ fontSize: 9, padding: '2px 6px', background: '#2ecc71', color: '#111', borderRadius: 3, border: 'none', cursor: 'pointer' }}>Salvar</button>
          <button onClick={() => setShowSave(false)} style={{ fontSize: 9, padding: '2px 6px', background: '#444', color: '#eee', borderRadius: 3, border: 'none', cursor: 'pointer' }}>✕</button>
        </>
      ) : (
        <button
          onClick={() => setShowSave(true)}
          style={{ fontSize: 9, padding: '2px 6px', background: '#2c2c3e', border: '1px dashed #2ecc71', borderRadius: 3, color: '#2ecc71', cursor: 'pointer' }}
        >
          + Salvar como pattern
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Implement SpawnZoneGrid.tsx**

```typescript
// apps/calibrator/src/components/WaveEditor/SpawnZoneGrid.tsx
import React from 'react'
import type { EntityType, Grid } from '../../lib/schemas'

const ENTITY_ICON: Record<EntityType, string> = {
  grunt: '👾', rocket: '🚀', shield: '🛡️', rock: '🪨',
}

interface SpawnZoneGridProps {
  grid: Grid
  selectedEntity: EntityType | 'eraser'
  onGridChange: (newGrid: Grid) => void
}

export function SpawnZoneGrid({ grid, selectedEntity, onGridChange }: SpawnZoneGridProps) {
  function handleClick(row: number, col: number) {
    const newGrid: Grid = grid.map((r, ri) =>
      r.map((cell, ci) => {
        if (ri !== row || ci !== col) return cell
        if (cell !== null) return null           // occupied → clear
        if (selectedEntity === 'eraser') return null
        return selectedEntity
      })
    )
    onGridChange(newGrid)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {grid.map((row, ri) => (
        <div key={ri} style={{ display: 'flex', gap: 2 }}>
          {row.map((cell, ci) => (
            <div
              key={ci}
              data-testid="grid-cell"
              onClick={() => handleClick(ri, ci)}
              style={{
                width: 32, height: 32,
                background: cell ? '#1e2d1e' : '#1a1a2e',
                border: `1px solid ${cell ? '#2ecc71' : '#2c2c3e'}`,
                borderRadius: 2,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: 14, userSelect: 'none',
              }}
            >
              {cell ? ENTITY_ICON[cell] : ''}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Implement GameAreaPreview.tsx**

```typescript
// apps/calibrator/src/components/WaveEditor/GameAreaPreview.tsx
import React from 'react'

export function GameAreaPreview() {
  return (
    <div
      style={{
        flex: 1,
        background: '#0a0a14',
        border: '1px dashed #2c2c3e',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ color: '#2c2c3e', fontSize: 10 }}>game area — terrain (futuro)</span>
    </div>
  )
}
```

- [ ] **Step 7: Run — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/SpawnZoneGrid.test.tsx --no-coverage
```

- [ ] **Step 8: Commit**

```bash
git add apps/calibrator/src/components/WaveEditor/ \
        apps/calibrator/src/__tests__/SpawnZoneGrid.test.tsx
git commit -m "[CAL] feat(s7): add SpawnZoneGrid, EntityToolbox, PatternPicker, GameAreaPreview"
```

---

### Task 16: WaveEditor + EditorPane (orchestrator)

**Files:**
- Create: `apps/calibrator/src/components/WaveEditor/WaveEditor.tsx`
- Create: `apps/calibrator/src/components/WaveEditor/EditorPane.tsx`
- Create: `apps/calibrator/src/__tests__/WaveEditor.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/calibrator/src/__tests__/WaveEditor.test.tsx
import React from 'react'
import { render, screen } from '@testing-library/react'
import { WaveEditor } from '../components/WaveEditor/WaveEditor'
import type { Grid } from '../lib/schemas'

const wave = {
  id: 1, levelId: 1, order: 1, delay: 3.0,
  grid: [Array(12).fill(null)] as Grid,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('WaveEditor', () => {
  it('renders the spawn zone grid', () => {
    render(
      <WaveEditor
        wave={wave}
        userPatterns={[]}
        onWaveChange={jest.fn()}
        onSavePattern={jest.fn()}
      />
    )
    const cells = screen.getAllByTestId('grid-cell')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('renders the entity toolbox buttons', () => {
    render(
      <WaveEditor
        wave={wave}
        userPatterns={[]}
        onWaveChange={jest.fn()}
        onSavePattern={jest.fn()}
      />
    )
    expect(screen.getByTitle('Grunt')).toBeInTheDocument()
    expect(screen.getByTitle('Shield')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run — verify fail**

```bash
cd apps/calibrator && npx jest src/__tests__/WaveEditor.test.tsx --no-coverage
```

- [ ] **Step 3: Implement WaveEditor.tsx**

```typescript
// apps/calibrator/src/components/WaveEditor/WaveEditor.tsx
'use client'
import React, { useState, useCallback } from 'react'
import { EntityToolbox } from './EntityToolbox'
import { PatternPicker } from './PatternPicker'
import { SpawnZoneGrid } from './SpawnZoneGrid'
import { GameAreaPreview } from './GameAreaPreview'
import type { EntityType, Grid } from '../../lib/schemas'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown; createdAt: Date; updatedAt: Date }
type UserPattern = { id: number; name: string; grid: unknown }

interface WaveEditorProps {
  wave: Wave
  userPatterns: UserPattern[]
  onWaveChange: (waveId: number, grid: Grid) => void
  onSavePattern: (name: string, grid: Grid) => void
}

const DEFAULT_ROWS = 4
const DEFAULT_COLS = 12

function ensureGrid(raw: unknown): Grid {
  if (Array.isArray(raw) && raw.length > 0) return raw as Grid
  return Array.from({ length: DEFAULT_ROWS }, () => Array(DEFAULT_COLS).fill(null))
}

export function WaveEditor({ wave, userPatterns, onWaveChange, onSavePattern }: WaveEditorProps) {
  const [grid, setGrid] = useState<Grid>(() => ensureGrid(wave.grid))
  const [selectedEntity, setSelectedEntity] = useState<EntityType | 'eraser'>('grunt')

  const handleGridChange = useCallback((newGrid: Grid) => {
    setGrid(newGrid)
    onWaveChange(wave.id, newGrid)
  }, [wave.id, onWaveChange])

  const enemyCount = grid.flat().filter(Boolean).length

  return (
    <div style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
      <EntityToolbox selected={selectedEntity} onSelect={setSelectedEntity} />
      <PatternPicker
        userPatterns={userPatterns}
        selectedEntity={selectedEntity === 'eraser' ? 'grunt' : selectedEntity}
        enemyCount={enemyCount || 4}
        onApplyPattern={handleGridChange}
        onSavePattern={name => onSavePattern(name, grid)}
      />
      <SpawnZoneGrid
        grid={grid}
        selectedEntity={selectedEntity}
        onGridChange={handleGridChange}
      />
      <GameAreaPreview />
    </div>
  )
}
```

- [ ] **Step 4: Implement EditorPane.tsx**

```typescript
// apps/calibrator/src/components/WaveEditor/EditorPane.tsx
'use client'
import React, { useState, useCallback, useTransition } from 'react'
import { WaveStatsPanel } from '../WaveStatsPanel/WaveStatsPanel'
import { WaveEditor } from './WaveEditor'
import { updateWaveAction } from '../../../app/actions/wave.actions'
import { updateLevelParamsAction } from '../../../app/actions/level.actions'
import { savePatternAction } from '../../../app/actions/pattern.actions'
import type { Grid } from '../../lib/schemas'

type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown; createdAt: Date; updatedAt: Date }
type Level = {
  id: number; phaseId: number; name: string; index: number;
  enemySpeed: number; shotDelay: number; fuelDrain: number;
  enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number;
  hasPowerUps: boolean; parallaxTheme: string | null; createdAt: Date; updatedAt: Date;
  waves: Wave[];
}
type UserPattern = { id: number; name: string; grid: unknown; createdAt: Date }

interface EditorPaneProps {
  level: Level
  initialWave: Wave
  patterns: UserPattern[]
}

export function EditorPane({ level, initialWave, patterns }: EditorPaneProps) {
  const [currentLevel, setCurrentLevel] = useState(level)
  const [selectedWave] = useState(initialWave)  // controlled by parent via key prop
  const [userPatterns, setUserPatterns] = useState(patterns)
  const [, startTransition] = useTransition()

  // Debounce timer ref
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleWaveChange = useCallback((waveId: number, grid: Grid) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        await updateWaveAction(waveId, { grid })
      })
    }, 500)
  }, [])

  const handleLevelParamChange = useCallback((name: string, value: number) => {
    setCurrentLevel(prev => ({ ...prev, [name]: value }))
    startTransition(async () => {
      await updateLevelParamsAction(level.id, { [name]: value })
    })
  }, [level.id])

  async function handleSavePattern(name: string, grid: Grid) {
    const saved = await savePatternAction({ name, grid })
    setUserPatterns(prev => [saved as UserPattern, ...prev])
  }

  if (!selectedWave) return <div style={{ padding: 40, color: '#555' }}>No waves. Add a wave to begin.</div>

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      <WaveStatsPanel
        wave={selectedWave}
        level={currentLevel}
        onLevelParamChange={handleLevelParamChange}
      />
      <WaveEditor
        wave={selectedWave}
        userPatterns={userPatterns}
        onWaveChange={handleWaveChange}
        onSavePattern={handleSavePattern}
      />
    </div>
  )
}
```

- [ ] **Step 5: Run — verify pass**

```bash
cd apps/calibrator && npx jest src/__tests__/WaveEditor.test.tsx --no-coverage
```

- [ ] **Step 6: Run all calibrator tests**

```bash
cd apps/calibrator && npx jest --no-coverage
```

Expected: All tests pass (no regressions on existing tests)

- [ ] **Step 7: Commit**

```bash
git add apps/calibrator/src/components/WaveEditor/WaveEditor.tsx \
        apps/calibrator/src/components/WaveEditor/EditorPane.tsx \
        apps/calibrator/src/__tests__/WaveEditor.test.tsx
git commit -m "[CAL] feat(s7): add WaveEditor and EditorPane — full interactive grid with debounced save"
```

---

### Task 17: Final integration + build verification

**Files:**
- Verify: all existing tests still pass
- Verify: `npm run build` succeeds
- Update: `docs/ROADMAP.md`

- [ ] **Step 1: Run full test suite from monorepo root**

```bash
cd /path/to/space-invaders && npm test
```

Expected: All packages green. If calibrator tests fail, fix before proceeding.

- [ ] **Step 2: Run TypeScript build check**

```bash
cd apps/calibrator && npx tsc --noEmit
```

Expected: Zero errors. Fix any type errors before proceeding.

- [ ] **Step 3: Start Docker and dev server, verify dashboard loads**

```bash
cd apps/calibrator
docker compose up -d
npx prisma migrate deploy
npx ts-node --project tsconfig.json prisma/seed.ts
npm run dev
```

Open http://localhost:3001/dashboard — verify:
- Sidebar renders with "Planeta Xeron"
- Phases and levels appear after clicking
- Navigation to /dashboard/1/1/1 loads WaveChipBar and EditorPane
- Grid renders 4 rows × 12 columns of empty cells
- Clicking a cell places a grunt emoji
- Clicking an occupied cell removes it
- Pattern buttons fill the grid

- [ ] **Step 4: Update ROADMAP.md**

In `docs/ROADMAP.md`, update Sprint 7 entry to `🚧 In Progress (PR #N)`.

- [ ] **Step 5: Commit and open PR**

```bash
git add docs/ROADMAP.md
git commit -m "[CAL] docs(s7): update ROADMAP — dashboard wave editor in progress"
```

Open PR targeting `master` with title:
```
[CAL] feat(s7): dashboard wave editor — World→Phase→Level→Wave with PostgreSQL
```

PR description must follow the format in CLAUDE.md.
