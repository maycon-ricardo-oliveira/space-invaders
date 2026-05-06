'use client'
import React, { useState, useEffect } from 'react'
import { getPhases, createPhaseAction, deletePhaseAction } from '../../../app/actions/phase.actions'
import { getLevels } from '../../../app/actions/level.actions'
import { useRouter } from 'next/navigation'

type World = { id: number; name: string; index: number; image: string | null; parallaxTheme: string | null }
type Phase = { id: number; worldId: number; name: string; index: number }
type Level = { id: number; phaseId: number; name: string; index: number }

interface SidebarProps {
  worlds: World[]
  selectedWorldId?: number
  selectedPhaseId?: number
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
}

export function Sidebar({ worlds, selectedWorldId, selectedPhaseId }: SidebarProps) {
  const router = useRouter()
  const [worldId, setWorldId] = useState(selectedWorldId ?? worlds[0]?.id)
  const [phases, setPhases] = useState<Phase[]>([])
  const [phaseId, setPhaseId] = useState(selectedPhaseId)
  const [levels, setLevels] = useState<Level[]>([])
  const [newPhaseName, setNewPhaseName] = useState('')
  const [addingPhase, setAddingPhase] = useState(false)

  useEffect(() => {
    if (!worldId) return
    setPhaseId(undefined)
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

  async function handleCreatePhase() {
    if (!newPhaseName.trim() || !worldId) return
    const nextIndex = phases.length
    await createPhaseAction(worldId, { name: newPhaseName.trim(), index: nextIndex })
    setNewPhaseName('')
    setAddingPhase(false)
    const updated = await getPhases(worldId)
    setPhases(updated as Phase[])
  }

  async function handleDeletePhase(id: number, e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Deletar esta fase?')) return
    await deletePhaseAction(id)
    const updated = await getPhases(worldId!)
    setPhases(updated as Phase[])
    if (phaseId === id) setPhaseId(updated[0]?.id)
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
          <button style={s.addBtn} onClick={() => setAddingPhase(v => !v)} title="Nova fase">+</button>
        </div>

        {addingPhase && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
            <input
              autoFocus
              value={newPhaseName}
              onChange={e => setNewPhaseName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreatePhase()}
              placeholder="Nome da fase"
              style={{ flex: 1, background: '#2c2c3e', border: '1px solid #3498db', borderRadius: 4, padding: '4px 6px', color: '#eee', fontSize: 12 }}
            />
            <button onClick={handleCreatePhase} style={{ background: '#3498db', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 8px', fontSize: 12, cursor: 'pointer' }}>✓</button>
            <button onClick={() => setAddingPhase(false)} style={{ background: '#444', color: '#eee', border: 'none', borderRadius: 4, padding: '4px 6px', fontSize: 12, cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {phases.map(p => (
          <div key={p.id} style={s.item(phaseId === p.id)} onClick={() => setPhaseId(p.id)}>
            <span>{p.name}</span>
            <button style={s.deleteBtn} onClick={e => handleDeletePhase(p.id, e)} title="Deletar fase">✕</button>
          </div>
        ))}

        {phases.length === 0 && !addingPhase && (
          <div style={{ color: '#555', fontSize: 12, padding: '4px 0' }}>Nenhuma fase. Clique em + para criar.</div>
        )}
      </div>

      {/* Levels */}
      {levels.length > 0 && (
        <div style={s.section}>
          <div style={s.label}>Level</div>
          <div style={{ marginTop: 8 }}>
            {levels.map(l => (
              <div key={l.id} style={s.item(false)} onClick={() => navigateToLevel(l)}>
                <span>{l.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
