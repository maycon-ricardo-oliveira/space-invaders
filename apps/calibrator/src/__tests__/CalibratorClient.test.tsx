import { render, fireEvent } from '@testing-library/react'
import { CalibratorClient } from '../CalibratorClient'
import type { LevelDefinition } from '@si/level-engine'
import { saveLevels } from '../../app/actions'

jest.mock('../../app/actions', () => ({
  saveLevels: jest.fn().mockResolvedValue(undefined),
}))

const defaultParams = {
  numberOfEnemies: 5,
  enemySpeed: 2,
  enemyShotDelay: 1.5,
  enemyShotSpeed: 4,
  enemyAngerDelay: 15,
  enemySpawnDelay: 1,
  hasPowerUps: true,
  powerUpMinWait: 8,
  powerUpMaxWait: 20,
}

const initialLevels: LevelDefinition[] = Array.from({ length: 20 }, (_, i) => ({
  id: `story-${i}`,
  style: 'classic' as const,
  difficultyScore: Math.round((i / 19) * 100),
  entities: [],
  params: defaultParams,
}))

describe('CalibratorClient', () => {
  it('renders the level selector dropdown', () => {
    const { getByRole } = render(<CalibratorClient initialLevels={initialLevels} />)
    expect(getByRole('combobox')).toBeInTheDocument()
  })

  it('renders calibration panel sliders for the current level', () => {
    const { getAllByRole } = render(<CalibratorClient initialLevels={initialLevels} />)
    expect(getAllByRole('slider').length).toBeGreaterThan(0)
  })

  it('renders entity type buttons in the toolbox', () => {
    const { getByText } = render(<CalibratorClient initialLevels={initialLevels} />)
    expect(getByText('Basic Enemy')).toBeInTheDocument()
  })

  it('renders the map grid with 192 cells', () => {
    const { getAllByRole } = render(<CalibratorClient initialLevels={initialLevels} />)
    const gridCells = getAllByRole('button').filter((b) =>
      b.getAttribute('aria-label')?.startsWith('cell '),
    )
    expect(gridCells).toHaveLength(192)
  })

  it('calls saveLevels when Save button is clicked', () => {
    const { getByRole } = render(<CalibratorClient initialLevels={initialLevels} />)
    fireEvent.click(getByRole('button', { name: 'Save' }))
    expect(jest.mocked(saveLevels)).toHaveBeenCalledWith(initialLevels)
  })
})
