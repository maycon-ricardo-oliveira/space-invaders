import type { Enemy, GameState } from '../types'
import { aabb } from '../aabb'

export interface CollisionContext {
  state: GameState
  entitySize: number
  bulletWidth: number
  bulletHeight: number
  invincibilityDuration: number
  /** Current level index, gates asteroid fuel drops. */
  levelIndex: number
  asteroidFuelDropMinLevel: number
  asteroidFuelDropChance: number
}

/**
 * Resolves all three collision passes (player bullets vs enemies, enemy bullets
 * vs player, body contact). Returns true when the player took a hit this tick so
 * the caller can hold i-frames for the frame. May set status to 'card_selection'
 * on level-up. Pure over the slice (RNG via Math.random as before).
 */
export function resolveCollisions(ctx: CollisionContext): boolean {
  const { state, entitySize, bulletWidth, bulletHeight, invincibilityDuration } = ctx
  let hit = false

  for (const bullet of state.playerBullets) {
    if (!bullet.active) continue
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue
      if (
        aabb(
          { x: bullet.x, y: bullet.y, w: bulletWidth, h: bulletHeight },
          { x: enemy.x, y: enemy.y, w: entitySize, h: entitySize },
        )
      ) {
        bullet.active = false
        enemy.hp -= state.player.bulletDamage
        if (enemy.hp <= 0) onEnemyKilled(enemy, ctx)
        break
      }
    }
  }

  const p = state.player
  for (const bullet of state.enemyBullets) {
    if (!bullet.active) continue
    if (p.invincibilityTimer > 0) continue // player is invincible — skip
    if (
      aabb(
        { x: bullet.x, y: bullet.y, w: bulletWidth, h: bulletHeight },
        { x: p.x, y: p.y, w: entitySize, h: entitySize },
      )
    ) {
      bullet.active = false
      p.hp = Math.max(0, p.hp - 1)
      p.invincibilityTimer = invincibilityDuration
      hit = true
    }
  }

  // Body contact: any live enemy (including obstacles) overlapping the player
  // deals 1 hp and triggers i-frames, mirroring the bullet-hit path.
  if (p.invincibilityTimer <= 0) {
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue
      if (
        aabb(
          { x: enemy.x, y: enemy.y, w: entitySize, h: entitySize },
          { x: p.x, y: p.y, w: entitySize, h: entitySize },
        )
      ) {
        p.hp = Math.max(0, p.hp - 1)
        p.invincibilityTimer = invincibilityDuration
        hit = true
        break
      }
    }
  }

  return hit
}

/** One coherent on-kill event: score, xp, level-up, and pickup drops. */
function onEnemyKilled(enemy: Enemy, ctx: CollisionContext): void {
  const { state, levelIndex, asteroidFuelDropMinLevel, asteroidFuelDropChance } = ctx
  enemy.alive = false
  enemy.killed = true
  state.score += 100
  state.player.xp += enemy.xpValue ?? 1
  if (state.player.xp >= state.player.xpToNext) {
    state.player.playerLevel += 1
    state.player.xp = 0
    state.status = 'card_selection'
  }
  if (enemy.dropsPickup === 'damage') {
    if (Math.random() < 0.5) {
      state.damagePickups.push({ x: enemy.x, y: enemy.y, active: true })
    }
  }
  if (
    enemy.typeId === 'asteroid' &&
    levelIndex >= asteroidFuelDropMinLevel &&
    Math.random() < asteroidFuelDropChance
  ) {
    state.fuelPickups.push({ x: enemy.x, y: enemy.y, active: true })
  }
}
