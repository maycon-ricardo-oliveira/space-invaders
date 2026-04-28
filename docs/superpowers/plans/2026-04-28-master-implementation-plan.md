# Master Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each sprint task-by-task.

**Goal:** Implement all features from the game design spec v2, sprint by sprint, each delivering working testable software.

**Architecture:** Renderer-agnostic game loop → IRenderer → SkiaRenderer (mobile) / CanvasRenderer (calibrator). Registry pattern for entities. Pluggable calibration strategies.

**Tech Stack:** Expo ~54, react-native-skia, TypeScript, Jest, Firebase (Firestore + Auth + Analytics), Supabase (Postgres), AdMob, RevenueCat, EAS Build/Update.

**Rules:**
- TDD on every feature — RED → GREEN → REFACTOR
- No code without a failing test first
- ROADMAP.md updated on every PR open and merge
- Each PR must have a working deliverable
- Max ~15 files per PR

---

## Sprint 5b — Gameplay Foundation

**Goal:** Replace lives with HP bar, add fuel system, XP system, update HUD.
**Deliverable:** Game playable with HP + fuel mechanics and 3-bar HUD.
**PRs:** 3 PRs (HP+HUD / Fuel / XP)

### PR 1 — HP System + HUD (HP-1, HUD-1 partial)

**Files to modify:**
- `apps/game/src/game/types.ts` — replace `lives: number` with `hp, maxHp: number`
- `apps/game/src/game/GameLoop.ts` — collision uses hp, not lives
- `apps/game/src/screens/GameScreen.tsx` — HUD renders HP bar
- `apps/game/src/__tests__/GameLoop.test.ts` — updated tests
- `apps/game/src/__tests__/GameScreen.test.tsx` — updated HUD tests

**Steps:**
- [ ] Write failing test: player starts with hp = 500, maxHp = 500
- [ ] Write failing test: bullet hit reduces hp by bullet.damage
- [ ] Write failing test: hp = 0 → status = 'dead'
- [ ] Write failing test: invincibility prevents double-hit
- [ ] Update `PlayerState` type: remove lives, add hp + maxHp
- [ ] Update GameLoop constructor: hp = maxHp = 500
- [ ] Update collision handler: hp -= damage (not lives--)
- [ ] Update checkWinLose: player.hp <= 0 → 'lost'
- [ ] Update GameScreen HUD: HP bar replaces hearts
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(HP-1): replace lives with HP bar system`
- [ ] Update ROADMAP: HP-1 🚧 In Progress (PR #N)

### PR 2 — Fuel System (FUEL-1, HUD-1 partial)

**Files to modify:**
- `apps/game/src/game/types.ts` — add `fuel: number` to PlayerState
- `apps/game/src/game/GameLoop.ts` — fuel drain, collectible, game over
- `packages/level-engine/src/types.ts` — add fuelDrainRate to LevelParams
- `apps/game/src/screens/GameScreen.tsx` — FUEL bar in HUD
- `apps/game/src/__tests__/GameLoop.test.ts` — fuel tests

**Steps:**
- [ ] Write failing test: fuel starts at 100 each phase
- [ ] Write failing test: fuel drains over time
- [ ] Write failing test: fuel = 0 → status = 'fuelEmpty'
- [ ] Write failing test: collecting fuel pickup → fuel = 100
- [ ] Add `fuel: number` to PlayerState
- [ ] Add `fuelDrainRate` to LevelParams
- [ ] Implement fuel drain in GameLoop.update()
- [ ] Add 'fuelEmpty' to GameStatus type
- [ ] Add FuelPickup entity type (registered at startup)
- [ ] Collision: player + FuelPickup → fuel = 100
- [ ] Add FUEL bar to GameScreen HUD
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(FUEL-1): add fuel system with drain and collectibles`

### PR 3 — XP System (XP-1, HUD-1 final)

