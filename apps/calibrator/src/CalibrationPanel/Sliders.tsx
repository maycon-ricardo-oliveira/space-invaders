'use client'
import type { LevelParams } from '@si/level-engine'

interface Props {
  value: LevelParams
  onChange: (params: LevelParams) => void
}

const SLIDER_CONFIG: Array<{
  key: keyof LevelParams
  label: string
  min: number
  max: number
  step: number
}> = [
  { key: 'numberOfEnemies',  label: 'Number of Enemies',              min: 3,   max: 20,  step: 1   },
  { key: 'enemySpeed',       label: 'Enemy Speed',                     min: 1,   max: 5,   step: 0.1 },
  { key: 'enemyShotDelay',   label: 'Enemy Shot Delay (s) ↓=harder',  min: 0.5, max: 3.0, step: 0.1 },
  { key: 'enemyShotSpeed',   label: 'Enemy Shot Speed',                min: 2,   max: 8,   step: 0.5 },
  { key: 'enemyAngerDelay',  label: 'Enemy Anger Delay (s) ↓=harder', min: 5,   max: 30,  step: 1   },
  { key: 'enemySpawnDelay',  label: 'Enemy Spawn Delay (s) ↓=harder', min: 0.3, max: 2,   step: 0.1 },
  { key: 'powerUpMinWait',   label: 'Power-Up Min Wait (s)',           min: 5,   max: 15,  step: 1   },
  { key: 'powerUpMaxWait',   label: 'Power-Up Max Wait (s)',           min: 15,  max: 30,  step: 1   },
]

export function Sliders({ value, onChange }: Props) {
  return (
    <div>
      {SLIDER_CONFIG.map(({ key, label, min, max, step }) => (
        <div key={key} style={{ marginBottom: 8 }}>
          <label htmlFor={key}>{label}</label>
          <input
            id={key}
            type="range"
            min={min}
            max={max}
            step={step}
            value={value[key] as number}
            onChange={(e) =>
              onChange({ ...value, [key]: parseFloat(e.target.value) })
            }
          />
          <span>{(value[key] as number).toFixed(step >= 1 ? 0 : step >= 0.1 ? 1 : 2)}</span>
        </div>
      ))}
      <div>
        <label htmlFor="hasPowerUps">Has Power-Ups</label>
        <input
          id="hasPowerUps"
          type="checkbox"
          checked={value.hasPowerUps}
          onChange={(e) => onChange({ ...value, hasPowerUps: e.target.checked })}
        />
      </div>
    </div>
  )
}
