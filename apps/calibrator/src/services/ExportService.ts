import path from 'path'
import { writeFileSync } from 'fs'
import prisma from '../lib/prisma'
import { worldToLevelDefinitions, type PlainWorld, type PlainPhase, type PlainLevel, type PlainWave } from './worldToLevelDefinitions'

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
  const plainWorld: PlainWorld = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    phases: (world.phases as any[]).map((phase): PlainPhase => ({
      index: phase.index,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      levels: (phase.levels as any[]).map((level): PlainLevel => ({
        index: level.index,
        enemySpeed: level.enemySpeed,
        shotDelay: level.shotDelay,
        fuelDrain: level.fuelDrain,
        enemyShotSpeed: level.enemyShotSpeed,
        enemyAngerDelay: level.enemyAngerDelay,
        enemySpawnDelay: level.enemySpawnDelay,
        hasPowerUps: level.hasPowerUps,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        waves: (level.waves as any[]).map((wave): PlainWave => ({
          order: wave.order,
          delay: wave.delay,
          grid: wave.grid as (string | null)[][],
        })),
      })),
    })),
  }
  const levels = worldToLevelDefinitions(plainWorld)
  writeFileSync(OUTPUT_PATH, JSON.stringify(levels, null, 2))
  return OUTPUT_PATH
}
