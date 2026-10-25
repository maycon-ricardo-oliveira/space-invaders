const mockSkImage = { width: () => 96, height: () => 120 }
const mockSkCanvas = { clear: jest.fn(), drawRect: jest.fn(), drawImageRect: jest.fn() }

jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Picture: 'Picture',
  useImage: jest.fn(() => mockSkImage),
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

const mockSelectCard = jest.fn()
const mockResume = jest.fn()
let mockCardOffer: unknown[] = []

jest.mock('../game/GameLoop', () => ({
  GameLoop: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    fire: jest.fn(),
    setFiring: jest.fn(),
    moveLeft: jest.fn(),
    moveRight: jest.fn(),
    selectCard: mockSelectCard,
    resumeFromCardSelection: mockResume,
    on: jest.fn(),
    off: jest.fn(),
    advanceWave: jest.fn(),
    getNextWaveDelayMs: jest.fn(() => 0),
    getState: jest.fn().mockImplementation(() => ({
      status: 'card_selection',
      player: { x: 0, y: 0, hp: 500, maxHp: 500, fuel: 100, invincibilityTimer: 0, xp: 0, xpToNext: 10, playerLevel: 3, bulletDamage: 20 },
      ship: { moveSpeed: 300, bulletSpeed: 500, invincibilityMs: 1500, autoFireIntervalMs: 400 },
      activeCards: [],
      cardOffer: mockCardOffer,
      enemies: [],
      playerBullets: [],
      enemyBullets: [],
      fuelPickups: [],
      damagePickups: [],
      score: 0,
      currentWave: 1,
      totalWaves: 1,
    })),
  })),
  CANVAS_WIDTH: 390,
  CANVAS_HEIGHT: 844,
  ENTITY_SIZE: 32,
  TOTAL_STORY_LEVELS: 20,
}))

import React from 'react'
import { render, fireEvent, act } from '@testing-library/react-native'
import { GameScreen } from '../screens/GameScreen'
import { RARITY_COLOR } from '../cards/catalogue'

/**
 * CARD-1 (Sprint 8, entrega E3) — the card screen on the phone.
 *
 * Replaces the "Cards coming in Sprint 7" placeholder that had been sitting in
 * `GameScreen` since the sprint it was named after. Rarity reaches the player
 * through two signals, never colour alone: the name's colour and the card's
 * border width.
 */

const OFFER = [
  { id: 'damage-common', axis: 'damage', rarity: 'common', value: 0.2, name: 'Munição Pesada', description: '+20% de dano' },
  { id: 'fireRate-rare', axis: 'fireRate', rarity: 'rare', value: 0.38, name: 'Canhão Rotativo', description: '+38% de cadência' },
]

async function renderScreen() {
  const api = await render(
    <GameScreen selection={{ kind: 'procedural', levelIndex: 0 }} totalLevels={20} onBack={jest.fn()} />,
  )
  // The screen's frame loop runs on requestAnimationFrame; one frame has to land
  // before the loop publishes 'card_selection' and the drawn offer.
  await act(async () => { jest.advanceTimersByTime(32) })
  return api
}

describe('CARD-1 — the card screen', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    mockSelectCard.mockClear()
    mockResume.mockClear()
    mockCardOffer = OFFER
  })

  afterEach(() => { jest.useRealTimers() })

  it('shows one card per offered option, by name', async () => {
    const { getByText } = await renderScreen()
    expect(getByText('Munição Pesada')).toBeTruthy()
    expect(getByText('Canhão Rotativo')).toBeTruthy()
  })

  it('shows what each card actually does', async () => {
    const { getByText } = await renderScreen()
    expect(getByText('+20% de dano')).toBeTruthy()
    expect(getByText('+38% de cadência')).toBeTruthy()
  })

  it('no longer shows the Sprint 7 placeholder', async () => {
    const { queryByText } = await renderScreen()
    expect(queryByText('Cards coming in Sprint 7')).toBeNull()
  })

  it('colours each card name by its rarity', async () => {
    const { getByText } = await renderScreen()
    expect(getByText('Munição Pesada').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: RARITY_COLOR.common })]),
    )
    expect(getByText('Canhão Rotativo').props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: RARITY_COLOR.rare })]),
    )
  })

  it('gives a rarer card a thicker border, so colour is never the only signal', async () => {
    const { getByTestId } = await renderScreen()
    const common = getByTestId('card-damage-common').props.style
    const rare = getByTestId('card-fireRate-rare').props.style
    const widthOf = (style: unknown) =>
      ([] as Record<string, unknown>[])
        .concat(style as Record<string, unknown>[])
        .flat()
        .find(s => s && 'borderWidth' in s)?.borderWidth as number
    expect(widthOf(rare)).toBeGreaterThan(widthOf(common))
  })

  it('hands the chosen card to the loop', async () => {
    const { getByTestId } = await renderScreen()
    await act(async () => { await fireEvent.press(getByTestId('card-fireRate-rare')) })
    expect(mockSelectCard).toHaveBeenCalledWith('fireRate-rare')
  })

  it('lets the player walk away without picking', async () => {
    const { getByTestId } = await renderScreen()
    await act(async () => { await fireEvent.press(getByTestId('card-skip')) })
    expect(mockResume).toHaveBeenCalled()
    expect(mockSelectCard).not.toHaveBeenCalled()
  })

  it('falls back to a plain continue when the draw came back empty', async () => {
    mockCardOffer = []
    const { getByTestId, queryByTestId } = await renderScreen()
    expect(queryByTestId('card-damage-common')).toBeNull()
    await act(async () => { await fireEvent.press(getByTestId('card-skip')) })
    expect(mockResume).toHaveBeenCalled()
  })
})
