import { render, fireEvent } from '@testing-library/react'
import { Sliders } from '../CalibrationPanel/Sliders'
import type { LevelParams } from '@si/level-engine'

const defaultParams: LevelParams = {
  numberOfEnemies: 10,
  enemySpeed: 2.5,
  enemyShotDelay: 1.5,
  enemyShotSpeed: 5,
  enemyAngerDelay: 17,
  enemySpawnDelay: 1.0,
  hasPowerUps: true,
  powerUpMinWait: 10,
  powerUpMaxWait: 22,
}

describe('Sliders', () => {
  it('renders 8 range sliders (all numeric LevelParams)', () => {
    const { getAllByRole } = render(<Sliders value={defaultParams} onChange={jest.fn()} />)
    expect(getAllByRole('slider')).toHaveLength(8)
  })

  it('calls onChange with updated numberOfEnemies', () => {
    const onChange = jest.fn()
    const { getByLabelText } = render(<Sliders value={defaultParams} onChange={onChange} />)
    fireEvent.change(getByLabelText('Number of Enemies'), { target: { value: '15' } })
    expect(onChange).toHaveBeenCalledWith({ ...defaultParams, numberOfEnemies: 15 })
  })

  it('calls onChange with updated hasPowerUps when checkbox toggled', () => {
    const onChange = jest.fn()
    const { getByLabelText } = render(<Sliders value={defaultParams} onChange={onChange} />)
    fireEvent.click(getByLabelText('Has Power-Ups'))
    expect(onChange).toHaveBeenCalledWith({ ...defaultParams, hasPowerUps: false })
  })

  it('calls onChange with correctly parsed float for enemyShotDelay', () => {
    const onChange = jest.fn()
    const { getByLabelText } = render(<Sliders value={defaultParams} onChange={onChange} />)
    fireEvent.change(getByLabelText('Enemy Shot Delay (s) ↓=harder'), { target: { value: '0.8' } })
    expect(onChange).toHaveBeenCalledWith({ ...defaultParams, enemyShotDelay: 0.8 })
  })
})
