'use server'
import { getPatterns, savePattern, deletePattern } from '../../src/services/PatternService'
import type { PatternInput } from '../../src/lib/schemas'

export { getPatterns }
export async function savePatternAction(input: PatternInput) { return savePattern(input) }
export async function deletePatternAction(id: number) { return deletePattern(id) }
