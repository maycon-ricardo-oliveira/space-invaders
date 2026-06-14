import type { PlainWorld } from '../src/services/worldToLevelDefinitions'

export const SEED_WORLD_NAME = 'Planeta Xeron'

export const SEED_WORLD: PlainWorld = {
  phases: [{
    index: 0,
    status: 'published',
    levels: [{
      index: 0,
      enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0, hasPowerUps: true,
      waves: [
        {
          order: 1, delay: 0, grid: [
            ['basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null],
            Array(12).fill(null),
          ],
        },
        {
          order: 2, delay: 3.0, grid: [
            ['strong-enemy', null, 'fast-enemy', null, 'fast-enemy', null, 'fast-enemy', null, 'strong-enemy', null, 'asteroid', null],
            [null, 'basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null, null],
          ],
        },
      ],
    }],
  }],
}
