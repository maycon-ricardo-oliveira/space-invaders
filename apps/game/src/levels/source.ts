import { EntityRegistry, JsonLevelSource } from '@si/level-engine'
import type { LevelSource } from '@si/level-engine'
import { registerEntities } from '../entities/registerEntities'
import levelsData from '../levels.json'

let source: LevelSource | null = null

export async function initLevelSource(): Promise<LevelSource> {
  const registry = new EntityRegistry()
  registerEntities({ registerEntityType: type => registry.register(type) })
  const json = new JsonLevelSource(levelsData, registry)
  await json.load()
  source = json
  return json
}

export function getLevelSource(): LevelSource {
  if (!source) throw new Error('Level source not ready — call initLevelSource() at startup')
  return source
}

export function resetLevelSourceForTests(): void {
  source = null
}
