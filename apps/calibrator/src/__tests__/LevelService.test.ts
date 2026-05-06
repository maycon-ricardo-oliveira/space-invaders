/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    level: {
      findMany: jest.fn(),
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
    findUniqueOrThrow: jest.Mock
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
}

beforeEach(() => jest.clearAllMocks())

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
