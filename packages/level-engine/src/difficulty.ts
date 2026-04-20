import type { LevelRequest } from './types'

/**
 * Converts a LevelRequest into a difficulty score in [0, 100].
 * This is the single source of truth for difficulty scaling.
 *
 * Story mode:  score = (levelIndex / (totalLevels - 1)) * 100
 * Survival:    score derived from kill/death ratio and average survival time
 */
export function computeDifficultyScore(request: LevelRequest): number {
  if (request.mode === 'story') {
    if (request.levelIndex == null || request.totalLevels == null) {
      throw new Error('levelIndex and totalLevels are required for story mode')
    }
    if (request.totalLevels <= 1) return 100
    return (request.levelIndex / (request.totalLevels - 1)) * 100
  }

  // survival
  if (!request.playerStats) return 50

  const { killsThisSession, deathsThisSession, averageSurvivalTime } = request.playerStats

  const kd =
    deathsThisSession === 0 ? killsThisSession : killsThisSession / deathsThisSession
  const kdScore = Math.min(kd * 5, 100)
  const timeScore = Math.min((averageSurvivalTime / 120) * 100, 100)

  return Math.min((kdScore + timeScore) / 2, 100)
}
