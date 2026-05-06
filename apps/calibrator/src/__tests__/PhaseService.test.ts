/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    phase: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import prisma from '../lib/prisma'
import { getPhases, createPhase, updatePhase, deletePhase } from '../services/PhaseService'

const mockPhase = prisma as unknown as {
  phase: {
    findMany: jest.Mock
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
}

beforeEach(() => jest.clearAllMocks())

const fakePhase = { id: 1, worldId: 1, name: 'Fase 1', index: 0, createdAt: new Date(), updatedAt: new Date() }

describe('getPhases', () => {
  it('returns phases for a world ordered by index', async () => {
    mockPhase.phase.findMany.mockResolvedValue([fakePhase])
    const result = await getPhases(1)
    expect(mockPhase.phase.findMany).toHaveBeenCalledWith({ where: { worldId: 1 }, orderBy: { index: 'asc' } })
    expect(result).toEqual([fakePhase])
  })
})

describe('createPhase', () => {
  it('creates a phase in the given world', async () => {
    mockPhase.phase.create.mockResolvedValue(fakePhase)
    const result = await createPhase(1, { name: 'Fase 1', index: 0 })
    expect(mockPhase.phase.create).toHaveBeenCalledWith({ data: { worldId: 1, name: 'Fase 1', index: 0 } })
    expect(result).toEqual(fakePhase)
  })

  it('throws ZodError for index > 9', async () => {
    await expect(createPhase(1, { name: 'X', index: 10 })).rejects.toThrow()
  })
})

describe('updatePhase', () => {
  it('updates phase name', async () => {
    mockPhase.phase.update.mockResolvedValue({ ...fakePhase, name: 'Fase 2' })
    await updatePhase(1, { name: 'Fase 2' })
    expect(mockPhase.phase.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Fase 2' } })
  })
})
