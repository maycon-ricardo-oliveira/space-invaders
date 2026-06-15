import type { EntityPlacement } from '@si/level-engine'
import type { Enemy, MovementPattern } from './types'

const SQRT2_2 = Math.SQRT1_2 // √2/2 = sin(45°) = cos(45°); unit diagonal component

/** 1/3 each: r<1/3 straight, 1/3<=r<2/3 diag-left, r>=2/3 diag-right. */
export function rollAsteroidDirection(): { dirX: number; dirY: number } {
  const r = Math.random()
  if (r < 1 / 3) return { dirX: 0, dirY: 1 }
  if (r < 2 / 3) return { dirX: -SQRT2_2, dirY: SQRT2_2 }
  return { dirX: SQRT2_2, dirY: SQRT2_2 }
}

export interface PatternInput {
  anchorX: number
  anchorY: number
  amplitudeX: number
  amplitudeY: number
  /** Already folds in 2π·f·t + phase (at spawn t=0, angle = phase). */
  angle: number
}

export type PatternOffsetFn = (input: PatternInput) => { x: number; y: number }

/** Non-combat / obstacle patterns sit on their anchor (movement handled elsewhere). */
const stayOnAnchor: PatternOffsetFn = ({ anchorX, anchorY }) => ({ x: anchorX, y: anchorY })

/**
 * Strategy via map: position of a combat enemy = anchor + offset(pattern, amplitude, angle).
 * Exhaustive over MovementPattern — adding a pattern to the union forces a new entry here.
 */
export const PATTERN_OFFSETS: Record<MovementPattern, PatternOffsetFn> = {
  'oscillate-h': ({ anchorX, anchorY, amplitudeX, angle }) => ({
    x: anchorX + amplitudeX * Math.sin(angle),
    y: anchorY,
  }),
  'bob-v': ({ anchorX, anchorY, amplitudeY, angle }) => ({
    x: anchorX,
    y: anchorY + amplitudeY * Math.sin(angle),
  }),
  'orbit': ({ anchorX, anchorY, amplitudeX, amplitudeY, angle }) => ({
    x: anchorX + amplitudeX * Math.cos(angle),
    y: anchorY + amplitudeY * Math.sin(angle),
  }),
  'descend': stayOnAnchor,
  'drift-return': stayOnAnchor,
  'static': stayOnAnchor,
}

/**
 * Position of a combat enemy = anchor + offset(pattern, amplitude, angle).
 * `angle` already folds in 2π·f·t + phase (at spawn t=0, angle = phase).
 * Non-combat patterns ('descend'/'static'/'drift-return') stay on the anchor here.
 */
export function patternOffset(
  pattern: MovementPattern,
  anchorX: number,
  anchorY: number,
  amplitudeX: number,
  amplitudeY: number,
  angle: number,
): { x: number; y: number } {
  return PATTERN_OFFSETS[pattern]({ anchorX, anchorY, amplitudeX, amplitudeY, angle })
}

/**
 * Single factory for an `Enemy` record. Both spawn paths (EntityPlacement-based
 * and the procedural grid fallback) route through here, so defaults, the
 * `phase` formula and the t=0 anchored-spawn offset live in exactly one place.
 *
 * The procedural fallback supplies its grid-tuned overrides through `properties`
 * (amplitudeX, frequency, movementPattern), exactly like a placement would.
 */
export function buildEnemy(placement: EntityPlacement): Enemy {
  const props = placement.properties ?? {}
  // Prefer an explicit movementPattern; otherwise fall back from the legacy
  // movementType ('vertical' → asteroid 'descend', else 'oscillate-h').
  const movementPattern = (props.movementPattern as MovementPattern)
    ?? (props.movementType === 'vertical' ? 'descend' : 'oscillate-h')
  // phase: honor an explicit value, otherwise derive from the spawn position so
  // neighbors at distinct cells never oscillate in unison.
  const phase = (props.phase as number) ?? placement.x * 0.7 + placement.y * 1.3
  // Asteroids ('descend') sample their travel direction once, here at spawn,
  // BEFORE any per-tick shooter/drop RNG runs. 1/3 each.
  const { dirX, dirY } = movementPattern === 'descend'
    ? rollAsteroidDirection()
    : { dirX: 0, dirY: 0 }
  const amplitudeX = (props.amplitudeX as number) ?? 0
  const amplitudeY = (props.amplitudeY as number) ?? 0
  // Initial position = the pattern evaluated at t=0 (angle = phase), so a freshly
  // spawned orbiter already sits at its cos-offset, not the bare anchor.
  const { x: x0, y: y0 } = patternOffset(
    movementPattern, placement.x, placement.y, amplitudeX, amplitudeY, phase,
  )
  return {
    x: x0,
    y: y0,
    alive: true,
    killed: false,
    typeId: placement.entityTypeId,
    hp: (props.hp as number) ?? 100,
    xpValue: (props.xpValue as number) ?? 1,
    movementType: ((props.movementType as string) ?? 'horizontal') as 'horizontal' | 'vertical',
    burstCount: (props.burstCount as number) ?? 1,
    dropsPickup: ((props.dropsPickup as string) ?? null) as 'damage' | null,
    speedMultiplier: (props.speedMultiplier as number) ?? 1.0,
    anchorX: placement.x,
    anchorY: placement.y,
    movementPattern,
    amplitudeX,
    amplitudeY,
    frequency: (props.frequency as number) ?? 0,
    phase,
    dirX,
    dirY,
  }
}
