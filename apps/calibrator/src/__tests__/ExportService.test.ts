/**
 * @jest-environment node
 */

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    world: {
      findUniqueOrThrow: jest.fn(),
    },
  },
  prisma: {
    world: {
      findUniqueOrThrow: jest.fn(),
    },
  },
}))

jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
}))

// Mock the canonical fence (validateLevels) from @si/level-engine, keeping the
// rest of the real module surface intact (the export pipeline uses other bits).
jest.mock('@si/level-engine', () => ({
  ...jest.requireActual('@si/level-engine'),
  validateLevels: jest.fn(() => []),
}))

import prisma from '../lib/prisma'
import { exportToJson, LevelExportValidationError } from '../services/ExportService'
import { writeFileSync, mkdirSync } from 'fs'
import { validateLevels } from '@si/level-engine'
import { PHONE_WIDTH, GRID_COLS, CELL_HEIGHT_EXPORT } from '../lib/gridConstants'

const mockWorld = prisma as unknown as {
  world: { findUniqueOrThrow: jest.Mock }
}
const mockWriteFileSync = writeFileSync as jest.Mock
const mockMkdirSync = mkdirSync as jest.Mock
const mockValidateLevels = validateLevels as jest.Mock

beforeEach(() => {
  // resetAllMocks (not clearAllMocks) so a custom mockImplementation set by one
  // test (e.g. the writeFileSync EACCES throw) does not leak into the next.
  jest.resetAllMocks()
  // Default: artifact is valid (no errors) unless a test overrides it.
  mockValidateLevels.mockReturnValue([])
})

const fakeWorld = {
  id: 1,
  name: 'Planet X',
  index: 0,
  phases: [
    {
      id: 1,
      name: 'Phase 1',
      index: 0,
      status: 'published',
      levels: [
        {
          id: 1,
          name: 'Level 1',
          index: 0,
          enemySpeed: 2.0,
          shotDelay: 1.5,
          fuelDrain: 8.0,
          enemyShotSpeed: 4.0,
          enemyAngerDelay: 15.0,
          enemySpawnDelay: 1.0,
          hasPowerUps: true,
          waves: [
            {
              id: 1,
              order: 1,
              delay: 3.0,
              grid: [
                ['basic-enemy', 'basic-enemy', null, null, null, null, null, null, null, null, null, null],
              ],
            },
            {
              id: 2,
              order: 2,
              delay: 5.0,
              grid: [
                [null, null, null, null, null, null, null, null, null, null, null, null],
              ],
            },
          ],
        },
      ],
    },
  ],
}

