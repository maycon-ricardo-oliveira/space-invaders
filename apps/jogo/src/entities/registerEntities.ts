import type { ILevelEngine } from '@si/level-engine'

export function registerEntities(engine: ILevelEngine): void {
  engine.registerEntityType({
    id: 'basic-enemy',
    label: 'Basic Enemy',
    icon: '👾',
    properties: { pointValue: 100, health: 1 },
  })
  engine.registerEntityType({
    id: 'fast-enemy',
    label: 'Fast Enemy',
    icon: '🚀',
    properties: { pointValue: 200, health: 1 },
  })
  engine.registerEntityType({
    id: 'tank-enemy',
    label: 'Tank Enemy',
    icon: '🛡️',
    properties: { pointValue: 500, health: 3 },
  })
}
