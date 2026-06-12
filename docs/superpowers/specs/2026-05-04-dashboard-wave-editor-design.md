# Dashboard Wave Editor — Design Spec

> **Status:** Approved — ready for implementation planning

## Goal

Build a unified web dashboard inside `apps/calibrator` (Next.js 14) for editing the full game content hierarchy: World → Phase → Level → Wave. Backed by a local PostgreSQL database (Docker), accessed via Prisma ORM and a service layer with Zod validation. The game continues consuming `levels.json` unchanged — an Export button generates it from the DB.

---

## Architecture

### Layer Stack

```
React Component
  → Service (pure TypeScript + Zod)   ← validation + documentation
      → Server Action (thin adapter)
          → Prisma ORM
              → PostgreSQL (Docker)
```

**Principle:** Business logic lives entirely in services (pure TS, testable with Jest). Server Actions are thin wrappers — they call one service function and return the result. Components never call Prisma directly.

### Service Layer

| File | Responsibility |
|---|---|
| `WorldService.ts` | CRUD for worlds |
| `PhaseService.ts` | CRUD for phases within a world |
| `LevelService.ts` | CRUD for levels + LevelParams |
| `WaveService.ts` | CRUD for waves + reorder |
| `PatternService.ts` | CRUD for user-saved patterns |
| `WavePatternGenerator.ts` | Pure TS — generates grid from system pattern type |
| `WaveScoreCalculator.ts` | Pure TS — computes wave difficulty score from grid |
| `ExportService.ts` | Reads full hierarchy from DB → writes `levels.json` |

`WavePatternGenerator` and `WaveScoreCalculator` are zero-dependency pure functions — no Prisma, no network.

### Server Actions (~19 total)

Grouped by domain:

| File | Actions |
|---|---|
| `world.actions.ts` | `getWorlds`, `createWorld`, `updateWorld` |
| `phase.actions.ts` | `getPhases`, `createPhase`, `updatePhase`, `deletePhase` |
| `level.actions.ts` | `getLevels`, `getLevel`, `createLevel`, `updateLevelParams`, `deleteLevel` |
| `wave.actions.ts` | `createWave`, `updateWave`, `deleteWave`, `reorderWaves` |
| `pattern.actions.ts` | `getPatterns`, `savePattern`, `deletePattern` |
| `export.actions.ts` | `exportToJson` |

---

## Database Schema (Prisma)

### Hierarchy

```
World (1)
  └── Phase (10 per World)
        └── Level (10 per Phase = 100 per World)
              └── Wave (10 per Level)
```

### Models

```prisma
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

  // LevelParams (embedded — always 1:1 with level)
  enemySpeed      Float    @default(2.0)
  shotDelay       Float    @default(1.5)
  fuelDrain       Float    @default(8.0)
  enemyShotSpeed  Float    @default(4.0)
  enemyAngerDelay Float    @default(15.0)
  enemySpawnDelay Float    @default(1.0)
  hasPowerUps     Boolean  @default(true)
  parallaxTheme   String?  // override do world (futuro — terrain sprint)

  waves           Wave[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([phaseId, index])
}

model Wave {
  id        Int      @id @default(autoincrement())
  levelId   Int
  level     Level    @relation(fields: [levelId], references: [id], onDelete: Cascade)
  order     Int                           // 1–10
  delay     Float    @default(3.0)        // seconds after previous wave
  grid      Json                          // (EntityType | null)[][] — 12 cols × N rows

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([levelId, order])
}

model Pattern {
  id        Int      @id @default(autoincrement())
  name      String                        // "Invasão Diagonal", "Boss Rush"
  grid      Json                          // same format as Wave.grid

  createdAt DateTime @default(now())
}
```

### Grid format

```typescript
// 12 columns (game width) × up to 4 rows (spawn zone)
type Grid = (EntityType | null)[][]

// EntityType matches the game's registered entity types
type EntityType = 'grunt' | 'rocket' | 'shield' | 'rock'
```

---

## Zod Schemas (`src/lib/schemas.ts`)

