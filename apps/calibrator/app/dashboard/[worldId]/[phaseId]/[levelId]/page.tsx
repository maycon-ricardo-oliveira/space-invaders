import { getLevel } from '../../../../actions/level.actions'
import { getPatterns } from '../../../../actions/pattern.actions'
import { LevelEditorClient } from '../../../../../src/components/LevelEditorClient'

// Reads from Postgres at request time — never prerender statically (causes hydration mismatch + stale data).
export const dynamic = 'force-dynamic'

export default async function LevelEditorPage({
  params,
}: {
  params: Promise<{ worldId: string; phaseId: string; levelId: string }>
}) {
  const { levelId } = await params
  const [level, patterns] = await Promise.all([
    getLevel(parseInt(levelId)),
    getPatterns(),
  ])

  return <LevelEditorClient level={level} patterns={patterns} />
}
