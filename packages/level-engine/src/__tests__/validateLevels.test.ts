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

// ---------------------------------------------------------------------------
// Wave contract — RED battery (added before implementation).
// Source of truth: `waves` is canonical, `entities` is the derived flatten.
// The validator does not yet inspect `waves` at all, so every test that
// expects a wave-shape error must currently FAIL (no error emitted).
// ---------------------------------------------------------------------------
describe('validateLevels — waves contract', () => {
  // A valid 2-wave level: orders 1 & 2, delays 0 & 3, distinct coords per wave.
  const validWaveLevel = {
    ...validLevel,
    id: 'story-2-1',
    entities: [
      { entityTypeId: 'basic-enemy', x: 100, y: 60 },
      { entityTypeId: 'fast-enemy', x: 200, y: 60 },
    ],
    waves: [
      { order: 1, delay: 0, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] },
      { order: 2, delay: 3, entities: [{ entityTypeId: 'fast-enemy', x: 200, y: 60 }] },
    ],
  }

  // --- d) happy path ---

  it('accepts a level with valid waves (orders 1 & 2, delays 0 & 3, no collision)', () => {
    expect(validateLevels([validWaveLevel], KNOWN)).toEqual([])
  })

  it('still accepts a legacy level with only flat entities (no waves)', () => {
    expect(validateLevels([validLevel], KNOWN)).toEqual([])
  })

  // --- a) waves shape ---

  it('rejects waves when it is present but not an array', () => {
    const bad = { ...validWaveLevel, waves: { order: 1, delay: 0, entities: [] } }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /waves must be an array/i.test(e.message))).toBe(true)
  })

  it('rejects a wave missing order', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ delay: 0, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /order/i.test(e.message))).toBe(true)
  })

  it('rejects a wave with non-integer order', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ order: 1.5, delay: 0, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /order/i.test(e.message))).toBe(true)
  })

  it('rejects a wave with order below the minimum (0)', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ order: 0, delay: 0, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /order/i.test(e.message))).toBe(true)
  })

  it('rejects duplicate order within the same level', () => {
    const bad = {
      ...validWaveLevel,
      waves: [
        { order: 1, delay: 0, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] },
        { order: 1, delay: 3, entities: [{ entityTypeId: 'fast-enemy', x: 200, y: 60 }] },
      ],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /duplicate.*order|order.*duplicate/i.test(e.message))).toBe(true)
  })

  it('accepts order at the exact minimum boundary (1)', () => {
    const ok = {
      ...validWaveLevel,
      waves: [{ order: 1, delay: 0, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] }],
    }
    expect(validateLevels([ok], KNOWN)).toEqual([])
  })

  it('rejects a wave with negative delay', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ order: 1, delay: -1, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /delay/i.test(e.message))).toBe(true)
  })

  it('rejects a wave with non-numeric delay', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ order: 1, delay: 'soon', entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /delay/i.test(e.message))).toBe(true)
  })

  it('rejects a wave with non-finite delay (Infinity)', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ order: 1, delay: Infinity, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /delay/i.test(e.message))).toBe(true)
  })

  it('accepts delay at the exact minimum boundary (0)', () => {
    const ok = {
      ...validWaveLevel,
      waves: [{ order: 1, delay: 0, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] }],
    }
    expect(validateLevels([ok], KNOWN)).toEqual([])
  })

  it('rejects a wave whose entities field is missing', () => {
    const bad = { ...validWaveLevel, waves: [{ order: 1, delay: 0 }] }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /entities/i.test(e.message))).toBe(true)
  })

  it('rejects a wave whose entities field is not an array', () => {
    const bad = { ...validWaveLevel, waves: [{ order: 1, delay: 0, entities: 'nope' }] }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /entities/i.test(e.message))).toBe(true)
  })

  it('rejects an entity inside a wave with an unknown entityTypeId', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ order: 1, delay: 0, entities: [{ entityTypeId: 'grunt', x: 100, y: 60 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /unknown entityTypeId 'grunt'/.test(e.message))).toBe(true)
  })

  it('rejects an entity inside a wave that is out of bounds', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ order: 1, delay: 0, entities: [{ entityTypeId: 'asteroid', x: 9999, y: -5 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /out of bounds/i.test(e.message))).toBe(true)
  })

  // --- c) ghost cell: empty/null/absent entityTypeId inside a wave ---

  it('rejects a wave entity with empty-string entityTypeId (ghost cell)', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ order: 1, delay: 0, entities: [{ entityTypeId: '', x: 100, y: 60 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /entityTypeId/i.test(e.message))).toBe(true)
  })

  it('rejects a wave entity with null entityTypeId (ghost cell)', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ order: 1, delay: 0, entities: [{ entityTypeId: null, x: 100, y: 60 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /entityTypeId/i.test(e.message))).toBe(true)
  })

  it('rejects a wave entity with absent entityTypeId (ghost cell)', () => {
    const bad = {
      ...validWaveLevel,
      waves: [{ order: 1, delay: 0, entities: [{ x: 100, y: 60 }] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-2-1' && /entityTypeId/i.test(e.message))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// b) Coordinate collision — RED battery.
// Two entities at identical (x,y) in the SAME wave = stacking bug = error.
// Same (x,y) across DIFFERENT waves is OK (they spawn at different times).
// The same check applies to the flat `entities` array when there are no waves.
// ---------------------------------------------------------------------------
describe('validateLevels — coordinate collision', () => {
  const base = { ...validLevel, id: 'story-3-1' }

  it('rejects two entities at identical (x,y) within the same wave (stacking)', () => {
    const bad = {
      ...base,
      entities: [
        { entityTypeId: 'basic-enemy', x: 100, y: 60 },
        { entityTypeId: 'fast-enemy', x: 100, y: 60 },
      ],
      waves: [
        {
          order: 1,
          delay: 0,
          entities: [
            { entityTypeId: 'basic-enemy', x: 100, y: 60 },
            { entityTypeId: 'fast-enemy', x: 100, y: 60 },
          ],
        },
      ],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-3-1' && /(collision|stack|duplicate.*position|same position|overlap)/i.test(e.message))).toBe(true)
  })

  it('accepts identical (x,y) across DIFFERENT waves (spawn at different times)', () => {
    const ok = {
      ...base,
      entities: [
        { entityTypeId: 'basic-enemy', x: 100, y: 60 },
        { entityTypeId: 'fast-enemy', x: 100, y: 60 },
      ],
      waves: [
        { order: 1, delay: 0, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] },
        { order: 2, delay: 3, entities: [{ entityTypeId: 'fast-enemy', x: 100, y: 60 }] },
      ],
    }
    expect(validateLevels([ok], KNOWN)).toEqual([])
  })

  it('rejects two entities at identical (x,y) in the flat entities array (no waves)', () => {
    const bad = {
      ...base,
      entities: [
        { entityTypeId: 'basic-enemy', x: 100, y: 60 },
        { entityTypeId: 'fast-enemy', x: 100, y: 60 },
      ],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(errors.some(e => e.levelId === 'story-3-1' && /(collision|stack|duplicate.*position|same position|overlap)/i.test(e.message))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Empty wave / empty level — RED battery (added before implementation).
// Field bug: createPhase cascades a Phase with one Wave whose grid is all-null.
// If that phase is published+exported without editing, worldToLevelDefinitions
// yields a wave with entities [] and numberOfEnemies 0. The validator currently
// does NOT reject this, the artifact passes the fence, and the game freezes
// (a wave with no enemies → win condition never fires). The fence is the single
// point that must catch it. Esse bug não volta.
// ---------------------------------------------------------------------------
describe('validateLevels — empty wave / empty level', () => {
  it('rejects a wave whose entities array is empty (0 entities)', () => {
    const bad = {
      ...validLevel,
      id: 'story-4-1',
      entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }],
      waves: [{ order: 1, delay: 0, entities: [] }],
    }
    const errors = validateLevels([bad], KNOWN)
    expect(
      errors.some(e => e.levelId === 'story-4-1' && /wave.*(0 entit|vazia|empty|at least one|no entit)/i.test(e.message)),
    ).toBe(true)
  })

  it('rejects only the empty wave, not a sibling wave that has entities', () => {
    // wave 1 has an enemy (valid), wave 2 is empty (invalid) — exactly the
    // shape worldToLevelDefinitions produces for a 2-wave level where the
    // editor only filled the first grid.
    const bad = {
      ...validLevel,
      id: 'story-4-2',
      entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }],
      waves: [
        { order: 1, delay: 0, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] },
        { order: 2, delay: 3, entities: [] },
      ],
    }
    const errors = validateLevels([bad], KNOWN)
    const emptyWaveErrors = errors.filter(e => /(0 entit|vazia|empty|at least one|no entit)/i.test(e.message))
    expect(emptyWaveErrors).toHaveLength(1)
    // The error must point at the empty wave (order 2), not the valid one.
    expect(emptyWaveErrors[0].message).toMatch(/2/)
  })

  it('rejects a level whose flat entities array is empty and has no waves', () => {
    const bad = {
      ...validLevel,
      id: 'story-4-3',
      entities: [],
      // no `waves` key at all
    }
    const errors = validateLevels([bad], KNOWN)
    expect(
      errors.some(e => e.levelId === 'story-4-3' && /(level.*(no entit|sem entidad|empty|0 entit)|numberOfEnemies)/i.test(e.message)),
    ).toBe(true)
  })

  it('rejects a level whose only wave is empty (total entities across waves is 0)', () => {
    const bad = {
      ...validLevel,
      id: 'story-4-4',
      entities: [],
      waves: [{ order: 1, delay: 0, entities: [] }],
    }
    const errors = validateLevels([bad], KNOWN)
    // Both the empty-wave rule and the empty-level rule may fire — at minimum
    // the payload must NOT validate clean.
    expect(errors.length).toBeGreaterThanOrEqual(1)
    expect(errors.some(e => e.levelId === 'story-4-4')).toBe(true)
  })

  it('still accepts a level whose every wave has at least one entity', () => {
    const ok = {
      ...validLevel,
      id: 'story-4-5',
      entities: [
        { entityTypeId: 'basic-enemy', x: 100, y: 60 },
        { entityTypeId: 'fast-enemy', x: 200, y: 60 },
      ],
      waves: [
        { order: 1, delay: 0, entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60 }] },
        { order: 2, delay: 3, entities: [{ entityTypeId: 'fast-enemy', x: 200, y: 60 }] },
      ],
    }
    expect(validateLevels([ok], KNOWN)).toEqual([])
  })

  it('still accepts a legacy level with one non-empty flat entity and no waves', () => {
    // validLevel itself: entities length 1, no waves — must stay valid.
    expect(validateLevels([validLevel], KNOWN)).toEqual([])
  })
})
