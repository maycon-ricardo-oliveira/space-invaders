import { useEffect, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import type { LevelSummary } from '@si/level-engine'
import { StoryModeScreen, type LevelSelection } from './src/screens/StoryModeScreen'
import { GameScreen } from './src/screens/GameScreen'
import { TOTAL_STORY_LEVELS } from './src/game/GameLoop'
import { initLevelSource } from './src/levels/source'

type Screen = 'story' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('story')
  const [selection, setSelection] = useState<LevelSelection>({ kind: 'procedural', levelIndex: 0 })
  const [summaries, setSummaries] = useState<LevelSummary[]>([])

  useEffect(() => {
    initLevelSource()
      .then(source => setSummaries(source.listLevels()))
      .catch(error => {
        if (__DEV__) throw error          // fail fast on contract violations in dev
        console.error('levels.json invalid — procedural fallback', error)
        setSummaries([])                   // prod: fallback, game never bricks
      })
  }, [])

  const handleSelectLevel = (sel: LevelSelection) => {
    setSelection(sel)
    setScreen('game')
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {screen === 'story' && <StoryModeScreen summaries={summaries} onSelectLevel={handleSelectLevel} />}
      {screen === 'game' && (
        <GameScreen selection={selection} totalLevels={TOTAL_STORY_LEVELS} onBack={() => setScreen('story')} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
})
