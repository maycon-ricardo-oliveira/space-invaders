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
  // Backend never trusts the front-end index: derive next index = max(scope) + 1.
  const top = await prisma.level.findFirst({ where: { phaseId }, orderBy: { index: 'desc' } })
  const index = top ? top.index + 1 : 0
  return prisma.level.create({ data: { phaseId, ...data, index } })
}

export async function updateLevelParams(id: number, input: Partial<LevelInput>) {
  const data = LevelParamsSchema.partial().parse(input)
  return prisma.level.update({ where: { id }, data })
}

export async function deleteLevel(id: number) {
  return prisma.level.delete({ where: { id } })
}
