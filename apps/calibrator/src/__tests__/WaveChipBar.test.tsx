import React from 'react'
import { render, screen } from '@testing-library/react'
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
  it('renders an option for each wave', () => {
    render(<WaveChipBar initialWaves={waves} levelId={1} />)
    expect(screen.getByRole('option', { name: /W1/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /W2/ })).toBeInTheDocument()
  })

  it('shows a create button', () => {
    render(<WaveChipBar initialWaves={waves} levelId={1} />)
    expect(screen.getByTitle('Nova wave')).toBeInTheDocument()
  })

  it('shows a delete button', () => {
    render(<WaveChipBar initialWaves={waves} levelId={1} />)
    expect(screen.getByTitle('Deletar wave')).toBeInTheDocument()
  })
})
