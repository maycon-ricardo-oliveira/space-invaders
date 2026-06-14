import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Space Invaders — Calibrator',
  description: 'Wave editor and level calibrator',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning: browser extensions (Grammarly etc.) inject
          attributes like data-gr-ext-installed on <body> before React hydrates.
          Scoped to this element only — does not hide mismatches in children. */}
      <body suppressHydrationWarning style={{ margin: 0, background: '#0d0d1a', color: '#eee', fontFamily: 'monospace' }}>
        {children}
      </body>
    </html>
  )
}
