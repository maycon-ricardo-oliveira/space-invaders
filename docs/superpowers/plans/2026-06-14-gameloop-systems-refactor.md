# Refactor Plan — GameLoop systems extraction & pluggable movement/shooting

Date: 2026-06-14
Scope: `apps/game/src/game/` (runtime). `packages/level-engine` is touched only as read context — no changes proposed there.
Status: PROPOSAL — awaiting Maycon's approval. No production code is edited by this plan.
Rule of thumb: **fix proporcional**. Every step below has to pay its own cost (reduce real pain / unlock the next shots & movements). Anything that does not is explicitly left out.

---

## 0. Why now

The loop just absorbed a lot of behavior (2D joystick, per-type movement, multidirectional asteroid, body-contact damage, conditional fuel, wave system). `GameLoop.ts` is 591 lines and owns spawn, movement, AABB collision (x4), enemy shooting (burst), waves, fuel, XP, win/lose and render. Maycon wants to add **new shot kinds** (spread, aimed, homing, wave) and **new movements** next. If we plug those into the current shape, every new shot/movement grows the monolith and copies more AABB. We refactor the base first so the new behavior becomes *one map entry*, not *one more case in a growing switch*.

---

## 1. Diagnosis (prioritized by real pain)

Severity = how much it blocks understanding / extending / testing the next shots & movements.

### P0 — blocks the next feature directly

**A. God Object: `GameLoop` does ~9 jobs (SRP).** `GameLoop.ts:25-591`.
`update()` (`:304-319`) orchestrates fuel, bullet physics, enemy movement, enemy shooting, 3 collision passes, invincibility, auto-fire and win/lose — all as private methods sharing one mutable `this.state`. Adding a shot kind today means editing `handleEnemyShooting` (`:413-443`) and `fire` (`:295-302`); adding a movement means editing `moveEnemies` (`:381-411`) and `patternOffset` (`:131-152`). The class is the only seam, so each system can only be tested *through* the whole loop. Principle: **SRP**, **Object Calisthenics (one job per class / small methods)**.

**B. Movement is a `switch`, not a map (Strategy).** `patternOffset` (`:131-152`) is a `switch (pattern)` and `moveEnemies` (`:381-411`) branches `descend` vs combat. Adding a movement = editing two methods. The conventions skill literally names this case ("padrões de movimento e de tiro de inimigo") for **Strategy via map**. Principle: **OCP**, **Strategy**.

**C. Enemy shooting is hardcoded to one shape (Strategy).** `handleEnemyShooting` (`:413-443`) only knows "burst straight down" (`:420-424` pushes a bullet at enemy center, downward). There is no seam for spread/aimed/homing/wave — the whole burst-queue machinery assumes the straight bullet. This is the exact thing Maycon wants to extend. Principle: **OCP**, **Strategy**.

### P1 — high duplication / latent correctness, cheap to fix

**D. AABB inline copied 4×.** `checkFuelPickupCollisions` (`:339-344`), `checkDamagePickupCollisions` (`:355-360`), player-bullet vs enemy (`:450-455`), enemy-bullet vs player (`:489-494`), body-contact (`:506-511`). Five copies of the same overlap formula with hand-tuned widths. One bug fixed in one copy silently survives in the others. Principle: **DRY**, **Object Calisthenics (no duplicated logic)**.

**E. Enemy field population duplicated across two spawn paths.** `mapPlacementsToEnemies` (`:77-124`) and the procedural `buildEnemies` fallback (`:162-208`) both construct the full `Enemy` record with the same defaults and the same `phase = e.x * 0.7 + e.y * 1.3` formula (`:88`, `:200`). Change a default in one path and the other drifts. Principle: **DRY**, **single source of truth**.

