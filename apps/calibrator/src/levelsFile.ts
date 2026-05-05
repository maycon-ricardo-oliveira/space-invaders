import path from 'path'
import fs from 'fs'
import type { LevelDefinition } from '@si/level-engine'

// process.cwd() = apps/calibrator/ in both ts-node and Next.js server context
const LEVELS_PATH = path.join(process.cwd(), '..', 'game', 'src', 'levels.json')

export function readLevels(): LevelDefinition[] {
  if (!fs.existsSync(LEVELS_PATH)) return []
  return JSON.parse(fs.readFileSync(LEVELS_PATH, 'utf-8')) as LevelDefinition[]
}

export function writeLevels(levels: LevelDefinition[]): void {
  fs.writeFileSync(LEVELS_PATH, JSON.stringify(levels, null, 2))
}
