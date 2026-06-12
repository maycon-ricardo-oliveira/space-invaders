import { JsonLevelSource, LevelContractError } from '../sources/JsonLevelSource'
import { EntityRegistry } from '../registry/EntityRegistry'

function makeRegistry(): EntityRegistry {
  const r = new EntityRegistry()
  r.register({ id: 'basic-enemy', label: 'Basic', icon: '👾', properties: { hp: 100, xpValue: 1, burstCount: 1 } })
  r.register({ id: 'fast-enemy', label: 'Fast', icon: '🚀', properties: { hp: 40, xpValue: 2, burstCount: 3 } })
  return r
}

const level = (over: object = {}) => ({
  id: 'story-1-1', style: 'classic' as const, difficultyScore: 10, phaseIndex: 1, levelIndex: 1,
  entities: [{ entityTypeId: 'fast-enemy', x: 50, y: 60 }],
  params: {
    numberOfEnemies: 1, enemySpeed: 2, enemyShotDelay: 1.5, enemyShotSpeed: 4,
    enemyAngerDelay: 15, enemySpawnDelay: 1, hasPowerUps: true, powerUpMinWait: 5, powerUpMaxWait: 15,
  },
  ...over,
})

describe('JsonLevelSource', () => {
  it('refuses construction with an empty registry', () => {
    expect(() => new JsonLevelSource([], new EntityRegistry())).toThrow(/registerEntities/)
  })

  it('load() throws LevelContractError with the aggregated report on invalid data', async () => {
    const source = new JsonLevelSource([level({ entities: [{ entityTypeId: 'grunt', x: 1, y: 1 }] })], makeRegistry())
    await expect(source.load()).rejects.toThrow(LevelContractError)
    await expect(source.load()).rejects.toThrow(/unknown entityTypeId 'grunt'/)
  })

  it('resolves entity properties from the registry', async () => {
    const source = new JsonLevelSource([level()], makeRegistry())
    await source.load()
    const loaded = source.getLevel('story-1-1')
    expect(loaded.entities[0].properties).toMatchObject({ hp: 40, xpValue: 2, burstCount: 3 })
  })

  it('JSON partial properties override registry defaults per key', async () => {
    const source = new JsonLevelSource(
      [level({ entities: [{ entityTypeId: 'fast-enemy', x: 50, y: 60, properties: { hp: 90 } }] })],
      makeRegistry(),
    )
    await source.load()
    const e = source.getLevel('story-1-1').entities[0]
    expect(e.properties).toMatchObject({ hp: 90, xpValue: 2, burstCount: 3 })
  })

  it('listLevels returns summaries in file order', async () => {
    const source = new JsonLevelSource(
      [level(), level({ id: 'story-1-2', levelIndex: 2 })],
      makeRegistry(),
    )
    await source.load()
    expect(source.listLevels().map(s => s.id)).toEqual(['story-1-1', 'story-1-2'])
    expect(source.listLevels()[1]).toMatchObject({ phaseIndex: 1, levelIndex: 2, difficultyScore: 10 })
  })

  it('getLevel throws for unknown id', async () => {
    const source = new JsonLevelSource([level()], makeRegistry())
    await source.load()
    expect(() => source.getLevel('story-9-9')).toThrow(/not found/i)
  })

  it('listLevels before load() throws', () => {
    const source = new JsonLevelSource([level()], makeRegistry())
    expect(() => source.listLevels()).toThrow(/call load\(\) first/)
  })

  it('getLevel before load() throws', () => {
    const source = new JsonLevelSource([level()], makeRegistry())
    expect(() => source.getLevel('story-1-1')).toThrow(/call load\(\) first/)
  })
})
