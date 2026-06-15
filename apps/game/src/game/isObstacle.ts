import type { Enemy } from './types'

/**
 * Obstacles (asteroids / vertical movers) are not combat targets and never
 * count toward the win. Single source of truth for the "is this an obstacle"
 * rule: an enemy is an obstacle if its type is 'asteroid' OR it moves vertically.
 */
export function isObstacle(enemy: Enemy): boolean {
  return enemy.typeId === 'asteroid' || enemy.movementType === 'vertical'
}
