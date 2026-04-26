# Game Mechanics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix player controls (floating joystick + auto-fire while touching), add invincibility frames after hit, and add HUD overlay (lives + score) to make the game actually playable.

**Architecture:** `GameLoop.ts` already has correct enemy/collision/lives logic — only `GameScreen.tsx` is broken. Two changes: (1) `GameLoop` gains `setFiring(active)` + auto-fire timer + invincibility timer; (2) `GameScreen` replaces three `TouchableOpacity` buttons with a `PanResponder` floating joystick and React Native HUD overlay.

**Tech Stack:** React Native `PanResponder` · React `useRef`/`useState` · TypeScript · jest-expo · @testing-library/react-native

---

## File Map

| File | Change |
|------|--------|
| `apps/game/src/game/types.ts` | Add `invincibilityTimer: number` to player state |
| `apps/game/src/game/GameLoop.ts` | Add `setFiring()`, auto-fire, invincibility; optional `showPlayer` param on `render()` |
| `apps/game/src/__tests__/GameLoop.test.ts` | Add tests for auto-fire, invincibility, render showPlayer; update "3 hits → lost" count |
| `apps/game/src/screens/GameScreen.tsx` | Replace button controls with `PanResponder` joystick + HUD + flash |
| `apps/game/src/__tests__/GameScreen.test.tsx` | Remove button tests; add HUD tests; add `setFiring`/`invincibilityTimer` to mock |

---

## Task 1: Branch setup

- [ ] **Step 1: Create feature branch from master**

```bash
git checkout master
git checkout -b feat/s5-game-mechanics
```

---

## Task 2: GameLoop — auto-fire + invincibility

**Files:**
- Modify: `apps/game/src/game/types.ts`
- Modify: `apps/game/src/game/GameLoop.ts`
- Test: `apps/game/src/__tests__/GameLoop.test.ts`

### Step 1: Write failing tests

Add these test blocks at the end of `apps/game/src/__tests__/GameLoop.test.ts`, before the closing `})` of the file:

