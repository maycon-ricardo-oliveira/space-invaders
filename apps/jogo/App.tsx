import { StyleSheet, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { Canvas, Rect } from '@shopify/react-native-skia'

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Canvas style={styles.canvas}>
        <Rect x={50} y={100} width={200} height={200} color="lime" />
      </Canvas>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  canvas: { flex: 1 },
})
