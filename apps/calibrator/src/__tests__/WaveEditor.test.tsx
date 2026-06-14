import React from 'react'
import { render, screen } from '@testing-library/react'
import { WaveEditor } from '../components/WaveEditor/WaveEditor'
import type { Grid } from '../lib/schemas'

const wave = {
  id: 1, levelId: 1, order: 1, delay: 3.0,
  grid: [Array(12).fill(null)] as Grid,
  createdAt: new Date(), updatedAt: new Date(),
}

describe('WaveEditor', () => {
  it('renders the spawn zone grid', () => {
    render(
      <WaveEditor
        wave={wave}
        userPatterns={[]}
        onWaveChange={jest.fn()}
        onSavePattern={jest.fn()}
      />
    )
    const cells = screen.getAllByTestId('grid-cell')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('renders the entity toolbox buttons', () => {
    render(
      <WaveEditor
        wave={wave}
        userPatterns={[]}
        onWaveChange={jest.fn()}
        onSavePattern={jest.fn()}
      />
    )
    expect(screen.getByTitle('Grunt')).toBeInTheDocument()
    expect(screen.getByTitle('Shield')).toBeInTheDocument()
  })

  // ── regression: useState(ensureGrid(wave.grid)) froze the grid across wave swaps ──
  it('re-syncs the rendered grid when the wave prop changes', () => {
    // Count occupied spawn-grid cells holding a given entity icon. The toolbox always
    // renders all 4 icons, so we must scope the assertion to grid-cell content only.
    const cellsWith = (icon: string) =>
      screen.getAllByTestId('grid-cell').filter(c => c.textContent === icon).length

    // Wave X: a single basic-enemy at row 0, col 0.
    const waveX = {
      id: 1, levelId: 1, order: 1, delay: 3.0,
      grid: [['basic-enemy', ...Array(11).fill(null)]] as Grid,
      createdAt: new Date(), updatedAt: new Date(),
    }
    // Wave Y: a single asteroid at row 0, col 0 — different entity, different icon.
    const waveY = {
      id: 2, levelId: 1, order: 2, delay: 3.0,
      grid: [['asteroid', ...Array(11).fill(null)]] as Grid,
      createdAt: new Date(), updatedAt: new Date(),
    }

    const { rerender } = render(
      <WaveEditor wave={waveX} userPatterns={[]} onWaveChange={jest.fn()} onSavePattern={jest.fn()} />
    )
    // Grunt occupies exactly one grid cell, no asteroid in the grid.
    expect(cellsWith('👾')).toBe(1)
    expect(cellsWith('🪨')).toBe(0)

    rerender(
      <WaveEditor wave={waveY} userPatterns={[]} onWaveChange={jest.fn()} onSavePattern={jest.fn()} />
    )

    // Bug: grid stays frozen on waveX, so the grunt persists and the asteroid never shows.
    expect(cellsWith('🪨')).toBe(1)
    expect(cellsWith('👾')).toBe(0)
  })
})
