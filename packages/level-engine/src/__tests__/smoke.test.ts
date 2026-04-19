import { LEVEL_ENGINE_VERSION } from '../index'

describe('level-engine', () => {
  it('exports a version string', () => {
    expect(LEVEL_ENGINE_VERSION).toBe('0.1.0')
  })
})
