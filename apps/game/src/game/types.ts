export interface Bullet {
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

export type GameStatus = 'playing' | 'paused' | 'won' | 'lost'

export interface GameState {
  player: { x: number; y: number; lives: number; invincibilityTimer: number }
  enemies: Enemy[]
  playerBullets: Bullet[]
  enemyBullets: Bullet[]
  score: number
  status: GameStatus
}
