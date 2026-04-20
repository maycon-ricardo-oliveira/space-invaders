import { computeDifficultyScore } from '../difficulty'
import type { LevelRequest } from '../types'

describe('computeDifficultyScore', () => {
  describe('story mode', () => {
    it('returns 0 for the first level (index 0 of 20)', () => {
      const req: LevelRequest = { mode: 'story', levelIndex: 0, totalLevels: 20 }
      expect(computeDifficultyScore(req)).toBe(0)
    })

    it('returns 100 for the last level (index 19 of 20)', () => {
      const req: LevelRequest = { mode: 'story', levelIndex: 19, totalLevels: 20 }
      expect(computeDifficultyScore(req)).toBe(100)
    })

    it('returns ~47.37 for level 9 of 20', () => {
      const req: LevelRequest = { mode: 'story', levelIndex: 9, totalLevels: 20 }
      expect(computeDifficultyScore(req)).toBeCloseTo(47.37, 1)
    })

    it('returns 100 when totalLevels is 1 (edge case)', () => {
      const req: LevelRequest = { mode: 'story', levelIndex: 0, totalLevels: 1 }
      expect(computeDifficultyScore(req)).toBe(100)
    })

    it('throws when levelIndex is missing', () => {
      const req: LevelRequest = { mode: 'story', totalLevels: 20 }
      expect(() => computeDifficultyScore(req)).toThrow(
        'levelIndex and totalLevels are required for story mode',
      )
    })

    it('throws when totalLevels is missing', () => {
      const req: LevelRequest = { mode: 'story', levelIndex: 5 }
      expect(() => computeDifficultyScore(req)).toThrow(
        'levelIndex and totalLevels are required for story mode',
      )
    })
  })

  describe('survival mode', () => {
    it('returns 50 when no playerStats are provided', () => {
      const req: LevelRequest = { mode: 'survival' }
      expect(computeDifficultyScore(req)).toBe(50)
    })

    it('returns 100 for a high-performing player (max kills, no deaths, max survival)', () => {
      const req: LevelRequest = {
        mode: 'survival',
        playerStats: {
          level: 5,
          killsThisSession: 100,
          deathsThisSession: 0,
          averageSurvivalTime: 120,
        },
      }
      expect(computeDifficultyScore(req)).toBe(100)
    })

    it('returns a low score for a struggling player (few kills, many deaths, short survival)', () => {
      const req: LevelRequest = {
        mode: 'survival',
        playerStats: {
          level: 1,
          killsThisSession: 2,
          deathsThisSession: 10,
          averageSurvivalTime: 5,
        },
      }
      // kd=0.2, kdScore=min(1,100)=1; timeScore=min(4.17,100)=4.17; score=(1+4.17)/2≈2.58
      expect(computeDifficultyScore(req)).toBeCloseTo(2.58, 1)
    })

    it('clamps score to [0, 100]', () => {
      const req: LevelRequest = {
        mode: 'survival',
        playerStats: {
          level: 99,
          killsThisSession: 99999,
          deathsThisSession: 0,
          averageSurvivalTime: 99999,
        },
      }
      expect(computeDifficultyScore(req)).toBe(100)
    })
  })
})
