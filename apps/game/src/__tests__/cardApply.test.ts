import { axisSum, applyCards, BASELINE_FROM_SHIP } from '../cards/apply'
import type { ActiveCard } from '../cards/types'

/**
 * CARD-4 (Sprint 8, entrega E3) — turning picked cards into run numbers.
 *
 * One formula, no per-card exception (spec 4.2):
 *     final = base × (1 + sum of that axis's bonuses)
 *
 * Additive over the base, never multiplicative between cards. Two +20% cards are
 * +40%, not +44% — the player can do that in their head, and five stacks cannot
 * explode the difficulty calibration. The slowdown lives in the draw weights
 * (spec 6.1), in one place, not in the stacking maths.
 */

function card(axis: ActiveCard['axis'], value: number, n = 0): ActiveCard {
  return { id: `${axis}-${n}`, axis, rarity: 'common', value }
}

const BASE = { bulletDamage: 20, autoFireIntervalMs: 400 }

describe('CARD-4 — axis sums', () => {
  it('is zero for an axis with no cards', () => {
    expect(axisSum('damage', [])).toBe(0)
  })

  it('adds the bonuses of the same axis', () => {
    expect(axisSum('damage', [card('damage', 0.2), card('damage', 0.5, 1)])).toBeCloseTo(0.7, 6)
  })

  it('ignores cards of other axes', () => {
    expect(axisSum('damage', [card('fireRate', 0.6)])).toBe(0)
  })

  it('clamps fire rate at the +150% ceiling', () => {
    // Four epics would be +240%; the interval formula would get silly.
    const four = [0, 1, 2, 3].map(n => card('fireRate', 0.6, n))
    expect(axisSum('fireRate', four)).toBe(1.5)
  })

  it('leaves damage uncapped — only its stack count is limited', () => {
    const five = [0, 1, 2, 3, 4].map(n => card('damage', 0.8, n))
    expect(axisSum('damage', five)).toBeCloseTo(4.0, 6)
  })
})

describe('CARD-4 — damage axis', () => {
  it('leaves the base untouched with no cards', () => {
    expect(applyCards(BASE, []).bulletDamage).toBe(20)
  })

  it('applies one card as a percentage of the base', () => {
    expect(applyCards(BASE, [card('damage', 0.2)]).bulletDamage).toBeCloseTo(24, 6)
  })

  it('sums two cards additively, not multiplicatively', () => {
    const twice = [card('damage', 0.2), card('damage', 0.2, 1)]
    expect(applyCards(BASE, twice).bulletDamage).toBeCloseTo(28, 6) // 20 × 1.4, not 20 × 1.2²  = 28.8
  })
})

describe('CARD-4 — fire rate axis', () => {
  it('shortens the interval as a rate, not as a subtraction', () => {
    // +15% rate on a 400ms interval → 400 / 1.15 ≈ 347.8ms
    expect(applyCards(BASE, [card('fireRate', 0.15)]).autoFireIntervalMs).toBeCloseTo(347.826, 3)
  })

  it('never reaches zero, because the sum is capped', () => {
    const four = [0, 1, 2, 3].map(n => card('fireRate', 0.6, n))
    expect(applyCards(BASE, four).autoFireIntervalMs).toBeCloseTo(160, 6) // 400 / 2.5
  })

  it('keeps the two axes independent', () => {
    const mixed = [card('damage', 0.5), card('fireRate', 0.38, 1)]
    const result = applyCards(BASE, mixed)
    expect(result.bulletDamage).toBeCloseTo(30, 6)
    expect(result.autoFireIntervalMs).toBeCloseTo(400 / 1.38, 6)
  })
})

describe('CARD-4 — the baseline comes from the ship, not from a constant', () => {
  it('reads the run baseline off ship stats and the player', () => {
    const baseline = BASELINE_FROM_SHIP(
      { moveSpeed: 300, bulletSpeed: 500, invincibilityMs: 1500, autoFireIntervalMs: 250 },
      35,
    )
    expect(baseline).toEqual({ bulletDamage: 35, autoFireIntervalMs: 250 })
  })

  it('scales off a level that tuned its own fire interval', () => {
    const baseline = { bulletDamage: 20, autoFireIntervalMs: 250 }
    expect(applyCards(baseline, [card('fireRate', 0.25)]).autoFireIntervalMs).toBeCloseTo(200, 6)
  })
})
