'use server'
import { exportToJson } from '../../src/services/ExportService'

export async function exportToJsonAction(worldId: number) {
  await exportToJson(worldId)
}
