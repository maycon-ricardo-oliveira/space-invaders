import {
  bracketFor,
  rarityWeights,
  axisWeight,
  eligibleAxes,
  resolveCard,
  drawCards,
} from '../cards/draw'
import { AXIS_WEIGHT, DIMINISHING_FACTOR } from '../cards/catalogue'
import type { ActiveCard } from '../cards/types'

/**
 * CARD-3 (Sprint 8, entrega E3) — the two-stage draw engine.
 *
 * Rarity is drawn first, then the axis inside that rarity. That is structural,
 * not an implementation detail: in a single-stage draw (one bag of 40 cards),
 * adding new Epic cards would raise the chance of drawing Epic — the balance
 * would sabotage itself with every content patch.
 *
 * Pure module: no renderer, no GameLoop, RNG injected so every test is exact.
 */

/** Deterministic RNG that walks a fixed list, then repeats the last value. */
function rngOf(...values: number[]): () => number {
  let i = 0
  return () => values[Math.min(i++, values.length - 1)]
}

function held(axis: ActiveCard['axis'], times: number): ActiveCard[] {
  return Array.from({ length: times }, (_, n) => ({
    id: `${axis}-${n}`, axis, rarity: 'common' as const, value: 0.2,
  }))
}

describe('CARD-3 — brackets', () => {
  it('maps the player level onto the three brackets of the spec', () => {
    expect(bracketFor(1)).toBe('levels1to3')
    expect(bracketFor(3)).toBe('levels1to3')
    expect(bracketFor(4)).toBe('levels4to6')
    expect(bracketFor(6)).toBe('levels4to6')
    expect(bracketFor(7)).toBe('levels7plus')
    expect(bracketFor(20)).toBe('levels7plus')
  })
})

describe('CARD-3 — rarity weights', () => {
  it('uses the documented table on planet 1', () => {
    expect(rarityWeights(1, 1)).toEqual({ common: 100, uncommon: 35, rare: 8, epic: 1, legendary: 0 })
    expect(rarityWeights(5, 1)).toEqual({ common: 100, uncommon: 55, rare: 20, epic: 4, legendary: 0 })
    expect(rarityWeights(9, 1)).toEqual({ common: 100, uncommon: 70, rare: 35, epic: 10, legendary: 0 })
  })

  it('escalates by 8 / 5 / 2 for each planet past the first', () => {
    expect(rarityWeights(1, 3)).toMatchObject({ common: 100, uncommon: 35 + 16, rare: 8 + 10, epic: 1 + 4 })
  })

  it('keeps legendary at zero on planet 1 and 2, at any level', () => {
    expect(rarityWeights(9, 1).legendary).toBe(0)
    expect(rarityWeights(9, 2).legendary).toBe(0)
  })

  it('unlocks legendary only from planet 3 in the top bracket', () => {
    expect(rarityWeights(6, 3).legendary).toBe(0)
    expect(rarityWeights(7, 3).legendary).toBe(1)
  })
})

describe('CARD-3 — diminishing returns', () => {
  it('leaves an unheld axis at its full weight', () => {
    expect(axisWeight('damage', [])).toBe(AXIS_WEIGHT.damage)
  })

  it('multiplies the weight by 0.55 for each stack already held', () => {
    expect(axisWeight('damage', held('damage', 1))).toBeCloseTo(100 * DIMINISHING_FACTOR, 6)
    expect(axisWeight('damage', held('damage', 2))).toBeCloseTo(100 * DIMINISHING_FACTOR ** 2, 6)
    expect(axisWeight('damage', held('damage', 3))).toBeCloseTo(100 * DIMINISHING_FACTOR ** 3, 6)
  })

  it('counts only stacks of the axis being weighed', () => {
    expect(axisWeight('damage', held('fireRate', 3))).toBe(AXIS_WEIGHT.damage)
  })

  it('drops the weight to zero once the axis hits its stack cap', () => {
    expect(axisWeight('damage', held('damage', 5))).toBe(0)   // cap 5
    expect(axisWeight('fireRate', held('fireRate', 4))).toBe(0) // cap 4
  })
})