```typescript
  describe('auto-fire', () => {
    it('setFiring(true) fires a bullet on first update', () => {
      const loop = new GameLoop(mockLevel)
      loop.setFiring(true)
      loop.update(16)
      expect(loop.getState().playerBullets).toHaveLength(1)
    })

    it('fires a second bullet after AUTO_FIRE_INTERVAL ms', () => {
      const loop = new GameLoop(mockLevel)
      loop.setFiring(true)
      loop.update(16)   // fires bullet 1; timer resets to 400
      loop.update(400)  // timer 400 - 400 = 0 → fires bullet 2
      expect(loop.getState().playerBullets).toHaveLength(2)
    })

    it('setFiring(false) does not fire bullets regardless of updates', () => {
      const loop = new GameLoop(mockLevel)
      loop.setFiring(false)
      for (let i = 0; i < 50; i++) loop.update(16)
      expect(loop.getState().playerBullets).toHaveLength(0)
    })

    it('setFiring(false) stops auto-fire mid-session', () => {
      const loop = new GameLoop(mockLevel)
      loop.setFiring(true)
      loop.update(16)                                   // bullet 1
      loop.setFiring(false)
      const countAfterStop = loop.getState().playerBullets.length
      for (let i = 0; i < 50; i++) loop.update(16)
      expect(loop.getState().playerBullets).toHaveLength(countAfterStop)
    })

    it('re-enabling setFiring fires immediately (timer resets on setFiring false)', () => {
      const loop = new GameLoop(mockLevel)
      loop.setFiring(true)
      loop.update(16)          // bullet 1
      loop.setFiring(false)    // autoFireTimer reset to 0
      loop.setFiring(true)
      loop.update(1)           // timer 0 - 1 = -1 ≤ 0 → bullet 2
      expect(loop.getState().playerBullets).toHaveLength(2)
    })
  })

  describe('invincibility', () => {
    const hitParams = {
      ...BASE_PARAMS,
      numberOfEnemies: 1,
      enemyShotDelay: 0.001,
      enemyShotSpeed: 8,
    }

    it('player starts with invincibilityTimer of 0', () => {
      expect(new GameLoop(mockLevel).getState().player.invincibilityTimer).toBe(0)
    })

    it('player hit sets invincibilityTimer to 1500', () => {
      const loop = new GameLoop({ ...mockLevel, params: hitParams })
      for (let i = 0; i < 200; i++) {
        loop.update(16)
        if (loop.getState().player.invincibilityTimer > 0) break
      }
      expect(loop.getState().player.invincibilityTimer).toBeGreaterThan(0)
    })

    it('invincibility prevents consecutive damage', () => {
      const loop = new GameLoop({ ...mockLevel, params: hitParams })
      // Run until first hit (lives drop from 3 to 2)
      for (let i = 0; i < 200; i++) {
        loop.update(16)
        if (loop.getState().player.lives < 3) break
      }
      expect(loop.getState().player.lives).toBe(2)
      // Immediately after: many bullets in flight, but invincibility blocks them
      loop.update(16)
      expect(loop.getState().player.lives).toBe(2)
    })

    it('invincibilityTimer decrements to 0 after 1500ms', () => {
      const loop = new GameLoop({ ...mockLevel, params: hitParams })
      for (let i = 0; i < 200; i++) {
        loop.update(16)
        if (loop.getState().player.invincibilityTimer > 0) break
      }
      // Fast-forward 1600ms (100 frames × 16ms)
      for (let i = 0; i < 100; i++) loop.update(16)
      expect(loop.getState().player.invincibilityTimer).toBe(0)
    })

    it('player is vulnerable again after invincibility expires', () => {
      const loop = new GameLoop({ ...mockLevel, params: hitParams })
      // First hit
      for (let i = 0; i < 200; i++) {
        loop.update(16)
        if (loop.getState().player.lives < 3) break
      }
      expect(loop.getState().player.lives).toBe(2)
      // Wait out invincibility (1500ms = 94 frames) + travel time for next bullet
      for (let i = 0; i < 200; i++) loop.update(16)
      expect(loop.getState().player.lives).toBeLessThan(2)
    })
  })

  describe('render showPlayer', () => {
    it('does not draw player when showPlayer is false', () => {
      const loop = new GameLoop({ ...mockLevel, params: { ...BASE_PARAMS, numberOfEnemies: 0 } })
      jest.clearAllMocks()
      loop.render(mockRenderer, false)
      expect(mockRenderer.drawRect).not.toHaveBeenCalled()
    })

    it('draws player when showPlayer defaults to true', () => {
      const loop = new GameLoop({ ...mockLevel, params: { ...BASE_PARAMS, numberOfEnemies: 0 } })
      jest.clearAllMocks()
      loop.render(mockRenderer)
      expect(mockRenderer.drawRect).toHaveBeenCalledTimes(1)
    })

    it('draws player when showPlayer is explicitly true', () => {
      const loop = new GameLoop({ ...mockLevel, params: { ...BASE_PARAMS, numberOfEnemies: 0 } })
      jest.clearAllMocks()
      loop.render(mockRenderer, true)
      expect(mockRenderer.drawRect).toHaveBeenCalledTimes(1)
    })
  })
```

Also update the existing `'three enemy bullet hits → status is lost'` test — with invincibility (1500ms per hit), 500 frames is no longer enough. Change `500` to `700`:

```typescript
    it('three enemy bullet hits → status is lost', () => {
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 1, enemyShotDelay: 0.001, enemyShotSpeed: 8 },
      })
      // With invincibility each hit is followed by 1500ms immunity.
      // 3 hits at ~114, ~322, ~530 frames × 16ms ≈ 8480ms; 700 frames (11200ms) is enough.
      for (let i = 0; i < 700; i++) loop.update(16)
      expect(loop.getState().status).toBe('lost')
    })
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /home/maycola/Development/space-invaders && npm test -- --testPathPattern="GameLoop" --no-coverage 2>&1 | tail -30
```

