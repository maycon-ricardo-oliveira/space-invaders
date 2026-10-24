import type { LevelDefinition } from '@si/level-engine'
import type { ShipStats } from './types'

/**
 * STATS-1 — the values the ship used to carry as module constants in GameLoop.
 * Kept as the fallback so every existing `levels.json` plays exactly as before.
 */
export const DEFAULT_SHIP_STATS: ShipStats = {
  moveSpeed: 300,          // px/s
  bulletSpeed: 500,        // px/s
  invincibilityMs: 1500,   // i-frames after taking a hit
  autoFireIntervalMs: 400, // ms between auto-fire shots
}

/** Run-start ship stats for a level: what it asks for, else the default. */
export function shipStatsFrom(params: LevelDefinition['params']): ShipStats {
  return {
    moveSpeed: params.playerSpeed ?? DEFAULT_SHIP_STATS.moveSpeed,
    bulletSpeed: params.playerBulletSpeed ?? DEFAULT_SHIP_STATS.bulletSpeed,
    invincibilityMs: params.playerInvincibilityMs ?? DEFAULT_SHIP_STATS.invincibilityMs,
    autoFireIntervalMs: params.playerFireIntervalMs ?? DEFAULT_SHIP_STATS.autoFireIntervalMs,
  }
}
