import { GameLoop, CANVAS_WIDTH, CANVAS_HEIGHT, ENTITY_SIZE } from '../game/GameLoop'
import type { LevelDefinition } from '@si/level-engine'

/**
 * DMG-1 (Sprint 8, entrega E1) — damage stops being hardcoded.
 *
 * Before this battery both damage paths in `collisions.ts` did `p.hp - 1`, so a
 * 500 hp player took 500 hits to die and every life-related card axis (Max HP,
 * Heal, Lifesteal, Armour) was mathematically placebo. Damage now travels on the
 * entity that deals it — `Bullet.damage` and `Enemy.contactDamage` — seeded from
 * `LevelParams`, so it is calibratable per planet/phase.
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

const PLAYER_X = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
const PLAYER_Y = CANVAS_HEIGHT - ENTITY_SIZE - 20 // mirrors the player spawn in GameLoop
const INITIAL_HP = 500

/** Planet 1 starting values, per the Sprint 8 spec. */
const DEFAULT_BULLET_DAMAGE = 15
const DEFAULT_CONTACT_DAMAGE = 25

/** An unkillable enemy pinned on top of the player, so contact lands on tick 1. */
function contactLevel(
  params: Partial<LevelDefinition['params']> = {},
  properties: Record<string, unknown> = {},
): LevelDefinition {
  return {
    id: 'story-0',
    style: 'classic',
    difficultyScore: 10,
    params: { ...BASE_PARAMS, ...params },
    entities: [
      {
        entityTypeId: 'basic-enemy',
        x: PLAYER_X,
        y: PLAYER_Y,
        properties: { hp: 9999, speedMultiplier: 0, ...properties },
      },
    ],
  }
}

/** A shooter directly above the player with the cooldown effectively disabled. */
function shooterLevel(params: Partial<LevelDefinition['params']> = {}): LevelDefinition {
  return {
    id: 'story-0',
    style: 'classic',
    difficultyScore: 10,
    params: { ...BASE_PARAMS, enemyShotDelay: 0.001, enemyShotSpeed: 8, ...params },
    entities: [
      { entityTypeId: 'basic-enemy', x: PLAYER_X, y: 60, properties: { hp: 9999 } },
    ],
  }
}

/** Ticks until the player takes its first hit. Returns the hp after it. */
function hpAfterFirstHit(loop: GameLoop): number {
  for (let i = 0; i < 300; i++) {
    loop.update(16)
    const { hp } = loop.getState().player
    if (hp < INITIAL_HP) return hp
  }
  throw new Error('player was never hit')
}

describe('DMG-1 — enemy bullet damage', () => {
  it('takes the damage from the level params instead of a flat 1', () => {
    const loop = new GameLoop(shooterLevel({ enemyBulletDamage: 40 }))
    expect(hpAfterFirstHit(loop)).toBe(INITIAL_HP - 40)
  })

  it('falls back to the planet 1 default when the level omits it', () => {
    const loop = new GameLoop(shooterLevel())
    expect(hpAfterFirstHit(loop)).toBe(INITIAL_HP - DEFAULT_BULLET_DAMAGE)
  })

  it('carries the damage on the bullet itself', () => {
    const loop = new GameLoop(shooterLevel({ enemyBulletDamage: 33 }))
    for (let i = 0; i < 50; i++) {
      loop.update(16)
      const [bullet] = loop.getState().enemyBullets
      if (bullet) {
        expect(bullet.damage).toBe(33)
        return
      }
    }
    throw new Error('no enemy bullet was fired')
  })
})

describe('DMG-1 — body contact damage', () => {
  it('takes the damage from the level params instead of a flat 1', () => {
    const loop = new GameLoop(contactLevel({ enemyContactDamage: 60 }))
    loop.update(16)
    expect(loop.getState().player.hp).toBe(INITIAL_HP - 60)
  })

  it('falls back to the planet 1 default when the level omits it', () => {
    const loop = new GameLoop(contactLevel())
    loop.update(16)
    expect(loop.getState().player.hp).toBe(INITIAL_HP - DEFAULT_CONTACT_DAMAGE)
  })

  it('lets a single enemy override the level default with its own value', () => {
    // A heavy enemy hurts more on contact than its neighbours — the calibrator
    // sets this per entity, the level param is only the fallback.
    const loop = new GameLoop(contactLevel({ enemyContactDamage: 10 }, { contactDamage: 90 }))
    loop.update(16)
    expect(loop.getState().player.hp).toBe(INITIAL_HP - 90)
  })

  it('still respects i-frames between contacts', () => {
    const loop = new GameLoop(contactLevel({ enemyContactDamage: 50 }))
    loop.update(16)
    expect(loop.getState().player.hp).toBe(450)
    for (let i = 0; i < 10; i++) loop.update(16) // ~160ms, inside the 1500ms window
    expect(loop.getState().player.hp).toBe(450)
  })
})

describe('DMG-1 — player bullets', () => {
  it('snapshot the player damage onto the bullet when fired', () => {
    const loop = new GameLoop(contactLevel())
    loop.fire()
    expect(loop.getState().playerBullets[0].damage).toBe(loop.getState().player.bulletDamage)
  })
})

describe('DMG-1 — regression: dying is no longer a 500-hit grind', () => {
  it('kills a 500 hp player in 20 contacts at the default damage', () => {
    const loop = new GameLoop(contactLevel())
    let hits = 0
    // One contact per i-frame cycle: hit, then drain the window.
    while (loop.getState().player.hp > 0 && hits < 100) {
      loop.update(16)
      loop.update(1500)
      hits++
    }
    expect(loop.getState().player.hp).toBe(0)
    expect(hits).toBe(INITIAL_HP / DEFAULT_CONTACT_DAMAGE)
  })
})
