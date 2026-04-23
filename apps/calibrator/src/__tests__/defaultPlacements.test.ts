import { defaultPlacements } from '../defaultPlacements'

describe('defaultPlacements', () => {
  it('returns [] when numberOfEnemies is 0', () => {
    expect(defaultPlacements(0)).toEqual([])
  })

  it('returns 3 placements for numberOfEnemies=3 with valid coords', () => {
    const result = defaultPlacements(3)
    expect(result).toHaveLength(3)
    result.forEach(p => {
      expect(p.entityTypeId).toBe('basic-enemy')
      expect(p.x % 30).toBe(0)
      expect(p.y % 40).toBe(0)
    })
  })

  it('returns 13 placements with valid coords for numberOfEnemies=13', () => {
    const result = defaultPlacements(13)
    expect(result).toHaveLength(13)
    result.forEach(p => {
      expect(p.entityTypeId).toBe('basic-enemy')
      expect(p.x % 30).toBe(0)
      expect(p.y % 40).toBe(0)
    })
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

  it('center-biased: majority of single placements land in center columns', () => {
    // Center half: cols 3-7 → x in [90, 210]
    let centerCount = 0
    for (let i = 0; i < 100; i++) {
      const [p] = defaultPlacements(1)
      if (p.x >= 90 && p.x <= 210) centerCount++
    }
    expect(centerCount).toBeGreaterThanOrEqual(70)
  })
})
