import { LevelEngine } from '../LevelEngine'
import { CurveCalibratorStrategy } from '../strategies/CurveCalibratorStrategy'
import type { CalibratorStrategy, EntityType, LevelParams, LevelRequest } from '../types'

const MOCK_PARAMS: LevelParams = {
  numberOfEnemies: 99,
  enemySpeed: 10,
  enemyShotDelay: 0.1,
  enemyShotSpeed: 10,
  enemyAngerDelay: 1,
  enemySpawnDelay: 0.1,
  hasPowerUps: false,
  powerUpMinWait: 1,
  powerUpMaxWait: 2,
}

describe('LevelEngine', () => {
  let engine: LevelEngine

  beforeEach(() => {
    engine = new LevelEngine(new CurveCalibratorStrategy())
  })

  // ── registerEntityType ────────────────────────────────────────────────
  describe('registerEntityType', () => {
    it('registers an entity type without throwing', () => {
      const type: EntityType = { id: 'enemy-classic', label: 'Classic Enemy', icon: '👾', properties: {} }
      expect(() => engine.registerEntityType(type)).not.toThrow()
    })

    it('throws when registering the same id twice', () => {
      const type: EntityType = { id: 'dup', label: 'Dup', icon: 'D', properties: {} }
      engine.registerEntityType(type)
      expect(() => engine.registerEntityType(type)).toThrow('Entity type "dup" is already registered')
    })
  })

  // ── generate — story mode ────────────────────────────────────────────
  describe('generate — story mode', () => {
    it('returns a LevelDefinition with all required fields', () => {
      const req: LevelRequest = { mode: 'story', levelIndex: 0, totalLevels: 20 }
      const level = engine.generate(req)
      expect(level.id).toBeDefined()
      expect(['classic', 'freeRoam', 'mixed']).toContain(level.style)
      expect(level.difficultyScore).toBeGreaterThanOrEqual(0)
      expect(level.difficultyScore).toBeLessThanOrEqual(100)
      expect(level.entities).toEqual([])
      expect(level.params).toBeDefined()
    })

    it('generates id "story-0" for levelIndex 0', () => {
      const level = engine.generate({ mode: 'story', levelIndex: 0, totalLevels: 20 })
      expect(level.id).toBe('story-0')
    })

    it('assigns "classic" style to levels 1–6 (index 0–5)', () => {
      for (let i = 0; i <= 5; i++) {
        const level = engine.generate({ mode: 'story', levelIndex: i, totalLevels: 20 })
        expect(level.style).toBe('classic')
      }
    })

    it('assigns "mixed" style to levels 7–12 (index 6–11)', () => {
      for (let i = 6; i <= 11; i++) {
        const level = engine.generate({ mode: 'story', levelIndex: i, totalLevels: 20 })
        expect(level.style).toBe('mixed')
      }
    })

    it('assigns "freeRoam" style to levels 13–18 (index 12–17)', () => {
      for (let i = 12; i <= 17; i++) {
        const level = engine.generate({ mode: 'story', levelIndex: i, totalLevels: 20 })
        expect(level.style).toBe('freeRoam')
      }
    })

    it('assigns "mixed" style to levels 19–20 (index 18–19)', () => {
      for (let i = 18; i <= 19; i++) {
        const level = engine.generate({ mode: 'story', levelIndex: i, totalLevels: 20 })
        expect(level.style).toBe('mixed')
      }
    })

    it('difficultyScore is 0 for level 0 and 100 for level 19', () => {
      const first = engine.generate({ mode: 'story', levelIndex: 0, totalLevels: 20 })
      const last = engine.generate({ mode: 'story', levelIndex: 19, totalLevels: 20 })
      expect(first.difficultyScore).toBe(0)
      expect(last.difficultyScore).toBe(100)
    })

    it('difficultyScore increases monotonically across story levels', () => {
      const scores = Array.from({ length: 20 }, (_, i) =>
        engine.generate({ mode: 'story', levelIndex: i, totalLevels: 20 }).difficultyScore,
      )
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeGreaterThan(scores[i - 1])
      }
    })
  })

  // ── generate — survival mode ─────────────────────────────────────────
  describe('generate — survival mode', () => {
    it('returns a LevelDefinition with a valid style', () => {
      const level = engine.generate({ mode: 'survival' })
      expect(['classic', 'freeRoam', 'mixed']).toContain(level.style)
    })

    it('returns difficultyScore of 50 with no player stats', () => {
      const level = engine.generate({ mode: 'survival' })
      expect(level.difficultyScore).toBe(50)
    })

    it('id starts with "survival-"', () => {
      const level = engine.generate({ mode: 'survival' })
      expect(level.id.startsWith('survival-')).toBe(true)
    })
  })

  // ── setCalibrator ────────────────────────────────────────────────────
  describe('setCalibrator', () => {
    it('replaces the active calibration strategy', () => {
      const mockStrategy: CalibratorStrategy = {
        calibrate: jest.fn().mockReturnValue(MOCK_PARAMS),
      }
      engine.setCalibrator(mockStrategy)
      const level = engine.generate({ mode: 'story', levelIndex: 0, totalLevels: 20 })
      expect(mockStrategy.calibrate).toHaveBeenCalledTimes(1)
      expect(level.params.numberOfEnemies).toBe(99)
    })
  })
})
