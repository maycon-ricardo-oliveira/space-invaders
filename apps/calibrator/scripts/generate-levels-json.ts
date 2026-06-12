// Regenerates apps/game/src/levels.json from the seed data — no database needed.
// Run from apps/calibrator: npx tsx scripts/generate-levels-json.ts
import path from 'path'
import { writeFileSync } from 'fs'
import { worldToLevelDefinitions } from '../src/services/worldToLevelDefinitions'
import { SEED_WORLD } from '../prisma/seedData'

const OUTPUT = path.join(__dirname, '..', '..', 'game', 'src', 'levels.json')
writeFileSync(OUTPUT, JSON.stringify(worldToLevelDefinitions(SEED_WORLD), null, 2))
console.log(`levels.json written to ${OUTPUT}`)
