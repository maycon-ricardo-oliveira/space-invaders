'use server'
import { revalidatePath } from 'next/cache'
import { getWorlds, getWorld, createWorld, updateWorld, deleteWorld } from '../../src/services/WorldService'
import type { WorldInput } from '../../src/lib/schemas'

export { getWorlds, getWorld }

export async function createWorldAction(input: WorldInput) {
  try {
    const r = await createWorld(input)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao criar o mundo')
  }
}

export async function updateWorldAction(id: number, input: Partial<WorldInput>) {
  try {
    const r = await updateWorld(id, input)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao salvar o mundo')
  }
}

export async function deleteWorldAction(id: number) {
  try {
    const r = await deleteWorld(id)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao excluir o mundo')
  }
}
