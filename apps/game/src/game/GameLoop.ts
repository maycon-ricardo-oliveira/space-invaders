import type { IRenderer, LevelDefinition } from '@si/level-engine'
import type { Bullet, Enemy, GameState } from './types'

export const CANVAS_WIDTH = 390
export const CANVAS_HEIGHT = 844
export const ENTITY_SIZE = 32
export const TOTAL_STORY_LEVELS = 20

const PLAYER_SPEED = 200           // px/s
const BULLET_SPEED = 500           // px/s
const BULLET_WIDTH = 4
const BULLET_HEIGHT = 8
const ENEMY_SPEED_SCALE = 40       // px/s per unit of LevelParams.enemySpeed
const ENEMY_SHOT_SPEED_SCALE = 50  // px/s per unit of LevelParams.enemyShotSpeed
const AUTO_FIRE_INTERVAL = 400     // ms between auto-fire shots
const INVINCIBILITY_DURATION = 1500 // ms of player invincibility after a hit

export class GameLoop {
  private state: GameState
  private enemyDirection = 1 // 1 = right, -1 = left
  private shotCooldown: number
  private readonly params: LevelDefinition['params']
  private isFiring = false
  private autoFireTimer = 0

  constructor(level: LevelDefinition) {
    this.params = level.params
    this.shotCooldown = level.params.enemyShotDelay
    this.state = {
      player: {
        x: CANVAS_WIDTH / 2 - ENTITY_SIZE / 2,
        y: CANVAS_HEIGHT - ENTITY_SIZE - 20,
        lives: 3,
        invincibilityTimer: 0,
      },
      enemies: this.buildEnemies(level),
      playerBullets: [],
      enemyBullets: [],
      score: 0,
      status: 'playing',
    }
  }

  private buildEnemies(level: LevelDefinition): Enemy[] {
    if (level.entities.length > 0) {
      return level.entities.map(e => ({
        x: e.x,
        y: e.y,
        alive: true,
        typeId: e.entityTypeId,
      }))
    }
    const count = level.params.numberOfEnemies
    if (count <= 0) return []
    const cols = Math.min(count, 5)
    const rows = Math.ceil(count / cols)
    const gap = 10
    const totalWidth = cols * ENTITY_SIZE + (cols - 1) * gap
    const startX = Math.round((CANVAS_WIDTH - totalWidth) / 2)
    const enemies: Enemy[] = []
    let placed = 0
    for (let row = 0; row < rows && placed < count; row++) {
      for (let col = 0; col < cols && placed < count; col++) {
        enemies.push({
          x: startX + col * (ENTITY_SIZE + gap),
          y: 60 + row * (ENTITY_SIZE + gap),
          alive: true,
          typeId: 'basic-enemy',
        })
        placed++
      }
    }
    return enemies
  }

  getState(): GameState {
    return {
      player: { ...this.state.player },
      enemies: this.state.enemies.map(e => ({ ...e })),
      playerBullets: this.state.playerBullets.map(b => ({ ...b })),
      enemyBullets: this.state.enemyBullets.map(b => ({ ...b })),
      score: this.state.score,
      status: this.state.status,
    }
  }

  moveLeft(deltaMs: number): void {
    if (this.state.status !== 'playing') return
    this.state.player.x = Math.max(
      0,
      this.state.player.x - (PLAYER_SPEED * deltaMs) / 1000,
    )
  }

  moveRight(deltaMs: number): void {
    if (this.state.status !== 'playing') return
    this.state.player.x = Math.min(
      CANVAS_WIDTH - ENTITY_SIZE,
      this.state.player.x + (PLAYER_SPEED * deltaMs) / 1000,
    )
  }

  /** Called by GameScreen when the player's finger touches or lifts. */
  setFiring(active: boolean): void {
    this.isFiring = active
    if (!active) this.autoFireTimer = 0  // reset so next touch fires immediately
  }

  fire(): void {
    if (this.state.status !== 'playing') return
    this.state.playerBullets.push({
      x: this.state.player.x + ENTITY_SIZE / 2 - BULLET_WIDTH / 2,
      y: this.state.player.y,
      active: true,
    })
  }

  update(deltaMs: number): void {
    if (this.state.status !== 'playing') return
    const dt = deltaMs / 1000
    this.moveBullets(dt)
    this.moveEnemies(dt)
    this.handleEnemyShooting(dt)
    this.checkCollisions()
    this.updateInvincibility(deltaMs)
    this.handleAutoFire(deltaMs)
    this.checkWinLose()
  }