**Files to modify:**
- `apps/game/src/game/types.ts` — add xp, xpToNext, playerLevel
- `apps/game/src/game/GameLoop.ts` — xp on kill, level-up trigger
- `packages/level-engine/src/types.ts` — add xpValue to EntityType
- `apps/game/src/screens/GameScreen.tsx` — XP bar, card screen trigger
- `apps/game/src/__tests__/GameLoop.test.ts` — XP tests

**Steps:**
- [ ] Write failing test: kill basic enemy → xp += 1
- [ ] Write failing test: xp >= xpToNext → playerLevel++, trigger card event
- [ ] Write failing test: xp resets to 0 at phase start
- [ ] Write failing test: boss kill at level 10 → no card event
- [ ] Add xp, xpToNext, playerLevel to PlayerState
- [ ] Add xpValue to EntityType definition
- [ ] GameLoop: after enemy kill, xp += enemy.xpValue
- [ ] GameLoop: when xp >= xpToNext → level-up event emitted, xp reset
- [ ] GameScreen: XP bar rendered (thinner)
- [ ] GameScreen: level-up pauses game → card selection placeholder
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(XP-1): add XP system with level-up trigger`

---

## Sprint 6 — Enemies & Waves

**Goal:** Add enemy variety (asteroids, fast, strong) and wave system.
**Deliverable:** 3 enemy types + configurable wave patterns.
**PRs:** 3 PRs (Asteroids / Enemy types / Wave system)

### PR 1 — Asteroid System (ENEMY-1, HP-2)

**Files to modify:**
- `apps/game/src/entities/registerEntities.ts` — register asteroid, HP pickup
- `packages/level-engine/src/registry/EntityRegistry.ts` — add destructible flag
- `apps/game/src/game/GameLoop.ts` — asteroid collision, drop logic
- `apps/game/src/__tests__/GameLoop.test.ts` — asteroid tests

**Steps:**
- [ ] Write failing test: asteroid entity registered with destructible = true
- [ ] Write failing test: player bullet hits asteroid → asteroid removed
- [ ] Write failing test: asteroid destroyed → drop roll executed
- [ ] Write failing test: player collides with asteroid → hp reduced
- [ ] Write failing test: fuel drop not available at level < 5
- [ ] Register 'asteroid' entity type with xpValue = 0, destructible = true
- [ ] Register 'hp-pickup' and 'fuel-pickup' entity types
- [ ] GameLoop collision: bullet + asteroid → asteroid removed, drop roll
- [ ] GameLoop collision: player + asteroid → hp -= asteroid.damage
- [ ] Drop logic: fuel only spawns at phaseLevel >= 5
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(ENEMY-1): add asteroid terrain with HP/fuel drops`

### PR 2 — Enemy Types (ENEMY-2, ENEMY-3)

**Files to modify:**
- `apps/game/src/entities/registerEntities.ts` — register fast-enemy, strong-enemy
- `packages/level-engine/src/types.ts` — add fireBurstCount to EntityType
- `apps/game/src/game/GameLoop.ts` — burst fire behavior
- `apps/game/src/__tests__/GameLoop.test.ts` — enemy type tests

