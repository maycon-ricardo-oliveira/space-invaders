'use server'
import { revalidatePath } from 'next/cache'
import { writeLevels } from '../src/levelsFile'
import type { LevelDefinition } from '@si/level-engine'

export async function saveLevels(levels: LevelDefinition[]): Promise<void> {
  try {
    writeLevels(levels)
    revalidatePath('/dashboard', 'layout')
  } catch (e) {
    console.error(e)
    throw new Error('Falha ao salvar os níveis')
  }
}
