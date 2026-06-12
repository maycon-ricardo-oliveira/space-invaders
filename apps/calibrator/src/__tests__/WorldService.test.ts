/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    world: {
      findMany: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import prisma from '../lib/prisma'
import { getWorlds, getWorld, createWorld, updateWorld, deleteWorld } from '../services/WorldService'

const mockWorld = prisma as unknown as {
  world: {
    findMany: jest.Mock
    findUniqueOrThrow: jest.Mock
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
}

beforeEach(() => jest.clearAllMocks())

const fakeWorld = { id: 1, name: 'Planet X', index: 0, image: null, parallaxTheme: 'space', createdAt: new Date(), updatedAt: new Date() }

describe('getWorlds', () => {
  it('returns worlds ordered by index', async () => {
    mockWorld.world.findMany.mockResolvedValue([fakeWorld])
    const result = await getWorlds()
    expect(mockWorld.world.findMany).toHaveBeenCalledWith({ orderBy: { index: 'asc' } })
    expect(result).toEqual([fakeWorld])
  })
})

describe('createWorld', () => {
  it('creates a world with valid input', async () => {
    mockWorld.world.create.mockResolvedValue(fakeWorld)
    const result = await createWorld({ name: 'Planet X', index: 0 })
    expect(mockWorld.world.create).toHaveBeenCalledWith({ data: { name: 'Planet X', index: 0 } })
    expect(result).toEqual(fakeWorld)
  })

  it('throws ZodError for empty name', async () => {
    await expect(createWorld({ name: '', index: 0 })).rejects.toThrow()
  })
})

describe('updateWorld', () => {
  it('updates world fields', async () => {
    mockWorld.world.update.mockResolvedValue({ ...fakeWorld, name: 'Updated' })
    const result = await updateWorld(1, { name: 'Updated', index: 0 })
    expect(mockWorld.world.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Updated', index: 0 } })
    expect(result.name).toBe('Updated')
  })
})

describe('deleteWorld', () => {
  it('calls prisma.world.delete with id', async () => {
    mockWorld.world.delete.mockResolvedValue(fakeWorld)
    await deleteWorld(1)
    expect(mockWorld.world.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})
