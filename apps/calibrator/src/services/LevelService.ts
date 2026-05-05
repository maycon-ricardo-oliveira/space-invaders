import prisma from '../lib/prisma'
import { LevelInputSchema, LevelParamsSchema, type LevelInput } from '../lib/schemas'

export async function getLevels(phaseId: number) {
  return prisma.level.findMany({
    where: { phaseId },
    orderBy: { index: 'asc' },
    include: { waves: { orderBy: { order: 'asc' } } },
  })
}

export async function getLevel(id: number) {
  return prisma.level.findUniqueOrThrow({
    where: { id },
    include: { waves: { orderBy: { order: 'asc' } } },
  })
}

export async function createLevel(phaseId: number, input: LevelInput) {
  const data = LevelInputSchema.parse(input)
  return prisma.level.create({ data: { phaseId, ...data } })
}

export async function updateLevelParams(id: number, input: Partial<LevelInput>) {
  const data = LevelParamsSchema.partial().parse(input)
  return prisma.level.update({ where: { id }, data })
}

export async function deleteLevel(id: number) {
  return prisma.level.delete({ where: { id } })
}
