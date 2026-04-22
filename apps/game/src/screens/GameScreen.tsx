import { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Canvas, Picture, Skia } from '@shopify/react-native-skia'
import type { SkPicture } from '@shopify/react-native-skia'
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
  const [loop] = useState(() => buildLoop(levelIndex, totalLevels))
  const [renderer] = useState(() => new SkiaRenderer(CANVAS_WIDTH, CANVAS_HEIGHT))
  const [status, setStatus] = useState<GameStatus>('playing')
  const [picture, setPicture] = useState<SkPicture | null>(null)

  const statusRef = useRef<GameStatus>('playing')
  const isPlayingRef = useRef(true)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)

  const tick = useCallback(
    (timestamp: number) => {
      if (!isPlayingRef.current) return

      const delta = lastTimeRef.current !== null ? timestamp - lastTimeRef.current : 16
      lastTimeRef.current = timestamp

      const bounds = Skia.XYWHRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      const rec = Skia.PictureRecorder()
      const canvas = rec.beginRecording(bounds)
      renderer.setCanvas(canvas)
      loop.update(delta)
      loop.render(renderer)
      const pic = rec.finishRecordingAsPicture()
      setPicture(pic)

      const s = loop.getState().status
      if (s !== statusRef.current) {
        statusRef.current = s
        setStatus(s)
      }

      if (s === 'playing') {
        rafRef.current = requestAnimationFrame(tick)
      }
    },
    [renderer, loop],
  )

  useEffect(() => {
    isPlayingRef.current = true
    lastTimeRef.current = null
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      isPlayingRef.current = false
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [tick])

  const isPlaying = status === 'playing'

  return (
    <View style={styles.container}>
      <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
        {picture && <Picture picture={picture} />}
      </Canvas>
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
