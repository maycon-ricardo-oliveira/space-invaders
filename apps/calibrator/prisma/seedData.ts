import type { PlainWorld } from '../src/services/worldToLevelDefinitions'

export const SEED_WORLD_NAME = 'Planeta Xeron'

export const SEED_WORLD: PlainWorld = {
  phases: [{
    index: 0,
    levels: [{
      index: 0,
      enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
      enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0, hasPowerUps: true,
      waves: [
        {
          order: 1, delay: 0, grid: [
            ['basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null, 'basic-enemy', null, null, null, null, null],
            Array(12).fill(null),
          ],
        },
        {
          order: 2, delay: 3.0, grid: [
            [null, null, null, null, null, 'fast-enemy', null, null, null, null, null, null],
            [null, null, null, null, 'basic-enemy', null, 'basic-enemy', null, null, null, null, null],
          ],
        },
        {
          order: 3, delay: 3.0, grid: [
            ['strong-enemy', null, null, null, null, null, null, null, null, null, null, null],
            [null, null, 'basic-enemy', null, 'basic-enemy', null, null, null, null, null, null, null],
          ],
        },
      ],
    }],
  }],
}
