import path from 'path'
import fs from 'fs'
import type { LevelDefinition } from '@si/level-engine'

// __dirname = apps/calibrator/src
// ../../.. resolves to monorepo root (space-invaders/)
const LEVELS_PATH = path.join(
  __dirname,
  '..',
  '..',
  '..',
  'apps',
  'game',
  'src',
  'levels.json',
)

export function readLevels(): LevelDefinition[] {
  if (!fs.existsSync(LEVELS_PATH)) return []
  return JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf-8')) as LevelDefinition[]
}

export function writeLevels(levels: LevelDefinition[]): void {
  fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2))
}
