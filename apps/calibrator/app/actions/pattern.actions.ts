'use server'
import { revalidatePath } from 'next/cache'
import { getPatterns, savePattern, deletePattern } from '../../src/services/PatternService'
import type { PatternInput } from '../../src/lib/schemas'

export { getPatterns }

export async function savePatternAction(input: PatternInput) {
  try {
    const r = await savePattern(input)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao salvar o padrão')
  }
}

export async function deletePatternAction(id: number) {
  try {
    const r = await deletePattern(id)
    revalidatePath('/dashboard', 'layout')
    return r
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao excluir o padrão')
  }
}
