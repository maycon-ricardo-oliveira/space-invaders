/**
 * @jest-environment node
 */
// Smoke test: verify exported route components exist
jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))
jest.mock('../../app/actions/world.actions', () => ({
  getWorlds: jest.fn().mockResolvedValue([]),
}))
jest.mock('../../app/actions/phase.actions', () => ({
  getPhases: jest.fn().mockResolvedValue([]),
}))
jest.mock('../../app/actions/level.actions', () => ({
  getLevels: jest.fn().mockResolvedValue([]),
}))

describe('Dashboard route modules', () => {
  it('dashboard layout exports a default function', async () => {
    // If this import fails, routing is broken
    const mod = await import('../../app/dashboard/layout')
    expect(typeof mod.default).toBe('function')
  })
})
