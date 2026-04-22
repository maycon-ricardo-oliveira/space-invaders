import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { StoryModeScreen } from '../screens/StoryModeScreen'
import { TOTAL_STORY_LEVELS } from '../game/GameLoop'

describe('StoryModeScreen', () => {
  it('renders a title', () => {
    const { getByText } = render(<StoryModeScreen onSelectLevel={jest.fn()} />)
    expect(getByText('Story Mode')).toBeTruthy()
  })

  it('renders Level 1', () => {
    const { getByText } = render(<StoryModeScreen onSelectLevel={jest.fn()} />)
    expect(getByText('Level 1')).toBeTruthy()
  })

  it(`renders Level ${TOTAL_STORY_LEVELS}`, () => {
    const { getByText } = render(<StoryModeScreen onSelectLevel={jest.fn()} />)
    expect(getByText(`Level ${TOTAL_STORY_LEVELS}`)).toBeTruthy()
  })

  it('calls onSelectLevel(0) when Level 1 is pressed', () => {
    const onSelect = jest.fn()
    const { getByText } = render(<StoryModeScreen onSelectLevel={onSelect} />)
    fireEvent.press(getByText('Level 1'))
    expect(onSelect).toHaveBeenCalledWith(0)
  })

  it('calls onSelectLevel(1) when Level 2 is pressed', () => {
    const onSelect = jest.fn()
    const { getByText } = render(<StoryModeScreen onSelectLevel={onSelect} />)
    fireEvent.press(getByText('Level 2'))
    expect(onSelect).toHaveBeenCalledWith(1)
  })
})
