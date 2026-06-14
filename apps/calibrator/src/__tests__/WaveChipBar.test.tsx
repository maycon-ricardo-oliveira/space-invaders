import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WaveChipBar } from '../components/WaveChipBar/WaveChipBar'
import { createWaveAction, deleteWaveAction, getWaves } from '../../app/actions/wave.actions'

jest.mock('../../app/actions/wave.actions', () => ({
  createWaveAction: jest.fn(),
  deleteWaveAction: jest.fn(),
  getWaves: jest.fn(),
}))

const refresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: jest.fn() }),
  usePathname: () => '/dashboard/1/1/1',
}))

const mockCreate = createWaveAction as jest.Mock
const mockDelete = deleteWaveAction as jest.Mock
const mockGetWaves = getWaves as jest.Mock

const waves = [
  { id: 1, levelId: 1, order: 1, delay: 0, grid: [Array(12).fill(null)] },
  { id: 2, levelId: 1, order: 2, delay: 3.0, grid: [['basic-enemy', null, null, null, null, null, null, null, null, null, null, null]] },
]

beforeEach(() => {
  jest.clearAllMocks()
  mockGetWaves.mockResolvedValue(waves)
})

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

  // ── regression: server actions revalidatePath but client froze useState ──
  it('calls router.refresh after creating a wave so server data re-syncs', async () => {
    render(<WaveChipBar initialWaves={waves} levelId={1} />)
    fireEvent.click(screen.getByTitle('Nova wave'))

    await waitFor(() => expect(mockCreate).toHaveBeenCalledTimes(1))
    // The create must trigger an App Router refresh — otherwise the UI shows stale data.
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('calls router.refresh after deleting a wave so server data re-syncs', async () => {
    jest.spyOn(window, 'confirm').mockReturnValue(true)
    render(<WaveChipBar initialWaves={waves} levelId={1} />)
    // Each chip has its own delete (✕) button — click the first one.
    fireEvent.click(screen.getAllByTitle('Deletar wave')[0])

    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith(1))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('reflects new initialWaves props when the parent re-renders', () => {
    const { rerender } = render(<WaveChipBar initialWaves={waves} levelId={1} />)
    expect(screen.getAllByTestId('wave-score')).toHaveLength(2)

    const threeWaves = [
      ...waves,
      { id: 3, levelId: 1, order: 3, delay: 2.0, grid: [Array(12).fill(null)] },
    ]
    rerender(<WaveChipBar initialWaves={threeWaves} levelId={1} />)

    // Bug: useState(initialWaves) freezes the first 2 — the W3 chip never appears.
    expect(screen.getByText('W3')).toBeInTheDocument()
    expect(screen.getAllByTestId('wave-score')).toHaveLength(3)
  })
})
