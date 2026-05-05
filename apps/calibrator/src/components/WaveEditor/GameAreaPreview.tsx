// apps/calibrator/src/components/WaveEditor/GameAreaPreview.tsx
import React from 'react'

export function GameAreaPreview() {
  return (
    <div
      style={{
        flex: 1,
        background: '#0a0a14',
        border: '1px dashed #2c2c3e',
        borderRadius: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ color: '#2c2c3e', fontSize: 10 }}>game area — terrain (futuro)</span>
    </div>
  )
}
