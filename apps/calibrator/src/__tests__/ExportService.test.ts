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
}))

import prisma from '../lib/prisma'
import { exportToJson } from '../services/ExportService'
import { writeFileSync } from 'fs'

const mockWorld = prisma as unknown as {
  world: { findUniqueOrThrow: jest.Mock }
}
const mockWriteFileSync = writeFileSync as jest.Mock

beforeEach(() => {
  jest.clearAllMocks()
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
                ['grunt', 'grunt', null, null, null, null, null, null, null, null, null, null],
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
                    ['grunt', null, null, null, null, null, null, null, null, null, null, null],
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

    // col=0: x = 0 * (390/12) + (390/12)/2 = 0 + 16.25 = 16.25
    // row=0: y = 0 * 40 + 20 = 20
    expect(entity.entityTypeId).toBe('grunt')
    expect(entity.x).toBeCloseTo(16.25)
    expect(entity.y).toBe(20)
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
})
