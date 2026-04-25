import type { SkCanvas } from '@shopify/react-native-skia'
import { Skia } from '@shopify/react-native-skia'
import type { IRenderer, Sprite } from '@si/level-engine'

export class SkiaRenderer implements IRenderer {
  private _canvas: SkCanvas | null = null
  readonly canvasWidth: number
  readonly canvasHeight: number

  constructor(width: number, height: number) {
    this.canvasWidth = width
    this.canvasHeight = height
  }

  setCanvas(canvas: SkCanvas): void {
    this._canvas = canvas
  }

  clear(): void {
    if (!this._canvas) return
    this._canvas.clear(Skia.Color('black'))
  }

  drawRect(x: number, y: number, width: number, height: number, color: string): void {
    if (!this._canvas) return
    const paint = Skia.Paint()
    paint.setColor(Skia.Color(color))
    this._canvas.drawRect(Skia.XYWHRect(x, y, width, height), paint)
  }

  drawSprite(sprite: Sprite, x: number, y: number, width: number, height: number): void {
    // Sprint 3 MVP: render as a white rectangle until sprite loading is implemented
    this.drawRect(x, y, width, height, '#ffffff')
  }
}
