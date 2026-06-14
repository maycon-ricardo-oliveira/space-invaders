import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import type { LevelSummary } from '@si/level-engine'
import { TOTAL_STORY_LEVELS } from '../game/GameLoop'

export type LevelSelection = { kind: 'authored'; levelId: string } | { kind: 'procedural'; levelIndex: number }

interface Props {
  summaries: LevelSummary[]
  onSelectLevel: (selection: LevelSelection) => void
}

const fallbackLevels = Array.from({ length: TOTAL_STORY_LEVELS }, (_, i) => i)

export function StoryModeScreen({ summaries, onSelectLevel }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Story Mode</Text>
      <ScrollView>
        {summaries.length > 0
          ? summaries.map(s => (
              <TouchableOpacity key={s.id} onPress={() => onSelectLevel({ kind: 'authored', levelId: s.id })} style={styles.row}>
                <Text style={styles.levelText}>{`Fase ${s.phaseIndex} — Level ${s.levelIndex}`}</Text>
              </TouchableOpacity>
            ))
          : fallbackLevels.map(i => (
              <TouchableOpacity key={i} onPress={() => onSelectLevel({ kind: 'procedural', levelIndex: i })} style={styles.row}>
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
