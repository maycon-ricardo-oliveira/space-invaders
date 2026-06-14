/**
 * @jest-environment node
 *
 * Boundary tests for the world server actions (Fix 1 revalidatePath, Fix 2 clean rethrow).
 */
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('../services/WorldService', () => ({
  getWorlds: jest.fn(),
  getWorld: jest.fn(),
  createWorld: jest.fn(),
  updateWorld: jest.fn(),
  deleteWorld: jest.fn(),
}))

import { revalidatePath } from 'next/cache'
import * as WorldService from '../services/WorldService'
import {
  createWorldAction,
  updateWorldAction,
  deleteWorldAction,
} from '../../app/actions/world.actions'

const cache = revalidatePath as jest.Mock
const svc = WorldService as jest.Mocked<typeof WorldService>
const PRISMA_LEAK = 'PrismaClientKnownRequestError: Unique constraint failed on the fields: (`index`)'

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('createWorldAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.createWorld.mockResolvedValue({ id: 1 } as never)
    await createWorldAction({ name: 'Planeta X', index: 0 })
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.createWorld.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await createWorldAction({ name: 'Planeta X', index: 0 }).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })
})

describe('updateWorldAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.updateWorld.mockResolvedValue({ id: 1 } as never)
    await updateWorldAction(1, { name: 'Novo' })
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.updateWorld.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await updateWorldAction(1, { name: 'Novo' }).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
  })
})

describe('deleteWorldAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.deleteWorld.mockResolvedValue({ id: 1 } as never)
    await deleteWorldAction(1)
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.deleteWorld.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await deleteWorldAction(1).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
  })
})
