/**
 * @jest-environment node
 *
 * Boundary tests for the level server actions (Fix 1 revalidatePath, Fix 2 clean rethrow).
 */
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('../services/LevelService', () => ({
  getLevels: jest.fn(),
  getLevel: jest.fn(),
  createLevel: jest.fn(),
  updateLevelParams: jest.fn(),
  deleteLevel: jest.fn(),
}))

import { revalidatePath } from 'next/cache'
import * as LevelService from '../services/LevelService'
import {
  createLevelAction,
  updateLevelParamsAction,
  deleteLevelAction,
} from '../../app/actions/level.actions'

const cache = revalidatePath as jest.Mock
const svc = LevelService as jest.Mocked<typeof LevelService>
const PRISMA_LEAK = 'PrismaClientKnownRequestError: Foreign key constraint failed'
const validLevel = {
  name: 'Level 1', index: 0,
  enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
  enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true,
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('createLevelAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.createLevel.mockResolvedValue({ id: 1 } as never)
    await createLevelAction(1, validLevel)
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.createLevel.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await createLevelAction(1, validLevel).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })
})

describe('updateLevelParamsAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.updateLevelParams.mockResolvedValue({ id: 1 } as never)
    await updateLevelParamsAction(1, { enemySpeed: 3 })
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.updateLevelParams.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await updateLevelParamsAction(1, { enemySpeed: 3 }).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
  })
})

describe('deleteLevelAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.deleteLevel.mockResolvedValue({ id: 1 } as never)
    await deleteLevelAction(1)
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.deleteLevel.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await deleteLevelAction(1).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
  })
})
