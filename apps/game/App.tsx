import { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { StoryModeScreen } from './src/screens/StoryModeScreen'
import { GameScreen } from './src/screens/GameScreen'
import { TOTAL_STORY_LEVELS } from './src/game/GameLoop'

type Screen = 'story' | 'game'

export default function App() {
  const [screen, setScreen] = useState<Screen>('story')
  const [levelIndex, setLevelIndex] = useState(0)

  const handleSelectLevel = (index: number) => {
    setLevelIndex(index)
    setScreen('game')
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {screen === 'story' && <StoryModeScreen onSelectLevel={handleSelectLevel} />}
      {screen === 'game' && (
        <GameScreen
          levelIndex={levelIndex}
          totalLevels={TOTAL_STORY_LEVELS}
          onBack={() => setScreen('story')}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
})
