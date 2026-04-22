import { useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Canvas, useCanvasRef, useFrameCallback } from '@shopify/react-native-skia'
import { LevelEngine, CurveCalibratorStrategy } from '@si/level-engine'
import { registerEntities } from '../entities/registerEntities'
import { GameLoop, CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/GameLoop'
import { SkiaRenderer } from '../renderers/SkiaRenderer'
import type { GameStatus } from '../game/types'

interface Props {
  levelIndex: number
  totalLevels: number
  onBack: () => void
}

function buildLoop(levelIndex: number, totalLevels: number): GameLoop {
  const engine = new LevelEngine(new CurveCalibratorStrategy())
  registerEntities(engine)
  const level = engine.generate({ mode: 'story', levelIndex, totalLevels })
  return new GameLoop(level)
}

export function GameScreen({ levelIndex, totalLevels, onBack }: Props) {
  const canvasRef = useCanvasRef()
  const [loop] = useState(() => buildLoop(levelIndex, totalLevels))
  const [renderer] = useState(() => new SkiaRenderer(CANVAS_WIDTH, CANVAS_HEIGHT))
  const [status, setStatus] = useState<GameStatus>('playing')
  const isPlaying = status === 'playing'

  useFrameCallback(({ timeSincePreviousFrame }) => {
    const surface = canvasRef.current
    if (!surface) return
    const canvas = (surface as any).getCanvas?.() ?? surface
    renderer.setCanvas(canvas as any)
    loop.update(timeSincePreviousFrame ?? 16)
    loop.render(renderer)
    ;(surface as any).flush?.()
    const s = loop.getState().status
    if (s !== 'playing') setStatus(s)
  }, isPlaying)

  return (
    <View style={styles.container}>
      <Canvas ref={canvasRef} style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }} />
      {!isPlaying && (
        <View style={styles.overlay}>
          <Text style={styles.resultText}>{status === 'won' ? 'You Win!' : 'Game Over'}</Text>
          <TouchableOpacity onPress={onBack} style={styles.button}>
            <Text style={styles.buttonText}>Back to Levels</Text>
          </TouchableOpacity>
        </View>
      )}
      {isPlaying && (
        <View style={styles.controls}>
          <TouchableOpacity onPress={() => loop.moveLeft(16)} style={styles.controlBtn}>
            <Text style={styles.controlText}>◀</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => loop.fire()} style={styles.controlBtn}>
            <Text style={styles.controlText}>🔥</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => loop.moveRight(16)} style={styles.controlBtn}>
            <Text style={styles.controlText}>▶</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginBottom: 24 },
  button: { backgroundColor: '#444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 18 },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: CANVAS_WIDTH,
    paddingVertical: 16,
    backgroundColor: '#111',
  },
  controlBtn: { padding: 16 },
  controlText: { color: '#fff', fontSize: 32 },
})
