import { defaultPlacements } from '../defaultPlacements'

describe('defaultPlacements', () => {
  it('returns [] when numberOfEnemies is 0', () => {
    expect(defaultPlacements(0)).toEqual([])
  })

  it('returns 3 placements in row 0 for numberOfEnemies=3', () => {
    const result = defaultPlacements(3)
    expect(result).toHaveLength(3)
    expect(result[0]).toEqual({ entityTypeId: 'basic-enemy', x: 0, y: 0 })
    expect(result[1]).toEqual({ entityTypeId: 'basic-enemy', x: 30, y: 0 })
    expect(result[2]).toEqual({ entityTypeId: 'basic-enemy', x: 60, y: 0 })
  })

  it('wraps to next row after 12 columns for numberOfEnemies=13', () => {
    const result = defaultPlacements(13)
    expect(result).toHaveLength(13)
    // First 12 fill row 0
    expect(result[11]).toEqual({ entityTypeId: 'basic-enemy', x: 330, y: 0 })
    // 13th wraps to row 1, col 0
    expect(result[12]).toEqual({ entityTypeId: 'basic-enemy', x: 0, y: 40 })
  })

  it('all placements have entityTypeId: basic-enemy', () => {
    const result = defaultPlacements(10)
    result.forEach(p => {
      expect(p.entityTypeId).toBe('basic-enemy')
    })
  })

  it('caps at 192 entities (ROWS * COLS) when numberOfEnemies exceeds the grid', () => {
    const result = defaultPlacements(300)
    expect(result).toHaveLength(192)
  })
})
