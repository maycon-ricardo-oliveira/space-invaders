'use client'
import React, { useState, useEffect } from 'react'
import { getPhases } from '../../../app/actions/phase.actions'
import { getLevels } from '../../../app/actions/level.actions'
import { useRouter } from 'next/navigation'

type World = { id: number; name: string; index: number; image: string | null; parallaxTheme: string | null; createdAt: Date; updatedAt: Date }
type Phase = { id: number; worldId: number; name: string; index: number }
type Level = { id: number; phaseId: number; name: string; index: number }

interface SidebarProps {
  worlds: World[]
  selectedWorldId?: number
  selectedPhaseId?: number
}

const s = {
  sidebar: { width: 140, minWidth: 140, background: '#1a1a2e', borderRight: '1px solid #2c2c3e', display: 'flex', flexDirection: 'column' as const, gap: 0, overflow: 'auto', padding: '12px 0' },
  section: { padding: '0 10px 12px' },
  label: { color: '#555', fontSize: 9, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 6 },
  item: (active: boolean) => ({ color: active ? '#3498db' : '#888', background: active ? '#1e2d3d' : 'transparent', borderLeft: active ? '2px solid #3498db' : '2px solid transparent', padding: '4px 8px', fontSize: 10, cursor: 'pointer', borderRadius: 3 }),
}

export function Sidebar({ worlds, selectedWorldId, selectedPhaseId }: SidebarProps) {
  const router = useRouter()
  const [worldId, setWorldId] = useState(selectedWorldId ?? worlds[0]?.id)
  const [phases, setPhases] = useState<Phase[]>([])
  const [phaseId, setPhaseId] = useState(selectedPhaseId)
  const [levels, setLevels] = useState<Level[]>([])

  useEffect(() => {
    if (!worldId) return
    setPhaseId(undefined)  // reset when world changes
    getPhases(worldId).then(p => {
      setPhases(p as Phase[])
      if (p.length > 0) setPhaseId(p[0].id)
    })
  }, [worldId])

  useEffect(() => {
    if (!phaseId) return
    getLevels(phaseId).then(l => setLevels(l as Level[]))
  }, [phaseId])

  function navigateToLevel(lvl: Level) {
    router.push(`/dashboard/${worldId}/${phaseId}/${lvl.id}`)
  }

  return (
    <nav style={s.sidebar}>
      <div style={s.section}>
        <div style={s.label}>Módulos</div>
        <div style={s.item(true)}>Worlds</div>
        <div style={s.item(false)}>Analytics</div>
      </div>
      <div style={s.section}>
        <div style={s.label}>World</div>
        <select
          value={worldId}
          onChange={e => setWorldId(Number(e.target.value))}
          style={{ width: '100%', background: '#2c2c3e', color: '#eee', border: 'none', borderRadius: 3, padding: '3px 4px', fontSize: 10 }}
        >
          {worlds.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>
      {phases.length > 0 && (
        <div style={s.section}>
          <div style={s.label}>Fase</div>
          {phases.map(p => (
            <div key={p.id} style={s.item(phaseId === p.id)} onClick={() => setPhaseId(p.id)}>
              {p.name}
            </div>
          ))}
        </div>
      )}
      {levels.length > 0 && (
        <div style={s.section}>
          <div style={s.label}>Level</div>
          {levels.map(l => (
            <div key={l.id} style={s.item(false)} onClick={() => navigateToLevel(l)}>
              {l.name}
            </div>
          ))}
        </div>
      )}
      {worldId && (
        <div style={{ ...s.section, marginTop: 'auto' }}>
          <ExportButton worldId={worldId} />
        </div>
      )}
    </nav>
  )
}

function ExportButton({ worldId }: { worldId: number }) {
  const [status, setStatus] = React.useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function handleExport() {
    setStatus('loading')
    try {
      const { exportToJsonAction } = await import('../../../app/actions/export.actions')
      await exportToJsonAction(worldId)
      setStatus('done')
      setTimeout(() => setStatus('idle'), 2000)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const label = status === 'loading' ? '...' : status === 'done' ? '✓ Exported' : status === 'error' ? '✗ Error' : '💾 Export JSON'
  const bg = status === 'done' ? '#2ecc71' : status === 'error' ? '#e74c3c' : '#2c2c3e'

  return (
    <button
      onClick={handleExport}
      disabled={status === 'loading'}
      style={{ width: '100%', background: bg, color: status === 'done' ? '#111' : '#eee', border: 'none', borderRadius: 3, padding: '5px 0', fontSize: 9, cursor: 'pointer' }}
    >
      {label}
    </button>
  )
}
