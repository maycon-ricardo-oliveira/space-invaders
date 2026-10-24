import type { EntityPlacement, LevelDefinition, Wave } from '@si/level-engine'
import type { Bullet, DamagePickup, Enemy, FuelPickup, GameState } from './types'
import { buildEnemy } from './buildEnemy'
import { resolveStatus } from './resolveStatus'
import { stepMovement } from './systems/movement'
import { ShootingSystem } from './systems/shooting'
import { stepBullets } from './systems/bullets'
import { stepFuel } from './systems/fuel'
import { stepPickups } from './systems/pickups'
import { resolveCollisions } from './systems/collisions'
import { tickInvincibility } from './systems/invincibility'
import { AutoFireSystem } from './systems/autoFire'
import { DEFAULT_ENEMY_BULLET_DAMAGE, DEFAULT_ENEMY_CONTACT_DAMAGE } from './damage'
import { shipStatsFrom } from './shipStats'
import { drawCards } from '../cards/draw'
import { BASELINE_FROM_SHIP, applyCards, type RunBaseline } from '../cards/apply'

type GameEvent = 'wave:cleared' | 'wave:started'

export const CANVAS_WIDTH = 390
export const CANVAS_HEIGHT = 844
export const ENTITY_SIZE = 32
export const TOTAL_STORY_LEVELS = 20

export const BULLET_WIDTH = 4
export const BULLET_HEIGHT = 8
const ENEMY_SPEED_SCALE = 40       // px/s per unit of LevelParams.enemySpeed
const ENEMY_SHOT_SPEED_SCALE = 50  // px/s per unit of LevelParams.enemyShotSpeed
const PLAYER_INITIAL_HP = 500
const PLAYER_INITIAL_BULLET_DAMAGE = 20
const PLAYER_INITIAL_FUEL = 100
const ASTEROID_FUEL_DROP_CHANCE = 0.3
const ASTEROID_FUEL_DROP_MIN_LEVEL = 5

export class GameLoop {
  private state: GameState
  private movementTime = 0 // seconds accumulated, drives the micro-movement sines
  private readonly shooting: ShootingSystem
  private readonly autoFire: AutoFireSystem
  /** The run's un-carded numbers; every card is a percentage of these. */
  private readonly baseline: RunBaseline
  /** Injected so a run can be replayed exactly. Defaults to Math.random. */
  private readonly rng: () => number
  private readonly params: LevelDefinition['params']
  /** Damage of one enemy bullet this level — LevelParams, else the planet 1 default. */
  private readonly enemyBulletDamage: number
  /** Fallback contact damage for enemies whose placement sets none. */
  private readonly enemyContactDamage: number
  private readonly levelIndex: number
  private readonly waves: Wave[]
  private currentWaveIndex = 0
  private waitingForWaveAdvance = false
  private readonly listeners: Map<GameEvent, Array<() => void>> = new Map()

  constructor(level: LevelDefinition, rng: () => number = Math.random) {
    this.params = level.params
    this.enemyBulletDamage = level.params.enemyBulletDamage ?? DEFAULT_ENEMY_BULLET_DAMAGE
    this.enemyContactDamage = level.params.enemyContactDamage ?? DEFAULT_ENEMY_CONTACT_DAMAGE
    this.levelIndex = level.levelIndex ?? 0
    this.waves = level.waves ?? []
    this.shooting = new ShootingSystem(level.params.enemyShotDelay)
    const ship = shipStatsFrom(level.params)
    this.autoFire = new AutoFireSystem(ship.autoFireIntervalMs)
    this.rng = rng
    this.baseline = BASELINE_FROM_SHIP(ship, PLAYER_INITIAL_BULLET_DAMAGE)
    this.state = {
      ship,
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
        bulletDamage: PLAYER_INITIAL_BULLET_DAMAGE,
      },
      activeCards: [],
      cardOffer: [],
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
      .map(p => buildEnemy(p, { contactDamage: this.enemyContactDamage }))
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
        // Procedural grid fallback routes through the same factory; its grid-tuned
        // defaults ride as a synthetic placement's properties.
        enemies.push(buildEnemy({
          entityTypeId: 'basic-enemy',
          x: ex,
          y: ey,
          properties: {
            movementPattern: 'oscillate-h',
            amplitudeX: 10,
            frequency: 0.5,
          },
        }, { contactDamage: this.enemyContactDamage }))
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
      ship: { ...this.state.ship },
      activeCards: this.state.activeCards.map(c => ({ ...c })),
      cardOffer: this.state.cardOffer.map(c => ({ ...c })),
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
    const distance = (this.state.ship.moveSpeed * deltaMs) / 1000
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
    this.autoFire.setActive(active)
  }

