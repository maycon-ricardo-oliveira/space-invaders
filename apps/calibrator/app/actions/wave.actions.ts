'use server'
import { getWaves, createWave, updateWave, deleteWave, reorderWaves } from '../../src/services/WaveService'
import type { WaveInput } from '../../src/lib/schemas'

export { getWaves }
export async function createWaveAction(levelId: number, input: WaveInput) { return createWave(levelId, input) }
export async function updateWaveAction(id: number, input: Partial<WaveInput>) { return updateWave(id, input) }
export async function deleteWaveAction(id: number) { return deleteWave(id) }
export async function reorderWavesAction(levelId: number, orderedIds: number[]) { return reorderWaves(levelId, orderedIds) }
