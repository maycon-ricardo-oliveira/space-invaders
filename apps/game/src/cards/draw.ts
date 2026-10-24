import {
  AXIS_STACK_CAP,
  AXIS_WEIGHT,
  BRACKET_RARITY_WEIGHTS,
  CARDS,
  DIMINISHING_FACTOR,
  PLANET_ESCALATION,
  cardFor,
} from './catalogue'
import type { ActiveCard, Bracket, CardAxis, CardDefinition, Rarity } from './types'

/** Low to high. The draw walks this order, so it is also the weight order. */
const RARITY_ORDER: Rarity[] = ['common', 'uncommon', 'rare', 'epic', 'legendary']

const SLOTS_PER_SCREEN = 3

export interface DrawInput {
  /** Player level inside the current phase — decides the bracket. */
  playerLevel: number
  /** 1-based planet index — shifts the ladder upward. */
  planet: number
  activeCards: ActiveCard[]
  /** Injected so a run is reproducible and the tests are exact. */
  rng: () => number
}

/** Spec 5.2 — the phase gets more generous as the player levels through it. */
export function bracketFor(playerLevel: number): Bracket {
  if (playerLevel <= 3) return 'levels1to3'
  if (playerLevel <= 6) return 'levels4to6'
  return 'levels7plus'
}

/**
 * Spec 5.2 and 5.3 — bracket table plus the per-planet escalation. Common stays
 * pinned at 100: it is the denominator, so tuning loot means moving three
 * numbers instead of five.
 */
export function rarityWeights(playerLevel: number, planet: number): Record<Rarity, number> {
  const bracket = bracketFor(playerLevel)
  const base = BRACKET_RARITY_WEIGHTS[bracket]
  const steps = Math.max(0, planet - 1)
  return {
    common: base.common,
    uncommon: base.uncommon + PLANET_ESCALATION.uncommon * steps,
    rare: base.rare + PLANET_ESCALATION.rare * steps,
    epic: base.epic + PLANET_ESCALATION.epic * steps,
    legendary: planet >= 3 && bracket === 'levels7plus' ? 1 : 0,
  }
}

function stacksOf(axis: CardAxis, activeCards: ActiveCard[]): number {
  return activeCards.filter(c => c.axis === axis).length
}

/**
 * Spec 6.1 and 6.2 — a held axis decays by 0.55 per stack, and a capped axis
 * leaves eligibility outright. A card the player cannot use is never offered.
 */
export function axisWeight(axis: CardAxis, activeCards: ActiveCard[]): number {
  const stacks = stacksOf(axis, activeCards)
  if (stacks >= AXIS_STACK_CAP[axis]) return 0
  return AXIS_WEIGHT[axis] * DIMINISHING_FACTOR ** stacks
}

/** Every axis still below its stack cap. */
export function eligibleAxes(activeCards: ActiveCard[]): CardAxis[] {
  const axes = [...new Set(CARDS.map(c => c.axis))]
  return axes.filter(axis => stacksOf(axis, activeCards) < AXIS_STACK_CAP[axis])
}

/**
 * The card for a drawn (axis, rarity). Several axes stop before Epic and no axis
 * has a Legendary cell yet, so a missing cell steps DOWN to the best rarity the
 * axis actually has rather than dropping the slot.
 */
export function resolveCard(axis: CardAxis, rarity: Rarity): CardDefinition | undefined {
  const start = RARITY_ORDER.indexOf(rarity)
  for (let i = start; i >= 0; i--) {
    const card = cardFor(axis, RARITY_ORDER[i])
    if (card) return card
  }
  return undefined
}

function pickWeighted<T>(entries: Array<[T, number]>, rng: () => number): T | undefined {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0)
  if (total <= 0) return undefined
  let roll = rng() * total
  for (const [item, weight] of entries) {
    roll -= weight
    if (roll < 0) return item
  }
  return entries[entries.length - 1][0]
}

/**
 * One screen of up to three cards, drawn in two stages: rarity first, then the
 * axis inside it. That order is the whole point — it keeps "4.7% chance of Epic"
 * true no matter how many Epic cards the catalogue grows to hold.
 *
 * Spec 6.4: never two cards of the same axis on one screen. Spec 6.4 edge case:
 * with fewer than three eligible axes, show the ones that exist.
 */
export function drawCards({ playerLevel, planet, activeCards, rng }: DrawInput): CardDefinition[] {
  const weights = rarityWeights(playerLevel, planet)
  const rarityEntries = RARITY_ORDER.map(r => [r, weights[r]] as [Rarity, number])

  const remaining = eligibleAxes(activeCards)
  const screen: CardDefinition[] = []

  while (screen.length < SLOTS_PER_SCREEN && remaining.length > 0) {
    const rarity = pickWeighted(rarityEntries, rng)
    if (!rarity) break
    const axis = pickWeighted(
      remaining.map(a => [a, axisWeight(a, activeCards)] as [CardAxis, number]),
      rng,
    )
    if (!axis) break
    remaining.splice(remaining.indexOf(axis), 1) // one axis = one slot
    const card = resolveCard(axis, rarity)
    if (card) screen.push(card)
  }

  return screen
}
