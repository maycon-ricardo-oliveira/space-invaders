import type { EntityPlacement, IRenderer, LevelDefinition, Wave } from '@si/level-engine'
import type { Bullet, DamagePickup, Enemy, FuelPickup, GameState, MovementPattern } from './types'

type GameEvent = 'wave:cleared' | 'wave:started'

export const CANVAS_WIDTH = 390
export const CANVAS_HEIGHT = 844
export const ENTITY_SIZE = 32
export const TOTAL_STORY_LEVELS = 20

const PLAYER_SPEED = 300           // px/s
const BULLET_SPEED = 500           // px/s
const BULLET_WIDTH = 4
const BULLET_HEIGHT = 8
const ENEMY_SPEED_SCALE = 40       // px/s per unit of LevelParams.enemySpeed
const ENEMY_SHOT_SPEED_SCALE = 50  // px/s per unit of LevelParams.enemyShotSpeed
const AUTO_FIRE_INTERVAL = 400     // ms between auto-fire shots
const INVINCIBILITY_DURATION = 1500 // ms of player invincibility after a hit
const PLAYER_INITIAL_HP = 500
const PLAYER_INITIAL_FUEL = 100
const ASTEROID_FUEL_DROP_CHANCE = 0.3
const ASTEROID_FUEL_DROP_MIN_LEVEL = 5
const SQRT2_2 = Math.SQRT1_2 // √2/2 = sin(45°) = cos(45°); unit diagonal component

export class GameLoop {
  private state: GameState
  private movementTime = 0 // seconds accumulated, drives the micro-movement sines
  private shotCooldown: number
  private readonly params: LevelDefinition['params']
  private readonly levelIndex: number
  private isFiring = false
  private autoFireTimer = 0
  private hitThisTick = false
  private burstQueue: Array<{ enemy: Enemy; remaining: number; burstTimer: number }> = []
  private readonly BURST_INTERVAL_MS = 50
  private readonly waves: Wave[]
  private currentWaveIndex = 0
  private waitingForWaveAdvance = false
  private readonly listeners: Map<GameEvent, Array<() => void>> = new Map()

  constructor(level: LevelDefinition) {
    this.params = level.params
    this.levelIndex = level.levelIndex ?? 0
    this.waves = level.waves ?? []
    this.shotCooldown = level.params.enemyShotDelay
    this.state = {
      player: {
        x: CANVAS_WIDTH / 2 - ENTITY_SIZE / 2,
        y: CANVAS_HEIGHT - ENTITY_SIZE - 20,
        hp: PLAYER_INITIAL_HP,
        maxHp: PLAYER_INITIAL_HP,
        fuel: PLAYER_INITIAL_FUEL,
        invincibilityTimer: 0,
        xp: 0,
        xpToNext: 10,
        playerLevel: 1,
        bulletDamage: 20,
      },
      enemies: this.buildEnemies(level),
      playerBullets: [],
      enemyBullets: [],
      fuelPickups: this.buildFuelPickups(level),
      damagePickups: [],
      score: 0,
      status: 'playing',
      currentWave: 1,
      totalWaves: this.waves.length > 0 ? this.waves.length : 1,
    }
  }

  private buildFuelPickups(level: LevelDefinition): FuelPickup[] {
    return level.entities
      .filter(e => e.entityTypeId === 'fuel-pickup')
      .map(e => ({ x: e.x, y: e.y, active: true }))
  }

  private mapPlacementsToEnemies(placements: EntityPlacement[]): Enemy[] {
    return placements
      .filter(e => e.entityTypeId !== 'fuel-pickup')
      .map(e => {
        const props = e.properties ?? {}
        // Prefer an explicit movementPattern; otherwise fall back from the legacy
        // movementType ('vertical' → asteroid 'descend', else 'oscillate-h').
        const movementPattern = (props.movementPattern as MovementPattern)
          ?? (props.movementType === 'vertical' ? 'descend' : 'oscillate-h')
        // phase: honor an explicit value, otherwise derive from the spawn
        // position so neighbors at distinct cells never oscillate in unison.
        const phase = (props.phase as number) ?? e.x * 0.7 + e.y * 1.3
        // Asteroids ('descend') sample their travel direction once, here at
        // spawn, BEFORE any per-tick shooter/drop RNG runs. 1/3 each.
        const { dirX, dirY } = movementPattern === 'descend'
          ? this.rollAsteroidDirection()
          : { dirX: 0, dirY: 0 }
        const amplitudeX = (props.amplitudeX as number) ?? 0
        const amplitudeY = (props.amplitudeY as number) ?? 0
        // Initial position = the pattern evaluated at t=0 (angle = phase), so a
        // freshly spawned orbiter already sits at its cos-offset, not the bare anchor.
        const { x: x0, y: y0 } = this.patternOffset(
          movementPattern, e.x, e.y, amplitudeX, amplitudeY, phase,
        )
        return {
          x: x0,
          y: y0,
          alive: true,
          killed: false,
          typeId: e.entityTypeId,
          hp: (props.hp as number) ?? 100,
          xpValue: (props.xpValue as number) ?? 1,
          movementType: ((props.movementType as string) ?? 'horizontal') as 'horizontal' | 'vertical',
          burstCount: (props.burstCount as number) ?? 1,
          dropsPickup: ((props.dropsPickup as string) ?? null) as 'damage' | null,
          speedMultiplier: (props.speedMultiplier as number) ?? 1.0,
          anchorX: e.x,
          anchorY: e.y,
          movementPattern,
          amplitudeX,
          amplitudeY,
          frequency: (props.frequency as number) ?? 0,
          phase,
          dirX,
          dirY,
        }
      })
  }

