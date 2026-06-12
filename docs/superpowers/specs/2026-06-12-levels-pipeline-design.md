# Levels Pipeline (PIPE) — Design Spec

**Date:** 2026-06-12
**Status:** Approved (brainstorm 2026-06-12)
**Delivery:** 1 PR for the whole spec (`feat/pipe-levels-pipeline`) — per-spec PR model
**Supersedes:** the implicit "levels.json loaded at runtime" notes scattered in Sprint 2–4 code comments

---

## 1. Context & Problem

The 2026-06-12 audit found the project's central contract — calibrator → `levels.json` → game — broken at both ends, despite 7 sprints marked Done:

1. **TypeId mismatch** — the dashboard grid exports cells `'grunt' | 'rocket' | 'shield' | 'rock'` directly as `entityTypeId`; the game registry only knows `'basic-enemy' | 'fast-enemy' | 'strong-enemy' | 'asteroid'`.
2. **No stats in placements** — exported placements carry no `properties`; `GameLoop.buildEnemies()` falls back to generic defaults (hp 100, no burst, no drops).
3. **The game never reads the file** — `GameScreen` calls `LevelEngine.generate()`, which always returns `entities: []`. In practice fast/strong/asteroid and fuel pickups **never appear in the real game** — only in tests, which inject entities manually.
4. **Addressing mismatch** — the game lists 20 linear levels (`story-{i}`); the dashboard exports 100 (`story-{phase}-{level}`).

Root lesson (registered for every future chunk): module-level TDD passed while the **contract between modules** was never exercised. This spec closes the pipeline and adds the missing contract test.

## 2. Decisions (closed in brainstorm)

| # | Decision |
|---|----------|
| D1 | `levels.json` is the **source of truth for story mode**. `LevelEngine.generate()` remains procedural **for survival only**. |
| D2 | Enemy stats resolve from the **EntityRegistry** at load time; the JSON MAY carry partial `properties` that override defaults (channel for fine OTA calibration — no dashboard UI for it yet). |
| D3 | **Canonical typeIds everywhere** — the dashboard migrates to the game's ids (`basic-enemy`, `fast-enemy`, `strong-enemy`, `asteroid`). Friendly labels live in the UI only. No translation map. |
| D4 | PIPE loads **flat `entities` only**; sequential `waves` consumption is Sprint 6B (export keeps writing both fields). |
| D5 | `StoryModeScreen` lists whatever `levels.json` contains; the planet hub (10×10 grid, unlocks) stays in Sprint 10. |
| D6 | Fuel pickup: **asteroids drop fuel at level 5+** (chance-based, restores 100% tank) — same pattern as the existing damage pickup. Spec FUEL-1 alignment. |
| D7 | Loading lives behind a **`LevelSource` interface in `@si/level-engine`** (Approach A). `JsonLevelSource` now; `SupabaseLevelSource` in Sprint 14 (DB is the long-term destination — JSON is the fast test vehicle, OTA-updatable via EAS). The package stays pure: the app imports the JSON and injects the data. |
| D8 | Process: this spec ships as **one PR** (15-file rule retired). Atomic commits inside the PR. |

## 3. Architecture

```
DASHBOARD (Next.js + Prisma)
  ExportService ── worldToLevelDefinitions(world) ──▶ levels.json
        (canonical ids · typeId + x/y · waves kept for S6B · no stats)
                                │
                                │ committed artifact · Metro static import · EAS Update OTA
                                ▼
GAME STARTUP
  registerEntities(engine) ─▶ EntityRegistry (stat defaults)
  import levelsData        ─▶ new JsonLevelSource(levelsData, registry) ─▶ load() validates
                                │
  StoryModeScreen ─ listLevels()┤
  GameScreen ────── getLevel(id)┴─▶ LevelDefinition (entities resolved) ─▶ GameLoop

SURVIVAL: LevelEngine.generate() — unchanged
SPRINT 14: SupabaseLevelSource implements the same interface; game code untouched
```

### LevelSource interface (in `@si/level-engine`)

```ts
export interface LevelSummary {
  id: string
  phaseIndex: number
  levelIndex: number
  difficultyScore: number
}

export interface LevelSource {
  /** JSON source: validates synchronously-held data. Supabase source: fetches everything at startup. */
  load(): Promise<void>
  listLevels(): LevelSummary[]
  getLevel(id: string): LevelDefinition
}
```

`JsonLevelSource(data: unknown, registry: EntityRegistry)`:
- `load()` runs the contract validator (section 6) and resolves entity properties: registry defaults shallow-merged with any partial `properties` present in the JSON placement (JSON wins per key).
- Pure TS, zero native deps, zero fs/network — the app injects the imported array.

### LevelDefinition additions

`phaseIndex?: number` and `levelIndex?: number` (optional, written by the export). `levelIndex` (1–10 within the phase) drives the fuel-drop rule (D6) and future per-level logic.

## 4. Changes per workspace

