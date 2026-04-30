export interface Bullet {
  x: number
  y: number
  active: boolean
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

export interface Enemy {
  x: number
  y: number
  alive: boolean
  typeId: string
  hp: number
  xpValue: number
  movementType: 'horizontal' | 'vertical'
  burstCount: number
  dropsPickup: 'damage' | null
  speedMultiplier: number
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

export interface GameState {
  player: PlayerState
  enemies: Enemy[]
  playerBullets: Bullet[]
  enemyBullets: Bullet[]
  fuelPickups: FuelPickup[]
  damagePickups: DamagePickup[]
  score: number
  status: GameStatus
}