  /**
   * Position of a combat enemy = anchor + offset(pattern, amplitude, angle).
   * `angle` already folds in 2π·f·t + phase (at spawn t=0, angle = phase).
   * Non-combat patterns ('descend'/'static') stay on the anchor here.
   */
  private patternOffset(
    pattern: MovementPattern,
    anchorX: number,
    anchorY: number,
    amplitudeX: number,
    amplitudeY: number,
    angle: number,
  ): { x: number; y: number } {
    switch (pattern) {
      case 'oscillate-h':
        return { x: anchorX + amplitudeX * Math.sin(angle), y: anchorY }
      case 'bob-v':
        return { x: anchorX, y: anchorY + amplitudeY * Math.sin(angle) }
      case 'orbit':
        return {
          x: anchorX + amplitudeX * Math.cos(angle),
          y: anchorY + amplitudeY * Math.sin(angle),
        }
      default:
        return { x: anchorX, y: anchorY }
    }
  }

  /** 1/3 each: r<1/3 straight, 1/3<=r<2/3 diag-left, r>=2/3 diag-right. */
  private rollAsteroidDirection(): { dirX: number; dirY: number } {
    const r = Math.random()
    if (r < 1 / 3) return { dirX: 0, dirY: 1 }
    if (r < 2 / 3) return { dirX: -SQRT2_2, dirY: SQRT2_2 }
    return { dirX: SQRT2_2, dirY: SQRT2_2 }
  }

