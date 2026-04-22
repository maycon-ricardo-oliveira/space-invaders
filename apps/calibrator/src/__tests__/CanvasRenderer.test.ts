import { CanvasRenderer } from '../renderers/CanvasRenderer'

function makeCtx(width = 360, height = 640) {
  return {
    canvas: { width, height },
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    fillStyle: '' as string,
  } as unknown as CanvasRenderingContext2D
}

describe('CanvasRenderer', () => {
  it('clear() calls clearRect with full canvas dimensions', () => {
    const ctx = makeCtx()
    const renderer = new CanvasRenderer(ctx)
    renderer.clear()
    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 360, 640)
  })

  it('drawRect() sets fillStyle and calls fillRect', () => {
    const ctx = makeCtx()
    const renderer = new CanvasRenderer(ctx)
    renderer.drawRect(10, 20, 30, 40, '#ff0000')
    expect(ctx.fillStyle).toBe('#ff0000')
    expect(ctx.fillRect).toHaveBeenCalledWith(10, 20, 30, 40)
  })

  it('drawSprite() draws a fallback rect at the given position', () => {
    const ctx = makeCtx()
    const renderer = new CanvasRenderer(ctx)
    renderer.drawSprite({ source: 'basic-enemy', width: 32, height: 32 }, 50, 60, 32, 32)
    expect(ctx.fillStyle).toBe('#888')
    expect(ctx.fillRect).toHaveBeenCalledWith(50, 60, 32, 32)
  })
})
