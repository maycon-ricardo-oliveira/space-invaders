'use client'
import React, { useState, useEffect } from 'react'
import { getPhases, createPhaseAction, deletePhaseAction } from '../../../app/actions/phase.actions'
import { getLevels, createLevelAction, deleteLevelAction } from '../../../app/actions/level.actions'
import { useRouter, usePathname } from 'next/navigation'

type World = { id: number; name: string; index: number; image: string | null; parallaxTheme: string | null }
type Phase = { id: number; worldId: number; name: string; index: number }
type Level = { id: number; phaseId: number; name: string; index: number }

interface SidebarProps {
  worlds: World[]
  selectedWorldId?: number
  selectedPhaseId?: number
}

const LEVEL_DEFAULTS = {
  enemySpeed: 2.0, shotDelay: 1.5, fuelDrain: 8.0,
  enemyShotSpeed: 4.0, enemyAngerDelay: 15.0, enemySpawnDelay: 1.0, hasPowerUps: true,
}

const s = {
  sidebar: { width: 180, minWidth: 180, background: '#1a1a2e', borderRight: '1px solid #2c2c3e', display: 'flex', flexDirection: 'column' as const, overflow: 'auto', padding: '16px 0' },
  section: { padding: '0 12px 16px' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#666', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1 },
  addBtn: { color: '#3498db', fontSize: 16, cursor: 'pointer', lineHeight: 1, background: 'none', border: 'none', padding: '0 2px' },
  item: (active: boolean) => ({
    color: active ? '#3498db' : '#aaa',
    background: active ? '#1e2d3d' : 'transparent',
    borderLeft: active ? '2px solid #3498db' : '2px solid transparent',
    padding: '6px 8px',
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  }),
  deleteBtn: { color: '#555', fontSize: 12, cursor: 'pointer', background: 'none', border: 'none', padding: '0 2px', lineHeight: 1 },
  emptyHint: { color: '#555', fontSize: 12, padding: '4px 0' },
}

export function Sidebar({ worlds, selectedWorldId, selectedPhaseId }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [worldId, setWorldId] = useState(selectedWorldId ?? worlds[0]?.id)
  const [phases, setPhases] = useState<Phase[]>([])
  const [phaseId, setPhaseId] = useState(selectedPhaseId)
  const [levels, setLevels] = useState<Level[]>([])

  // Derive active level from URL: /dashboard/[worldId]/[phaseId]/[levelId]
  const activeLevelId = Number(pathname.split('/')[4]) || undefined

  useEffect(() => {
    if (!worldId) return
    setPhaseId(undefined)
    getPhases(worldId).then(p => {
      setPhases(p as Phase[])
      if (p.length > 0) setPhaseId(p[0].id)
    })
  }, [worldId])

  useEffect(() => {
    if (!phaseId) { setLevels([]); return }
    getLevels(phaseId).then(l => setLevels(l as Level[]))
  }, [phaseId])

  function navigateToLevel(lvl: Level) {
    router.push(`/dashboard/${worldId}/${phaseId}/${lvl.id}`)
  }

  async function handleCreatePhase() {
    if (!worldId) return
    const name = `Phase ${phases.length + 1}`
    await createPhaseAction(worldId, { name, index: phases.length })
    const updated = await getPhases(worldId)
    setPhases(updated as Phase[])
    setPhaseId((updated as Phase[]).at(-1)?.id)
  }

  async function handleDeletePhase(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Deletar esta fase?')) return
    await deletePhaseAction(id)
    const updated = await getPhases(worldId!)
    setPhases(updated as Phase[])
    if (phaseId === id) setPhaseId((updated as Phase[])[0]?.id)
  }

  async function handleCreateLevel() {
    if (!phaseId || !worldId) return
    const name = `Level ${levels.length + 1}`
    await createLevelAction(phaseId, { name, index: levels.length, ...LEVEL_DEFAULTS })
    const updated = await getLevels(phaseId)
    setLevels(updated as Level[])
    const newLevel = (updated as Level[]).at(-1)
    if (newLevel) router.push(`/dashboard/${worldId}/${phaseId}/${newLevel.id}`)
  }

  async function handleDeleteLevel(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Deletar este level?')) return
    await deleteLevelAction(id)
    const updated = await getLevels(phaseId!)
    setLevels(updated as Level[])
    if (activeLevelId === id) {
      const next = (updated as Level[])[0]
      if (next) router.push(`/dashboard/${worldId}/${phaseId}/${next.id}`)
      else router.push('/dashboard')
    }
  }

  return (
    <nav style={s.sidebar}>
      {/* Modules */}
      <div style={s.section}>
        <div style={s.label}>Módulos</div>
        <div style={{ marginTop: 8 }}>
          <div style={s.item(true)}><span>Worlds</span></div>
          <div style={s.item(false)}><span>Analytics</span></div>
        </div>
      </div>

      {/* World selector */}
      <div style={s.section}>
        <div style={s.label}>World</div>
        <select
          value={worldId}
          onChange={e => setWorldId(Number(e.target.value))}
          style={{ width: '100%', background: '#2c2c3e', color: '#eee', border: '1px solid #3c3c4e', borderRadius: 4, padding: '6px 8px', fontSize: 13, marginTop: 6 }}
        >
          {worlds.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </div>

      {/* Phases */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.label}>Fase</div>
          <button style={s.addBtn} onClick={handleCreatePhase} title="Nova fase">+</button>
        </div>
        {phases.map(p => (
          <div key={p.id} style={s.item(phaseId === p.id)} onClick={() => setPhaseId(p.id)}>
            <span>{p.name}</span>
            <button style={s.deleteBtn} onClick={e => handleDeletePhase(p.id, e)} title="Deletar fase">✕</button>
          </div>
        ))}
        {phases.length === 0 && (
          <div style={s.emptyHint}>Nenhuma fase. Clique em + para criar.</div>
        )}
      </div>

      {/* Levels */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.label}>Level</div>
          {phaseId && <button style={s.addBtn} onClick={handleCreateLevel} title="Novo level">+</button>}
        </div>
        {levels.map(l => (
          <div key={l.id} style={s.item(activeLevelId === l.id)} onClick={() => navigateToLevel(l)}>
            <span>{l.name}</span>
            <button style={s.deleteBtn} onClick={e => handleDeleteLevel(l.id, e)} title="Deletar level">✕</button>
          </div>
        ))}
        {levels.length === 0 && !phaseId && (
          <div style={s.emptyHint}>Selecione uma fase.</div>
        )}
        {levels.length === 0 && phaseId && (
          <div style={s.emptyHint}>Nenhum level. Clique em + para criar.</div>
        )}
      </div>

      {/* Export */}
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

  const label = status === 'loading' ? 'Exportando...' : status === 'done' ? '✓ Exportado' : status === 'error' ? '✗ Erro' : '💾 Export JSON'
  const bg = status === 'done' ? '#2ecc71' : status === 'error' ? '#e74c3c' : '#2c2c3e'

  return (
    <button
      onClick={handleExport}
      disabled={status === 'loading'}
      style={{ width: '100%', background: bg, color: status === 'done' ? '#111' : '#eee', border: 'none', borderRadius: 4, padding: '8px 0', fontSize: 13, cursor: 'pointer' }}
    >
      {label}
    </button>
  )
}
