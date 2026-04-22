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

  it('registers tank-enemy', () => {
    registerEntities(makeEngine())
    expect(registry.get('tank-enemy')).toBeDefined()
  })

  it('registers exactly 3 entity types', () => {
    registerEntities(makeEngine())
    expect(registry.getAll()).toHaveLength(3)
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
})
