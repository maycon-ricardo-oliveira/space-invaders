/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    wave: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}))

import prisma from '../lib/prisma'
import { getWaves, createWave, updateWave, deleteWave, reorderWaves } from '../services/WaveService'

const mock = prisma as unknown as {
  wave: { findMany: jest.Mock; create: jest.Mock; update: jest.Mock; delete: jest.Mock }
  $transaction: jest.Mock
}

beforeEach(() => jest.clearAllMocks())

const emptyGrid = [Array(12).fill(null)]
const fakeWave = { id: 1, levelId: 1, order: 1, delay: 3.0, grid: emptyGrid, createdAt: new Date(), updatedAt: new Date() }

describe('getWaves', () => {
  it('returns waves ordered by order for a level', async () => {
    mock.wave.findMany.mockResolvedValue([fakeWave])
    const result = await getWaves(1)
    expect(mock.wave.findMany).toHaveBeenCalledWith({ where: { levelId: 1 }, orderBy: { order: 'asc' } })
    expect(result).toEqual([fakeWave])
  })
})

describe('createWave', () => {
  it('creates a wave with valid grid', async () => {
    mock.wave.create.mockResolvedValue(fakeWave)
    const result = await createWave(1, { order: 1, delay: 3.0, grid: emptyGrid })
    expect(mock.wave.create).toHaveBeenCalledWith({ data: { levelId: 1, order: 1, delay: 3.0, grid: emptyGrid } })
    expect(result).toEqual(fakeWave)
  })

  it('throws ZodError when order > 10', async () => {
    await expect(createWave(1, { order: 11, delay: 3.0, grid: emptyGrid })).rejects.toThrow()
  })
})

describe('updateWave', () => {
  it('updates wave grid', async () => {
    const newGrid = [['grunt', null, null, null, null, null, null, null, null, null, null, null]]
    mock.wave.update.mockResolvedValue({ ...fakeWave, grid: newGrid })
    const result = await updateWave(1, { order: 1, delay: 3.0, grid: newGrid })
    expect(mock.wave.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { order: 1, delay: 3.0, grid: newGrid } })
    expect(result.grid).toEqual(newGrid)
  })
})

describe('reorderWaves', () => {
  it('calls $transaction with update for each wave', async () => {
    mock.$transaction.mockResolvedValue([])
    await reorderWaves(1, [3, 1, 2])
    expect(mock.$transaction).toHaveBeenCalledTimes(1)
  })
})
