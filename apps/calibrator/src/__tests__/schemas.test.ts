/**
 * @jest-environment node
 */
import {
  EntityTypeSchema,
  GridSchema,
  LevelParamsSchema,
  WaveInputSchema,
  PatternInputSchema,
  WorldInputSchema,
  PhaseInputSchema,
  PhaseStatusSchema,
  LevelInputSchema,
} from '../lib/schemas'

describe('EntityTypeSchema', () => {
  it('accepts valid entity types', () => {
    expect(EntityTypeSchema.parse('basic-enemy')).toBe('basic-enemy')
    expect(EntityTypeSchema.parse('fast-enemy')).toBe('fast-enemy')
    expect(EntityTypeSchema.parse('strong-enemy')).toBe('strong-enemy')
    expect(EntityTypeSchema.parse('asteroid')).toBe('asteroid')
  })
  it('rejects unknown entity type', () => {
    expect(() => EntityTypeSchema.parse('boss')).toThrow()
  })
})

describe('GridSchema', () => {
  it('accepts a valid 12-column grid with nulls', () => {
    const grid = [
      ['basic-enemy', null, null, 'basic-enemy', null, null, null, null, null, null, null, null],
      Array(12).fill(null),
    ]
    expect(() => GridSchema.parse(grid)).not.toThrow()
  })
  it('rejects invalid entity type in grid', () => {
    const grid = [['boss', null, null, null, null, null, null, null, null, null, null, null]]
    expect(() => GridSchema.parse(grid)).toThrow()
  })

  // Fix 3 — GridSchema must lock the column dimension at GRID_COLS (12).
  it('rejects a row with 11 columns (one short of the 12-column grid)', () => {
    const grid = [Array(11).fill(null)]
    expect(() => GridSchema.parse(grid)).toThrow()
  })

  it('rejects a row with 13 columns (one over the 12-column grid)', () => {
    const grid = [Array(13).fill(null)]
    expect(() => GridSchema.parse(grid)).toThrow()
  })

  it('rejects a grid with mixed row widths (one row 12, one row 11)', () => {
    const grid = [Array(12).fill(null), Array(11).fill(null)]
    expect(() => GridSchema.parse(grid)).toThrow()
  })

  it('accepts a grid where every row has exactly 12 columns', () => {
    const grid = [Array(12).fill(null), Array(12).fill(null)]
    expect(() => GridSchema.parse(grid)).not.toThrow()
  })
})

describe('LevelParamsSchema', () => {
  it('accepts valid params', () => {
    const params = {
      enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0,
      enemySpawnDelay: 1.0, hasPowerUps: true,
    }
    expect(() => LevelParamsSchema.parse(params)).not.toThrow()
  })
  it('rejects enemySpeed out of range', () => {
    expect(() => LevelParamsSchema.parse({
      enemySpeed: 10, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0,
      enemySpawnDelay: 1.0, hasPowerUps: true
    })).toThrow()
  })
})

describe('WaveInputSchema', () => {
  it('accepts valid wave input', () => {
    const wave = { order: 1, delay: 3.0, grid: [Array(12).fill(null)] }
    expect(() => WaveInputSchema.parse(wave)).not.toThrow()
  })
  it('rejects order outside 1-10', () => {
    expect(() => WaveInputSchema.parse({ order: 11, delay: 3.0, grid: [] })).toThrow()
  })
})

describe('PatternInputSchema', () => {
  it('rejects empty name', () => {
    expect(() => PatternInputSchema.parse({ name: '', grid: [] })).toThrow()
  })
  it('accepts valid pattern', () => {
    expect(() => PatternInputSchema.parse({ name: 'Linha', grid: [] })).not.toThrow()
  })
})

describe('WorldInputSchema', () => {
  it('accepts valid world', () => {
    expect(() => WorldInputSchema.parse({ name: 'Planeta X', index: 0 })).not.toThrow()
  })
  it('rejects empty name', () => {
    expect(() => WorldInputSchema.parse({ name: '', index: 0 })).toThrow()
  })
})

// Phase publication status. String-backed enum so future states ('review') can be
// added through Zod without a DB migration — but only the values currently in the
// enum are accepted. 'review' is NOT in the enum yet and must be rejected today.
describe('PhaseStatusSchema', () => {
  it("accepts 'draft'", () => {
    expect(PhaseStatusSchema.parse('draft')).toBe('draft')
  })
  it("accepts 'published'", () => {
    expect(PhaseStatusSchema.parse('published')).toBe('published')
  })
  it("rejects 'review' (not in the enum yet)", () => {
    expect(() => PhaseStatusSchema.parse('review')).toThrow()
  })
  it("rejects an unknown value 'foo'", () => {
    expect(() => PhaseStatusSchema.parse('foo')).toThrow()
  })
  it('rejects an empty string', () => {
    expect(() => PhaseStatusSchema.parse('')).toThrow()
  })
  it('rejects null', () => {
    expect(() => PhaseStatusSchema.parse(null)).toThrow()
  })
})

describe('PhaseInputSchema — optional status', () => {
  it("accepts a phase input with a valid status 'published'", () => {
    expect(() => PhaseInputSchema.parse({ name: 'Fase 1', index: 0, status: 'published' })).not.toThrow()
  })
  it("accepts a phase input with status 'draft'", () => {
    expect(() => PhaseInputSchema.parse({ name: 'Fase 1', index: 0, status: 'draft' })).not.toThrow()
  })
  it('accepts a phase input with no status (optional)', () => {
    expect(() => PhaseInputSchema.parse({ name: 'Fase 1', index: 0 })).not.toThrow()
  })
  it('rejects a phase input with an invalid status', () => {
    expect(() => PhaseInputSchema.parse({ name: 'Fase 1', index: 0, status: 'foo' })).toThrow()
  })
})

// ── regression: the Sidebar sent `index: phases.length`, but PhaseInputSchema
//    capped index at <= 9, so creating the 11th phase (index 10) threw a 422.
//    The backend already derives the index server-side (max+1), so the front's
//    index is dead weight. Make `index` OPTIONAL: a phase input with no index
//    is valid, and a "too-high" index can no longer 422 (the field is dropped
//    from the contract). Esse bug (11ª fase estoura 422) não volta. ──
describe('PhaseInputSchema — optional index', () => {
  it('accepts a phase input with NO index (backend derives it server-side)', () => {
    expect(() => PhaseInputSchema.parse({ name: 'Fase 1' })).not.toThrow()
  })

  it('accepts a phase input with no index but with a status', () => {
    expect(() => PhaseInputSchema.parse({ name: 'Fase 1', status: 'draft' })).not.toThrow()
  })

  it('still accepts a phase input that does carry an index (back-compat)', () => {
    expect(() => PhaseInputSchema.parse({ name: 'Fase 1', index: 0 })).not.toThrow()
  })

  it('does not 422 on a high index like 10 (the old cap of 9 is gone)', () => {
    // This was the field bug: phases.length === 10 → index 10 → ZodError.
    expect(() => PhaseInputSchema.parse({ name: 'Fase 11', index: 10 })).not.toThrow()
  })
})

describe('LevelInputSchema', () => {
  it('accepts valid level input', () => {
    const level = {
      name: 'Level 1', index: 0,
      enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0,
      enemySpawnDelay: 1.0, hasPowerUps: true,
    }
    expect(() => LevelInputSchema.parse(level)).not.toThrow()
  })
})
