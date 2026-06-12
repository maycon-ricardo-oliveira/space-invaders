import prisma from '../lib/prisma'
import { WaveInputSchema, type WaveInput } from '../lib/schemas'

export async function getWaves(levelId: number) {
  return prisma.wave.findMany({ where: { levelId }, orderBy: { order: 'asc' } })
}

export async function createWave(levelId: number, input: WaveInput) {
  const data = WaveInputSchema.parse(input)
  return prisma.wave.create({ data: { levelId, ...data } })
}

export async function updateWave(id: number, input: Partial<WaveInput>) {
  const data = WaveInputSchema.partial().parse(input)
  return prisma.wave.update({ where: { id }, data })
}

export async function deleteWave(id: number) {
  return prisma.wave.delete({ where: { id } })
}

export async function reorderWaves(levelId: number, orderedIds: number[]) {
  return prisma.$transaction(
    orderedIds.map((id, i) =>
      prisma.wave.update({ where: { id }, data: { order: i + 1 } })
    )
  )
}
