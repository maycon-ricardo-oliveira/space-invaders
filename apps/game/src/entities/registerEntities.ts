import type { EntityType } from '@si/level-engine'

export interface EntityTypeRegistrar {
  registerEntityType(type: EntityType): void
}

export function registerEntities(engine: EntityTypeRegistrar): void {
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
      movementPattern: 'oscillate-h',
      amplitudeX: 10,
      amplitudeY: 0,
      frequency: 0.5,
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
      movementPattern: 'orbit',
      amplitudeX: 12,
      amplitudeY: 8,
      frequency: 1.4,
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
      movementPattern: 'bob-v',
      amplitudeX: 0,
      amplitudeY: 6,
      frequency: 0.25,
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
      movementPattern: 'descend',
      amplitudeX: 0,
      amplitudeY: 0,
      frequency: 0,
    },
  })
}
