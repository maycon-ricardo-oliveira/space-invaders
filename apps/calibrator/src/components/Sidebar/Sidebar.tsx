'use client'
import React, { useState, useEffect } from 'react'
import { getPhases, createPhaseAction, deletePhaseAction } from '../../../app/actions/phase.actions'
import { getLevels, createLevelAction, deleteLevelAction } from '../../../app/actions/level.actions'
import { getWorlds, createWorldAction, deleteWorldAction } from '../../../app/actions/world.actions'
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

type Module = 'worlds' | 'analytics'

const s = {
  // Activity bar (left strip)
  activityBar: {
    width: 52, flexShrink: 0 as const, background: '#0d0d1a',
    borderRight: '1px solid #1a1a2e', display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', padding: '12px 0', gap: 6,
  },
  activityBtn: (active: boolean) => ({
    width: 40, height: 40, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: active ? '#1e2d3d' : 'transparent',
    borderLeft: active ? '2px solid #3498db' : '2px solid transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 18, color: active ? '#3498db' : '#555',
  }),
  // Context panel
  panel: {
    width: 176, flexShrink: 0 as const, background: '#1a1a2e',
    borderRight: '1px solid #2c2c3e', display: 'flex', flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  panelScroll: {
    flex: 1, overflowY: 'auto' as const, padding: '12px 10px',
    display: 'flex', flexDirection: 'column' as const, gap: 14,
  },
  sectionLabel: { fontSize: 10, color: '#555', textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4 },
  dropRow: { display: 'flex', gap: 4, alignItems: 'center' },
  select: (disabled?: boolean) => ({
    flex: 1, background: '#2c2c3e', color: disabled ? '#555' : '#eee',
    border: '1px solid #3c3c4e', borderRadius: 4, padding: '5px 6px',
    fontSize: 12, minWidth: 0,
  }),
  iconBtn: (color: string, disabled?: boolean) => ({
    background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
    color: disabled ? '#333' : color, fontSize: 16, padding: '0 2px', lineHeight: 1, flexShrink: 0 as const,
  }),
}

export function Sidebar({ worlds: initialWorlds, selectedWorldId, selectedPhaseId }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const [activeModule, setActiveModule] = useState<Module>('worlds')
  const [worldsList, setWorldsList] = useState<World[]>(initialWorlds)
  const [worldId, setWorldId] = useState(selectedWorldId ?? initialWorlds[0]?.id)
  const [phases, setPhases] = useState<Phase[]>([])
  const [phaseId, setPhaseId] = useState(selectedPhaseId)
  const [levels, setLevels] = useState<Level[]>([])

  // Derive active level from URL: /dashboard/[worldId]/[phaseId]/[levelId]
  const urlLevelId = Number(pathname.split('/')[4]) || undefined

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

  // ── World ──────────────────────────────────────────────
  async function handleCreateWorld() {
    await createWorldAction({ name: `World ${worldsList.length + 1}`, index: worldsList.length })
    const updated = await getWorlds()
    setWorldsList(updated as World[])
    const newest = (updated as World[]).at(-1)
    if (newest) setWorldId(newest.id)
  }

  async function handleDeleteWorld() {
    if (!worldId || !confirm('Deletar este world?')) return
    await deleteWorldAction(worldId)
    const updated = await getWorlds()
    setWorldsList(updated as World[])
    const first = (updated as World[])[0]
    setWorldId(first?.id)
  }

  // ── Phase ──────────────────────────────────────────────
  async function handleCreatePhase() {
    if (!worldId) return
    await createPhaseAction(worldId, { name: `Phase ${phases.length + 1}`, index: phases.length })
    const updated = await getPhases(worldId)
    setPhases(updated as Phase[])
    setPhaseId((updated as Phase[]).at(-1)?.id)
  }

  async function handleDeletePhase() {
    if (!phaseId || !confirm('Deletar esta fase?')) return
    await deletePhaseAction(phaseId)
    const updated = await getPhases(worldId!)
    setPhases(updated as Phase[])
    setPhaseId((updated as Phase[])[0]?.id)
  }

  // ── Level ──────────────────────────────────────────────
  async function handleCreateLevel() {
    if (!phaseId || !worldId) return
    await createLevelAction(phaseId, { name: `Level ${levels.length + 1}`, index: levels.length, ...LEVEL_DEFAULTS })
    const updated = await getLevels(phaseId)
    setLevels(updated as Level[])
    const newLevel = (updated as Level[]).at(-1)
    if (newLevel) router.push(`/dashboard/${worldId}/${phaseId}/${newLevel.id}`)
  }

  async function handleDeleteLevel() {
    if (!urlLevelId || !confirm('Deletar este level?')) return
    await deleteLevelAction(urlLevelId)
    const updated = await getLevels(phaseId!)
    setLevels(updated as Level[])
    const next = (updated as Level[])[0]
    if (next) router.push(`/dashboard/${worldId}/${phaseId}/${next.id}`)
    else router.push('/dashboard')
  }

  function handleSelectLevel(id: number) {
    router.push(`/dashboard/${worldId}/${phaseId}/${id}`)
  }

  return (
    <div style={{ display: 'flex', height: '100%', flexShrink: 0 }}>
      {/* ── Activity bar ── */}
      <div style={s.activityBar}>
        <button
          style={s.activityBtn(activeModule === 'worlds')}
          onClick={() => setActiveModule('worlds')}
          title="Worlds"
        >🌍</button>
        <button
          style={s.activityBtn(activeModule === 'analytics')}
          onClick={() => setActiveModule('analytics')}
          title="Analytics"
        >📊</button>
      </div>

      {/* ── Worlds panel ── */}
      {activeModule === 'worlds' && (
        <div style={s.panel}>
          <div style={{ padding: '12px 10px 6px', borderBottom: '1px solid #2c2c3e' }}>
            <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Worlds</span>
          </div>
          <div style={s.panelScroll}>

            {/* World */}
            <div>
              <div style={s.sectionLabel}>World</div>
              <div style={s.dropRow}>
                <select
                  value={worldId ?? ''}
                  onChange={e => setWorldId(Number(e.target.value))}
                  style={s.select()}
                >
                  {worldsList.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  {worldsList.length === 0 && <option value="" disabled>—</option>}
                </select>
                <button style={s.iconBtn('#3498db')} onClick={handleCreateWorld} title="Novo world">+</button>
                <button style={s.iconBtn('#e74c3c', !worldId)} onClick={worldId ? handleDeleteWorld : undefined} title="Deletar world">×</button>
              </div>
              {worldsList.length === 0 && (
                <div style={{ fontSize: 11, color: '#444', marginTop: 4, fontStyle: 'italic' }}>Clique em + para criar um world.</div>
              )}
            </div>

            {/* Phase */}
            <div>
              <div style={s.sectionLabel}>Fase</div>
              <div style={s.dropRow}>
                <select
                  value={phaseId ?? ''}
                  onChange={e => setPhaseId(Number(e.target.value))}
                  disabled={!worldId}
                  style={s.select(!worldId)}
                >
                  {phases.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  {phases.length === 0 && <option value="" disabled>—</option>}
                </select>
                <button style={s.iconBtn('#3498db', !worldId)} onClick={worldId ? handleCreatePhase : undefined} title="Nova fase">+</button>
                <button style={s.iconBtn('#e74c3c', !phaseId)} onClick={phaseId ? handleDeletePhase : undefined} title="Deletar fase">×</button>
              </div>
              {worldId && phases.length === 0 && (
                <div style={{ fontSize: 11, color: '#444', marginTop: 4, fontStyle: 'italic' }}>Clique em + para criar uma fase.</div>
              )}
            </div>

            {/* Level */}
            <div>
              <div style={s.sectionLabel}>Level</div>
              <div style={s.dropRow}>
                <select
                  value={urlLevelId ?? ''}
                  onChange={e => handleSelectLevel(Number(e.target.value))}
                  disabled={!phaseId}
                  style={s.select(!phaseId)}
                >
                  {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  {levels.length === 0 && <option value="" disabled>—</option>}
                </select>
                <button style={s.iconBtn('#3498db', !phaseId)} onClick={phaseId ? handleCreateLevel : undefined} title="Novo level">+</button>
                <button style={s.iconBtn('#e74c3c', !urlLevelId)} onClick={urlLevelId ? handleDeleteLevel : undefined} title="Deletar level">×</button>
              </div>
              {phaseId && levels.length === 0 && (
                <div style={{ fontSize: 11, color: '#444', marginTop: 4, fontStyle: 'italic' }}>Clique em + para criar um level.</div>
              )}
            </div>

          </div>

          {/* Export at bottom */}
          {worldId && (
            <div style={{ padding: '8px 10px', borderTop: '1px solid #2c2c3e', flexShrink: 0 }}>
              <ExportButton worldId={worldId} />
            </div>
          )}
        </div>
      )}

      {/* ── Analytics panel ── */}
      {activeModule === 'analytics' && (
        <div style={s.panel}>
          <div style={{ padding: '12px 10px 6px', borderBottom: '1px solid #2c2c3e' }}>
            <span style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: 1 }}>Analytics</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12, color: '#444', fontStyle: 'italic' }}>Em breve</span>
          </div>
        </div>
      )}
    </div>
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
      style={{ width: '100%', background: bg, color: status === 'done' ? '#111' : '#eee', border: 'none', borderRadius: 4, padding: '8px 0', fontSize: 12, cursor: 'pointer' }}
    >
      {label}
    </button>
  )
}