  private moveBullets(dt: number): void {
    for (const b of this.state.playerBullets) {
      if (!b.active) continue
      b.y -= BULLET_SPEED * dt
      if (b.y + BULLET_HEIGHT < 0) b.active = false
    }
    const speed = this.params.enemyShotSpeed * ENEMY_SHOT_SPEED_SCALE
    for (const b of this.state.enemyBullets) {
      if (!b.active) continue
      b.y += speed * dt
      if (b.y > CANVAS_HEIGHT) b.active = false
    }
  }

  private moveEnemies(dt: number): void {
    const speed = this.params.enemySpeed * ENEMY_SPEED_SCALE
    if (speed === 0) return
    const alive = this.state.enemies.filter(e => e.alive)
    if (alive.length === 0) return
    let hitEdge = false
    for (const e of alive) {
      e.x += speed * this.enemyDirection * dt
      if (this.enemyDirection === 1 && e.x + ENTITY_SIZE > CANVAS_WIDTH) hitEdge = true
      if (this.enemyDirection === -1 && e.x < 0) hitEdge = true
    }
    if (hitEdge) {
      this.enemyDirection *= -1
      for (const e of alive) {
        e.y += ENTITY_SIZE
      }
    }
  }

  private handleEnemyShooting(dt: number): void {
    this.shotCooldown -= dt
    if (this.shotCooldown > 0) return
    this.shotCooldown = this.params.enemyShotDelay
    const alive = this.state.enemies.filter(e => e.alive)
    if (alive.length === 0) return
    const shooter = alive[Math.floor(Math.random() * alive.length)]
    this.state.enemyBullets.push({
      x: shooter.x + ENTITY_SIZE / 2 - BULLET_WIDTH / 2,
      y: shooter.y + ENTITY_SIZE,
      active: true,
    })
  }

  private checkCollisions(): void {
    for (const bullet of this.state.playerBullets) {
      if (!bullet.active) continue
      for (const enemy of this.state.enemies) {
        if (!enemy.alive) continue
        if (
          bullet.x < enemy.x + ENTITY_SIZE &&
          bullet.x + BULLET_WIDTH > enemy.x &&
          bullet.y < enemy.y + ENTITY_SIZE &&
          bullet.y + BULLET_HEIGHT > enemy.y
        ) {
          bullet.active = false
          enemy.alive = false
          this.state.score += 100
        }
      }
    }
    const p = this.state.player
    for (const bullet of this.state.enemyBullets) {
      if (!bullet.active) continue
      if (p.invincibilityTimer > 0) continue  // player is invincible — skip
      if (
        bullet.x < p.x + ENTITY_SIZE &&
        bullet.x + BULLET_WIDTH > p.x &&
        bullet.y < p.y + ENTITY_SIZE &&
        bullet.y + BULLET_HEIGHT > p.y
      ) {
        bullet.active = false
        p.lives -= 1
        p.invincibilityTimer = INVINCIBILITY_DURATION
      }
    }
  }

  private updateInvincibility(deltaMs: number): void {
    if (this.state.player.invincibilityTimer > 0) {
      this.state.player.invincibilityTimer = Math.max(
        0,
        this.state.player.invincibilityTimer - deltaMs,
      )
    }
  }

  private handleAutoFire(deltaMs: number): void {
    if (!this.isFiring) return
    this.autoFireTimer -= deltaMs
    if (this.autoFireTimer <= 0) {
      this.fire()
      this.autoFireTimer = AUTO_FIRE_INTERVAL
    }
  }

  private checkWinLose(): void {
    if (this.state.enemies.length > 0 && this.state.enemies.every(e => !e.alive)) {
      this.state.status = 'won'
      return
    }
    if (this.state.player.lives <= 0) {
      this.state.status = 'lost'
    }
  }

  render(renderer: IRenderer, showPlayer = true): void {
    renderer.clear()
    if (showPlayer) {
      renderer.drawRect(
        this.state.player.x,
        this.state.player.y,
        ENTITY_SIZE,
        ENTITY_SIZE,
        '#00ff00',
      )
    }
    for (const enemy of this.state.enemies) {
      if (!enemy.alive) continue
      renderer.drawRect(enemy.x, enemy.y, ENTITY_SIZE, ENTITY_SIZE, '#ff0000')
    }
    for (const b of this.state.playerBullets) {
      if (!b.active) continue
      renderer.drawRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT, '#ffffff')
    }
    for (const b of this.state.enemyBullets) {
      if (!b.active) continue
      renderer.drawRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT, '#ff4444')
    }
  }
}
