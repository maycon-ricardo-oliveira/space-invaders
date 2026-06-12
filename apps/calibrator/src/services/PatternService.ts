import prisma from '../lib/prisma'
import { PatternInputSchema, type PatternInput } from '../lib/schemas'

export async function getPatterns() {
  return prisma.pattern.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function savePattern(input: PatternInput) {
  const data = PatternInputSchema.parse(input)
  return prisma.pattern.create({ data })
}

export async function deletePattern(id: number) {
  return prisma.pattern.delete({ where: { id } })
}
