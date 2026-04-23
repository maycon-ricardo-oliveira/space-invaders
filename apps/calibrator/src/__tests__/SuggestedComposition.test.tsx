import { render } from '@testing-library/react'
import { SuggestedComposition } from '../CalibrationPanel/SuggestedComposition'
import type { LevelParams } from '@si/level-engine'

function makeParams(numberOfEnemies: number): LevelParams {
  return {
    numberOfEnemies,
    enemySpeed: 1,
    enemyShotDelay: 2,
    enemyShotSpeed: 1,
    enemyAngerDelay: 5,
    enemySpawnDelay: 1,
    hasPowerUps: false,
    powerUpMinWait: 5,
    powerUpMaxWait: 10,
  }
}

describe('SuggestedComposition', () => {
  it('score=0, n=6 → all basic, no fast or tank', () => {
    const { getByText } = render(
      <SuggestedComposition params={makeParams(6)} difficultyScore={0} />,
    )
    expect(getByText(/6× Basic · 0× Fast · 0× Tank/)).toBeInTheDocument()
  })

  it('score=100, n=10 → 3 basic, 4 fast, 3 tank', () => {
    const { getByText } = render(
      <SuggestedComposition params={makeParams(10)} difficultyScore={100} />,
    )
    expect(getByText(/3× Basic · 4× Fast · 3× Tank/)).toBeInTheDocument()
  })

  it('score=50, n=10 → 7 basic, 2 fast, 1 tank', () => {
    const { getByText } = render(
      <SuggestedComposition params={makeParams(10)} difficultyScore={50} />,
    )
    expect(getByText(/7× Basic · 2× Fast · 1× Tank/)).toBeInTheDocument()
  })

  it('basic + fast + tank always equals numberOfEnemies (score=75, n=9)', () => {
    const { getByText } = render(
      <SuggestedComposition params={makeParams(9)} difficultyScore={75} />,
    )
    // tankRaw = round(9*0.75*0.25) = round(1.6875) = 2
    // fastRaw = round(9*0.75*0.35) = round(2.3625) = 2
    // basic = 9 - 2 - 2 = 5, fast = 9 - 5 - 2 = 2, tank = 2  → total 9
    expect(getByText(/5× Basic · 2× Fast · 2× Tank/)).toBeInTheDocument()
  })
})
