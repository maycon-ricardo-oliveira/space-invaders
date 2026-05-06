import { getWorlds } from '../actions/world.actions'
import { Sidebar } from '../../src/components/Sidebar/Sidebar'

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ worldId?: string; phaseId?: string; levelId?: string }>
}) {
  const worlds = await getWorlds()
  const { worldId, phaseId } = await params

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <Sidebar
        worlds={worlds}
        selectedWorldId={worldId ? parseInt(worldId) : undefined}
        selectedPhaseId={phaseId ? parseInt(phaseId) : undefined}
      />
      <main style={{ flex: 1, overflow: 'auto' }}>{children}</main>
    </div>
  )
}
