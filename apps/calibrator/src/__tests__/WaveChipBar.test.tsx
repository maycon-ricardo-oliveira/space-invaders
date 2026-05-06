import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { WaveChipBar } from '../components/WaveChipBar/WaveChipBar'

jest.mock('../../app/actions/wave.actions', () => ({
  createWaveAction: jest.fn(),
  deleteWaveAction: jest.fn(),
  getWaves: jest.fn(),
}))

const waves = [
  { id: 1, levelId: 1, order: 1, delay: 0, grid: [Array(12).fill(null)], createdAt: new Date(), updatedAt: new Date() },
  { id: 2, levelId: 1, order: 2, delay: 3.0, grid: [['grunt', null, null, null, null, null, null, null, null, null, null, null]], createdAt: new Date(), updatedAt: new Date() },
]

describe('WaveChipBar', () => {
  it('renders a chip for each wave', () => {
    render(<WaveChipBar initialWaves={waves} levelId={1} />)
    expect(screen.getByText('W1')).toBeInTheDocument()
    expect(screen.getByText('W2')).toBeInTheDocument()
  })

  it('calls onSelectWave when a chip is clicked', () => {
    const onSelect = jest.fn()
    render(<WaveChipBar initialWaves={waves} levelId={1} onSelectWave={onSelect} />)
    fireEvent.click(screen.getByText('W1'))
    expect(onSelect).toHaveBeenCalledWith(waves[0])
  })

  it('shows score below each chip', () => {
    render(<WaveChipBar initialWaves={waves} levelId={1} />)
    // Wave 1 empty grid → score 0; Wave 2 has 1 grunt
    const scores = screen.getAllByTestId('wave-score')
    expect(scores).toHaveLength(2)
  })
})
