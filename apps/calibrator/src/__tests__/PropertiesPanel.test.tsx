import { render } from '@testing-library/react'
import { PropertiesPanel } from '../MapEditor/PropertiesPanel'
import type { EntityPlacement } from '@si/level-engine'

describe('PropertiesPanel', () => {
  it('renders "No entity selected" when entity is null', () => {
    const { getByText } = render(<PropertiesPanel entity={null} />)
    expect(getByText('No entity selected')).toBeInTheDocument()
  })

  it('renders entity type ID when entity provided', () => {
    const entity: EntityPlacement = { entityTypeId: 'basic-enemy', x: 60, y: 80 }
    const { getByText } = render(<PropertiesPanel entity={entity} />)
    expect(getByText(/basic-enemy/)).toBeInTheDocument()
  })

  it('renders entity position', () => {
    const entity: EntityPlacement = { entityTypeId: 'fast-enemy', x: 120, y: 160 }
    const { getByText } = render(<PropertiesPanel entity={entity} />)
    expect(getByText(/x: 120/)).toBeInTheDocument()
    expect(getByText(/y: 160/)).toBeInTheDocument()
  })
})
