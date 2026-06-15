import type { Enemy } from '../types'
import { patternOffset } from '../buildEnemy'

export interface MovementBounds {
  width: number
  height: number
  /** Half-entity radius used as the off-screen culling margin. */
  margin: number
}

export interface MovementStepInput {
  enemies: Enemy[]
  /** Seconds elapsed this tick. */
  dt: number
  /** Total accumulated seconds, drives the micro-movement sines. */
  time: number
  /** px/s applied to obstacle straight-line travel before speedMultiplier. */
  baseSpeed: number
  bounds: MovementBounds
}

/**
 * Advances every alive enemy by one tick. Pure over the passed slice — no
 * GameLoop instance, no renderer. Obstacles ('descend') travel a straight line
 * along their fixed (dirX, dirY) unit vector and die off any edge; combat
 * enemies sit on their anchored micro-movement offset.
 */
export function stepMovement({ enemies, dt, time, baseSpeed, bounds }: MovementStepInput): void {
  for (const e of enemies) {
    if (!e.alive) continue

    if (e.movementPattern === 'descend') {
      const speed = baseSpeed * e.speedMultiplier
      e.x += e.dirX * speed * dt
      e.y += e.dirY * speed * dt
      if (
        e.x < -bounds.margin ||
        e.x > bounds.width + bounds.margin ||
        e.y > bounds.height + bounds.margin
      ) {
        e.alive = false
      }
      continue
    }

    // Combat enemies: anchored micro-movement around the spawn cell.
    const angle = 2 * Math.PI * e.frequency * time + e.phase
    const { x, y } = patternOffset(
      e.movementPattern, e.anchorX, e.anchorY, e.amplitudeX, e.amplitudeY, angle,
    )
    e.x = x
    e.y = y
  }
}
