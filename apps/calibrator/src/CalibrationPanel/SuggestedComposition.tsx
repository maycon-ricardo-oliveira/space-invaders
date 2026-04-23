import type { LevelParams } from '@si/level-engine'

interface Props {
  params: LevelParams
  difficultyScore: number
}

function suggestComposition(
  n: number,
  score: number,
): { basic: number; fast: number; tank: number } {
  const t = score / 100
  const tankRaw = Math.round(n * t * 0.25)
  const fastRaw = Math.round(n * t * 0.35)
  const basic = Math.max(0, n - fastRaw - tankRaw)
  const fast = n - basic - tankRaw
  const tank = tankRaw
  return { basic, fast, tank }
}

export function SuggestedComposition({ params, difficultyScore }: Props) {
  const { basic, fast, tank } = suggestComposition(params.numberOfEnemies, difficultyScore)
  return (
    <div style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>
      <strong style={{ color: '#fff' }}>Suggested:</strong>{' '}
      {basic}× Basic · {fast}× Fast · {tank}× Tank
    </div>
  )
}
