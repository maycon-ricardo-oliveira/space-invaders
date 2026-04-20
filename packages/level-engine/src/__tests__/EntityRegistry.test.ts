import { EntityRegistry } from '../registry/EntityRegistry'
import type { EntityType } from '../types'

describe('EntityRegistry', () => {
  let registry: EntityRegistry

  beforeEach(() => {
    registry = new EntityRegistry()
  })

  it('registers an entity type and retrieves it by id', () => {
    const type: EntityType = {
      id: 'enemy-classic',
      label: 'Classic Enemy',
      icon: '👾',
      properties: { pointValue: 10 },
    }
    registry.register(type)
    expect(registry.get('enemy-classic')).toEqual(type)
  })

  it('returns undefined for an unknown entity type id', () => {
    expect(registry.get('does-not-exist')).toBeUndefined()
  })

  it('returns all registered entity types', () => {
    const typeA: EntityType = { id: 'a', label: 'A', icon: 'A', properties: {} }
    const typeB: EntityType = { id: 'b', label: 'B', icon: 'B', properties: {} }
    registry.register(typeA)
    registry.register(typeB)
    const all = registry.getAll()
    expect(all).toHaveLength(2)
    expect(all).toContainEqual(typeA)
    expect(all).toContainEqual(typeB)
  })

  it('returns an empty array when no entity types are registered', () => {
    expect(registry.getAll()).toEqual([])
  })

  it('throws when registering a duplicate id', () => {
    const type: EntityType = { id: 'dup', label: 'Dup', icon: 'D', properties: {} }
    registry.register(type)
    expect(() => registry.register(type)).toThrow('Entity type "dup" is already registered')
  })
})
