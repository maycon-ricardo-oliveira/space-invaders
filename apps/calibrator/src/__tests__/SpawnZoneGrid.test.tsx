import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpawnZoneGrid } from '../components/WaveEditor/SpawnZoneGrid'
import type { Grid } from '../lib/schemas'

const emptyGrid: Grid = [Array(12).fill(null), Array(12).fill(null)]

describe('SpawnZoneGrid', () => {
  it('renders 12 cells per row', () => {
    render(<SpawnZoneGrid grid={emptyGrid} selectedEntity="grunt" onGridChange={jest.fn()} />)
    const cells = screen.getAllByTestId('grid-cell')
    expect(cells).toHaveLength(24) // 2 rows × 12 cols
  })

  it('clicking an empty cell calls onGridChange with entity placed', () => {
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={emptyGrid} selectedEntity="grunt" onGridChange={onGridChange} />)
    fireEvent.click(screen.getAllByTestId('grid-cell')[0])
    expect(onGridChange).toHaveBeenCalledTimes(1)
    const newGrid: Grid = onGridChange.mock.calls[0][0]
    expect(newGrid[0][0]).toBe('grunt')
  })

  it('clicking an occupied cell clears it', () => {
    const grid: Grid = [['grunt', null, null, null, null, null, null, null, null, null, null, null], Array(12).fill(null)]
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={grid} selectedEntity="grunt" onGridChange={onGridChange} />)
    fireEvent.click(screen.getAllByTestId('grid-cell')[0])
    const newGrid: Grid = onGridChange.mock.calls[0][0]
    expect(newGrid[0][0]).toBeNull()
  })
})
