jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  useCanvasRef: jest.fn(() => ({ current: null })),
  useFrameCallback: jest.fn(),
  Skia: {
    Color: jest.fn(c => c),
    Paint: jest.fn(() => ({ setColor: jest.fn() })),
    XYWHRect: jest.fn(() => ({})),
  },
}))

import React from 'react'
import { render } from '@testing-library/react-native'
import { GameScreen } from '../screens/GameScreen'

describe('GameScreen', () => {
  it('renders the left move control', () => {
    const { getByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={jest.fn()} />,
    )
    expect(getByText('◀')).toBeTruthy()
  })

  it('renders the right move control', () => {
    const { getByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={jest.fn()} />,
    )
    expect(getByText('▶')).toBeTruthy()
  })

  it('renders the fire control', () => {
    const { getByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={jest.fn()} />,
    )
    expect(getByText('🔥')).toBeTruthy()
  })

  it('renders without crashing', () => {
    const onBack = jest.fn()
    expect(() =>
      render(<GameScreen levelIndex={0} totalLevels={20} onBack={onBack} />),
    ).not.toThrow()
  })
})
