// Grid dimensions for the wave spawn editor, derived from standard phone width.
// Portrait phone: 390px wide × ~770px tall → 11 cols × 22 rows × 35px cells.
export const PHONE_WIDTH = 390
export const PHONE_HEIGHT = 770
export const GRID_COLS = 11
export const GRID_ROWS = 22                                // full portrait height
export const CELL_SIZE = Math.floor(PHONE_WIDTH / GRID_COLS) // 35px

// Player spawn position — center of the bottom row. Always disabled in the editor.
export const PLAYER_SPAWN_ROW = GRID_ROWS - 1             // row 21
export const PLAYER_SPAWN_COL = Math.floor(GRID_COLS / 2) // col 5

// Maximum possible wave score: all cells filled with the heaviest entity (shield = 3.0)
export const MAX_WAVE_SCORE = GRID_COLS * GRID_ROWS * 3.0 // 11*22*3 = 726

// Vertical cell spacing used by ExportService to compute entity Y positions
export const CELL_HEIGHT_EXPORT = 40