Expected: multiple FAIL lines for `setFiring`, `invincibilityTimer`, `showPlayer` tests.

- [ ] **Step 3: Update types.ts — add invincibilityTimer**

Replace the player type in `apps/game/src/game/types.ts`:

```typescript
export interface Bullet {
  x: number
  y: number
  active: boolean
}

export interface Enemy {
  x: number
  y: number
  alive: boolean
  typeId: string
}

export type GameStatus = 'playing' | 'paused' | 'won' | 'lost'

export interface GameState {
  player: { x: number; y: number; lives: number; invincibilityTimer: number }
  enemies: Enemy[]
  playerBullets: Bullet[]
  enemyBullets: Bullet[]
  score: number
  status: GameStatus
}
```

- [ ] **Step 4: Update GameLoop.ts — full replacement**

Replace the entire content of `apps/game/src/game/GameLoop.ts`:

```typescript
import type { IRenderer, LevelDefinition } from '@si/level-engine'
import type { Bullet, Enemy, GameState } from './types'

export const CANVAS_WIDTH = 390
export const CANVAS_HEIGHT = 844
export const ENTITY_SIZE = 32
export const TOTAL_STORY_LEVELS = 20

const PLAYER_SPEED = 200           // px/s
const BULLET_SPEED = 500           // px/s
const BULLET_WIDTH = 4
const BULLET_HEIGHT = 8
const ENEMY_SPEED_SCALE = 40       // px/s per unit of LevelParams.enemySpeed
const ENEMY_SHOT_SPEED_SCALE = 50  // px/s per unit of LevelParams.enemyShotSpeed
const AUTO_FIRE_INTERVAL = 400     // ms between auto-fire shots
const INVINCIBILITY_DURATION = 1500 // ms of player invincibility after a hit

export class GameLoop {
  private state: GameState
  private enemyDirection = 1 // 1 = right, -1 = left
  private shotCooldown: number
  private readonly params: LevelDefinition['params']
  private isFiring = false
  private autoFireTimer = 0

  constructor(level: LevelDefinition) {
    this.params = level.params
    this.shotCooldown = level.params.enemyShotDelay
    this.state = {
      player: {
        x: CANVAS_WIDTH / 2 - ENTITY_SIZE / 2,
        y: CANVAS_HEIGHT - ENTITY_SIZE - 20,
        lives: 3,
        invincibilityTimer: 0,
      },
      enemies: this.buildEnemies(level),
      playerBullets: [],
      enemyBullets: [],
      score: 0,
      status: 'playing',
    }
  }

  private buildEnemies(level: LevelDefinition): Enemy[] {
    if (level.entities.length > 0) {
      return level.entities.map(e => ({
        x: e.x,
        y: e.y,
        alive: true,
        typeId: e.entityTypeId,
      }))
    }
    const count = level.params.numberOfEnemies
    if (count <= 0) return []
    const cols = Math.min(count, 5)
    const rows = Math.ceil(count / cols)
    const gap = 10
    const totalWidth = cols * ENTITY_SIZE + (cols - 1) * gap
    const startX = Math.round((CANVAS_WIDTH - totalWidth) / 2)
    const enemies: Enemy[] = []
    let placed = 0
    for (let row = 0; row < rows && placed < count; row++) {
      for (let col = 0; col < cols && placed < count; col++) {
        enemies.push({
          x: startX + col * (ENTITY_SIZE + gap),
          y: 60 + row * (ENTITY_SIZE + gap),
          alive: true,
          typeId: 'basic-enemy',
        })
        placed++
      }
    }
    return enemies
  }

  getState(): GameState {
    return {
      player: { ...this.state.player },
      enemies: this.state.enemies.map(e => ({ ...e })),
      playerBullets: this.state.playerBullets.map(b => ({ ...b })),
      enemyBullets: this.state.enemyBullets.map(b => ({ ...b })),
      score: this.state.score,
      status: this.state.status,
    }
  }

  moveLeft(deltaMs: number): void {
    if (this.state.status !== 'playing') return
    this.state.player.x = Math.max(
      0,
      this.state.player.x - (PLAYER_SPEED * deltaMs) / 1000,
    )
  }

  moveRight(deltaMs: number): void {
    if (this.state.status !== 'playing') return
    this.state.player.x = Math.min(
      CANVAS_WIDTH - ENTITY_SIZE,
      this.state.player.x + (PLAYER_SPEED * deltaMs) / 1000,
    )
  }

  /** Called by GameScreen when the player's finger touches or lifts. */
  setFiring(active: boolean): void {
    this.isFiring = active
    if (!active) this.autoFireTimer = 0  // reset so next touch fires immediately
  }

  fire(): void {
    if (this.state.status !== 'playing') return
    this.state.playerBullets.push({
      x: this.state.player.x + ENTITY_SIZE / 2 - BULLET_WIDTH / 2,
      y: this.state.player.y,
      active: true,
    })
  }

  update(deltaMs: number): void {
    if (this.state.status !== 'playing') return
    const dt = deltaMs / 1000
    this.moveBullets(dt)
    this.moveEnemies(dt)
    this.handleEnemyShooting(dt)
    this.checkCollisions()
    this.updateInvincibility(deltaMs)
    this.handleAutoFire(deltaMs)
    this.checkWinLose()
  }

  private moveBullets(dt: number): void {
    for (const b of this.state.playerBullets) {
      if (!b.active) continue
      b.y -= BULLET_SPEED * dt
      if (b.y + BULLET_HEIGHT < 0) b.active = false
    }
    const speed = this.params.enemyShotSpeed * ENEMY_SHOT_SPEED_SCALE
    for (const b of this.state.enemyBullets) {
      if (!b.active) continue
      b.y += speed * dt
      if (b.y > CANVAS_HEIGHT) b.active = false
    }
  }

  private moveEnemies(dt: number): void {
    const speed = this.params.enemySpeed * ENEMY_SPEED_SCALE
    if (speed === 0) return
    const alive = this.state.enemies.filter(e => e.alive)
    if (alive.length === 0) return
    let hitEdge = false
    for (const e of alive) {
      e.x += speed * this.enemyDirection * dt
      if (this.enemyDirection === 1 && e.x + ENTITY_SIZE > CANVAS_WIDTH) hitEdge = true
      if (this.enemyDirection === -1 && e.x < 0) hitEdge = true
    }
    if (hitEdge) {
      this.enemyDirection *= -1
      for (const e of alive) {
        e.y += ENTITY_SIZE
      }
    }
  }

  private handleEnemyShooting(dt: number): void {
    this.shotCooldown -= dt
    if (this.shotCooldown > 0) return
    this.shotCooldown = this.params.enemyShotDelay
    const alive = this.state.enemies.filter(e => e.alive)
    if (alive.length === 0) return
    const shooter = alive[Math.floor(Math.random() * alive.length)]
    this.state.enemyBullets.push({
      x: shooter.x + ENTITY_SIZE / 2 - BULLET_WIDTH / 2,
      y: shooter.y + ENTITY_SIZE,
      active: true,
    })
  }

  private checkCollisions(): void {
    for (const bullet of this.state.playerBullets) {
      if (!bullet.active) continue
      for (const enemy of this.state.enemies) {
        if (!enemy.alive) continue
        if (
          bullet.x < enemy.x + ENTITY_SIZE &&
          bullet.x + BULLET_WIDTH > enemy.x &&
          bullet.y < enemy.y + ENTITY_SIZE &&
          bullet.y + BULLET_HEIGHT > enemy.y
        ) {
          bullet.active = false
          enemy.alive = false
          this.state.score += 100
        }
      }
    }
    const p = this.state.player
    for (const bullet of this.state.enemyBullets) {
      if (!bullet.active) continue
      if (p.invincibilityTimer > 0) continue  // player is invincible — skip
      if (
        bullet.x < p.x + ENTITY_SIZE &&
        bullet.x + BULLET_WIDTH > p.x &&
        bullet.y < p.y + ENTITY_SIZE &&
        bullet.y + BULLET_HEIGHT > p.y
      ) {
        bullet.active = false
        p.lives -= 1
        p.invincibilityTimer = INVINCIBILITY_DURATION
      }
    }
  }

  private updateInvincibility(deltaMs: number): void {
    if (this.state.player.invincibilityTimer > 0) {
      this.state.player.invincibilityTimer = Math.max(
        0,
        this.state.player.invincibilityTimer - deltaMs,
      )
    }
  }

  private handleAutoFire(deltaMs: number): void {
    if (!this.isFiring) return
    this.autoFireTimer -= deltaMs
    if (this.autoFireTimer <= 0) {
      this.fire()
      this.autoFireTimer = AUTO_FIRE_INTERVAL
    }
  }

  private checkWinLose(): void {
    if (this.state.enemies.length > 0 && this.state.enemies.every(e => !e.alive)) {
      this.state.status = 'won'
      return
    }
    if (this.state.player.lives <= 0) {
      this.state.status = 'lost'
    }
  }

  render(renderer: IRenderer, showPlayer = true): void {
    renderer.clear()
    if (showPlayer) {
      renderer.drawRect(
        this.state.player.x,
        this.state.player.y,
        ENTITY_SIZE,
        ENTITY_SIZE,
        '#00ff00',
      )
    }
    for (const enemy of this.state.enemies) {
      if (!enemy.alive) continue
      renderer.drawRect(enemy.x, enemy.y, ENTITY_SIZE, ENTITY_SIZE, '#ff0000')
    }
    for (const b of this.state.playerBullets) {
      if (!b.active) continue
      renderer.drawRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT, '#ffffff')
    }
    for (const b of this.state.enemyBullets) {
      if (!b.active) continue
      renderer.drawRect(b.x, b.y, BULLET_WIDTH, BULLET_HEIGHT, '#ff4444')
    }
  }
}
```

