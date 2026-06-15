import type { GameState } from '../types'

export interface FuelStepInput {
  state: GameState
  /** Seconds elapsed this tick. */
  dt: number
  /** Fuel units drained per second. Undefined / <= 0 disables drain. */
  drainRate: number | undefined
  maxFuel: number
}

/**
 * Drains player fuel for the tick. Returns true when fuel just hit empty, so
 * the caller can resolve terminal status in one place. Pure over the slice.
 */
export function stepFuel({ state, dt, drainRate, maxFuel }: FuelStepInput): boolean {
  if (!drainRate || drainRate <= 0) return false // no drain unless the level defines a positive rate
  const p = state.player
  p.fuel = Math.max(0, Math.min(maxFuel, p.fuel - drainRate * dt))
  return p.fuel === 0
}
