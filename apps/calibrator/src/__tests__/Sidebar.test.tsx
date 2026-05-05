import React from 'react'
import { render, screen } from '@testing-library/react'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard/1/1/1',
}))

jest.mock('../../app/actions/phase.actions', () => ({
  getPhases: jest.fn().mockResolvedValue([]),
}))

jest.mock('../../app/actions/level.actions', () => ({
  getLevels: jest.fn().mockResolvedValue([]),
}))

import { Sidebar } from '../components/Sidebar/Sidebar'

const worlds = [
  { id: 1, name: 'Planeta X', index: 0, image: null, parallaxTheme: 'space', createdAt: new Date(), updatedAt: new Date() },
]

describe('Sidebar', () => {
  it('renders world name', () => {
    render(<Sidebar worlds={worlds} />)
    expect(screen.getByText('Planeta X')).toBeInTheDocument()
  })

  it('renders module navigation items', () => {
    render(<Sidebar worlds={worlds} />)
    expect(screen.getByText('Worlds')).toBeInTheDocument()
  })
})