describe('exportToJson', () => {
  it('exports world with waves and writes valid JSON with correct entity count', async () => {
    mockWorld.world.findUniqueOrThrow.mockResolvedValue(fakeWorld)

    await exportToJson(1)

    expect(mockWriteFileSync).toHaveBeenCalledTimes(1)
    const [, writtenContent] = mockWriteFileSync.mock.calls[0]
    const levels = JSON.parse(writtenContent)

    expect(Array.isArray(levels)).toBe(true)
    expect(levels).toHaveLength(1)

    const level = levels[0]
    // 2 grunts in wave 1, 0 in wave 2
    expect(level.params.numberOfEnemies).toBe(2)
    expect(level.waves).toHaveLength(2)
    expect(level.waves[0].entities).toHaveLength(2)
    expect(level.waves[1].entities).toHaveLength(0)
  })

  it('maps grid cells to correct EntityPlacement coordinates', async () => {
    const worldWithSingleGrunt = {
      ...fakeWorld,
      phases: [
        {
          ...fakeWorld.phases[0],
          levels: [
            {
              ...fakeWorld.phases[0].levels[0],
              waves: [
                {
                  id: 1,
                  order: 1,
                  delay: 0,
                  // grunt at col=0, row=0
                  grid: [
                    ['basic-enemy', null, null, null, null, null, null, null, null, null, null, null],
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    mockWorld.world.findUniqueOrThrow.mockResolvedValue(worldWithSingleGrunt)

    await exportToJson(1)

    const [, writtenContent] = mockWriteFileSync.mock.calls[0]
    const levels = JSON.parse(writtenContent)
    const entity = levels[0].waves[0].entities[0]

    // Derive from gridConstants (now GRID_COLS = 12), not the old base-11 390/22.
    // col=0: x = 0 * CELL_WIDTH + CELL_WIDTH/2 = (390/12)/2 = 16.25
    // row=0: y = 0 * CELL_HEIGHT + CELL_HEIGHT/2 = 20
    const CELL_WIDTH = PHONE_WIDTH / GRID_COLS
    expect(entity.entityTypeId).toBe('basic-enemy')
    expect(entity.x).toBeCloseTo(CELL_WIDTH / 2)
    expect(entity.y).toBe(CELL_HEIGHT_EXPORT / 2)
  })

  it('returns a string path ending in levels.json', async () => {
    mockWorld.world.findUniqueOrThrow.mockResolvedValue({ ...fakeWorld, phases: [] })

    const result = await exportToJson(1)

    expect(typeof result).toBe('string')
    expect(result).toMatch(/levels\.json$/)
  })

  it('produces empty entities array for a wave with all null cells', async () => {
    const worldWithEmptyWave = {
      ...fakeWorld,
      phases: [
        {
          ...fakeWorld.phases[0],
          levels: [
            {
              ...fakeWorld.phases[0].levels[0],
              waves: [
                {
                  id: 1,
                  order: 1,
                  delay: 2.0,
                  grid: [
                    [null, null, null, null, null, null, null, null, null, null, null, null],
                    [null, null, null, null, null, null, null, null, null, null, null, null],
                  ],
                },
              ],
            },
          ],
        },
      ],
    }
    mockWorld.world.findUniqueOrThrow.mockResolvedValue(worldWithEmptyWave)

    await exportToJson(1)

    const [, writtenContent] = mockWriteFileSync.mock.calls[0]
    const levels = JSON.parse(writtenContent)

    expect(levels[0].params.numberOfEnemies).toBe(0)
    expect(levels[0].waves[0].entities).toHaveLength(0)
  })

  // Fix 4 — robust file output: ensure the destination directory exists
  // before writing, and translate raw I/O failures into a clean error.
  it('ensures the destination directory exists (recursive mkdir) before writing', async () => {
    mockWorld.world.findUniqueOrThrow.mockResolvedValue({ ...fakeWorld, phases: [] })

    await exportToJson(1)

    expect(mockMkdirSync).toHaveBeenCalledTimes(1)
    const [dir, opts] = mockMkdirSync.mock.calls[0]
    expect(typeof dir).toBe('string')
    expect(opts).toMatchObject({ recursive: true })
    // directory must be created before the file is written
    expect(mockMkdirSync.mock.invocationCallOrder[0])
      .toBeLessThan(mockWriteFileSync.mock.invocationCallOrder[0])
  })

  it('throws a clean error (no raw I/O message) when writeFileSync fails', async () => {
    mockWorld.world.findUniqueOrThrow.mockResolvedValue({ ...fakeWorld, phases: [] })
    mockWriteFileSync.mockImplementation(() => {
      throw new Error("EACCES: permission denied, open '/abs/secret/levels.json'")
    })

    const rejection = await exportToJson(1).catch((e) => e)

    expect(rejection).toBeInstanceOf(Error)
    expect(rejection.message).not.toContain('EACCES')
    expect(rejection.message).not.toContain('/abs/secret')
  })

  // Step 3 — canonical fence: the dashboard must never publish an artifact that
  // fails @si/level-engine's validateLevels. "Nunca confia, valida antes de publicar."
  describe('canonical fence (validateLevels) before writing', () => {
    it('does NOT write and rejects with a clean PT-BR error when the artifact is invalid', async () => {
      mockWorld.world.findUniqueOrThrow.mockResolvedValue(fakeWorld)
      mockValidateLevels.mockReturnValue([
        { levelId: 'story-1-1', message: 'collision: two entities overlap at (100, 60)' },
      ])

      const rejection = await exportToJson(1).catch((e) => e)

      // The fence must block the write entirely.
      expect(mockWriteFileSync).not.toHaveBeenCalled()

      // Rejects with a clear PT-BR message naming the validation failure,
      // without leaking a stack/raw internals.
      expect(rejection).toBeInstanceOf(Error)
      expect(rejection.message).toMatch(/valida/i)
      expect(rejection.message).not.toContain('\n    at ')
    })

    it('writes normally and returns the path when validateLevels reports no errors', async () => {
      mockWorld.world.findUniqueOrThrow.mockResolvedValue(fakeWorld)
      mockValidateLevels.mockReturnValue([])

      const result = await exportToJson(1)

      expect(mockValidateLevels).toHaveBeenCalledTimes(1)
      expect(mockWriteFileSync).toHaveBeenCalledTimes(1)
      expect(result).toMatch(/levels\.json$/)
    })

    it('validates against the canonical entityTypeIds the game knows', async () => {
      mockWorld.world.findUniqueOrThrow.mockResolvedValue(fakeWorld)

      await exportToJson(1)

      expect(mockValidateLevels).toHaveBeenCalledTimes(1)
      const [, knownTypeIds] = mockValidateLevels.mock.calls[0]

      // The fence must check against the exact set the game registers.
      expect(knownTypeIds).toBeInstanceOf(Set)
      const ids = knownTypeIds as Set<string>
      expect(ids.has('basic-enemy')).toBe(true)
      expect(ids.has('fast-enemy')).toBe(true)
      expect(ids.has('strong-enemy')).toBe(true)
      expect(ids.has('asteroid')).toBe(true)
      expect(ids.size).toBe(4)
    })
  })

  // Publication gate: when no phase is published, worldToLevelDefinitions yields
  // an empty list. Exporting an empty artifact would wipe a valid levels.json, so
  // the service must abort with a clean PT-BR LevelExportValidationError and write
  // nothing. "Nunca sobrescreve com vazio."
  describe('blocks export when no phase is published', () => {
    const draftOnlyWorld = {
      ...fakeWorld,
      phases: [
        {
          ...fakeWorld.phases[0],
          status: 'draft',
        },
      ],
    }

    it('rejects with LevelExportValidationError and does not write the file', async () => {
      mockWorld.world.findUniqueOrThrow.mockResolvedValue(draftOnlyWorld)

      const rejection = await exportToJson(1).catch((e) => e)

      expect(rejection).toBeInstanceOf(LevelExportValidationError)
      expect(rejection.message).toMatch(/fase|publicad/i)
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })

    it('does not run the canonical fence when there is nothing to export', async () => {
      mockWorld.world.findUniqueOrThrow.mockResolvedValue(draftOnlyWorld)

      await exportToJson(1).catch(() => {})

      // Blocked earlier than validateLevels — empty artifact never reaches the fence.
      expect(mockWriteFileSync).not.toHaveBeenCalled()
    })
  })
})
