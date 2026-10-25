import type { Bracket, CardAxis, CardDefinition, Rarity } from './types'

/** Spec 2.2 — geometric ladder of ratio 1.6, rounded to card-friendly numbers. */
export const RARITY_MULTIPLIER: Record<Rarity, number> = {
  common: 1.0,
  uncommon: 1.6,
  rare: 2.5,
  epic: 4.0,
  legendary: 6.5,
}

/**
 * Spec 2.2 — colour-blind tolerant: luminance differs as well as hue. Border
 * thickness carries the same signal, so colour is never the only cue.
 */
export const RARITY_COLOR: Record<Rarity, string> = {
  common: '#9AA5B1',
  uncommon: '#4CAF50',
  rare: '#2F80ED',
  epic: '#9B51E0',
  legendary: '#F2A93B',
}

/** Border width in px — the second, non-colour signal of rarity. */
export const RARITY_BORDER_WIDTH: Record<Rarity, number> = {
  common: 1,
  uncommon: 2,
  rare: 2,
  epic: 3,
  legendary: 3,
}

/** Spec 6.2 — hitting the cap removes the axis from eligibility entirely. */
export const AXIS_STACK_CAP: Record<CardAxis, number> = {
  damage: 5,
  fireRate: 4,
}

/**
 * Spec 4.2 — some axes cap the summed bonus as well as the stack count.
 * Fire rate is a physical cap: `interval = base / (1 + sum)` would otherwise
 * approach zero. `null` means only the stack cap applies.
 */
export const AXIS_SUM_CAP: Record<CardAxis, number | null> = {
  damage: null,
  fireRate: 1.5,
}

/** Spec 5.4 — weight of each axis inside the drawn rarity. Common = 100. */
export const AXIS_WEIGHT: Record<CardAxis, number> = {
  damage: 100,
  fireRate: 100,
}

/** Spec 6.1 — a card already held gets its axis weight multiplied by this per stack. */
export const DIMINISHING_FACTOR = 0.55

/** Spec 5.2 — rarity weights per bracket. Common is pinned at 100 as the denominator. */
export const BRACKET_RARITY_WEIGHTS: Record<Bracket, Record<Rarity, number>> = {
  levels1to3:  { common: 100, uncommon: 35, rare: 8,  epic: 1,  legendary: 0 },
  levels4to6:  { common: 100, uncommon: 55, rare: 20, epic: 4,  legendary: 0 },
  levels7plus: { common: 100, uncommon: 70, rare: 35, epic: 10, legendary: 0 },
}

/** Spec 5.3 — each planet past the first shifts the ladder upward. */
export const PLANET_ESCALATION = { uncommon: 8, rare: 5, epic: 2 }

/**
 * The effect × rarity matrix, spec 4 and 4.1. Delivery 3 covers Damage and
 * Fire rate; the other ten axes are more rows here, not more code.
 */
export const CARDS: CardDefinition[] = [
  { id: 'damage-common',     axis: 'damage',   rarity: 'common',   value: 0.20, name: 'Munição Pesada',       description: '+20% de dano' },
  { id: 'damage-uncommon',   axis: 'damage',   rarity: 'uncommon', value: 0.32, name: 'Munição Perfurante',   description: '+32% de dano' },
  { id: 'damage-rare',       axis: 'damage',   rarity: 'rare',     value: 0.50, name: 'Ogiva de Plasma',      description: '+50% de dano' },
  { id: 'damage-epic',       axis: 'damage',   rarity: 'epic',     value: 0.80, name: 'Ogiva de Antimatéria', description: '+80% de dano' },
  { id: 'fireRate-common',   axis: 'fireRate', rarity: 'common',   value: 0.15, name: 'Refrigeração',         description: '+15% de cadência' },
  { id: 'fireRate-uncommon', axis: 'fireRate', rarity: 'uncommon', value: 0.24, name: 'Alimentador Rápido',   description: '+24% de cadência' },
  { id: 'fireRate-rare',     axis: 'fireRate', rarity: 'rare',     value: 0.38, name: 'Canhão Rotativo',      description: '+38% de cadência' },
  { id: 'fireRate-epic',     axis: 'fireRate', rarity: 'epic',     value: 0.60, name: 'Motor de Rajada',      description: '+60% de cadência' },
]

/** The card for one cell of the matrix, or undefined when the cell is a dash. */
export function cardFor(axis: CardAxis, rarity: Rarity): CardDefinition | undefined {
  return CARDS.find(c => c.axis === axis && c.rarity === rarity)
}
