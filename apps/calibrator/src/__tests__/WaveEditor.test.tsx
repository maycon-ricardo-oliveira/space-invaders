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
})
