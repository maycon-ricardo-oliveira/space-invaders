import { initLevelSource, getLevelSource, resetLevelSourceForTests } from '../levels/source'

describe('level source bootstrap', () => {
  beforeEach(() => resetLevelSourceForTests())

  it('getLevelSource before init throws a helpful error', () => {
    expect(() => getLevelSource()).toThrow(/initLevelSource/)
  })

  it('initLevelSource loads the committed levels.json artifact', async () => {
    const source = await initLevelSource()
    expect(getLevelSource()).toBe(source)
    const summaries = source.listLevels()
    expect(summaries.length).toBeGreaterThanOrEqual(1)
    expect(summaries[0].id).toBe('story-1-1')
    const level = source.getLevel('story-1-1')
    expect(level.entities.length).toBeGreaterThan(0)
    expect(level.entities.every(e => e.properties && typeof e.properties.hp === 'number')).toBe(true)
  })
})
