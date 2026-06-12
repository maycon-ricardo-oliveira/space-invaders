import { EntityRegistry, JsonLevelSource } from '@si/level-engine'
import { registerEntities } from '../entities/registerEntities'
import { GameLoop } from '../game/GameLoop'
import levelsData from '../levels.json'

describe('levels.json artifact contract (the test that was missing for 7 sprints)', () => {
  async function loadedSource() {
    const registry = new EntityRegistry()
    registerEntities({ registerEntityType: t => registry.register(t) })
    const source = new JsonLevelSource(levelsData, registry)
    await source.load()
    return source
  }

  it('the committed artifact passes the engine contract', async () => {
    await expect(loadedSource()).resolves.toBeDefined()
  })

  it('GameLoop spawns the authored enemies with registry-resolved stats', async () => {
    const source = await loadedSource()
    const level = source.getLevel('story-1-1')
    const state = new GameLoop(level).getState()

    expect(state.enemies.length).toBe(level.entities.length)
    const fast = state.enemies.find(e => e.typeId === 'fast-enemy')
    expect(fast).toMatchObject({ hp: 40, burstCount: 3, xpValue: 2, speedMultiplier: 2.5 })
    const strong = state.enemies.find(e => e.typeId === 'strong-enemy')
    expect(strong).toMatchObject({ hp: 200, burstCount: 1, xpValue: 3 })
  })
})
