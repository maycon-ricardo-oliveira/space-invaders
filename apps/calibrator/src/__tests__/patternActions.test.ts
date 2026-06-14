/**
 * @jest-environment node
 *
 * Boundary tests for the pattern server actions (Fix 1 revalidatePath, Fix 2 clean rethrow).
 */
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
jest.mock('../services/PatternService', () => ({
  getPatterns: jest.fn(),
  savePattern: jest.fn(),
  deletePattern: jest.fn(),
}))

import { revalidatePath } from 'next/cache'
import * as PatternService from '../services/PatternService'
import { savePatternAction, deletePatternAction } from '../../app/actions/pattern.actions'

const cache = revalidatePath as jest.Mock
const svc = PatternService as jest.Mocked<typeof PatternService>
const PRISMA_LEAK = 'PrismaClientKnownRequestError: write conflict'
const grid = [Array(12).fill(null)]

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('savePatternAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.savePattern.mockResolvedValue({ id: 1 } as never)
    await savePatternAction({ name: 'Linha', grid })
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.savePattern.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await savePatternAction({ name: 'Linha', grid }).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })
})

describe('deletePatternAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    svc.deletePattern.mockResolvedValue({ id: 1 } as never)
    await deletePatternAction(1)
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    svc.deletePattern.mockRejectedValue(new Error(PRISMA_LEAK))
    const rejection = await deletePatternAction(1).catch((e) => e)
    expect(rejection.message).not.toContain('Prisma')
    expect(console.error).toHaveBeenCalled()
  })
})
