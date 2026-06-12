'use server'
import { getWorlds, getWorld, createWorld, updateWorld, deleteWorld } from '../../src/services/WorldService'
import type { WorldInput } from '../../src/lib/schemas'

export { getWorlds, getWorld }
export async function createWorldAction(input: WorldInput) { return createWorld(input) }
export async function updateWorldAction(id: number, input: Partial<WorldInput>) { return updateWorld(id, input) }
export async function deleteWorldAction(id: number) { return deleteWorld(id) }
