import type { SpriteKey } from '../render/sprites'

/**
 * Binds every sprite key to the bundled PNG. Metro resolves these `require`
 * calls at bundle time, so the files ship with the app and travel over EAS
 * Update like any other asset.
 *
 * Art comes from the procedural asset pack (Documentations/Space-Invaders/
 * assets-preview): player = player-equipped-base-cannon, enemy-basic = beetle,
 * enemy-fast = wraith, enemy-strong = mech, asteroid = terrain-wreckage.
 */
export const SPRITE_ASSETS: Record<SpriteKey, number> = {
  player: require('../../assets/sprites/player.png'),
  'enemy-basic': require('../../assets/sprites/enemy-basic.png'),
  'enemy-fast': require('../../assets/sprites/enemy-fast.png'),
  'enemy-strong': require('../../assets/sprites/enemy-strong.png'),
  asteroid: require('../../assets/sprites/asteroid.png'),
}
