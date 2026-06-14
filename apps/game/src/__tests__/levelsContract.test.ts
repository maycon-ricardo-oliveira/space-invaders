import { EntityRegistry, JsonLevelSource } from '@si/level-engine'
import type { EntityType } from '@si/level-engine'
import { registerEntities } from '../entities/registerEntities'
import { GameLoop, CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/GameLoop'
import {
  getLevelSource,
  initLevelSource,
  resetLevelSourceForTests,
} from '../levels/source'

// Generic artifact contract. This suite asserts the BEHAVIOUR that any valid
// levels.json must honour — it iterates every level the artifact ships and
// derives every expectation from the artifact + the entity registry. No seed
// number is hardcoded, so editing content in the dashboard and re-exporting a
// different levels.json (1 level or 100) keeps this green; it only goes red
// when the contract is actually violated.
describe('levels.json artifact contract (generic over any valid artifact)', () => {
  // A throwaway registry that mirrors the one the game wires up, so we can read
  // the canonical stats for any entity type without touching production state.
  function buildRegistry(): EntityRegistry {
    const registry = new EntityRegistry()
    registerEntities({ registerEntityType: t => registry.register(t) })
    return registry
  }

  const registry = buildRegistry()

  // The stats the GameLoop is expected to surface for a spawned enemy, derived
  // straight from what registerEntities() declares for that entityTypeId. This
  // is the guard for the JsonLevelSource bug (unresolved props): if the source
  // ever stops resolving properties, the enemy falls back to GameLoop defaults
  // and these derived expectations stop matching.
  function expectedStats(entityType: EntityType) {
    const p = entityType.properties
    return {
      hp: p.hp as number,
      xpValue: p.xpValue as number,
      burstCount: p.burstCount as number,
      speedMultiplier: p.speedMultiplier as number,
      movementType: p.movementType as 'horizontal' | 'vertical',
      dropsPickup: (p.dropsPickup ?? null) as 'damage' | null,
    }
  }

  // The non-pickup placements of a wave, in artifact order.
  function enemyPlacements(entities: { entityTypeId: string }[]) {
    return entities.filter(e => e.entityTypeId !== 'fuel-pickup')
  }

  // Assert that the live enemy set matches, type-for-type and stat-for-stat,
  // the placements of a given wave — pulling expectations from the registry.
  function assertSpawnMatchesWave(
    enemies: ReturnType<GameLoop['getState']>['enemies'],
    waveEntities: { entityTypeId: string }[],
  ) {
    const placements = enemyPlacements(waveEntities)
    expect(enemies.length).toBe(placements.length)

    enemies.forEach((enemy, i) => {
      const typeId = placements[i].entityTypeId
      expect(enemy.typeId).toBe(typeId)
      const type = registry.get(typeId)
      expect(type).toBeDefined()
      expect(enemy).toMatchObject(expectedStats(type!))
    })
  }

  // Drive the GameLoop through the current wave the way the game does: sweep
  // the ship auto-firing until every enemy is destroyed, so checkWinLose()
  // fires wave:cleared and arms advanceWave(). No private state is touched.
  // Killing enough enemies crosses the XP threshold and flips status to
  // 'card_selection', which suspends update()/fire() — so we resume from it
  // the same way GameScreen does once a card is picked. A frame budget guards
  // against an infinite loop if the clear ever regresses.
  function clearCurrentWave(loop: GameLoop) {
    loop.setFiring(true)
    let direction = 1
    for (let frame = 0; frame < 8000; frame++) {
      if (loop.getState().status === 'card_selection') loop.resumeFromCardSelection()
      if (direction === 1) loop.moveRight(16)
      else loop.moveLeft(16)
      const p = loop.getState().player
      if (p.x <= 0) direction = 1
      if (p.x >= 358) direction = -1
      loop.fire()
      loop.update(16)
      const enemies = loop.getState().enemies
      if (enemies.length > 0 && enemies.every(e => !e.alive)) return
    }
    throw new Error('clearCurrentWave: wave was not cleared within the frame budget')
  }

  beforeAll(async () => {
    resetLevelSourceForTests()
    await initLevelSource()
  })

  afterAll(() => {
    resetLevelSourceForTests()
  })

  it('the committed artifact passes the engine fence on load', async () => {
    // initLevelSource() runs JsonLevelSource.load(), which runs validateLevels().
    // If the artifact were invalid, the beforeAll above would have rejected and
    // this resolve would never happen. Re-prove the fence here explicitly.
    resetLevelSourceForTests()
    await expect(initLevelSource()).resolves.toBeDefined()
  })

  it('the artifact ships at least one level', () => {
    expect(getLevelSource().listLevels().length).toBeGreaterThan(0)
  })

  it('the game registry is exactly the canonical set', () => {
    expect(registry.getAll().map(t => t.id).sort()).toEqual([
      'asteroid',
      'basic-enemy',
      'fast-enemy',
      'strong-enemy',
    ])
  })

  describe('every level honours the wave + spawn + stats contract', () => {
    const summaries = getLevelSourceSummaries()

    // Build the cases eagerly so each level gets its own named test.
    summaries.forEach(summary => {
      describe(`level ${summary.id}`, () => {
        it('has well-formed waves (>=1 wave, each order int>=1 and delay>=0)', () => {
          const level = getLevelSource().getLevel(summary.id)
          expect(Array.isArray(level.waves)).toBe(true)
          expect(level.waves!.length).toBeGreaterThanOrEqual(1)
          level.waves!.forEach(wave => {
            expect(Number.isInteger(wave.order)).toBe(true)
            expect(wave.order).toBeGreaterThanOrEqual(1)
            expect(wave.delay).toBeGreaterThanOrEqual(0)
          })
        })

        it('spawns ONLY wave 1 at start with registry-resolved stats', () => {
          const level = getLevelSource().getLevel(summary.id)
          const loop = new GameLoop(level)
          const state = loop.getState()

          // Per-wave spawn: only wave 1, count derived from the artifact.
          assertSpawnMatchesWave(state.enemies, level.waves![0].entities)

          expect(state.currentWave).toBe(1)
          expect(state.totalWaves).toBe(level.waves!.length)
        })

        it('advances through every subsequent wave with resolved stats', () => {
          const level = getLevelSource().getLevel(summary.id)
          if (level.waves!.length < 2) {
            // Single-wave level: nothing to advance — the start spawn test covers it.
            return
          }
          const loop = new GameLoop(level)

          for (let w = 1; w < level.waves!.length; w++) {
            clearCurrentWave(loop)
            loop.update(16)
            loop.advanceWave()
            const state = loop.getState()
            expect(state.currentWave).toBe(w + 1)
            expect(state.totalWaves).toBe(level.waves!.length)
            assertSpawnMatchesWave(state.enemies, level.waves![w].entities)
          }
        })

        it('keeps every spawned entity inside the game bounds', () => {
          const level = getLevelSource().getLevel(summary.id)
          // Check the spawn set of every wave, not just wave 1.
          level.waves!.forEach((wave, w) => {
            const loop = new GameLoop(level)
            // Fast-forward to wave w by clearing the preceding waves.
            for (let prev = 1; prev <= w; prev++) {
              clearCurrentWave(loop)
              loop.update(16)
              loop.advanceWave()
            }
            const enemies = loop.getState().enemies
            enemies.forEach(e => {
              expect(e.x).toBeGreaterThanOrEqual(0)
              expect(e.x).toBeLessThanOrEqual(CANVAS_WIDTH)
              expect(e.y).toBeGreaterThanOrEqual(0)
              expect(e.y).toBeLessThanOrEqual(CANVAS_HEIGHT)
            })
          })
        })
      })
    })
  })

  // Strong proof of registry stat resolution (the bug the contract test caught):
  // pick a real non-basic enemy from the artifact if one exists, otherwise fall
  // back to any enemy present, and assert its live stats equal the registry's.
  it('resolves enemy stats from the registry (non-basic preferred)', () => {
    const all = collectSpawnedEnemyAcrossArtifact()
    expect(all.length).toBeGreaterThan(0)

    const nonBasic = all.find(e => e.typeId !== 'basic-enemy')
    const target = nonBasic ?? all[0]
    const type = registry.get(target.typeId)
    expect(type).toBeDefined()

    // The live enemy carries EXACTLY the registry stats — proves props were
    // resolved by JsonLevelSource rather than coming from GameLoop fallbacks.
    expect(target).toMatchObject(expectedStats(type!))
  })
})

// listLevels() needs the source initialized; this runs at describe-build time,
// after the module-level initLevelSource() in beforeAll has NOT yet run for the
// nested describe iteration. To keep the per-level describes static we load a
// throwaway source synchronously-resolved here.
function getLevelSourceSummaries() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const levelsData = require('../levels.json')
  // Summaries can be read straight from the JSON shape (id present on each level)
  // without needing the async-loaded singleton — keeps the test tree static.
  return (levelsData as Array<{ id: string }>).map(l => ({ id: l.id }))
}

// Collect the wave-1 spawn (which is what the GameLoop builds at construction)
// for every level, flattened. Used by the strong stat-resolution proof.
function collectSpawnedEnemyAcrossArtifact() {
  const out: ReturnType<GameLoop['getState']>['enemies'] = []
  for (const summary of getLevelSourceSummaries()) {
    const level = getLevelSource().getLevel(summary.id)
    const loop = new GameLoop(level)
    out.push(...loop.getState().enemies)
  }
  return out
}
