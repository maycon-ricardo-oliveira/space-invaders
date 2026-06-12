import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import * as dotenv from 'dotenv'
dotenv.config()

const connectionString = process.env.DATABASE_URL!
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function main() {
  const world = await prisma.world.upsert({
    where: { index: 0 },
    update: {},
    create: { name: 'Planeta Xeron', index: 0, parallaxTheme: 'space' },
  })

  const phase = await prisma.phase.upsert({
    where: { worldId_index: { worldId: world.id, index: 0 } },
    update: {},
    create: { worldId: world.id, name: 'Fase 1', index: 0 },
  })

  const level = await prisma.level.upsert({
    where: { phaseId_index: { phaseId: phase.id, index: 0 } },
    update: {},
    create: {
      phaseId: phase.id, name: 'Level 1', index: 0,
      enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0,
      enemySpawnDelay: 1.0, hasPowerUps: true,
    },
  })

  const waves = [
    {
      order: 1, delay: 0,
      grid: [
        ['grunt', null, 'grunt', null, 'grunt', null, 'grunt', null, null, null, null, null],
        Array(12).fill(null),
      ],
    },
    {
      order: 2, delay: 3.0,
      grid: [
        [null, null, null, null, null, 'rocket', null, null, null, null, null, null],
        [null, null, null, null, 'grunt', null, 'grunt', null, null, null, null, null],
      ],
    },
    {
      order: 3, delay: 3.0,
      grid: [
        ['shield', null, null, null, null, null, null, null, null, null, null, null],
        [null, null, 'grunt', null, 'grunt', null, null, null, null, null, null, null],
      ],
    },
  ]

  for (const wave of waves) {
    await prisma.wave.upsert({
      where: { levelId_order: { levelId: level.id, order: wave.order } },
      update: {},
      create: { levelId: level.id, ...wave },
    })
  }

  console.log(`Seed complete — World: ${world.name}, Phase: ${phase.name}, Level: ${level.name}, Waves: ${waves.length}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
