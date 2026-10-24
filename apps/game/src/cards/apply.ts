import { AXIS_SUM_CAP } from './catalogue'
import type { ActiveCard, CardAxis } from './types'
import type { ShipStats } from '../game/types'

/** The run's un-carded numbers. Cards are always a percentage of these. */
export interface RunBaseline {
  bulletDamage: number
  autoFireIntervalMs: number
}

/** The baseline of a run: the level's own ship stats and starting damage. */
export const BASELINE_FROM_SHIP = (ship: ShipStats, bulletDamage: number): RunBaseline => ({
  bulletDamage,
  autoFireIntervalMs: ship.autoFireIntervalMs,
})

/**
 * Spec 4.2 — bonuses of one axis add up over the base. Some axes also cap the
 * sum: fire rate at +150%, because `base / (1 + sum)` would otherwise walk the
 * interval toward zero, which is a division by zero wearing a card's clothes.
 */
export function axisSum(axis: CardAxis, activeCards: ActiveCard[]): number {
  const total = activeCards
    .filter(c => c.axis === axis)
    .reduce((sum, c) => sum + c.value, 0)
  const cap = AXIS_SUM_CAP[axis]
  return cap === null ? total : Math.min(total, cap)
}

/**
 * The run's current numbers, derived fresh from the baseline and the cards held.
 * Deriving rather than mutating means a card can never be applied twice, and the
 * build is always exactly what `activeCards` says it is.
 */
export function applyCards(baseline: RunBaseline, activeCards: ActiveCard[]): RunBaseline {
  return {
    bulletDamage: baseline.bulletDamage * (1 + axisSum('damage', activeCards)),
    // Rate-based, not interval-subtraction: four −38% cards would otherwise
    // drive the interval straight to zero.
    autoFireIntervalMs: baseline.autoFireIntervalMs / (1 + axisSum('fireRate', activeCards)),
  }
}
