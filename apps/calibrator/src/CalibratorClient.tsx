'use client'
import { useState } from 'react'
import type { EntityType, LevelDefinition } from '@si/level-engine'
import { Sliders } from './CalibrationPanel/Sliders'
import { DifficultyScore } from './CalibrationPanel/DifficultyScore'
import { Toolbox } from './MapEditor/Toolbox'
import { Grid } from './MapEditor/Grid'
import { PropertiesPanel } from './MapEditor/PropertiesPanel'
import { saveLevels } from '../app/actions'

const ENTITY_TYPES: EntityType[] = [
  { id: 'basic-enemy', label: 'Basic Enemy', icon: '👾', properties: { pointValue: 100, health: 1 } },
  { id: 'fast-enemy',  label: 'Fast Enemy',  icon: '🚀', properties: { pointValue: 200, health: 1 } },
  { id: 'tank-enemy',  label: 'Tank Enemy',  icon: '🛡️', properties: { pointValue: 500, health: 3 } },
]

interface Props {
  initialLevels: LevelDefinition[]
}

export function CalibratorClient({ initialLevels }: Props) {
  const [levels, setLevels] = useState<LevelDefinition[]>(initialLevels)
  const [levelIndex, setLevelIndex] = useState(0)
  const [selectedEntityTypeId, setSelectedEntityTypeId] = useState<string | null>(null)
  const [selectedEntityIndex, setSelectedEntityIndex] = useState<number | null>(null)

  const current = levels[levelIndex]

  function updateCurrentLevel(patch: Partial<LevelDefinition>) {
    setLevels((prev) =>
      prev.map((l, i) => (i === levelIndex ? { ...l, ...patch } : l)),
    )
  }

  function handlePlace(placement: { entityTypeId: string; x: number; y: number }) {
    setLevels((prev) =>
      prev.map((l, i) => (i === levelIndex ? { ...l, entities: [...l.entities, placement] } : l))
    )
  }

  function handleRemove(index: number) {
    setLevels((prev) =>
      prev.map((l, i) =>
        i === levelIndex ? { ...l, entities: l.entities.filter((_, ei) => ei !== index) } : l
      )
    )
    setSelectedEntityIndex(null)
  }

  const selectedEntity =
    selectedEntityIndex !== null ? current.entities[selectedEntityIndex] ?? null : null

  return (
    <div style={{ display: 'flex', gap: 16, padding: 16, background: '#111', color: '#eee', minHeight: '100vh' }}>
      {/* Left column — level selector + calibration panel */}
      <div style={{ width: 280 }}>
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="level-select">Level: </label>
          <select
            id="level-select"
            value={levelIndex}
            onChange={(e) => {
              setLevelIndex(Number(e.target.value))
              setSelectedEntityIndex(null)
            }}
          >
            {levels.map((_, i) => (
              <option key={i} value={i}>
                Level {i + 1}
              </option>
            ))}
          </select>
        </div>

        <DifficultyScore levelIndex={levelIndex} totalLevels={levels.length} />

        <Sliders
          value={current.params}
          onChange={(params) => updateCurrentLevel({ params })}
        />

        <button
          aria-label="Save"
          style={{ marginTop: 16, padding: '8px 20px', background: '#4CAF50', color: '#fff', border: 'none', cursor: 'pointer' }}
          onClick={() => { saveLevels(levels).catch((err) => console.error('Failed to save levels:', err)) }}
        >
          Save
        </button>
      </div>

      {/* Center — map grid */}
      <div>
        <Grid
          entities={current.entities}
          selectedEntityTypeId={selectedEntityTypeId}
          onPlace={handlePlace}
          onRemove={handleRemove}
        />
      </div>

      {/* Right column — toolbox + properties */}
      <div style={{ width: 180 }}>
        <Toolbox
          entityTypes={ENTITY_TYPES}
          selectedId={selectedEntityTypeId}
          onSelect={setSelectedEntityTypeId}
        />
        <PropertiesPanel entity={selectedEntity} onChange={() => {}} />
      </div>
    </div>
  )
}
