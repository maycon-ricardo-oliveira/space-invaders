import type { SkCanvas, SkImage, SkPaint, SkRect } from '@shopify/react-native-skia'
import { Skia } from '@shopify/react-native-skia'
import type { IRenderer, Sprite } from '@si/level-engine'

/** Decoded images keyed by `Sprite.source`. `null` = still loading / missing. */
export type SpriteImages = Record<string, SkImage | null>

interface AtlasEntry {
  image: SkImage
  src: SkRect
}

export class SkiaRenderer implements IRenderer {
  private _canvas: SkCanvas | null = null
  private atlas = new Map<string, AtlasEntry>()
  private readonly spritePaint: SkPaint
  readonly canvasWidth: number
  readonly canvasHeight: number

  constructor(width: number, height: number) {
    this.canvasWidth = width
    this.canvasHeight = height
    this.spritePaint = Skia.Paint()
  }

  setCanvas(canvas: SkCanvas): void {
    this._canvas = canvas
  }

  /**
   * Registers the decoded sprite images. Called once images finish loading (and
   * again if they change) — never per frame. The source rect of each image is
   * computed here so the hot path allocates only the destination rect.
   */
  setImages(images: SpriteImages | null): void {
    this.atlas.clear()
    if (!images) return
    for (const source of Object.keys(images)) {
      const image = images[source]
      if (!image) continue
      this.atlas.set(source, {
        image,
        src: Skia.XYWHRect(0, 0, image.width(), image.height()),
      })
    }
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
    if (!this._canvas) return
    const entry = this.atlas.get(sprite.source)
    if (!entry) {
      // Image not loaded (or no art for this source yet) — keep the frame alive.
      this.drawRect(x, y, width, height, '#ffffff')
      return
    }
    this._canvas.drawImageRect(
      entry.image,
      entry.src,
      Skia.XYWHRect(x, y, width, height),
      this.spritePaint,
    )
  }
}