**Steps:**
- [ ] Write failing test: fast-enemy speed > basic-enemy speed
- [ ] Write failing test: fast-enemy hp < basic-enemy hp
- [ ] Write failing test: fast-enemy fires burst (2–3 bullets)
- [ ] Write failing test: fast-enemy kill grants 2 XP
- [ ] Write failing test: strong-enemy requires 3+ hits
- [ ] Write failing test: strong-enemy kill grants 3 XP
- [ ] Register 'fast-enemy' with speedMultiplier = 2, hpMultiplier = 0.5, burst = 3, xpValue = 2
- [ ] Register 'strong-enemy' with speedMultiplier = 0.5, hpMultiplier = 3, damage = 2, xpValue = 3
- [ ] GameLoop: enemy HP tracking (enemies need hp field for multi-hit)
- [ ] GameLoop: burst fire for fast-enemy type
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(ENEMY-2,ENEMY-3): add fast and strong enemy types`

### PR 3 — Wave System (GL-2)

**Files to modify:**
- `packages/level-engine/src/types.ts` — add Wave, WavePattern types
- `packages/level-engine/src/LevelEngine.ts` — generate waves in LevelDefinition
- `apps/game/src/game/GameLoop.ts` — wave state machine
- `apps/game/src/__tests__/GameLoop.test.ts` — wave tests
- `packages/level-engine/src/__tests__/LevelEngine.test.ts` — wave generation tests

**Steps:**
- [ ] Write failing test: level with 2 waves: wave 2 not active until wave 1 cleared
- [ ] Write failing test: level complete only when all waves cleared
- [ ] Write failing test: wave pattern 'line' places enemies in horizontal line
- [ ] Write failing test: wave pattern 'V' places enemies in V formation
- [ ] Add `Wave`, `WavePattern` types to level-engine
- [ ] LevelDefinition.waves: Wave[] field added
- [ ] GameLoop: currentWaveIndex state, advances when wave cleared
- [ ] GameLoop: level complete when currentWaveIndex >= waves.length
- [ ] Implement 5 pattern types: line, V, diamond, flanks, spiral
- [ ] CurveCalibratorStrategy generates wave lists
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(GL-2): add wave system with formation patterns`

---

## Sprint 7 — Card System

**Goal:** Card selection on level-up, 14-card deck for Planet 1.
**Deliverable:** Level-up → pause → pick card → effect applied.
**PRs:** 2 PRs (Card infrastructure / 14 cards)

### PR 1 — Card Infrastructure (CARD-1)

**Files:**
- `packages/level-engine/src/types.ts` — CardDefinition, CardEffect types
- `apps/game/src/game/GameLoop.ts` — level-up → card event, card apply
- `apps/game/src/screens/CardSelectionScreen.tsx` — NEW: card UI
- `apps/game/src/screens/GameScreen.tsx` — integrate card screen
- `apps/game/src/__tests__/CardSelectionScreen.test.tsx` — NEW

