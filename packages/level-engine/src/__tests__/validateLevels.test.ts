import { validateLevels } from '../sources/validateLevels'

const KNOWN = new Set(['basic-enemy', 'fast-enemy', 'strong-enemy', 'asteroid'])

const validLevel = {
  id: 'story-1-1', style: 'classic', difficultyScore: 10, phaseIndex: 1, levelIndex: 1,
  entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }],
  params: {
    numberOfEnemies: 1, enemySpeed: 2, enemyShotDelay: 1.5, enemyShotSpeed: 4,
    enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
    powerUpMinWait: 5, powerUpMaxWait: 15, fuelDrainRate: 8,
  },
}

describe('validateLevels', () => {
  it('returns no errors for a valid payload', () => {
    expect(validateLevels([validLevel], KNOWN)).toEqual([])
  })

  it('rejects non-array payloads', () => {
    const errors = validateLevels({ nope: true }, KNOWN)
    expect(errors).toHaveLength(1)
    expect(errors[0].message).toMatch(/array/i)
  })

  it('reports unknown entityTypeId with level address', () => {
    const bad = { ...validLevel, entities: [{ entityTypeId: 'grunt', x: 10, y: 10 }] }
    const errors = validateLevels([bad], KNOWN)
    expect(errors).toHaveLength(1)
    expect(errors[0].levelId).toBe('story-1-1')
    expect(errors[0].message).toContain("unknown entityTypeId 'grunt'")
  })

  it('reports out-of-bounds positions', () => {
    const bad = { ...validLevel, entities: [{ entityTypeId: 'asteroid', x: 9999, y: -5 }] }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(errors[0].message).toMatch(/out of bounds/i)
  })

  it('reports params outside calibrator ranges', () => {
    const bad = { ...validLevel, params: { ...validLevel.params, enemySpeed: 99 } }
    const errors = validateLevels([bad], KNOWN)
    expect(errors[0].message).toContain('enemySpeed')
  })

  it('reports duplicate level ids', () => {
    const errors = validateLevels([validLevel, { ...validLevel }], KNOWN)
    expect(errors.some(e => e.message.match(/duplicate/i))).toBe(true)
  })

  it('aggregates ALL errors instead of stopping at the first', () => {
    const bad1 = { ...validLevel, id: 'story-1-2', entities: [{ entityTypeId: 'grunt', x: 1, y: 1 }] }
    const bad2 = { ...validLevel, id: 'story-1-3', params: { ...validLevel.params, enemySpeed: 0 } }
    expect(validateLevels([bad1, bad2], KNOWN).length).toBeGreaterThanOrEqual(2)
  })
})
