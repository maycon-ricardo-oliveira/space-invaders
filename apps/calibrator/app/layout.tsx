import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Space Invaders — Calibrator',
  description: 'Wave editor and level calibrator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#0d0d1a', color: '#eee', fontFamily: 'monospace' }}>
        {children}
      </body>
    </html>
  )
}
