'use server'
import { getLevels, getLevel, createLevel, updateLevelParams, deleteLevel } from '../../src/services/LevelService'
import type { LevelInput } from '../../src/lib/schemas'

export { getLevels, getLevel }
export async function createLevelAction(phaseId: number, input: LevelInput) { return createLevel(phaseId, input) }
export async function updateLevelParamsAction(id: number, input: Partial<LevelInput>) { return updateLevelParams(id, input) }
export async function deleteLevelAction(id: number) { return deleteLevel(id) }
