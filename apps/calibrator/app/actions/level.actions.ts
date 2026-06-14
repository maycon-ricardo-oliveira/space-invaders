'use server'
import { revalidatePath } from 'next/cache'
import { getLevels, getLevel, createLevel, updateLevelParams, deleteLevel } from '../../src/services/LevelService'
import type { LevelInput } from '../../src/lib/schemas'

export { getLevels, getLevel }

export async function createLevelAction(phaseId: number, input: LevelInput) {
  try {
    const r = await createLevel(phaseId, input)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao criar o nível')
  }
}

export async function updateLevelParamsAction(id: number, input: Partial<LevelInput>) {
  try {
    const r = await updateLevelParams(id, input)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao salvar o nível')
  }
}

export async function deleteLevelAction(id: number) {
  try {
    const r = await deleteLevel(id)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao excluir o nível')
  }
}
