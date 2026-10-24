import type { IRenderer } from '@si/level-engine'
import { BULLET_HEIGHT, BULLET_WIDTH, ENTITY_SIZE } from '../game/GameLoop'
import type { GameState } from '../game/types'
import { SPRITES, enemySpriteKey, fitSprite } from './sprites'

const ENEMY_FALLBACK_COLOR = '#ff0000'
const PLAYER_BULLET_COLOR = '#ffffff'
const ENEMY_BULLET_COLOR = '#ff4444'

/**
 * Pickups have no art in the asset pack yet, so they ship as flat colored
 * blocks — matching the HUD fuel bar for fuel, magenta for the damage buff.
 */
export const PICKUP_COLORS = {
  fuel: '#e67e22',
  damage: '#ff2d95',
} as const

/**
 * Draws a frame of game state through any IRenderer. Pure presentation: it
 * reads the state and never mutates it, so it runs identically under Skia
 * (mobile) and Canvas (calibrator).
 *
 * `showPlayer` is the invincibility flash toggle driven by GameScreen.
 */
export function renderScene(renderer: IRenderer, state: GameState, showPlayer = true): void {
  renderer.clear()

  // Pickups sit on the floor, under everything else.
  if (state.fuelPickups) {
    for (const pickup of state.fuelPickups) {
      if (!pickup.active) continue
      renderer.drawRect(pickup.x, pickup.y, ENTITY_SIZE, ENTITY_SIZE, PICKUP_COLORS.fuel)
    }
  }
  if (state.damagePickups) {
    for (const pickup of state.damagePickups) {
      if (!pickup.active) continue
      renderer.drawRect(pickup.x, pickup.y, ENTITY_SIZE, ENTITY_SIZE, PICKUP_COLORS.damage)
    }
  }

  for (const enemy of state.enemies) {
    if (!enemy.alive) continue
    const key = enemySpriteKey(enemy.typeId)
    if (!key) {
      renderer.drawRect(enemy.x, enemy.y, ENTITY_SIZE, ENTITY_SIZE, ENEMY_FALLBACK_COLOR)
      continue
    }
    const sprite = SPRITES[key]
    const box = fitSprite(sprite, enemy.x, enemy.y, ENTITY_SIZE, ENTITY_SIZE)
    renderer.drawSprite(sprite, box.x, box.y, box.width, box.height)
  }

  if (showPlayer) {
    const sprite = SPRITES.player
    const box = fitSprite(sprite, state.player.x, state.player.y, ENTITY_SIZE, ENTITY_SIZE)
    renderer.drawSprite(sprite, box.x, box.y, box.width, box.height)
  }

  for (const b of state.playerBullets) {
    if (!b.active) continue
    renderer.drawRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT, PLAYER_BULLET_COLOR)
  }
  for (const b of state.enemyBullets) {
    if (!b.active) continue
    renderer.drawRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT, ENEMY_BULLET_COLOR)
  }
}