```typescript
export const EntityTypeSchema = z.enum(['grunt', 'rocket', 'shield', 'rock'])
export const GridSchema = z.array(z.array(EntityTypeSchema.nullable()))

export const LevelParamsSchema = z.object({
  enemySpeed:      z.number().min(1).max(5),
  shotDelay:       z.number().min(0.5).max(3.0),
  fuelDrain:       z.number().min(1).max(20),
  enemyShotSpeed:  z.number().min(2).max(8),
  enemyAngerDelay: z.number().min(5).max(30),
  enemySpawnDelay: z.number().min(0.3).max(2),
  hasPowerUps:     z.boolean(),
})

export const WaveInputSchema = z.object({
  order:  z.number().int().min(1).max(10),
  delay:  z.number().min(0).max(30),
  grid:   GridSchema,
})

export const PatternInputSchema = z.object({
  name: z.string().min(1).max(50),
  grid: GridSchema,
})

export const WorldInputSchema = z.object({
  name:          z.string().min(1).max(100),
  index:         z.number().int().min(0),
  image:         z.string().optional(),
  parallaxTheme: z.string().optional(),
})

export const PhaseInputSchema = z.object({
  name:  z.string().min(1).max(100),
  index: z.number().int().min(0).max(9),
})

export const LevelInputSchema = z.object({
  name:  z.string().min(1).max(100),
  index: z.number().int().min(0).max(9),
  ...LevelParamsSchema.shape,
})
```

---

## Pattern System

### System Patterns (`WavePatternGenerator.ts`)

Generated in pure TypeScript — no DB access. Parameterized by entity type and count.

| Pattern | Description |
|---|---|
| `line` | horizontal row of N enemies |
| `column` | vertical column |
| `square` | M×N rectangle |
| `v-shape` | V pointing downward |
| `diamond` | diamond shape |
| `diagonal` | diagonal left or right |
| `zigzag` | horizontal zigzag |

### User Patterns (`PatternService.ts`)

Saved in the `Pattern` table. User can:
- Apply any grid state to a wave → saves as named pattern
- Load a saved pattern → populates wave grid
- Delete patterns

### Pattern Picker UI

Dropdown with two groups:
1. **System** — Line, V-shape, Diamond, Diagonal, Zigzag (generated, not saved)
2. **My Patterns** — user-saved patterns from DB

---

## Wave Score Calculator (`WaveScoreCalculator.ts`)

Composition-based score — reflects actual wave difficulty, not level position.

```typescript
// Weights per entity type
const TYPE_WEIGHT = { grunt: 1, rock: 1.5, rocket: 2, shield: 3 }

// Pattern difficulty multiplier
const PATTERN_MULTIPLIER = { line: 1.0, column: 1.1, square: 1.2,
                              v_shape: 1.3, diagonal: 1.3,
                              zigzag: 1.4, diamond: 1.5, custom: 1.0 }

// waveScore = Σ(count[type] × typeWeight[type]) × patternMultiplier × delayPenalty
// normalized to [0, 100]
// delayPenalty = lower delay = harder (inverse scale)
```

Score shown on:
- Each `WaveChip` in the chip bar
- `ScoreCard` in `WaveStatsPanel`

The existing `computeDifficultyScore` in `packages/level-engine` is unchanged — the game still uses the position-based score for `CalibratorStrategy`. The composition score is a dashboard-only feature (exported as an optional field in `levels.json` for future use).

---

## UI Components

### Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ WaveChipBar: [ W1 47 ] [ W2 62 ] [ W3 … ] … [ W10 91 ] [+Add Wave] │
├────────────┬──────────────────────┬────────────────────────────────┤
│  Sidebar   │   WaveStatsPanel     │         WaveEditor             │
│  ~140px    │     20–30%           │         remaining              │
│            │                      │                                │
│ ModuleNav  │ WaveInfo             │ EntityToolbox                  │
│ World sel  │ ScoreCard            │ PatternPicker                  │
│ Phase list │ LevelParamsSliders   │ SpawnZoneGrid (editable)       │
│ Level list │                      │ GameAreaPreview (read-only)    │
└────────────┴──────────────────────┴────────────────────────────────┘
```

### Component Tree

```
DashboardLayout
├── Sidebar
│   ├── ModuleNav (Worlds | Analytics)
│   ├── WorldSelector (dropdown)
│   ├── PhaseList (Phase 1–10, clickable)
│   └── LevelList (Level 1–10, clickable)
│
├── WaveChipBar
│   └── WaveChip ×10  (label + score)
│
└── EditorPane
    ├── WaveStatsPanel
    │   ├── WaveInfo (delay, enemy count)
    │   ├── ScoreCard (WaveScoreCalculator output)
    │   └── LevelParamsSliders (speed, shot delay, fuel drain)
    │
    └── WaveEditor
        ├── EntityToolbox (grunt | rocket | shield | rock | eraser)
        ├── PatternPicker (system + user patterns)
        ├── SpawnZoneGrid (12×N editable grid)
        └── GameAreaPreview (read-only lower canvas area)
