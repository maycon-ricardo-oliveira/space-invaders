import { SPRITES, SPRITE_KEYS, enemySpriteKey, fitSprite } from '../render/sprites'

describe('sprite registry', () => {
  it('exposes a sprite for the player', () => {
    expect(SPRITES.player.source).toBe('player')
  })

  it('declares the intrinsic pixel size of every sprite', () => {
    for (const key of SPRITE_KEYS) {
      expect(SPRITES[key].width).toBeGreaterThan(0)
      expect(SPRITES[key].height).toBeGreaterThan(0)
    }
  })

  it('uses the sprite key as the source so the renderer can look it up', () => {
    for (const key of SPRITE_KEYS) {
      expect(SPRITES[key].source).toBe(key)
    }
  })

  it('maps every registered enemy type to a sprite key', () => {
    expect(enemySpriteKey('basic-enemy')).toBe('enemy-basic')
    expect(enemySpriteKey('fast-enemy')).toBe('enemy-fast')
    expect(enemySpriteKey('strong-enemy')).toBe('enemy-strong')
    expect(enemySpriteKey('asteroid')).toBe('asteroid')
  })

  it('returns null for an unknown enemy type so the caller can fall back', () => {
    expect(enemySpriteKey('boss-enemy')).toBeNull()
  })
})

describe('fitSprite', () => {
  it('fills the box exactly when the aspect ratios match', () => {
    const box = fitSprite({ source: 'asteroid', width: 192, height: 192 }, 10, 20, 32, 32)
    expect(box).toEqual({ x: 10, y: 20, width: 32, height: 32 })
  })

  it('letterboxes a wide sprite: full width, centered vertically', () => {
    const box = fitSprite({ source: 'enemy-basic', width: 80, height: 40 }, 0, 0, 32, 32)
    expect(box.width).toBe(32)
    expect(box.height).toBe(16)
    expect(box.x).toBe(0)
    expect(box.y).toBe(8)
  })

  it('pillarboxes a tall sprite: full height, centered horizontally', () => {
    const box = fitSprite({ source: 'player', width: 16, height: 32 }, 100, 200, 32, 32)
    expect(box.width).toBe(16)
    expect(box.height).toBe(32)
    expect(box.x).toBe(108)
    expect(box.y).toBe(200)
  })

  it('falls back to the raw box when the sprite has no intrinsic size', () => {
    const box = fitSprite({ source: 'player', width: 0, height: 0 }, 5, 6, 32, 32)
    expect(box).toEqual({ x: 5, y: 6, width: 32, height: 32 })
  })

  it('does not allocate a sprite larger than the box', () => {
    const box = fitSprite({ source: 'asteroid', width: 500, height: 100 }, 0, 0, 32, 32)
    expect(box.width).toBeLessThanOrEqual(32)
    expect(box.height).toBeLessThanOrEqual(32)
  })
})
