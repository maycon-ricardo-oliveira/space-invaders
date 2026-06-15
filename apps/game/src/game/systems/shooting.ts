import type { Bullet, Enemy, GameState } from '../types'

/** Volley shape kinds. Adding spread/aimed/homing/wave = one new union member + map entry. */
export type ShotKind = 'straight'

export interface ShotContext {
  entitySize: number
  bulletWidth: number
}

/** Strategy via map: a shot kind turns a shooter into the bullets it emits this volley step. */
export type ShotFn = (shooter: Enemy, state: GameState, ctx: ShotContext) => Bullet[]

const straightDown: ShotFn = (shooter, _state, ctx) => [
  {
    x: shooter.x + ctx.entitySize / 2 - ctx.bulletWidth / 2,
    y: shooter.y + ctx.entitySize,
    active: true,
  },
]

export const SHOT_PATTERNS: Record<ShotKind, ShotFn> = {
  straight: straightDown,
}

interface Burst {
  enemy: Enemy
  remaining: number
  burstTimer: number
}

export interface ShootingStepInput {
  state: GameState
  /** Seconds elapsed this tick. */
  dt: number
  /** Cooldown (s) before a new shooter can be selected. */
  enemyShotDelay: number
  ctx: ShotContext
}

/**
 * Owns the burst queue + shot cooldown (the WHEN/HOW-MANY of enemy fire). The
 * shape of each volley is delegated to SHOT_PATTERNS (the WHAT). Pure over the
 * passed GameState slice — no renderer, no other system.
 */
export class ShootingSystem {
  private burstQueue: Burst[] = []
  private shotCooldown: number
  private readonly burstIntervalMs: number

  constructor(initialShotCooldown: number, burstIntervalMs = 50) {
    this.shotCooldown = initialShotCooldown
    this.burstIntervalMs = burstIntervalMs
  }

  step({ state, dt, enemyShotDelay, ctx }: ShootingStepInput): void {
    // Process existing burst queue — use enemy's current position so bullets track movement.
    for (const burst of this.burstQueue) {
      if (burst.remaining <= 0) continue
      if (!burst.enemy.alive) { burst.remaining = 0; continue } // enemy died mid-burst
      burst.burstTimer -= dt * 1000
      if (burst.burstTimer <= 0) {
        state.enemyBullets.push(...SHOT_PATTERNS.straight(burst.enemy, state, ctx))
        burst.remaining--
        burst.burstTimer = this.burstIntervalMs
      }
    }
    this.burstQueue = this.burstQueue.filter(b => b.remaining > 0)

    // Select new shooter.
    this.shotCooldown -= dt
    if (this.shotCooldown > 0) return
    this.shotCooldown = enemyShotDelay
    const shooters = state.enemies.filter(e => e.alive && e.burstCount > 0)
    if (shooters.length === 0) return
    const shooter = shooters[Math.floor(Math.random() * shooters.length)]
    this.burstQueue.push({
      enemy: shooter,
      remaining: shooter.burstCount,
      burstTimer: 0,
    })
  }
}
