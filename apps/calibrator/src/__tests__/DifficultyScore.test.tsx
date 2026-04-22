import { render } from '@testing-library/react'
import { DifficultyScore } from '../CalibrationPanel/DifficultyScore'

describe('DifficultyScore', () => {
  it('displays score 0 for level 0 of 20', () => {
    const { getByText } = render(<DifficultyScore levelIndex={0} totalLevels={20} />)
    expect(getByText(/Score: 0/)).toBeInTheDocument()
  })

  it('displays score 100 for the last level (index 19 of 20)', () => {
    const { getByText } = render(<DifficultyScore levelIndex={19} totalLevels={20} />)
    expect(getByText(/Score: 100/)).toBeInTheDocument()
  })

  it('displays score 50 for the exact mid-point', () => {
    // levelIndex=9, totalLevels=19 → (9/18)*100 = 50
    const { getByText } = render(<DifficultyScore levelIndex={9} totalLevels={19} />)
    expect(getByText(/Score: 50/)).toBeInTheDocument()
  })
})
