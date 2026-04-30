# Roadmap

> **Living document** — must always reflect current state.
> See `docs/superpowers/specs/FEATURES.md` for full acceptance criteria per feature.
> See `docs/superpowers/plans/` for detailed sprint implementation plans.

---

## PR Rules — Mandatory

Every PR **must** follow these rules without exception:

### When opening a PR
1. Update this file: change feature status to `🚧 In Progress (PR #N)`
2. This ROADMAP update must be part of the **same commit** as the code change
3. PR title format: `[SCOPE] type(DOMAIN-N): short description`
4. PR must have a **deliverable** — a working, testable slice of functionality

### When merging a PR
1. Update this file: change feature status to `✅ Done (PR #N)`
2. Check off completed todo items in the sprint table
3. This ROADMAP update must be part of the **same commit** as the merge

### What counts as a deliverable
A PR is only valid if it ships something that can be tested end-to-end. Examples:
- ✅ HP bar visible in game, takes damage, reaches 0 → game over
- ✅ Fuel bar drains per level, collectible restores it
- ❌ "WIP: partial HP implementation" — not a deliverable
- ❌ "Added files, tests pending" — not a deliverable

### PR size rules
- Max ~15 files per PR
- One concern per commit — never mix domains
- Never push directly to `main`

---

## Sprint Overview

