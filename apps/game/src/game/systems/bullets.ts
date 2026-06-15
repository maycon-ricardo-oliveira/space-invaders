import type { GameState } from '../types'

export interface BulletStepInput {
  state: GameState
  /** Seconds elapsed this tick. */
  dt: number
  /** Player bullet upward speed (px/s). */
  playerBulletSpeed: number
  playerBulletHeight: number
  /** Enemy bullet downward speed (px/s). */
  enemyBulletSpeed: number
  canvasHeight: number
}

/**
 * Advances every active bullet one tick and deactivates those that leave the
 * canvas. Player bullets fly up, enemy bullets fly down. Pure over the slice.
 */
export function stepBullets({
  state,
  dt,
  playerBulletSpeed,
  playerBulletHeight,
  enemyBulletSpeed,
  canvasHeight,
}: BulletStepInput): void {
  for (const b of state.playerBullets) {
    if (!b.active) continue
    b.y -= playerBulletSpeed * dt
    if (b.y + playerBulletHeight < 0) b.active = false
  }
  for (const b of state.enemyBullets) {
    if (!b.active) continue
    b.y += enemyBulletSpeed * dt
    if (b.y > canvasHeight) b.active = false
  }
}
