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
    render(<SpawnZoneGrid grid={smallGrid} selectedEntity="basic-enemy" onGridChange={jest.fn()} />)
    const cells = screen.getAllByTestId('grid-cell')
    expect(cells).toHaveLength(TOTAL_CELLS)
  })

  it('clicking an empty cell calls onGridChange with entity placed', () => {
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={emptyGrid} selectedEntity="basic-enemy" onGridChange={onGridChange} />)
    fireEvent.click(screen.getAllByTestId('grid-cell')[0])
    expect(onGridChange).toHaveBeenCalledTimes(1)
    const newGrid: Grid = onGridChange.mock.calls[0][0]
    expect(newGrid[0][0]).toBe('basic-enemy')
  })

  it('clicking an occupied cell clears it', () => {
    const grid: Grid = Array.from({ length: GRID_ROWS }, (_, ri) =>
      Array.from({ length: GRID_COLS }, (_, ci) => (ri === 0 && ci === 0 ? 'basic-enemy' : null))
    )
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={grid} selectedEntity="basic-enemy" onGridChange={onGridChange} />)
    fireEvent.click(screen.getAllByTestId('grid-cell')[0])
    const newGrid: Grid = onGridChange.mock.calls[0][0]
    expect(newGrid[0][0]).toBeNull()
  })

  it('clicking the player spawn cell does nothing', () => {
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={emptyGrid} selectedEntity="basic-enemy" onGridChange={onGridChange} />)
    // Player spawn is at PLAYER_SPAWN_ROW × GRID_COLS + PLAYER_SPAWN_COL
    const spawnIndex = PLAYER_SPAWN_ROW * GRID_COLS + PLAYER_SPAWN_COL
    fireEvent.click(screen.getAllByTestId('grid-cell')[spawnIndex])
    expect(onGridChange).not.toHaveBeenCalled()
  })

  // Regression (PLAYER-ROW): the WHOLE player spawn row is reserved, not just
  // the center cell. The player row maps to y = 21*40 + 20 = 860, which is OUTSIDE
  // the game canvas (CANVAS_HEIGHT 844) — so no entity may land anywhere on it.
  // Clicking ANY non-center cell of the player row must be a no-op too. Esse bug
  // (entidade caindo na última linha e estourando os bounds) não volta.
  it('clicking a non-center cell of the player row does nothing', () => {
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={emptyGrid} selectedEntity="basic-enemy" onGridChange={onGridChange} />)
    // Column 0 of the player row — NOT the locked center cell, but still reserved.
    expect(PLAYER_SPAWN_COL).not.toBe(0) // sanity: col 0 is a different cell than the center
    const cellIndex = PLAYER_SPAWN_ROW * GRID_COLS + 0
    fireEvent.click(screen.getAllByTestId('grid-cell')[cellIndex])
    expect(onGridChange).not.toHaveBeenCalled()
  })

  // Counterpart: a normal row (row 0) must still accept placement after the fix —
  // the row guard must not over-block. Locks the GREEN path so the fix can't just
  // freeze the whole grid.
  it('clicking a normal-row cell still places an entity (player-row guard is scoped)', () => {
    const onGridChange = jest.fn()
    render(<SpawnZoneGrid grid={emptyGrid} selectedEntity="fast-enemy" onGridChange={onGridChange} />)
    fireEvent.click(screen.getAllByTestId('grid-cell')[0]) // row 0, col 0
    expect(onGridChange).toHaveBeenCalledTimes(1)
    const newGrid: Grid = onGridChange.mock.calls[0][0]
    expect(newGrid[0][0]).toBe('fast-enemy')
  })
})
