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
- One closed spec = one PR. Granularity lives in atomic commits, not in extra PRs
- One concern per commit — never mix domains
- Split into multiple PRs only if the diff is too big to review in one sitting, if the
  parts must merge/revert independently, or if agreed upfront
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
| 6A | Enemies (asteroid, fast, strong) | Game | ✅ Done (PR #13, #14) |
| 6B | Wave System (GL-2) | Game | ✅ Done (PR #19) |
| 7 | Dashboard Wave Editor | Calibrator | ✅ Done (PR #16) |
| 8 | Card System (rarity layer — 40 cards) | Game | 🚧 In Progress (PR #22) |
| 8B | Card Deck Wave 2 (shot mechanics — 17 cards) | Game | ⏳ Todo |
| 9 | Parallax & Terrain | Game | ⏳ Todo |
| 10 | Planet Structure | Game | ⏳ Todo |
| 11 | Boss System | Game | ⏳ Todo |
| 12 | Meta Progression | Game | ⏳ Todo |
| 13 | Auth + Firestore | Backend | ⏳ Todo |
| 14 | Supabase + Content Pipeline | Backend | ⏳ Todo |
| 15 | Monetization | Game | ⏳ Todo |
| 16 | Navigation + Store | Game | ⏳ Todo |
| 17 | Analytics + Admin | Backend | ⏳ Todo |
| 18 | Bonus Missions | Game | ⏳ Todo |
| 19 | Survival Mode | Game | ⏳ Backlog |

---

## Concluído

| Sprint | Feature | Status | PR | Codes |
|--------|---------|--------|-----|-------|
| 1 | Monorepo setup + dev environment | ✅ Done | bootstrap | INFRA |
| 2 | Level Engine | ✅ Done (PR #3) | — | ENGINE |
| 3 | Game MVP | ✅ Done (PR #3) | — | GL, HUD |
| 4 | Calibrator MVP | ✅ Done (PR #5) | — | CAL |
| 5a | Game Mechanics (controls + HUD) | ✅ Done (PR #8) | — | GL, HUD |
| 5b | Gameplay Foundation (HP + Fuel + XP + HUD) | ✅ Done (PR #9, #10) | — | HP, FUEL, XP, HUD |
| 6A | Enemies (asteroid, fast, strong) | ✅ Done (PR #13, #14) | — | S6-TYPES, ENEMY |
| 7 | Dashboard Wave Editor | ✅ Done (PR #16) | — | S7 |

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
- [x] FUEL-1: Fuel collectible spawns from asteroids at level 5+ (PR #19)
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

## Sprint 6 — Enemies & Waves (6A ✅ Done · 6B ✅ Done)

**Goal:** Add enemy variety (asteroids, fast, strong) and wave system.
**Deliverable:** 3 enemy types playable with configurable wave patterns per level.

> Sprint 6B (Wave System / GL-2) delivered in PR #19 (pipeline ponta a ponta).
> Implementation plan: `docs/superpowers/plans/2026-04-30-s6b-waves.md`

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 0 | Types | S6-TYPES | ✅ Done (PR #13) | #13 | Wave interface, hp on Enemy, waves? on LevelDefinition |
| 1 | Asteroids | ENEMY-1 | ✅ Done (PR #14) | #14 | Vertical movement, damage pickup drop |
| 2 | Fast Enemy | ENEMY-2 | ✅ Done (PR #14) | #14 | Burst fire (3 shots), high speed, low HP |
| 3 | Strong Enemy | ENEMY-3 | ✅ Done (PR #14) | #14 | High HP (200), low speed, registry-driven |
| 4 | Wave System | GL-2 | ✅ Done (PR #19) | #19 | Level has wave list; all waves cleared to advance |

### Todo List

- [x] ENEMY-1: Asteroid entity type with destructible flag
- [x] ENEMY-1: Asteroid moves top → bottom, blocks player path
- [x] ENEMY-1: Player bullet destroys asteroid → drop chance HP/fuel
- [x] ENEMY-1: Asteroid collision with player → HP damage
- [x] ENEMY-2: Fast enemy entity: high speed param, low HP, burst fire
- [x] ENEMY-2: Registered in EntityRegistry with xpValue = 2
- [x] ENEMY-3: Strong enemy entity: low speed, high HP (multi-hit), heavy shot
- [x] ENEMY-3: Registered in EntityRegistry with xpValue = 3
- [x] GL-2: `LevelDefinition.waves: Wave[]` — ordered list of spawn patterns (PR #19)
- [x] GL-2: Wave advances only when all enemies in wave are dead (PR #19)
- [x] GL-2: Level complete only when all waves are cleared (PR #19)
- [ ] GL-2: Wave pattern types: line, V, diamond, flanks, spiral — padrões avançados ficam pendentes (hoje só grade livre)
- [x] GL-2: Pattern editor in calibrator (visual grid) — delivered in Sprint 7 (PR #16)

---

## Sprint 7 — Dashboard Wave Editor

**Goal:** Unified dashboard in calibrator for editing World→Phase→Level→Wave with PostgreSQL backend.
**Deliverable:** Full content hierarchy editor with wave grid, pattern library, and JSON export.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Database Schema | S7-DB | ✅ Done (PR #16) | #16 | World, Phase, Level, Wave, Pattern models with Prisma |
| 2 | Service Layer | S7-SVC | ✅ Done (PR #16) | #16 | CRUD services with Zod validation + WaveScoreCalculator |
| 3 | Dashboard UI | S7-UI | ✅ Done (PR #16) | #16 | Sidebar + LevelEditor + WaveChipBar + EditorPane |
| 4 | Wave Grid Editor | S7-GRID | ✅ Done (PR #16) | #16 | Interactive grid with spawn zones, entity toolbox, pattern picker |
| 5 | Export to levels.json | S7-EXPORT | ✅ Done (PR #16) | #16 | DB → LevelDefinition[] → JSON with proper mapping |

> **Resolved 2026-08-26:** local branch `wip/s7-pattern-picker-ux` deleted. It held the
> whole Sprint 7 work already re-delivered squashed as PR #16; merging it would have
> reverted PRs #19/#20/#21. Archived as tag `archive/s7-pattern-picker-ux` (pushed to
> origin). The only unique content — the PatternPicker dropdown UX (`8da629c`) — is
> saved as a patch at `Documentations/Space-Invaders/s7-pattern-picker-dropdown.patch`.

---

## Sprint 8 — Card System (rarity layer)

> Moved from the original Sprint 7 slot when Dashboard Wave Editor took priority.
> **Scope rewritten 2026-08-26** against
> `docs/superpowers/specs/2026-08-26-card-system-design.md` (rarity ladder:
> 12 axes x rarity tiers = 40 cards, built only from state fields that already exist).
> The 6 mechanic-heavy cards of the old CARD-2 deck are **not dropped** — they are
> planned as **Sprint 8B** below, already designed with rarity tiers applied.

**Goal:** Close the roguelite loop — level-up pauses the run, player picks 1 of 3
rarity-tiered cards, the build grows measurably across a phase (x1.8 to x2.7 power).
**Deliverable:** 40 cards over 12 effect axes, no new bullet mechanic.

### Slicing rule for this sprint

Every delivery below is **hand-testable on the phone** — Maycon must be able to
open the build and *feel* the difference from the previous delivery. A slice that
cannot be felt while playing is a badly cut slice and gets merged into its neighbour.
One delivery = one closed spec = **one PR** (granularity lives in the commits).

| # | Delivery | Code | Status | PR | Deliverable | Hand test — what changes on the phone |
|---|----------|------|--------|-----|-------------|----------------------------------------|
| 0 | Pre-sprint hygiene | S8-PRE | ⏳ Todo | — | CI green on PRs + test hygiene + ROADMAP commit | Not felt in game — infra gate before the card work starts |
| 1 | Real damage numbers | DMG-1 | 🚧 In Progress (PR #22) | #22 | `Bullet.damage` + `Enemy.contactDamage` from `LevelParams` | HP bar drops in visible chunks; dying takes ~30 hits instead of 500; tweak the number in `levels.json` and feel it |
| 2 | Ship stats become data | STATS-1 | ⏳ Todo | — | `PLAYER_SPEED`, `BULLET_SPEED`, `INVINCIBILITY_DURATION`, `AUTO_FIRE_INTERVAL` out of constants into run state, seeded from `LevelParams` | Change a value in `levels.json`, reload: ship moves faster, fires faster, bullets travel faster |
| 3 | First real card | CARD-1 + CARD-3 + CARD-4 | ⏳ Todo | — | Two-stage draw engine + card screen with rarity colour/border + axes Damage and Fire rate (8 cards) | Level-up pauses, 3 coloured cards with names appear, pick one, enemies start dying faster. Take Damage 3x and watch it stop being offered |
| 4 | The Life category stops being placebo | CARD-5 | ⏳ Todo | — | Axes Max HP, Heal, Invulnerability, Experience (12 cards) + level-5 life guarantee + **pickups rendered on screen** | Level 5 always offers a life card; Heal barely shows up at full HP and shows up twice as often under 35%; fuel/HP drops are finally visible on screen |
| 5 | The ship changes handling | CARD-6 | ⏳ Todo | — | Axes Move speed, Bullet speed, Lifesteal (10 cards) | Ship visibly slides faster, bullets cross the screen quicker, killing enemies tops the HP bar back up |
| 6 | Crits and armour | CARD-7 | ⏳ Todo | — | Axes Crit, Flat armour (7 cards) + yellow crit number feedback | Yellow numbers pop on crits; with armour, weak enemy bullets scratch instead of hurting |
| 7 | Shield + build HUD | CARD-8 | ⏳ Todo | — | Axis Shield (3 cards, own timer state) + accumulated-build summary on the card screen | A hit is absorbed with no HP loss and the shield recharges; the card screen shows the current build ("+140% damage") |
| 8 | Optional extras | CARD-9 | ⏳ Todo | — | Catador (4 cards, section 8.6 option A) + Bomba (3 cards, needs `Enemy.grantsXp`) | Enemies drop pickups noticeably more often; the Bomba card wipes the screen — and does **not** chain level-ups |

**Card count:** 8 (delivery 3) → 20 (4) → 30 (5) → 37 (6) → **40 (7)** → 47 with the optionals.

### Todo List

- [x] S8-PRE: commit the pending `docs/ROADMAP.md` change (Sprint 6B done + this rewrite) (commit `7267c65`)
- [ ] S8-PRE: GitHub Actions workflow — `npm test` + `npm run build` on every PR
- [ ] S8-PRE: test hygiene — act() warning in `Sidebar.tsx:80`, unused imports in `WorldService.test.ts:18` and `schemas.test.ts:11`
- [x] DMG-1: `Bullet.damage: number` — every bullet carries its own damage (PR #22)
- [x] DMG-1: `Enemy.contactDamage: number` — body contact carries its own damage (PR #22)
- [x] DMG-1: both read from `LevelParams`; Planet 1 defaults bullet 15, contact 25 (PR #22)
- [ ] DMG-1: **editing surface still missing** — the calibrator maps params field by field
      (`worldToLevelDefinitions.ts:57`, `ExportService.ts:51`), so tuning the two numbers per
      phase needs a Prisma column + slider + Zod. The game already honours a per-enemy
      `properties.contactDamage` override, so levels can be hand-tuned meanwhile
- [x] DMG-1: replace the two hardcoded `p.hp - 1` in `collisions.ts:55` and `:72` (PR #22)
- [x] DMG-1: regression test — 500 HP dies in 20 contacts at damage 25, not 500 (PR #22)
- [ ] STATS-1: new run-state type for mutable ship stats (moveSpeed, bulletSpeed, invincibilityMs, autoFireIntervalMs)
- [ ] STATS-1: ⚠️ do **not** name it `PlayerStats` — that name is already taken in `@si/level-engine` (`types.ts:62`, calibration telemetry). Suggested: `ShipStats` or `RunStats`
- [ ] STATS-1: `AutoFireSystem.intervalMs` stops being `readonly`
- [ ] STATS-1: initial values seeded from `LevelParams`, defaults preserve current behaviour
- [ ] CARD-3: rarity ladder (1 / 1.6 / 2.5 / 4 / 6.5) + effect x rarity matrix as data
- [ ] CARD-3: two-stage draw — rarity first, then axis (so new cards never shift rarity odds)
- [ ] CARD-3: rarity weights per bracket (levels 1-3 / 4-6 / 7+) and per-planet escalation
- [ ] CARD-3: diminishing returns `weight x 0.55 ^ stacks`
- [ ] CARD-3: axis at stack cap leaves eligibility (weight 0)
- [ ] CARD-3: never two cards of the same axis in one screen of 3
- [ ] CARD-3: fewer than 3 eligible axes → show what there is (CARD-1 edge case)
- [ ] CARD-3: pure module, zero renderer dependency, TDD — reused as-is by Sprint 8B
- [ ] CARD-1: replace the "Cards coming in Sprint 7" placeholder in `GameScreen.tsx:405`
- [ ] CARD-1: 3 cards with axis icon, rarity colour and rarity border (1px / 2px / 2px+glow / 3px+glow / 3px+anim)
- [ ] CARD-1: pick a card → effect applied to run state → game resumes (plumbing already exists: `resumeFromCardSelection`)
- [ ] CARD-1: cards accumulate in `GameState.activeCards[]`, all lost on death
- [ ] CARD-1: level 10 boss kill → no card screen
- [ ] CARD-4: axis Damage (4 cards) — `bulletDamage`, additive over base, cap 5 stacks
- [ ] CARD-4: axis Fire rate (4 cards) — rate-based, `interval = 400 / (1 + sum)`, cap +150%
- [ ] CARD-5: axis Max HP (4 cards) — adds to `maxHp` **and** to `hp`
- [ ] CARD-5: axis Heal (3 cards) — instant, no stack, never leaves eligibility
- [ ] CARD-5: axis Invulnerability (3 cards) — cap +1200ms
- [ ] CARD-5: axis Experience (2 cards) — multiplier on `onEnemyKilled`
- [ ] CARD-5: level 5 → slot 1 drawn from the Life group only (rarity still random)
- [ ] CARD-5: context modifiers — Heal x0.2 above 90% HP, Heal x2.0 and Lifesteal x1.5 below 35%
- [ ] CARD-5: **render fuel and HP pickups** — they have collision today but are never drawn (blocks Heal/Catador feedback)
- [ ] CARD-5: XP resets to 0 at phase start (open item inherited from Sprint 5b)
- [ ] CARD-6: axis Move speed (3 cards) — cap +100%
- [ ] CARD-6: axis Bullet speed (3 cards) — cap +200% (physical cap: AABB per frame vs 32px enemy)
- [ ] CARD-6: axis Lifesteal (4 cards) — heal on kill via the existing `onEnemyKilled` hook
- [ ] CARD-7: axis Crit (4 cards) — `critChance` + `critMult`, cap 60%
- [ ] CARD-7: axis Flat armour (3 cards) — subtract flat damage, floor of 1 (only meaningful after DMG-1)
- [ ] CARD-7: crit visual feedback — yellow damage number
- [ ] CARD-8: axis Shield (3 cards) — `shieldCharges` + `shieldRechargeMs`, consumed before HP
- [ ] CARD-8: accumulated-build panel next to the 3 options
- [ ] CARD-9 (optional): Catador (4 cards) — extra pickup drop chance on kill
- [ ] CARD-9 (optional): Bomba (3 cards) — needs `Enemy.grantsXp: boolean`; bomb kills grant **score, not XP** (otherwise level-ups chain)

---

## Sprint 8B — Card Deck Wave 2 (shot mechanics)

**Planned sprint with closed scope — not a parking lot.** The 17 cards are fully
designed in section 8.3 of `2026-08-26-card-system-design.md`, with values and
rarity ranges settled. Wave 2 is what turns the build from "a spreadsheet that grows"
into "a ship that does new things" — the MVP is deliberately number-heavy and this
is the sprint that fixes it.

**Goal:** Give the deck personality — shot patterns, piercing, bouncing, homing.
**Deliverable:** 17 cards over 6 axes; total catalogue 57 cards / 18 axes.
**Depends on:** Sprint 8 (the draw engine is reused unchanged — a mechanic card is
just one more axis in the table).

| # | Delivery | Code | Status | PR | Deliverable | Hand test — what changes on the phone |
|---|----------|------|--------|-----|-------------|----------------------------------------|
| 1 | Bomba | CARD-10 | ⏳ Todo | — | 3 cards + `Enemy.grantsXp` flag (skip if it already shipped in Sprint 8) | Pick the card, the screen clears, and no level-up avalanche follows |
| 2 | Player shot patterns | CARD-11 | ⏳ Todo | — | `PLAYER_SHOT_PATTERNS` mirroring the enemy-side Strategy map from PR #21 | No card of its own — ships together with Multi-shot below |
| 3 | Multi-shot | CARD-12 | ⏳ Todo | — | 4 cards — extra bullets + spread angle + damage per extra bullet | **The most visible change in the whole catalogue**: the ship fires 3 then 5 bullets in a fan |
| 4 | Rear shot | CARD-13 | ⏳ Todo | — | 3 cards, no stack — rarity is the progression | Bullets come out the back of the ship; the Epic adds the two sides |
| 5 | Pierce | CARD-14 | ⏳ Todo | — | 3 cards — `Bullet.pierceRemaining` + damage falloff per target | One bullet drops a whole column of enemies; combos with Multi-shot |
| 6 | Ricochet | CARD-15 | ⏳ Todo | — | 2 cards (+1 Legendary reserved) — wall collision + direction vector on the bullet | Bullets bounce off the side walls and still kill |
| 7 | Homing | CARD-16 | ⏳ Todo | — | 2 cards (+1 Legendary reserved) — nearest-target search + per-frame steering | A missile curves in the air and chases the enemy — the most expensive one, last on purpose |

### Todo List

- [ ] CARD-10: `Enemy.grantsXp: boolean`; bomb kills give score, not XP
- [ ] CARD-10: rarity scales **area**, not power (bottom half → whole screen → whole screen + 3s invuln)
- [ ] CARD-11: `PLAYER_SHOT_PATTERNS: Record<PlayerShotKind, ShotFn>` mirroring `shooting.ts`
- [ ] CARD-11: `PlayerShotKind` union starts at `'single'`; every new pattern = one entry + one union member
- [ ] CARD-12: Multi-shot — 2 levers per tier (bullet count and damage per extra bullet), cap 2 stacks, stacks widen the fan 8° → 14° → 20°
- [ ] CARD-13: Rear shot — Uncommon 50% damage, Rare 85%, Epic adds 90° sides at 70%
- [ ] CARD-14: Pierce — falloff per target hit is what keeps it balanced; bullet stops dying on first hit
- [ ] CARD-15: Ricochet — bullet gains its own direction vector; starts at Rare (a Common bounce would be invisible)
- [ ] CARD-16: Homing — turn rate is the balance lever, not damage (90°/s vs 180°/s); cap 2 stacks, floor of 1 cycle

---

## Trilha B — Art in the game (runs parallel to the card sprints)

**Goal:** Stop rendering white rectangles — load the real sprites that already exist.
**Deliverable:** Player, the 3 enemies and both pickups drawn as art on the phone.

> Runs in parallel with the Sprint 8 deliveries: it only touches the render path
> (`renderers/`, `render/`, `GameScreen`), never the game systems.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Sprite loading + visible pickups | ART-1 | 🚧 In Progress (PR #23) | #23 | `drawSprite` draws images with rect fallback; fuel/HP pickups finally rendered |
| 2 | Frame animation | ART-2 | ⏳ Todo | — | f0/f1 enemy frames, player thrust/hurt/death |
| 3 | Bullet + explosion art | ART-3 | ⏳ Todo | — | `bullet-plasma-*`, `fx-explosion-*` |
| 4 | Audio | SFX-1 | ⏳ Todo | — | `expo-av`, planet theme + shot/hit/level-up SFX |

### Todo List

- [x] ART-1: `SkiaRenderer.drawSprite` renders a real image, falling back to the rect (PR #23)
- [x] ART-1: sprite atlas preloaded via `useImage` before the loop starts (PR #23)
- [x] ART-1: aspect-fit so wide sprites are not stretched into the square box (PR #23)
- [x] ART-1: fuel and damage pickups are drawn — they had collision but no render (PR #23)
- [ ] ART-1: **not verified on a device** — scale, alpha and the first-frame fallback flash
      still need `npx expo start` and a human looking at the screen
- [ ] ART-1: pickups are flat colour blocks — no pickup art exists among the 204 PNGs
- [ ] ART-1: `GameLoop.render()` became dead code once `GameScreen` moved to `renderScene()`;
      delete it with its tests after PR #22 and PR #23 both land
- [ ] ART-1: `BULLET_WIDTH`/`BULLET_HEIGHT` duplicated in `renderScene.ts` — dedupe on merge
- [ ] ART-1: `CanvasRenderer` (calibrator) still stubs `drawSprite`, so the browser does not
      show what the phone shows. `IRenderer` is unchanged, so they stay interchangeable

### Background and parallax — on hold

Maycon rejected the current parallax art (2026-10-23). The existing layers are scattered
convex blobs over a flat field: no ground surface, no value structure separating the layers,
no single light direction — a limit of the procedural canvas scripts, not a tuning problem.
**Nothing background-related ships until the art direction is re-decided** (pixel art 96px
vs illustrated, per the Archero reference) and a parallax spec exists: layer count, scroll
speed, contents, tile height, value range per layer, light direction.

---

## Sprint 9 — Parallax & Terrain

**Goal:** Multi-layer parallax scrolling and terrain-scrolling system.
**Deliverable:** Game renders scrolling background layers; terrain obstacles scroll with the map.

| # | Feature | Code | Status | PR | Deliverable |
|---|---------|------|--------|-----|-------------|
| 1 | Parallax Scrolling | PARA-1 | ⏳ Todo | — | N background layers at different speeds per planet |
| 2 | 2D Free Movement | GL-1 | ✅ Done (PR #20) | #20 | Joystick full X+Y, tela toda, +50% speed |

### Todo List

- [ ] PARA-1: `IRenderer.drawScrollingBackground(layers)` added to interface
- [ ] PARA-1: SkiaRenderer implements drawScrollingBackground
- [ ] PARA-1: CanvasRenderer implements drawScrollingBackground
- [ ] PARA-1: `ParallaxLayer` type: imageKey, scrollSpeed, offsetY
- [ ] PARA-1: Layers configurable per planet in calibrator
- [ ] PARA-1: Boss level → parallax pauses during boss fight → resumes on kill
- [x] GL-1: Joystick Y-axis movement implemented (full 2D, PR #20)
- [x] GL-1: Player speed constant increased (+50%, 200→300, PR #20)
- [x] GL-1: Player bounded within CANVAS bounds on both axes (PR #20)

---

## Sprint 10 — Planet Structure

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

## Sprint 11 — Boss System

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

## Sprint 12 — Meta Progression

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
- [ ] META-1: once the wallet exists, re-evaluate CARD-GOLD (Gold Rush with per-phase cap) — only if Catador (CARD-9) proved insufficient
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

## Sprint 13 — Auth + Firestore

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

## Sprint 14 — Supabase + Content Pipeline

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

## Sprint 15 — Monetization

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

## Sprint 16 — Navigation + Store

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

## Sprint 17 — Analytics + Admin

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

## Sprint 18 — Bonus Missions

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

## Sprint 19 — Survival Mode (Backlog)

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

## Tech Debt & Gaps — audit 2026-06-12

Gaps found in the post-Sprint-7 audit. The two CRITICAL items block the core promise
of the project (calibrator → levels.json → game) and should be scheduled alongside
Sprint 6B, before new gameplay features.

| Priority | Item | Detail |
|----------|------|--------|
| ✅ Done (PR #19) | Close levels.json pipeline end-to-end | Game consumes `levels.json` via LevelSource; wave timing contract, validation fences (waves/collision/empty/player-row), registry props resolved per wave |
| ✅ Done (PR #19) | Align game EntityRegistry ↔ calibrator toolbox | Registry props resolved inside waves; contracts match; covered by the levels.json contract test |
| ✅ Done (PR #19) | Dashboard hardening | revalidate + clean error handling, error boundary, reorderWaves IDOR guard, export publication fence, phase draft status + publish, client state re-sync |
| ✅ Done (PR #20) | Game feel | 2D joystick (GL-1), enemy micro-movement per type + multidirectional asteroid, contact damage, win ignores asteroids, conditional fuel drain |
| ✅ Done (PR #21) | GameLoop refactor | God Object → conductor + pure systems (aabb/buildEnemy/movement/shooting/bullets/fuel/pickups/collisions/invincibility/autoFire); movement & shooting as Strategy maps; explicit resolveStatus; enables pluggable shot/movement types, no behavior change |
| 🟠 High | No CI | Add GitHub Actions workflow: `npm test` + `npm run build` on every PR — **scheduled as Sprint 8 delivery 0 (S8-PRE)** |
| 🟡 Medium | Release infra missing | `eas.json`, bundle id / Android package name, privacy policy, UMP consent |
| 🟢 Low | Test hygiene | `Sidebar` test triggers act() warning (`Sidebar.tsx:80`); unused imports in `WorldService.test.ts:18` and `schemas.test.ts:11` — **scheduled as Sprint 8 delivery 0 (S8-PRE)** |
| 🟠 High | Pickups are invisible | Fuel and HP pickups have collision but are never drawn — no reference to them in `GameScreen.tsx`. Blocks Heal/Catador feedback. **Scheduled inside CARD-5 (Sprint 8 delivery 4)** |
| 🟠 High | No sprites, no audio | `SkiaRenderer.drawSprite()` still draws a white rectangle (`SkiaRenderer.ts:32`, "Sprint 3 MVP"); `apps/game/assets/` only has icon/splash; zero audio deps. 204 PNGs and 4 music themes are ready in `Documentations/Space-Invaders/assets-preview/` but **nothing is wired into the game**. Track B, runs in parallel with Sprint 8 |
| 🟡 Medium | Fast enemy feels weak | Reported 2026-06-14. **Deferred on purpose**: DMG-1 gives the fast enemy real contact damage, which may fix the feel by itself. Re-evaluate by hand after Sprint 8 delivery 1 before touching the movement code |

### Pending decisions

- [x] Branch `wip/s7-pattern-picker-ux` — **resolved 2026-08-26 (Maycon approved).**
      Archived as tag `archive/s7-pattern-picker-ux` (pushed to origin) and deleted
      locally; it never existed on the remote. The dropdown UX from commit `8da629c`
      (3 files: `PatternPicker.tsx`, `SpawnZoneGrid.tsx`, `tsconfig.json`) is saved at
      `Documentations/Space-Invaders/s7-pattern-picker-dropdown.patch` — evaluate it
      during S8-PRE; the `tsconfig.json` hunk is ~2 months stale, review before applying.
- [x] PR size rule — **resolved 2026-08-26 (Maycon approved).** The "~15 files per PR"
      rule was abolished 2026-06-12; `ROADMAP.md` and `CLAUDE.md` now state: one closed
      spec = one PR, granularity in atomic commits.

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
| Card Deck Wave 3 — Legendaries | CARD-L3 | 4 trade-off cards (section 9 of the card design doc) + 2 that come free from Sprint 8B (infinite Ricochet, double Homing). Weight 0 on Planets 1–2; only makes sense once Planet 3 exists |
| Gold Rush with per-phase cap | CARD-GOLD | Section 8.6 option B. Blocked twice: `gold` does not exist in code (Sprint 12) and the raw version breaks the anti-farm rule. The Catador variant (option A) ships in Sprint 8 as CARD-9 and may make this unnecessary |

---

## Legend

| Icon | Meaning |
|------|---------|
| ⏳ Todo | Not started |
| 🚧 In Progress | In development (PR #N) |
| ✅ Done | Merged (PR #N) |
| 🔴 Blocked | Blocked — reason |
