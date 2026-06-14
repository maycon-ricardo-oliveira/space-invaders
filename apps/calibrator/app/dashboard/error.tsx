'use client'

// Error boundary for the dashboard segment. Server actions rethrow clean PT-BR
// messages (see app/actions/*.actions.ts) — this surfaces them with a retry,
// instead of a bare spinner or a crashed tree.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        height: '100%',
        padding: 32,
        textAlign: 'center',
      }}
    >
      <h2 style={{ margin: 0, fontSize: 18 }}>Algo deu errado no dashboard</h2>
      <p style={{ margin: 0, color: '#a00', maxWidth: 480 }}>
        {error.message || 'Erro inesperado.'}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        style={{
          padding: '8px 16px',
          border: '1px solid #888',
          borderRadius: 4,
          cursor: 'pointer',
        }}
      >
        Tentar novamente
      </button>
    </div>
  )
}
