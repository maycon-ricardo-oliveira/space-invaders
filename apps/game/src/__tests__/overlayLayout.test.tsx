const mockSkCanvas = { clear: jest.fn(), drawRect: jest.fn(), drawImageRect: jest.fn() }

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Picture: 'Picture',
  useImage: jest.fn(() => ({ width: () => 96, height: () => 120 })),
  Skia: {
    Color: jest.fn(c => c),
    Paint: jest.fn(() => ({ setColor: jest.fn() })),
    XYWHRect: jest.fn((x: number, y: number, w: number, h: number) => ({ x, y, w, h })),
    PictureRecorder: jest.fn(() => ({
      beginRecording: jest.fn(() => mockSkCanvas),
      finishRecordingAsPicture: jest.fn(() => ({})),
    })),
  },
}))

let mockGameStatus = 'lost'

jest.mock('../game/GameLoop', () => ({
  GameLoop: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    fire: jest.fn(),
    setFiring: jest.fn(),
    move: jest.fn(),
    moveLeft: jest.fn(),
    moveRight: jest.fn(),
    selectCard: jest.fn(),
    resumeFromCardSelection: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
    advanceWave: jest.fn(),
    getNextWaveDelayMs: jest.fn(() => 0),
    getState: jest.fn().mockImplementation(() => ({
      status: mockGameStatus,
      player: { x: 0, y: 0, hp: 0, maxHp: 500, fuel: 100, invincibilityTimer: 0, xp: 0, xpToNext: 10, playerLevel: 1, bulletDamage: 20 },
      ship: { moveSpeed: 300, bulletSpeed: 500, invincibilityMs: 1500, autoFireIntervalMs: 400 },
      activeCards: [],
      cardOffer: [],
      enemies: [],
      playerBullets: [],
      enemyBullets: [],
      fuelPickups: [],
      damagePickups: [],
      score: 0,
      currentWave: 1,
      totalWaves: 2,
    })),
  })),
  CANVAS_WIDTH: 390,
  CANVAS_HEIGHT: 844,
  ENTITY_SIZE: 32,
  TOTAL_STORY_LEVELS: 20,
}))

import React from 'react'
import { render, act, fireEvent } from '@testing-library/react-native'
import { GameScreen } from '../screens/GameScreen'
import { GameLoop } from '../game/GameLoop'

/**
 * Regression — RN 0.86 removed `StyleSheet.absoluteFillObject`.
 *
 * Every overlay in the game was built as `{ ...StyleSheet.absoluteFillObject }`.
 * Spreading `undefined` is silent in JS: no crash, the object simply comes out
 * without `position: 'absolute'` and the four offsets. The overlay still mounts
 * — it just has no size and no placement, so it is invisible.
 *
 * On the phone this read as "the game froze": the frame loop stops once the run
 * ends, leaving the last frame painted, and the Game Over panel that should sit
 * on top of it could not be seen or tapped. There was no way out of the level.
 *
 * These tests assert the geometry, which is the part that silently vanished.
 */

function flatten(style: unknown): Record<string, unknown> {
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean) as object[])
}

async function renderAt(status: string) {
  mockGameStatus = status
  const api = render(
    <GameScreen selection={{ kind: 'procedural', levelIndex: 0 }} totalLevels={20} onBack={jest.fn()} />,
  )
  const result = await api
  await act(async () => { jest.advanceTimersByTime(32) })
  return result
}

describe('overlays cover the screen', () => {
  beforeEach(() => { jest.useFakeTimers() })
  afterEach(() => { jest.useRealTimers() })

  it('places the game over panel over the whole screen', async () => {
    const { getByTestId } = await renderAt('lost')
    const style = flatten(getByTestId('game-over-overlay').props.style)
    expect(style.position).toBe('absolute')
    expect(style.top).toBe(0)
    expect(style.bottom).toBe(0)
  })

  it('places the victory panel over the whole screen', async () => {
    const { getByTestId } = await renderAt('won')
    expect(flatten(getByTestId('game-over-overlay').props.style).position).toBe('absolute')
  })

  it('places the card screen over the whole screen', async () => {
    const { getByTestId } = await renderAt('card_selection')
    const style = flatten(getByTestId('card-overlay').props.style)
    expect(style.position).toBe('absolute')
    expect(style.right).toBe(0)
  })

  it('keeps the game over panel reachable — it has a way back', async () => {
    const { getByText } = await renderAt('lost')
    expect(getByText('Back to Levels')).toBeTruthy()
  })
})

describe('a finished run can be played again without leaving the level', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    ;(GameLoop as unknown as jest.Mock).mockClear()
  })
  afterEach(() => { jest.useRealTimers() })

  it('offers a replay button on defeat', async () => {
    const { getByText } = await renderAt('lost')
    expect(getByText('Jogar de novo')).toBeTruthy()
  })

  it('offers a replay button on victory too', async () => {
    const { getByText } = await renderAt('won')
    expect(getByText('Jogar de novo')).toBeTruthy()
  })

  it('builds a fresh run when replay is pressed', async () => {
    const { getByText } = await renderAt('lost')
    const buildsBefore = (GameLoop as unknown as jest.Mock).mock.calls.length
    await act(async () => { await fireEvent.press(getByText('Jogar de novo')) })
    // A new GameLoop means a new run: cards, hp and score all start over.
    expect((GameLoop as unknown as jest.Mock).mock.calls.length).toBe(buildsBefore + 1)
  })

  it('still lets the player leave for the level list', async () => {
    const onBack = jest.fn()
    mockGameStatus = 'lost'
    const { getByText } = await render(
      <GameScreen selection={{ kind: 'procedural', levelIndex: 0 }} totalLevels={20} onBack={onBack} />,
    )
    await act(async () => { jest.advanceTimersByTime(32) })
    await act(async () => { await fireEvent.press(getByText('Back to Levels')) })
    expect(onBack).toHaveBeenCalled()
  })
})
