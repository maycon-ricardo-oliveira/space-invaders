import prisma from '../lib/prisma'
import { WorldInputSchema, type WorldInput } from '../lib/schemas'

export async function getWorlds() {
  return prisma.world.findMany({ orderBy: { index: 'asc' } })
}

export async function getWorld(id: number) {
  return prisma.world.findUniqueOrThrow({ where: { id } })
}

export async function createWorld(input: WorldInput) {
  const data = WorldInputSchema.parse(input)
  return prisma.world.create({ data })
}

export async function updateWorld(id: number, input: Partial<WorldInput>) {
  const data = WorldInputSchema.partial().parse(input)
  return prisma.world.update({ where: { id }, data })
}

export async function deleteWorld(id: number) {
  return prisma.world.delete({ where: { id } })
}
