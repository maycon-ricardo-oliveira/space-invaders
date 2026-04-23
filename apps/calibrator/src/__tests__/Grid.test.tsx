import { render, fireEvent } from '@testing-library/react'
import { Grid, COLS, ROWS, CELL_W, CELL_H } from '../MapEditor/Grid'
import type { EntityPlacement } from '@si/level-engine'

describe('Grid', () => {
  it('renders COLS × ROWS cells as buttons', () => {
    const { getAllByRole } = render(
      <Grid entities={[]} selectedEntityTypeId={null} onPlace={jest.fn()} onRemove={jest.fn()} />
    )
    expect(getAllByRole('button')).toHaveLength(COLS * ROWS)
  })

  it('calls onPlace with correct coords when clicking an empty cell', () => {
    const onPlace = jest.fn()
    const { getAllByRole } = render(
      <Grid entities={[]} selectedEntityTypeId="basic-enemy" onPlace={onPlace} onRemove={jest.fn()} />
    )
    // Button index 0 → row=0, col=0 → x=0, y=0
    fireEvent.click(getAllByRole('button')[0])
    expect(onPlace).toHaveBeenCalledWith({ entityTypeId: 'basic-enemy', x: 0, y: 0 })
  })

  it('calls onRemove when clicking a cell that already has an entity', () => {
    const onRemove = jest.fn()
    const entities: EntityPlacement[] = [{ entityTypeId: 'basic-enemy', x: 0, y: 0 }]
    const { getAllByRole } = render(
      <Grid entities={entities} selectedEntityTypeId="basic-enemy" onPlace={jest.fn()} onRemove={onRemove} />
    )
    fireEvent.click(getAllByRole('button')[0])
    expect(onRemove).toHaveBeenCalledWith(0)
  })

  it('does not call onPlace when no entity type is selected', () => {
    const onPlace = jest.fn()
    const { getAllByRole } = render(
      <Grid entities={[]} selectedEntityTypeId={null} onPlace={onPlace} onRemove={jest.fn()} />
    )
    fireEvent.click(getAllByRole('button')[0])
    expect(onPlace).not.toHaveBeenCalled()
  })

  it('places entity at the correct non-zero position', () => {
    const onPlace = jest.fn()
    const { getAllByRole } = render(
      <Grid entities={[]} selectedEntityTypeId="fast-enemy" onPlace={onPlace} onRemove={jest.fn()} />
    )
    // Button index 13 → row=1 (floor(13/12)=1), col=1 (13%12=1) → x=1*CELL_W, y=1*CELL_H
    fireEvent.click(getAllByRole('button')[13])
    expect(onPlace).toHaveBeenCalledWith({
      entityTypeId: 'fast-enemy',
      x: 1 * CELL_W,
      y: 1 * CELL_H,
    })
  })
})
