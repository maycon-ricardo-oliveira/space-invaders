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

  // --- New tests (TDD: added before implementation) ---

  it('reports missing required param enemySpeed', () => {
    const { enemySpeed: _dropped, ...paramsWithout } = validLevel.params
    const bad = { ...validLevel, params: paramsWithout }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.message.includes("missing required param 'enemySpeed'"))).toBe(true)
  })

  it('reports missing or empty id for level without id', () => {
    const { id: _dropped, ...withoutId } = validLevel
    const errors = validateLevels([withoutId], KNOWN)
    expect(errors.some(e => e.levelId === '(index 0)' && e.message === 'missing or empty id')).toBe(true)
  })

  it('reports missing or empty id for level with empty-string id', () => {
    const bad = { ...validLevel, id: '' }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === '(index 0)' && e.message === 'missing or empty id')).toBe(true)
  })

  it('reports error when entities is not an array', () => {
    const bad = { ...validLevel, entities: 'not-an-array' }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.message.match(/entities must be an array/i))).toBe(true)
  })

  it('reports error when params is null', () => {
    const bad = { ...validLevel, params: null }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.message === 'params must be an object')).toBe(true)
  })

  it('rejects NaN enemySpeed with a range/finite error', () => {
    const bad = { ...validLevel, params: { ...validLevel.params, enemySpeed: NaN } }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.message.includes('enemySpeed'))).toBe(true)
  })

  it('rejects powerUpMinWait > powerUpMaxWait with error mentioning both keys', () => {
    const bad = { ...validLevel, params: { ...validLevel.params, powerUpMinWait: 20, powerUpMaxWait: 5 } }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.message.includes('powerUpMinWait') && e.message.includes('powerUpMaxWait'))).toBe(true)
  })

  it('accepts boundary positions x=0,y=0 and x=390,y=844 without errors', () => {
    const levelWithBoundaryEntities = {
      ...validLevel,
      entities: [
        { entityTypeId: 'basic-enemy', x: 0, y: 0 },
        { entityTypeId: 'basic-enemy', x: 390, y: 844 },
      ],
    }
    expect(validateLevels([levelWithBoundaryEntities], KNOWN)).toEqual([])
  })

  it('accepts enemySpeed exactly at boundary values 1 and 5 without errors', () => {
    const level1 = { ...validLevel, id: 'a', params: { ...validLevel.params, enemySpeed: 1 } }
    const level5 = { ...validLevel, id: 'b', params: { ...validLevel.params, enemySpeed: 5 } }
    expect(validateLevels([level1, level5], KNOWN)).toEqual([])
  })

  it('rejects hasPowerUps when it is not a boolean', () => {
    const bad = { ...validLevel, params: { ...validLevel.params, hasPowerUps: 1 } }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.message.includes('hasPowerUps'))).toBe(true)
  })
})
