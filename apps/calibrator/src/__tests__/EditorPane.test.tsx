import React from 'react'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
import { EditorPane } from '../components/WaveEditor/EditorPane'
import { PLAYER_SPAWN_ROW, PLAYER_SPAWN_COL, GRID_COLS } from '../lib/gridConstants'

// next/navigation — descendants may call useRouter.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
  usePathname: () => '/dashboard/1/1/1',
}))

jest.mock('../../app/actions/wave.actions', () => ({
  createWaveAction: jest.fn(),
  deleteWaveAction: jest.fn(),
  getWaves: jest.fn().mockResolvedValue([]),
  updateWaveAction: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../app/actions/level.actions', () => ({
  updateLevelParamsAction: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../app/actions/pattern.actions', () => ({
  savePatternAction: jest.fn().mockResolvedValue({ id: 1, name: 'p', grid: [] }),
}))

const baseLevel = {
  id: 1, phaseId: 1, name: 'Level 1', index: 0,
  enemySpeed: 2, shotDelay: 1.5, fuelDrain: 8,
  enemyShotSpeed: 4, enemyAngerDelay: 15, enemySpawnDelay: 1,
  hasPowerUps: true, parallaxTheme: null, waves: [],
}

function makeWave(id: number, entity: string) {
  return {
    id, levelId: 1, order: 1, delay: 3.0,
    grid: [[entity, ...Array(11).fill(null)]],
  }
}

describe('EditorPane', () => {
  // ── regression: useState(initialWave) froze the grid when initialWave changed
  //    without a remount. This intermediate pane never re-synced. This bug does not
  //    come back. ──
  it('re-syncs the rendered grid when the initialWave prop changes', () => {
    // Count occupied spawn-grid cells holding a given entity icon — scoped to grid
    // cells because the toolbox always renders every icon.
    const cellsWith = (icon: string) =>
      screen.getAllByTestId('grid-cell').filter(c => c.textContent === icon).length

    // Wave X: a single basic-enemy (👾) at row 0, col 0.
    const waveX = makeWave(1, 'basic-enemy')
    // Wave Y: a single asteroid (🪨) at row 0, col 0 — different entity, different icon.
    const waveY = makeWave(2, 'asteroid')

    const { rerender } = render(
      <EditorPane level={baseLevel} initialWave={waveX} patterns={[]} />
    )
    // Grunt occupies exactly one grid cell, no asteroid in the grid.
    expect(cellsWith('👾')).toBe(1)
    expect(cellsWith('🪨')).toBe(0)

    rerender(
      <EditorPane level={baseLevel} initialWave={waveY} patterns={[]} />
    )

    // Bug: selectedWave stays frozen on waveX, so the grunt persists and the
    // asteroid never shows.
    expect(cellsWith('🪨')).toBe(1)
    expect(cellsWith('👾')).toBe(0)
  })

  // ── Bug 2: the score/enemyCount panel must reflect the grid being EDITED,
  //    not the frozen server prop. The WaveStatsPanel reads wave.grid (server),
  //    while edits live only in WaveEditor's local state — so the count never
  //    moves while you build the wave. ──
  it('updates the enemy count in WaveStatsPanel when a cell is edited in the grid', () => {
    const wave = makeWave(1, 'basic-enemy') // one enemy at row 0, col 0
    render(<EditorPane level={baseLevel} initialWave={wave} patterns={[]} />)

    // Panel starts at "1 inimigo".
    expect(screen.getByText(/^1 inimigo$/)).toBeInTheDocument()

    // Click an empty, non-player-spawn cell to add a second enemy. Cell index 1
    // is row 0 col 1 — empty and far from the player spawn (bottom-center).
    const cells = screen.getAllByTestId('grid-cell')
    const spawnIndex = PLAYER_SPAWN_ROW * GRID_COLS + PLAYER_SPAWN_COL
    const target = cells.findIndex((c, i) => i !== spawnIndex && c.textContent === '')
    fireEvent.click(cells[target])

    // The panel must now show "2 inimigos", reading the edited grid — not the
    // frozen prop which would still say "1 inimigo".
    expect(screen.getByText(/^2 inimigos$/)).toBeInTheDocument()
  })
})

describe('EditorPane — save feedback toast (Bug 3)', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })
  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  // ── Bug 3: save feedback must be a floating toast (own element, position:fixed),
  //    NOT the save button swapping its label to "✓ Salvo" (which wraps the line).
  //    Contract for the implementer: data-testid="save-toast" rendered on success. ──
  it('shows a floating "Salvo" toast after an edit auto-saves', async () => {
    const wave = makeWave(1, 'basic-enemy')
    render(<EditorPane level={baseLevel} initialWave={wave} patterns={[]} />)

    // Edit the grid to trigger the debounced auto-save.
    const cells = screen.getAllByTestId('grid-cell')
    const spawnIndex = PLAYER_SPAWN_ROW * GRID_COLS + PLAYER_SPAWN_COL
    const target = cells.findIndex((c, i) => i !== spawnIndex && c.textContent === '')
    fireEvent.click(cells[target])

    // Advance past the 500ms debounce so updateWaveAction runs and resolves.
    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    // A dedicated toast element (not the save button) must announce success.
    const toast = await waitFor(() => screen.getByTestId('save-toast'))
    expect(toast).toHaveTextContent(/salvo/i)
  })

  it('renders the toast as an element distinct from the save button', async () => {
    const wave = makeWave(1, 'basic-enemy')
    render(<EditorPane level={baseLevel} initialWave={wave} patterns={[]} />)

    const cells = screen.getAllByTestId('grid-cell')
    const spawnIndex = PLAYER_SPAWN_ROW * GRID_COLS + PLAYER_SPAWN_COL
    const target = cells.findIndex((c, i) => i !== spawnIndex && c.textContent === '')
    fireEvent.click(cells[target])

    await act(async () => {
      jest.advanceTimersByTime(500)
    })

    const toast = await waitFor(() => screen.getByTestId('save-toast'))
    // The save button must NOT be the thing carrying the "saved" status — it is
    // a separate floating element.
    expect(toast.tagName).not.toBe('BUTTON')
  })
})
