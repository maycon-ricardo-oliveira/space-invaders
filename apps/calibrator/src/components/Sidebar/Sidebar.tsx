'use client'
import React from 'react'
type World = { id: number; name: string; index: number; image: string | null; parallaxTheme: string | null; createdAt: Date; updatedAt: Date }
interface SidebarProps {
  worlds: World[]
  selectedWorldId?: number
  selectedPhaseId?: number
}
export function Sidebar({ worlds }: SidebarProps) {
  return <nav style={{ width: 140 }}>{worlds.map(w => <div key={w.id}>{w.name}</div>)}</nav>
}
