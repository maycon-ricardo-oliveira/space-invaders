'use client'
import React from 'react'
type Wave = { id: number; levelId: number; order: number; delay: number; grid: unknown; createdAt: Date; updatedAt: Date }
interface WaveChipBarProps {
  waves: Wave[]
  levelId: number
  onSelectWave?: (wave: Wave) => void
}
export function WaveChipBar({ waves, onSelectWave }: WaveChipBarProps) {
  return <div>{waves.map(w => <span key={w.id} onClick={() => onSelectWave?.(w)}>W{w.order}</span>)}</div>
}
