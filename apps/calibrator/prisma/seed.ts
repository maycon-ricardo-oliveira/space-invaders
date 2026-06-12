import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
import { SEED_WORLD, SEED_WORLD_NAME } from './seedData'
dotenv.config()

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const world = await prisma.world.upsert({
    where: { index: 0 },
    update: {},
    create: { name: SEED_WORLD_NAME, index: 0, parallaxTheme: 'space' },
  })

  const seedPhase = SEED_WORLD.phases[0]
  const phase = await prisma.phase.upsert({
    where: { worldId_index: { worldId: world.id, index: seedPhase.index } },
    update: {},
    create: { worldId: world.id, name: 'Fase 1', index: seedPhase.index },
  })

  const seedLevel = seedPhase.levels[0]
  const level = await prisma.level.upsert({
    where: { phaseId_index: { phaseId: phase.id, index: seedLevel.index } },
    update: {},
    create: {
      phaseId: phase.id, name: 'Level 1', index: seedLevel.index,
      enemySpeed: seedLevel.enemySpeed, shotDelay: seedLevel.shotDelay, fuelDrain: seedLevel.fuelDrain,
      enemyShotSpeed: seedLevel.enemyShotSpeed, enemyAngerDelay: seedLevel.enemyAngerDelay,
      enemySpawnDelay: seedLevel.enemySpawnDelay, hasPowerUps: seedLevel.hasPowerUps,
    },
  })

  for (const wave of seedLevel.waves) {
    await prisma.wave.upsert({
      where: { levelId_order: { levelId: level.id, order: wave.order } },
      update: {},
      create: { levelId: level.id, ...wave },
    })
  }

  console.log(`Seed complete — World: ${world.name}, Phase: ${phase.name}, Level: ${level.name}, Waves: ${seedLevel.waves.length}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