### `packages/level-engine` (PIPE-1)
- `types.ts`: `LevelSource`, `LevelSummary`, `phaseIndex?`/`levelIndex?` on `LevelDefinition`.
- `src/sources/JsonLevelSource.ts`: implementation per section 3.
- `src/sources/validateLevels.ts`: hand-rolled validator (~80 lines, no new deps), aggregated error report.
- `index.ts` exports. `generate()` untouched.

### `apps/calibrator` (PIPE-2, PIPE-3)
- Canonical ids in: Zod `EntityType` enum, `prisma/seed.ts`, `WaveScoreCalculator` weight keys, `WavePatternGenerator`, `EntityToolbox` (labels "Grunt"/"Rocket"/"Shield"/"Rock" stay in UI; values become canonical). Dev-only DB → **re-seed, no data migration**.
- `ExportService`: extract pure `worldToLevelDefinitions(world)` (Prisma access stays thin); write `phaseIndex`/`levelIndex`; keep `waves`; keep output path `apps/game/src/levels.json`.
- Legacy S4 `CalibratorClient` editor: untouched; the dashboard is the canonical writer.

### `apps/game` (PIPE-4, PIPE-5)
- `src/levels/source.ts`: builds the singleton `JsonLevelSource` after `registerEntities` (explicit error if registry is empty — the startup-order gotcha becomes a self-explaining error).
- `src/levels.json`: initial file generated from the seeded dashboard and **committed** (never hand-edited; always regenerated by Export).
- `StoryModeScreen`: lists from `listLevels()` ("Fase {phase} — Level {level}"); falls back to the current 20 procedural levels when the source is empty.
- `GameScreen`: receives `levelId`, calls `getLevel(id)`; falls back to `generate()` on error (section 6).
- `GameLoop`: asteroid kill at `levelIndex >= 5` rolls a fuel-pickup drop (restores 100% tank) — same mechanism as the damage pickup. Drop chance constant (default 30%) lives next to the damage-pickup chance.

## 5. levels.json contract (example)

```json
[
  {
    "id": "story-1-3",
    "style": "classic",
    "difficultyScore": 22,
    "phaseIndex": 1,
    "levelIndex": 3,
    "entities": [
      { "entityTypeId": "fast-enemy", "x": 124.1, "y": 60 },
      { "entityTypeId": "asteroid", "x": 230.5, "y": 20,
        "properties": { "hp": 90 } }
    ],
    "waves": [ { "entities": [ ... ] } ],
    "params": { "numberOfEnemies": 12, "enemySpeed": 2, ... }
  }
]
```

- `properties` is optional and partial — only overrides; everything else resolves from the registry.
- `waves` is written today, consumed from Sprint 6B on.

## 6. Error handling

- **Aggregated validation** — the validator reports every problem with an address (`"story-2-3: unknown typeId 'grunt' at entity 4"`), never just the first.
- **Dev (`__DEV__`)** — contract error → throw with the full report. Fail fast.
- **Production** — log + per-level fallback to procedural `generate()`; the game never bricks on a bad JSON.
- **Missing/empty JSON** — `listLevels()` empty → StoryModeScreen procedural fallback (current behavior preserved).
- **Registry empty at source creation** — explicit error: "call registerEntities() before creating the LevelSource".

Validator checks: typeId registered · x/y within canvas bounds · params within calibrator ranges · `id` unique · `phaseIndex`/`levelIndex` coherent when present.

## 7. Test plan

- **Engine**: validator (unknown typeId, out-of-bounds, bad params, duplicate id, valid case) · `JsonLevelSource` (override merge, listLevels order, getLevel miss, empty-registry guard).
- **Calibrator**: `worldToLevelDefinitions` (canonical ids, phase/levelIndex, wave flattening) · updated `WaveScoreCalculator` / `WavePatternGenerator` / Zod tests.
- **Game**: fuel drop only at level 5+ (chance, 100% restore) · StoryModeScreen renders from source + empty fallback · GameScreen loads by id + error fallback.
- ⭐ **Contract e2e (Jest, no DB, no device)**: World fixture → `worldToLevelDefinitions()` → output through `JsonLevelSource` with the game's real `registerEntities` → assert `GameLoop.buildEnemies()` spawns fast/strong/asteroid with correct stats. *This is the test whose absence let the bug live for 7 sprints.*

## 8. Definition of Done

1. All tests above green (`npm test` at root).
2. Manual: edit a wave in the dashboard → Export → `npx expo start` → the edited enemies (types and positions) appear in the game; asteroid at level 5+ can drop fuel.
3. `docs/ROADMAP.md` updated in the PR.

## 9. Out of scope

- Sequential wave consumption + turbo transition → **Sprint 6B** (next chunk, plan ready).
- Planet hub / phase navigation UI → Sprint 10.
- Supabase content source + Firestore player data → Sprints 13–14 (the `LevelSource` interface is the seam).
- Stat-override UI in the dashboard (the JSON channel exists; UI later).
- CI pipeline (separate quick-win chunk).
