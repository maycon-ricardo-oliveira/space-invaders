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
  // IDOR guard — never trust the caller's id list. Only reorder when orderedIds
  // is EXACTLY the set of waves owned by levelId (same count, same ids, no
  // duplicates). A foreign id, a missing id, or a dupe means the request is not
  // a legitimate reorder of this level — reject before touching the database.
  const existing = await prisma.wave.findMany({ where: { levelId }, select: { id: true } })
  const ownedIds = new Set(existing.map((w) => w.id))
  const seen = new Set<number>()
  const sameSet =
    orderedIds.length === ownedIds.size &&
    orderedIds.every((id) => {
      if (seen.has(id) || !ownedIds.has(id)) return false
      seen.add(id)
      return true
    })
  if (!sameSet) {
    throw new Error('Reordenação inválida: as waves não pertencem a este nível')
  }

  // @@unique([levelId, order]) makes a single-pass assignment of final orders
  // collide on any swap (P2002). Two-phase inside one transaction: first park
  // every affected row at a non-colliding negative offset, then set the final
  // 1..n orders. Atomic via $transaction.
  return prisma.$transaction([
    ...orderedIds.map((id, i) =>
      prisma.wave.update({ where: { id }, data: { order: -(i + 1) } })
    ),
    ...orderedIds.map((id, i) =>
      prisma.wave.update({ where: { id }, data: { order: i + 1 } })
    ),
  ])
}
