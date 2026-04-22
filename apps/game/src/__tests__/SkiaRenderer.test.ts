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
  return { clear: jest.fn(), drawRect: jest.fn() } as any
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
