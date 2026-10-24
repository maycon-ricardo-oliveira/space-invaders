/** The five-step ladder, shared with the equipment system (spec section 2.2). */
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

/**
 * One effect axis. Sprint 8 delivery 3 ships the two cheapest; the remaining ten
 * are added as catalogue data, not as new machinery.
 */
export type CardAxis = 'damage' | 'fireRate'

/** A single cell of the effect × rarity matrix — one card. */
export interface CardDefinition {
  id: string
  axis: CardAxis
  rarity: Rarity
  /** Bonus as a fraction: 0.2 = +20%. Always additive over the run's base value. */
  value: number
  name: string
  description: string
}

/** A card the player picked this run. All of them are lost on death. */
export interface ActiveCard {
  id: string
  axis: CardAxis
  rarity: Rarity
  value: number
}

/** Player level brackets that shift the rarity odds across a phase. */
export type Bracket = 'levels1to3' | 'levels4to6' | 'levels7plus'
