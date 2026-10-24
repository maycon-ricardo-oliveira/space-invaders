import { GameLoop, CANVAS_WIDTH, ENTITY_SIZE } from '../game/GameLoop'
import type { LevelDefinition } from '@si/level-engine'

/**
 * CARD-1 (Sprint 8, entrega E3) — the level-up actually offers cards.
 *
 * Until now `GameScreen` showed a placeholder reading "Cards coming in Sprint 7"
 * and `resumeFromCardSelection()` just unpaused. The loop now draws a screen of
 * up to three cards on level-up, and picking one changes the run's numbers.
 */

const BASE_PARAMS = {
  numberOfEnemies: 0,
  enemySpeed: 0,
  enemyShotDelay: 9999,
  enemyShotSpeed: 1,
  enemyAngerDelay: 30,
  enemySpawnDelay: 2,
  hasPowerUps: false,
  powerUpMinWait: 5,
  powerUpMaxWait: 15,
  fuelDrainRate: 0,
}

const PLAYER_X = CANVAS_WIDTH / 2 - ENTITY_SIZE / 2

/** A level whose single enemy dies to one bullet and grants the full level-up. */
function levelUpLevel(): LevelDefinition {
  return {
    id: 'story-0',
    style: 'classic',
    difficultyScore: 10,
    params: { ...BASE_PARAMS },
    entities: [
      // hp 20 = one bullet at the starting bulletDamage; xpValue 10 = xpToNext.
      { entityTypeId: 'basic-enemy', x: PLAYER_X, y: 60, properties: { hp: 20, xpValue: 10 } },
    ],
  }
}

/** Fires once and ticks long enough for the bullet to reach the enemy. */
function killTheEnemy(loop: GameLoop): void {
  loop.fire()
  for (let i = 0; i < 120; i++) loop.update(16)
}

/** Always-low roll: common rarity, first eligible axis. */
const lowRoll = () => 0.01

describe('CARD-1 — a run starts with no cards', () => {
  it('holds no cards and offers none', () => {
    const state = new GameLoop(levelUpLevel(), lowRoll).getState()
    expect(state.activeCards).toEqual([])
    expect(state.cardOffer).toEqual([])
  })
})

describe('CARD-1 — levelling up offers a screen', () => {
  it('pauses the run on card_selection', () => {
    const loop = new GameLoop(levelUpLevel(), lowRoll)
    killTheEnemy(loop)
    expect(loop.getState().status).toBe('card_selection')
  })

  it('fills the offer with cards, never more than three', () => {
    const loop = new GameLoop(levelUpLevel(), lowRoll)
    killTheEnemy(loop)
    const { cardOffer } = loop.getState()
    expect(cardOffer.length).toBeGreaterThan(0)
    expect(cardOffer.length).toBeLessThanOrEqual(3)
  })

  it('offers cards that carry a name, a rarity and a value', () => {
    const loop = new GameLoop(levelUpLevel(), lowRoll)
    killTheEnemy(loop)
    for (const card of loop.getState().cardOffer) {
      expect(card.name.length).toBeGreaterThan(0)
      expect(card.rarity).toBeDefined()
      expect(card.value).toBeGreaterThan(0)
    }
  })

  it('never offers the same axis twice on one screen', () => {
    const loop = new GameLoop(levelUpLevel(), lowRoll)
    killTheEnemy(loop)
    const axes = loop.getState().cardOffer.map(c => c.axis)
    expect(new Set(axes).size).toBe(axes.length)
  })
})

describe('CARD-1 — picking a card', () => {
  function offerOf(loop: GameLoop) {
    killTheEnemy(loop)
    return loop.getState().cardOffer
  }

  it('moves the card into the run and resumes the game', () => {
    const loop = new GameLoop(levelUpLevel(), lowRoll)
    const [first] = offerOf(loop)
    loop.selectCard(first.id)
    const state = loop.getState()
    expect(state.activeCards.map(c => c.id)).toEqual([first.id])
    expect(state.status).not.toBe('card_selection')
    expect(state.cardOffer).toEqual([])
  })

  it('raises bullet damage when the pick is a damage card', () => {
    const loop = new GameLoop(levelUpLevel(), lowRoll)
    const damage = offerOf(loop).find(c => c.axis === 'damage')!
    const before = loop.getState().player.bulletDamage
    loop.selectCard(damage.id)
    expect(loop.getState().player.bulletDamage).toBeCloseTo(before * (1 + damage.value), 6)
  })

  it('shortens the auto-fire interval when the pick is a fire-rate card', () => {
    const loop = new GameLoop(levelUpLevel(), lowRoll)
    const fireRate = offerOf(loop).find(c => c.axis === 'fireRate')!
    const before = loop.getState().ship.autoFireIntervalMs
    loop.selectCard(fireRate.id)
    expect(loop.getState().ship.autoFireIntervalMs).toBeCloseTo(before / (1 + fireRate.value), 6)
  })

  it('ignores an id that is not on the current screen', () => {
    const loop = new GameLoop(levelUpLevel(), lowRoll)
    offerOf(loop)
    loop.selectCard('damage-epic-not-offered')
    const state = loop.getState()
    expect(state.activeCards).toEqual([])
    expect(state.status).toBe('card_selection') // still waiting for a real pick
  })

  it('leaves the other axis untouched', () => {
    const loop = new GameLoop(levelUpLevel(), lowRoll)
    const damage = offerOf(loop).find(c => c.axis === 'damage')!
    const intervalBefore = loop.getState().ship.autoFireIntervalMs
    loop.selectCard(damage.id)
    expect(loop.getState().ship.autoFireIntervalMs).toBe(intervalBefore)
  })
})

describe('CARD-1 — skipping', () => {
  it('clears the offer and resumes when the player takes nothing', () => {
    const loop = new GameLoop(levelUpLevel(), lowRoll)
    killTheEnemy(loop)
    loop.resumeFromCardSelection()
    const state = loop.getState()
    expect(state.cardOffer).toEqual([])
    expect(state.activeCards).toEqual([])
    expect(state.status).not.toBe('card_selection')
  })
})
