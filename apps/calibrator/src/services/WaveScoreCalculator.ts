import type { Grid } from '../lib/schemas'
import { MAX_WAVE_SCORE } from '../lib/gridConstants'

const TYPE_WEIGHT: Record<string, number> = {
  grunt:  1.0,
  rock:   1.5,
  rocket: 2.0,
  shield: 3.0,
}

// delay → multiplier: 0s = 1.5, 3s = 1.0, 6s+ = 0.8
function delayMultiplier(delay: number): number {
  if (delay <= 0) return 1.5
  if (delay >= 6) return 0.8
  if (delay <= 3) return 1.5 - (delay / 3) * 0.5
  return 1.0 - ((delay - 3) / 3) * 0.2
}

export function computeWaveScore(grid: Grid, delay: number): number {
  let raw = 0
  for (const row of grid) {
    for (const cell of row) {
      if (cell !== null) raw += TYPE_WEIGHT[cell] ?? 1
    }
  }
  if (raw === 0) return 0
  const score = (raw / MAX_WAVE_SCORE) * 100 * delayMultiplier(delay)
  return Math.min(100, Math.round(score))
}
