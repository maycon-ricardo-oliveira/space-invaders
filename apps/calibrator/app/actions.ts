'use server'
import { writeLevels } from '../src/levelsFile'
import type { LevelDefinition } from '@si/level-engine'

export async function saveLevels(levels: LevelDefinition[]): Promise<void> {
  writeLevels(levels)
}
