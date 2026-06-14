/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    level: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import prisma from '../lib/prisma'
import { getLevels, getLevel, createLevel, updateLevelParams, deleteLevel } from '../services/LevelService'

const mockLevel = prisma as unknown as {
  level: {
    findMany: jest.Mock
    findFirst: jest.Mock
    findUniqueOrThrow: jest.Mock
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
}

beforeEach(() => jest.clearAllMocks())

// The service derives the next index server-side: max(existing index in scope) + 1,
// or 0 when the scope is empty. It must query the highest existing level scoped to
// the phaseId. Tests mock both findFirst (desc-ordered top row) and findMany (full
// scan) so they stay agnostic to which Prisma read the implementation chooses; the
// load-bearing assertion is the index passed to level.create.
function stubExistingLevels(levels: Array<{ index: number }>) {
  const sorted = [...levels].sort((a, b) => b.index - a.index)
  mockLevel.level.findFirst.mockResolvedValue(sorted[0] ?? null)
  mockLevel.level.findMany.mockResolvedValue(levels)
}

function createdIndex() {
  return mockLevel.level.create.mock.calls[0][0].data.index as number
}

function scopedReadArg() {
  const findFirstArg = mockLevel.level.findFirst.mock.calls[0]?.[0]
  const findManyArg = mockLevel.level.findMany.mock.calls[0]?.[0]
  return findFirstArg ?? findManyArg
}

const defaultParams = {
  enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
  enemyShotSpeed: 4.0, enemyAngerDelay: 15.0,
  enemySpawnDelay: 1.0, hasPowerUps: true,
}

const fakeLevel = {
  id: 1, phaseId: 1, name: 'Level 1', index: 0,
  ...defaultParams, parallaxTheme: null,
  waves: [], createdAt: new Date(), updatedAt: new Date(),
}

describe('getLevels', () => {
  it('returns levels for a phase ordered by index, including waves', async () => {
    mockLevel.level.findMany.mockResolvedValue([fakeLevel])
    const result = await getLevels(1)
    expect(mockLevel.level.findMany).toHaveBeenCalledWith({
      where: { phaseId: 1 },
      orderBy: { index: 'asc' },
      include: { waves: { orderBy: { order: 'asc' } } },
    })
    expect(result).toEqual([fakeLevel])
  })
})

describe('createLevel', () => {
  it('creates level with valid params', async () => {
    stubExistingLevels([])
    mockLevel.level.create.mockResolvedValue(fakeLevel)
    const result = await createLevel(1, { name: 'Level 1', index: 0, ...defaultParams })
    expect(mockLevel.level.create).toHaveBeenCalledWith({
      data: { phaseId: 1, name: 'Level 1', index: 0, ...defaultParams }
    })
    expect(result).toEqual(fakeLevel)
  })

  it('throws ZodError for enemySpeed out of range', async () => {
    await expect(createLevel(1, {
      name: 'X', index: 0, enemySpeed: 99, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0, hasPowerUps: true,
    })).rejects.toThrow()
  })
})

// ── regression: createLevel inserted the raw front-end index (levels.length), which
//    collides with @@unique([phaseId, index]) when a middle level was deleted (gaps).
//    The backend never trusts the front; it derives next index = max + 1. This bug
//    does not come back. ──
describe('createLevel — server-derives the index', () => {
  it('derives next index as max(existing in scope) + 1 with gaps present', async () => {
    // phase already has levels at indexes {0, 2} — a gap at 1.
    stubExistingLevels([{ index: 0 }, { index: 2 }])
    mockLevel.level.create.mockResolvedValue(fakeLevel)

    await createLevel(1, { name: 'Novo', index: 1, ...defaultParams })

    // max is 2, so the derived index is 3 — never the input's 1, never length (2).
    expect(createdIndex()).toBe(3)
  })

  it('ignores the index from the input when levels already exist', async () => {
    stubExistingLevels([{ index: 0 }, { index: 1 }, { index: 2 }])
    mockLevel.level.create.mockResolvedValue(fakeLevel)

    // Front sends a bogus 0 (would collide). Backend overrides with max+1 = 3.
    await createLevel(1, { name: 'Novo', index: 0, ...defaultParams })

    expect(createdIndex()).toBe(3)
  })

  it('uses index 0 for the first level in an empty phase', async () => {
    stubExistingLevels([])
    mockLevel.level.create.mockResolvedValue(fakeLevel)

    await createLevel(1, { name: 'Primeiro', index: 0, ...defaultParams })

    expect(createdIndex()).toBe(0)
  })

  it('scopes the max lookup to the given phaseId, not globally', async () => {
    stubExistingLevels([{ index: 0 }])
    mockLevel.level.create.mockResolvedValue(fakeLevel)

    await createLevel(9, { name: 'Novo', index: 0, ...defaultParams })

    expect(scopedReadArg()).toMatchObject({ where: { phaseId: 9 } })
  })
})

describe('updateLevelParams', () => {
  it('updates only the provided params', async () => {
    mockLevel.level.update.mockResolvedValue({ ...fakeLevel, enemySpeed: 3.0 })
    const result = await updateLevelParams(1, { enemySpeed: 3.0 })
    expect(mockLevel.level.update).toHaveBeenCalledWith({
      where: { id: 1 }, data: { enemySpeed: 3.0 }
    })
    expect(result.enemySpeed).toBe(3.0)
  })
})

describe('deleteLevel', () => {
  it('calls prisma.level.delete with id', async () => {
    mockLevel.level.delete.mockResolvedValue(fakeLevel)
    await deleteLevel(1)
    expect(mockLevel.level.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})
