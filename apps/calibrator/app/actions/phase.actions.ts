'use server'
import { getPhases, createPhase, updatePhase, deletePhase } from '../../src/services/PhaseService'
import type { PhaseInput } from '../../src/lib/schemas'

export { getPhases }
export async function createPhaseAction(worldId: number, input: PhaseInput) { return createPhase(worldId, input) }
export async function updatePhaseAction(id: number, input: Partial<PhaseInput>) { return updatePhase(id, input) }
export async function deletePhaseAction(id: number) { return deletePhase(id) }
