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

export interface Enemy {
  x: number
  y: number
  alive: boolean
  typeId: string
}

export type GameStatus = 'playing' | 'paused' | 'won' | 'lost' | 'fuelEmpty'

export interface PlayerState {
  x: number
  y: number
  hp: number
  maxHp: number
  fuel: number
  invincibilityTimer: number
}

export interface GameState {
  player: PlayerState
  enemies: Enemy[]
  playerBullets: Bullet[]
  enemyBullets: Bullet[]
  fuelPickups: FuelPickup[]
  score: number
  status: GameStatus
}
