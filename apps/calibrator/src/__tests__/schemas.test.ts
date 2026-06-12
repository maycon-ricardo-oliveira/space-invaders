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
  LevelInputSchema,
} from '../lib/schemas'

describe('EntityTypeSchema', () => {
  it('accepts valid entity types', () => {
    expect(EntityTypeSchema.parse('grunt')).toBe('grunt')
    expect(EntityTypeSchema.parse('rocket')).toBe('rocket')
    expect(EntityTypeSchema.parse('shield')).toBe('shield')
    expect(EntityTypeSchema.parse('rock')).toBe('rock')
  })
  it('rejects unknown entity type', () => {
    expect(() => EntityTypeSchema.parse('boss')).toThrow()
  })
})

describe('GridSchema', () => {
  it('accepts a valid 12-column grid with nulls', () => {
    const grid = [
      ['grunt', null, null, 'grunt', null, null, null, null, null, null, null, null],
      Array(12).fill(null),
    ]
    expect(() => GridSchema.parse(grid)).not.toThrow()
  })
  it('rejects invalid entity type in grid', () => {
    const grid = [['boss', null, null, null, null, null, null, null, null, null, null, null]]
    expect(() => GridSchema.parse(grid)).toThrow()
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
