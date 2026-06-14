import React from 'react'
import { render, screen } from '@testing-library/react'
import { LevelEditorClient } from '../components/LevelEditorClient'

// next/navigation — WaveChipBar (after fix) and any descendant may call useRouter.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
  usePathname: () => '/dashboard/1/1/1',
}))

jest.mock('../../app/actions/wave.actions', () => ({
  createWaveAction: jest.fn(),
  deleteWaveAction: jest.fn(),
  getWaves: jest.fn().mockResolvedValue([]),
  updateWaveAction: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../app/actions/level.actions', () => ({
  updateLevelParamsAction: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../app/actions/pattern.actions', () => ({
  savePatternAction: jest.fn().mockResolvedValue({ id: 1, name: 'p', grid: [] }),
}))

function makeLevel(id: number, name: string, waveId: number, waveEntity: string) {
  return {
    id, phaseId: 1, name, index: 0,
    enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
    enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1,
    hasPowerUps: true, parallaxTheme: null,
    waves: [
      { id: waveId, levelId: id, order: 1, delay: 3.0, grid: [[waveEntity, ...Array(11).fill(null)]] },
    ],
  }
}

describe('LevelEditorClient', () => {
  // ── regression: useState(level.waves[0]) froze the selected wave across level swaps ──
  it('re-syncs the displayed wave when the level prop changes', () => {
    const levelA = makeLevel(1, 'Level A', 10, 'basic-enemy')
    const levelB = makeLevel(2, 'Level B', 20, 'asteroid')

    // Count occupied spawn-grid cells holding a given entity icon — scoped to grid
    // cells because the toolbox always renders every icon.
    const cellsWith = (icon: string) =>
      screen.getAllByTestId('grid-cell').filter(c => c.textContent === icon).length

    const { rerender } = render(<LevelEditorClient level={levelA} patterns={[]} />)
    // EditorPane save bar shows "W{order} — {level.name}".
    expect(screen.getByText('W1 — Level A')).toBeInTheDocument()
    // Level A wave has a grunt in the grid, no asteroid.
    expect(cellsWith('👾')).toBe(1)
    expect(cellsWith('🪨')).toBe(0)

    rerender(<LevelEditorClient level={levelB} patterns={[]} />)

    // Bug: selectedWave stays on level A's wave, so Level B's data never renders.
    expect(screen.getByText('W1 — Level B')).toBeInTheDocument()
    expect(cellsWith('🪨')).toBe(1)
    expect(cellsWith('👾')).toBe(0)
  })
})
