import type { Enemy, GameStatus } from './types'
import { isObstacle } from './isObstacle'

/**
 * Outcome of the tick's status decision. Distinct from GameStatus because
 * 'wave-cleared' is not a terminal status — it tells the loop to suspend and
 * emit the wave event instead of writing `state.status`.
 */
export type StatusDecision =
  | { kind: 'none' }
  | { kind: 'status'; status: GameStatus }
  | { kind: 'wave-cleared' }

export interface StatusFacts {
  /** Status already on the state (e.g. 'card_selection' set by a level-up this tick). */
  current: GameStatus
  enemies: Enemy[]
  /** Fuel hit exactly 0 this tick. */
  fuelEmptied: boolean
  playerHp: number
  /** True when this level has more waves to spawn after the current one. */
  moreWavesRemain: boolean
}

/**
 * Single decision point for terminal status, with explicit precedence:
 *   card_selection (short-circuits — a level-up pauses the run) >
 *   won  >  fuelEmpty  >  lost.
 *
 * Collapsing the previously order-dependent writes of drainFuel() and
 * checkWinLose() into one pure function: when the SAME tick both empties the
 * fuel AND clears the last combat enemy, the player WINS (won beats fuelEmpty).
 */
export function resolveStatus(facts: StatusFacts): StatusDecision {
  if (facts.current === 'card_selection') return { kind: 'none' }

  const combat = facts.enemies.filter(e => !isObstacle(e))
  const allCleared = combat.length > 0 && combat.every(e => !e.alive)
  const anyKilled = combat.some(e => e.killed)

  if (allCleared && anyKilled) {
    if (facts.moreWavesRemain) return { kind: 'wave-cleared' }
    return { kind: 'status', status: 'won' }
  }

  if (facts.fuelEmptied) return { kind: 'status', status: 'fuelEmpty' }

  if (facts.playerHp <= 0) return { kind: 'status', status: 'lost' }

  return { kind: 'none' }
}
