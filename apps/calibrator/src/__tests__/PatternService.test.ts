/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    pattern: {
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

import prisma from '../lib/prisma'
import { getPatterns, savePattern, deletePattern } from '../services/PatternService'

const mock = prisma as unknown as {
  pattern: { findMany: jest.Mock; create: jest.Mock; delete: jest.Mock }
}

beforeEach(() => jest.clearAllMocks())

const fakePattern = { id: 1, name: 'Linha', grid: [], createdAt: new Date() }

describe('getPatterns', () => {
  it('returns patterns ordered by createdAt desc', async () => {
    mock.pattern.findMany.mockResolvedValue([fakePattern])
    const result = await getPatterns()
    expect(mock.pattern.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } })
    expect(result).toEqual([fakePattern])
  })
})

describe('savePattern', () => {
  it('creates a named pattern', async () => {
    mock.pattern.create.mockResolvedValue(fakePattern)
    const result = await savePattern({ name: 'Linha', grid: [] })
    expect(mock.pattern.create).toHaveBeenCalledWith({ data: { name: 'Linha', grid: [] } })
    expect(result).toEqual(fakePattern)
  })

  it('throws ZodError for empty name', async () => {
    await expect(savePattern({ name: '', grid: [] })).rejects.toThrow()
  })
})

describe('deletePattern', () => {
  it('calls prisma.pattern.delete with id', async () => {
    mock.pattern.delete.mockResolvedValue(fakePattern)
    await deletePattern(1)
    expect(mock.pattern.delete).toHaveBeenCalledWith({ where: { id: 1 } })
  })
})
