import path from 'path'
import { writeFileSync } from 'fs'
import { validateLevels } from '@si/level-engine'
import { EntityTypeSchema } from '../src/lib/schemas'
import { worldToLevelDefinitions } from '../src/services/worldToLevelDefinitions'
import { SEED_WORLD } from './seedData'

// Deterministic, in-memory regeneration of the game artifact from the seed —
// pure function + file write, NO Postgres, NO migrate/seed against real data.
// Same canonical fence as ExportService: never emit an artifact the game rejects.
const OUTPUT_PATH = path.join(__dirname, '..', '..', 'game', 'src', 'levels.json')
const KNOWN_TYPE_IDS = new Set<string>(EntityTypeSchema.options)

function main(): void {
  const levels = worldToLevelDefinitions(SEED_WORLD)

  const validationErrors = validateLevels(levels, KNOWN_TYPE_IDS)
  if (validationErrors.length > 0) {
    const summary = validationErrors.map((e) => `${e.levelId}: ${e.message}`).join('\n  ')
    throw new Error(`Artefato invalido — levels.json NAO foi gravado:\n  ${summary}`)
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(levels, null, 2))
  console.log(`levels.json gerado em ${OUTPUT_PATH} (${levels.length} level(s))`)
}

main()
