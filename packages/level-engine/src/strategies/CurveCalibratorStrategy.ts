import { computeDifficultyScore } from '../difficulty'
import type { CalibratorStrategy, LevelParams, LevelRequest } from '../types'

const MIN: LevelParams = {
  numberOfEnemies: 3,
  enemySpeed: 1,
  enemyShotDelay: 3.0,
  enemyShotSpeed: 2,
  enemyAngerDelay: 30,
  enemySpawnDelay: 2,
  hasPowerUps: true,
  powerUpMinWait: 5,
  powerUpMaxWait: 15,
}

const MAX: LevelParams = {
  numberOfEnemies: 20,
  enemySpeed: 5,
  enemyShotDelay: 0.5,
  enemyShotSpeed: 8,
  enemyAngerDelay: 5,
  enemySpawnDelay: 0.3,
  hasPowerUps: false,
  powerUpMinWait: 15,
  powerUpMaxWait: 30,
}

function lerp(a: number, b: number, t: number): number {
  const clamped = Math.min(Math.max(t, 0), 1)
  return a + (b - a) * clamped
}

export class CurveCalibratorStrategy implements CalibratorStrategy {
  calibrate(request: LevelRequest): LevelParams {
    const score = computeDifficultyScore(request)
    const t = score / 100

    return {
      numberOfEnemies: Math.round(lerp(MIN.numberOfEnemies, MAX.numberOfEnemies, t)),
      enemySpeed: lerp(MIN.enemySpeed, MAX.enemySpeed, t),
      enemyShotDelay: lerp(MIN.enemyShotDelay, MAX.enemyShotDelay, t),
      enemyShotSpeed: lerp(MIN.enemyShotSpeed, MAX.enemyShotSpeed, t),
      enemyAngerDelay: lerp(MIN.enemyAngerDelay, MAX.enemyAngerDelay, t),
      enemySpawnDelay: lerp(MIN.enemySpawnDelay, MAX.enemySpawnDelay, t),
      hasPowerUps: t < 0.8,
      powerUpMinWait: Math.round(lerp(MIN.powerUpMinWait, MAX.powerUpMinWait, t)),
      powerUpMaxWait: Math.round(lerp(MIN.powerUpMaxWait, MAX.powerUpMaxWait, t)),
    }
  }
}
