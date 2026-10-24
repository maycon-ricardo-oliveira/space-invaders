jest.mock('@shopify/react-native-skia', () => ({
  Skia: {
    Color: jest.fn((c: string) => c),
    Paint: jest.fn(() => ({ setColor: jest.fn() })),
    XYWHRect: jest.fn((x: number, y: number, w: number, h: number) => ({ x, y, w, h })),
  },
}))

import { SkiaRenderer } from '../renderers/SkiaRenderer'
import { Skia } from '@shopify/react-native-skia'

function makeMockCanvas() {
  return { clear: jest.fn(), drawRect: jest.fn(), drawImageRect: jest.fn() } as any
}

describe('SkiaRenderer', () => {
  let renderer: SkiaRenderer

  beforeEach(() => {
    renderer = new SkiaRenderer(390, 844)
    jest.clearAllMocks()
  })

  it('exposes canvasWidth from constructor', () => {
    expect(renderer.canvasWidth).toBe(390)
  })

  it('exposes canvasHeight from constructor', () => {
    expect(renderer.canvasHeight).toBe(844)
  })

  it('clear() does nothing when canvas is not set', () => {
    expect(() => renderer.clear()).not.toThrow()
  })

  it('drawRect() does nothing when canvas is not set', () => {
    expect(() => renderer.drawRect(0, 0, 10, 10, 'red')).not.toThrow()
  })

  it('clear() calls canvas.clear with the black color value', () => {
    const canvas = makeMockCanvas()
    renderer.setCanvas(canvas)
    renderer.clear()
    expect(canvas.clear).toHaveBeenCalledTimes(1)
    expect(Skia.Color).toHaveBeenCalledWith('black')
  })

  it('drawRect() calls canvas.drawRect once with a Skia rect', () => {
    const canvas = makeMockCanvas()
    renderer.setCanvas(canvas)
    renderer.drawRect(10, 20, 30, 40, '#ff0000')
    expect(canvas.drawRect).toHaveBeenCalledTimes(1)
    expect(Skia.XYWHRect).toHaveBeenCalledWith(10, 20, 30, 40)
    expect(Skia.Paint).toHaveBeenCalled()
  })

  it('drawSprite() falls back to drawRect (white fill MVP)', () => {
    const canvas = makeMockCanvas()
    renderer.setCanvas(canvas)
    renderer.drawSprite({ source: 'enemy.png', width: 32, height: 32 }, 10, 20, 32, 32)
    expect(canvas.drawRect).toHaveBeenCalledTimes(1)
    expect(Skia.Color).toHaveBeenCalledWith('#ffffff')
  })
})

describe('SkiaRenderer — sprite images', () => {
  function makeImage(width: number, height: number) {
    return { width: () => width, height: () => height } as any
  }

  let renderer: SkiaRenderer

  beforeEach(() => {
    renderer = new SkiaRenderer(390, 844)
    jest.clearAllMocks()
  })

  it('draws the registered image instead of the white rect fallback', () => {
    const canvas = makeMockCanvas()
    const image = makeImage(96, 120)
    renderer.setCanvas(canvas)
    renderer.setImages({ player: image })

    renderer.drawSprite({ source: 'player', width: 96, height: 120 }, 10, 20, 32, 40)

    expect(canvas.drawImageRect).toHaveBeenCalledTimes(1)
    expect(canvas.drawRect).not.toHaveBeenCalled()
    expect(canvas.drawImageRect.mock.calls[0][0]).toBe(image)
  })

  it('draws the full image into the destination box it was given', () => {
    const canvas = makeMockCanvas()
    renderer.setCanvas(canvas)
    renderer.setImages({ player: makeImage(96, 120) })

    renderer.drawSprite({ source: 'player', width: 96, height: 120 }, 10, 20, 32, 40)

    expect(Skia.XYWHRect).toHaveBeenCalledWith(0, 0, 96, 120)
    expect(Skia.XYWHRect).toHaveBeenCalledWith(10, 20, 32, 40)
  })

  it('falls back to the white rect when the source has no image loaded yet', () => {
    const canvas = makeMockCanvas()
    renderer.setCanvas(canvas)
    renderer.setImages({ player: null })

    renderer.drawSprite({ source: 'player', width: 96, height: 120 }, 0, 0, 32, 32)

    expect(canvas.drawImageRect).not.toHaveBeenCalled()
    expect(canvas.drawRect).toHaveBeenCalledTimes(1)
    expect(Skia.Color).toHaveBeenCalledWith('#ffffff')
  })

  it('falls back to the white rect for a source that is not registered', () => {
    const canvas = makeMockCanvas()
    renderer.setCanvas(canvas)
    renderer.setImages({ player: makeImage(96, 120) })

    renderer.drawSprite({ source: 'enemy-basic', width: 84, height: 54 }, 0, 0, 32, 32)

    expect(canvas.drawImageRect).not.toHaveBeenCalled()
    expect(canvas.drawRect).toHaveBeenCalledTimes(1)
  })

  it('drops previously registered images when setImages(null) is called', () => {
    const canvas = makeMockCanvas()
    renderer.setCanvas(canvas)
    renderer.setImages({ player: makeImage(96, 120) })
    renderer.setImages(null)

    renderer.drawSprite({ source: 'player', width: 96, height: 120 }, 0, 0, 32, 32)

    expect(canvas.drawImageRect).not.toHaveBeenCalled()
    expect(canvas.drawRect).toHaveBeenCalledTimes(1)
  })

  it('reuses one source rect per image across frames', () => {
    const canvas = makeMockCanvas()
    renderer.setCanvas(canvas)
    renderer.setImages({ player: makeImage(96, 120) })
    jest.clearAllMocks()

    renderer.drawSprite({ source: 'player', width: 96, height: 120 }, 0, 0, 32, 32)
    renderer.drawSprite({ source: 'player', width: 96, height: 120 }, 0, 0, 32, 32)

    const srcRectCalls = (Skia.XYWHRect as jest.Mock).mock.calls.filter(
      ([x, y, w, h]) => x === 0 && y === 0 && w === 96 && h === 120,
    )
    expect(srcRectCalls).toHaveLength(0)
  })

  it('drawSprite() does nothing when canvas is not set', () => {
    renderer.setImages({ player: makeImage(96, 120) })
    expect(() =>
      renderer.drawSprite({ source: 'player', width: 96, height: 120 }, 0, 0, 1, 1),
    ).not.toThrow()
  })
})
