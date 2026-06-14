import { worldToLevelDefinitions, type PlainWorld } from '../services/worldToLevelDefinitions'
import { PHONE_WIDTH, GRID_COLS, GRID_ROWS, PLAYER_SPAWN_ROW, CELL_HEIGHT_EXPORT } from '../lib/gridConstants'

// CANVAS_WIDTH the game validates against (packages/level-engine validateLevels.ts).
// Any exported entity x must stay within [0, CANVAS_WIDTH].
const CANVAS_WIDTH = PHONE_WIDTH // 390
// CANVAS_HEIGHT the game validates against. Any exported entity y must stay within
// [0, CANVAS_HEIGHT]. The player row (row 21) maps to y = 21*40 + 20 = 860 > 844.
const CANVAS_HEIGHT = 844

const world: PlainWorld = {
  phases: [{
    index: 0,
    status: 'published',
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

  it('sorts waves by order before flattening', () => {
    const shuffled: PlainWorld = {
      phases: [{ index: 0, status: 'published', levels: [{
        index: 0, enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
        enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
        waves: [
          { order: 2, delay: 3, grid: [[null, 'asteroid']] },
          { order: 1, delay: 0, grid: [['basic-enemy']] },
        ],
      }] }],
    }
    const [level] = worldToLevelDefinitions(shuffled)
    expect(level.entities.map(e => e.entityTypeId)).toEqual(['basic-enemy', 'asteroid'])
  })

  // Fix 4: phases/levels out of order → ids still reflect index
  it('sorts phases and levels by index so ids reflect index order, not arrival order', () => {
    const outOfOrder: PlainWorld = {
      phases: [
        {
          index: 1,
          status: 'published',
          levels: [{
            index: 0, enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
            enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: false,
            waves: [{ order: 1, delay: 0, grid: [['basic-enemy']] }],
          }],
        },
        {
          index: 0,
          status: 'published',
          levels: [{
            index: 0, enemySpeed: 1, shotDelay: 2, fuelDrain: 5,
            enemyShotSpeed: 3, enemyAngerDelay: 10, enemySpawnDelay: 2, hasPowerUps: true,
            waves: [{ order: 1, delay: 0, grid: [['fast-enemy']] }],
          }],
        },
      ],
    }
    const levels = worldToLevelDefinitions(outOfOrder)
    // phase index 0 must come first → first level id is 'story-1-1'
    expect(levels[0].id).toBe('story-1-1')
    expect(levels[0].entities[0].entityTypeId).toBe('fast-enemy')
    expect(levels[1].id).toBe('story-2-1')
    expect(levels[1].entities[0].entityTypeId).toBe('basic-enemy')
  })

  // Fix 4: level with waves: [] → entities [], numberOfEnemies 0
  it('handles level with no waves: entities is empty and numberOfEnemies is 0', () => {
    const emptyWaves: PlainWorld = {
      phases: [{
        index: 0,
        status: 'published',
        levels: [{
          index: 0, enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
          enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: false,
          waves: [],
        }],
      }],
    }
    const [level] = worldToLevelDefinitions(emptyWaves)
    expect(level.entities).toHaveLength(0)
    expect(level.params.numberOfEnemies).toBe(0)
  })

  // Fix 4: world with phases: [] → returns []
  it('returns empty array when world has no phases', () => {
    const emptyWorld: PlainWorld = { phases: [] }
    expect(worldToLevelDefinitions(emptyWorld)).toEqual([])
  })

  // Fix 4: strengthen position assert — first entity at col 0, row 0.
  // Derive from the source of truth (gridConstants), now 12 columns — not a
  // local hardcoded 11. The test must follow GRID_COLS, not freeze the old base.
  it('places first entity at the correct pixel position (col 0, row 0)', () => {
    const CELL_WIDTH = PHONE_WIDTH / GRID_COLS
    const CELL_HEIGHT = CELL_HEIGHT_EXPORT
    const [level] = worldToLevelDefinitions(world)
    // basic-enemy is at col 0, row 0 of wave 1
    expect(level.entities[0].x).toBeCloseTo(CELL_WIDTH / 2)
    expect(level.entities[0].y).toBe(CELL_HEIGHT / 2)
  })

  // Regression lock (GRID-12): the editor grid is GRID_COLS wide (12). An entity
  // placed in the LAST column (GRID_COLS - 1) must export to an x that still
  // lands inside the game canvas [0, CANVAS_WIDTH]. With the old EXPORT_COLS=11
  // base the 12th column maps to x ≈ 408 > 390 and falls off-screen. This bug
  // does not come back.
  it('exports last-column entities within game canvas bounds (no off-screen x)', () => {
    const lastCol = GRID_COLS - 1
    const row: (string | null)[] = Array(GRID_COLS).fill(null)
    row[lastCol] = 'basic-enemy'
    const lastColWorld: PlainWorld = {
      phases: [{
        index: 0,
        status: 'published',
        levels: [{
          index: 0, enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
          enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
          waves: [{ order: 1, delay: 0, grid: [row] }],
        }],
      }],
    }
    const [level] = worldToLevelDefinitions(lastColWorld)
    expect(level.entities).toHaveLength(1)
    for (const entity of level.entities) {
      expect(entity.x).toBeGreaterThanOrEqual(0)
      expect(entity.x).toBeLessThanOrEqual(CANVAS_WIDTH)
    }
  })

  // Regression (PLAYER-ROW): the editor grid is GRID_ROWS tall (22). The LAST row
  // (PLAYER_SPAWN_ROW = 21) is the reserved player spawn line. It maps to
  // y = 21*40 + 20 = 860, which is OUTSIDE the game canvas [0, CANVAS_HEIGHT=844].
  // Export must SKIP every cell on the player row — no placement, no off-screen y.
  // Esse bug (entidade na última linha estourando os bounds e barrando o export) não volta.
  describe('player-row export guard', () => {
    // A full-height grid with one entity on the LAST (player) row and one on a
    // normal row. Only the normal-row entity must survive the export.
    function gridWithPlayerRowEntity(): (string | null)[][] {
      const grid: (string | null)[][] = Array.from({ length: GRID_ROWS }, () =>
        Array(GRID_COLS).fill(null)
      )
      grid[0][0] = 'basic-enemy'           // normal row → must export
      grid[PLAYER_SPAWN_ROW][0] = 'asteroid' // player row → must be skipped
      return grid
    }

    const worldWithPlayerRow: PlainWorld = {
      phases: [{
        index: 0,
        status: 'published',
        levels: [{
          index: 0, enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
          enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
          waves: [{ order: 1, delay: 0, grid: gridWithPlayerRowEntity() }],
        }],
      }],
    }

    it('does not emit a placement for an entity on the player row', () => {
      const [level] = worldToLevelDefinitions(worldWithPlayerRow)
      // Only the normal-row basic-enemy survives; the player-row asteroid is dropped.
      expect(level.entities).toHaveLength(1)
      expect(level.entities[0].entityTypeId).toBe('basic-enemy')
      expect(level.entities.map(e => e.entityTypeId)).not.toContain('asteroid')
    })

    it('emits no entity with a y outside the game canvas bounds', () => {
      const [level] = worldToLevelDefinitions(worldWithPlayerRow)
      for (const entity of level.entities) {
        expect(entity.y).toBeGreaterThanOrEqual(0)
        expect(entity.y).toBeLessThanOrEqual(CANVAS_HEIGHT)
      }
    })
  })

  // Publication gate: export only includes phases with status === 'published'.
  // A draft phase contributes nothing — no levels, no waves.
  describe('publication filter', () => {
    const draftPhase = {
      index: 0,
      status: 'draft' as const,
      levels: [{
        index: 0, enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
        enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
        waves: [{ order: 1, delay: 0, grid: [['basic-enemy']] }],
      }],
    }
    const publishedPhase = {
      index: 1,
      status: 'published' as const,
      levels: [{
        index: 0, enemySpeed: 1, shotDelay: 2, fuelDrain: 5,
        enemyShotSpeed: 3, enemyAngerDelay: 10, enemySpawnDelay: 2, hasPowerUps: false,
        waves: [{ order: 1, delay: 0, grid: [['fast-enemy']] }],
      }],
    }

    it('includes only the published phase when one phase is draft and one is published', () => {
      const mixed: PlainWorld = { phases: [draftPhase, publishedPhase] }
      const levels = worldToLevelDefinitions(mixed)
      // only the published phase (index 1 → story-2-1) survives
      expect(levels).toHaveLength(1)
      expect(levels[0].id).toBe('story-2-1')
      expect(levels[0].entities.map((e) => e.entityTypeId)).toEqual(['fast-enemy'])
    })

    it('returns [] when every phase is draft', () => {
      const allDraft: PlainWorld = { phases: [draftPhase, { ...draftPhase, index: 1 }] }
      expect(worldToLevelDefinitions(allDraft)).toEqual([])
    })
  })
})
