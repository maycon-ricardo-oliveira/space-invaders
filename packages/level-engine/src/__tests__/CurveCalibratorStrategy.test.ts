import { CurveCalibratorStrategy } from '../strategies/CurveCalibratorStrategy'
import type { LevelRequest } from '../types'

describe('CurveCalibratorStrategy', () => {
  const strategy = new CurveCalibratorStrategy()

  describe('story mode — minimum difficulty (level 0 of 20)', () => {
    const req: LevelRequest = { mode: 'story', levelIndex: 0, totalLevels: 20 }

    it('returns minimum numberOfEnemies', () => {
      expect(strategy.calibrate(req).numberOfEnemies).toBe(3)
    })

    it('returns minimum enemySpeed', () => {
      expect(strategy.calibrate(req).enemySpeed).toBeCloseTo(1)
    })

    it('returns maximum enemyShotDelay (easy — long pause between shots)', () => {
      expect(strategy.calibrate(req).enemyShotDelay).toBeCloseTo(3.0)
    })

    it('has powerUps enabled', () => {
      expect(strategy.calibrate(req).hasPowerUps).toBe(true)
    })
  })

  describe('story mode — maximum difficulty (level 19 of 20)', () => {
    const req: LevelRequest = { mode: 'story', levelIndex: 19, totalLevels: 20 }

    it('returns maximum numberOfEnemies', () => {
      expect(strategy.calibrate(req).numberOfEnemies).toBe(20)
    })

    it('returns maximum enemySpeed', () => {
      expect(strategy.calibrate(req).enemySpeed).toBeCloseTo(5)
    })

    it('returns minimum enemyShotDelay (hard — fast shots)', () => {
      expect(strategy.calibrate(req).enemyShotDelay).toBeCloseTo(0.5)
    })

    it('has powerUps disabled', () => {
      expect(strategy.calibrate(req).hasPowerUps).toBe(false)
    })
  })

  describe('story mode — midpoint (level 9 of 20, score ≈ 47.4)', () => {
    const req: LevelRequest = { mode: 'story', levelIndex: 9, totalLevels: 20 }

    it('returns numberOfEnemies between 3 and 20', () => {
      const { numberOfEnemies } = strategy.calibrate(req)
      expect(numberOfEnemies).toBeGreaterThan(3)
      expect(numberOfEnemies).toBeLessThan(20)
    })
  })

  describe('story mode — missing fields', () => {
    it('throws when levelIndex is missing', () => {
      const req: LevelRequest = { mode: 'story', totalLevels: 20 }
      expect(() => strategy.calibrate(req)).toThrow(
        'levelIndex and totalLevels are required for story mode',
      )
    })
  })

  describe('survival mode — no player stats (score = 50)', () => {
    const req: LevelRequest = { mode: 'survival' }

    it('returns 12 enemies at score 50 (lerp(3,20,0.5) = 11.5 → rounds to 12)', () => {
      expect(strategy.calibrate(req).numberOfEnemies).toBe(12)
    })

    it('has powerUps enabled at score 50', () => {
      expect(strategy.calibrate(req).hasPowerUps).toBe(true)
    })
  })

  describe('survival mode — player performance affects difficulty', () => {
    it('gives more enemies to a high-performing player', () => {
      const normalReq: LevelRequest = { mode: 'survival' }
      const hardReq: LevelRequest = {
        mode: 'survival',
        playerStats: {
          level: 5,
          killsThisSession: 100,
          deathsThisSession: 0,
          averageSurvivalTime: 120,
        },
      }
      const normalParams = strategy.calibrate(normalReq)
      const hardParams = strategy.calibrate(hardReq)
      expect(hardParams.numberOfEnemies).toBeGreaterThan(normalParams.numberOfEnemies)
    })

    it('gives fewer enemies to a struggling player', () => {
      const normalReq: LevelRequest = { mode: 'survival' }
      const easyReq: LevelRequest = {
        mode: 'survival',
        playerStats: {
          level: 1,
          killsThisSession: 2,
          deathsThisSession: 10,
          averageSurvivalTime: 5,
        },
      }
      const normalParams = strategy.calibrate(normalReq)
      const easyParams = strategy.calibrate(easyReq)
      expect(easyParams.numberOfEnemies).toBeLessThan(normalParams.numberOfEnemies)
    })
  })
})
