jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Picture: 'Picture',
  Skia: {
    Color: jest.fn(c => c),
    Paint: jest.fn(() => ({ setColor: jest.fn() })),
    XYWHRect: jest.fn(() => ({})),
    PictureRecorder: jest.fn(() => ({
      beginRecording: jest.fn(() => ({ clear: jest.fn(), drawRect: jest.fn() })),
      finishRecordingAsPicture: jest.fn(() => ({})),
    })),
  },
}))

// Mutable status used by the GameLoop mock — override per test as needed.
let mockGameStatus = 'playing'

jest.mock('../game/GameLoop', () => ({
  GameLoop: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    render: jest.fn(),
    fire: jest.fn(),
    moveLeft: jest.fn(),
    moveRight: jest.fn(),
    getState: jest.fn().mockImplementation(() => ({
      status: mockGameStatus,
      player: { x: 0, y: 0, lives: 3 },
      enemies: [],
      playerBullets: [],
      enemyBullets: [],
      score: 0,
    })),
  })),
  CANVAS_WIDTH: 390,
  CANVAS_HEIGHT: 844,
  TOTAL_STORY_LEVELS: 20,
}))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { GameScreen } from '../screens/GameScreen'

// Prevent the requestAnimationFrame polyfill from firing asynchronously and
// triggering React state updates outside act(). The game loop starts but never
// advances unless we explicitly trigger it (see overlay tests below).
beforeEach(() => {
  jest.spyOn(global, 'requestAnimationFrame').mockReturnValue(0)
  jest.spyOn(global, 'cancelAnimationFrame').mockReturnValue(undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('GameScreen — controls (playing state)', () => {
  beforeEach(() => {
    mockGameStatus = 'playing'
  })

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

describe('GameScreen — game-over overlay', () => {
  beforeEach(() => {
    // Override the global no-op RAF mock with one that fires synchronously so
    // the useEffect game tick runs immediately and status transitions are applied.
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    mockGameStatus = 'playing'
  })

  it('shows "You Win!" overlay when game is won', () => {
    mockGameStatus = 'won'
    const { queryByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={jest.fn()} />,
    )
    expect(queryByText('You Win!')).toBeTruthy()
  })

  it('shows "Game Over" overlay when game is lost', () => {
    mockGameStatus = 'lost'
    const { queryByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={jest.fn()} />,
    )
    expect(queryByText('Game Over')).toBeTruthy()
  })

  it('calls onBack when "Back to Levels" is pressed', () => {
    mockGameStatus = 'won'
    const onBack = jest.fn()
    const { getByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={onBack} />,
    )
    fireEvent.press(getByText('Back to Levels'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
