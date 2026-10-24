jest.mock('@shopify/react-native-skia', () => {
  const decoded = new Map<unknown, unknown>()
  return {
    useImage: jest.fn((source: unknown) => {
      if (!decoded.has(source)) decoded.set(source, { source })
      return decoded.get(source)
    }),
  }
})

import { renderHook } from '@testing-library/react-native'
import { useImage } from '@shopify/react-native-skia'
import { SPRITE_KEYS } from '../render/sprites'
import { SPRITE_ASSETS } from '../renderers/spriteAssets'
import { useSpriteImages } from '../renderers/useSpriteImages'

describe('SPRITE_ASSETS', () => {
  it('binds every sprite key to a bundled asset', () => {
    for (const key of SPRITE_KEYS) {
      expect(SPRITE_ASSETS[key]).toBeDefined()
    }
  })

  it('does not bind assets that no sprite key claims', () => {
    expect(Object.keys(SPRITE_ASSETS).sort()).toEqual([...SPRITE_KEYS].sort())
  })
})

describe('useSpriteImages', () => {
  it('exposes one entry per sprite key', () => {
    const { result } = renderHook(() => useSpriteImages())
    expect(Object.keys(result.current).sort()).toEqual([...SPRITE_KEYS].sort())
  })

  it('decodes each sprite from its bundled asset', () => {
    renderHook(() => useSpriteImages())
    for (const key of SPRITE_KEYS) {
      expect(useImage).toHaveBeenCalledWith(SPRITE_ASSETS[key])
    }
  })

  it('keeps a stable object across re-renders so consumers do not re-run', () => {
    const { result, rerender } = renderHook(() => useSpriteImages())
    const first = result.current
    rerender({})
    expect(result.current).toBe(first)
  })

  it('reports null for an image that has not decoded yet', () => {
    ;(useImage as jest.Mock).mockReturnValue(null)
    const { result } = renderHook(() => useSpriteImages())
    expect(result.current.player).toBeNull()
  })
})