- [ ] **Step 5: Run GameLoop tests — all must pass**

```bash
cd /home/maycola/Development/space-invaders && npm test -- --testPathPattern="GameLoop" --no-coverage 2>&1 | tail -30
```

Expected: all tests PASS. If any fail, fix before continuing.

- [ ] **Step 6: Commit**

```bash
git add apps/game/src/game/types.ts apps/game/src/game/GameLoop.ts apps/game/src/__tests__/GameLoop.test.ts
git commit -m "[GAME] feat(s5): add auto-fire, invincibility frames and showPlayer render flag"
```

---

## Task 3: GameScreen — floating joystick + HUD + flash

**Files:**
- Modify: `apps/game/src/__tests__/GameScreen.test.tsx`
- Modify: `apps/game/src/screens/GameScreen.tsx`

### Step 1: Update GameScreen.test.tsx

Replace the entire file with:

```typescript
jest.mock('@shopify/react-native-skia', () => ({
  Canvas: 'Canvas',
  Picture: 'Picture',
  Skia: {
    Color: jest.fn(c => c),
    Paint: jest.fn(() => ({ setColor: jest.fn() })),
    XYWHRect: jest.fn(() => ({})),
    PictureRecorder: jest.fn(() => ({
      beginRecording: jest.fn(() => ({ clear: jest.fn(), drawRect: jest.fn() })),
      finishRecordingAsPicture: jest.fn(() => ({})),
    })),
  },
}))

// Mutable status used by the GameLoop mock — override per test as needed.
let mockGameStatus = 'playing'

jest.mock('../game/GameLoop', () => ({
  GameLoop: jest.fn().mockImplementation(() => ({
    update: jest.fn(),
    render: jest.fn(),
    fire: jest.fn(),
    setFiring: jest.fn(),
    moveLeft: jest.fn(),
    moveRight: jest.fn(),
    getState: jest.fn().mockImplementation(() => ({
      status: mockGameStatus,
      player: { x: 0, y: 0, lives: 3, invincibilityTimer: 0 },
      enemies: [],
      playerBullets: [],
      enemyBullets: [],
      score: 0,
    })),
  })),
  CANVAS_WIDTH: 390,
  CANVAS_HEIGHT: 844,
  TOTAL_STORY_LEVELS: 20,
}))

import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { GameScreen } from '../screens/GameScreen'

// Prevent the requestAnimationFrame polyfill from firing asynchronously and
// triggering React state updates outside act(). The game loop starts but never
// advances unless we explicitly trigger it (see overlay tests below).
beforeEach(() => {
  jest.spyOn(global, 'requestAnimationFrame').mockReturnValue(0)
  jest.spyOn(global, 'cancelAnimationFrame').mockReturnValue(undefined)
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('GameScreen — renders without crashing', () => {
  beforeEach(() => {
    mockGameStatus = 'playing'
  })

  it('renders without crashing', () => {
    expect(() =>
      render(<GameScreen levelIndex={0} totalLevels={20} onBack={jest.fn()} />),
    ).not.toThrow()
  })
})

describe('GameScreen — HUD', () => {
  beforeEach(() => {
    mockGameStatus = 'playing'
  })

  it('renders lives hearts matching the game state', () => {
    const { getByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={jest.fn()} />,
    )
    expect(getByText('❤️❤️❤️')).toBeTruthy()
  })

  it('renders score matching the game state', () => {
    const { getByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={jest.fn()} />,
    )
    expect(getByText('0')).toBeTruthy()
  })
})

describe('GameScreen — game-over overlay', () => {
  beforeEach(() => {
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      cb(0)
      return 0
    })
  })

  afterEach(() => {
    mockGameStatus = 'playing'
  })

  it('shows "You Win!" overlay when game is won', () => {
    mockGameStatus = 'won'
    const { queryByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={jest.fn()} />,
    )
    expect(queryByText('You Win!')).toBeTruthy()
  })

  it('shows "Game Over" overlay when game is lost', () => {
    mockGameStatus = 'lost'
    const { queryByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={jest.fn()} />,
    )
    expect(queryByText('Game Over')).toBeTruthy()
  })

  it('calls onBack when "Back to Levels" is pressed', () => {
    mockGameStatus = 'won'
    const onBack = jest.fn()
    const { getByText } = render(
      <GameScreen levelIndex={0} totalLevels={20} onBack={onBack} />,
    )
    fireEvent.press(getByText('Back to Levels'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run tests to confirm HUD tests fail**

```bash
cd /home/maycola/Development/space-invaders && npm test -- --testPathPattern="GameScreen" --no-coverage 2>&1 | tail -30
```

Expected: `'renders lives hearts'` and `'renders score'` FAIL. Overlay tests should still PASS.

- [ ] **Step 3: Replace GameScreen.tsx**

Replace the entire content of `apps/game/src/screens/GameScreen.tsx`:

```typescript
import { useCallback, useEffect, useRef, useState } from 'react'
import { PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
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

const DEADZONE = 8
const JOYSTICK_MAX_RADIUS = 40
const KNOB_RADIUS = 20
const FLASH_INTERVAL_MS = 150

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
  const [hud, setHud] = useState({ lives: 3, score: 0 })
  const [joystick, setJoystick] = useState<JoystickState | null>(null)

  const statusRef = useRef<GameStatus>('playing')
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

      setHud({ lives: state.player.lives, score: state.score })

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
    <View style={styles.container} {...panResponder.panHandlers}>
      <Canvas style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}>
        {picture && <Picture picture={picture} />}
      </Canvas>

      {/* HUD overlay — pointer events none so touches fall through to PanResponder */}
      <View style={styles.hudTopLeft} pointerEvents="none">
        <Text style={styles.hudText}>{'❤️'.repeat(Math.max(0, hud.lives))}</Text>
      </View>
      <View style={styles.hudTopRight} pointerEvents="none">
        <Text style={styles.hudText}>{hud.score}</Text>
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

      {/* Game over / win overlay */}
      {!isPlaying && (
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
    top: 8,
    left: 12,
  },
  hudTopRight: {
    position: 'absolute',
    top: 8,
    right: 12,
  },
  hudText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
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
```

- [ ] **Step 4: Run all tests**

```bash
cd /home/maycola/Development/space-invaders && npm test --no-coverage 2>&1 | tail -40
```

Expected: all tests PASS. If TypeScript errors appear, run:

```bash
cd apps/game && npx tsc --noEmit 2>&1
```

- [ ] **Step 5: Commit**

```bash
git add apps/game/src/screens/GameScreen.tsx apps/game/src/__tests__/GameScreen.test.tsx
git commit -m "[GAME] feat(s5): replace button controls with floating joystick, add HUD and player flash"
```

---

## Task 4: Open PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin feat/s5-game-mechanics
```

- [ ] **Step 2: Create PR**

```bash
gh pr create \
  --title "[GAME] feat(s5): game mechanics — floating joystick, auto-fire, invincibility, HUD" \
  --body "$(cat <<'EOF'
## What was done

Replaced the broken three-button controls in `GameScreen.tsx` with a floating virtual joystick (PanResponder). Bullets fire automatically while the finger is on the screen and stop when it lifts. Added invincibility frames (1500ms) after player is hit to prevent cascade damage, a player flash effect during invincibility, and a HUD overlay (lives ❤️ × N and score).

### Files

| File | Responsibility |
|------|---------------|
| `types.ts` | Added `invincibilityTimer: number` to player state |
| `GameLoop.ts` | `setFiring(active)`, auto-fire timer (400ms interval), invincibility timer, optional `showPlayer` param on `render()` |
| `GameScreen.tsx` | `PanResponder` floating joystick, HUD overlay, per-frame flash logic |
| `GameLoop.test.ts` | Auto-fire, invincibility, showPlayer tests; updated 3-hit test frame count |
| `GameScreen.test.tsx` | Removed button tests; added HUD tests; updated mock with `setFiring` + `invincibilityTimer` |

### PR Chain — Sprint 5

1. ✅ **This PR** — game mechanics (joystick + auto-fire + invincibility + HUD)

### How to test / Tests included

- `npm test` — all suites green
- Auto-fire: `setFiring(true)` fires on first update, every 400ms after
- Invincibility: hit sets 1500ms timer, consecutive bullets blocked, timer counts down
- Flash: `render(renderer, false)` skips player drawRect
- HUD: lives ❤️❤️❤️ and score `0` render from initial game state

---
🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 3: Update ROADMAP.md**

In `docs/ROADMAP.md`, find the Sprint 5 entry (or add one) and set status to `🚧 In Progress (PR #N)` where N is the PR number returned by the previous step. Commit in the same step:

```bash
# Replace N with the actual PR number
git add docs/ROADMAP.md
git commit -m "[GAME] docs(s5): mark Sprint 5 game mechanics as In Progress (PR #N)"
git push
```

---

## Self-Review

**Spec coverage:**
- ✅ Floating joystick — PanResponder, whole-screen, base appears at touch point
- ✅ Auto-fire — fires while finger down, stops on lift, 400ms interval
- ✅ Invincibility — 1500ms after hit, blocks consecutive damage
- ✅ Player flash — `render(renderer, showPlayer)` toggles every 150ms during invincibility
- ✅ HUD — ❤️ lives top-left, score top-right
- ✅ Deadzone — ±8px horizontal before movement registers
- ✅ TDD — failing tests written before each implementation step
- ✅ No placeholders — every step has exact code

**Type consistency:**
- `invincibilityTimer` defined in Task 2 Step 3 (types.ts), used in GameLoop.ts Step 4 and GameScreen.tsx Step 3 ✓
- `setFiring(active: boolean)` defined in GameLoop.ts Step 4, called in GameScreen.tsx Step 3 ✓
- `showPlayer = true` default in `render()` — all existing `render(renderer)` calls unaffected ✓
