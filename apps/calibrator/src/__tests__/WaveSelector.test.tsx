import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WaveSelector } from '../components/WaveEditor/WaveSelector'

const { createWaveAction, deleteWaveAction, getWaves } = jest.requireMock('../../app/actions/wave.actions')

jest.mock('../../app/actions/wave.actions', () => ({
  createWaveAction: jest.fn(),
  deleteWaveAction: jest.fn(),
  getWaves: jest.fn(),
}))

const waves = [
  { id: 1, levelId: 1, order: 1, delay: 3.0, grid: [] },
  { id: 2, levelId: 1, order: 2, delay: 2.0, grid: [] },
]

const baseProps = {
  initialWaves: waves,
  levelId: 1,
  activeWaveId: 1,
  onSelectWave: jest.fn(),
  onWavesChange: jest.fn(),
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('WaveSelector', () => {
  it('renders an option for each wave', () => {
    render(<WaveSelector {...baseProps} />)
    expect(screen.getByRole('option', { name: /W1/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /W2/ })).toBeInTheDocument()
  })

  it('calls onSelectWave when select changes', () => {
    const onSelectWave = jest.fn()
    render(<WaveSelector {...baseProps} onSelectWave={onSelectWave} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } })
    expect(onSelectWave).toHaveBeenCalledWith(waves[1])
  })

  it('creates a wave when + is clicked', async () => {
    const newWave = { id: 3, levelId: 1, order: 3, delay: 3.0, grid: [] }
    createWaveAction.mockResolvedValue(newWave)
    getWaves.mockResolvedValue([...waves, newWave])
    const onWavesChange = jest.fn()
    const onSelectWave = jest.fn()
    render(<WaveSelector {...baseProps} onWavesChange={onWavesChange} onSelectWave={onSelectWave} />)
    fireEvent.click(screen.getByTitle('Nova wave'))
    await waitFor(() => expect(onWavesChange).toHaveBeenCalled())
    expect(onSelectWave).toHaveBeenCalledWith(newWave)
  })

  it('disables the select when there are no waves', () => {
    render(<WaveSelector {...baseProps} initialWaves={[]} activeWaveId={undefined} />)
    expect(screen.getByRole('combobox')).toBeDisabled()
  })
})
