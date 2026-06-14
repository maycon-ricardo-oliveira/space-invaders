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
import type { Grid } from '../lib/schemas'

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
    const newGrid: Grid = [['basic-enemy', null, null, null, null, null, null, null, null, null, null, null]]
    mock.wave.update.mockResolvedValue({ ...fakeWave, grid: newGrid })
    const result = await updateWave(1, { order: 1, delay: 3.0, grid: newGrid })
    expect(mock.wave.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { order: 1, delay: 3.0, grid: newGrid } })
    expect(result.grid).toEqual(newGrid)
  })
})

describe('reorderWaves', () => {
  it('calls $transaction with update for each wave', async () => {
    mock.wave.findMany.mockResolvedValue([
      { id: 1, levelId: 1, order: 1 },
      { id: 2, levelId: 1, order: 2 },
      { id: 3, levelId: 1, order: 3 },
    ])
    mock.$transaction.mockResolvedValue([])
    await reorderWaves(1, [3, 1, 2])
    expect(mock.$transaction).toHaveBeenCalledTimes(1)
  })

  // Fix 5 — @@unique([levelId, order]) means assigning final orders in a single
  // pass collides on a swap (P2002). The implementation must avoid ever assigning
  // an `order` value that is still held by another row in the same level.
  //
  // We replay the exact sequence of wave.update calls the service issues against
  // an in-memory model of the rows and the unique([levelId, order]) constraint.
  // A naive "set each id to its final order" pass throws here on a swap.
  //
  // Regression: swapping two adjacent waves used to abort the whole transaction.
  // "esse bug nao volta."
  function replayReorder(
    initial: Record<number, number>, // id -> current order
    updateCalls: Array<{ where: { id: number }; data: { order: number } }>,
  ) {
    const rows = { ...initial }
    for (const call of updateCalls) {
      const { id } = call.where
      const nextOrder = call.data.order
      const clash = Object.entries(rows).find(
        ([rowId, order]) => Number(rowId) !== id && order === nextOrder,
      )
      if (clash) {
        throw new Error(
          `P2002: Unique constraint failed on (levelId, order) — order ${nextOrder} already held by wave ${clash[0]}`,
        )
      }
      rows[id] = nextOrder
    }
    return rows
  }

  it('swaps two adjacent waves without ever colliding on the unique order', async () => {
    mock.wave.findMany.mockResolvedValue([
      { id: 1, levelId: 1, order: 1 },
      { id: 2, levelId: 1, order: 2 },
      { id: 3, levelId: 1, order: 3 },
    ])
    const updateCalls: Array<{ where: { id: number }; data: { order: number } }> = []
    mock.wave.update.mockImplementation((args) => {
      updateCalls.push(args)
      return args
    })
    mock.$transaction.mockImplementation(async (ops) => Promise.all(ops))

    // waves 1,2,3 currently at orders 1,2,3. Swap the first two: desired [2,1,3].
    await reorderWaves(1, [2, 1, 3])

    const finalRows = replayReorder({ 1: 1, 2: 2, 3: 3 }, updateCalls)
    expect(finalRows).toEqual({ 2: 1, 1: 2, 3: 3 })
  })

  it('reverses the wave order without a unique collision', async () => {
    mock.wave.findMany.mockResolvedValue([
      { id: 1, levelId: 1, order: 1 },
      { id: 2, levelId: 1, order: 2 },
      { id: 3, levelId: 1, order: 3 },
    ])
    const updateCalls: Array<{ where: { id: number }; data: { order: number } }> = []
    mock.wave.update.mockImplementation((args) => {
      updateCalls.push(args)
      return args
    })
    mock.$transaction.mockImplementation(async (ops) => Promise.all(ops))

    // [a,b,c] at orders 1,2,3 -> [c,a,b]: c=1, a=2, b=3
    await reorderWaves(1, [3, 1, 2])

    const finalRows = replayReorder({ 1: 1, 2: 2, 3: 3 }, updateCalls)
    expect(finalRows).toEqual({ 3: 1, 1: 2, 2: 3 })
  })

  // IDOR fix — reorderWaves received `levelId` but never used it; updates were
  // `where: { id }`, so a caller could smuggle ids of waves belonging to ANOTHER
  // level into orderedIds and the service would rewrite their `order`. The
  // backend must not trust the client: only reorder when orderedIds is EXACTLY
  // the set of waves owned by levelId (same count + same ids). Otherwise throw
  // a domain error BEFORE touching the database.
  //
  // "esse bug nao volta."

  it('rejects an id that does not belong to the level and never opens a transaction', async () => {
    // level 1 truly owns waves 1, 2, 3 — id 99 is a foreign wave smuggled in.
    mock.wave.findMany.mockResolvedValue([
      { id: 1, levelId: 1, order: 1 },
      { id: 2, levelId: 1, order: 2 },
      { id: 3, levelId: 1, order: 3 },
    ])

    await expect(reorderWaves(1, [1, 2, 99])).rejects.toThrow()
    expect(mock.$transaction).not.toHaveBeenCalled()
    expect(mock.wave.update).not.toHaveBeenCalled()
  })

  it('rejects a partial list missing one of the level waves and never opens a transaction', async () => {
    // level 1 owns waves 1, 2, 3 — orderedIds drops wave 3, a partial reorder.
    mock.wave.findMany.mockResolvedValue([
      { id: 1, levelId: 1, order: 1 },
      { id: 2, levelId: 1, order: 2 },
      { id: 3, levelId: 1, order: 3 },
    ])

    await expect(reorderWaves(1, [2, 1])).rejects.toThrow()
    expect(mock.$transaction).not.toHaveBeenCalled()
    expect(mock.wave.update).not.toHaveBeenCalled()
  })

  it('reorders when orderedIds is exactly the level wave set (two-phase transaction)', async () => {
    // orderedIds is a permutation of the level's exact wave set — the happy path.
    mock.wave.findMany.mockResolvedValue([
      { id: 1, levelId: 1, order: 1 },
      { id: 2, levelId: 1, order: 2 },
      { id: 3, levelId: 1, order: 3 },
    ])
    const updateCalls: Array<{ where: { id: number }; data: { order: number } }> = []
    mock.wave.update.mockImplementation((args) => {
      updateCalls.push(args)
      return args
    })
    mock.$transaction.mockImplementation(async (ops) => Promise.all(ops))

    await reorderWaves(1, [3, 1, 2])

    expect(mock.$transaction).toHaveBeenCalledTimes(1)
    // two-phase: park at negative offsets, then assign final 1..n orders.
    expect(updateCalls).toEqual([
      { where: { id: 3 }, data: { order: -1 } },
      { where: { id: 1 }, data: { order: -2 } },
      { where: { id: 2 }, data: { order: -3 } },
      { where: { id: 3 }, data: { order: 1 } },
      { where: { id: 1 }, data: { order: 2 } },
      { where: { id: 2 }, data: { order: 3 } },
    ])
    const finalRows = replayReorder({ 1: 1, 2: 2, 3: 3 }, updateCalls)
    expect(finalRows).toEqual({ 3: 1, 1: 2, 2: 3 })
  })
})
