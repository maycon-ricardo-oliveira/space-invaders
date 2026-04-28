import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, PanResponder, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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

interface JoystickState {
  baseX: number
  baseY: number
  currentX: number
  currentY: number
}

const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 44
const HUD_TOP = STATUS_BAR_HEIGHT + 8

const DEADZONE = 8
const JOYSTICK_MAX_RADIUS = 40
const KNOB_RADIUS = 20
const FLASH_INTERVAL_MS = 150
const BAR_WIDTH = 140
const XP_BAR_WIDTH = 180
const XP_BAR_HEIGHT = 6

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
  const [hud, setHud] = useState({ hp: 500, maxHp: 500, fuel: 100, score: 0, xp: 0, xpToNext: 10, playerLevel: 1 })
  const [joystick, setJoystick] = useState<JoystickState | null>(null)

  const statusRef = useRef<GameStatus>('playing')
  const hudRef = useRef({ hp: 500, maxHp: 500, fuel: 100, score: 0, xp: 0, xpToNext: 10, playerLevel: 1 })
  const isPlayingRef = useRef(true)
  const rafRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number | null>(null)
  const joystickRef = useRef<JoystickState | null>(null)
  const flashVisibleRef = useRef(true)
  const flashTimerRef = useRef(0)

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const j: JoystickState = {
          baseX: evt.nativeEvent.pageX,
          baseY: evt.nativeEvent.pageY,
          currentX: evt.nativeEvent.pageX,
          currentY: evt.nativeEvent.pageY,
        }
        joystickRef.current = j
        setJoystick(j)
        loop.setFiring(true)
      },
      onPanResponderMove: (evt) => {
        if (!joystickRef.current) return
        const j: JoystickState = {
          ...joystickRef.current,
          currentX: evt.nativeEvent.pageX,
          currentY: evt.nativeEvent.pageY,
        }
        joystickRef.current = j
        setJoystick(j)
      },
      onPanResponderRelease: () => {
        joystickRef.current = null
        setJoystick(null)
        loop.setFiring(false)
      },
      onPanResponderTerminate: () => {
        joystickRef.current = null
        setJoystick(null)
        loop.setFiring(false)
      },
    }),
  ).current

  const tick = useCallback(
    (timestamp: number) => {
      if (!isPlayingRef.current) return

      const delta = lastTimeRef.current !== null ? timestamp - lastTimeRef.current : 16
      lastTimeRef.current = timestamp

      // Translate joystick horizontal displacement to player movement
      const j = joystickRef.current
      if (j) {
        const dx = j.currentX - j.baseX
        if (dx < -DEADZONE) loop.moveLeft(delta)
        else if (dx > DEADZONE) loop.moveRight(delta)
      }

      loop.update(delta)
      const state = loop.getState()

      // Flash: toggle player visibility during invincibility
      if (state.player.invincibilityTimer > 0) {
        flashTimerRef.current -= delta
        if (flashTimerRef.current <= 0) {
          flashVisibleRef.current = !flashVisibleRef.current
          flashTimerRef.current = FLASH_INTERVAL_MS
        }
      } else {
        flashVisibleRef.current = true
        flashTimerRef.current = 0
      }

      const bounds = Skia.XYWHRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
      const rec = Skia.PictureRecorder()
      const skCanvas = rec.beginRecording(bounds)
      renderer.setCanvas(skCanvas)
      loop.render(renderer, flashVisibleRef.current)
      const pic = rec.finishRecordingAsPicture()
      setPicture(pic)

      const s = state.status
      if (s !== statusRef.current) {
        statusRef.current = s
        setStatus(s)
      }

      const nextHud = {
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        fuel: state.player.fuel,
        score: state.score,
        xp: state.player.xp,
        xpToNext: state.player.xpToNext,
        playerLevel: state.player.playerLevel,
      }
      const prev = hudRef.current
      if (
        nextHud.hp !== prev.hp ||
        nextHud.maxHp !== prev.maxHp ||
        nextHud.fuel !== prev.fuel ||
        nextHud.score !== prev.score ||
        nextHud.xp !== prev.xp ||
        nextHud.xpToNext !== prev.xpToNext ||
        nextHud.playerLevel !== prev.playerLevel
      ) {
        hudRef.current = nextHud
        setHud(nextHud)
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
  const hpPct = hud.maxHp > 0 ? (hud.hp / hud.maxHp) * 100 : 0
  const fuelPct = Math.max(0, Math.min(100, hud.fuel))
  const isGameOver = status === 'won' || status === 'lost' || status === 'fuelEmpty'
  const isCardSelection = status === 'card_selection'

  const xpFillWidth = hud.xpToNext > 0
    ? Math.min(XP_BAR_WIDTH, (hud.xp / hud.xpToNext) * XP_BAR_WIDTH)
    : 0

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
        {picture && <Picture picture={picture} />}
      </Canvas>

      {/* HUD overlay — pointerEvents none so touches fall through to PanResponder */}
      <View style={styles.hudTopLeft} pointerEvents="none">
        <View style={styles.barRow}>
          <View style={[styles.barContainer, { width: BAR_WIDTH }]}>
            <View style={[styles.barFill, { width: `${hpPct}%`, backgroundColor: '#e74c3c' }]} />
          </View>
          <Text style={styles.barLabel}>{Math.round(hud.hp)}</Text>
        </View>
        <View style={styles.barRow}>
          <View style={[styles.barContainer, { width: BAR_WIDTH }]}>
            <View style={[styles.barFill, { width: `${fuelPct}%`, backgroundColor: '#e67e22' }]} />
          </View>
          <Text style={styles.barLabel}>{Math.round(hud.fuel)}</Text>
        </View>
      </View>
      <View style={styles.hudTopRight} pointerEvents="none">
        <Text style={styles.hudText}>{hud.score}</Text>
      </View>

      {/* XP bar */}
      <View style={styles.xpBarContainer} pointerEvents="none">
        <View style={styles.xpBarTrack}>
          <View style={[styles.xpBarFill, { width: xpFillWidth }]} />
        </View>
        <Text style={styles.xpText}>{hud.xp}</Text>
      </View>

      {/* Floating joystick visual */}
      {isPlaying && joystick && (
        <>
          <View
            pointerEvents="none"
            style={[
              styles.joystickBase,
              {
                left: joystick.baseX - JOYSTICK_MAX_RADIUS,
                top: joystick.baseY - JOYSTICK_MAX_RADIUS,
              },
            ]}
          />
          <View
            pointerEvents="none"
            style={[
              styles.joystickKnob,
              {
                left:
                  joystick.baseX +
                  Math.max(
                    -JOYSTICK_MAX_RADIUS,
                    Math.min(JOYSTICK_MAX_RADIUS, joystick.currentX - joystick.baseX),
                  ) -
                  KNOB_RADIUS,
                top:
                  joystick.baseY +
                  Math.max(
                    -JOYSTICK_MAX_RADIUS,
                    Math.min(JOYSTICK_MAX_RADIUS, joystick.currentY - joystick.baseY),
                  ) -
                  KNOB_RADIUS,
              },
            ]}
          />
        </>
      )}

      {/* Card selection overlay */}
      {isCardSelection && (
        <View style={styles.cardOverlay} pointerEvents="box-only">
          <Text style={styles.cardTitle}>{`Level ${hud.playerLevel}!`}</Text>
          <Text style={styles.cardSubtitle}>Cards coming in Sprint 7</Text>
          <TouchableOpacity
            onPress={() => {
              loop.resumeFromCardSelection()
              lastTimeRef.current = null  // reset so first resumed tick uses default delta
              rafRef.current = requestAnimationFrame(tick)
            }}
            style={styles.cardButton}
          >
            <Text style={styles.cardButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Game over / win overlay */}
      {isGameOver && (
        <View style={styles.overlay}>
          <Text style={styles.resultText}>{status === 'won' ? 'You Win!' : 'Game Over'}</Text>
          <TouchableOpacity onPress={onBack} style={styles.button}>
            <Text style={styles.buttonText}>Back to Levels</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', alignItems: 'center' },
  hudTopLeft: {
    position: 'absolute',
    top: HUD_TOP,
    left: 12,
  },
  hudTopRight: {
    position: 'absolute',
    top: HUD_TOP,
    right: 12,
  },
  hudText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  barContainer: {
    height: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 5,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 5,
  },
  barLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
    minWidth: 32,
  },
  xpBarContainer: {
    position: 'absolute',
    top: HUD_TOP + 28,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  xpBarTrack: {
    width: XP_BAR_WIDTH,
    height: XP_BAR_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: XP_BAR_HEIGHT,
    backgroundColor: '#f1c40f',
    borderRadius: 3,
  },
  xpText: { color: '#f1c40f', fontSize: 11, fontWeight: 'bold' },
  joystickBase: {
    position: 'absolute',
    width: JOYSTICK_MAX_RADIUS * 2,
    height: JOYSTICK_MAX_RADIUS * 2,
    borderRadius: JOYSTICK_MAX_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  joystickKnob: {
    position: 'absolute',
    width: KNOB_RADIUS * 2,
    height: KNOB_RADIUS * 2,
    borderRadius: KNOB_RADIUS,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginBottom: 8 },
  cardSubtitle: { color: '#aaa', fontSize: 16, marginBottom: 24 },
  cardButton: { backgroundColor: '#3498db', paddingHorizontal: 32, paddingVertical: 12, borderRadius: 8 },
  cardButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: { color: '#fff', fontSize: 36, fontWeight: 'bold', marginBottom: 24 },
  button: { backgroundColor: '#444', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 18 },
})
