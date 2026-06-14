/**
 * @jest-environment node
 */
jest.mock('../lib/prisma', () => {
  const phase = {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  }
  const level = { create: jest.fn() }
  const wave = { create: jest.fn() }
  return {
    __esModule: true,
    default: {
      phase,
      level,
      wave,
      // The cascade create runs inside a transaction. The mock runs the callback
      // form with a tx client that reuses the SAME mocks, so assertions can read
      // the create calls directly off the top-level mock.
      $transaction: jest.fn((arg: unknown) => {
        if (typeof arg === 'function') {
          return (arg as (tx: unknown) => unknown)({ phase, level, wave })
        }
        return Promise.all(arg as Promise<unknown>[])
      }),
    },
  }
})

import prisma from '../lib/prisma'
import { getPhases, createPhase, updatePhase, deletePhase, setPhaseStatus } from '../services/PhaseService'

const mockPhase = prisma as unknown as {
  phase: {
    findMany: jest.Mock
    findFirst: jest.Mock
    create: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
  level: { create: jest.Mock }
  wave: { create: jest.Mock }
  $transaction: jest.Mock
}

beforeEach(() => jest.clearAllMocks())

// The service derives the next index server-side: max(existing index in scope) + 1,
// or 0 when the scope is empty. It must query the highest existing phase scoped to
// the worldId. Tests mock both findFirst (desc-ordered top row) and findMany (full
// scan) so they stay agnostic to which Prisma read the implementation chooses; the
// load-bearing assertion is the index passed to phase.create.
function stubExistingPhases(phases: Array<{ index: number }>) {
  const sorted = [...phases].sort((a, b) => b.index - a.index)
  mockPhase.phase.findFirst.mockResolvedValue(sorted[0] ?? null)
  mockPhase.phase.findMany.mockResolvedValue(phases)
}

function createdIndex() {
  return mockPhase.phase.create.mock.calls[0][0].data.index as number
}

function scopedReadArg() {
  const findFirstArg = mockPhase.phase.findFirst.mock.calls[0]?.[0]
  const findManyArg = mockPhase.phase.findMany.mock.calls[0]?.[0]
  return findFirstArg ?? findManyArg
}

const fakePhase = { id: 1, worldId: 1, name: 'Fase 1', index: 0, status: 'draft', createdAt: new Date(), updatedAt: new Date() }
const fakeLevel = { id: 10, phaseId: 1, name: 'Level 1', index: 0 }
const fakeWave = { id: 100, levelId: 10, order: 1, delay: 3.0, grid: [] }

function stubCascadeCreates() {
  mockPhase.phase.create.mockResolvedValue(fakePhase)
  mockPhase.level.create.mockResolvedValue(fakeLevel)
  mockPhase.wave.create.mockResolvedValue(fakeWave)
}

describe('getPhases', () => {
  it('returns phases for a world ordered by index', async () => {
    mockPhase.phase.findMany.mockResolvedValue([fakePhase])
    const result = await getPhases(1)
    expect(mockPhase.phase.findMany).toHaveBeenCalledWith({ where: { worldId: 1 }, orderBy: { index: 'asc' } })
    expect(result).toEqual([fakePhase])
  })
})

describe('createPhase', () => {
  it('creates a phase in the given world with derived index', async () => {
    stubExistingPhases([])
    stubCascadeCreates()
    await createPhase(1, { name: 'Fase 1', index: 0 })
    expect(mockPhase.phase.create).toHaveBeenCalledTimes(1)
    expect(mockPhase.phase.create.mock.calls[0][0].data).toMatchObject({ worldId: 1, name: 'Fase 1', index: 0 })
  })

  // New contract: the front no longer needs to send an index — the backend
  // derives it (max+1). createPhase must work with an index-less input.
  it('creates a phase when the input has NO index (front stops sending it)', async () => {
    stubExistingPhases([{ index: 0 }, { index: 1 }])
    stubCascadeCreates()

    await createPhase(1, { name: 'Fase 3' } as never)

    expect(mockPhase.phase.create).toHaveBeenCalledTimes(1)
    // Still derived server-side as max+1 (2), regardless of the missing input index.
    expect(createdIndex()).toBe(2)
  })

  // Regression: the Sidebar sent index = phases.length, so the 11th phase carried
  // index 10, which the old `.max(9)` cap rejected with a 422. With index optional
  // and uncapped, a high input index no longer throws — and is still ignored in
  // favour of the derived max+1. Esse bug (11ª fase estoura 422) não volta.
  it('does not throw on a high input index like 10 (old cap removed) and still derives max+1', async () => {
    stubExistingPhases(Array.from({ length: 10 }, (_, i) => ({ index: i }))) // indexes 0..9
    stubCascadeCreates()

    await createPhase(1, { name: 'Fase 11', index: 10 })

    // max existing is 9 → derived 10; never throws on the input's index.
    expect(createdIndex()).toBe(10)
  })
})

// ── regression: createPhase inserted the raw front-end index (phases.length), which
//    collides with @@unique([worldId, index]) when a middle phase was deleted (gaps).
//    The backend never trusts the front; it derives next index = max + 1. This bug
//    does not come back. ──
describe('createPhase — server-derives the index', () => {
  it('derives next index as max(existing in scope) + 1 with gaps present', async () => {
    // world already has phases at indexes {0, 2} — a gap at 1.
    stubExistingPhases([{ index: 0 }, { index: 2 }])
    stubCascadeCreates()

    await createPhase(1, { name: 'Nova', index: 1 })

    // max is 2, so the derived index is 3 — never the input's 1, never length (2).
    expect(createdIndex()).toBe(3)
  })

  it('ignores the index from the input when phases already exist', async () => {
    stubExistingPhases([{ index: 0 }, { index: 1 }, { index: 2 }])
    stubCascadeCreates()

    // Front sends a bogus 0 (would collide). Backend overrides with max+1 = 3.
    await createPhase(1, { name: 'Nova', index: 0 })

    expect(createdIndex()).toBe(3)
  })

  it('uses index 0 for the first phase in an empty world', async () => {
    stubExistingPhases([])
    stubCascadeCreates()

    await createPhase(1, { name: 'Primeira', index: 0 })

    expect(createdIndex()).toBe(0)
  })

  it('scopes the max lookup to the given worldId, not globally', async () => {
    stubExistingPhases([{ index: 0 }])
    stubCascadeCreates()

    await createPhase(7, { name: 'Nova', index: 0 })

    expect(scopedReadArg()).toMatchObject({ where: { worldId: 7 } })
  })
})

// New behaviour: createPhase is a cascade inside a single transaction. Every phase
// is born navigable — Phase(status='draft') + Level 1 + Wave 1 (empty 22×12 grid).
describe('createPhase — cascade (phase + level + wave) in a transaction', () => {
  it('runs the cascade inside a single $transaction', async () => {
    stubExistingPhases([])
    stubCascadeCreates()

    await createPhase(1, { name: 'Fase 1', index: 0 })

    expect(mockPhase.$transaction).toHaveBeenCalledTimes(1)
  })

  it("creates the phase with status 'draft'", async () => {
    stubExistingPhases([])
    stubCascadeCreates()

    await createPhase(1, { name: 'Fase 1', index: 0 })

    expect(mockPhase.phase.create.mock.calls[0][0].data.status).toBe('draft')
  })

  it('creates exactly one Level (index 0) under the new phase', async () => {
    stubExistingPhases([])
    stubCascadeCreates()

    await createPhase(1, { name: 'Fase 1', index: 0 })

    expect(mockPhase.level.create).toHaveBeenCalledTimes(1)
    const levelData = mockPhase.level.create.mock.calls[0][0].data
    expect(levelData.index).toBe(0)
    expect(levelData.name).toMatch(/level\s*1/i)
  })

  it('creates exactly one Wave (order 1, delay 3.0) under the new level', async () => {
    stubExistingPhases([])
    stubCascadeCreates()

    await createPhase(1, { name: 'Fase 1', index: 0 })

    expect(mockPhase.wave.create).toHaveBeenCalledTimes(1)
    const waveData = mockPhase.wave.create.mock.calls[0][0].data
    expect(waveData.order).toBe(1)
    expect(waveData.delay).toBe(3.0)
  })

  it('seeds the wave with an empty 22×12 grid of nulls', async () => {
    stubExistingPhases([])
    stubCascadeCreates()

    await createPhase(1, { name: 'Fase 1', index: 0 })

    const grid = mockPhase.wave.create.mock.calls[0][0].data.grid as unknown[][]
    // 22 rows (GRID_ROWS) × 12 cols (GRID_COLS), every cell null.
    expect(grid).toHaveLength(22)
    for (const row of grid) {
      expect(row).toHaveLength(12)
      expect(row.every((cell) => cell === null)).toBe(true)
    }
  })
})

describe('updatePhase', () => {
  it('updates phase name', async () => {
    mockPhase.phase.update.mockResolvedValue({ ...fakePhase, name: 'Fase 2' })
    await updatePhase(1, { name: 'Fase 2' })
    expect(mockPhase.phase.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { name: 'Fase 2' } })
  })
})

// Publication toggle: setPhaseStatus(phaseId, status). Validates the status against
// the Zod enum (never trust the caller) and persists via prisma.phase.update.
describe('setPhaseStatus', () => {
  it("updates the phase status to 'published'", async () => {
    mockPhase.phase.update.mockResolvedValue({ ...fakePhase, status: 'published' })
    await setPhaseStatus(1, 'published')
    expect(mockPhase.phase.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'published' } })
  })

  it("updates the phase status to 'draft'", async () => {
    mockPhase.phase.update.mockResolvedValue({ ...fakePhase, status: 'draft' })
    await setPhaseStatus(1, 'draft')
    expect(mockPhase.phase.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: 'draft' } })
  })

  it('rejects an invalid status and never touches the database', async () => {
    await expect(setPhaseStatus(1, 'foo' as never)).rejects.toThrow()
    expect(mockPhase.phase.update).not.toHaveBeenCalled()
  })

  it("rejects 'review' (not in the enum yet) and never touches the database", async () => {
    await expect(setPhaseStatus(1, 'review' as never)).rejects.toThrow()
    expect(mockPhase.phase.update).not.toHaveBeenCalled()
  })
})
