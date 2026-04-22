import { render, fireEvent } from '@testing-library/react'
import { Toolbox } from '../MapEditor/Toolbox'
import type { EntityType } from '@si/level-engine'

const entityTypes: EntityType[] = [
  { id: 'basic-enemy', label: 'Basic Enemy',  icon: '👾', properties: {} },
  { id: 'fast-enemy',  label: 'Fast Enemy',   icon: '🚀', properties: {} },
  { id: 'tank-enemy',  label: 'Tank Enemy',   icon: '🛡️', properties: {} },
]

describe('Toolbox', () => {
  it('renders a button for each entity type', () => {
    const { getByText } = render(
      <Toolbox entityTypes={entityTypes} selectedId={null} onSelect={jest.fn()} />
    )
    expect(getByText('Basic Enemy')).toBeInTheDocument()
    expect(getByText('Fast Enemy')).toBeInTheDocument()
    expect(getByText('Tank Enemy')).toBeInTheDocument()
  })

  it('calls onSelect with the entity type id on click', () => {
    const onSelect = jest.fn()
    const { getByText } = render(
      <Toolbox entityTypes={entityTypes} selectedId={null} onSelect={onSelect} />
    )
    fireEvent.click(getByText('Basic Enemy'))
    expect(onSelect).toHaveBeenCalledWith('basic-enemy')
  })

  it('marks the selected entity as aria-pressed', () => {
    const { getByText } = render(
      <Toolbox entityTypes={entityTypes} selectedId="basic-enemy" onSelect={jest.fn()} />
    )
    expect(getByText('Basic Enemy').closest('button')).toHaveAttribute('aria-pressed', 'true')
    expect(getByText('Fast Enemy').closest('button')).toHaveAttribute('aria-pressed', 'false')
  })
})
