'use server'
import { revalidatePath } from 'next/cache'
import { getWaves, createWave, updateWave, deleteWave, reorderWaves } from '../../src/services/WaveService'
import type { WaveInput } from '../../src/lib/schemas'

export { getWaves }

export async function createWaveAction(levelId: number, input: WaveInput) {
  try {
    const r = await createWave(levelId, input)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao criar a wave')
  }
}

export async function updateWaveAction(id: number, input: Partial<WaveInput>) {
  try {
    const r = await updateWave(id, input)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao salvar a wave')
  }
}

export async function deleteWaveAction(id: number) {
  try {
    const r = await deleteWave(id)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao excluir a wave')
  }
}

export async function reorderWavesAction(levelId: number, orderedIds: number[]) {
  try {
    const r = await reorderWaves(levelId, orderedIds)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao reordenar as waves')
  }
}
