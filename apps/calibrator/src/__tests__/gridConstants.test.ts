/**
 * @jest-environment node
 *
 * Fix 3 — the wave grid is 12 columns wide. GRID_COLS must be 12 (was 11).
 * MAX_WAVE_SCORE is derived from GRID_COLS, so it must follow the new width.
 */
import { GRID_COLS, GRID_ROWS, MAX_WAVE_SCORE } from '../lib/gridConstants'

describe('gridConstants', () => {
  it('locks GRID_COLS at 12', () => {
    expect(GRID_COLS).toBe(12)
  })

  it('derives MAX_WAVE_SCORE from the 12-column width', () => {
    expect(MAX_WAVE_SCORE).toBe(GRID_COLS * GRID_ROWS * 3.0)
  })
})
