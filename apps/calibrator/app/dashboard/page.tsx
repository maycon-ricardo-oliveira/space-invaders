import { redirect } from 'next/navigation'
import { getWorlds } from '../actions/world.actions'
import { getPhases } from '../actions/phase.actions'
import { getLevels } from '../actions/level.actions'

export default async function DashboardPage() {
  const worlds = await getWorlds()
  if (worlds.length === 0) {
    return (
      <div style={{ padding: 40, color: '#666' }}>
        No worlds yet. Create a world to get started.
      </div>
    )
  }
  const phases = await getPhases(worlds[0].id)
  if (phases.length === 0) {
    return (
      <div style={{ padding: 40, color: '#666' }}>
        No phases in world &quot;{worlds[0].name}&quot;. Add a phase to get started.
      </div>
    )
  }
  const levels = await getLevels(phases[0].id)
  if (levels.length === 0) {
    return (
      <div style={{ padding: 40, color: '#666' }}>
        No levels in phase &quot;{phases[0].name}&quot;. Add a level to get started.
      </div>
    )
  }
  redirect(`/dashboard/${worlds[0].id}/${phases[0].id}/${levels[0].id}`)
}
