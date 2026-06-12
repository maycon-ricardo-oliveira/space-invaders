import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpawnZoneGrid } from '../components/WaveEditor/SpawnZoneGrid'
import { GRID_ROWS, GRID_COLS, PLAYER_SPAWN_ROW, PLAYER_SPAWN_COL } from '../lib/gridConstants'
import type { Grid } from '../lib/schemas'

// Standard-sized empty grid (any input is normalized to GRID_ROWS × GRID_COLS)
const emptyGrid: Grid = Array.from({ length: GRID_ROWS }, () => Array(GRID_COLS).fill(null))
const TOTAL_CELLS = GRID_ROWS * GRID_COLS

describe('SpawnZoneGrid', () => {
  it('always renders GRID_ROWS × GRID_COLS cells regardless of input size', () => {
    // Pass a smaller grid — normalizeGrid should pad to standard size
    const smallGrid: Grid = [Array(4).fill(null)]
    render(<SpawnZoneGrid grid={smallGrid} selectedEntity="grunt" onGridChange={jest.fn()} />)
    const cells = screen.getAllByTestId('grid-cell')
    expect(cells).toHaveLength(TOTAL_CELLS)
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
    const grid: Grid = Array.from({ length: GRID_ROWS }, (_, ri) =>
      Array.from({ length: GRID_COLS }, (_, ci) => (ri === 0 && ci === 0 ? 'grunt' : null))
    )
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={grid} selectedEntity="grunt" onGridChange={onGridChange} />)
    fireEvent.click(screen.getAllByTestId('grid-cell')[0])
    const newGrid: Grid = onGridChange.mock.calls[0][0]
    expect(newGrid[0][0]).toBeNull()
  })

  it('clicking the player spawn cell does nothing', () => {
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={emptyGrid} selectedEntity="grunt" onGridChange={onGridChange} />)
    // Player spawn is at PLAYER_SPAWN_ROW × GRID_COLS + PLAYER_SPAWN_COL
    const spawnIndex = PLAYER_SPAWN_ROW * GRID_COLS + PLAYER_SPAWN_COL
    fireEvent.click(screen.getAllByTestId('grid-cell')[spawnIndex])
    expect(onGridChange).not.toHaveBeenCalled()
  })
})
