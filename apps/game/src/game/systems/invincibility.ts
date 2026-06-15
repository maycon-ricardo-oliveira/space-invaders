import type { GameState } from '../types'

/**
 * Counts down the player's i-frame timer. Skipped on the tick a hit landed so
 * the timer holds its full duration for that frame. Pure over the slice.
 */
export function tickInvincibility(state: GameState, deltaMs: number, hitThisTick: boolean): void {
  if (hitThisTick) return
  const p = state.player
  if (p.invincibilityTimer > 0) {
    p.invincibilityTimer = Math.max(0, p.invincibilityTimer - deltaMs)
  }
}
