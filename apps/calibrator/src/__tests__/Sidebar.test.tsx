import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const refresh = jest.fn()
const push = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push }),
  usePathname: () => '/dashboard/1/1/1',
}))

jest.mock('../../app/actions/phase.actions', () => ({
  getPhases: jest.fn().mockResolvedValue([]),
  createPhaseAction: jest.fn().mockResolvedValue(undefined),
  deletePhaseAction: jest.fn().mockResolvedValue(undefined),
  setPhaseStatusAction: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../app/actions/level.actions', () => ({
  getLevels: jest.fn().mockResolvedValue([]),
  createLevelAction: jest.fn().mockResolvedValue(undefined),
  deleteLevelAction: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('../../app/actions/world.actions', () => ({
  getWorlds: jest.fn().mockResolvedValue([]),
  createWorldAction: jest.fn().mockResolvedValue(undefined),
}))

// ExportButton dynamically imports this module — mock it so we control the
// resolve/reject of the export action.
jest.mock('../../app/actions/export.actions', () => ({
  exportToJsonAction: jest.fn(),
}))

import { Sidebar } from '../components/Sidebar/Sidebar'
import { createWorldAction } from '../../app/actions/world.actions'
import { getPhases, createPhaseAction, setPhaseStatusAction } from '../../app/actions/phase.actions'
import { getLevels } from '../../app/actions/level.actions'
import { exportToJsonAction } from '../../app/actions/export.actions'

const mockCreateWorld = createWorldAction as jest.Mock
const mockGetPhases = getPhases as jest.Mock
const mockCreatePhase = createPhaseAction as jest.Mock
const mockSetPhaseStatus = setPhaseStatusAction as jest.Mock
const mockGetLevels = getLevels as jest.Mock
const mockExport = exportToJsonAction as jest.Mock

const worlds = [
  { id: 1, name: 'Planeta X', index: 0, image: null, parallaxTheme: 'space', createdAt: new Date(), updatedAt: new Date() },
]

beforeEach(() => {
  refresh.mockClear()
  push.mockClear()
  mockCreateWorld.mockClear()
  mockGetPhases.mockReset().mockResolvedValue([])
  mockCreatePhase.mockReset().mockResolvedValue(undefined)
  mockSetPhaseStatus.mockReset().mockResolvedValue(undefined)
  mockGetLevels.mockReset().mockResolvedValue([])
  mockExport.mockReset()
})

describe('Sidebar', () => {
  it('renders world name', () => {
    render(<Sidebar worlds={worlds} />)
    expect(screen.getByText('Planeta X')).toBeInTheDocument()
  })

  it('renders module navigation items', () => {
    render(<Sidebar worlds={worlds} />)
    expect(screen.getByText('Worlds')).toBeInTheDocument()
  })

  // ── regression: createWorldAction revalidatePath but client froze useState(worlds) ──
  it('calls router.refresh after creating a world so server data re-syncs', async () => {
    render(<Sidebar worlds={worlds} />)
    fireEvent.click(screen.getByTitle('Novo world'))

    await waitFor(() => expect(mockCreateWorld).toHaveBeenCalledTimes(1))
    // Without router.refresh the new world only lives in local state — sibling
    // server components (level list, breadcrumb) stay stale.
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })
})

// CASCADE contract (replaces the abandoned empty-phase route approach).
// Creating a phase now cascades Phase + Level 1 + Wave 1 in one transaction, so
// EVERY phase is born with a level. Therefore the sidebar always navigates
// straight to a level: clicking a phase opens its FIRST level, and creating a
// phase opens the FIRST level of the freshly-created phase. There is no
// phase-only route anymore — navigating to a level URL is now the correct
// behaviour, not the bug.
//
// Phase fixtures carry `status` because getPhases (Prisma) returns it; the
// sidebar reads it for the status badge / publish toggle.
type PhaseFixture = { id: number; worldId: number; name: string; index: number; status: 'draft' | 'published' }
type LevelFixture = { id: number; phaseId: number; name: string; index: number }

describe('Sidebar — phase navigation opens the first level of the clicked phase (cascade)', () => {
  const phases: PhaseFixture[] = [
    { id: 10, worldId: 1, name: 'Fase A', index: 0, status: 'draft' },
    { id: 20, worldId: 1, name: 'Fase B', index: 1, status: 'draft' },
  ]
  // Fase A has levels 101/102; Fase B has levels 201/202. getLevels resolves
  // per-phase — the cascade guarantees at least one level per phase.
  const levelsByPhase: Record<number, LevelFixture[]> = {
    10: [
      { id: 101, phaseId: 10, name: 'Level 1', index: 0 },
      { id: 102, phaseId: 10, name: 'Level 2', index: 1 },
    ],
    20: [
      { id: 201, phaseId: 20, name: 'Level 1', index: 0 },
      { id: 202, phaseId: 20, name: 'Level 2', index: 1 },
    ],
  }

  beforeEach(() => {
    mockGetPhases.mockReset().mockResolvedValue(phases)
    mockGetLevels.mockReset().mockImplementation((phaseId: number) =>
      Promise.resolve(levelsByPhase[phaseId] ?? [])
    )
  })

  // Clicking a phase navigates to its FIRST level: /dashboard/{world}/{phase}/{firstLevel}.
  it('navigates to the first level of the clicked phase', async () => {
    render(<Sidebar worlds={worlds} selectedWorldId={1} />)

    // Phases load and the first one (Fase A) auto-selects, loading its levels.
    await screen.findByText('Fase B')
    await waitFor(() => expect(screen.getByText('Level 2')).toBeInTheDocument())
    push.mockClear()

    // Click the OTHER phase (Fase B). The destination is Fase B's first level (201).
    fireEvent.click(screen.getByText('Fase B'))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/1/20/201'))
  })

  // Regression: clicking a phase must never land the editor on ANOTHER phase's
  // level. The destination is always a level of the CLICKED phase (Fase B = 20x),
  // never one of Fase A (10x). This guards the original "Phase B shows Phase A's
  // level" bug — esse bug não volta.
  it('does not navigate into a stale level belonging to another phase', async () => {
    render(<Sidebar worlds={worlds} selectedWorldId={1} />)

    await screen.findByText('Fase B')
    await waitFor(() => expect(screen.getByText('Level 2')).toBeInTheDocument())
    push.mockClear()

    fireEvent.click(screen.getByText('Fase B'))

    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/1/20/201'))
    // Never a level of Fase A (the previously-shown phase).
    expect(push).not.toHaveBeenCalledWith('/dashboard/1/10/101')
    expect(push).not.toHaveBeenCalledWith('/dashboard/1/10/102')
    expect(push).not.toHaveBeenCalledWith(expect.stringMatching(/^\/dashboard\/1\/10\//))
  })
})

// Was: handleCreatePhase set local state + router.refresh(), leaving the editor
// on the previous phase. New cascade contract: createPhaseAction returns the
// created phase; the sidebar fetches its levels and navigates to the FIRST one.
describe('Sidebar — creating a phase opens the first level of the new phase (cascade)', () => {
  it('pushes /dashboard/{worldId}/{newPhaseId}/{firstLevelId} after creating a phase', async () => {
    // Before create: one phase (id 10) with one level. createPhaseAction returns
    // the created phase (id 30) — the cascade already gave it Level 1 (id 301).
    mockGetPhases
      .mockReset()
      .mockResolvedValueOnce([{ id: 10, worldId: 1, name: 'Fase A', index: 0, status: 'draft' }]) // initial load
      .mockResolvedValue([
        { id: 10, worldId: 1, name: 'Fase A', index: 0, status: 'draft' },
        { id: 30, worldId: 1, name: 'Phase 2', index: 1, status: 'draft' },
      ]) // refetch after createPhaseAction
    mockCreatePhase
      .mockReset()
      .mockResolvedValue({ id: 30, worldId: 1, name: 'Phase 2', index: 1, status: 'draft' })
    // The new phase (30) was born with Level 1 (301) by the cascade; the old
    // phase (10) keeps its own level (101).
    mockGetLevels.mockReset().mockImplementation((phaseId: number) =>
      Promise.resolve(
        phaseId === 30
          ? [{ id: 301, phaseId: 30, name: 'Level 1', index: 0 }]
          : phaseId === 10
            ? [{ id: 101, phaseId: 10, name: 'Level 1', index: 0 }]
            : []
      )
    )

    render(<Sidebar worlds={worlds} selectedWorldId={1} />)
    await screen.findByText('Fase A')
    push.mockClear()

    fireEvent.click(screen.getByTitle('Nova fase'))

    // The destination is the FIRST level of the NEW phase (30 → 301) — never the
    // old phase, never a phase-only route.
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/1/30/301'))
    expect(push).not.toHaveBeenCalledWith('/dashboard/1/10/101')
    expect(push).not.toHaveBeenCalledWith('/dashboard/1/30')
  })
})

// Publish UI (new). Each phase item exposes its publication status and a control
// to toggle it. Testable contracts the implementation must honour:
//   - status badge:  data-testid="phase-status-{id}"  with textContent the status
//                    ('draft' | 'published')
//   - publish toggle: data-testid="phase-publish-{id}" (a button); clicking it
//                     calls setPhaseStatusAction(id, nextStatus) then router.refresh()
describe('Sidebar — phase publication status badge', () => {
  const phases: PhaseFixture[] = [
    { id: 10, worldId: 1, name: 'Fase Draft', index: 0, status: 'draft' },
    { id: 20, worldId: 1, name: 'Fase Pub', index: 1, status: 'published' },
  ]

  beforeEach(() => {
    mockGetPhases.mockReset().mockResolvedValue(phases)
    mockGetLevels.mockReset().mockResolvedValue([])
  })

  it('shows a draft badge for a draft phase and a published badge for a published phase', async () => {
    render(<Sidebar worlds={worlds} selectedWorldId={1} />)

    const draftBadge = await screen.findByTestId('phase-status-10')
    const pubBadge = await screen.findByTestId('phase-status-20')
    expect(draftBadge).toHaveTextContent(/draft/i)
    expect(pubBadge).toHaveTextContent(/published/i)
  })
})

describe('Sidebar — publish/unpublish toggle', () => {
  beforeEach(() => {
    mockGetLevels.mockReset().mockResolvedValue([])
  })

  it('publishes a draft phase: calls setPhaseStatusAction(id, "published") then refreshes', async () => {
    mockGetPhases.mockReset().mockResolvedValue([
      { id: 10, worldId: 1, name: 'Fase Draft', index: 0, status: 'draft' },
    ])
    render(<Sidebar worlds={worlds} selectedWorldId={1} />)

    const toggle = await screen.findByTestId('phase-publish-10')
    refresh.mockClear()
    fireEvent.click(toggle)

    await waitFor(() => expect(mockSetPhaseStatus).toHaveBeenCalledWith(10, 'published'))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('unpublishes a published phase: calls setPhaseStatusAction(id, "draft") then refreshes', async () => {
    mockGetPhases.mockReset().mockResolvedValue([
      { id: 20, worldId: 1, name: 'Fase Pub', index: 0, status: 'published' },
    ])
    render(<Sidebar worlds={worlds} selectedWorldId={1} />)

    const toggle = await screen.findByTestId('phase-publish-20')
    refresh.mockClear()
    fireEvent.click(toggle)

    await waitFor(() => expect(mockSetPhaseStatus).toHaveBeenCalledWith(20, 'draft'))
    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  // Regression (PUBLISH-SYNC): the publish toggle called setPhaseStatusAction +
  // router.refresh() but never re-fetched getPhases — so the local `phases` state
  // (which feeds the badge) stayed stale and the badge only flipped on a full F5.
  // After clicking publish, getPhases(worldId) must be re-called and the badge
  // (phase-status-{id}) must reflect the NEW status without a remount. Esse bug
  // (badge desatualizado até dar F5) não volta.
  it('re-fetches getPhases and updates the status badge after publishing without remount', async () => {
    mockGetPhases
      .mockReset()
      // initial load → draft
      .mockResolvedValueOnce([
        { id: 10, worldId: 1, name: 'Fase Draft', index: 0, status: 'draft' },
      ])
      // refetch after publishing → published
      .mockResolvedValue([
        { id: 10, worldId: 1, name: 'Fase Draft', index: 0, status: 'published' },
      ])

    render(<Sidebar worlds={worlds} selectedWorldId={1} />)

    const badge = await screen.findByTestId('phase-status-10')
    expect(badge).toHaveTextContent(/draft/i)

    // getPhases was called once for the initial load.
    expect(mockGetPhases).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTestId('phase-publish-10'))

    await waitFor(() => expect(mockSetPhaseStatus).toHaveBeenCalledWith(10, 'published'))
    // The toggle must re-fetch phases (initial + refetch = 2 calls).
    await waitFor(() => expect(mockGetPhases).toHaveBeenCalledTimes(2))
    // And the SAME badge node now reads "published" — no remount needed.
    await waitFor(() => expect(screen.getByTestId('phase-status-10')).toHaveTextContent(/published/i))
  })

  // The toggle must not also trigger phase selection/navigation (it is nested in
  // the clickable phase row). Clicking publish stays on publish only.
  it('toggling publish does not navigate (no router.push)', async () => {
    mockGetPhases.mockReset().mockResolvedValue([
      { id: 10, worldId: 1, name: 'Fase Draft', index: 0, status: 'draft' },
    ])
    render(<Sidebar worlds={worlds} selectedWorldId={1} />)

    const toggle = await screen.findByTestId('phase-publish-10')
    push.mockClear()
    fireEvent.click(toggle)

    await waitFor(() => expect(mockSetPhaseStatus).toHaveBeenCalled())
    expect(push).not.toHaveBeenCalled()
  })
})

describe('ExportButton', () => {
  const FENCE_MESSAGE =
    'A validacao do levels.json falhou e o arquivo nao foi gravado (1 erro(s)): story-1-1: wave 2 fora do padrao esperado'

  // ── UX bug: on failure the button only flashed a mute "✗ Erro". The useful
  // fence message (which wave/problem) stayed trapped in the server. The user
  // must now SEE the message the action rejects with. ──
  it('shows the action error message to the user instead of a mute "✗ Erro"', async () => {
    mockExport.mockRejectedValue(new Error(FENCE_MESSAGE))
    render(<Sidebar worlds={worlds} />)

    fireEvent.click(screen.getByText('💾 Export JSON'))

    await waitFor(() => expect(mockExport).toHaveBeenCalledWith(1))
    // The specific PT-BR message must be visible somewhere in the UI.
    expect(await screen.findByText(FENCE_MESSAGE)).toBeInTheDocument()
  })

  it('does not show an error message on a successful export', async () => {
    mockExport.mockResolvedValue('/path/levels.json')
    render(<Sidebar worlds={worlds} />)

    fireEvent.click(screen.getByText('💾 Export JSON'))

    await waitFor(() => expect(screen.getByText('✓ Exportado')).toBeInTheDocument())
    expect(screen.queryByText(FENCE_MESSAGE)).not.toBeInTheDocument()
  })
})