```

### Grid Interactions

| Action | Result |
|---|---|
| Click empty cell | place selected entity |
| Click occupied cell | remove entity |
| Select system pattern | fills grid immediately |
| Select user pattern | loads saved grid |
| Edit cell after pattern | changes only that cell (custom mode) |
| Click "Save as pattern" | modal → name input → `savePattern` |

### SpawnZoneGrid Proportions

```
┌──────────────────────────┐  ← SpawnZoneGrid (editable)
│  12 columns × 4 rows     │    ~32px cells
│  proportional to 390px   │    top of game canvas
├──────────────────────────┤
│  GameAreaPreview         │    read-only, dimmed
│  (terrain — future)      │    bottom of canvas
└──────────────────────────┘
```

---

## Data Flow

### Wave Editor (save on change)

```
SpawnZoneGrid (cell click)
  → local state update (optimistic, immediate)
  → debounce 500ms
  → WaveService.updateWave(waveId, { grid })   ← Zod validates
      → wave.actions.ts updateWave (Server Action)
          → prisma.wave.update()
              → PostgreSQL
  → WaveScoreCalculator.compute(grid)
      → ScoreCard re-renders
```

### Export

```
"Export levels.json" button
  → ExportService.generateJson(worldId)
      → fetch World → Phases → Levels → Waves from DB
      → map to LevelDefinition[] (game format)
      → write to apps/game/src/assets/levels.json
  → toast "levels.json updated"
```

---

## File Structure

```
apps/calibrator/
├── docker-compose.yml               # PostgreSQL service
├── prisma/
│   ├── schema.prisma                # World, Phase, Level, Wave, Pattern
│   └── seed.ts                      # 1 world, 1 phase, 1 level, 3 waves
│
├── src/
│   ├── app/
│   │   └── dashboard/
│   │       ├── layout.tsx           # DashboardLayout + Sidebar
│   │       └── [worldId]/[phaseId]/[levelId]/
│   │           └── page.tsx         # WaveChipBar + EditorPane
│   │
│   ├── components/
│   │   ├── Sidebar/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── WorldSelector.tsx
│   │   │   ├── PhaseList.tsx
│   │   │   └── LevelList.tsx
│   │   ├── WaveChipBar/
│   │   │   ├── WaveChipBar.tsx
│   │   │   └── WaveChip.tsx
│   │   ├── WaveEditor/
│   │   │   ├── WaveEditor.tsx
│   │   │   ├── SpawnZoneGrid.tsx
│   │   │   ├── GameAreaPreview.tsx
│   │   │   ├── EntityToolbox.tsx
│   │   │   └── PatternPicker.tsx
│   │   └── WaveStatsPanel/
│   │       ├── WaveStatsPanel.tsx
│   │       ├── ScoreCard.tsx
│   │       └── LevelParamsSliders.tsx
│   │
│   ├── services/
│   │   ├── WorldService.ts
│   │   ├── PhaseService.ts
│   │   ├── LevelService.ts
│   │   ├── WaveService.ts
│   │   ├── PatternService.ts
│   │   ├── WavePatternGenerator.ts  # pure TS, zero DB
│   │   ├── WaveScoreCalculator.ts   # pure TS, zero DB
│   │   └── ExportService.ts
│   │
│   ├── actions/
│   │   ├── world.actions.ts
│   │   ├── phase.actions.ts
│   │   ├── level.actions.ts
│   │   ├── wave.actions.ts
│   │   ├── pattern.actions.ts
│   │   └── export.actions.ts
│   │
│   └── lib/
│       ├── prisma.ts                # Prisma client singleton
│       └── schemas.ts               # all Zod schemas
```

---

## Out of Scope (Future Sprints)

- **Terrain / Parallax editor** — vertical scrollable map per phase, collision shapes, parallax layers. `parallaxTheme` field reserved in `World` and `Level` for this sprint.
- **Analytics dashboard** — completion rate scatter plot, Firebase integration
- **Boss configuration** — boss type, difficulty per phase (Phase 5 Level 10, Phase 10 Level 5, Phase 10 Level 10 special cases from spec)
- **Survival mode levels** — procedurally generated, not in DB