  private buildEnemies(level: LevelDefinition): Enemy[] {
    if (this.waves.length > 0) {
      return this.mapPlacementsToEnemies(this.waves[0].entities)
    }
    if (level.entities.length > 0) {
      return this.mapPlacementsToEnemies(level.entities)
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
        const ex = startX + col * (ENTITY_SIZE + gap)
        const ey = 60 + row * (ENTITY_SIZE + gap)
        enemies.push({
          x: ex,
          y: ey,
          alive: true,
          killed: false,
          typeId: 'basic-enemy',
          hp: 100,
          xpValue: 1,
          movementType: 'horizontal' as const,
          burstCount: 1,
          dropsPickup: null,
          speedMultiplier: 1.0,
          anchorX: ex,
          anchorY: ey,
          movementPattern: 'oscillate-h' as const,
          amplitudeX: 10,
          amplitudeY: 0,
          frequency: 0.5,
          phase: ex * 0.7 + ey * 1.3,
          dirX: 0,
          dirY: 0,
        })
        placed++
      }
    }
    return enemies
  }

  on(event: GameEvent, handler: () => void): void {
    const handlers = this.listeners.get(event)
    if (handlers) handlers.push(handler)
    else this.listeners.set(event, [handler])
  }

  off(event: GameEvent, handler: () => void): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    const idx = handlers.indexOf(handler)
    if (idx !== -1) handlers.splice(idx, 1)
  }

  private emit(event: GameEvent): void {
    const handlers = this.listeners.get(event)
    if (!handlers) return
    for (const h of handlers) h()
  }

  /** Delay (ms) of the wave that advanceWave() would spawn next. 0 if none. */
  getNextWaveDelay(): number {
    const next = this.waves[this.currentWaveIndex + 1]
    return next ? next.delay : 0
  }

  /** Spawns the next wave's enemies and resumes update(). Emits 'wave:started'. */
  advanceWave(): void {
    if (!this.waitingForWaveAdvance) return
    this.currentWaveIndex++
    this.state.enemies = this.mapPlacementsToEnemies(this.waves[this.currentWaveIndex].entities)
    this.waitingForWaveAdvance = false
    this.emit('wave:started')
  }

  getState(): GameState {
    return {
      player: { ...this.state.player },
      enemies: this.state.enemies.map(e => ({ ...e })),
      playerBullets: this.state.playerBullets.map(b => ({ ...b })),
      enemyBullets: this.state.enemyBullets.map(b => ({ ...b })),
      fuelPickups: this.state.fuelPickups.map(f => ({ ...f })),
      damagePickups: this.state.damagePickups.map(d => ({ ...d })),
      score: this.state.score,
      status: this.state.status,
      currentWave: this.currentWaveIndex + 1,
      totalWaves: this.waves.length > 0 ? this.waves.length : 1,
    }
  }

  /**
   * 2D free movement. Normalizes (dirX, dirY) and applies PLAYER_SPEED in that
   * direction, so speed is constant in any direction (diagonals don't accelerate).
   * A zero vector is a no-op (deadzone). Blocked unless status is 'playing'.
   */
  move(dirX: number, dirY: number, deltaMs: number): void {
    if (this.state.status !== 'playing') return
    const magnitude = Math.hypot(dirX, dirY)
    if (magnitude === 0) return
    const distance = (PLAYER_SPEED * deltaMs) / 1000
    const nx = dirX / magnitude
    const ny = dirY / magnitude
    this.state.player.x = Math.max(
      0,
      Math.min(CANVAS_WIDTH - ENTITY_SIZE, this.state.player.x + nx * distance),
    )
    this.state.player.y = Math.max(
      0,
      Math.min(CANVAS_HEIGHT - ENTITY_SIZE, this.state.player.y + ny * distance),
    )
  }

  moveLeft(deltaMs: number): void {
    this.move(-1, 0, deltaMs)
  }

  moveRight(deltaMs: number): void {
    this.move(1, 0, deltaMs)
  }

  /** Archero mechanic: true = auto-fire (stationary), false = stop firing (moving). */
  setFiring(active: boolean): void {
    this.isFiring = active
    if (!active) this.autoFireTimer = 0  // reset so firing resumes immediately on next stationary
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
    if (this.waitingForWaveAdvance) return
    const dt = deltaMs / 1000
    this.hitThisTick = false
    this.drainFuel(dt)
    this.moveBullets(dt)
    this.moveEnemies(dt)
    this.handleEnemyShooting(dt)
    this.checkCollisions()
    this.checkFuelPickupCollisions()
    this.checkDamagePickupCollisions()
    this.updateInvincibility(deltaMs)
    this.handleAutoFire(deltaMs)
    this.checkWinLose()
  }

  resumeFromCardSelection(): void {
    if (this.state.status === 'card_selection') {
      this.state.status = 'playing'
    }
  }

  private drainFuel(dt: number): void {
    const rate = this.params.fuelDrainRate
    if (!rate || rate <= 0) return // no drain unless the level defines a positive rate
    const p = this.state.player
    p.fuel = Math.max(0, Math.min(PLAYER_INITIAL_FUEL, p.fuel - rate * dt))
    if (p.fuel === 0) this.state.status = 'fuelEmpty'
  }

  private checkFuelPickupCollisions(): void {
    const p = this.state.player
    for (const pickup of this.state.fuelPickups) {
      if (!pickup.active) continue
      if (
        p.x < pickup.x + ENTITY_SIZE &&
        p.x + ENTITY_SIZE > pickup.x &&
        p.y < pickup.y + ENTITY_SIZE &&
        p.y + ENTITY_SIZE > pickup.y
      ) {
        pickup.active = false
        p.fuel = Math.min(PLAYER_INITIAL_FUEL, p.fuel + PLAYER_INITIAL_FUEL)
      }
    }
  }

  private checkDamagePickupCollisions(): void {
    const p = this.state.player
    for (const pickup of this.state.damagePickups) {
      if (!pickup.active) continue
      if (
        p.x < pickup.x + ENTITY_SIZE &&
        p.x + ENTITY_SIZE > pickup.x &&
        p.y < pickup.y + ENTITY_SIZE &&
        p.y + ENTITY_SIZE > pickup.y
      ) {
        pickup.active = false
        p.bulletDamage += 2 * p.bulletDamage
      }
    }
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
    this.movementTime += dt
    const t = this.movementTime
    const baseSpeed = this.params.enemySpeed * ENEMY_SPEED_SCALE
    const r = ENTITY_SIZE / 2

    for (const e of this.state.enemies) {
      if (!e.alive) continue

      if (e.movementPattern === 'descend') {
        // Obstacle: travels in a straight line along its fixed (dirX, dirY) unit
        // vector. Same speed in any direction (vector is normalized). Removed
        // once it leaves ANY edge, not just the bottom.
        const speed = baseSpeed * e.speedMultiplier
        e.x += e.dirX * speed * dt
        e.y += e.dirY * speed * dt
        if (e.x < -r || e.x > CANVAS_WIDTH + r || e.y > CANVAS_HEIGHT + r) {
          e.alive = false
        }
        continue
      }

      // Combat enemies: anchored micro-movement around the spawn cell.
      const angle = 2 * Math.PI * e.frequency * t + e.phase
      const { x, y } = this.patternOffset(
        e.movementPattern, e.anchorX, e.anchorY, e.amplitudeX, e.amplitudeY, angle,
      )
      e.x = x
      e.y = y
    }
  }

  private handleEnemyShooting(dt: number): void {
    // Process existing burst queue — use enemy's current position so bullets track movement
    for (const burst of this.burstQueue) {
      if (burst.remaining <= 0) continue
      if (!burst.enemy.alive) { burst.remaining = 0; continue } // enemy died mid-burst
      burst.burstTimer -= dt * 1000
      if (burst.burstTimer <= 0) {
        this.state.enemyBullets.push({
          x: burst.enemy.x + ENTITY_SIZE / 2 - BULLET_WIDTH / 2,
          y: burst.enemy.y + ENTITY_SIZE,
          active: true,
        })
        burst.remaining--
        burst.burstTimer = this.BURST_INTERVAL_MS
      }
    }
    this.burstQueue = this.burstQueue.filter(b => b.remaining > 0)

    // Select new shooter
    this.shotCooldown -= dt
    if (this.shotCooldown > 0) return
    this.shotCooldown = this.params.enemyShotDelay
    const shooters = this.state.enemies.filter(e => e.alive && e.burstCount > 0)
    if (shooters.length === 0) return
    const shooter = shooters[Math.floor(Math.random() * shooters.length)]
    this.burstQueue.push({
      enemy: shooter,
      remaining: shooter.burstCount,
      burstTimer: 0,
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
          enemy.hp -= this.state.player.bulletDamage
          if (enemy.hp <= 0) {
            enemy.alive = false
            enemy.killed = true
            this.state.score += 100
            this.state.player.xp += (enemy.xpValue ?? 1)
            if (this.state.player.xp >= this.state.player.xpToNext) {
              this.state.player.playerLevel += 1
              this.state.player.xp = 0
              this.state.status = 'card_selection'
            }
            if (enemy.dropsPickup === 'damage') {
              if (Math.random() < 0.5) {
                this.state.damagePickups.push({ x: enemy.x, y: enemy.y, active: true })
              }
            }
            if (
              enemy.typeId === 'asteroid' &&
              this.levelIndex >= ASTEROID_FUEL_DROP_MIN_LEVEL &&
              Math.random() < ASTEROID_FUEL_DROP_CHANCE
            ) {
              this.state.fuelPickups.push({ x: enemy.x, y: enemy.y, active: true })
            }
          }
          break
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
        p.hp = Math.max(0, p.hp - 1)
        p.invincibilityTimer = INVINCIBILITY_DURATION
        this.hitThisTick = true
      }
    }
    // Body contact: any live enemy (including obstacles) overlapping the player
    // deals 1 hp and triggers i-frames, mirroring the bullet-hit path.
    if (p.invincibilityTimer <= 0) {
      for (const enemy of this.state.enemies) {
        if (!enemy.alive) continue
        if (
          enemy.x < p.x + ENTITY_SIZE &&
          enemy.x + ENTITY_SIZE > p.x &&
          enemy.y < p.y + ENTITY_SIZE &&
          enemy.y + ENTITY_SIZE > p.y
        ) {
          p.hp = Math.max(0, p.hp - 1)
          p.invincibilityTimer = INVINCIBILITY_DURATION
          this.hitThisTick = true
          break
        }
      }
    }
  }

  private updateInvincibility(deltaMs: number): void {
    // Don't decrement on the same tick the hit landed — keeps the timer at its
    // full INVINCIBILITY_DURATION for the frame in which i-frames were granted.
    if (this.hitThisTick) return
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

  /** Obstacles (asteroids / vertical movers) are not combat targets and never count toward the win. */
  private isObstacle(enemy: Enemy): boolean {
    return enemy.typeId === 'asteroid' || enemy.movementType === 'vertical'
  }

  private checkWinLose(): void {
    if (this.state.status === 'card_selection') return
    const combat = this.state.enemies.filter(e => !this.isObstacle(e))
    const allDead = combat.length > 0 && combat.every(e => !e.alive)
    const anyKilled = combat.some(e => e.killed)
    if (allDead && anyKilled) {
      if (this.waves.length > 0 && this.currentWaveIndex < this.waves.length - 1) {
        // More waves remain — suspend update() and signal GameScreen.
        this.waitingForWaveAdvance = true
        this.emit('wave:cleared')
        return
      }
      this.state.status = 'won'
      return
    }
    if (this.state.player.hp <= 0) {
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
