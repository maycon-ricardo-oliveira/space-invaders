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

    it('player starts with 3 lives', () => {
      expect(new GameLoop(mockLevel).getState().player.lives).toBe(3)
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
      // 0 enemies → status becomes won after first update (vacuous truth)
      const level: LevelDefinition = { ...mockLevel, params: { ...BASE_PARAMS, numberOfEnemies: 0 } }
      const loop = new GameLoop(level)
      loop.update(16)
      const x = loop.getState().player.x
      loop.moveLeft(100)
      loop.moveRight(100)
      expect(loop.getState().player.x).toBe(x)
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
      const level: LevelDefinition = { ...mockLevel, params: { ...BASE_PARAMS, numberOfEnemies: 0 } }
      const loop = new GameLoop(level)
      loop.update(16) // status → won
      loop.fire()
      expect(loop.getState().playerBullets).toHaveLength(0)
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
      const loop = new GameLoop({ ...mockLevel, params: { ...BASE_PARAMS, numberOfEnemies: 1 } })
      loop.fire()
      for (let i = 0; i < 100; i++) loop.update(16) // ~1.6s, bullet crosses enemy at ~1.4s
      expect(loop.getState().enemies[0].alive).toBe(false)
      expect(loop.getState().score).toBe(100)
    })

    it('all enemies dead → status is won', () => {
      const loop = new GameLoop({ ...mockLevel, params: { ...BASE_PARAMS, numberOfEnemies: 1 } })
      loop.fire()
      for (let i = 0; i < 100; i++) loop.update(16)
      expect(loop.getState().status).toBe('won')
    })

    it('enemy bullet reduces player lives on collision', () => {
      // enemyShotDelay:0.001 → bullet fired on first update frame
      // enemyShotSpeed:8 → 400px/s; travels 700px to player in ~1.75s (~109 frames)
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 1, enemyShotDelay: 0.001, enemyShotSpeed: 8 },
      })
      const before = loop.getState().player.lives
      for (let i = 0; i < 150; i++) loop.update(16)
      expect(loop.getState().player.lives).toBeLessThan(before)
    })

    it('three enemy bullet hits → status is lost', () => {
      const loop = new GameLoop({
        ...mockLevel,
        params: { ...BASE_PARAMS, numberOfEnemies: 1, enemyShotDelay: 0.001, enemyShotSpeed: 8 },
      })
      // 3 hits × ~109 frames = ~330 frames; 500 frames is more than enough
      for (let i = 0; i < 500; i++) loop.update(16)
      expect(loop.getState().status).toBe('lost')
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
      const loop = new GameLoop({ ...mockLevel, params: { ...BASE_PARAMS, numberOfEnemies: 1 } })
      loop.fire()
      for (let i = 0; i < 100; i++) loop.update(16) // kill the enemy
      jest.clearAllMocks()
      loop.render(mockRenderer)
      // Only player drawn (enemy dead, bullet inactive, status=won)
      expect((mockRenderer.drawRect as jest.Mock).mock.calls.length).toBe(1)
    })
  })
})
