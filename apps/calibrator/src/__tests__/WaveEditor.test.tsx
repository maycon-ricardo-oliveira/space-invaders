import React from 'react'
import { render, screen } from '@testing-library/react'
import { WaveEditor } from '../components/WaveEditor/WaveEditor'
import type { Grid } from '../lib/schemas'

jest.mock('../../app/actions/wave.actions', () => ({
  createWaveAction: jest.fn(),
  deleteWaveAction: jest.fn(),
  getWaves: jest.fn().mockResolvedValue([]),
}))

const wave = {
  id: 1, levelId: 1, order: 1, delay: 3.0,
  grid: [Array(12).fill(null)] as Grid,
  createdAt: new Date(), updatedAt: new Date(),
}

const baseProps = {
  wave,
  userPatterns: [],
  initialWaves: [wave],
  levelId: 1,
  onWaveChange: jest.fn(),
  onSavePattern: jest.fn(),
  onWavesChange: jest.fn(),
  onSelectWave: jest.fn(),
}

describe('WaveEditor', () => {
  it('renders the spawn zone grid', () => {
    render(<WaveEditor {...baseProps} />)
    const cells = screen.getAllByTestId('grid-cell')
    expect(cells.length).toBeGreaterThan(0)
  })

  it('renders the entity toolbox buttons', () => {
    render(<WaveEditor {...baseProps} />)
    expect(screen.getByTitle('Grunt')).toBeInTheDocument()
    expect(screen.getByTitle('Shield')).toBeInTheDocument()
  })

  it('renders the wave selector', () => {
    render(<WaveEditor {...baseProps} />)
    expect(screen.getByText(/W1/)).toBeInTheDocument()
  })

  it('renders empty state when wave is null', () => {
    render(<WaveEditor {...baseProps} wave={null} initialWaves={[]} />)
    expect(screen.getByText(/Sem waves/)).toBeInTheDocument()
  })
})
