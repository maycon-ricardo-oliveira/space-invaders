import type { ILevelEngine } from '@si/level-engine'

export function registerEntities(engine: ILevelEngine): void {
  engine.registerEntityType({
    id: 'basic-enemy',
    label: 'Basic Enemy',
    icon: '👾',
    properties: {
      hp: 100,
      speedMultiplier: 1.0,
      movementType: 'horizontal',
      burstCount: 1,
      xpValue: 1,
      dropsPickup: null,
    },
  })
  engine.registerEntityType({
    id: 'fast-enemy',
    label: 'Fast Enemy',
    icon: '🚀',
    properties: {
      hp: 40,
      speedMultiplier: 2.5,
      movementType: 'horizontal',
      burstCount: 3,
      xpValue: 2,
      dropsPickup: null,
    },
  })
  engine.registerEntityType({
    id: 'strong-enemy',
    label: 'Strong Enemy',
    icon: '🛡️',
    properties: {
      hp: 200,
      speedMultiplier: 0.5,
      movementType: 'horizontal',
      burstCount: 1,
      xpValue: 3,
      dropsPickup: null,
    },
  })
  engine.registerEntityType({
    id: 'asteroid',
    label: 'Asteroid',
    icon: '☄️',
    properties: {
      hp: 60,
      speedMultiplier: 0.8,
      movementType: 'vertical',
      burstCount: 0,
      xpValue: 1,
      dropsPickup: 'damage',
    },
  })
}
