// apps/calibrator/src/components/WaveStatsPanel/LevelParamsSliders.tsx
import React from 'react'

interface SliderProps {
  label: string
  name: string
  value: number
  min: number
  max: number
  step: number
  onChange: (name: string, value: number) => void
}

function Slider({ label, name, value, min, max, step, onChange }: SliderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <label htmlFor={name} style={{ color: '#666', fontSize: 9, width: 90 }}>{label}</label>
      <input
        id={name}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(name, parseFloat(e.target.value))}
        style={{ flex: 1 }}
        aria-label={label}
      />
      <span style={{ color: '#eee', fontSize: 9, width: 30, textAlign: 'right' }}>{value}</span>
    </div>
  )
}

interface LevelParamsSlidersProps {
  level: {
    enemySpeed: number; shotDelay: number; fuelDrain: number;
    enemyShotSpeed: number; enemyAngerDelay: number; enemySpawnDelay: number;
  }
  onChange: (name: string, value: number) => void
}

export function LevelParamsSliders({ level, onChange }: LevelParamsSlidersProps) {
  return (
    <div style={{ background: '#2c2c3e', borderRadius: 4, padding: 10 }}>
      <Slider label="Enemy Speed"     name="enemySpeed"      value={level.enemySpeed}      min={1}   max={5}   step={0.1}  onChange={onChange} />
      <Slider label="Shot Delay"      name="shotDelay"       value={level.shotDelay}       min={0.5} max={3.0} step={0.1}  onChange={onChange} />
      <Slider label="Fuel Drain"      name="fuelDrain"       value={level.fuelDrain}       min={1}   max={20}  step={0.5}  onChange={onChange} />
      <Slider label="Shot Speed"      name="enemyShotSpeed"  value={level.enemyShotSpeed}  min={2}   max={8}   step={0.5}  onChange={onChange} />
      <Slider label="Anger Delay"     name="enemyAngerDelay" value={level.enemyAngerDelay} min={5}   max={30}  step={1}    onChange={onChange} />
      <Slider label="Spawn Delay"     name="enemySpawnDelay" value={level.enemySpawnDelay} min={0.3} max={2}   step={0.1}  onChange={onChange} />
    </div>
  )
}
