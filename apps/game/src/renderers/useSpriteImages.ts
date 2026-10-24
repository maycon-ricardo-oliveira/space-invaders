import { useMemo } from 'react'
import { useImage } from '@shopify/react-native-skia'
import { SPRITE_KEYS } from '../render/sprites'
import type { SpriteImages } from './SkiaRenderer'
import { SPRITE_ASSETS } from './spriteAssets'

/**
 * Preloads every sprite PNG into a Skia image. `useImage` decodes
 * asynchronously and returns null until it is done, so the first frames may
 * render before the atlas is ready — SkiaRenderer falls back to a rectangle in
 * that window instead of dropping the frame.
 *
 * SPRITE_KEYS is a module constant, so the hook count is fixed across renders.
 */
export function useSpriteImages(): SpriteImages {
  const decoded = SPRITE_KEYS.map(key => useImage(SPRITE_ASSETS[key]))

  return useMemo(() => {
    const images: SpriteImages = {}
    SPRITE_KEYS.forEach((key, index) => {
      images[key] = decoded[index]
    })
    return images
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, decoded)
}
