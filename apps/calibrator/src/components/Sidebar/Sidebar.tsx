'use client'
import React, { useState, useEffect } from 'react'
import { getPhases, createPhaseAction, deletePhaseAction } from '../../../app/actions/phase.actions'
import { getLevels, createLevelAction, deleteLevelAction } from '../../../app/actions/level.actions'
import { getWorlds, createWorldAction } from '../../../app/actions/world.actions'
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
  sidebar: { width: 190, minWidth: 190, background: '#1a1a2e', borderRight: '1px solid #2c2c3e', display: 'flex', flexDirection: 'column' as const, overflow: 'auto', padding: '16px 0' },
  section: { padding: '0 12px 16px' },
  sectionHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  label: { color: '#666', fontSize: 11, textTransform: 'uppercase' as const, letterSpacing: 1 },
  addBtn: (disabled?: boolean) => ({ color: disabled ? '#333' : '#3498db', fontSize: 16, cursor: disabled ? 'default' : 'pointer', lineHeight: 1, background: 'none', border: 'none', padding: '0 2px' }),
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
  depHint: { color: '#444', fontSize: 11, padding: '4px 0', fontStyle: 'italic' as const },
}

export function Sidebar({ worlds: initialWorlds, selectedWorldId, selectedPhaseId }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [worldsList, setWorldsList] = useState<World[]>(initialWorlds)
  const [worldId, setWorldId] = useState(selectedWorldId ?? initialWorlds[0]?.id)
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

  // ── World ──────────────────────────────────────────────
  async function handleCreateWorld() {
    const name = `World ${worldsList.length + 1}`
    await createWorldAction({ name, index: worldsList.length })
    const updated = await getWorlds()
    setWorldsList(updated as World[])
    const newest = (updated as World[]).at(-1)
    if (newest) setWorldId(newest.id)
  }

  // ── Phase ──────────────────────────────────────────────
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

  // ── Level ──────────────────────────────────────────────
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

  const noWorld = !worldId
  const noPhase = !phaseId

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

      {/* World */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.label}>World</div>
          <button style={s.addBtn()} onClick={handleCreateWorld} title="Novo world">+</button>
        </div>
        {worldsList.length > 0 ? (
          <select
            value={worldId}
            onChange={e => setWorldId(Number(e.target.value))}
            style={{ width: '100%', background: '#2c2c3e', color: '#eee', border: '1px solid #3c3c4e', borderRadius: 4, padding: '6px 8px', fontSize: 13, marginTop: 4 }}
          >
            {worldsList.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        ) : (
          <div style={s.emptyHint}>Nenhum world. Clique em + para criar.</div>
        )}
      </div>

      {/* Phase */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.label}>Fase</div>
          <button
            style={s.addBtn(noWorld)}
            onClick={noWorld ? undefined : handleCreatePhase}
            title={noWorld ? 'Crie um world primeiro' : 'Nova fase'}
          >+</button>
        </div>
        {noWorld ? (
          <div style={s.depHint}>Selecione um world primeiro.</div>
        ) : (
          <>
            {phases.map(p => (
              <div key={p.id} style={s.item(phaseId === p.id)} onClick={() => setPhaseId(p.id)}>
                <span>{p.name}</span>
                <button style={s.deleteBtn} onClick={e => handleDeletePhase(p.id, e)} title="Deletar fase">✕</button>
              </div>
            ))}
            {phases.length === 0 && (
              <div style={s.emptyHint}>Nenhuma fase. Clique em + para criar.</div>
            )}
          </>
        )}
      </div>

      {/* Level */}
      <div style={s.section}>
        <div style={s.sectionHeader}>
          <div style={s.label}>Level</div>
          <button
            style={s.addBtn(noPhase)}
            onClick={noPhase ? undefined : handleCreateLevel}
            title={noPhase ? 'Crie uma fase primeiro' : 'Novo level'}
          >+</button>
        </div>
        {noPhase ? (
          <div style={s.depHint}>Selecione uma fase primeiro.</div>
        ) : (
          <>
            {levels.map(l => (
              <div key={l.id} style={s.item(activeLevelId === l.id)} onClick={() => navigateToLevel(l)}>
                <span>{l.name}</span>
                <button style={s.deleteBtn} onClick={e => handleDeleteLevel(l.id, e)} title="Deletar level">✕</button>
              </div>
            ))}
            {levels.length === 0 && (
              <div style={s.emptyHint}>Nenhum level. Clique em + para criar.</div>
            )}
          </>
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
