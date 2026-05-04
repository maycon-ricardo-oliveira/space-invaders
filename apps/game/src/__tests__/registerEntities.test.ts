import { EntityRegistry } from '@si/level-engine'
import { registerEntities } from '../entities/registerEntities'

describe('registerEntities', () => {
  let registry: EntityRegistry

  beforeEach(() => {
    registry = new EntityRegistry()
  })

  function makeEngine() {
    return { registerEntityType: (t: any) => registry.register(t) } as any
  }

  it('registers basic-enemy', () => {
    registerEntities(makeEngine())
    expect(registry.get('basic-enemy')).toBeDefined()
  })

  it('registers fast-enemy', () => {
    registerEntities(makeEngine())
    expect(registry.get('fast-enemy')).toBeDefined()
  })

  it('registers strong-enemy', () => {
    registerEntities(makeEngine())
    expect(registry.get('strong-enemy')).toBeDefined()
  })

  it('registers asteroid', () => {
    registerEntities(makeEngine())
    expect(registry.get('asteroid')).toBeDefined()
  })

  it('registers exactly 4 entity types', () => {
    registerEntities(makeEngine())
    expect(registry.getAll()).toHaveLength(4)
  })

  it('every entity type has id, label, icon, and properties', () => {
    registerEntities(makeEngine())
    for (const type of registry.getAll()) {
      expect(type.id).toBeTruthy()
      expect(type.label).toBeTruthy()
      expect(type.icon).toBeTruthy()
      expect(type.properties).toBeDefined()
    }
  })

  it('basic-enemy has hp: 100 and burstCount: 1', () => {
    registerEntities(makeEngine())
    const basicEnemy = registry.get('basic-enemy')
    expect(basicEnemy?.properties.hp).toBe(100)
    expect(basicEnemy?.properties.burstCount).toBe(1)
  })

  it('fast-enemy has hp: 40, burstCount: 3, and speedMultiplier: 2.5', () => {
    registerEntities(makeEngine())
    const fastEnemy = registry.get('fast-enemy')
    expect(fastEnemy?.properties.hp).toBe(40)
    expect(fastEnemy?.properties.burstCount).toBe(3)
    expect(fastEnemy?.properties.speedMultiplier).toBe(2.5)
  })

  it('strong-enemy has hp: 200', () => {
    registerEntities(makeEngine())
    const strongEnemy = registry.get('strong-enemy')
    expect(strongEnemy?.properties.hp).toBe(200)
  })

  it('asteroid has movementType: vertical, burstCount: 0, and dropsPickup: damage', () => {
    registerEntities(makeEngine())
    const asteroid = registry.get('asteroid')
    expect(asteroid?.properties.movementType).toBe('vertical')
    expect(asteroid?.properties.burstCount).toBe(0)
    expect(asteroid?.properties.dropsPickup).toBe('damage')
  })
})
