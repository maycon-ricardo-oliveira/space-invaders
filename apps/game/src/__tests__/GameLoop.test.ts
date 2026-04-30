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

describe('GameLoop', () => {
  beforeEach(() => jest.clearAllMocks())

  // Helper: level with a single 1-hit enemy (hp=20 = 1 × bulletDamage) at player's x
  function oneHitLevel(overrides: Partial<typeof BASE_PARAMS> = {}): LevelDefinition {
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

  describe('enemy wall-bounce', () => {
    // With enemySpeed:100, actual speed = 100 * 40 = 4000 px/s
    // Per update(16): dt=0.016s, delta = 4000 * 0.016 = 64 px/step
    // 1 enemy: cols=1, totalWidth=32, startX = round((390-32)/2) = 179
    // Right-wall bounce: e.x + 32 > 390 → e.x > 358 → triggered at step 3 (179+3*64=371)
    // After right bounce: direction=-1, y=60+32=92, x=371
    // Left-wall bounce: e.x < 0 → triggered at step 6 after bounce (371-6*64=-13)

    function runUpdates(loop: GameLoop, n: number, dt = 16): void {
      for (let i = 0; i < n; i++) loop.update(dt)
    }

    const bounceLevel: LevelDefinition = {
      ...mockLevel,
      params: {
        ...BASE_PARAMS,
        numberOfEnemies: 1,
        enemySpeed: 100,
        enemyShotDelay: 9999,
      },
    }

    it('enemy starts moving right (enemyDirection is positive)', () => {
      const loop = new GameLoop(bounceLevel)
      // After 1 step rightward the enemy x should increase
      const before = loop.getState().enemies[0].x
      runUpdates(loop, 1)
      expect(loop.getState().enemies[0].x).toBeGreaterThan(before)
    })

    it('right-wall bounce reverses direction and steps enemy down', () => {
      const loop = new GameLoop(bounceLevel)
      const initialY = loop.getState().enemies[0].y

      // 3 steps push the rightmost edge past CANVAS_WIDTH (179+3*64=371; 371+32=403>390)
      runUpdates(loop, 3)

      const { enemies } = loop.getState()
      // After bounce, enemy moves left on next step
      const xAfterBounce = enemies[0].x
      runUpdates(loop, 1)
      expect(loop.getState().enemies[0].x).toBeLessThan(xAfterBounce)
      // Enemy stepped down by ENTITY_SIZE
      expect(enemies[0].y).toBe(initialY + ENTITY_SIZE)
    })

    it('left-wall bounce reverses direction again and steps enemy down a second time', () => {
      const loop = new GameLoop(bounceLevel)
      const initialY = loop.getState().enemies[0].y

      // Trigger right-wall bounce
      runUpdates(loop, 3)
      const yAfterFirstBounce = loop.getState().enemies[0].y
      expect(yAfterFirstBounce).toBe(initialY + ENTITY_SIZE)

      // Trigger left-wall bounce: 6 more steps moving left (371-6*64=-13<0)
      runUpdates(loop, 6)

      const { enemies } = loop.getState()
      // After left bounce, enemy moves right on next step
      const xAfterLeftBounce = enemies[0].x
      runUpdates(loop, 1)
      expect(loop.getState().enemies[0].x).toBeGreaterThan(xAfterLeftBounce)
      // Enemy stepped down a second time
      expect(enemies[0].y).toBe(initialY + ENTITY_SIZE * 2)
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

  describe('fuel system', () => {
    it('fuel starts at 100', () => {
      expect(new GameLoop(mockLevel).getState().player.fuel).toBe(100)
    })

    it('fuel drains over time with default fuelDrainRate', () => {
      const loop = new GameLoop(mockLevel)
      loop.update(1000)  // 1 second
      const { fuel } = loop.getState().player
      expect(fuel).toBeLessThan(100)
      expect(fuel).toBeCloseTo(100 - 12, 0)
    })

    it('fuel reaching 0 → status is fuelEmpty', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, fuelDrainRate: 100 },
      }
      const loop = new GameLoop(level)
      loop.update(1100)  // 1.1s × 100 drain/s = 110 → drains fully
      expect(loop.getState().status).toBe('fuelEmpty')
    })

    it('fuel cannot go below 0', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, fuelDrainRate: 100 },
      }
      const loop = new GameLoop(level)
      loop.update(5000)
      expect(loop.getState().player.fuel).toBeGreaterThanOrEqual(0)
    })

    it('FuelPickup entity collision restores fuel to 100', () => {
      // The pickup is placed at the player's starting position.
      // drainFuel runs before checkFuelPickupCollisions each tick.
      // After update(1000): fuel drains by 50, then pickup collision fires → fuel = min(100, 50 + 100) = 100.
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, fuelDrainRate: 50 },
        entities: [
          { entityTypeId: 'fuel-pickup', x: CANVAS_WIDTH / 2 - ENTITY_SIZE / 2, y: CANVAS_HEIGHT - ENTITY_SIZE - 20 },
        ],
      }
      const loop = new GameLoop(level)
      loop.update(1000)
      expect(loop.getState().player.fuel).toBe(100)
      // Confirm pickup was consumed (a second update drains fuel normally)
      loop.update(1000)
      expect(loop.getState().player.fuel).toBeCloseTo(50, 0)
    })

    it('fuel cannot exceed 100 from pickup', () => {
      const level: LevelDefinition = {
        ...mockLevel,
        params: { ...BASE_PARAMS, fuelDrainRate: 0 },
        entities: [
          { entityTypeId: 'fuel-pickup', x: CANVAS_WIDTH / 2 - ENTITY_SIZE / 2, y: CANVAS_HEIGHT - ENTITY_SIZE - 20 },
        ],
      }
      const loop = new GameLoop(level)
      loop.update(16)
      expect(loop.getState().player.fuel).toBe(100)
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
})
