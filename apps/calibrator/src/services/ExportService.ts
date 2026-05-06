import path from 'path'
import { writeFileSync } from 'fs'
import prisma from '../lib/prisma'
import type { LevelDefinition, EntityPlacement, Wave } from '@si/level-engine'
import { PHONE_WIDTH, GRID_COLS, CELL_HEIGHT_EXPORT } from '../lib/gridConstants'

// process.cwd() = apps/calibrator/ when running Next.js / Jest from that directory
const OUTPUT_PATH = path.join(process.cwd(), '..', 'game', 'src', 'levels.json')

const CELL_WIDTH = PHONE_WIDTH / GRID_COLS   // 390/11 ≈ 35.45px
const CELL_HEIGHT = CELL_HEIGHT_EXPORT       // 40px vertical spacing

function gridToEntityPlacements(grid: (string | null)[][]): EntityPlacement[] {
  const placements: EntityPlacement[] = []
  for (let row = 0; row < grid.length; row++) {
    const rowCells = grid[row]
    for (let col = 0; col < rowCells.length; col++) {
      const cell = rowCells[col]
      if (cell !== null) {
        placements.push({
          entityTypeId: cell,
          x: col * CELL_WIDTH + CELL_WIDTH / 2,
          y: row * CELL_HEIGHT + CELL_HEIGHT / 2,
        })
      }
    }
  }
  return placements
}

export async function exportToJson(worldId: number): Promise<string> {
  const world = await prisma.world.findUniqueOrThrow({
    where: { id: worldId },
    include: {
      phases: {
        orderBy: { index: 'asc' },
        include: {
          levels: {
            orderBy: { index: 'asc' },
            include: {
              waves: { orderBy: { order: 'asc' } },
            },
          },
        },
      },
    },
  })

  const levels: LevelDefinition[] = []

  for (const phase of world.phases) {
    for (const level of phase.levels) {
      const waves = level.waves as Array<{
        id: number
        order: number
        delay: number
        grid: (string | null)[][]
      }>

      const numberOfEnemies = waves.reduce((sum, wave) => {
        return sum + wave.grid.flat().filter(cell => cell !== null).length
      }, 0)

      const difficultyScore = Math.round((level.index / 9) * 100)

      const levelWaves: Wave[] = waves.map(wave => ({
        entities: gridToEntityPlacements(wave.grid),
      }))

      // Collect all entity placements across waves for the top-level entities array
      const allEntities: EntityPlacement[] = waves.flatMap(wave =>
        gridToEntityPlacements(wave.grid)
      )

      const levelDef: LevelDefinition = {
        id: `story-${phase.index}-${level.index}`,
        style: 'classic',
        difficultyScore,
        entities: allEntities,
        params: {
          numberOfEnemies,
          enemySpeed: level.enemySpeed,
          enemyShotDelay: level.shotDelay,
          enemyShotSpeed: level.enemyShotSpeed,
          enemyAngerDelay: level.enemyAngerDelay,
          enemySpawnDelay: level.enemySpawnDelay,
          hasPowerUps: level.hasPowerUps,
          powerUpMinWait: 5,
          powerUpMaxWait: 15,
        },
        waves: levelWaves,
      }

      levels.push(levelDef)
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(levels, null, 2))
  return OUTPUT_PATH
}
