import type { LevelDefinition, EntityPlacement, Wave } from '@si/level-engine'
import { PHONE_WIDTH, GRID_COLS, CELL_HEIGHT_EXPORT, PLAYER_SPAWN_ROW } from '../lib/gridConstants'

export interface PlainWave { order: number; delay: number /* reserved for Sprint 6B wave timing */; grid: (string | null)[][] }
export interface PlainLevel {
  index: number
  enemySpeed: number; shotDelay: number; fuelDrain: number
  enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number
  hasPowerUps: boolean
  waves: PlainWave[]
}
export interface PlainPhase { index: number; status: string; levels: PlainLevel[] }
export interface PlainWorld { phases: PlainPhase[] }

const CELL_WIDTH = PHONE_WIDTH / GRID_COLS
const CELL_HEIGHT = CELL_HEIGHT_EXPORT

function gridToEntityPlacements(grid: (string | null)[][]): EntityPlacement[] {
  const placements: EntityPlacement[] = []
  for (let row = 0; row < grid.length; row++) {
    if (row === PLAYER_SPAWN_ROW) continue // player spawn row is reserved — never export (y out of bounds)
    for (let col = 0; col < grid[row].length; col++) {
      const cell = grid[row][col]
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

export function worldToLevelDefinitions(world: PlainWorld): LevelDefinition[] {
  const levels: LevelDefinition[] = []
  // Publication gate: only published phases reach the artifact; drafts are skipped.
  const publishedPhases = world.phases.filter((p) => p.status === 'published')
  for (const phase of [...publishedPhases].sort((a, b) => a.index - b.index)) {
    for (const level of [...phase.levels].sort((a, b) => a.index - b.index)) {
      const waves = [...level.waves].sort((a, b) => a.order - b.order)
      const levelWaves: Wave[] = waves.map(w => ({ order: w.order, delay: w.delay, entities: gridToEntityPlacements(w.grid) }))
      const allEntities = levelWaves.flatMap(w => w.entities)
      levels.push({
        id: `story-${phase.index + 1}-${level.index + 1}`,
        style: 'classic',
        difficultyScore: Math.round((level.index / 9) * 100),
        phaseIndex: phase.index + 1,
        levelIndex: level.index + 1,
        entities: allEntities,
        waves: levelWaves,
        params: {
          numberOfEnemies: allEntities.length,
          enemySpeed: level.enemySpeed,
          enemyShotDelay: level.shotDelay,
          enemyShotSpeed: level.enemyShotSpeed,
          enemyAngerDelay: level.enemyAngerDelay,
          enemySpawnDelay: level.enemySpawnDelay,
          hasPowerUps: level.hasPowerUps,
          powerUpMinWait: 5,
          powerUpMaxWait: 15,
          fuelDrainRate: level.fuelDrain,
        },
      })
    }
  }
  return levels
}
