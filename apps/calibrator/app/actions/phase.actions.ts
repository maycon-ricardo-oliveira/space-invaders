'use server'
import { revalidatePath } from 'next/cache'
import { getPhases, createPhase, updatePhase, deletePhase, setPhaseStatus } from '../../src/services/PhaseService'
import type { PhaseInput, PhaseStatus } from '../../src/lib/schemas'

export { getPhases }

export async function createPhaseAction(worldId: number, input: PhaseInput) {
  try {
    const r = await createPhase(worldId, input)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao criar a fase')
  }
}

export async function updatePhaseAction(id: number, input: Partial<PhaseInput>) {
  try {
    const r = await updatePhase(id, input)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao salvar a fase')
  }
}

export async function setPhaseStatusAction(id: number, status: PhaseStatus) {
  try {
    const r = await setPhaseStatus(id, status)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao publicar a fase')
  }
}

export async function deletePhaseAction(id: number) {
  try {
    const r = await deletePhase(id)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao excluir a fase')
  }
}
