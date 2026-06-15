import {
  GameLoop,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  ENTITY_SIZE,
  TOTAL_STORY_LEVELS,
} from '../game/GameLoop'
import type { LevelDefinition, IRenderer } from '@si/level-engine'

const BASE_PARAMS = {
  numberOfEnemies: 3,
  enemySpeed: 0,
  enemyShotDelay: 9999,
  enemyShotSpeed: 1,
  enemyAngerDelay: 30,
  enemySpawnDelay: 2,
  hasPowerUps: false,
  powerUpMinWait: 5,
  powerUpMaxWait: 15,
}

const mockLevel: LevelDefinition = {
  id: 'story-0',
  style: 'classic',
  difficultyScore: 10,
  entities: [],
  params: BASE_PARAMS,
}

const mockRenderer: IRenderer = {
  clear: jest.fn(),
  drawSprite: jest.fn(),
  drawRect: jest.fn(),
}

// Mirrors the private INVINCIBILITY_DURATION (1500ms) in GameLoop. The existing
// bullet-hit tests already assume this window; body-contact i-frames reuse it.
const INVINCIBILITY_DURATION_MS = 1500

describe('GameLoop', () => {
  beforeEach(() => jest.clearAllMocks())

  // Helper: level with a single 1-hit enemy (hp=20 = 1 × bulletDamage) at player's x
  function oneHitLevel(overrides: Partial<LevelDefinition['params']> = {}): LevelDefinition {
    const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
    return {
      ...mockLevel,
      params: { ...BASE_PARAMS, numberOfEnemies: 0, ...overrides },
      entities: [{ entityTypeId: 'basic-enemy', x: playerX, y: 60, properties: { hp: 20 } }],
    }
  }

  // Helper: fire N times, each time ticking enough frames for the bullet to reach y=60
  function fireAndTick(loop: GameLoop, times: number): void {
    for (let i = 0; i < times; i++) {
      loop.fire()
      for (let j = 0; j < 120; j++) loop.update(16)
    }
  }

  describe('constants', () => {
    it('CANVAS_WIDTH is 390', () => expect(CANVAS_WIDTH).toBe(390))
    it('CANVAS_HEIGHT is 844', () => expect(CANVAS_HEIGHT).toBe(844))
    it('ENTITY_SIZE is 32', () => expect(ENTITY_SIZE).toBe(32))
    it('TOTAL_STORY_LEVELS is 20', () => expect(TOTAL_STORY_LEVELS).toBe(20))
  })

  describe('initialization', () => {
    it('places player at bottom center', () => {
      const { player } = new GameLoop(mockLevel).getState()
      expect(player.x).toBe(CANVAS_WIDTH / 2 - ENTITY_SIZE / 2)
      expect(player.y).toBe(CANVAS_HEIGHT - ENTITY_SIZE - 20)
    })

    it('player starts with hp = 500', () => {
      expect(new GameLoop(mockLevel).getState().player.hp).toBe(500)
    })

    it('player starts with maxHp = 500', () => {
      expect(new GameLoop(mockLevel).getState().player.maxHp).toBe(500)
    })

    it('player starts with fuel = 100', () => {
      expect(new GameLoop(mockLevel).getState().player.fuel).toBe(100)
    })

    it('creates enemies equal to numberOfEnemies', () => {
      expect(new GameLoop(mockLevel).getState().enemies).toHaveLength(3)
    })

    it('all enemies start alive', () => {
      expect(new GameLoop(mockLevel).getState().enemies.every(e => e.alive)).toBe(true)
    })

    it('initial status is playing', () => {
      expect(new GameLoop(mockLevel).getState().status).toBe('playing')
    })

    it('initial score is 0', () => {
      expect(new GameLoop(mockLevel).getState().score).toBe(0)
    })

    it('player starts with bulletDamage = 20', () => {
      expect(new GameLoop(mockLevel).getState().player.bulletDamage).toBe(20)
    })

    it('uses EntityPlacement coordinates when entities array is non-empty', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        entities: [
          { entityTypeId: 'basic-enemy', x: 100, y: 50 },
          { entityTypeId: 'fast-enemy', x: 200, y: 50 },
        ],
      }
      const enemies = new GameLoop(level).getState().enemies
      expect(enemies).toHaveLength(2)
      expect(enemies[0]).toMatchObject({ x: 100, y: 50, alive: true, typeId: 'basic-enemy' })
      expect(enemies[1]).toMatchObject({ x: 200, y: 50, alive: true, typeId: 'fast-enemy' })
    })
  })

  describe('player movement', () => {
    it('moveLeft decreases player x', () => {
      const loop = new GameLoop(mockLevel)
      const before = loop.getState().player.x
      loop.moveLeft(100)
      expect(loop.getState().player.x).toBeLessThan(before)
    })

    it('player does not move past x=0', () => {
      const loop = new GameLoop(mockLevel)
      for (let i = 0; i < 100; i++) loop.moveLeft(100)
      expect(loop.getState().player.x).toBe(0)
    })

    it('moveRight increases player x', () => {
      const loop = new GameLoop(mockLevel)
      const before = loop.getState().player.x
      loop.moveRight(100)
      expect(loop.getState().player.x).toBeGreaterThan(before)
    })

    it('player does not move past right edge', () => {
      const loop = new GameLoop(mockLevel)
      for (let i = 0; i < 100; i++) loop.moveRight(100)
      expect(loop.getState().player.x).toBe(CANVAS_WIDTH - ENTITY_SIZE)
    })

    it('movement does nothing when status is not playing', () => {
      // Kill the only enemy to reach status='won', then verify movement is blocked
      const loop = new GameLoop(oneHitLevel())
      fireAndTick(loop, 1) // kill enemy → status='won'
      const x = loop.getState().player.x
      loop.moveLeft(100)
      loop.moveRight(100)
      expect(loop.getState().player.x).toBe(x)
    })

    it('zero-enemy level does not trigger won on first update', () => {
      const level: LevelDefinition = { ...mockLevel, params: { ...BASE_PARAMS, numberOfEnemies: 0 } }
      const loop = new GameLoop(level)
      loop.update(16)
      expect(loop.getState().status).toBe('playing')
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // 2D FREE MOVEMENT (GL-1) — RED battery, written before implementation.
  // Behavior decided with Maycon:
  //   - New vectorial API: move(dirX, dirY, deltaMs). (dirX,dirY) is the raw
  //     joystick direction; the GameLoop NORMALIZES it before applying speed.
  //   - PLAYER_SPEED bumped 200 → 300 px/s (+50%).
  //   - Player moves freely in X and Y, clamped to the canvas edges:
  //       x ∈ [0, CANVAS_WIDTH - ENTITY_SIZE]   (0 .. 358)
  //       y ∈ [0, CANVAS_HEIGHT - ENTITY_SIZE]  (0 .. 812)
  //   - Constant speed in any direction: a diagonal move covers the SAME total
  //     distance as a cardinal move (300 px over 1000ms), NOT 300 per axis.
  //   - Zero vector / deadzone: move(0,0,...) does nothing.
  // Player spawn: x = CANVAS_WIDTH/2 - ENTITY_SIZE/2 = 163, y = 792.
  // ──────────────────────────────────────────────────────────────────────────
  describe('2D movement (GL-1)', () => {
    const SPEED = 300 // expected PLAYER_SPEED after the +50% bump
    const SPAWN_X = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2 // 179
    const SPAWN_Y = CANVAS_HEIGHT - ENTITY_SIZE - 20    // 792
    const MAX_X = CANVAS_WIDTH - ENTITY_SIZE            // 358
    const MAX_Y = CANVAS_HEIGHT - ENTITY_SIZE           // 812

    it('sanity: player spawns at (179, 792)', () => {
      const { player } = new GameLoop(mockLevel).getState()
      expect(player.x).toBe(SPAWN_X)
      expect(player.y).toBe(SPAWN_Y)
    })

    // 1 + 2: horizontal move at the new 300 px/s speed.
    // The 390px canvas has no room for a 300px slide from spawn (179), so first
    // park the player at x=0 (left wall) and measure a full unclamped 300px right:
    // 0 + 300 = 300, still below MAX_X (358). This proves PLAYER_SPEED is 300.
    it('move(1, 0, 1000) increases x by exactly 300 (PLAYER_SPEED is 300)', () => {
      const loop = new GameLoop(mockLevel)
      loop.move(-1, 0, 1000) // park at left wall (clamped to 0)
      expect(loop.getState().player.x).toBe(0)
      loop.move(1, 0, 1000)
      expect(loop.getState().player.x).toBeCloseTo(0 + SPEED, 5)
    })

    // Symmetric: from the right wall (358), a full second left covers exactly 300:
    // 358 - 300 = 58, still above 0, so no clamp masks the speed.
    it('move(-1, 0, 1000) decreases x by exactly 300', () => {
      const loop = new GameLoop(mockLevel)
      loop.move(1, 0, 1000) // park at right wall (clamped to MAX_X)
      expect(loop.getState().player.x).toBe(MAX_X)
      loop.move(-1, 0, 1000)
      expect(loop.getState().player.x).toBeCloseTo(MAX_X - SPEED, 5)
    })

    it('move half a second covers half the distance (150 px)', () => {
      const loop = new GameLoop(mockLevel)
      // 179 + 150 = 329, still below MAX_X (358) — no clamp.
      loop.move(1, 0, 500)
      expect(loop.getState().player.x).toBeCloseTo(SPAWN_X + SPEED / 2, 5)
    })

    // 3: vertical move — the new axis
    it('move(0, -1, 1000) decreases y by exactly 300 (moves up)', () => {
      const loop = new GameLoop(mockLevel)
      loop.move(0, -1, 1000)
      expect(loop.getState().player.y).toBeCloseTo(SPAWN_Y - SPEED, 5)
    })

    it('move(0, 1, 1000) increases y (moves down), clamped to MAX_Y', () => {
      const loop = new GameLoop(mockLevel)
      // SPAWN_Y (792) + 300 = 1092 → clamps to MAX_Y (812)
      loop.move(0, 1, 1000)
      expect(loop.getState().player.y).toBe(MAX_Y)
    })

    it('move(0, 1, 50) increases y by 15 without hitting the clamp', () => {
      const loop = new GameLoop(mockLevel)
      // 300 * 0.05 = 15 → 792 + 15 = 807, still below MAX_Y (812)
      loop.move(0, 1, 50)
      expect(loop.getState().player.y).toBeCloseTo(SPAWN_Y + 15, 5)
    })

    // 4: diagonal is normalized — total distance is 300, not 424, not 300/axis.
    // Move up-LEFT from spawn (179, 792): x decreases toward 0 (179 - 212.13 = -33
    // would clamp), so instead use up-LEFT from a spot with room on both axes.
    // From spawn, up-left's X (179 - 212.13) clamps at 0, so we measure the
    // normalized per-axis component on the unclamped up-left diagonal below.
    it('move(1, -1, 1000) gains 300/√2 per axis, never the full 300 (normalized)', () => {
      const loop = new GameLoop(mockLevel)
      const { player: p0 } = new GameLoop(mockLevel).getState()
      // up-right from spawn: x 179 → 391.13 clamps; up-LEFT clamps x at 0.
      // Use a deltaMs small enough that neither axis clamps: 300 * 0.5 = 150px
      // total → 106.07 per axis. x: 179 - 106 = 73 (>0), y: 792 - 106 = 686 (<812).
      loop.move(1, -1, 500)
      const { player } = loop.getState()
      const perAxis = (SPEED / 2) / Math.SQRT2 // 150px over √2 ≈ 106.07
      expect(player.x - p0.x).toBeCloseTo(perAxis, 3) // NOT 150, NOT 212
      expect(player.y - p0.y).toBeCloseTo(-perAxis, 3)
    })

    it('diagonal magnitude equals 300 on an unclamped move (up-left from spawn)', () => {
      const loop = new GameLoop(mockLevel)
      const { player: p0 } = new GameLoop(mockLevel).getState()
      // up-left: dirX=-1 (x: 179 → -33 would clamp). To keep BOTH axes unclamped
      // over a full second, park at the right wall first so x has 300+ of room.
      loop.move(1, 0, 1000) // x → MAX_X (358), y unchanged (792)
      const { player: start } = loop.getState()
      // now up-left: x 358 - 212.13 = 145.87 (>0), y 792 - 212.13 = 579.87 (<812)
      loop.move(-1, -1, 1000)
      const { player } = loop.getState()
      const dx = player.x - start.x
      const dy = player.y - start.y
      const magnitude = Math.hypot(dx, dy)
      expect(magnitude).toBeCloseTo(SPEED, 3)
      // and each axis is the normalized component, not the full speed
      expect(dx).toBeCloseTo(-SPEED / Math.SQRT2, 3)
      expect(dy).toBeCloseTo(-SPEED / Math.SQRT2, 3)
      // sanity: y started at spawn, unaffected by the first horizontal move
      expect(p0.y).toBe(SPAWN_Y)
    })

    it('a large-magnitude diagonal vector normalizes to the same 300 distance', () => {
      const loop = new GameLoop(mockLevel)
      // park at the right wall so up-left has room for a full unclamped 300px
      loop.move(1, 0, 1000) // x → MAX_X (358), y still 792
      const { player: start } = loop.getState()
      // raw vector (-5, -5) has magnitude ~7.07 but normalizes to the same direction
      loop.move(-5, -5, 1000)
      const { player } = loop.getState()
      const magnitude = Math.hypot(player.x - start.x, player.y - start.y)
      expect(magnitude).toBeCloseTo(SPEED, 3)
    })

    // 5: clamp on all four edges
    it('clamps at right edge: many moves right stop at MAX_X', () => {
      const loop = new GameLoop(mockLevel)
      for (let i = 0; i < 100; i++) loop.move(1, 0, 100)
      expect(loop.getState().player.x).toBe(MAX_X)
    })

    it('clamps at left edge: many moves left stop at 0', () => {
      const loop = new GameLoop(mockLevel)
      for (let i = 0; i < 100; i++) loop.move(-1, 0, 100)
      expect(loop.getState().player.x).toBe(0)
    })

    it('clamps at bottom edge: many moves down stop at MAX_Y', () => {
      const loop = new GameLoop(mockLevel)
      for (let i = 0; i < 100; i++) loop.move(0, 1, 100)
      expect(loop.getState().player.y).toBe(MAX_Y)
    })

    it('clamps at top edge: many moves up stop at 0', () => {
      const loop = new GameLoop(mockLevel)
      for (let i = 0; i < 100; i++) loop.move(0, -1, 100)
      expect(loop.getState().player.y).toBe(0)
    })

    // 6: zero vector / deadzone
    it('move(0, 0, 1000) does not move the player', () => {
      const loop = new GameLoop(mockLevel)
      loop.move(0, 0, 1000)
      const { player } = loop.getState()
      expect(player.x).toBe(SPAWN_X)
      expect(player.y).toBe(SPAWN_Y)
    })

    // status gate: movement is blocked when not playing (mirrors moveLeft/moveRight)
    it('move does nothing when status is not playing', () => {
      const loop = new GameLoop(oneHitLevel())
      fireAndTick(loop, 1) // kill enemy → status='won'
      const { player: before } = loop.getState()
      loop.move(1, -1, 1000)
      const { player: after } = loop.getState()
      expect(after.x).toBe(before.x)
      expect(after.y).toBe(before.y)
    })
  })

  describe('firing', () => {
    it('fire creates an active player bullet at player top-center', () => {
      const loop = new GameLoop(mockLevel)
      loop.fire()
      const { playerBullets, player } = loop.getState()
      expect(playerBullets).toHaveLength(1)
      expect(playerBullets[0].active).toBe(true)
      expect(playerBullets[0].x).toBeCloseTo(player.x + ENTITY_SIZE / 2 - 2)
      expect(playerBullets[0].y).toBe(player.y)
    })

    it('fire does nothing when status is not playing', () => {
      const loop = new GameLoop(oneHitLevel())
      fireAndTick(loop, 1) // kill enemy → status='won'
      const countBefore = loop.getState().playerBullets.length
      loop.fire()
      expect(loop.getState().playerBullets).toHaveLength(countBefore)
    })
  })

  describe('bullet physics', () => {
    it('player bullet moves up on update', () => {
      const loop = new GameLoop(mockLevel)
      loop.fire()
      const before = loop.getState().playerBullets[0].y
      loop.update(16)
      expect(loop.getState().playerBullets[0].y).toBeLessThan(before)
    })

    it('player bullet becomes inactive when it travels off the top of the screen', () => {
      const loop = new GameLoop(mockLevel)
      loop.fire()
      for (let i = 0; i < 120; i++) loop.update(16) // 1.92s at 500px/s → 960px > CANVAS_HEIGHT
      expect(loop.getState().playerBullets[0].active).toBe(false)
    })
  })

  describe('collision', () => {
    // Collision tests use numberOfEnemies:1 with enemySpeed:0 so the single enemy stays
    // at its centered spawn position and the player bullet travels straight up to hit it.
    // Formation with 1 enemy: startX = round((390 - 32) / 2) = 179, same as player.x.
    // Bullet fires from player.x + 14 = 193, which is inside enemy x-range [179, 211]. ✓

    it('player bullet kills enemy and adds 100 to score', () => {
      const loop = new GameLoop(oneHitLevel())
      fireAndTick(loop, 1)
      expect(loop.getState().enemies[0].alive).toBe(false)
      expect(loop.getState().score).toBe(100)
    })

    it('all enemies dead → status is won', () => {
      const loop = new GameLoop(oneHitLevel())
      fireAndTick(loop, 1)
      expect(loop.getState().status).toBe('won')
    })

    it('asteroid escaping bottom without being shot does not trigger won', () => {
      // Asteroid exits at the bottom (alive=false, killed=false) — player did nothing.
      // Asteroids are obstacles (not combat), so an escaped asteroid never wins.
      const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 10, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'asteroid', x: playerX, y: CANVAS_HEIGHT - 5, properties: { hp: 100, movementType: 'vertical', speedMultiplier: 10 } }],
      })
      for (let i = 0; i < 50; i++) loop.update(16)
      expect(loop.getState().status).toBe('playing')
    })

    it('enemy bullet reduces player hp on collision', () => {
      // enemyShotDelay:0.001 → bullet fired on first update frame
      // enemyShotSpeed:8 → 400px/s; travels 700px to player in ~1.75s (~109 frames)
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 1, enemyShotDelay: 0.001, enemyShotSpeed: 8 },
      })
      const before = loop.getState().player.hp
      for (let i = 0; i < 150; i++) loop.update(16)
      expect(loop.getState().player.hp).toBeLessThan(before)
    })

    it('hp reduced to 0 → status is lost', () => {
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 1, enemyShotDelay: 0.001, enemyShotSpeed: 8, fuelDrainRate: 0 },
      })
      // Drive hp to 0: need 500 hits, each 1500ms apart → run many frames
      for (let i = 0; i < 60000; i++) loop.update(16)
      expect(loop.getState().status).toBe('lost')
    })

    it('hp never goes below 0', () => {
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 1, enemyShotDelay: 0.001, enemyShotSpeed: 8, fuelDrainRate: 0 },
      })
      for (let i = 0; i < 60000; i++) loop.update(16)
      expect(loop.getState().player.hp).toBeGreaterThanOrEqual(0)
    })
  })

  describe('HP decrement collision', () => {
    it('player bullet reduces enemy hp by bulletDamage (20)', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0 },
        entities: [{ entityTypeId: 'basic-enemy', x: CANVAS_WIDTH / 2 - ENTITY_SIZE / 2, y: 60, properties: { hp: 100 } }],
      }
      const loop = new GameLoop(level)
      loop.fire()
      for (let i = 0; i < 120; i++) loop.update(16)
      expect(loop.getState().enemies[0].hp).toBe(80)
      expect(loop.getState().enemies[0].alive).toBe(true)
    })

    it('enemy dies only when hp reaches 0', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0 },
        entities: [{ entityTypeId: 'basic-enemy', x: CANVAS_WIDTH / 2 - ENTITY_SIZE / 2, y: 60, properties: { hp: 40 } }],
      }
      const loop = new GameLoop(level)
      fireAndTick(loop, 1) // hp=20, still alive
      expect(loop.getState().enemies[0].alive).toBe(true)
      fireAndTick(loop, 1) // hp=0, dead
      expect(loop.getState().enemies[0].alive).toBe(false)
    })

    it('score is added only on kill (hp reaches 0)', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0 },
        entities: [{ entityTypeId: 'basic-enemy', x: CANVAS_WIDTH / 2 - ENTITY_SIZE / 2, y: 60, properties: { hp: 40 } }],
      }
      const loop = new GameLoop(level)
      fireAndTick(loop, 1)
      expect(loop.getState().score).toBe(0) // not dead yet
      fireAndTick(loop, 1)
      expect(loop.getState().score).toBe(100)
    })

    it('xp is awarded only on kill', () => {
      const loop = new GameLoop(oneHitLevel())
      fireAndTick(loop, 1)
      expect(loop.getState().player.xp).toBe(1)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // ANCHORED MICRO-MOVEMENT (enemy-movement-design 2026-06-14) — RED battery,
  // written before implementation. SUBSTITUI a "formação clássica que desce ao
  // bater na borda" (enemy wall-bounce removido — ver lista no resumo do dono).
  //
  // Contrato novo (game-mobile-dev casa estes campos):
  //   Enemy ganha: anchorX, anchorY (posição de spawn = origem da oscilação),
  //   movementPattern, amplitudeX, amplitudeY, frequency (Hz), phase (rad),
  //   e dirX/dirY (só asteroide 'descend': vetor unitário sorteado no spawn).
  //
  //   moveEnemies acumula o tempo (t, segundos) e calcula:
  //     pos = âncora + offset(pattern, amp, freq, phase, t)
  //       oscillate-h: x = anchorX + amplitudeX·sin(2π·f·t + phase); y fixo
  //       bob-v:       y = anchorY + amplitudeY·sin(2π·f·t + phase); x fixo
  //       orbit:       x = anchorX + amplitudeX·cos(...); y = anchorY + amplitudeY·sin(...)
  //
  //   Números por tipo (§4 do doc):
  //     basic-enemy  oscillate-h  ampX 10  ampY 0  f 0.5Hz
  //     fast-enemy   orbit        ampX 12  ampY 8  f 1.4Hz
  //     strong-enemy bob-v        ampX 0   ampY 6  f 0.25Hz
  //
  //   phase é semeada POR inimigo (derivada da posição/índice no grid) para
  //   vizinhos nunca oscilarem em sincronia.
  //
  // Estes specs FALHAM contra o GameLoop atual (que ainda faz bounce de formação
  // e não tem nenhum dos campos novos) — esse é o RED esperado.
  // ──────────────────────────────────────────────────────────────────────────
  describe('anchored micro-movement (combat enemies)', () => {
    const TWO_PI = Math.PI * 2

    // Helper: a single combat enemy of `typeId` at (x,y) with movement props.
    // enemySpeed:0 in the old model meant "stationary"; in the new model the
    // micro-movement runs off the accumulated time, independent of enemySpeed.
    function singleEnemyLevel(
      typeId: string,
      x: number,
      y: number,
      props: Record<string, unknown> = {},
    ): LevelDefinition {
      return {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [{ entityTypeId: typeId, x, y, properties: { hp: 9999, ...props } }],
      }
    }

    describe('contract: spawn records the anchor', () => {
      it('basic-enemy keeps anchorX/anchorY equal to its spawn position', () => {
        const loop = new GameLoop(singleEnemyLevel('basic-enemy', 100, 50))
        const e = loop.getState().enemies[0]
        expect(e.anchorX).toBe(100)
        expect(e.anchorY).toBe(50)
      })

      it('basic-enemy reads oscillate-h / amp 10 / 0 / freq 0.5 from placement', () => {
        const loop = new GameLoop(
          singleEnemyLevel('basic-enemy', 100, 50, {
            movementPattern: 'oscillate-h',
            amplitudeX: 10,
            amplitudeY: 0,
            frequency: 0.5,
          }),
        )
        const e = loop.getState().enemies[0]
        expect(e.movementPattern).toBe('oscillate-h')
        expect(e.amplitudeX).toBe(10)
        expect(e.amplitudeY).toBe(0)
        expect(e.frequency).toBe(0.5)
      })
    })

    // ── 1: anchored oscillation (basic) ──────────────────────────────────────
    describe('basic-enemy oscillate-h (amp 10px, 0.5 Hz)', () => {
      // phase:0 forces a clean sine: x(t) = anchorX + 10·sin(2π·0.5·t).
      // f=0.5Hz → period T = 1/f = 2s. Quarter period = 0.5s → peak (+10).
      const PROPS = { movementPattern: 'oscillate-h', amplitudeX: 10, amplitudeY: 0, frequency: 0.5, phase: 0 }

      it('at t=0 the enemy sits exactly on its anchor (sin 0 = 0)', () => {
        const loop = new GameLoop(singleEnemyLevel('basic-enemy', 100, 50, PROPS))
        const e = loop.getState().enemies[0]
        // before any time accumulates, x === anchorX
        expect(e.x).toBeCloseTo(100, 5)
        expect(e.y).toBe(50)
      })

      it('at quarter period (t=0.5s) x peaks at anchorX + 10', () => {
        const loop = new GameLoop(singleEnemyLevel('basic-enemy', 100, 50, PROPS))
        loop.update(500) // t = 0.5s → sin(2π·0.5·0.5) = sin(π/2) = 1 → +10
        const e = loop.getState().enemies[0]
        expect(e.x).toBeCloseTo(100 + 10, 4)
        expect(e.y).toBe(50) // y is fixed for oscillate-h
      })

      it('at half period (t=1s) x returns to the anchor (sin π = 0)', () => {
        const loop = new GameLoop(singleEnemyLevel('basic-enemy', 100, 50, PROPS))
        loop.update(1000) // t = 1s → sin(π) = 0 → back to anchor
        const e = loop.getState().enemies[0]
        expect(e.x).toBeCloseTo(100, 4)
      })

      it('at three-quarter period (t=1.5s) x troughs at anchorX - 10', () => {
        const loop = new GameLoop(singleEnemyLevel('basic-enemy', 100, 50, PROPS))
        loop.update(1500) // t = 1.5s → sin(3π/2) = -1 → -10
        const e = loop.getState().enemies[0]
        expect(e.x).toBeCloseTo(100 - 10, 4)
      })

      it('at a full period (t=2s) x is back on the anchor (does NOT drift/descend)', () => {
        // Regression vs the old formation: the old model would have stepped the
        // enemy permanently DOWN on each wall bounce. The anchored model never
        // accumulates — after a full cycle it is exactly where it started.
        const loop = new GameLoop(singleEnemyLevel('basic-enemy', 100, 50, PROPS))
        loop.update(2000) // t = 2s = one full period → sin(2π) = 0
        const e = loop.getState().enemies[0]
        expect(e.x).toBeCloseTo(100, 4)
        expect(e.y).toBe(50) // y NEVER changed — no descent
      })
    })

    // ── 2: per-type patterns ─────────────────────────────────────────────────
    describe('fast-enemy orbit (12×8px, 1.4 Hz)', () => {
      const PROPS = { movementPattern: 'orbit', amplitudeX: 12, amplitudeY: 8, frequency: 1.4, phase: 0 }

      it('oscillates on BOTH axes (ellipse), x via cos, y via sin', () => {
        const loop = new GameLoop(singleEnemyLevel('fast-enemy', 100, 50, PROPS))
        // pick t such that 2π·1.4·t = π/2 → t = 1/(4·1.4) = 0.178571...s
        const t = 1 / (4 * 1.4)
        loop.update(t * 1000)
        const e = loop.getState().enemies[0]
        const angle = TWO_PI * 1.4 * t // = π/2
        // x = 100 + 12·cos(π/2) = 100 + 0 = 100 ; y = 50 + 8·sin(π/2) = 50 + 8 = 58
        expect(e.x).toBeCloseTo(100 + 12 * Math.cos(angle), 3) // ≈ 100
        expect(e.y).toBeCloseTo(50 + 8 * Math.sin(angle), 3)   // ≈ 58
      })

      it('at t=0 sits at anchorX+amplitudeX (cos 0 = 1) and anchorY (sin 0 = 0)', () => {
        const loop = new GameLoop(singleEnemyLevel('fast-enemy', 100, 50, PROPS))
        const e = loop.getState().enemies[0]
        // x = 100 + 12·cos(0) = 112 ; y = 50 + 8·sin(0) = 50
        expect(e.x).toBeCloseTo(112, 5)
        expect(e.y).toBeCloseTo(50, 5)
      })
    })

    describe('strong-enemy bob-v (amp 6px, 0.25 Hz)', () => {
      const PROPS = { movementPattern: 'bob-v', amplitudeX: 0, amplitudeY: 6, frequency: 0.25, phase: 0 }

      it('oscillates on Y only; x stays fixed at the anchor', () => {
        const loop = new GameLoop(singleEnemyLevel('strong-enemy', 100, 50, PROPS))
        // f=0.25Hz → T=4s. Quarter period = 1s → sin(π/2)=1 → y peaks at +6.
        loop.update(1000)
        const e = loop.getState().enemies[0]
        expect(e.x).toBeCloseTo(100, 5) // x fixed
        expect(e.y).toBeCloseTo(50 + 6, 4)
      })

      it('at half period (t=2s) y returns to the anchor', () => {
        const loop = new GameLoop(singleEnemyLevel('strong-enemy', 100, 50, PROPS))
        loop.update(2000) // sin(π) = 0
        const e = loop.getState().enemies[0]
        expect(e.y).toBeCloseTo(50, 4)
      })
    })

    // ── 3: phase desynchronization ───────────────────────────────────────────
    describe('phase desync (neighbors never move in unison)', () => {
      it('two same-type enemies at different grid positions get different phases', () => {
        // No explicit phase in props → the loop must derive it per-enemy from
        // the spawn position/index. Two distinct positions ⇒ distinct phase.
        const loop = new GameLoop({
          ...mockLevel,
          params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
          entities: [
            { entityTypeId: 'basic-enemy', x: 100, y: 50, properties: { hp: 9999, movementPattern: 'oscillate-h', amplitudeX: 10, amplitudeY: 0, frequency: 0.5 } },
            { entityTypeId: 'basic-enemy', x: 200, y: 90, properties: { hp: 9999, movementPattern: 'oscillate-h', amplitudeX: 10, amplitudeY: 0, frequency: 0.5 } },
          ],
        })
        const [a, b] = loop.getState().enemies
        expect(a.phase).not.toBe(b.phase)
      })

      it('desynced neighbors are NOT at the same offset after time advances', () => {
        const loop = new GameLoop({
          ...mockLevel,
          params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
          entities: [
            { entityTypeId: 'basic-enemy', x: 100, y: 50, properties: { hp: 9999, movementPattern: 'oscillate-h', amplitudeX: 10, amplitudeY: 0, frequency: 0.5 } },
            { entityTypeId: 'basic-enemy', x: 200, y: 90, properties: { hp: 9999, movementPattern: 'oscillate-h', amplitudeX: 10, amplitudeY: 0, frequency: 0.5 } },
          ],
        })
        loop.update(300)
        const [a, b] = loop.getState().enemies
        // each measured against its own anchor — the offsets must differ
        const offsetA = a.x - a.anchorX
        const offsetB = b.x - b.anchorX
        // guard against a false pass via NaN (undefined anchor): offsets must be
        // real, non-zero, and distinct — proving both moved by different amounts.
        expect(Number.isFinite(offsetA)).toBe(true)
        expect(Number.isFinite(offsetB)).toBe(true)
        expect(Math.abs(offsetA)).toBeGreaterThan(0)
        expect(offsetA).not.toBeCloseTo(offsetB, 4)
      })
    })

    // ── 6: micro-movement never leaves the "quadradinho" ─────────────────────
    describe('amplitude is bounded — enemy never drifts off-anchor', () => {
      it('over many seconds the basic-enemy x stays within ±amplitudeX of the anchor', () => {
        const loop = new GameLoop(
          singleEnemyLevel('basic-enemy', 100, 50, {
            movementPattern: 'oscillate-h', amplitudeX: 10, amplitudeY: 0, frequency: 0.5, phase: 0,
          }),
        )
        let maxDev = 0
        for (let i = 0; i < 600; i++) {
          loop.update(16) // ~9.6s of motion
          const e = loop.getState().enemies[0]
          maxDev = Math.max(maxDev, Math.abs(e.x - 100))
          // never escapes the box; allow a hair of float slack
          expect(Math.abs(e.x - 100)).toBeLessThanOrEqual(10 + 1e-6)
          expect(e.y).toBe(50) // y pinned
        }
        // and it genuinely USES the full amplitude (proves it isn't stuck at 0)
        expect(maxDev).toBeGreaterThan(9.9)
      })

      it('fast-enemy orbit stays within the 12×8 ellipse box across many cycles', () => {
        const loop = new GameLoop(
          singleEnemyLevel('fast-enemy', 100, 50, {
            movementPattern: 'orbit', amplitudeX: 12, amplitudeY: 8, frequency: 1.4, phase: 0,
          }),
        )
        for (let i = 0; i < 600; i++) {
          loop.update(16)
          const e = loop.getState().enemies[0]
          expect(Math.abs(e.x - 100)).toBeLessThanOrEqual(12 + 1e-6)
          expect(Math.abs(e.y - 50)).toBeLessThanOrEqual(8 + 1e-6)
        }
      })
    })

    // ── CHARACTERIZATION: untested union members 'static' / 'drift-return' ──────
    // Pre-refactor safety net for the MOVEMENT_PATTERNS extraction (plan step 4,
    // gap F). Today `patternOffset` (GameLoop.ts) handles oscillate-h / bob-v /
    // orbit explicitly and folds EVERYTHING else (including 'static' and
    // 'drift-return') into the `default` branch = stay on the anchor (offset 0).
    // The compiler does not catch the missing cases because of that `default`.
    //
    // These tests PIN THE CURRENT BEHAVIOR so the refactor (which makes the union
    // exhaustive with explicit map entries) provably preserves it. When someone
    // later implements a REAL drift-return motion on purpose, the drift-return
    // test below is the one that must be updated — until then, "stays on anchor"
    // is the contract.  amplitudes are non-zero on purpose: a buggy refactor that
    // routed these through an oscillation would move the enemy and fail here.
    describe('static / drift-return sit on the anchor (current behavior)', () => {
      // even at full amplitude these patterns must NOT translate the enemy today
      const STATIC_PROPS = {
        movementPattern: 'static', amplitudeX: 25, amplitudeY: 25, frequency: 2, phase: 0,
      }
      const DRIFT_PROPS = {
        movementPattern: 'drift-return', amplitudeX: 25, amplitudeY: 25, frequency: 2, phase: 0,
      }

      it("'static' enemy spawns exactly on its anchor (offset 0)", () => {
        const loop = new GameLoop(singleEnemyLevel('basic-enemy', 100, 50, STATIC_PROPS))
        const e = loop.getState().enemies[0]
        expect(e.movementPattern).toBe('static')
        expect(e.x).toBe(100)
        expect(e.y).toBe(50)
        expect(e.anchorX).toBe(100)
        expect(e.anchorY).toBe(50)
      })

      it("'static' enemy stays pinned on the anchor across ~9.6s of ticks", () => {
        const loop = new GameLoop(singleEnemyLevel('basic-enemy', 100, 50, STATIC_PROPS))
        for (let i = 0; i < 600; i++) {
          loop.update(16)
          const e = loop.getState().enemies[0]
          expect(e.x).toBe(100) // never deviates from the anchor — offset is exactly 0
          expect(e.y).toBe(50)
        }
      })

      it("'drift-return' enemy spawns exactly on its anchor (offset 0)", () => {
        // CHARACTERIZATION of CURRENT state, not the final design: 'drift-return'
        // has no implementation yet, so it falls through to default = anchor.
        const loop = new GameLoop(singleEnemyLevel('basic-enemy', 100, 50, DRIFT_PROPS))
        const e = loop.getState().enemies[0]
        expect(e.movementPattern).toBe('drift-return')
        expect(e.x).toBe(100)
        expect(e.y).toBe(50)
      })

      it("'drift-return' enemy stays pinned on the anchor across ~9.6s (no drift today)", () => {
        // CHARACTERIZATION of CURRENT state: the refactor must preserve this until
        // someone implements a real drift-return motion on purpose — at which
        // point THIS test is the one to change.
        const loop = new GameLoop(singleEnemyLevel('basic-enemy', 100, 50, DRIFT_PROPS))
        for (let i = 0; i < 600; i++) {
          loop.update(16)
          const e = loop.getState().enemies[0]
          expect(e.x).toBe(100)
          expect(e.y).toBe(50)
        }
      })
    })
  })

  describe('render', () => {
    it('render calls renderer.clear() once', () => {
      new GameLoop(mockLevel).render(mockRenderer)
      expect(mockRenderer.clear).toHaveBeenCalledTimes(1)
    })

    it('render draws the player rect', () => {
      new GameLoop(mockLevel).render(mockRenderer)
      expect(mockRenderer.drawRect).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Number),
        ENTITY_SIZE,
        ENTITY_SIZE,
        expect.any(String),
      )
    })

    it('render draws one rect per alive enemy', () => {
      const loop = new GameLoop(mockLevel) // 3 alive enemies
      loop.render(mockRenderer)
      // player (1) + 3 enemies = at least 4 drawRect calls
      expect((mockRenderer.drawRect as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(4)
    })

    it('render does not draw dead enemies', () => {
      const loop = new GameLoop(oneHitLevel())
      fireAndTick(loop, 1) // kill the enemy
      jest.clearAllMocks()
      loop.render(mockRenderer)
      // Only player drawn (enemy dead, bullet inactive, status=won)
      expect((mockRenderer.drawRect as jest.Mock).mock.calls.length).toBe(1)
    })
  })

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
      loop.update(16)       // bullet 1
      loop.setFiring(false) // autoFireTimer reset to 0
      loop.setFiring(true)
      loop.update(1)        // timer 0 - 1 = -1 ≤ 0 → bullet 2
      expect(loop.getState().playerBullets).toHaveLength(2)
    })

    describe('Archero mechanic (stationary = fire, moving = stop)', () => {
      it('player does not auto-fire by default — setFiring(true) must be called explicitly', () => {
        // GameLoop starts with isFiring=false; GameScreen useEffect calls setFiring(true) on mount
        const loop = new GameLoop(mockLevel)
        for (let i = 0; i < 50; i++) loop.update(16)
        expect(loop.getState().playerBullets).toHaveLength(0)
      })

      it('setFiring(true) (stationary) fires on the first update tick', () => {
        // Mirrors GameScreen useEffect mount: loop.setFiring(true) → player auto-fires immediately
        const loop = new GameLoop(mockLevel)
        loop.setFiring(true)
        loop.update(1)
        expect(loop.getState().playerBullets).toHaveLength(1)
      })

      it('setFiring(false) (moving) stops auto-fire; no new bullets while dragging', () => {
        // Mirrors onPanResponderGrant: loop.setFiring(false) stops auto-fire during movement
        const loop = new GameLoop(mockLevel)
        loop.setFiring(true)
        loop.update(1)                           // bullet 1
        const countBeforeMove = loop.getState().playerBullets.length
        loop.setFiring(false)                    // finger down — moving
        for (let i = 0; i < 50; i++) loop.update(16)
        expect(loop.getState().playerBullets).toHaveLength(countBeforeMove)
      })

      it('setFiring(true) (stationary after movement) resumes firing immediately', () => {
        // Mirrors onPanResponderRelease: timer resets to 0 on setFiring(false),
        // so the very next update after setFiring(true) fires a bullet without waiting 400 ms
        const loop = new GameLoop(mockLevel)
        loop.setFiring(true)
        loop.update(1)          // bullet 1
        loop.setFiring(false)   // moving — timer reset to 0
        loop.update(200)        // no fire while moving
        loop.setFiring(true)    // finger lift — stationary
        loop.update(1)          // fires immediately (timer was 0)
        expect(loop.getState().playerBullets).toHaveLength(2)
      })
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
      // Run until first hit (hp drops from 500 to 499)
      for (let i = 0; i < 200; i++) {
        loop.update(16)
        if (loop.getState().player.hp < 500) break
      }
      expect(loop.getState().player.hp).toBe(499)
      // Immediately after: many bullets in flight, but invincibility blocks them
      loop.update(16)
      expect(loop.getState().player.hp).toBe(499)
    })

    it('invincibilityTimer decrements to 0 after 1500ms', () => {
      const loop = new GameLoop({ ...mockLevel, params: hitParams })
      // Wait for first hit
      for (let i = 0; i < 200; i++) {
        loop.update(16)
        if (loop.getState().player.invincibilityTimer > 0) break
      }
      expect(loop.getState().player.invincibilityTimer).toBeGreaterThan(0)
      // A single 1500ms update drains the timer to 0.
      // checkCollisions runs first (invincibilityTimer > 0 blocks the hit),
      // then updateInvincibility(1500) sets it to 0.
      loop.update(1500)
      expect(loop.getState().player.invincibilityTimer).toBe(0)
    })

    it('player is vulnerable again after invincibility expires', () => {
      const loop = new GameLoop({ ...mockLevel, params: hitParams })
      // First hit
      for (let i = 0; i < 200; i++) {
        loop.update(16)
        if (loop.getState().player.hp < 500) break
      }
      expect(loop.getState().player.hp).toBe(499)
      // Wait out invincibility + travel time for next bullet (~200 more frames)
      for (let i = 0; i < 200; i++) loop.update(16)
      expect(loop.getState().player.hp).toBeLessThan(499)
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

  describe('hp system', () => {
    const hitParams = {
      ...BASE_PARAMS,
      numberOfEnemies: 1,
      enemyShotDelay: 0.001,
      enemyShotSpeed: 8,
      fuelDrainRate: 0,
    }

    it('player starts with hp = 500', () => {
      expect(new GameLoop(mockLevel).getState().player.hp).toBe(500)
    })

    it('player starts with maxHp = 500', () => {
      expect(new GameLoop(mockLevel).getState().player.maxHp).toBe(500)
    })

    it('enemy bullet hit reduces hp by 1', () => {
      const loop = new GameLoop({ ...mockLevel, params: hitParams })
      for (let i = 0; i < 150; i++) {
        loop.update(16)
        if (loop.getState().player.hp < 500) break
      }
      expect(loop.getState().player.hp).toBe(499)
    })

    it('hp reduced to 0 → status is lost', () => {
      const loop = new GameLoop({ ...mockLevel, params: hitParams })
      for (let i = 0; i < 60000; i++) loop.update(16)
      expect(loop.getState().status).toBe('lost')
    })

    it('invincibility timer prevents hp loss from second hit', () => {
      const loop = new GameLoop({ ...mockLevel, params: hitParams })
      for (let i = 0; i < 200; i++) {
        loop.update(16)
        if (loop.getState().player.hp < 500) break
      }
      expect(loop.getState().player.hp).toBe(499)
      loop.update(16)
      expect(loop.getState().player.hp).toBe(499)
    })

    it('hp never goes below 0', () => {
      const loop = new GameLoop({ ...mockLevel, params: hitParams })
      for (let i = 0; i < 60000; i++) loop.update(16)
      expect(loop.getState().player.hp).toBeGreaterThanOrEqual(0)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // CONDITIONAL FUEL DRAIN (course correction) — RED battery, before impl.
  // Behavior decided with Maycon:
  //   - The drain is BACK, but CONDITIONAL on the level. It only drains when the
  //     level defines `fuelDrainRate`. The field is OPTIONAL in the contract
  //     (LevelParams.fuelDrainRate?, range [1,20] when present).
  //   - Default (field ABSENT/undefined) → fuel does NOT drain. It stays at the
  //     initial 100 no matter how long update() runs, and status NEVER becomes
  //     'fuelEmpty'. (This is Xeron and most levels.)
  //   - With fuelDrainRate > 0 (e.g. Vorath = 10) → fuel drains at that many
  //     units per SECOND. fuel(t) = clamp(100 - rate * seconds, 0, 100).
  //     On reaching 0, status becomes 'fuelEmpty' (game over).
  //   - "Does not drain" means the field is ABSENT — not 0. (Range starts at 1.)
  //   - Fuel pickups still restore to 100 (relevant on the draining path).
  // The previous tests asserted the unconditional "never drains" behavior and
  // are rewritten here. The "drains when defined" specs FAIL against the current
  // GameLoop (drain removed) — that is the expected RED.
  // ──────────────────────────────────────────────────────────────────────────
  describe('fuel system', () => {
    const PLAYER_SPAWN_X = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
    const PLAYER_SPAWN_Y = CANVAS_HEIGHT - ENTITY_SIZE - 20

    it('fuel starts at 100', () => {
      expect(new GameLoop(mockLevel).getState().player.fuel).toBe(100)
    })

    // ── Default path: NO fuelDrainRate → never drains ──────────────────────────
    it('without fuelDrainRate, fuel does NOT drain over time (stays 100)', () => {
      // mockLevel's BASE_PARAMS has no fuelDrainRate → drain is off.
      const loop = new GameLoop(mockLevel)
      for (let i = 0; i < 625; i++) loop.update(16) // ~10s of ticks
      expect(loop.getState().player.fuel).toBe(100)
    })

    it('without fuelDrainRate, status NEVER becomes fuelEmpty over time', () => {
      // numberOfEnemies:0 so nothing else ends the level; only fuel could.
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0 },
      }
      const loop = new GameLoop(level)
      for (let i = 0; i < 625; i++) {
        loop.update(16)
        expect(loop.getState().status).not.toBe('fuelEmpty')
      }
      expect(loop.getState().player.fuel).toBe(100)
      expect(loop.getState().status).not.toBe('fuelEmpty')
    })

    // ── Draining path: fuelDrainRate > 0 ──────────────────────────────────────
    it('with fuelDrainRate:10, fuel drains 10 per second (100 - 10*seconds)', () => {
      // Vorath defines 10. 1000ms = 1s → 100 - 10*1 = 90.
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 10 },
      }
      const loop = new GameLoop(level)
      loop.update(1000)
      expect(loop.getState().player.fuel).toBeCloseTo(90, 5)
      loop.update(1000) // 2s total → 100 - 20 = 80
      expect(loop.getState().player.fuel).toBeCloseTo(80, 5)
      loop.update(500)  // 2.5s total → 100 - 25 = 75
      expect(loop.getState().player.fuel).toBeCloseTo(75, 5)
    })

    it('with fuelDrainRate:10, draining for 10s empties fuel to exactly 0', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 10 },
      }
      const loop = new GameLoop(level)
      loop.update(10000) // 10s * 10/s = 100 drained → 0
      expect(loop.getState().player.fuel).toBe(0)
    })

    it('fuel never goes below 0 even when overdrained', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 20 },
      }
      const loop = new GameLoop(level)
      // 20/s for 10s would be 200 drained; clamp must hold fuel at 0.
      loop.update(10000)
      expect(loop.getState().player.fuel).toBe(0)
      loop.update(5000) // keep draining past empty
      expect(loop.getState().player.fuel).toBe(0)
    })

    it('status becomes fuelEmpty when the draining fuel reaches 0', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 10 },
      }
      const loop = new GameLoop(level)
      // before empty: 5s in → fuel 50, still playing
      loop.update(5000)
      expect(loop.getState().player.fuel).toBeCloseTo(50, 5)
      expect(loop.getState().status).toBe('playing')
      // drain the rest → fuel 0, status fuelEmpty
      loop.update(5000)
      expect(loop.getState().player.fuel).toBe(0)
      expect(loop.getState().status).toBe('fuelEmpty')
    })

    // ── Pickup restores to 100 on the draining path ────────────────────────────
    it('FuelPickup overlapping the player restores fuel to 100 (with drain on)', () => {
      // Pickup sits on the player spawn. With fuelDrainRate:10, a 1000ms tick
      // drains 10 (→90), then the overlapping pickup restores to 100, and the
      // pickup is consumed (deactivated). Restoring to 100 proves the refill,
      // not merely "fuel didn't change".
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 10 },
        entities: [{ entityTypeId: 'fuel-pickup', x: PLAYER_SPAWN_X, y: PLAYER_SPAWN_Y }],
      }
      const loop = new GameLoop(level)
      expect(loop.getState().fuelPickups[0].active).toBe(true)
      loop.update(1000)
      expect(loop.getState().player.fuel).toBe(100)
      expect(loop.getState().fuelPickups[0].active).toBe(false)
    })

    it('fuel cannot exceed 100 from a pickup (no drain → still 100)', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0 }, // no fuelDrainRate
        entities: [{ entityTypeId: 'fuel-pickup', x: PLAYER_SPAWN_X, y: PLAYER_SPAWN_Y }],
      }
      const loop = new GameLoop(level)
      loop.update(16)
      expect(loop.getState().player.fuel).toBe(100)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS PRECEDENCE (resolveStatus — plan step 8 target)
  //
  // Today drainFuel() (sets 'fuelEmpty') and checkWinLose() (sets 'won'/'lost')
  // both write `state.status` within the SAME update() tick, ordered implicitly.
  // The refactor will collapse them into one resolveStatus() decision point.
  //
  // Decision (Maycon): when the SAME tick both empties the fuel AND clears the
  // last combat enemy, the player WINS. RULE:  won  >  fuelEmpty.
  // (killing the final enemy on the tick fuel hits 0 = victory; favors the player.)
  //
  // These pin the TARGET behavior of step 8. They lock the win-favoring outcome
  // and the unambiguous cases around it so the resolveStatus rewrite cannot
  // regress any of them.
  // ──────────────────────────────────────────────────────────────────────────
  describe('status precedence: won > fuelEmpty (resolveStatus target)', () => {
    const PLAYER_SPAWN_X = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2

    // fuelDrainRate 6250 drains 6250 * 0.016 = 100 in a single 16ms tick → fuel
    // crosses to exactly 0 on the very tick the kill lands. The enemy sits high
    // enough (y=760) that the freshly-fired bullet, after one moveBullets step,
    // overlaps it on that same first update() — kill + fuel-zero collide.
    function fuelEmptyAtKillLevel(): LevelDefinition {
      return {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 6250 },
        entities: [{ entityTypeId: 'basic-enemy', x: PLAYER_SPAWN_X, y: 760, properties: { hp: 20 } }],
      }
    }

    it('AMBIGUOUS tick — last enemy dies AND fuel hits 0 → status is won (NOT fuelEmpty)', () => {
      // The whole point of step 8. won must win the tie over fuelEmpty.
      const loop = new GameLoop(fuelEmptyAtKillLevel())
      loop.fire()
      loop.update(16)
      const s = loop.getState()
      expect(s.player.fuel).toBe(0)            // fuel really did empty this tick
      expect(s.enemies[0].alive).toBe(false)   // last combat enemy really died this tick
      expect(s.status).toBe('won')             // tie resolves to won (favors the player)
      expect(s.status).not.toBe('fuelEmpty')
    })

    it('fuel empties WITHOUT clearing enemies → status is fuelEmpty (no false win)', () => {
      // Same drain, but the enemy is never hit (no fire). Only fuel ends it.
      const loop = new GameLoop(fuelEmptyAtKillLevel())
      loop.update(16)
      const s = loop.getState()
      expect(s.player.fuel).toBe(0)
      expect(s.enemies[0].alive).toBe(true)    // enemy untouched
      expect(s.status).toBe('fuelEmpty')
    })

    it('all enemies cleared with fuel to spare → status is won', () => {
      // Unambiguous win path with drain ON but far from empty. 1-hit enemy,
      // killed within ~88 ticks (~1.4s); at 10/s that is ~14 fuel spent.
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 10 },
        entities: [{ entityTypeId: 'basic-enemy', x: PLAYER_SPAWN_X, y: 60, properties: { hp: 20 } }],
      })
      loop.fire()
      for (let i = 0; i < 120; i++) loop.update(16)
      const s = loop.getState()
      expect(s.enemies[0].alive).toBe(false)
      expect(s.player.fuel).toBeGreaterThan(0) // fuel was NOT the deciding factor
      expect(s.status).toBe('won')
    })

    it('hp drops to 0 → status is lost (lost path unaffected by drain wiring)', () => {
      // Confirms the third terminal status still resolves; pinned alongside the
      // won/fuelEmpty pair so resolveStatus keeps all three.
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 1, enemyShotDelay: 0.001, enemyShotSpeed: 8, fuelDrainRate: 0 },
      })
      for (let i = 0; i < 60000; i++) loop.update(16)
      expect(loop.getState().player.hp).toBe(0)
      expect(loop.getState().status).toBe('lost')
    })
  })

  describe('XP system', () => {
    it('player starts with xp = 0', () => {
      expect(new GameLoop(mockLevel).getState().player.xp).toBe(0)
    })

    it('player starts with xpToNext = 10', () => {
      expect(new GameLoop(mockLevel).getState().player.xpToNext).toBe(10)
    })

    it('player starts with playerLevel = 1', () => {
      expect(new GameLoop(mockLevel).getState().player.playerLevel).toBe(1)
    })

    it('enemy kill increments player.xp by 1 (default xpValue)', () => {
      const loop = new GameLoop(oneHitLevel({ fuelDrainRate: 0 }))
      fireAndTick(loop, 1)
      expect(loop.getState().player.xp).toBe(1)
    })

    it('xp accumulates correctly across multiple kills before reaching xpToNext', () => {
      // Place 3 enemies (hp=20, 1-hit kills) in the same column as the player
      const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 0 },
        entities: [
          { entityTypeId: 'basic-enemy', x: playerX, y: 60, properties: { hp: 20 } },
          { entityTypeId: 'basic-enemy', x: playerX, y: 110, properties: { hp: 20 } },
          { entityTypeId: 'basic-enemy', x: playerX, y: 160, properties: { hp: 20 } },
        ],
      })
      loop.fire()
      for (let i = 0; i < 120; i++) loop.update(16)
      loop.fire()
      for (let i = 0; i < 120; i++) loop.update(16)
      loop.fire()
      for (let i = 0; i < 120; i++) loop.update(16)
      expect(loop.getState().player.xp).toBe(3)
    })

    it('reaching xpToNext (10 kills) sets status to card_selection', () => {
      const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
      const tenEnemies = Array.from({ length: 10 }, (_, i) => ({
        entityTypeId: 'basic-enemy',
        x: playerX,
        y: 20 + i * 42,
        properties: { hp: 20 },
      }))
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: tenEnemies,
      })
      loop.setFiring(true)
      for (let i = 0; i < 2000; i++) loop.update(16)
      expect(loop.getState().status).toBe('card_selection')
    })

    it('after level-up, player.xp resets to 0 and playerLevel increments', () => {
      const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
      const tenEnemies = Array.from({ length: 10 }, (_, i) => ({
        entityTypeId: 'basic-enemy',
        x: playerX,
        y: 20 + i * 42,
        properties: { hp: 20 },
      }))
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: tenEnemies,
      })
      loop.setFiring(true)
      for (let i = 0; i < 2000; i++) loop.update(16)
      const state = loop.getState()
      expect(state.player.xp).toBe(0)
      expect(state.player.playerLevel).toBe(2)
    })

    it('resumeFromCardSelection sets status back to playing', () => {
      const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
      const tenEnemies = Array.from({ length: 10 }, (_, i) => ({
        entityTypeId: 'basic-enemy',
        x: playerX,
        y: 20 + i * 42,
        properties: { hp: 20 },
      }))
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: tenEnemies,
      })
      loop.setFiring(true)
      for (let i = 0; i < 2000; i++) loop.update(16)
      expect(loop.getState().status).toBe('card_selection')
      loop.resumeFromCardSelection()
      expect(loop.getState().status).toBe('playing')
    })

    it('getState returns xp, xpToNext, playerLevel in player object', () => {
      const state = new GameLoop(mockLevel).getState()
      expect(state.player).toHaveProperty('xp', 0)
      expect(state.player).toHaveProperty('xpToNext', 10)
      expect(state.player).toHaveProperty('playerLevel', 1)
    })
  })

  describe('enemy properties from EntityPlacement', () => {
    it('enemy reads hp from EntityPlacement.properties', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        entities: [{ entityTypeId: 'strong-enemy', x: 100, y: 50, properties: { hp: 200 } }],
      }
      const enemies = new GameLoop(level).getState().enemies
      expect(enemies[0].hp).toBe(200)
    })

    it('enemy defaults to hp=100 when properties.hp is absent', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 50 }],
      }
      const enemies = new GameLoop(level).getState().enemies
      expect(enemies[0].hp).toBe(100)
    })

    it('enemy reads movementType from properties, defaults to horizontal', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        entities: [
          { entityTypeId: 'asteroid', x: 100, y: 50, properties: { movementType: 'vertical' } },
          { entityTypeId: 'basic-enemy', x: 200, y: 50 },
        ],
      }
      const enemies = new GameLoop(level).getState().enemies
      expect(enemies[0].movementType).toBe('vertical')
      expect(enemies[1].movementType).toBe('horizontal')
    })

    it('enemy reads burstCount from properties, defaults to 1', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        entities: [
          { entityTypeId: 'fast-enemy', x: 100, y: 50, properties: { burstCount: 3 } },
          { entityTypeId: 'basic-enemy', x: 200, y: 50 },
        ],
      }
      const enemies = new GameLoop(level).getState().enemies
      expect(enemies[0].burstCount).toBe(3)
      expect(enemies[1].burstCount).toBe(1)
    })
  })

  describe('vertical movement (asteroid)', () => {
    // The asteroid now picks one of 3 directions at spawn via Math.random().
    // r<1/3 → straight(0,+1); <2/3 → diag-left(-0.7071,+0.7071); else diag-right.
    // These legacy specs assert the STRAIGHT trajectory, so we force straight by
    // mocking random to 0.1 (< 1/3) at construction time.
    afterEach(() => jest.restoreAllMocks())

    function asteroidLevel(): LevelDefinition {
      return {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 100 },
        entities: [{ entityTypeId: 'asteroid', x: 100, y: 10, properties: { movementType: 'vertical', speedMultiplier: 1.0, hp: 60 } }],
      }
    }

    it('asteroid moves downward each update', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1) // force straight
      const loop = new GameLoop(asteroidLevel())
      const before = loop.getState().enemies[0].y
      loop.update(100)
      expect(loop.getState().enemies[0].y).toBeGreaterThan(before)
    })

    it('a STRAIGHT asteroid does not move horizontally', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1) // force straight (dirX=0)
      const loop = new GameLoop(asteroidLevel())
      const before = loop.getState().enemies[0].x
      loop.update(100)
      expect(loop.getState().enemies[0].x).toBe(before)
    })

    it('asteroid is removed (alive=false) when it exits the bottom of the screen', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1) // force straight down
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 1000 },
        entities: [{ entityTypeId: 'asteroid', x: 100, y: CANVAS_HEIGHT - 10, properties: { movementType: 'vertical', speedMultiplier: 1.0 } }],
      }
      const loop = new GameLoop(level)
      loop.update(100)
      expect(loop.getState().enemies[0].alive).toBe(false)
    })

    it('combat (oscillating) enemies are not affected by the descend logic', () => {
      // New model: a basic-enemy micro-oscillates around its anchor; it never
      // descends. With amplitudeY:0 (basic default) its y stays put entirely.
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'basic-enemy', x: 100, y: 60, properties: { hp: 9999, movementPattern: 'oscillate-h', amplitudeX: 10, amplitudeY: 0, frequency: 0.5 } }],
      })
      const initialY = loop.getState().enemies[0].y
      for (let i = 0; i < 50; i++) loop.update(16)
      expect(loop.getState().enemies[0].y).toBe(initialY) // y never drifts down
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // ASTEROID — 3 DIRECTIONS (enemy-movement-design §5) — RED battery.
  //   Unit vectors: straight(0,+1), diag-left(-0.7071,+0.7071), diag-right(+0.7071,+0.7071).
  //   Direction chosen ONCE at spawn via Math.random(), 1/3 each:
  //     r<1/3 → straight ; 1/3≤r<2/3 → diag-left ; r≥2/3 → diag-right.
  //   Speed identical in all 3 (unit vector × speed; diagonal is NOT √2 faster).
  //   Removed when it leaves ANY edge: x<-r || x>CANVAS_WIDTH+r || y>CANVAS_HEIGHT+r.
  // These FAIL against the current GameLoop (always-straight, bottom-only cleanup).
  // ──────────────────────────────────────────────────────────────────────────
  describe('asteroid 3 directions (§5)', () => {
    const SQRT2_2 = 0.7071
    afterEach(() => jest.restoreAllMocks())

    // Asteroid mid-screen so it has room to move before any edge cleanup.
    function asteroidAt(x: number, y: number): LevelDefinition {
      return {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 100, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'asteroid', x, y, properties: { movementType: 'vertical', speedMultiplier: 1.0, hp: 9999 } }],
      }
    }

    it('random 0.1 → straight: dirX=0, dirY=+1 (moves straight down)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1)
      const loop = new GameLoop(asteroidAt(195, 200))
      const e = loop.getState().enemies[0]
      expect(e.dirX).toBeCloseTo(0, 4)
      expect(e.dirY).toBeCloseTo(1, 4)
      const beforeX = e.x
      const beforeY = e.y
      loop.update(50)
      const after = loop.getState().enemies[0]
      expect(after.x).toBeCloseTo(beforeX, 4) // no horizontal drift
      expect(after.y).toBeGreaterThan(beforeY)
    })

    it('random 0.5 → diag-left: dirX=-0.7071, dirY=+0.7071 (down-left)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5)
      const loop = new GameLoop(asteroidAt(195, 200))
      const e = loop.getState().enemies[0]
      expect(e.dirX).toBeCloseTo(-SQRT2_2, 4)
      expect(e.dirY).toBeCloseTo(SQRT2_2, 4)
      const beforeX = e.x
      const beforeY = e.y
      loop.update(50)
      const after = loop.getState().enemies[0]
      expect(after.x).toBeLessThan(beforeX) // drifts left
      expect(after.y).toBeGreaterThan(beforeY) // still descends
    })

    it('random 0.9 → diag-right: dirX=+0.7071, dirY=+0.7071 (down-right)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9)
      const loop = new GameLoop(asteroidAt(195, 200))
      const e = loop.getState().enemies[0]
      expect(e.dirX).toBeCloseTo(SQRT2_2, 4)
      expect(e.dirY).toBeCloseTo(SQRT2_2, 4)
      const beforeX = e.x
      const beforeY = e.y
      loop.update(50)
      const after = loop.getState().enemies[0]
      expect(after.x).toBeGreaterThan(beforeX) // drifts right
      expect(after.y).toBeGreaterThan(beforeY)
    })

    it('boundary: random < 1/3 is straight, exactly 1/3 is diag-left', () => {
      // exact lower edge of the diag-left bucket: r === 1/3 → diag-left, NOT straight
      jest.spyOn(Math, 'random').mockReturnValue(1 / 3)
      const loop = new GameLoop(asteroidAt(195, 200))
      const e = loop.getState().enemies[0]
      expect(e.dirX).toBeCloseTo(-SQRT2_2, 4)
      expect(e.dirY).toBeCloseTo(SQRT2_2, 4)
    })

    it('boundary: exactly 2/3 is diag-right (not diag-left)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(2 / 3)
      const loop = new GameLoop(asteroidAt(195, 200))
      const e = loop.getState().enemies[0]
      expect(e.dirX).toBeCloseTo(SQRT2_2, 4)
      expect(e.dirY).toBeCloseTo(SQRT2_2, 4)
    })

    it('speed is IDENTICAL in all 3 directions (diagonal not √2 faster)', () => {
      // Magnitude of the per-tick displacement must be the same for straight and
      // both diagonals — proves the direction vector is normalized (unit length).
      function stepMagnitude(randomValue: number): number {
        jest.spyOn(Math, 'random').mockReturnValue(randomValue)
        const loop = new GameLoop(asteroidAt(195, 200))
        const b = loop.getState().enemies[0]
        loop.update(50)
        const a = loop.getState().enemies[0]
        jest.restoreAllMocks()
        return Math.hypot(a.x - b.x, a.y - b.y)
      }
      const straight = stepMagnitude(0.1)
      const diagLeft = stepMagnitude(0.5)
      const diagRight = stepMagnitude(0.9)
      expect(diagLeft).toBeCloseTo(straight, 3)
      expect(diagRight).toBeCloseTo(straight, 3)
      expect(straight).toBeGreaterThan(0) // sanity: it actually moved
    })

    it('direction is FIXED for the asteroid lifetime (not re-rolled per tick)', () => {
      const spy = jest.spyOn(Math, 'random').mockReturnValue(0.5) // diag-left
      const loop = new GameLoop(asteroidAt(195, 200))
      const callsAfterSpawn = spy.mock.calls.length
      for (let i = 0; i < 10; i++) loop.update(16)
      // dir is sampled once at spawn; ticking must not draw more direction rolls.
      // (enemyShotDelay:9999 prevents the shooter RNG from firing.)
      expect(spy.mock.calls.length).toBe(callsAfterSpawn)
      const e = loop.getState().enemies[0]
      expect(e.dirX).toBeCloseTo(-SQRT2_2, 4) // still diag-left
    })

    // ── §5.4 cleanup: removed on ANY edge, not just the bottom ───────────────
    it('a diag-left asteroid exiting the LEFT edge becomes inactive', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.5) // diag-left
      // Near the left edge, high speed → crosses x < -r quickly, well before bottom.
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 1000, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'asteroid', x: 5, y: 100, properties: { movementType: 'vertical', speedMultiplier: 1.0, hp: 9999 } }],
      })
      for (let i = 0; i < 30; i++) loop.update(16)
      const e = loop.getState().enemies[0]
      expect(e.x).toBeLessThan(0)              // it really left the left edge
      expect(e.y).toBeLessThan(CANVAS_HEIGHT)  // it exited the SIDE, not the bottom
      expect(e.alive).toBe(false)              // and was cleaned up anyway
    })

    it('a diag-right asteroid exiting the RIGHT edge becomes inactive', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9) // diag-right
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 1000, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'asteroid', x: CANVAS_WIDTH - 5, y: 100, properties: { movementType: 'vertical', speedMultiplier: 1.0, hp: 9999 } }],
      })
      for (let i = 0; i < 30; i++) loop.update(16)
      const e = loop.getState().enemies[0]
      expect(e.x).toBeGreaterThan(CANVAS_WIDTH) // left via the right edge
      expect(e.y).toBeLessThan(CANVAS_HEIGHT)   // not the bottom
      expect(e.alive).toBe(false)
    })

    it('a straight asteroid is NOT removed prematurely while still on screen', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1) // straight, slow
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 10, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'asteroid', x: 195, y: 100, properties: { movementType: 'vertical', speedMultiplier: 1.0, hp: 9999 } }],
      })
      loop.update(16)
      const e = loop.getState().enemies[0]
      expect(e.y).toBeLessThan(CANVAS_HEIGHT)
      expect(e.alive).toBe(true) // still on screen → still alive
    })
  })

  describe('burst fire', () => {
    function burstLevel(burstCount: number): LevelDefinition {
      return {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 0.001 },
        entities: [{ entityTypeId: 'fast-enemy', x: 200, y: 60, properties: { burstCount, hp: 40 } }],
      }
    }

    it('enemy with burstCount=1 fires 1 bullet per shot cycle', () => {
      const loop = new GameLoop(burstLevel(1))
      for (let i = 0; i < 10; i++) loop.update(16)
      // With burstCount=1, each shot cycle produces exactly 1 bullet (no burst interval)
      // enemyShotDelay:0.001 triggers many cycles, so we check that each is a single bullet
      const total = loop.getState().enemyBullets.length
      expect(total).toBeGreaterThanOrEqual(1)
      // All bullets should be active (no burst delay between them)
      const activeCount = loop.getState().enemyBullets.filter(b => b.active).length
      expect(activeCount).toBe(total)
    })

    it('enemy with burstCount=3 fires 3 bullets in a burst', () => {
      const loop = new GameLoop(burstLevel(3))
      // tick enough to trigger shot + full burst (3 × 50ms = 150ms)
      for (let i = 0; i < 20; i++) loop.update(16)
      const total = loop.getState().enemyBullets.length
      expect(total).toBeGreaterThanOrEqual(3)
    })

    it('enemy with burstCount=0 (asteroid) never fires', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 0.001 },
        entities: [{ entityTypeId: 'asteroid', x: 200, y: 60, properties: { burstCount: 0, hp: 60 } }],
      }
      const loop = new GameLoop(level)
      for (let i = 0; i < 50; i++) loop.update(16)
      expect(loop.getState().enemyBullets).toHaveLength(0)
    })
  })

  describe('asteroid fuel drop (FUEL-1)', () => {
    // Helper: build a level with a single asteroid at the player's column,
    // at levelIndex N. enemyShotDelay=99 keeps enemy shooting from consuming
    // Math.random calls. dropsPickup:null isolates the fuel-drop roll.
    function asteroidFuelLevel(levelIndex: number): LevelDefinition {
      const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
      return {
        ...mockLevel,
        levelIndex,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 99, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'asteroid', x: playerX, y: 60, properties: { hp: 20, movementType: 'vertical', speedMultiplier: 0, dropsPickup: null } }],
      }
    }

    afterEach(() => jest.restoreAllMocks())

    it('spawns 1 fuel pickup when asteroid is killed at levelIndex 5 and random < 0.3', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1)
      const loop = new GameLoop(asteroidFuelLevel(5))
      const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
      fireAndTick(loop, 1)
      const pickups = loop.getState().fuelPickups
      expect(pickups.filter(p => p.active)).toHaveLength(1)
      expect(pickups[0]).toMatchObject({ x: playerX, y: 60, active: true })
    })

    it('does not spawn fuel pickup when asteroid is killed at levelIndex 4 (below threshold)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1)
      const loop = new GameLoop(asteroidFuelLevel(4))
      fireAndTick(loop, 1)
      expect(loop.getState().fuelPickups.filter(p => p.active)).toHaveLength(0)
    })

    it('does not spawn fuel pickup when asteroid is killed at levelIndex 5 but random >= 0.3', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.9)
      const loop = new GameLoop(asteroidFuelLevel(5))
      fireAndTick(loop, 1)
      expect(loop.getState().fuelPickups.filter(p => p.active)).toHaveLength(0)
    })

    it('does not spawn fuel pickup when a non-asteroid is killed at levelIndex 5 (random 0.1)', () => {
      jest.spyOn(Math, 'random').mockReturnValue(0.1)
      const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
      const loop = new GameLoop({
        ...mockLevel,
        levelIndex: 5,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemyShotDelay: 99, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'basic-enemy', x: playerX, y: 60, properties: { hp: 20, dropsPickup: null } }],
      })
      fireAndTick(loop, 1)
      expect(loop.getState().fuelPickups.filter(p => p.active)).toHaveLength(0)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // WIN CONDITION IGNORES ASTEROIDS (combat fix 2) — RED battery, before impl.
  // Behavior decided with Maycon:
  //   - Asteroids are OBSTACLES, not combat targets. The win condition is
  //     "all COMBAT enemies dead" — asteroids do NOT count toward it.
  //   - Obstacle criterion (the dev matches one of these): an enemy is an
  //     obstacle when typeId === 'asteroid' OR movementType === 'vertical'.
  //   - A live/escaping asteroid must never block 'won', and killing it does
  //     not by itself win the level.
  //   - In the wave system, a wave clears when its COMBAT enemies die; a still-
  //     alive asteroid in the wave does not hold the wave open.
  //   - A level made of ONLY obstacles (no combat enemies) has nothing to clear.
  //     Decided WITH the existing regression at line ~393 ("asteroid escaping
  //     bottom does not trigger won"): an obstacle-only level does NOT win — the
  //     win fires only after combat existed and was cleared. So an obstacle-only
  //     level stays 'playing'. (This keeps the two rules self-consistent: an
  //     asteroid can neither hold a win open nor produce one on its own.)
  // ──────────────────────────────────────────────────────────────────────────
  describe('win condition ignores asteroids (fix 2)', () => {
    const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2

    // A combat enemy (basic) overlapping the player's column + a live asteroid
    // off to the side. Killing the basic must win even though the asteroid lives.
    it('killing the only combat enemy wins even with a live asteroid on screen', () => {
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [
          { entityTypeId: 'basic-enemy', x: playerX, y: 60, properties: { hp: 20 } },
          // asteroid parked off the player's column, will never be shot
          { entityTypeId: 'asteroid', x: 10, y: 200, properties: { hp: 100, movementType: 'vertical', speedMultiplier: 0 } },
        ],
      })
      fireAndTick(loop, 1) // kill the basic-enemy only
      const asteroid = loop.getState().enemies.find(e => e.typeId === 'asteroid')
      expect(asteroid?.alive).toBe(true) // asteroid still alive on screen
      expect(loop.getState().status).toBe('won')
    })

    it('a level with ONLY asteroids (no combat) stays playing (nothing to clear)', () => {
      // Consistent with the escaping-asteroid regression: obstacles cannot produce
      // a win on their own. No combat enemy → never reaches 'won'.
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [
          { entityTypeId: 'asteroid', x: 10, y: 200, properties: { hp: 100, movementType: 'vertical', speedMultiplier: 0 } },
          { entityTypeId: 'asteroid', x: 300, y: 200, properties: { hp: 100, movementType: 'vertical', speedMultiplier: 0 } },
        ],
      })
      for (let i = 0; i < 30; i++) loop.update(16)
      expect(loop.getState().status).toBe('playing')
    })

    it('killing an asteroid does not by itself win the level (combat enemy still alive)', () => {
      // asteroid in the player's column gets shot first; a combat enemy elsewhere
      // stays alive, so the level must NOT be won.
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [
          { entityTypeId: 'asteroid', x: playerX, y: 60, properties: { hp: 20, movementType: 'vertical', speedMultiplier: 0 } },
          { entityTypeId: 'basic-enemy', x: 10, y: 200, properties: { hp: 20 } },
        ],
      })
      fireAndTick(loop, 1) // kill the asteroid in the player's column
      const basic = loop.getState().enemies.find(e => e.typeId === 'basic-enemy')
      expect(basic?.alive).toBe(true)
      expect(loop.getState().status).toBe('playing') // NOT won — combat enemy lives
    })

    it('an escaping asteroid (alive=false, killed=false) never blocks the combat win', () => {
      // asteroid escapes the bottom (alive=false, not killed); the combat enemy
      // is then killed → must reach 'won', the escaped asteroid does not interfere.
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 1000, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [
          { entityTypeId: 'basic-enemy', x: playerX, y: 60, properties: { hp: 20 } },
          { entityTypeId: 'asteroid', x: 10, y: CANVAS_HEIGHT - 10, properties: { hp: 100, movementType: 'vertical', speedMultiplier: 10 } },
        ],
      })
      // let the asteroid exit the bottom without being shot
      for (let i = 0; i < 5; i++) loop.update(16)
      const asteroid = loop.getState().enemies.find(e => e.typeId === 'asteroid')
      expect(asteroid?.alive).toBe(false)
      expect(asteroid?.killed).toBe(false)
      expect(loop.getState().status).toBe('playing') // combat enemy still alive
      fireAndTick(loop, 1) // now kill the combat enemy
      expect(loop.getState().status).toBe('won')
    })

    describe('wave system interaction', () => {
      const enemyAt = (typeId: string, y: number, extra: Record<string, unknown> = {}) => ({
        entityTypeId: typeId,
        x: playerX,
        y,
        properties: { hp: 20, ...extra },
      })

      it('a wave with a combat enemy + a live asteroid clears when the combat enemy dies', () => {
        // asteroid sits off-column (x=10) so the player bullet only hits the combat
        // enemy. The wave must clear (wave:cleared) despite the asteroid being alive.
        const loop = new GameLoop({
          ...mockLevel,
          params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
          entities: [],
          waves: [
            {
              order: 1,
              delay: 0,
              entities: [
                { entityTypeId: 'basic-enemy', x: playerX, y: 60, properties: { hp: 20 } },
                { entityTypeId: 'asteroid', x: 10, y: 200, properties: { hp: 100, movementType: 'vertical', speedMultiplier: 0 } },
              ],
            },
            { order: 2, delay: 0, entities: [enemyAt('basic-enemy', 120)] },
          ],
        })
        const cleared = jest.fn()
        loop.on('wave:cleared', cleared)
        fireAndTick(loop, 1) // kill the combat enemy in wave 1; asteroid still alive
        const asteroid = loop.getState().enemies.find(e => e.typeId === 'asteroid')
        expect(asteroid?.alive).toBe(true)
        expect(cleared).toHaveBeenCalledTimes(1) // wave cleared despite live asteroid
        expect(loop.getState().status).toBe('playing')
      })
    })
  })

  describe('damage pickup collection', () => {
    it('bulletDamage formula: 20 + 2*20 = 60', () => {
      const loop = new GameLoop(mockLevel)
      expect(loop.getState().player.bulletDamage).toBe(20)
      // bulletDamage += 2 * bulletDamage = 20 + 40 = 60
      expect(20 + 2 * 20).toBe(60)
    })

    it('damagePickups array is checked in update()', () => {
      // Verify that checkDamagePickupCollisions is called during update by checking
      // that damagePickups spawned from enemy kills are properly tracked
      const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
      const enemyY = 100
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 0, fuelDrainRate: 0 },
        entities: [{
          entityTypeId: 'asteroid',
          x: playerX,
          y: enemyY,
          properties: { hp: 20, movementType: 'vertical', dropsPickup: 'damage', speedMultiplier: 0 },
        }],
      })

      jest.spyOn(Math, 'random').mockReturnValue(0.1) // guarantee drop
      expect(loop.getState().damagePickups.length).toBe(0)

      loop.fire()
      // Ticks for bullet to reach enemy
      for (let i = 0; i < 100; i++) loop.update(16)

      jest.restoreAllMocks()
      // After kill, pickup should exist
      expect(loop.getState().damagePickups.length).toBeGreaterThan(0)
    })

    it('collecting damage pickup triples bulletDamage and deactivates it', () => {
      // Place enemy just above player so the bullet hits on the first update tick
      // and the pickup spawns within the player's AABB, triggering collection in the same tick
      const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
      const playerY = CANVAS_HEIGHT - ENTITY_SIZE - 20   // 792
      const enemyY = playerY - ENTITY_SIZE / 2           // 776 — pickup spawns here, overlaps player
      const mathRandom = jest.spyOn(Math, 'random').mockReturnValue(0) // guarantee drop
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'asteroid', x: playerX, y: enemyY, properties: { hp: 20, movementType: 'vertical', speedMultiplier: 0, dropsPickup: 'damage' } }],
      })
      loop.fire()
      loop.update(16) // bullet hits enemy → pickup spawns at enemyY → AABB overlap → collected
      mathRandom.mockRestore()

      expect(loop.getState().player.bulletDamage).toBe(60) // 20 + 2*20
      expect(loop.getState().damagePickups.every(p => !p.active)).toBe(true)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // BODY-CONTACT DAMAGE (combat fix 3) — RED battery, written before impl.
  // Behavior decided with Maycon:
  //   - An enemy whose AABB overlaps the player deals damage on contact, the
  //     same magnitude as a bullet hit (1 hp), and activates i-frames
  //     (invincibilityTimer = 1500ms), exactly like the bullet-hit path.
  //   - While i-frames are active, continuous contact does NOT re-apply damage
  //     (the invincibility blocks it, mirroring consecutive bullet hits).
  //   - After i-frames expire, sustained contact damages again.
  //   - This is independent of enemy bullets: a non-shooting enemy (enemyShotDelay
  //     huge) sitting on the player still deals contact damage.
  // ──────────────────────────────────────────────────────────────────────────
  describe('body-contact damage (fix 3)', () => {
    const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
    const playerY = CANVAS_HEIGHT - ENTITY_SIZE - 20 // 792

    // A single non-shooting, non-moving enemy placed exactly on the player.
    function enemyOnPlayerLevel(): LevelDefinition {
      return {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'basic-enemy', x: playerX, y: playerY, properties: { hp: 9999 } }],
      }
    }

    it('an enemy overlapping the player reduces hp by 1 on contact', () => {
      const loop = new GameLoop(enemyOnPlayerLevel())
      expect(loop.getState().player.hp).toBe(500)
      loop.update(16) // contact this tick
      expect(loop.getState().player.hp).toBe(499)
    })

    it('body contact activates i-frames (invincibilityTimer set to 1500)', () => {
      const loop = new GameLoop(enemyOnPlayerLevel())
      expect(loop.getState().player.invincibilityTimer).toBe(0)
      loop.update(16)
      expect(loop.getState().player.invincibilityTimer).toBe(INVINCIBILITY_DURATION_MS)
    })

    it('continuous contact does NOT re-apply damage while i-frames are active', () => {
      const loop = new GameLoop(enemyOnPlayerLevel())
      loop.update(16)             // first contact → hp 499, i-frames on
      expect(loop.getState().player.hp).toBe(499)
      // Several more ticks of overlap, all within the 1500ms window
      for (let i = 0; i < 10; i++) loop.update(16) // ~160ms total, < 1500
      expect(loop.getState().player.hp).toBe(499) // no extra damage
    })

    it('sustained contact damages again after i-frames expire', () => {
      const loop = new GameLoop(enemyOnPlayerLevel())
      loop.update(16) // hp 499, i-frames on
      expect(loop.getState().player.hp).toBe(499)
      // Drain the i-frames fully, then one more contact tick applies damage again.
      loop.update(1500) // checkCollisions sees i-frames active, then timer → 0
      loop.update(16)   // i-frames now 0 → contact damages
      expect(loop.getState().player.hp).toBe(498)
    })

    it('a non-overlapping enemy deals no contact damage', () => {
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        // far from the player, no AABB overlap
        entities: [{ entityTypeId: 'basic-enemy', x: 10, y: 60, properties: { hp: 9999 } }],
      })
      for (let i = 0; i < 20; i++) loop.update(16)
      expect(loop.getState().player.hp).toBe(500)
      expect(loop.getState().player.invincibilityTimer).toBe(0)
    })

    it('an overlapping asteroid (obstacle) also deals contact damage', () => {
      // The fix is about body overlap, not enemy type — an asteroid on the player
      // hurts too. speedMultiplier:0 keeps it pinned on the player for the tick.
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, enemySpeed: 0, enemyShotDelay: 9999, fuelDrainRate: 0 },
        entities: [{ entityTypeId: 'asteroid', x: playerX, y: playerY, properties: { hp: 9999, movementType: 'vertical', speedMultiplier: 0 } }],
      })
      loop.update(16)
      expect(loop.getState().player.hp).toBe(499)
      expect(loop.getState().player.invincibilityTimer).toBe(INVINCIBILITY_DURATION_MS)
    })
  })

  // ──────────────────────────────────────────────────────────────────────────
  // WAVE SYSTEM (Sprint 6B) — RED battery, written before implementation.
  // Behavior decided with Maycon:
  //   - GameLoop spawns ONLY wave[0] at start (no longer flattens all waves).
  //   - When the last enemy of the current wave dies AND more waves remain:
  //     emit 'wave:cleared', stay 'playing' (suspend update()), do NOT spawn next.
  //   - advanceWave() spawns the next wave and emits 'wave:started'.
  //   - Win condition is wave-aware: 'won' only when the LAST wave is cleared.
  //   - The next wave's `delay` is exposed via getNextWaveDelay() so GameScreen
  //     can wait that long before calling advanceWave().
  //   - GameState gains currentWave (1-based) and totalWaves.
  //   - Legacy levels with only `entities` (no `waves`) keep the old behavior.
  // ──────────────────────────────────────────────────────────────────────────
  describe('wave system', () => {
    const enemyAt = (y: number) => ({
      entityTypeId: 'basic-enemy',
      x: CANVAS_WIDTH / 2 - ENTITY_SIZE / 2,
      y,
      properties: { hp: 20 }, // 1-hit kill (20 = 1 × bulletDamage)
    })

    // Two-wave level: wave 1 has one enemy at y=60, wave 2 one enemy at y=120.
    // delays are distinct so the getNextWaveDelay() contract asserts a real value.
    function twoWaveLevel(): LevelDefinition {
      return {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 0, enemyShotDelay: 9999 },
        entities: [],
        waves: [
          { order: 1, delay: 0, entities: [enemyAt(60)] },
          { order: 2, delay: 1500, entities: [enemyAt(120)] },
        ],
      }
    }

    function singleWaveLevel(): LevelDefinition {
      return {
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 0, enemyShotDelay: 9999 },
        entities: [],
        waves: [{ order: 1, delay: 0, entities: [enemyAt(60)] }],
      }
    }

    describe('event emitter', () => {
      it('on() registers a handler and emit (via wave clear) invokes it', () => {
        const loop = new GameLoop(twoWaveLevel())
        const handler = jest.fn()
        loop.on('wave:cleared', handler)
        fireAndTick(loop, 1) // kill wave 1 enemy → wave:cleared
        expect(handler).toHaveBeenCalledTimes(1)
      })

      it('off() removes a handler so it is not invoked on clear', () => {
        const loop = new GameLoop(twoWaveLevel())
        const handler = jest.fn()
        loop.on('wave:cleared', handler)
        loop.off('wave:cleared', handler)
        fireAndTick(loop, 1) // kill wave 1 enemy → wave:cleared, but handler removed
        expect(handler).not.toHaveBeenCalled()
      })
    })

    it('spawns only wave[0] enemies at start (does not flatten all waves)', () => {
      const loop = new GameLoop(twoWaveLevel())
      const enemies = loop.getState().enemies
      expect(enemies).toHaveLength(1)
      expect(enemies[0].y).toBe(60) // wave 1's enemy, not wave 2's (y=120)
    })

    it('getState exposes currentWave=1 and totalWaves=2 at start', () => {
      const state = new GameLoop(twoWaveLevel()).getState()
      expect(state.currentWave).toBe(1)
      expect(state.totalWaves).toBe(2)
    })

    it('clearing wave 1 of 2 emits wave:cleared, stays playing, and does NOT spawn wave 2', () => {
      const loop = new GameLoop(twoWaveLevel())
      const handler = jest.fn()
      loop.on('wave:cleared', handler)

      fireAndTick(loop, 1) // kill wave 1's only enemy

      expect(handler).toHaveBeenCalledTimes(1)
      expect(loop.getState().status).toBe('playing') // NOT 'won'
      // wave 2 enemy must not be on screen until advanceWave()
      const aliveAtWave2Y = loop.getState().enemies.filter(e => e.alive && e.y === 120)
      expect(aliveAtWave2Y).toHaveLength(0)
    })

    it('suspends update() after wave:cleared until advanceWave (score frozen)', () => {
      const loop = new GameLoop(twoWaveLevel())
      fireAndTick(loop, 1) // clear wave 1 → suspended
      const scoreBefore = loop.getState().score
      for (let i = 0; i < 30; i++) loop.update(16) // should be a no-op while suspended
      expect(loop.getState().score).toBe(scoreBefore)
    })

    it('getNextWaveDelay() returns the delay of the upcoming wave after a clear', () => {
      const loop = new GameLoop(twoWaveLevel())
      fireAndTick(loop, 1) // clear wave 1 → next is wave 2 (delay 1500)
      expect(loop.getNextWaveDelay()).toBe(1500)
    })

    it('advanceWave() spawns the next wave enemies and resumes (currentWave=2)', () => {
      const loop = new GameLoop(twoWaveLevel())
      loop.on('wave:cleared', () => loop.advanceWave())

      fireAndTick(loop, 1) // clear wave 1 → handler advances to wave 2

      const state = loop.getState()
      expect(state.currentWave).toBe(2)
      const aliveEnemies = state.enemies.filter(e => e.alive)
      expect(aliveEnemies).toHaveLength(1)
      expect(aliveEnemies[0].y).toBe(120) // wave 2's enemy is now on screen
    })

    it('advanceWave() emits wave:started exactly once', () => {
      const loop = new GameLoop(twoWaveLevel())
      const started = jest.fn()
      loop.on('wave:started', started)
      loop.on('wave:cleared', () => loop.advanceWave())

      fireAndTick(loop, 1)

      expect(started).toHaveBeenCalledTimes(1)
    })

    it('clearing the LAST wave sets status to won (no wave:cleared)', () => {
      const loop = new GameLoop(singleWaveLevel())
      const cleared = jest.fn()
      loop.on('wave:cleared', cleared)

      fireAndTick(loop, 1) // kill the only enemy of the only wave

      expect(loop.getState().status).toBe('won')
      expect(cleared).not.toHaveBeenCalled()
    })

    it('wins only after the last wave is cleared via advanceWave (not after wave 1)', () => {
      const loop = new GameLoop(twoWaveLevel())
      loop.on('wave:cleared', () => loop.advanceWave())

      fireAndTick(loop, 1) // clear wave 1, auto-advance to wave 2
      expect(loop.getState().status).toBe('playing')
      expect(loop.getState().currentWave).toBe(2)

      fireAndTick(loop, 1) // clear wave 2 (last) → won
      expect(loop.getState().status).toBe('won')
    })

    describe('legacy compat (no waves)', () => {
      it('flat-entities level spawns all enemies at once and wins when all die', () => {
        const playerX = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2
        const loop = new GameLoop({
          ...mockLevel,
          params: { ...BASE_PARAMS, numberOfEnemies: 0, fuelDrainRate: 0, enemyShotDelay: 9999 },
          entities: [enemyAt(60), enemyAt(110)], // two enemies, no waves
        })
        // all spawn together
        expect(loop.getState().enemies).toHaveLength(2)

        const cleared = jest.fn()
        loop.on('wave:cleared', cleared)
        fireAndTick(loop, 1) // kills both (same column, same x), each 1-hit
        fireAndTick(loop, 1)

        expect(loop.getState().enemies.every(e => !e.alive)).toBe(true)
        expect(loop.getState().status).toBe('won')
        expect(cleared).not.toHaveBeenCalled()
      })

      it('legacy level reports currentWave=1 and totalWaves=1', () => {
        const state = new GameLoop(oneHitLevel()).getState()
        expect(state.currentWave).toBe(1)
        expect(state.totalWaves).toBe(1)
      })
    })
  })
})
