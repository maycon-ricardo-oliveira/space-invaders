import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { StoryModeScreen } from '../screens/StoryModeScreen'
import { TOTAL_STORY_LEVELS } from '../game/GameLoop'
import type { LevelSummary } from '@si/level-engine'

const summaryA: LevelSummary = { id: 'story-1-1', phaseIndex: 1, levelIndex: 1, difficultyScore: 0 }
const summaryB: LevelSummary = { id: 'story-1-2', phaseIndex: 1, levelIndex: 2, difficultyScore: 0 }

describe('StoryModeScreen — authored summaries', () => {
  it('renders "Fase 1 — Level 1" given one summary', () => {
    const { getByText } = render(
      <StoryModeScreen summaries={[summaryA]} onSelectLevel={jest.fn()} />,
    )
    expect(getByText('Fase 1 — Level 1')).toBeTruthy()
  })

  it('renders "Fase 1 — Level 2" given two summaries', () => {
    const { getByText } = render(
      <StoryModeScreen summaries={[summaryA, summaryB]} onSelectLevel={jest.fn()} />,
    )
    expect(getByText('Fase 1 — Level 2')).toBeTruthy()
  })

  it('calls onSelectLevel with authored selection when a summary row is pressed', () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <StoryModeScreen summaries={[summaryA, summaryB]} onSelectLevel={onSelect} />,
    )
    fireEvent.press(getByText('Fase 1 — Level 1'))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'authored', levelId: 'story-1-1' })
  })

  it('calls onSelectLevel with authored selection for second summary', () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <StoryModeScreen summaries={[summaryA, summaryB]} onSelectLevel={onSelect} />,
    )
    fireEvent.press(getByText('Fase 1 — Level 2'))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'authored', levelId: 'story-1-2' })
  })
})

describe('StoryModeScreen — procedural fallback (empty summaries)', () => {
  it('renders a title', () => {
    const { getByText } = render(<StoryModeScreen summaries={[]} onSelectLevel={jest.fn()} />)
    expect(getByText('Story Mode')).toBeTruthy()
  })

  it('renders Level 1 when summaries is empty', () => {
    const { getByText } = render(<StoryModeScreen summaries={[]} onSelectLevel={jest.fn()} />)
    expect(getByText('Level 1')).toBeTruthy()
  })

  it(`renders Level ${TOTAL_STORY_LEVELS} when summaries is empty`, () => {
    const { getByText } = render(<StoryModeScreen summaries={[]} onSelectLevel={jest.fn()} />)
    expect(getByText(`Level ${TOTAL_STORY_LEVELS}`)).toBeTruthy()
  })

  it('calls onSelectLevel with procedural selection when Level 1 is pressed', () => {
    const onSelect = jest.fn()
    const { getByText } = render(<StoryModeScreen summaries={[]} onSelectLevel={onSelect} />)
    fireEvent.press(getByText('Level 1'))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'procedural', levelIndex: 0 })
  })

  it('calls onSelectLevel with procedural selection when Level 2 is pressed', () => {
    const onSelect = jest.fn()
    const { getByText } = render(<StoryModeScreen summaries={[]} onSelectLevel={onSelect} />)
    fireEvent.press(getByText('Level 2'))
    expect(onSelect).toHaveBeenCalledWith({ kind: 'procedural', levelIndex: 1 })
  })
})