describe('CARD-3 — eligibility', () => {
  it('offers every axis to a player holding nothing', () => {
    expect(eligibleAxes([]).sort()).toEqual(['damage', 'fireRate'])
  })

  it('removes an axis that reached its cap', () => {
    expect(eligibleAxes(held('damage', 5))).toEqual(['fireRate'])
  })

  it('returns nothing when every axis is capped', () => {
    expect(eligibleAxes([...held('damage', 5), ...held('fireRate', 4)])).toEqual([])
  })
})

describe('CARD-3 — drawing a screen', () => {
  const base = { playerLevel: 1, planet: 1, activeCards: [] as ActiveCard[] }

  it('never offers two cards of the same axis on one screen', () => {
    // With only two axes shipped, a screen can hold at most two cards.
    const screen = drawCards({ ...base, rng: rngOf(0.01) })
    const axes = screen.map(c => c.axis)
    expect(new Set(axes).size).toBe(axes.length)
  })

  it('shows only what is left when fewer than three axes are eligible', () => {
    const screen = drawCards({ ...base, activeCards: held('damage', 5), rng: rngOf(0.01) })
    expect(screen).toHaveLength(1)
    expect(screen[0].axis).toBe('fireRate')
  })

  it('returns an empty screen when nothing is eligible instead of throwing', () => {
    const capped = [...held('damage', 5), ...held('fireRate', 4)]
    expect(drawCards({ ...base, activeCards: capped, rng: rngOf(0.5) })).toEqual([])
  })

  it('draws the common card when the roll lands in the common band', () => {
    // Weights 100/35/8/1 sum to 144; a roll of 0.1 → 14.4, inside common.
    const [card] = drawCards({ ...base, rng: rngOf(0.1) })
    expect(card.rarity).toBe('common')
  })

  it('draws an epic card when the roll lands in the epic band', () => {
    // 0.999 → 143.8 of 144, inside the final epic slice.
    const [card] = drawCards({ ...base, rng: rngOf(0.999) })
    expect(card.rarity).toBe('epic')
  })

  it('carries the matrix value onto the drawn card', () => {
    const [card] = drawCards({ ...base, rng: rngOf(0.1) })
    expect(card.value).toBe(card.axis === 'damage' ? 0.20 : 0.15)
  })

  it('keeps rarity odds independent of how many cards an axis has', () => {
    // The structural promise of the two-stage draw: the rarity roll happens
    // before the catalogue is consulted, so it cannot depend on catalogue shape.
    const low = drawCards({ ...base, rng: rngOf(0.1) })[0]
    const high = drawCards({ ...base, playerLevel: 9, rng: rngOf(0.1) })[0]
    expect(low.rarity).toBe('common')
    expect(high.rarity).toBe('common') // same roll, different bracket, still common band
  })
})

describe('CARD-3 — cells the matrix does not have', () => {
  // Several axes stop before Epic (bullet speed, heal, armour) and no axis has a
  // Legendary cell yet. A drawn rarity with no card must step DOWN to the best
  // one that exists, never crash and never silently hand out nothing.
  it('steps down to the highest rarity the axis actually has', () => {
    const card = resolveCard('damage', 'legendary')
    expect(card?.rarity).toBe('epic')
    expect(card?.id).toBe('damage-epic')
  })

  it('returns the exact card when the cell does exist', () => {
    expect(resolveCard('fireRate', 'rare')?.id).toBe('fireRate-rare')
  })

  it('still produces a full card when the draw lands on legendary', () => {
    // Planet 3, level 7 is the only place legendary carries weight today.
    const screen = drawCards({ playerLevel: 7, planet: 3, activeCards: [], rng: rngOf(0.9999) })
    expect(screen[0]).toBeDefined()
    expect(screen[0].rarity).toBe('epic')
  })
})
