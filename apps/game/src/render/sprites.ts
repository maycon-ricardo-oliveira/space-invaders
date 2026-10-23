import type { Sprite } from '@si/level-engine'

/**
 * Sprite catalogue — pure data, renderer agnostic.
 *
 * The key doubles as `Sprite.source`: the renderer receives the source string
 * and looks the decoded image up in its own atlas. Nothing here knows about
 * Skia, Canvas or require() — see `renderers/spriteAssets.ts` for the binding
 * between a key and the actual PNG file.
 *
 * `width`/`height` are the intrinsic pixel sizes of the PNGs, used by
 * `fitSprite` to letterbox the art inside the (square) entity box instead of
 * stretching it.
 */
export const SPRITE_KEYS = [
  'player',
  'enemy-basic',
  'enemy-fast',
  'enemy-strong',
  'asteroid',
] as const

export type SpriteKey = (typeof SPRITE_KEYS)[number]

export const SPRITES: Record<SpriteKey, Sprite> = {
  player: { source: 'player', width: 96, height: 120 },
  'enemy-basic': { source: 'enemy-basic', width: 84, height: 54 },
  'enemy-fast': { source: 'enemy-fast', width: 72, height: 48 },
  'enemy-strong': { source: 'enemy-strong', width: 84, height: 48 },
  asteroid: { source: 'asteroid', width: 192, height: 192 },
}

const ENEMY_SPRITE_BY_TYPE: Record<string, SpriteKey> = {
  'basic-enemy': 'enemy-basic',
  'fast-enemy': 'enemy-fast',
  'strong-enemy': 'enemy-strong',
  asteroid: 'asteroid',
}

/** Sprite key for an enemy typeId, or null when the type has no art yet. */
export function enemySpriteKey(typeId: string): SpriteKey | null {
  return ENEMY_SPRITE_BY_TYPE[typeId] ?? null
}

export interface SpriteBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Contains the sprite inside the box preserving its aspect ratio, centered.
 * Entity boxes are square (ENTITY_SIZE) but the art is not, so stretching would
 * distort every creature. Degenerate sprites fall back to the raw box.
 */
export function fitSprite(
  sprite: Sprite,
  x: number,
  y: number,
  width: number,
  height: number,
): SpriteBox {
  if (sprite.width <= 0 || sprite.height <= 0) return { x, y, width, height }

  const scale = Math.min(width / sprite.width, height / sprite.height)
  const w = sprite.width * scale
  const h = sprite.height * scale

  return { x: x + (width - w) / 2, y: y + (height - h) / 2, width: w, height: h }
}
