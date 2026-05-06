import React from 'react'
import { render, screen } from '@testing-library/react'
import { WaveStatsPanel } from '../components/WaveStatsPanel/WaveStatsPanel'

const wave = {
  id: 1, levelId: 1, order: 1, delay: 3.0,
  grid: [['grunt', null, null, null, null, null, null, null, null, null, null, null]],
  createdAt: new Date(), updatedAt: new Date(),
}
const level = {
  id: 1, phaseId: 1, name: 'Level 1', index: 0,
  enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
  enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0,
  hasPowerUps: true, parallaxTheme: null, createdAt: new Date(), updatedAt: new Date(),
}

describe('WaveStatsPanel', () => {
  it('shows enemy count for the current wave', () => {
    render(<WaveStatsPanel wave={wave} level={level} onLevelParamChange={jest.fn()} />)
    expect(screen.getByText(/1 inimigo/i)).toBeInTheDocument()
  })

  it('shows the wave delay', () => {
    render(<WaveStatsPanel wave={wave} level={level} onLevelParamChange={jest.fn()} />)
    expect(screen.getByText(/3\.0s/)).toBeInTheDocument()
  })

  it('renders enemySpeed slider', () => {
    render(<WaveStatsPanel wave={wave} level={level} onLevelParamChange={jest.fn()} />)
    expect(screen.getByLabelText(/Enemy Speed/i)).toBeInTheDocument()
  })
})
