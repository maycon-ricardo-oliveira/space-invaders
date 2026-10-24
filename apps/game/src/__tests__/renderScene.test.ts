import type { IRenderer, Sprite } from '@si/level-engine'
import type { Enemy, GameState } from '../game/types'
import { ENTITY_SIZE } from '../game/GameLoop'
import { renderScene, PICKUP_COLORS } from '../render/renderScene'
import { SPRITES, fitSprite } from '../render/sprites'

interface SpriteCall {
  kind: 'sprite'
  source: string
  x: number
  y: number
  width: number
  height: number
}

interface RectCall {
  kind: 'rect'
  x: number
  y: number
  width: number
  height: number
  color: string
}

type Call = { kind: 'clear' } | SpriteCall | RectCall

function makeRecorder() {
  const calls: Call[] = []
  const renderer: IRenderer = {
    clear: () => calls.push({ kind: 'clear' }),
    drawSprite: (sprite: Sprite, x, y, width, height) =>
      calls.push({ kind: 'sprite', source: sprite.source, x, y, width, height }),
    drawRect: (x, y, width, height, color) =>
      calls.push({ kind: 'rect', x, y, width, height, color }),
  }
  return { renderer, calls }
}

function sprites(calls: Call[]): SpriteCall[] {
  return calls.filter((c): c is SpriteCall => c.kind === 'sprite')
}

function rects(calls: Call[]): RectCall[] {
  return calls.filter((c): c is RectCall => c.kind === 'rect')
}

function makeEnemy(overrides: Partial<Enemy> = {}): Enemy {
  return {
    x: 0,
    y: 0,
    alive: true,
    killed: false,
    typeId: 'basic-enemy',
    contactDamage: 25,
    hp: 100,
    xpValue: 1,
    movementType: 'horizontal',
    burstCount: 1,
    dropsPickup: null,
    speedMultiplier: 1,
    anchorX: 0,
    anchorY: 0,
    movementPattern: 'static',
    amplitudeX: 0,
    amplitudeY: 0,
    frequency: 0,
    phase: 0,
    dirX: 1,
    dirY: 0,
    ...overrides,
  }
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    ship: { moveSpeed: 300, bulletSpeed: 500, invincibilityMs: 1500, autoFireIntervalMs: 400 },
    player: {
      x: 100,
      y: 700,
      hp: 500,
      maxHp: 500,
      fuel: 100,
      invincibilityTimer: 0,
      xp: 0,
      xpToNext: 10,
      playerLevel: 1,
      bulletDamage: 10,
    },
    enemies: [],
    playerBullets: [],
    enemyBullets: [],
    fuelPickups: [],
    damagePickups: [],
    score: 0,
    status: 'playing',
    currentWave: 1,
    totalWaves: 1,
    ...overrides,
  }
}

describe('renderScene — player', () => {
  it('clears the canvas before drawing anything', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(renderer, makeState())
    expect(calls[0]).toEqual({ kind: 'clear' })
  })

  it('draws the player sprite, not a rectangle', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(renderer, makeState())
    expect(sprites(calls).map(c => c.source)).toContain('player')
  })

  it('fits the player sprite inside the entity box', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(renderer, makeState())
    const expected = fitSprite(SPRITES.player, 100, 700, ENTITY_SIZE, ENTITY_SIZE)
    const call = sprites(calls).find(c => c.source === 'player')
    expect(call).toMatchObject(expected)
  })

  it('hides the player while the invincibility flash is off', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(renderer, makeState(), false)
    expect(sprites(calls).map(c => c.source)).not.toContain('player')
  })
})

