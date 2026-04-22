import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { TOTAL_STORY_LEVELS } from '../game/GameLoop'

interface Props {
  onSelectLevel: (levelIndex: number) => void
}

const levels = Array.from({ length: TOTAL_STORY_LEVELS }, (_, i) => i)

export function StoryModeScreen({ onSelectLevel }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Story Mode</Text>
      <ScrollView>
        {levels.map(i => (
          <TouchableOpacity key={i} onPress={() => onSelectLevel(i)} style={styles.row}>
            <Text style={styles.levelText}>Level {i + 1}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', paddingTop: 60 },
  title: { color: '#fff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 24 },
  row: { paddingVertical: 14, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#222' },
  levelText: { color: '#fff', fontSize: 18 },
})
