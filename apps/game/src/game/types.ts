import type { ActiveCard, CardDefinition } from '../cards/types'

export interface Bullet {
  x: number
  y: number
  active: boolean
  /** Damage dealt on hit, snapshot when the bullet is fired. */
  damage: number
}

export interface FuelPickup {
  x: number
  y: number
  active: boolean
}

export interface DamagePickup {
  x: number
  y: number
  active: boolean
}

export type MovementPattern =
  | 'oscillate-h'
  | 'orbit'
  | 'bob-v'
  | 'drift-return'
  | 'static'
  | 'descend'

export interface Enemy {
  x: number
  y: number
  alive: boolean
  killed: boolean
  typeId: string
  hp: number
  xpValue: number
  movementType: 'horizontal' | 'vertical'
  burstCount: number
  dropsPickup: 'damage' | null
  /** Damage this enemy deals to the player on body contact. */
  contactDamage: number
  speedMultiplier: number
  anchorX: number
  anchorY: number
  movementPattern: MovementPattern
  amplitudeX: number
  amplitudeY: number
  frequency: number
  phase: number
  dirX: number
  dirY: number
}

export type GameStatus = 'playing' | 'paused' | 'won' | 'lost' | 'fuelEmpty' | 'card_selection'

export interface PlayerState {
  x: number
  y: number
  hp: number
  maxHp: number
  fuel: number
  invincibilityTimer: number
  xp: number
  xpToNext: number
  playerLevel: number
  bulletDamage: number
}

/**
 * Mutable ship handling for one run. Seeded from `LevelParams`, then changed by
 * cards mid-run. NOT `PlayerStats` — that name is taken in `@si/level-engine`.
 */
export interface ShipStats {
  moveSpeed: number
  bulletSpeed: number
  invincibilityMs: number
  autoFireIntervalMs: number
}

export interface GameState {
  player: PlayerState
  ship: ShipStats
  /** Cards picked this run. All of them are lost on death — a run owns its build. */
  activeCards: ActiveCard[]
  /** The up-to-three cards currently on the level-up screen. Empty while playing. */
  cardOffer: CardDefinition[]
  enemies: Enemy[]
  playerBullets: Bullet[]
  enemyBullets: Bullet[]
  fuelPickups: FuelPickup[]
  damagePickups: DamagePickup[]
  score: number
  status: GameStatus
  currentWave: number
  totalWaves: number
}