| Sprint | Name | Phase | Status |
|--------|------|-------|--------|
| 1 | Monorepo Setup | Infra | ✅ Done |
| 2 | Level Engine | Engine | ✅ Done (PR #3) |
| 3 | Game MVP | Game | ✅ Done (PR #3) |
| 4 | Calibrator MVP | Calibrator | ✅ Done (PR #5) |
| 5a | Game Mechanics (controls + HUD) | Game | ✅ Done (PR #8) |
| 5b | Gameplay Foundation (HP + Fuel + XP + HUD) | Game | ✅ Done (PR #9, #10) |
| 6 | Enemies & Waves | Game | ⏳ Todo |
| 7 | Card System | Game | ⏳ Todo |
| 8 | Parallax & Terrain | Game | ⏳ Todo |
| 9 | Planet Structure | Game | ⏳ Todo |
| 10 | Boss System | Game | ⏳ Todo |
| 11 | Meta Progression | Game | ⏳ Todo |
| 12 | Auth + Firestore | Backend | ⏳ Todo |
| 13 | Supabase + Content Pipeline | Backend | ⏳ Todo |
| 14 | Monetization | Game | ⏳ Todo |
| 15 | Navigation + Store | Game | ⏳ Todo |
| 16 | Analytics + Admin | Backend | ⏳ Todo |
| 17 | Bonus Missions | Game | ⏳ Todo |
| 18 | Survival Mode | Game | ⏳ Backlog |

---

## Concluído

| Sprint | Feature | Status | PR | Codes |
|--------|---------|--------|-----|-------|
| 1 | Monorepo setup + dev environment | ✅ Done | bootstrap | INFRA |
| 2 | Level Engine | ✅ Done (PR #3) | — | ENGINE |
| 3 | Game MVP | ✅ Done (PR #3) | — | GL, HUD |
| 4 | Calibrator MVP | ✅ Done (PR #5) | — | CAL |
| 5a | Game Mechanics (controls + HUD) | ✅ Done (PR #8) | — | GL, HUD |

---

## Sprint 5b — Gameplay Foundation

**Goal:** Replace lives with HP bar, add fuel system, XP system and update HUD.
**Deliverable:** Game playable with HP + fuel mechanics and 3-bar HUD.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | HP Bar System | HP-1 | ✅ Done (PR #9) | — | HP bar replaces hearts, damage reduces bar, 0 → game over |
| 2 | Life Drops | HP-2 | ⏳ Todo | — | Enemies/asteroids drop +20% HP pickups |
| 3 | Fuel System | FUEL-1 | ✅ Done (PR #9) | — | Tank drains per level, collectible from level 5 restores it |
| 4 | XP System | XP-1 | ✅ Done (PR #10) | — | Kills → XP bar fills → level-up triggers card screen |
| 5 | HUD Update | HUD-1 | ✅ Done (PR #9, #10) | — | 3 horizontal bars (HP, FUEL, XP finer) + integer values |

### Todo List

- [x] HP-1: Refactor `GameState.player.lives` → `player.hp: number` in GameLoop
- [x] HP-1: Update collision to reduce HP instead of decrement lives
- [x] HP-1: HUD bar renders HP/maxHp ratio with integer label
- [ ] HP-2: Enemy kill has configurable drop chance for HP pickup
- [ ] HP-2: HP pickup entity type registered in EntityRegistry
- [ ] HP-2: Pickup collision restores 20% of maxHp
- [x] FUEL-1: Add `fuel: number` to GameState
- [x] FUEL-1: Fuel drains at configurable rate per level tick
- [x] FUEL-1: Fuel = 0 → game over (fuel starvation)
- [ ] FUEL-1: Fuel collectible spawns from asteroids at level 5+
- [x] FUEL-1: Collecting fuel restores tank to full
- [x] XP-1: Add `xp: number, xpToNext: number, playerLevel: number` to GameState
- [x] XP-1: Enemy kill increments xp by type's xpValue
- [x] XP-1: xp reaches xpToNext → playerLevel++ → card screen triggered
- [ ] XP-1: XP resets to 0 each phase start
- [x] HUD-1: Replace heart icons with HP bar component
- [x] HUD-1: Add FUEL bar (same width, below HP)
- [x] HUD-1: Add XP bar (thinner, below FUEL)
- [x] HUD-1: All bars show current integer value

---

## Sprint 6 — Enemies & Waves

**Goal:** Add enemy variety (asteroids, fast, strong) and wave system.
**Deliverable:** 3 enemy types playable with configurable wave patterns per level.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 0 | Types | S6-TYPES | ✅ Done (PR #13) | #13 | Wave interface, hp on Enemy, waves? on LevelDefinition |
| 1 | Asteroids | ENEMY-1 | 🚧 In Progress (PR #14) | #14 | Vertical movement, damage pickup drop |
| 2 | Fast Enemy | ENEMY-2 | 🚧 In Progress (PR #14) | #14 | Burst fire (3 shots), high speed, low HP |
| 3 | Strong Enemy | ENEMY-3 | 🚧 In Progress (PR #14) | #14 | High HP (200), low speed, registry-driven |
| 4 | Wave System | GL-2 | ⏳ Todo | — | Level has wave list; all waves cleared to advance |

### Todo List

- [ ] ENEMY-1: Asteroid entity type with destructible flag
- [ ] ENEMY-1: Asteroid moves top → bottom, blocks player path
- [ ] ENEMY-1: Player bullet destroys asteroid → drop chance HP/fuel
- [ ] ENEMY-1: Asteroid collision with player → HP damage
- [ ] ENEMY-2: Fast enemy entity: high speed param, low HP, burst fire
- [ ] ENEMY-2: Registered in EntityRegistry with xpValue = 2
- [ ] ENEMY-3: Strong enemy entity: low speed, high HP (multi-hit), heavy shot
- [ ] ENEMY-3: Registered in EntityRegistry with xpValue = 3
- [ ] GL-2: `LevelDefinition.waves: Wave[]` — ordered list of spawn patterns
- [ ] GL-2: Wave advances only when all enemies in wave are dead
- [ ] GL-2: Level complete only when all waves are cleared
- [ ] GL-2: Wave pattern types: line, V, diamond, flanks, spiral
- [ ] GL-2: Pattern editor in calibrator (visual grid)

---

## Sprint 7 — Card System

**Goal:** Implement card selection screen triggered by XP level-up.
**Deliverable:** Player levels up mid-run → pause → pick 1 of 3 cards → effect applied.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Card Selection Screen | CARD-1 | ⏳ Todo | — | Pause on level-up, show 3 cards, player picks 1 |
| 2 | Card Deck MVP | CARD-2 | ⏳ Todo | — | 14 cards for Planet 1 with full effects |

### Todo List

- [ ] CARD-1: `CardDefinition` type: id, name, description, effect, weight
- [ ] CARD-1: Card deck per planet loaded from level config
- [ ] CARD-1: On level-up → game pauses → 3 random cards drawn from deck
- [ ] CARD-1: Cards already held have reduced weight (diminishing returns)
- [ ] CARD-1: Player selects card → effect applied to GameState → game resumes
- [ ] CARD-1: Cards accumulate in `GameState.activeCards[]`
- [ ] CARD-1: All cards lost on death
- [ ] CARD-1: Level 10 boss kill → no card screen (phase ends)
- [ ] CARD-1: Level 5 card pool always includes ≥1 life/HP option
- [ ] CARD-2: Implement 14 cards: double shot, rear shot, ricochet, missile, +speed, faster bullet, shield, invincibility extend, screen bomb, pierce ray, vampire, gold on kill, HP restore, HP max up
- [ ] CARD-2: Each card has `stackable: boolean` and `effect: CardEffect`
- [ ] CARD-2: Tests for each card effect applied to player stats

---

## Sprint 8 — Parallax & Terrain

**Goal:** Multi-layer parallax scrolling and terrain-scrolling system.
**Deliverable:** Game renders scrolling background layers; terrain obstacles scroll with the map.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Parallax Scrolling | PARA-1 | ⏳ Todo | — | N background layers at different speeds per planet |
| 2 | 2D Free Movement | GL-1 | ⏳ Todo | — | Joystick → full X+Y movement, higher speed |

### Todo List

- [ ] PARA-1: `IRenderer.drawScrollingBackground(layers)` added to interface
- [ ] PARA-1: SkiaRenderer implements drawScrollingBackground
- [ ] PARA-1: CanvasRenderer implements drawScrollingBackground
- [ ] PARA-1: `ParallaxLayer` type: imageKey, scrollSpeed, offsetY
- [ ] PARA-1: Layers configurable per planet in calibrator
- [ ] PARA-1: Boss level → parallax pauses during boss fight → resumes on kill
- [ ] GL-1: Joystick Y-axis movement implemented (currently X-only)
- [ ] GL-1: Player speed constant increased
- [ ] GL-1: Player bounded within CANVAS bounds on both axes

---

## Sprint 9 — Planet Structure

**Goal:** Full planet/phase/level progression structure and revive system.
**Deliverable:** Player can progress through phases 1–10 of Planet 1; planet hub screen exists.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Planet/Phase/Level Structure | PLANET-1 | ⏳ Todo | — | 1 planet, 10 phases, 10 levels; progression unlocks |
| 2 | Planet Hub Screen | PLANET-2 | ⏳ Todo | — | Hub with planet art, name, phase progress |
| 3 | Pause/Revive | GL-3 | ⏳ Todo | — | Death → pause → revive screen (1× per run) |

### Todo List

- [ ] PLANET-1: `LevelRequest` supports `planetIndex, phaseIndex, levelIndex`
- [ ] PLANET-1: Phase unlocks sequentially (phase N+1 unlocks when phase N level 10 cleared)
- [ ] PLANET-1: Checkpoint saved at level where player died
- [ ] PLANET-1: Player can replay completed phases (gold = 20% replay rate)
- [ ] PLANET-2: PlanetHubScreen component with phase grid (10×10 levels)
- [ ] PLANET-2: Completed phases/levels shown with visual indicator
- [ ] PLANET-2: Planet name, theme art, progress % shown
- [ ] GL-3: Death → GameLoop status = `'dead'` → GameScreen shows ReviveScreen
- [ ] GL-3: ReviveScreen: "Watch Ad" / "50 Diamonds" / "Game Over" options
- [ ] GL-3: Revive restores 50% HP and resumes from same level
- [ ] GL-3: Only 1 revive allowed per run (second death → game over)
- [ ] GL-3: Narrative lore screen between planets (simple text, "A Ordem...")

---

## Sprint 10 — Boss System

**Goal:** Boss fights at phase 5 level 10, phase 10 level 5, and phase 10 level 10.
**Deliverable:** 3 boss types functional; dual boss spawns at phase 10 level 10.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Basic Boss | BOSS-1 | ⏳ Todo | — | Standard boss — phase 5 level 10 and phase 10 |
| 2 | Fast Boss | BOSS-2 | ⏳ Todo | — | High-speed boss variant |
| 3 | Strong Boss | BOSS-3 | ⏳ Todo | — | High-HP multi-phase boss variant |
| 4 | Dual Boss | BOSS-4 | ⏳ Todo | — | 2 bosses simultaneous — phase 10 level 10 |

### Todo List

- [ ] BOSS-1: `BossEntity` with HP bar, phase-based behavior patterns
- [ ] BOSS-1: Boss spawns at correct levels (phase 5/L10, phase 10/L5, phase 10/L10)
- [ ] BOSS-1: Parallax pauses on boss arena entry
- [ ] BOSS-1: Boss death → chest drops immediately (before phase end screen)
- [ ] BOSS-1: Boss configured via `BossConfig` in LevelDefinition
- [ ] BOSS-1: `enrageThreshold?: number` field reserved but not implemented
- [ ] BOSS-2: Fast boss entity: high speed movement, burst patterns
- [ ] BOSS-3: Strong boss entity: very high HP, slower, heavy damage
- [ ] BOSS-4: Dual spawn: same boss type by default, configurable in calibrator
- [ ] BOSS-4: Both bosses must die to complete level
- [ ] All bosses: xpValue significantly higher than regular enemies
- [ ] All bosses: drop rates skewed toward Raro+ rarities

---

## Sprint 11 — Meta Progression

**Goal:** Permanent upgrades (hangar) and equipment system.
**Deliverable:** Player can buy upgrades with gold and equip items; hangar UI functional.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Permanent Upgrades | META-1 | ⏳ Todo | — | 8 upgrades × 10 levels, bought with gold |
| 2 | Hangar Screen | META-2 | ⏳ Todo | — | Bottom-sheet UI: character view + inventory |
| 3 | Equipment System | INV-1 | ⏳ Todo | — | 2 slots (cannon + armor), 5 rarities |
| 4 | Merge System | INV-2 | ⏳ Todo | — | 3× same item + rarity → next rarity |
| 5 | Inventory UI | INV-3 | ⏳ Todo | — | Scrollable inventory grid in hangar |
| 6 | Reward Chests | INV-4 | ⏳ Todo | — | Phase completion drops chest with random equipment |

### Todo List

- [ ] META-1: `PlayerUpgrades` type with 8 upgrade slots × level 0–10
- [ ] META-1: Upgrade costs: 200→400→800→1600→3200 (L1–5), L6–10 locked
- [ ] META-1: Each upgrade applies stat modifier to PlayerStats at run start
- [ ] META-1: Gold deducted from player wallet on purchase
- [ ] META-2: HangarScreen with bottom-sheet (expandable top/bottom panels)
- [ ] META-2: Top panel: ship render + equipped items
- [ ] META-2: Bottom panel: inventory grid (all collected items)
- [ ] META-2: Scroll up → inventory expands; scroll down → ship view expands
- [ ] INV-1: `EquipmentItem` type: id, slot, rarity, baseStats, ability
- [ ] INV-1: 2 slots: cannon (weapon) and armor
- [ ] INV-1: Weapon types: Canhão, Laser, Metralhadora
- [ ] INV-1: Armor types: Casco Leve (dodge chance), Casco Pesado (collision resist)
- [ ] INV-1: Equipped items applied to PlayerStats at run start
- [ ] INV-2: Merge: select 3 of same type + rarity → confirm → new item at next rarity
- [ ] INV-2: Merge costs gold (to define in calibrator)
- [ ] INV-3: Inventory grid showing all collected items with rarity color coding
- [ ] INV-3: Item detail view on tap (stats, ability, rarity)
- [ ] INV-4: `ChestReward` type with rarity weighted by phase difficulty
- [ ] INV-4: Phase completion → chest animation → item revealed
- [ ] INV-4: Boss chest: same flow, higher rarity weight

---

## Sprint 12 — Auth + Firestore

**Goal:** Player data persistence with Firebase.
**Deliverable:** Player data (gold, upgrades, inventory) persists across sessions offline-first.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Firebase Anonymous Auth | AUTH-1 | ⏳ Todo | — | Auto login, no friction, persistent UID |
| 2 | Firebase Firestore | DB-1 | ⏳ Todo | — | Player data offline-first + online sync |
| 3 | Offline→Online Sync | DB-3 | ⏳ Todo | — | Reconcile local state when reconnecting |

### Todo List

- [ ] AUTH-1: Firebase SDK installed (game only, not packages)
- [ ] AUTH-1: Anonymous auth on first launch, UID persisted
- [ ] AUTH-1: Auth state listener updates app context
- [ ] DB-1: `PlayerDocument` schema: uid, gold, diamonds, upgrades, inventory, progress
- [ ] DB-1: Firestore writes happen locally first (offline-first)
- [ ] DB-1: Sync when online restored (Firestore native offline support)
- [ ] DB-1: `PlayerRepository` interface: save, load, update
- [ ] DB-3: Conflict resolution: local timestamp wins (last-write-wins)
- [ ] DB-3: Sync status indicator in UI (optional, dev-only)

---

## Sprint 13 — Supabase + Content Pipeline

**Goal:** Game content (planets, waves, cards) served from Supabase, no rebuild needed.
**Deliverable:** Adding a new planet or card in Supabase reflects in app after content refresh.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Supabase Setup | DB-2 | ⏳ Todo | — | Postgres schema for game content |
| 2 | Game Content via API | DB-4 | ⏳ Todo | — | Planets, phases, waves, cards via Supabase REST |

### Todo List

- [ ] DB-2: Supabase project created, schema: planets, phases, levels, wave_patterns, card_definitions
- [ ] DB-2: Supabase SDK added to game (not packages)
- [ ] DB-4: `ContentRepository`: fetchPlanets, fetchCards, fetchWavePatterns
- [ ] DB-4: Content cached locally on first fetch
- [ ] DB-4: Content refresh on app open (background)
- [ ] DB-4: Fallback to cache if offline
- [ ] DB-4: Gold rewards per phase configurable in Supabase

---

## Sprint 14 — Monetization

**Goal:** Energy system, rewarded ads, and IAP.
**Deliverable:** Energy gates runs; ads and IAP grant energy/diamonds.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Energy System | MON-1 | ⏳ Todo | — | 150 max, 10/run, 1/min passive recharge |
| 2 | AdMob Rewarded | MON-2 | ⏳ Todo | — | Revive / energy / diamonds (max 10 ads/day) |
| 3 | RevenueCat IAP | MON-3 | ⏳ Todo | — | Diamond packages (R$4,99 / R$19,99 / R$39,99 / R$89,99) |

### Todo List

- [ ] MON-1: `EnergySystem`: max 150, cost 10/run, recharge 1/min
- [ ] MON-1: Energy state persisted in Firestore
- [ ] MON-1: Energy depleted → run blocked → "Watch Ad / Buy Energy / Wait" screen
- [ ] MON-1: Recharge timer runs in background (persisted start time)
- [ ] MON-2: AdMob SDK integrated (FreeMonetization in dev/test)
- [ ] MON-2: Daily ad counter (max 10): resets at local midnight
- [ ] MON-2: Rewarded ad types: revive (50% HP), energy (10), diamonds (X)
- [ ] MON-2: Ad counter persisted in Firestore
- [ ] MON-3: RevenueCat SDK integrated
- [ ] MON-3: 4 IAP packages configured: 100/500/1200/3000 diamonds
- [ ] MON-3: Purchase flow: tap → native IAP → diamonds credited → Firestore updated

---

## Sprint 15 — Navigation + Store

**Goal:** Home screen, nav bar, in-game store and player menu.
**Deliverable:** Full app navigation flow functional; store shows IAP packages.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Home Screen + Nav Bar | NAV-1 | ⏳ Todo | — | 3-button nav: Store / Play / Player |
| 2 | In-Game Store | SHOP-1 | ⏳ Todo | — | Cosmetics, diamond packages |
| 3 | Player Menu | NAV-2 | ⏳ Todo | — | Skin, equipment, upgrades, stats |

### Todo List

- [ ] NAV-1: HomeScreen with 3-button nav bar (Store / Play / Player)
- [ ] NAV-1: Play button → mode selection (Contratos / Missões Especiais)
- [ ] NAV-1: Player gold + diamond balance shown in header
- [ ] SHOP-1: StoreScreen with diamond packages (from RevenueCat)
- [ ] SHOP-1: Cosmetic skins section (ship skins, bullet effects)
- [ ] SHOP-1: No equipment sold directly (no pay-to-win)
- [ ] NAV-2: PlayerMenuScreen: skin selector, equipment slots, upgrade shortcuts
- [ ] NAV-2: Stat summary: total XP, levels cleared, boss kills

---

## Sprint 16 — Analytics + Admin

**Goal:** Firebase Analytics events and admin dashboard for calibration.
**Deliverable:** Game events tracked in Firebase; admin can adjust gold/difficulty in Supabase.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Firebase Analytics | ANA-1 | ⏳ Todo | — | Core gameplay events tracked |
| 2 | Admin Dashboard | CAL-3 | ⏳ Todo | — | Supabase + calibrator integrated |
| 3 | Configurable Gold | CAL-4 | ⏳ Todo | — | Gold slider per phase in calibrator |

### Todo List

- [ ] ANA-1: `AnalyticsPlugin` fire events: level_start, level_complete, level_fail
- [ ] ANA-1: Events: boss_defeated, card_picked, equipment_merged, ad_watched
- [ ] ANA-1: NullAnalytics in dev; Firebase in production
- [ ] CAL-3: Admin panel in calibrator reads/writes Supabase directly
- [ ] CAL-3: View: all planets, phases, completion rates per level (scatter plot)
- [ ] CAL-4: Gold reward slider per phase (base + planet multiplier)
- [ ] CAL-4: Changes write to Supabase → reflected in game via content refresh

---

## Sprint 17 — Bonus Missions

**Goal:** Daily and weekly mission rotation with gold and chest rewards.
**Deliverable:** Daily missions refresh each midnight; completing all weekly missions grants a chest.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Bonus Missions | BONUS-1 | ⏳ Todo | — | Daily (gold) + weekly (chest on all complete) mission rotation |

### Todo List

- [ ] BONUS-1: `MissionDefinition` in Supabase: id, type (daily/weekly), description, reward
- [ ] BONUS-1: Daily pool rotates at local midnight; weekly pool rotates Monday
- [ ] BONUS-1: MissionsScreen shows current daily + weekly missions
- [ ] BONUS-1: Classic Space Invaders gameplay (existing mode, grid + horizontal movement)
- [ ] BONUS-1: Daily mission complete → gold credited
- [ ] BONUS-1: All weekly missions complete → chest dropped
- [ ] BONUS-1: Mission progress persisted in Firestore

---

## Sprint 18 — Survival Mode (Backlog)

**Goal:** Infinite procedural mode with seamless phase transitions.
**Deliverable:** Survival mode playable; phases chain seamlessly with increasing difficulty.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Survival Mode | SURV-1 | ⏳ Backlog | — | Procedural, seamless transitions, reuses Contratos layouts |

### Todo List

- [ ] SURV-1: Spec and design session before implementation
- [ ] SURV-1: Procedural level generator using Contratos phase layouts as building blocks
- [ ] SURV-1: No pause between phases (seamless transition)
- [ ] SURV-1: Difficulty scales with score
- [ ] SURV-1: SurvivalModeScreen added to navigation

---

## Backlog

| Item | Código | Notas |
|------|--------|-------|
| Google login | AUTH-2 | Firebase Social Auth, links anonymous account |
| Equipment slots 3–4 (Reator + Escudo) | INV-5 | Confirm design before implementing |
| Equipment slots 5–6 (Drone + Module) | INV-6 | Future expansion |
| Leaderboard online | PLANET-3 | Requires backend |
| SimulationCalibratorStrategy | ENGINE-1 | v2 calibration |
| TelemetryCalibratorStrategy | ENGINE-2 | v3 calibration |
| Second planet | PLANET-4 | Assets + data in Supabase, no rebuild |
| Boss enrage at 50% HP | BOSS-5 | `enrageThreshold` field reserved in BossConfig |

---

## Legend

| Icon | Meaning |
|------|---------|
| ⏳ Todo | Not started |
| 🚧 In Progress | In development (PR #N) |
| ✅ Done | Merged (PR #N) |
| 🔴 Blocked | Blocked — reason |
