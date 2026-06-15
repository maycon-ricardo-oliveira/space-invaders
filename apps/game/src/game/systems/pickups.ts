import type { GameState } from '../types'
import { aabb } from '../aabb'

export interface PickupStepInput {
  state: GameState
  entitySize: number
  maxFuel: number
}

/**
 * Resolves player overlap with fuel and damage pickups. Fuel refills to max;
 * a damage pickup triples bullet damage. Pure over the slice.
 */
export function stepPickups({ state, entitySize, maxFuel }: PickupStepInput): void {
  const p = state.player
  const playerBox = { x: p.x, y: p.y, w: entitySize, h: entitySize }

  for (const pickup of state.fuelPickups) {
    if (!pickup.active) continue
    if (aabb(playerBox, { x: pickup.x, y: pickup.y, w: entitySize, h: entitySize })) {
      pickup.active = false
      p.fuel = Math.min(maxFuel, p.fuel + maxFuel)
    }
  }

  for (const pickup of state.damagePickups) {
    if (!pickup.active) continue
    if (aabb(playerBox, { x: pickup.x, y: pickup.y, w: entitySize, h: entitySize })) {
      pickup.active = false
      p.bulletDamage += 2 * p.bulletDamage
    }
  }
}
