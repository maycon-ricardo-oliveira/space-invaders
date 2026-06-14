import prisma from '../lib/prisma'
import { PhaseInputSchema, PhaseStatusSchema, type PhaseInput, type PhaseStatus } from '../lib/schemas'
import { GRID_ROWS, GRID_COLS } from '../lib/gridConstants'

const LEVEL_DEFAULTS = {
  enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
  enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0, hasPowerUps: true,
}

// Empty wave grid: GRID_ROWS rows × GRID_COLS columns, every cell null.
function emptyGrid(): null[][] {
  return Array.from({ length: GRID_ROWS }, () => Array<null>(GRID_COLS).fill(null))
}

export async function getPhases(worldId: number) {
  return prisma.phase.findMany({ where: { worldId }, orderBy: { index: 'asc' } })
}

export async function createPhase(worldId: number, input: PhaseInput) {
  const data = PhaseInputSchema.parse(input)
  // Backend never trusts the front-end index: derive next index = max(scope) + 1.
  const top = await prisma.phase.findFirst({ where: { worldId }, orderBy: { index: 'desc' } })
  const index = top ? top.index + 1 : 0

  // Cascade: every phase is born navigable — Phase(draft) + Level 1 + Wave 1.
  return prisma.$transaction(async (tx) => {
    const phase = await tx.phase.create({
      data: { worldId, name: data.name, index, status: 'draft' },
    })
    const level = await tx.level.create({
      data: { phaseId: phase.id, name: 'Level 1', index: 0, ...LEVEL_DEFAULTS },
    })
    await tx.wave.create({
      data: { levelId: level.id, order: 1, delay: 3.0, grid: emptyGrid() },
    })
    return phase
  })
}

export async function updatePhase(id: number, input: Partial<PhaseInput>) {
  const data = PhaseInputSchema.partial().parse(input)
  return prisma.phase.update({ where: { id }, data })
}

export async function setPhaseStatus(id: number, status: PhaseStatus) {
  // Never trust the caller — validate before touching the database.
  const parsed = PhaseStatusSchema.parse(status)
  return prisma.phase.update({ where: { id }, data: { status: parsed } })
}

export async function deletePhase(id: number) {
  return prisma.phase.delete({ where: { id } })
}
