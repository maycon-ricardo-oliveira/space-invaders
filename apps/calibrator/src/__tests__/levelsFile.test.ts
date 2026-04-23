/**
 * @jest-environment node
 */
import * as fs from 'fs'
import { readLevels, writeLevels } from '../levelsFile'
import type { LevelDefinition } from '@si/level-engine'

jest.mock('fs')
const mockFs = fs as jest.Mocked<typeof fs>

const sampleLevel: LevelDefinition = {
  id: 'story-0',
  style: 'classic',
  difficultyScore: 0,
  entities: [],
  params: {
    numberOfEnemies: 3,
    enemySpeed: 1,
    enemyShotDelay: 3.0,
    enemyShotSpeed: 2,
    enemyAngerDelay: 30,
    enemySpawnDelay: 2,
    hasPowerUps: true,
    powerUpMinWait: 5,
    powerUpMaxWait: 15,
  },
}

beforeEach(() => jest.clearAllMocks())

describe('readLevels', () => {
  it('returns empty array when file does not exist', () => {
    mockFs.existsSync.mockReturnValue(false)
    expect(readLevels()).toEqual([])
  })

  it('parses and returns levels when file exists', () => {
    mockFs.existsSync.mockReturnValue(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFs.readFileSync.mockReturnValue(JSON.stringify([sampleLevel]) as any)
    expect(readLevels()).toEqual([sampleLevel])
  })
})

describe('writeLevels', () => {
  it('writes pretty-printed JSON to a path containing levels.json', () => {
    writeLevels([sampleLevel])
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('levels.json'),
      JSON.stringify([sampleLevel], null, 2),
    )
  })
})
