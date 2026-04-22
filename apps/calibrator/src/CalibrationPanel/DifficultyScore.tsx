interface Props {
  levelIndex: number
  totalLevels: number
}

export function DifficultyScore({ levelIndex, totalLevels }: Props) {
  const score =
    totalLevels <= 1 ? 100 : Math.round((levelIndex / (totalLevels - 1)) * 100)

  return (
    <div>
      <span>Score: {score}</span>
      <div style={{ background: '#333', height: 8, width: '100%', borderRadius: 4, marginTop: 4 }}>
        <div
          style={{
            background: '#4CAF50',
            height: '100%',
            width: `${score}%`,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  )
}
