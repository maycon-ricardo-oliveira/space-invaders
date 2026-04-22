import type { IRenderer, Sprite } from '@si/level-engine'

export class CanvasRenderer implements IRenderer {
  constructor(private readonly ctx: CanvasRenderingContext2D) {}

  clear(): void {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height)
  }

  drawSprite(_sprite: Sprite, x: number, y: number, width: number, height: number): void {
    this.ctx.fillStyle = '#888'
    this.ctx.fillRect(x, y, width, height)
  }

  drawRect(x: number, y: number, width: number, height: number, color: string): void {
    this.ctx.fillStyle = color
    this.ctx.fillRect(x, y, width, height)
  }
}