  fire(): void {
    if (this.state.status !== 'playing') return
    this.state.playerBullets.push({
      x: this.state.player.x + ENTITY_SIZE / 2 - BULLET_WIDTH / 2,
      y: this.state.player.y,
      active: true,
      damage: this.state.player.bulletDamage,
    })
  }

  update(deltaMs: number): void {
    if (this.state.status !== 'playing') return
    if (this.waitingForWaveAdvance) return
    const dt = deltaMs / 1000

    const fuelEmptied = stepFuel({
      state: this.state,
      dt,
      drainRate: this.params.fuelDrainRate,
      maxFuel: PLAYER_INITIAL_FUEL,
    })

    stepBullets({
      state: this.state,
      dt,
      playerBulletSpeed: this.state.ship.bulletSpeed,
      playerBulletHeight: BULLET_HEIGHT,
      enemyBulletSpeed: this.params.enemyShotSpeed * ENEMY_SHOT_SPEED_SCALE,
      canvasHeight: CANVAS_HEIGHT,
    })

    this.moveEnemies(dt)
    this.handleEnemyShooting(dt)

    const hitThisTick = resolveCollisions({
      state: this.state,
      entitySize: ENTITY_SIZE,
      bulletWidth: BULLET_WIDTH,
      bulletHeight: BULLET_HEIGHT,
      invincibilityDuration: this.state.ship.invincibilityMs,
      levelIndex: this.levelIndex,
      asteroidFuelDropMinLevel: ASTEROID_FUEL_DROP_MIN_LEVEL,
      asteroidFuelDropChance: ASTEROID_FUEL_DROP_CHANCE,
    })

    stepPickups({ state: this.state, entitySize: ENTITY_SIZE, maxFuel: PLAYER_INITIAL_FUEL })
    tickInvincibility(this.state, deltaMs, hitThisTick)
    this.offerCardsIfLevelledUp()
    this.autoFire.tick(deltaMs, () => this.fire())
    this.applyStatus(fuelEmptied)
  }

  /**
   * A level-up parked the run on 'card_selection'; fill the screen once.
   * Planet is pinned to 1 until Sprint 10 gives levels a planet index.
   */
  private offerCardsIfLevelledUp(): void {
    if (this.state.status !== 'card_selection') return
    if (this.state.cardOffer.length > 0) return
    this.state.cardOffer = drawCards({
      playerLevel: this.state.player.playerLevel,
      planet: 1,
      activeCards: this.state.activeCards,
      rng: this.rng,
    })
  }

  /** Recomputes the run's numbers from the baseline and the cards held. */
  private applyBuild(): void {
    const { bulletDamage, autoFireIntervalMs } = applyCards(this.baseline, this.state.activeCards)
    this.state.player.bulletDamage = bulletDamage
    this.state.ship.autoFireIntervalMs = autoFireIntervalMs
    this.autoFire.setInterval(autoFireIntervalMs)
  }

  /** Takes one card off the current screen. An id not on screen is ignored. */
  selectCard(cardId: string): void {
    const chosen = this.state.cardOffer.find(c => c.id === cardId)
    if (!chosen) return
    this.state.activeCards.push({
      id: chosen.id, axis: chosen.axis, rarity: chosen.rarity, value: chosen.value,
    })
    this.applyBuild()
    this.state.cardOffer = []
    this.resumeFromCardSelection()
  }

  /** Resumes without taking anything — the offer is discarded. */
  resumeFromCardSelection(): void {
    this.state.cardOffer = []
    if (this.state.status === 'card_selection') {
      this.state.status = 'playing'
    }
  }

  private moveEnemies(dt: number): void {
    this.movementTime += dt
    stepMovement({
      enemies: this.state.enemies,
      dt,
      time: this.movementTime,
      baseSpeed: this.params.enemySpeed * ENEMY_SPEED_SCALE,
      bounds: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, margin: ENTITY_SIZE / 2 },
    })
  }

  private handleEnemyShooting(dt: number): void {
    this.shooting.step({
      state: this.state,
      dt,
      enemyShotDelay: this.params.enemyShotDelay,
      ctx: {
        entitySize: ENTITY_SIZE,
        bulletWidth: BULLET_WIDTH,
        bulletDamage: this.enemyBulletDamage,
      },
    })
  }

  /** Single decision point: resolveStatus() decides, the loop applies the outcome. */
  private applyStatus(fuelEmptied: boolean): void {
    const decision = resolveStatus({
      current: this.state.status,
      enemies: this.state.enemies,
      fuelEmptied,
      playerHp: this.state.player.hp,
      moreWavesRemain: this.waves.length > 0 && this.currentWaveIndex < this.waves.length - 1,
    })
    if (decision.kind === 'wave-cleared') {
      // More waves remain — suspend update() and signal GameScreen.
      this.waitingForWaveAdvance = true
      this.emit('wave:cleared')
      return
    }
    if (decision.kind === 'status') {
      this.state.status = decision.status
    }
  }
}