describe('renderScene — enemies', () => {
  it('draws one sprite per enemy type', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(
      renderer,
      makeState({
        enemies: [
          makeEnemy({ typeId: 'basic-enemy' }),
          makeEnemy({ typeId: 'fast-enemy' }),
          makeEnemy({ typeId: 'strong-enemy' }),
          makeEnemy({ typeId: 'asteroid' }),
        ],
      }),
    )
    expect(sprites(calls).map(c => c.source)).toEqual(
      expect.arrayContaining(['enemy-basic', 'enemy-fast', 'enemy-strong', 'asteroid']),
    )
  })

  it('skips enemies that are no longer alive', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(renderer, makeState({ enemies: [makeEnemy({ alive: false })] }))
    expect(sprites(calls).map(c => c.source)).not.toContain('enemy-basic')
  })

  it('falls back to the red rectangle for an enemy type with no sprite', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(renderer, makeState({ enemies: [makeEnemy({ typeId: 'boss-enemy', x: 5, y: 6 })] }))
    expect(rects(calls)).toContainEqual({
      kind: 'rect',
      x: 5,
      y: 6,
      width: ENTITY_SIZE,
      height: ENTITY_SIZE,
      color: '#ff0000',
    })
  })
})

describe('renderScene — bullets', () => {
  it('draws active player bullets white', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(renderer, makeState({ playerBullets: [{ x: 10, y: 20, active: true, damage: 20 }] }))
    expect(rects(calls).some(c => c.color === '#ffffff' && c.x === 10 && c.y === 20)).toBe(true)
  })

  it('draws active enemy bullets red', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(renderer, makeState({ enemyBullets: [{ x: 30, y: 40, active: true, damage: 15 }] }))
    expect(rects(calls).some(c => c.color === '#ff4444' && c.x === 30 && c.y === 40)).toBe(true)
  })

  it('skips inactive bullets', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(
      renderer,
      makeState({
        playerBullets: [{ x: 10, y: 20, active: false, damage: 20 }],
        enemyBullets: [{ x: 30, y: 40, active: false, damage: 15 }],
      }),
    )
    expect(rects(calls)).toHaveLength(0)
  })
})

describe('renderScene — pickups', () => {
  it('draws active fuel pickups', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(renderer, makeState({ fuelPickups: [{ x: 50, y: 60, active: true }] }))
    expect(rects(calls)).toContainEqual({
      kind: 'rect',
      x: 50,
      y: 60,
      width: ENTITY_SIZE,
      height: ENTITY_SIZE,
      color: PICKUP_COLORS.fuel,
    })
  })

  it('draws active damage pickups', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(renderer, makeState({ damagePickups: [{ x: 70, y: 80, active: true }] }))
    expect(rects(calls)).toContainEqual({
      kind: 'rect',
      x: 70,
      y: 80,
      width: ENTITY_SIZE,
      height: ENTITY_SIZE,
      color: PICKUP_COLORS.damage,
    })
  })

  it('uses distinct colors for fuel and damage pickups', () => {
    expect(PICKUP_COLORS.fuel).not.toBe(PICKUP_COLORS.damage)
  })

  it('skips collected pickups', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(
      renderer,
      makeState({
        fuelPickups: [{ x: 50, y: 60, active: false }],
        damagePickups: [{ x: 70, y: 80, active: false }],
      }),
    )
    expect(rects(calls)).toHaveLength(0)
  })

  it('draws pickups under the enemies and the player', () => {
    const { renderer, calls } = makeRecorder()
    renderScene(
      renderer,
      makeState({
        fuelPickups: [{ x: 50, y: 60, active: true }],
        enemies: [makeEnemy()],
      }),
    )
    const pickupIndex = calls.findIndex(c => c.kind === 'rect' && c.color === PICKUP_COLORS.fuel)
    const enemyIndex = calls.findIndex(c => c.kind === 'sprite' && c.source === 'enemy-basic')
    const playerIndex = calls.findIndex(c => c.kind === 'sprite' && c.source === 'player')
    expect(pickupIndex).toBeLessThan(enemyIndex)
    expect(pickupIndex).toBeLessThan(playerIndex)
  })

  it('tolerates a state without pickup arrays', () => {
    const state = makeState()
    delete (state as Partial<GameState>).damagePickups
    delete (state as Partial<GameState>).fuelPickups
    const { renderer } = makeRecorder()
    expect(() => renderScene(renderer, state)).not.toThrow()
  })
})
