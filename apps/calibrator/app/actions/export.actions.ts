'use server'
import { revalidatePath } from 'next/cache'
import { exportToJson, LevelExportValidationError } from '../../src/services/ExportService'

export async function exportToJsonAction(worldId: number) {
  try {
    const r = await exportToJson(worldId)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    // The fence message is safe and built to be read — let it through verbatim.
    if (e instanceof LevelExportValidationError) throw e
    // Anything else (Prisma/IO) may leak internals — log it, mask the client.
    console.error(e)
    throw new Error('Falha ao exportar os níveis')
  }
}
