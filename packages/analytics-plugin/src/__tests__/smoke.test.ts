import { ANALYTICS_PLUGIN_VERSION } from '../index'

describe('analytics-plugin', () => {
  it('exports a version string', () => {
    expect(ANALYTICS_PLUGIN_VERSION).toBe('0.1.0')
  })
})
