import prisma from '../lib/prisma'
import { PhaseInputSchema, type PhaseInput } from '../lib/schemas'

export async function getPhases(worldId: number) {
  return prisma.phase.findMany({ where: { worldId }, orderBy: { index: 'asc' } })
}

export async function createPhase(worldId: number, input: PhaseInput) {
  const data = PhaseInputSchema.parse(input)
  return prisma.phase.create({ data: { worldId, ...data } })
}

export async function updatePhase(id: number, input: Partial<PhaseInput>) {
  const data = PhaseInputSchema.partial().parse(input)
  return prisma.phase.update({ where: { id }, data })
}

export async function deletePhase(id: number) {
  return prisma.phase.delete({ where: { id } })
}
