/**
 * @jest-environment node
 *
 * Boundary tests for the wave server actions.
 * Covers two hardening contracts:
 *   Fix 1 — every mutation calls revalidatePath('/dashboard', 'layout') on success.
 *   Fix 2 — when the service throws, the action logs the real error and rethrows
 *           a clean PT-BR Error (never leaks the Prisma stack/message).
 */
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('../services/WaveService', () => ({
  getWaves: jest.fn(),
  createWave: jest.fn(),
  updateWave: jest.fn(),
  deleteWave: jest.fn(),
  reorderWaves: jest.fn(),
}))

import { revalidatePath } from 'next/cache'
import * as WaveService from '../services/WaveService'
import {
  createWaveAction,
  updateWaveAction,
  deleteWaveAction,
  reorderWavesAction,
} from '../../app/actions/wave.actions'

const cache = revalidatePath as jest.Mock
const svc = WaveService as jest.Mocked<typeof WaveService>
const PRISMA_LEAK = 'PrismaClientKnownRequestError: Unique constraint failed on the fields: (`levelId`,`order`)'
const grid = [Array(12).fill(null)]

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('createWaveAction', () => {
  it('revalidates /dashboard layout after a successful create', async () => {
    svc.createWave.mockResolvedValue({ id: 1 } as never)
    await createWaveAction(1, { order: 1, delay: 3, grid })
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows a clean PT-BR error and logs the original when the service fails', async () => {
    svc.createWave.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await createWaveAction(1, { order: 1, delay: 3, grid }).catch((e) => e)
    expect(rejection).toBeInstanceOf(Error)
    expect(rejection.message).not.toContain('Prisma')
    expect(rejection.message).toMatch(/[áàâãéêíóôõúçA-Za-z]/)
    expect(console.error).toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })
})

describe('updateWaveAction', () => {
  it('revalidates /dashboard layout after a successful update', async () => {
    svc.updateWave.mockResolvedValue({ id: 1 } as never)
    await updateWaveAction(1, { grid })
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.updateWave.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await updateWaveAction(1, { grid }).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
  })
})

describe('deleteWaveAction', () => {
  it('revalidates /dashboard layout after a successful delete', async () => {
    svc.deleteWave.mockResolvedValue({ id: 1 } as never)
    await deleteWaveAction(1)
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.deleteWave.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await deleteWaveAction(1).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
  })
})

describe('reorderWavesAction', () => {
  it('revalidates /dashboard layout after a successful reorder', async () => {
    svc.reorderWaves.mockResolvedValue([] as never)
    await reorderWavesAction(1, [3, 1, 2])
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.reorderWaves.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await reorderWavesAction(1, [3, 1, 2]).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
  })
})
