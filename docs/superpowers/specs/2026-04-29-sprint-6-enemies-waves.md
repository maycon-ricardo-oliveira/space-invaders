# Sprint 6 — Enemies & Waves Design Spec

**Date:** 2026-04-29  
**Sprint:** 6  
**Status:** Approved

---

## Goal

Add 3 new enemy types (asteroid, fast, strong) and a sequential wave system to the game loop. All enemy properties are registry-driven so the calibrator can configure them without touching game logic.

---

## 1. HP & Damage System

### Player bullet damage

`BULLET_DAMAGE = 20` — constant in `GameLoop.ts`. Upgradeable via cards in a future sprint.

### Enemy HP

HP is declared in `EntityType.properties.hp` at registration time. `buildEnemies()` reads it from the registry to initialize each `Enemy.hp`. The collision system changes from instant-kill to HP decrement:

```
enemy.hp -= BULLET_DAMAGE
if (enemy.hp <= 0) enemy.alive = false
```

### Enemy type table

| typeId | hp | hits to die | speedMultiplier | movementType | burstCount | xpValue | dropsPickup |
|---|---|---|---|---|---|---|---|
| `basic-enemy` | 100 | 5 | 1.0 | horizontal | 1 | 1 | — |
| `asteroid` | 60 | 3 | 0.8 | vertical | 0 | 1 | `'fuel'` or `'hp'` (random) |
| `fast-enemy` | 40 | 2 | 2.5 | horizontal | 3 | 2 | — |
| `strong-enemy` | 200 | 10 | 0.5 | horizontal | 1 | 3 | — |

### EntityType.properties schema

```typescript
interface EnemyTypeProperties {
  hp: number
  speedMultiplier: number
  movementType: 'horizontal' | 'vertical'
  burstCount: number      // shots per burst; 0 = no shooting
  xpValue: number
  dropsPickup?: 'hp' | 'fuel' | null
}
```

---

## 2. Enemy Behavior

### Horizontal movement (basic-enemy, fast-enemy, strong-enemy)

Existing side-to-side bounce logic. Speed = `LevelParams.enemySpeed × ENEMY_SPEED_SCALE × speedMultiplier`.

### Vertical movement (asteroid)

Moves straight down at constant speed. Does **not** shoot. When it exits the bottom of the screen (`y > CANVAS_HEIGHT`), it is removed (`alive = false`) — no damage to player. On death by bullet: random drop of HP pickup or fuel pickup at the asteroid's last position.

### Burst fire (fast-enemy)

When `burstCount > 1`, the enemy fires `burstCount` bullets in rapid succession (50ms apart) per shot cycle. Only enemies with `burstCount > 0` participate in the shooting pool.

### Heavy shot (strong-enemy)

Same bullet mechanic as basic-enemy for MVP. Visual differentiation (color/size) is a renderer concern, not game logic.

---

## 3. Wave System

### Data model

`LevelDefinition.waves: Wave[]` already exists (optional). Each `Wave` contains an `entities: EntityPlacement[]` list. If `waves` is absent or empty, the loop falls back to `level.entities` (backward compatible).

### GameLoop state additions

```typescript
private waves: Wave[]           // from LevelDefinition.waves
private currentWaveIndex: number = 0
```

`getState()` exposes:
```typescript
currentWave: number   // 1-based for HUD display
totalWaves: number
```

### Wave progression

1. `buildEnemies()` reads from `waves[0].entities` on construction (if waves present).
2. Every `update()` tick: if all enemies are dead and `currentWaveIndex < waves.length - 1` → emit `'wave:cleared'` and suspend further updates (game waits for `advanceWave()`).
3. `advanceWave()` (public method, called by GameScreen after animation): increments `currentWaveIndex`, loads `waves[currentWaveIndex].entities` into `state.enemies`, emits `'wave:started'`.
4. Win condition: all enemies dead **and** `currentWaveIndex === waves.length - 1`.

### Event emitter

`GameLoop` exposes a minimal typed emitter — no external dependency:

```typescript
type GameEvent = 'wave:cleared' | 'wave:started'

on(event: GameEvent, handler: () => void): void
off(event: GameEvent, handler: () => void): void
private emit(event: GameEvent): void
```

`GameScreen` subscribes on mount, unsubscribes on unmount.

---

## 4. Wave Transition Animation

Responsibility: **GameScreen** (not GameLoop).

Flow:
1. `GameScreen` receives `'wave:cleared'` event.
2. Sets local React state `isWaveTransition = true` — locks player input, renders turbo animation (ship zooms forward, speed lines, HUD shows "WAVE CLEARED").
3. Animation duration: ~1500ms (React Native `Animated` or Skia animation).
4. After animation: calls `gameLoop.advanceWave()`, sets `isWaveTransition = false`.

`GameLoop.status` never becomes `'wave_transition'` — status stays `'playing'` until `'won'` or `'lost'`.

---

## 5. Registration

Both `registerEntities.ts` (game) and the calibrator toolbox must register all 4 entity types on startup. New entries:

```typescript
registerEntityType({ id: 'asteroid',     ..., properties: { hp: 60,  speedMultiplier: 0.8, movementType: 'vertical',    burstCount: 0, xpValue: 1, dropsPickup: 'fuel' } })
registerEntityType({ id: 'fast-enemy',   ..., properties: { hp: 40,  speedMultiplier: 2.5, movementType: 'horizontal',  burstCount: 3, xpValue: 2 } })
registerEntityType({ id: 'strong-enemy', ..., properties: { hp: 200, speedMultiplier: 0.5, movementType: 'horizontal',  burstCount: 1, xpValue: 3 } })
```

---

## 6. PR Chain

| PR | Branch | Scope | Features |
|---|---|---|---|
| A | `feat/s6-enemies` | ENGINE + GAME | HP system, 3 new enemy types, registration, movement types, burst fire |
| B | `feat/s6-waves` | ENGINE + GAME | Wave system, event emitter, `advanceWave()`, GameScreen turbo animation |

**TDD mandatory on both PRs.** Test failures before implementation, passing after.

---

## 7. Out of Scope (Sprint 6)

- Calibrator pattern editor (GL-2 visual grid) — deferred to Sprint 6c or later
- Card upgrades to `BULLET_DAMAGE`
- Enemy sprite assets (rectangles used for MVP)
- Strong-enemy heavy shot visual differentiation
