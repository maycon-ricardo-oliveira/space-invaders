import type { EntityType } from '../types'

export class EntityRegistry {
  private readonly types = new Map<string, EntityType>()

  register(type: EntityType): void {
    if (this.types.has(type.id)) {
      throw new Error(`Entity type "${type.id}" is already registered`)
    }
    this.types.set(type.id, type)
  }

  get(id: string): EntityType | undefined {
    return this.types.get(id)
  }

  getAll(): EntityType[] {
    return Array.from(this.types.values())
  }
}