**Steps:**
- [ ] Write failing test: level-up emits 'card_selection' status
- [ ] Write failing test: card draw uses weighted random
- [ ] Write failing test: held cards have reduced weight
- [ ] Write failing test: level 5 draw includes ≥1 HP card
- [ ] Write failing test: boss kill at level 10 → no card status
- [ ] Add CardDefinition type: id, name, description, weight, stackable, effect
- [ ] GameLoop: on level-up, set status = 'card_selection', draw 3 cards
- [ ] GameLoop: applyCard(cardId) → effect applied, status = 'playing'
- [ ] CardSelectionScreen: shows 3 cards, tap to select
- [ ] GameScreen: when status = 'card_selection' → show CardSelectionScreen overlay
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(CARD-1): add card selection screen on level-up`

### PR 2 — Card Deck MVP (CARD-2)

**Files:**
- `apps/game/src/entities/registerCards.ts` — NEW: 14 card definitions
- `apps/game/src/game/GameLoop.ts` — card effects applied to GameState
- `apps/game/src/__tests__/cards/*.test.ts` — NEW: one test per card

**Steps:**
- [ ] Write failing test for each of 14 card effects
- [ ] Implement `registerCards()` with all 14 card definitions
- [ ] Implement each card effect in GameLoop.applyCardEffect()
- [ ] Call `registerCards()` at app startup before navigation
- [ ] Verify all 14 tests pass
- [ ] Run full test suite → all green
- [ ] Commit: `[GAME] feat(CARD-2): implement 14-card Planet 1 deck`

---

## Sprint 8 — Parallax & Terrain

**Goal:** Multi-layer parallax, terrain scrolling, 2D movement.
**Deliverable:** Game scrolls with parallax; player moves freely in X+Y.
**PRs:** 2 PRs (Parallax / 2D movement)

### PR 1 — Parallax System (PARA-1)

**Files:**
- `packages/level-engine/src/types.ts` — ParallaxLayer, ParallaxTheme types
- `packages/level-engine/src/IRenderer.ts` — add drawScrollingBackground()
- `apps/game/src/renderers/SkiaRenderer.ts` — implement drawScrollingBackground
- `apps/calibrator/src/renderers/CanvasRenderer.ts` — implement drawScrollingBackground
- `apps/game/src/__tests__/SkiaRenderer.test.ts` — parallax tests
- `apps/calibrator/src/__tests__/CanvasRenderer.test.ts` — parallax tests

**Steps:**
- [ ] Write failing test: IRenderer.drawScrollingBackground exists
- [ ] Write failing test: SkiaRenderer implements it
- [ ] Write failing test: CanvasRenderer implements it
- [ ] Write failing test: boss level → parallax offset stops updating
- [ ] Add ParallaxLayer type: imageKey, scrollSpeed, offsetY
- [ ] Add drawScrollingBackground to IRenderer interface
- [ ] Implement in SkiaRenderer (draw tiled background layers)
- [ ] Implement in CanvasRenderer (draw tiled background layers)
- [ ] GameLoop: update parallax offsets each tick; pause on boss level
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(PARA-1): add multi-layer parallax scrolling`

### PR 2 — 2D Free Movement (GL-1)

**Files:**
- `apps/game/src/game/GameLoop.ts` — add moveUp/moveDown
- `apps/game/src/screens/GameScreen.tsx` — joystick sends dy
- `apps/game/src/__tests__/GameLoop.test.ts` — movement tests

**Steps:**
- [ ] Write failing test: moveUp reduces player.y
- [ ] Write failing test: moveDown increases player.y
- [ ] Write failing test: player cannot leave canvas bounds vertically
- [ ] Add GameLoop.moveUp(deltaMs) and moveDown(deltaMs)
- [ ] Increase PLAYER_SPEED constant
- [ ] GameScreen: extract dy from joystick, call moveUp/moveDown
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(GL-1): add 2D free movement with Y-axis joystick`

---

## Sprint 9 — Planet Structure

**Goal:** Planet/phase/level progression, hub screen, revive system.
**Deliverable:** Full Planet 1 progressable with hub screen and revive.
**PRs:** 3 PRs (Level structure / Hub screen / Revive)

### PR 1 — Planet/Phase/Level Structure (PLANET-1)

**Files:**
- `packages/level-engine/src/types.ts` — extend LevelRequest
- `packages/level-engine/src/LevelEngine.ts` — generate from full request
- `apps/game/src/screens/StoryModeScreen.tsx` — progression state
- `packages/level-engine/src/__tests__/LevelEngine.test.ts`

**Steps:**
- [ ] Write failing test: LevelRequest accepts planetIndex, phaseIndex, levelIndex
- [ ] Write failing test: phase N+1 locked until phase N level 10 cleared
- [ ] Write failing test: replay phase gives goldMultiplier = 0.2
- [ ] Extend LevelRequest with planet/phase/level indexes
- [ ] StoryModeScreen tracks unlocked phases/levels
- [ ] Checkpoint: save {planet, phase, level} on death
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(PLANET-1): add planet/phase/level progression structure`

### PR 2 — Planet Hub Screen (PLANET-2)

**Files:**
- `apps/game/src/screens/PlanetHubScreen.tsx` — NEW
- `apps/game/src/__tests__/PlanetHubScreen.test.tsx` — NEW
- `apps/game/src/App.tsx` — navigation includes hub

**Steps:**
- [ ] Write failing test: renders planet name and progress
- [ ] Write failing test: unlocked levels tappable, locked levels not
- [ ] Write failing test: boss levels visually distinct
- [ ] Implement PlanetHubScreen with 10×10 level grid
- [ ] Add to navigation flow
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(PLANET-2): add planet hub screen with level grid`

### PR 3 — Pause/Revive System (GL-3)

**Files:**
- `apps/game/src/screens/ReviveScreen.tsx` — NEW
- `apps/game/src/screens/GameScreen.tsx` — integrate revive
- `apps/game/src/game/GameLoop.ts` — revive restores HP
- `apps/game/src/__tests__/ReviveScreen.test.tsx` — NEW

**Steps:**
- [ ] Write failing test: hp = 0 → status = 'dead'
- [ ] Write failing test: revive with hp = 250 (50% of 500)
- [ ] Write failing test: 2nd death → no revive option
- [ ] Write failing test: reviveUsed flag prevents second revive
- [ ] Add reviveUsed: boolean to GameState
- [ ] GameLoop.revive(): hp = maxHp × 0.5, status = 'playing'
- [ ] ReviveScreen: Watch Ad / 50 Diamonds / Give Up
- [ ] GameScreen: shows ReviveScreen when status = 'dead' AND !reviveUsed
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(GL-3): add pause/revive system with 1 revive per run`

---

## Sprint 10 — Boss System

**Goal:** 3 boss types + dual boss at phase 10 level 10.
**Deliverable:** Boss fights functional with chest drops and arena behavior.
**PRs:** 2 PRs (Boss base + basic / Fast + strong + dual)

### PR 1 — Boss Base + Basic Boss (BOSS-1)

**Files:**
- `apps/game/src/game/types.ts` — BossState type
- `apps/game/src/game/GameLoop.ts` — boss spawn, HP, chest drop
- `packages/level-engine/src/types.ts` — BossConfig with enrageThreshold reserved
- `apps/game/src/__tests__/GameLoop.test.ts` — boss tests

**Steps:**
- [ ] Write failing test: boss spawns at phase 5 level 10
- [ ] Write failing test: boss has HP bar tracked in state
- [ ] Write failing test: boss death → chest entity spawned
- [ ] Write failing test: boss kill → no card screen, phase ends
- [ ] Write failing test: parallax pauses on boss level entry
- [ ] Add BossState to GameState
- [ ] Add BossConfig to LevelDefinition (with enrageThreshold?: number)
- [ ] GameLoop: boss behavior, HP tracking, phase transitions
- [ ] Boss death: spawn chest entity, trigger phase_complete status
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(BOSS-1): add basic boss system with chest drop`

### PR 2 — Fast, Strong & Dual Boss (BOSS-2, BOSS-3, BOSS-4)

**Files:**
- `apps/game/src/entities/registerEntities.ts` — register boss types
- `apps/game/src/game/GameLoop.ts` — dual boss support
- `apps/game/src/__tests__/GameLoop.test.ts` — boss variant tests

**Steps:**
- [ ] Write failing test: fast boss speed > basic boss speed
- [ ] Write failing test: strong boss hp > basic boss hp × 2
- [ ] Write failing test: dual boss — both must die for level complete
- [ ] Register 'fast-boss' and 'strong-boss' entity types
- [ ] GameLoop supports up to 2 simultaneous bosses in BossState[]
- [ ] Dual boss: both active at phase 10 level 10
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(BOSS-2,BOSS-3,BOSS-4): add fast, strong, and dual boss variants`

---

## Sprint 11 — Meta Progression

**Goal:** Permanent upgrades, equipment, merge, inventory, chests.
**Deliverable:** Full hangar screen with upgrades, equipment, merge, and chest rewards.
**PRs:** 3 PRs (Upgrades / Equipment + Merge / Hangar UI)

### PR 1 — Permanent Upgrades (META-1)

**Files:**
- `apps/game/src/game/types.ts` — PlayerUpgrades type
- `apps/game/src/store/upgradesSlice.ts` — NEW: upgrade state
- `packages/level-engine/src/types.ts` — PlayerStats from upgrades
- `apps/game/src/__tests__/upgrades.test.ts` — NEW

**Steps:**
- [ ] Write failing test: purchase upgrade at L0 → L1, gold deducted
- [ ] Write failing test: insufficient gold → purchase fails
- [ ] Write failing test: L6 locked until planet 2 unlocked
- [ ] Write failing test: HP Máximo L1 → maxHp = 550 at run start
- [ ] Implement PlayerUpgrades type and cost calculations
- [ ] Run stats applied to PlayerStats at run start
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(META-1): add permanent upgrades with gold cost`

### PR 2 — Equipment + Merge (INV-1, INV-2, INV-4)

**Files:**
- `apps/game/src/game/types.ts` — EquipmentItem, PlayerInventory types
- `apps/game/src/store/inventorySlice.ts` — NEW
- `apps/game/src/__tests__/equipment.test.ts` — NEW

**Steps:**
- [ ] Write failing test: equip cannon → player fires cannon behavior
- [ ] Write failing test: merge 3 Canhão Comum → 1 Canhão Incomum
- [ ] Write failing test: chest drop → item added to inventory
- [ ] Implement EquipmentItem, slot system
- [ ] Implement merge logic (3× same type+rarity → next rarity)
- [ ] Implement chest drop with weighted rarity
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(INV-1,INV-2,INV-4): add equipment system, merge, and chests`

### PR 3 — Hangar UI (META-2, INV-3)

**Files:**
- `apps/game/src/screens/HangarScreen.tsx` — NEW: bottom-sheet UI
- `apps/game/src/__tests__/HangarScreen.test.tsx` — NEW

**Steps:**
- [ ] Write failing test: renders upgrade list with correct costs
- [ ] Write failing test: renders inventory items grid
- [ ] Write failing test: scroll gesture expands/collapses panels
- [ ] Implement HangarScreen with expandable bottom-sheet
- [ ] Top panel: ship + equipped slots
- [ ] Bottom panel: inventory grid + upgrade list
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(META-2,INV-3): add hangar screen with bottom-sheet UI`

---

## Sprint 12 — Auth + Firestore

**Goal:** Player data persists offline-first.
**Deliverable:** Gold, upgrades, inventory persist across app restarts.
**PRs:** 2 PRs (Auth / Firestore)

### PR 1 — Firebase Anonymous Auth (AUTH-1)

**Files:**
- `apps/game/src/services/AuthService.ts` — NEW
- `apps/game/src/providers/AuthProvider.tsx` — NEW
- `apps/game/src/__tests__/AuthService.test.ts` — NEW (mocked)

**Steps:**
- [ ] Write failing test: signInAnonymously called on app start
- [ ] Write failing test: UID persists across sessions (mocked Firebase)
- [ ] Implement AuthService with anonymous sign-in
- [ ] Wrap app in AuthProvider
- [ ] FreeMonetization/NullAnalytics confirmed in test mode
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(AUTH-1): add Firebase anonymous auth`

### PR 2 — Firebase Firestore (DB-1, DB-3)

**Files:**
- `apps/game/src/services/PlayerRepository.ts` — NEW
- `apps/game/src/__tests__/PlayerRepository.test.ts` — NEW (mocked)
- `apps/game/src/store/playerSlice.ts` — connect to Firestore

**Steps:**
- [ ] Write failing test: save player state → Firestore document written
- [ ] Write failing test: load player state → reads from cache first
- [ ] Write failing test: offline save → synced on reconnect
- [ ] Implement PlayerRepository: save/load/update
- [ ] Connect store slices to PlayerRepository
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(DB-1,DB-3): add Firebase Firestore offline-first persistence`

---

## Sprint 13 — Supabase + Content Pipeline

**Goal:** Game content (planets, cards, waves) served from Supabase.
**Deliverable:** New planet added to Supabase → visible in app without rebuild.
**PRs:** 2 PRs (Supabase setup / Content API)

### PR 1 — Supabase Setup (DB-2)

**Files:**
- `apps/game/src/services/ContentRepository.ts` — NEW
- Supabase schema: planets, phases, levels, wave_patterns, card_definitions

**Steps:**
- [ ] Supabase project created, tables defined
- [ ] ContentRepository: fetchPlanets(), fetchCards(), fetchWavePatterns()
- [ ] Integration test with real Supabase in dev
- [ ] Commit: `[GAME] feat(DB-2): add Supabase content repository`

### PR 2 — Game Content via API (DB-4)

**Files:**
- `apps/game/src/services/ContentRepository.ts` — add cache
- `apps/game/src/hooks/useGameContent.ts` — NEW

**Steps:**
- [ ] Write failing test: fetch content → cache locally
- [ ] Write failing test: offline → use cached content
- [ ] Implement local cache (AsyncStorage)
- [ ] useGameContent hook exposes planets, cards, wavePatterns
- [ ] LevelEngine uses content from Supabase (not hardcoded)
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(DB-4): serve game content from Supabase with local cache`

---

## Sprint 14 — Monetization

**Goal:** Energy gates runs; ads and IAP functional.
**Deliverable:** Energy depletes, recharges; ads and IAP grant resources.
**PRs:** 3 PRs (Energy / AdMob / RevenueCat)

### PR 1 — Energy System (MON-1)

**Files:**
- `apps/game/src/services/EnergyService.ts` — NEW
- `apps/game/src/screens/NoEnergyScreen.tsx` — NEW
- `apps/game/src/__tests__/EnergyService.test.ts` — NEW

**Steps:**
- [ ] Write failing test: start run deducts 10 energy
- [ ] Write failing test: energy = 0 → run blocked
- [ ] Write failing test: 30 min elapsed → energy += 30
- [ ] Write failing test: energy cannot exceed 150
- [ ] Implement EnergyService with persistence
- [ ] NoEnergyScreen: Watch Ad / Buy Energy / Wait options
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(MON-1): add energy system with passive recharge`

### PR 2 — AdMob Rewarded (MON-2)

**Files:**
- `packages/monetization-plugin/src/implementations/AdMobMonetization.ts`
- `apps/game/src/__tests__/AdMob.test.ts` — NEW (mocked)

**Steps:**
- [ ] Write failing test: watchAd increments daily counter
- [ ] Write failing test: counter = 10 → ad unavailable
- [ ] Write failing test: midnight → counter resets
- [ ] Implement AdMobMonetization with daily limit
- [ ] FreeMonetization used in tests (confirms no real ad calls)
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(MON-2): add AdMob rewarded ads with 10/day limit`

### PR 3 — RevenueCat IAP (MON-3)

**Files:**
- `packages/monetization-plugin/src/implementations/RevenueCatMonetization.ts`
- `apps/game/src/__tests__/IAP.test.ts` — NEW (mocked)

**Steps:**
- [ ] Write failing test: purchase 100 diamonds → diamonds += 100
- [ ] Write failing test: purchase failure → no diamond change
- [ ] Implement 4 IAP packages (100/500/1200/3000)
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(MON-3): add RevenueCat IAP for diamond packages`

---

## Sprint 15 — Navigation + Store

**Goal:** Home screen, nav bar, store, player menu.
**Deliverable:** Full app navigation functional with store and player menu.
**PRs:** 2 PRs (Navigation / Store + Player menu)

### PR 1 — Home Screen + Nav Bar (NAV-1)

**Files:**
- `apps/game/src/screens/HomeScreen.tsx` — NEW
- `apps/game/src/navigation/AppNavigator.tsx` — updated
- `apps/game/src/__tests__/HomeScreen.test.tsx` — NEW

**Steps:**
- [ ] Write failing test: renders 3 nav buttons (Store / Play / Player)
- [ ] Write failing test: Play → mode selection (Contratos / Missões Especiais)
- [ ] Write failing test: gold + diamond balance shown
- [ ] Implement HomeScreen and AppNavigator
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(NAV-1): add home screen with 3-button nav bar`

### PR 2 — Store + Player Menu (SHOP-1, NAV-2)

**Files:**
- `apps/game/src/screens/StoreScreen.tsx` — NEW
- `apps/game/src/screens/PlayerMenuScreen.tsx` — NEW
- `apps/game/src/__tests__/StoreScreen.test.tsx` — NEW

**Steps:**
- [ ] Write failing test: store shows diamond packages (from RevenueCat)
- [ ] Write failing test: store does not show equipment (no pay-to-win)
- [ ] Write failing test: player menu shows equipped items + upgrade links
- [ ] Implement StoreScreen and PlayerMenuScreen
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(SHOP-1,NAV-2): add in-game store and player menu`

---

## Sprint 16 — Analytics + Admin

**Goal:** Events tracked in Firebase; admin can tune content via Supabase.
**Deliverable:** All 7 core events tracked; gold/difficulty editable from calibrator.
**PRs:** 2 PRs (Analytics / Admin + gold config)

### PR 1 — Firebase Analytics (ANA-1)

**Files:**
- `packages/analytics-plugin/src/implementations/FirebaseAnalytics.ts`
- `apps/game/src/services/AnalyticsService.ts`
- `apps/game/src/__tests__/Analytics.test.ts`

**Steps:**
- [ ] Write failing test for each of 7 events (NullAnalytics in tests)
- [ ] Implement FirebaseAnalytics firing all events
- [ ] Confirm NullAnalytics swapped in test mode
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(ANA-1): add Firebase Analytics for core gameplay events`

### PR 2 — Admin Dashboard + Gold Config (CAL-3, CAL-4)

**Files:**
- `apps/calibrator/src/AdminDashboard/` — NEW: views
- `apps/calibrator/src/CalibrationPanel/GoldSlider.tsx` — NEW

**Steps:**
- [ ] Write failing test: gold slider writes correct value to Supabase
- [ ] Write failing test: scatter plot renders completion rate per level
- [ ] Implement AdminDashboard with Supabase integration
- [ ] Gold slider: min/max/step configurable per phase
- [ ] Run tests → all green
- [ ] Commit: `[CAL] feat(CAL-3,CAL-4): add admin dashboard and gold reward config`

---

## Sprint 17 — Bonus Missions

**Goal:** Daily/weekly mission rotation.
**Deliverable:** Daily missions refresh at midnight; completing all weeklies → chest.
**PRs:** 1 PR

### PR 1 — Bonus Missions (BONUS-1)

**Files:**
- `apps/game/src/services/MissionService.ts` — NEW
- `apps/game/src/screens/MissionsScreen.tsx` — NEW
- `apps/game/src/__tests__/MissionService.test.ts` — NEW

**Steps:**
- [ ] Write failing test: daily missions reset at local midnight
- [ ] Write failing test: weekly missions reset Monday midnight
- [ ] Write failing test: complete daily → gold credited
- [ ] Write failing test: all weekly complete → chest drops
- [ ] Implement MissionService with Supabase pool
- [ ] MissionsScreen: list daily + weekly missions with progress
- [ ] Run tests → all green
- [ ] Commit: `[GAME] feat(BONUS-1): add daily and weekly bonus missions`

---

## Sprint 18 — Survival Mode (Backlog)

> Requires dedicated design session before starting.
> See backlog notes in `docs/ROADMAP.md`.

**Prerequisite:** Spec for Survival Mode written and approved.

**High-level steps (to be detailed in dedicated plan):**
- [ ] Write Survival Mode spec in `docs/superpowers/specs/`
- [ ] Create `docs/superpowers/plans/YYYY-MM-DD-sprint-18-survival.md`
- [ ] Implement procedural level generator
- [ ] Implement seamless phase transitions
- [ ] Add SurvivalModeScreen to navigation
- [ ] All tests green
- [ ] Commit: `[GAME] feat(SURV-1): add survival mode with procedural generation`

---

*Last updated: 2026-04-28*