**F. `MovementPattern` union has cases with no `patternOffset` branch.** `types.ts:19-25` declares `drift-return` and `static`; `patternOffset` (`:139-152`) handles `oscillate-h`/`bob-v`/`orbit`/`descend`(default) and silently swallows `drift-return`/`static` into the `default` (stay on anchor). The compiler does not catch the missing case because of the `default`. A future movement added to the union compiles clean while doing nothing. Principle: **discriminated-union exhaustiveness** (the conventions skill's `never`-in-default rule).

**G. `isObstacle` has a dual source of truth.** `isObstacle` (`:543-545`) returns `typeId === 'asteroid' || movementType === 'vertical'`. Two independent ways to mean "obstacle"; a new obstacle-like enemy must remember to set both. Principle: **single source of truth**.

**H. Latent bug: `drainFuel` + `checkWinLose` can fight over `status` in one tick.** `drainFuel` (`:332`) sets `status = 'fuelEmpty'`; later in the same `update()`, `checkWinLose` (`:547-565`) can overwrite it to `'won'` (it only early-returns on `card_selection`, not on `fuelEmpty`). A single `resolveStatus` (one place that decides terminal status from the resolved facts) removes the order-dependence. Principle: **Tell-Don't-Ask / one decision point**. NOTE: this is a behavior change (it fixes a bug), so it is sequenced LAST, after a characterization test pins the *current* behavior and Maycon approves the corrected behavior explicitly.

### What is GOOD — do NOT touch

- **Renderer-agnostic boundary.** `render(renderer: IRenderer)` (`:567-590`) is the only renderer contact and it stays. Nothing in this plan adds renderer knowledge to logic. Dual-renderer invariant preserved.
- **`getState()` deep-copy snapshot (`:244-257`).** Clean read boundary for GameScreen. Keep as-is; it is the public contract the UI reads.
- **The event emitter (`on`/`off`/`emit`, `:210-227`) and wave suspend/resume protocol** (`advanceWave`, `getNextWaveDelay`, `waitingForWaveAdvance`). GameScreen depends on this exact protocol (`GameScreen.tsx:227-253`). It is coherent and well-tested — leave the public shape untouched.
- **2D `move()` normalization (`:264-279`)** — small, correct, fully tested. Leave it.
- **`packages/level-engine` types.** The engine intentionally knows nothing about movement/shooting; they ride as untyped `properties` (`EntityPlacement.properties`). This is the registry-pattern boundary — keep movement/shooting semantics in `apps/game`, do NOT push them into the engine.
- **Auto-fire / invincibility / fuel timers** — coherent and well-tested; they move into systems unchanged, no logic rewrite.

---

## 2. Target architecture

Keep `GameLoop` as the **orchestrator** (owns `state`, the tick order, the public API GameScreen calls). Extract the *how* of each job into small, pure, individually-testable units. The loop becomes a readable conductor; the systems become the place new behavior plugs in.

```
GameLoop  (orchestrator — owns GameState, tick order, public API, events, render)
  update(dt):
    fuel.drain(state, dt, params)
    bullets.advance(state, dt, params)
    movement.step(state, dt)              ← MOVEMENT_PATTERNS map (Strategy)
    shooting.step(state, dt, params)      ← SHOT_PATTERNS map (Strategy)
    collisions.resolve(state, ctx)        ← uses aabb() helper (one copy)
    invincibility.tick(state, dt)
    autoFire.tick(state, dt) → fire()
    status = resolveStatus(state, waves)  ← single decision point (fixes H)

  pure helpers / data (no GameLoop instance needed to test):
    aabb(a, b): boolean                    ← the one AABB (fixes D)
    MOVEMENT_PATTERNS: Record<MovementPattern, MovementFn>   (fixes B, F)
    SHOT_PATTERNS:     Record<ShotKind, ShotFn>              (fixes C)
    buildEnemy(placement | proceduralCell): Enemy            ← one factory (fixes E)
    isObstacle(enemy): boolean             ← one rule (fixes G)
```

### Movement plugability (Strategy via map)

```ts
type MovementFn = (e: Enemy, t: number, dt: number, bounds: Bounds) => void
const MOVEMENT_PATTERNS: Record<MovementPattern, MovementFn> = {
  'oscillate-h': anchoredSine(/* x */),
  'bob-v':       anchoredSine(/* y */),
  'orbit':       orbit,
  'descend':     descend,
  'drift-return': /* now MUST be supplied — union is exhaustive */,
  'static':       stayOnAnchor,
}
```
`moveEnemies` becomes: for each alive enemy, `MOVEMENT_PATTERNS[e.movementPattern](e, t, dt, bounds)`. Exhaustiveness over the union closes gap **F** (a new pattern won't compile until it's in the map).

### Shooting plugability (Strategy via map)

```ts
type ShotFn = (shooter: Enemy, state: GameState, params: Params) => Bullet[]
const SHOT_PATTERNS: Record<ShotKind, ShotFn> = {
  'straight': straightDown,   // current behavior
  // 'spread' | 'aimed' | 'homing' | 'wave'  ← future: one entry each
}
```
The burst-queue scheduling (when an enemy fires, how many in a burst) stays in the shooting system; the *shape of the volley* becomes the strategy. A shooter picks its `shotKind` (read from `properties`, defaulting to `'straight'`).

### Boundaries
- Systems are pure functions/modules that take `GameState` (or the slice they need) + dt/params and mutate or return. No system imports `IRenderer`. No system imports another system. The loop is the only thing that knows the order.
- Keep them as **functions/modules first**, not classes, unless a system needs its own state (the burst queue does → a small `ShootingSystem` holding `burstQueue` + `shotCooldown` is justified; the rest stay free functions). Fix proporcional: no interface/class where a function is enough.
- `GameState`, `Enemy`, `Bullet` stay the shared data shape in `types.ts`.

---

## 3. Incremental steps (each keeps the 162-test GameLoop suite green; no behavior change unless flagged)

The 162 `it`/`test` cases in `apps/game/src/__tests__/GameLoop.test.ts` are the safety net. Each step is a pure refactor verified by `npm test` green before AND after. Steps are ordered cheapest-and-safest first.

> Characterization-test gate: every step below is already covered by the existing suite EXCEPT step 8 (status fight) and the `drift-return`/`static` movement cases (F). Where a gap is flagged, ts-test-writer adds a characterization test pinning *current* behavior BEFORE the code moves.

**Step 1 — Extract `aabb(a, b)` pure helper. (fixes D)**
Introduce one overlap function; replace the 5 inline copies (`:339`, `:355`, `:450`, `:489`, `:506`) with calls. Covered by existing collision/pickup/body-contact tests. Pure rename-of-logic, zero behavior change. *Lowest risk, highest duplication payoff — do first.*

**Step 2 — Extract `isObstacle` rule to a single named function and add a characterization test for the dual-source today. (sets up G)**
No behavior change yet; just pin that `asteroid` OR `vertical` both count as obstacle, so a later unification is provably safe. (Unifying the dual source is a separate, optional follow-up — only if it pays; the existing rule works.)

**Step 3 — Extract `buildEnemy(placement)` factory; route BOTH spawn paths through it. (fixes E)**
Pull the `Enemy` record construction + defaults + `phase` formula out of `mapPlacementsToEnemies` (`:77-124`). Have the procedural fallback (`:162-208`) build a synthetic placement (or call a shared `defaultEnemyFields`) so the defaults live once. Covered by the `enemy properties from EntityPlacement`, `anchored micro-movement` and `initialization` describe blocks. Behavior identical.

**Step 4 — Introduce `MOVEMENT_PATTERNS` map; `patternOffset` reads from it. (fixes B, partially F)**
Convert the `switch` (`:139-152`) into a `Record<MovementPattern, ...>`. Make the union exhaustive: supply explicit entries for `drift-return` and `static` that reproduce *today's* default (stay on anchor). Add a characterization test for `drift-return`/`static` FIRST (gap — currently untested) so "they sit on the anchor" is pinned before we make it explicit. Then `moveEnemies` dispatches via the map. The `descend` straight-line branch (`:390-401`) becomes the `descend` strategy.

**Step 5 — Extract `MovementSystem` module (free functions + the map).**
Move `moveEnemies` + `patternOffset` + `rollAsteroidDirection` + the map into `game/systems/movement.ts`. GameLoop calls `movement.step(state, dt, bounds)`. Covered by the entire `anchored micro-movement`, `vertical movement`, `asteroid 3 directions` blocks. No behavior change.

**Step 6 — Extract `ShootingSystem` (holds `burstQueue` + `shotCooldown`); introduce `SHOT_PATTERNS` with the single `straight` entry. (fixes C)**
Move `handleEnemyShooting` (`:413-443`) into `game/systems/shooting.ts`. The current bullet-spawn (`:420-424`) becomes `SHOT_PATTERNS.straight`. Burst scheduling stays in the system. Covered by `burst fire` block. Behavior identical (only `straight` exists). This is the step that makes "add spread/aimed/homing" a one-entry change.

**Step 7 — Extract remaining systems: `bullets.advance`, `fuel.drain`, `collisions.resolve`, `invincibility.tick`, `autoFire.tick`.**
Each is already an isolated private method (`:367-379`, `:327-333`, `:445-519`, `:521-531`, `:533-540`). Move them to `game/systems/*` as functions over the relevant state slice. The kill-rewards block inside `checkCollisions` (`:458-479`: score, xp, level-up, drops) stays together as the "on-kill" handler — it is one coherent event, don't shred it. Covered by the full collision/hp/xp/fuel/auto-fire/invincibility blocks. `update()` becomes the readable conductor shown in §2.

**Step 8 — `resolveStatus(state, waves)`: single status decision point. (fixes H — BEHAVIOR CHANGE, last, gated)**
Today `drainFuel` and `checkWinLose` both write `status` in one tick. Replace with one function that decides terminal status from resolved facts (fuel-empty / lost / won / wave-cleared / card_selection) with a defined precedence. ts-test-writer FIRST adds a characterization test that documents the *current* (buggy) tick outcome when fuel empties on the same tick the last enemy dies; Maycon approves the corrected precedence; then implement. This is the only intentional behavior change in the plan and is isolated to its own PR.

> PR split (one concern per PR, per house rules): Steps 1-2 (helpers) / Step 3 (spawn factory) / Steps 4-5 (movement) / Step 6 (shooting) / Step 7 (remaining systems) / Step 8 (status fix). Each independently reviewable and green.

---

## 4. How this unlocks the next shots & movements

After Step 6, adding **`spread`** is: add `'spread'` to the `ShotKind` union, add one entry to `SHOT_PATTERNS` returning N bullets at fanned angles, and let a shooter declare `shotKind: 'spread'` in its placement `properties`. No edit to `handleEnemyShooting`'s scheduling, no new collision code (bullets flow through the same `bullets.advance` + `aabb`). `aimed`/`homing`/`wave` are the same: one map entry each (`homing` reads player position from the passed `state`; `wave` returns a sine-offset volley). The compiler enforces that the new kind is wired (exhaustive map), so a half-added shot won't ship silently.

After Steps 4-5, adding a **movement** (e.g. `zigzag`, `dive`) is: add it to the `MovementPattern` union (compiler now FAILS until the map has it — gap F closed), add one `MovementFn` entry. No edit to `moveEnemies`. Spawn already routes every field through `buildEnemy` (Step 3), so the new movement's params (`amplitude`, `frequency`, `dirX/dirY`) are populated in exactly one place.

Net: each new behavior is **one map entry + one union member**, fully unit-testable in isolation (the strategy is a pure function), instead of growing a 591-line class and copying AABB a sixth time.

---

## 5. What is explicitly OUT (anti-over-engineering)

- No `IMovementStrategy`/`IShotStrategy` interface hierarchy — a `Record<Key, Fn>` of pure functions is enough and lighter. (Conventions skill: "Strategy via map", not class-per-strategy.)
- No event bus / ECS / generalized "system scheduler". The loop calling systems in a fixed order is clear and testable; an ECS is abstraction nobody asked for here.
- No change to `getState`, the event emitter, the wave protocol, `move()`, or `IRenderer` — they are good.
- No movement/shooting types pushed into `packages/level-engine` — they stay in `apps/game` behind the registry/`properties` boundary.
- The dual-source `isObstacle` (G) unification is *optional* — only do it if a new obstacle type actually makes the dual source hurt. Pinned by a test in Step 2 either way.

---

## Files

- Plan (this file): `/home/maycola/Development/space-invaders/docs/superpowers/plans/2026-06-14-gameloop-systems-refactor.md`
- Target of refactor: `/home/maycola/Development/space-invaders/apps/game/src/game/GameLoop.ts`
- Shared types: `/home/maycola/Development/space-invaders/apps/game/src/game/types.ts`
- Safety net (162 tests): `/home/maycola/Development/space-invaders/apps/game/src/__tests__/GameLoop.test.ts`
- New modules to be created (proposal): `apps/game/src/game/systems/{movement,shooting,collisions,bullets,fuel,invincibility,autoFire}.ts` and `apps/game/src/game/{aabb,buildEnemy}.ts`
- Consumer to leave untouched: `/home/maycola/Development/space-invaders/apps/game/src/screens/GameScreen.tsx`
