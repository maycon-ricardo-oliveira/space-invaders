/**
 * @jest-environment node
 *
 * Boundary tests for the phase server actions (Fix 1 revalidatePath, Fix 2 clean rethrow).
 */
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('../services/PhaseService', () => ({
  getPhases: jest.fn(),
  createPhase: jest.fn(),
  updatePhase: jest.fn(),
  deletePhase: jest.fn(),
  setPhaseStatus: jest.fn(),
}))

import { revalidatePath } from 'next/cache'
import * as PhaseService from '../services/PhaseService'
import {
  createPhaseAction,
  updatePhaseAction,
  deletePhaseAction,
  setPhaseStatusAction,
} from '../../app/actions/phase.actions'

const cache = revalidatePath as jest.Mock
const svc = PhaseService as jest.Mocked<typeof PhaseService>
const PRISMA_LEAK = 'PrismaClientKnownRequestError: Unique constraint failed on the fields: (`worldId`,`index`)'

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('createPhaseAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.createPhase.mockResolvedValue({ id: 1 } as never)
    await createPhaseAction(1, { name: 'Phase 1', index: 0 })
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.createPhase.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await createPhaseAction(1, { name: 'Phase 1', index: 0 }).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })
})

describe('updatePhaseAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.updatePhase.mockResolvedValue({ id: 1 } as never)
    await updatePhaseAction(1, { name: 'Nova' })
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.updatePhase.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await updatePhaseAction(1, { name: 'Nova' }).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
  })
})

describe('deletePhaseAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.deletePhase.mockResolvedValue({ id: 1 } as never)
    await deletePhaseAction(1)
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.deletePhase.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await deletePhaseAction(1).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
  })
})

describe('setPhaseStatusAction', () => {
  it('calls the service with the phase id and status', async () => {
    svc.setPhaseStatus.mockResolvedValue({ id: 1, status: 'published' } as never)
    await setPhaseStatusAction(1, 'published')
    expect(svc.setPhaseStatus).toHaveBeenCalledWith(1, 'published')
  })

  it('revalidates /dashboard layout on success', async () => {
    svc.setPhaseStatus.mockResolvedValue({ id: 1, status: 'published' } as never)
    await setPhaseStatusAction(1, 'published')
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.setPhaseStatus.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await setPhaseStatusAction(1, 'published').catch((e) => e)
    expect(rejection).toBeInstanceOf(Error)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })
})
