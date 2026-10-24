import { GameLoop, CANVAS_WIDTH, CANVAS_HEIGHT, ENTITY_SIZE } from '../game/GameLoop'
import { AutoFireSystem } from '../game/systems/autoFire'
import type { LevelDefinition } from '@si/level-engine'

/**
 * STATS-1 (Sprint 8, entrega E2) — the ship stops being a set of constants.
 *
 * `PLAYER_SPEED`, `BULLET_SPEED`, `INVINCIBILITY_DURATION` and `AUTO_FIRE_INTERVAL`
 * were module-level `const`s, so nothing could change how the ship handles: not the
 * calibrator per phase, and not a card mid-run. They now live in run state as
 * `GameState.ship`, seeded from `LevelParams`, with the old values as defaults.
 *
 * Deliberately NOT called `PlayerStats` — that name is already taken in
 * `@si/level-engine` (`types.ts:62`) by the calibration telemetry type.
 */

const BASE_PARAMS = {
  numberOfEnemies: 0,
  enemySpeed: 0,
  enemyShotDelay: 9999,
  enemyShotSpeed: 1,
  enemyAngerDelay: 30,
  enemySpawnDelay: 2,
  hasPowerUps: false,
  powerUpMinWait: 5,
  powerUpMaxWait: 15,
  fuelDrainRate: 0,
}

/** The values the ship used to have hardcoded. */
const DEFAULTS = {
  moveSpeed: 300,
  bulletSpeed: 500,
  invincibilityMs: 1500,
  autoFireIntervalMs: 400,
}

const PLAYER_X = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
const PLAYER_Y = CANVAS_HEIGHT - ENTITY_SIZE - 20

function level(params: Partial<LevelDefinition['params']> = {}): LevelDefinition {
  return {
    id: 'story-0',
    style: 'classic',
    difficultyScore: 10,
    params: { ...BASE_PARAMS, ...params },
    entities: [],
  }
}

/** An enemy pinned on the player, to trigger a contact hit on tick 1. */
function contactLevel(params: Partial<LevelDefinition['params']> = {}): LevelDefinition {
  return {
    ...level(params),
    entities: [
      {
        entityTypeId: 'basic-enemy',
        x: PLAYER_X,
        y: PLAYER_Y,
        properties: { hp: 9999, speedMultiplier: 0 },
      },
    ],
  }
}

describe('STATS-1 — ship stats live in run state', () => {
  it('defaults to the values the constants used to hold', () => {
    expect(new GameLoop(level()).getState().ship).toEqual(DEFAULTS)
  })

  it('seeds every stat from the level params when they are given', () => {
    const loop = new GameLoop(level({
      playerSpeed: 450,
      playerBulletSpeed: 900,
      playerInvincibilityMs: 2000,
      playerFireIntervalMs: 250,
    }))
    expect(loop.getState().ship).toEqual({
      moveSpeed: 450,
      bulletSpeed: 900,
      invincibilityMs: 2000,
      autoFireIntervalMs: 250,
    })
  })

  it('seeds each stat independently of the others', () => {
    const loop = new GameLoop(level({ playerSpeed: 600 }))
    const { ship } = loop.getState()
    expect(ship.moveSpeed).toBe(600)
    expect(ship.bulletSpeed).toBe(DEFAULTS.bulletSpeed)
    expect(ship.invincibilityMs).toBe(DEFAULTS.invincibilityMs)
    expect(ship.autoFireIntervalMs).toBe(DEFAULTS.autoFireIntervalMs)
  })
})

describe('STATS-1 — the stats actually drive the ship', () => {
  it('moves the distance its moveSpeed says, not a constant', () => {
    const slow = new GameLoop(level({ playerSpeed: 100 }))
    const fast = new GameLoop(level({ playerSpeed: 400 }))
    const startX = slow.getState().player.x

    slow.move(1, 0, 100) // 100ms
    fast.move(1, 0, 100)

    expect(slow.getState().player.x - startX).toBeCloseTo(10, 5)  // 100 px/s × 0.1s
    expect(fast.getState().player.x - startX).toBeCloseTo(40, 5)  // 400 px/s × 0.1s
  })

  it('sends player bullets at its bulletSpeed', () => {
    const loop = new GameLoop(level({ playerBulletSpeed: 1000 }))
    loop.fire()
    const before = loop.getState().playerBullets[0].y
    loop.update(100) // 0.1s
    const after = loop.getState().playerBullets[0].y
    expect(before - after).toBeCloseTo(100, 5) // 1000 px/s × 0.1s, travelling up
  })

  it('holds i-frames for its invincibilityMs', () => {
    const loop = new GameLoop(contactLevel({ playerInvincibilityMs: 400 }))
    loop.update(16)
    expect(loop.getState().player.invincibilityTimer).toBe(400)
  })

  it('auto-fires on its own interval', () => {
    const loop = new GameLoop(level({ playerFireIntervalMs: 100 }))
    loop.setFiring(true)
    loop.update(1)   // fires immediately, timer → 100
    loop.update(100) // second shot
    loop.update(100) // third shot
    expect(loop.getState().playerBullets).toHaveLength(3)
  })

  it('does not fire faster than the interval allows', () => {
    // 450ms is past the old hardcoded 400 but inside this level's 500, so a loop
    // still using the constant would have fired twice here.
    const loop = new GameLoop(level({ playerFireIntervalMs: 500 }))
    loop.setFiring(true)
    loop.update(1)   // first shot
    loop.update(450)
    expect(loop.getState().playerBullets).toHaveLength(1)
  })
})

describe('STATS-1 — AutoFireSystem interval is mutable', () => {
  // Fire-rate cards (CARD-4) change the cadence mid-run, so the interval can no
  // longer be readonly. This is the prerequisite that delivery E3 consumes.
  it('honours a new interval set after construction', () => {
    const system = new AutoFireSystem(400)
    const shots: number[] = []
    system.setActive(true)

    system.tick(1, () => shots.push(1))   // first shot, timer → 400
    system.setInterval(100)
    system.tick(100, () => shots.push(1)) // would not have fired at 400ms
    system.tick(100, () => shots.push(1))

    expect(shots).toHaveLength(3)
  })

  it('keeps the current interval when none is set', () => {
    const system = new AutoFireSystem(200)
    const shots: number[] = []
    system.setActive(true)
    system.tick(1, () => shots.push(1))
    system.tick(100, () => shots.push(1)) // inside the 200ms window
    expect(shots).toHaveLength(1)
  })
})
