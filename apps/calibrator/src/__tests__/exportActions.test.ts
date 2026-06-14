/**
 * @jest-environment node
 *
 * Boundary tests for the export / saveLevels server actions.
 *   Fix 1 — both mutations call revalidatePath('/dashboard', 'layout') on success.
 *   Fix 2 — on service failure they log the original and rethrow a clean PT-BR error.
 */
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))
// Keep the real LevelExportValidationError class so `instanceof` works in the
// action, while stubbing the heavy exportToJson implementation.
jest.mock('../services/ExportService', () => ({
  ...jest.requireActual('../services/ExportService'),
  exportToJson: jest.fn(),
}))
jest.mock('../levelsFile', () => ({ writeLevels: jest.fn(), readLevels: jest.fn() }))

import { revalidatePath } from 'next/cache'
import * as ExportService from '../services/ExportService'
import { LevelExportValidationError } from '../services/ExportService'
import * as levelsFile from '../levelsFile'
import { exportToJsonAction } from '../../app/actions/export.actions'
import { saveLevels } from '../../app/actions'

const cache = revalidatePath as jest.Mock
const exportSvc = ExportService as jest.Mocked<typeof ExportService>
const files = levelsFile as jest.Mocked<typeof levelsFile>
const IO_LEAK = "ENOENT: no such file or directory, open '/abs/secret/path/levels.json'"
// Exactly the shape the fence in ExportService produces — safe, PT-BR, readable.
const FENCE_MESSAGE =
  'A validacao do levels.json falhou e o arquivo nao foi gravado (1 erro(s)): story-1-1: wave 2 fora do padrao esperado'

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => jest.restoreAllMocks())

describe('exportToJsonAction', () => {
  it('revalidates /dashboard layout on success', async () => {
    exportSvc.exportToJson.mockResolvedValue('/path/levels.json')
    await exportToJsonAction(1)
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    exportSvc.exportToJson.mockRejectedValue(new Error(IO_LEAK))
    const rejection = await exportToJsonAction(1).catch((e) => e)
    expect(rejection).toBeInstanceOf(Error)
    expect(rejection.message).not.toContain('ENOENT')
    expect(rejection.message).not.toContain('/abs/secret/path')
    expect(console.error).toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })

  // ── UX: the fence message is safe and built to be read — it must reach the
  // client verbatim, NOT be swallowed by the generic "Falha ao exportar" mask. ──
  it('propagates the fence VALIDATION message verbatim to the client', async () => {
    exportSvc.exportToJson.mockRejectedValue(new LevelExportValidationError(FENCE_MESSAGE))
    const rejection = await exportToJsonAction(1).catch((e) => e)
    expect(rejection).toBeInstanceOf(Error)
    // The user must see WHICH wave/problem failed, not a mute generic error.
    expect(rejection.message).toBe(FENCE_MESSAGE)
    expect(rejection.message).not.toBe('Falha ao exportar os níveis')
    expect(cache).not.toHaveBeenCalled()
  })

  it('masks UNEXPECTED (Prisma/IO) errors with the generic message and leaks nothing', async () => {
    const prismaLeak = new Error(
      'PrismaClientKnownRequestError: P2025 An operation failed because it depends on one or more records that were required but not found.\n    at /abs/secret/path/node_modules/@prisma/client/runtime/library.js:123:45',
    )
    exportSvc.exportToJson.mockRejectedValue(prismaLeak)
    const rejection = await exportToJsonAction(1).catch((e) => e)
    expect(rejection).toBeInstanceOf(Error)
    expect(rejection.message).toBe('Falha ao exportar os níveis')
    expect(rejection.message).not.toContain('Prisma')
    expect(rejection.message).not.toContain('P2025')
    expect(rejection.message).not.toContain('/abs/secret/path')
    expect(rejection.message).not.toContain('    at ')
    expect(console.error).toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })
})

describe('saveLevels', () => {
  it('revalidates /dashboard layout on success', async () => {
    files.writeLevels.mockReturnValue(undefined)
    await saveLevels([])
    expect(cache).toHaveBeenCalledWith('/dashboard', 'layout')
  })

  it('rethrows clean error and logs original on failure', async () => {
    files.writeLevels.mockImplementation(() => { throw new Error(IO_LEAK) })
    const rejection = await saveLevels([]).catch((e) => e)
    expect(rejection).toBeInstanceOf(Error)
    expect(rejection.message).not.toContain('ENOENT')
    expect(rejection.message).not.toContain('/abs/secret/path')
    expect(console.error).toHaveBeenCalled()
    expect(cache).not.toHaveBeenCalled()
  })
})
