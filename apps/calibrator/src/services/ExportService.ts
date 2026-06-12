import path from 'path'
import { writeFileSync } from 'fs'
import prisma from '../lib/prisma'
import { worldToLevelDefinitions, type PlainWorld } from './worldToLevelDefinitions'

// process.cwd() = apps/calibrator/ when running Next.js / Jest from that directory
const OUTPUT_PATH = path.join(process.cwd(), '..', 'game', 'src', 'levels.json')

export async function exportToJson(worldId: number): Promise<string> {
  const world = await prisma.world.findUniqueOrThrow({
    where: { id: worldId },
    include: {
      phases: {
        orderBy: { index: 'asc' },
        include: {
          levels: {
            orderBy: { index: 'asc' },
            include: { waves: { orderBy: { order: 'asc' } } },
          },
        },
      },
    },
  })
  const levels = worldToLevelDefinitions(world as unknown as PlainWorld)
  writeFileSync(OUTPUT_PATH, JSON.stringify(levels, null, 2))
  return OUTPUT_PATH
}
