# Feature Registry

> Detailed acceptance criteria, test cases, and edge cases for every feature.
> See `docs/ROADMAP.md` for sprint status and todo lists.
> See `docs/superpowers/specs/2026-04-27-game-design-v2.md` for full game design.

---

## HP-1: HP Bar System

**Sprint:** 5b | **Domain:** HP | **Dependencies:** GameLoop, GameState, HUD

**Description:**
Replaces the 3 discrete lives with a continuous HP bar. Player starts with 500 HP. Damage reduces the bar. HP reaching 0 triggers death. Invincibility window prevents immediate re-damage.

**Details:**
- Base HP: 500 (no upgrades)
- HP displayed as integer (e.g. 380, not 380.4)
- Invincibility timer of 1500ms after taking a hit (existing mechanic, preserved)
- HP cannot go below 0 or above maxHp
- `GameState.player.lives` removed; replaced by `player.hp` and `player.maxHp`

**Acceptance Criteria:**
- [ ] Player starts each phase with full HP (500 base or maxHp with upgrades)
- [ ] Taking a hit reduces hp by enemy's damage value
- [ ] HP bar in HUD shows current/max ratio visually
- [ ] Integer value of current HP displayed next to bar
- [ ] HP at 0 → game status transitions to `'dead'`
- [ ] Invincibility window prevents double-hits

**Test Cases:**
- Player instantiated with hp = maxHp = 500
- Enemy bullet hit reduces hp by bullet.damage
- Multiple simultaneous hits during invincibility window only apply one hit
- HP reduced to exactly 0 → status = 'dead'
- HP never becomes negative (clamp at 0)
- HP never exceeds maxHp (clamp at maxHp)

**Edge Cases:**
- Very high-damage hit that would exceed current HP → clamp to 0, not negative
- Hit at exactly hp = 1 → hp = 0 → dead immediately
- Invincibility expires exactly when next bullet arrives → hit registers correctly

---

## HP-2: Life Drops

**Sprint:** 5b | **Domain:** HP | **Dependencies:** HP-1, ENEMY-1, EntityRegistry

**Description:**
Enemies and asteroids have a configurable chance to drop an HP pickup on death. Collecting it restores 20% of the player's maxHp.

**Details:**
- Drop chance configurable per entity type (default: 15%)
- Pickup entity moves toward player slowly or stays at drop location
- One HP pickup at a time per enemy (not stacking drops)
- Restore amount: 20% of current maxHp (integer, floored)

**Acceptance Criteria:**
- [ ] Enemy death triggers drop roll with configured probability
- [ ] HP pickup renders visibly on screen
- [ ] Player touching pickup removes it and increases hp
- [ ] Restore amount is 20% of maxHp (not current HP)
- [ ] HP cannot exceed maxHp after pickup

**Test Cases:**
- Drop roll with probability 1.0 always drops pickup
- Drop roll with probability 0.0 never drops pickup
- Pickup collected at hp = 400, maxHp = 500 → hp = 500 (capped, not 500 + 100)
- Pickup collected at hp = 500, maxHp = 500 → hp stays at 500
- Pickup collected at hp = 100, maxHp = 500 → hp = 200

**Edge Cases:**
- Pickup spawns off-screen → should still be collectable if player moves there
- Multiple pickups on screen simultaneously → each works independently
- Player at full HP picks up drop → no change (not wasted; just no effect)

---

## FUEL-1: Fuel System

**Sprint:** 5b | **Domain:** FUEL | **Dependencies:** GameLoop, GameState

**Description:**
The fuel tank represents nave durability across levels of a phase. It drains progressively. Fuel collectibles spawn from asteroids at level 5+. Tank empty → game over.

**Details:**
- Tank starts full at beginning of each phase
- Drains at configurable rate per level
- Without collecting: tank lasts through level 9 (game over at level 9 if not collected)
- Collecting fuel → restores tank to full
- Fuel bar in HUD (horizontal, below HP bar)

**Acceptance Criteria:**
- [ ] Fuel bar starts full at each phase start
- [ ] Fuel drains visibly during gameplay
- [ ] Fuel reaching 0 triggers game over (status = 'fuelEmpty')
- [ ] Fuel collectible appears in asteroids/enemies at level 5+
- [ ] Collecting fuel restores tank to 100%
- [ ] Fuel bar displays current integer percentage

**Test Cases:**
- Fuel starts at 100% each phase
- Fuel never goes below 0 (clamp)
- Fuel = 0 → GameStatus = 'fuelEmpty' → same game over flow as hp = 0
- Fuel collectible collected → fuel = 100%
- No fuel collectible appears in levels 1–4
- Fuel collectible can appear in levels 5–10

**Edge Cases:**
- Player collects fuel when already at 100% → stays at 100%
- Two fuel collectibles on screen at same time → each restores independently
- Phase ends (all enemies dead) with fuel = 1% → no game over (fuel only matters during play)

---

## XP-1: XP System

**Sprint:** 5b | **Domain:** GL | **Dependencies:** GameLoop, GameState, CARD-1

**Description:**
Killing enemies grants XP. When XP fills the bar, the player levels up and the card selection screen is triggered. XP resets to 0 at each phase start.

**Details:**
- Each enemy type has a configurable xpValue
- XP bar fills based on xp/xpToNext ratio
- Level-up → playerLevel++ → card screen triggered → game pauses
- xpToNext calibrated so ~1 level-up per level (10 per phase) in Planet 1
- Planet 2+: calibrated to +2 more level-ups per phase
- Level 10 boss kill does NOT trigger card screen (phase ends immediately)
- XP carries within a phase across waves; resets between phases

**Acceptance Criteria:**
- [ ] Enemy kill increments player.xp by enemy's xpValue
- [ ] When xp >= xpToNext: playerLevel++, xp resets to 0 (or carries over), card screen triggers
- [ ] Card screen pauses game loop
- [ ] After card picked, game resumes
- [ ] Boss kill at level 10 does not trigger card screen
- [ ] XP = 0 at start of each phase

**Test Cases:**
- Basic enemy kill: xp += 1 (default xpValue)
- Strong enemy kill: xp += 3
- Boss kill: xp += 10
- xp accumulates correctly across multiple kills
- Reaching xpToNext triggers level-up exactly once
- Killing boss at level 10 → no card screen, phase ends

**Edge Cases:**
- Rapid kills pushing xp well past xpToNext → only one level-up per threshold crossing
- xpToNext = 0 (misconfiguration) → no level-up ever (prevent division by zero)
- Player dies mid-card selection → card screen dismissed, death processed

---

## HUD-1: Updated HUD

**Sprint:** 5b | **Domain:** HUD | **Dependencies:** HP-1, FUEL-1, XP-1

**Description:**
Replace the heart icons with 3 horizontal stacked bars in the top-left: HP (largest), FUEL (same size), XP (thinner). Each bar shows its current integer value. Score remains top-right.

**Details:**
- HP bar: full width of left panel, color red/green
- FUEL bar: same width as HP, color orange/yellow
- XP bar: same width but visually thinner, color blue/purple
- All bars show current integer value next to them
- Score top-right (unchanged from Sprint 5a)
- Positioning to be tested: evaluate HP above player vs top-left

**Acceptance Criteria:**
- [ ] HP, FUEL, XP bars visible in top-left HUD area
- [ ] Each bar correctly reflects game state values
- [ ] Each bar shows current integer value as text
- [ ] XP bar is visually thinner than HP and FUEL bars
- [ ] Score still visible top-right
- [ ] Heart icons completely removed
- [ ] Bars are `pointerEvents="none"` (don't block touch)

**Test Cases:**
- Render with hp=500, maxHp=500 → HP bar is full
- Render with hp=250, maxHp=500 → HP bar is 50% filled
- Render with fuel=0 → FUEL bar is empty
- Render with xp=0, xpToNext=100 → XP bar is empty
- All three bars display correct integer values

**Edge Cases:**
- hp = 0 → bar is empty, value shows "0"
- Very long integer values (1000+ HP) don't overflow bar label

---

## ENEMY-1: Asteroids

**Sprint:** 6 | **Domain:** ENEMY | **Dependencies:** HP-2, FUEL-1, EntityRegistry

**Description:**
Asteroids are destructible terrain obstacles. They scroll with the map, can damage the player on collision, and drop HP or fuel pickups when destroyed.

**Details:**
- Move from top to bottom at configurable speed
- Player bullet destroys asteroid → drop roll for HP or fuel
- Player collision with asteroid → HP damage (same as enemy bullet)
- Fuel drops only appear at level 5+ of a phase
- Frequency configurable in calibrator per level
- Not hostile (don't shoot)

**Acceptance Criteria:**
- [ ] Asteroid entity scrolls downward
- [ ] Player bullet collision destroys asteroid and triggers drop roll
- [ ] Player collision with asteroid reduces player HP
- [ ] Asteroid can drop HP pickup (any level)
- [ ] Asteroid can drop fuel pickup (level 5+ only)
- [ ] Asteroid not present at levels before configured threshold

**Test Cases:**
- Asteroid at level 3: can drop HP pickup, cannot drop fuel
- Asteroid at level 6: can drop HP or fuel pickup
- Player bullet hits asteroid → asteroid removed from state
- Player ship overlaps asteroid → hp reduced by asteroid.damage
- Drop probability 0 → no drops ever

**Edge Cases:**
- Multiple bullets hit same asteroid simultaneously → only one drop
- Asteroid reaches bottom of screen without being shot → disappears, no drop

---

## ENEMY-2: Fast Enemy

**Sprint:** 6 | **Domain:** ENEMY | **Dependencies:** EntityRegistry

**Description:**
Fast enemy type: high movement speed, low HP, burst fire pattern. Registered as 'fast-enemy' entity. Rewards more XP than basic enemy.

**Details:**
- Speed: ~2× basic enemy speed
- HP: ~50% of basic enemy HP
- Fire pattern: burst (2–3 shots rapid)
- xpValue: 2 (vs 1 for basic)
- Behavior: erratic horizontal movement

**Acceptance Criteria:**
- [ ] Fast enemy registered in EntityRegistry
- [ ] Moves faster than basic enemy
- [ ] Dies in fewer hits than basic enemy
- [ ] Fires burst pattern
- [ ] Awards 2 XP on kill
- [ ] Has corresponding Boss type (Boss-2)

**Test Cases:**
- Fast enemy speed > basic enemy speed
- Fast enemy maxHp < basic enemy maxHp
- One bullet kill if bullet.damage >= fastEnemy.hp
- Burst fire: 2–3 bullets fired in rapid succession
- XP += 2 on death

**Edge Cases:**
- Fast enemy reaches bottom of screen → behaves same as basic (damages player if in path)

---

## ENEMY-3: Strong Enemy

**Sprint:** 6 | **Domain:** ENEMY | **Dependencies:** EntityRegistry

**Description:**
Strong enemy type: low speed, high HP (multi-hit), heavy shot. Registered as 'strong-enemy'. Rewards most XP of non-boss enemies.

**Details:**
- Speed: ~50% of basic enemy speed
- HP: ~3× basic enemy HP (requires multiple hits)
- Fire pattern: single heavy shot with high damage
- xpValue: 3
- Visual: larger hitbox

**Acceptance Criteria:**
- [ ] Strong enemy registered in EntityRegistry
- [ ] Moves slower than basic enemy
- [ ] Requires multiple player bullets to destroy
- [ ] Fires heavy single shot with higher damage
- [ ] Awards 3 XP on kill
- [ ] Has corresponding Boss type (Boss-3)

**Test Cases:**
- Strong enemy requires ≥ 3 hits with standard bullet
- Movement speed < basic enemy speed
- Heavy shot damage > basic enemy bullet damage
- XP += 3 on death

**Edge Cases:**
- Strong enemy with 1 HP remaining → next hit kills it correctly

---

## GL-2: Wave System

**Sprint:** 6 | **Domain:** GL | **Dependencies:** LevelEngine, EntityRegistry

**Description:**
Each level has an ordered list of waves. All enemies in a wave must be killed before the next wave spawns. Level completes only when all waves are cleared.

**Details:**
- `LevelDefinition.waves: Wave[]` — ordered list
- Each wave has a spawn pattern and enemy composition
- Wave advances when wave.enemies.every(e => !e.alive)
- Level complete when all waves complete
- Wave patterns: line, V, diamond, flanks, spiral (defined in calibrator)

**Acceptance Criteria:**
- [ ] Level spawns waves in order
- [ ] Wave 2 does not spawn until all enemies in wave 1 are dead
- [ ] Level only completes when last wave is cleared
- [ ] Wave patterns render enemies in correct formation
- [ ] Pattern type configurable per wave in level definition

**Test Cases:**
- 2-wave level: wave 2 enemies not present until wave 1 cleared
- Single-wave level: level completes when that wave is cleared
- Empty wave list: level completes immediately (edge case guard)
- Pattern 'V': enemies spawn in V formation at top

**Edge Cases:**
- Enemy bullet still in flight when last wave clears → bullet continues, level still ends
- Wave with 0 enemies → skip to next wave immediately

---

## CARD-1: Card Selection Screen

**Sprint:** 7 | **Domain:** CARD | **Dependencies:** XP-1, GameLoop

**Description:**
On player level-up, the game pauses and shows 3 random cards from the planet's deck. Player picks 1. Effect is applied immediately. Cards accumulate throughout the run.

**Details:**
- Game loop paused on level-up
- 3 cards drawn from deck using weighted random
- Cards already held have their weight reduced (diminishing returns)
- Level 5 of each phase: at least 1 life/HP card guaranteed in the 3 options
- Level 10 boss kill: no card screen
- Cards lost on death/run end

**Acceptance Criteria:**
- [ ] Level-up pauses game and shows 3 card options
- [ ] Player taps a card → effect applied → game resumes
- [ ] Cards accumulate in activeCards[]
- [ ] Held cards have lower draw probability
- [ ] Level 5 always includes ≥1 HP/life option
- [ ] Boss kill at level 10 does not trigger card screen
- [ ] All cards cleared at phase/run end

**Test Cases:**
- Level-up triggers: GameStatus changes to 'card_selection'
- Card selection: GameStatus returns to 'playing'
- Holding 2× Vampire cards: Vampire weight reduced for 3rd draw
- Level 5 draw: at least one HP card in options
- Boss kill: status goes to phase_complete, not card_selection

**Edge Cases:**
- Deck has fewer than 3 unique eligible cards → show all available (< 3)
- Player taps outside card options → no action (must tap a card)
- Game goes to background during card selection → state preserved

---

## CARD-2: Card Deck MVP

**Sprint:** 7 | **Domain:** CARD | **Dependencies:** CARD-1

**Description:**
14 cards for Planet 1 deck covering all categories: combat, defense, speed, specials, passives, and life.

**Details — 14 cards:**

| # | Name | Category | Effect | Stackable |
|---|------|----------|--------|-----------|
| 1 | Disparo Duplo | Tiro | +1 extra bullet per shot | Yes (max 3 stacks) |
| 2 | Tiro Traseiro | Tiro | Adds 1 bullet firing backward | Yes (1 stack) |
| 3 | Ricochete | Tiro | Bullets bounce off walls 1× | Yes |
| 4 | Míssil Teleguiado | Tiro | 1 homing missile per auto-fire cycle | Yes |
| 5 | Velocidade+ | Velocidade | +20% player movement speed | Yes (max 3) |
| 6 | Bala Rápida | Velocidade | +30% bullet speed | Yes |
| 7 | Escudo | Defesa | Absorbs 1 hit then breaks | No |
| 8 | Invencibilidade+ | Defesa | +500ms invincibility after hit | Yes |
| 9 | Bomba | Especial | Clears all enemies on screen once | No |
| 10 | Raio | Especial | Piercing beam traverses all enemies | No |
| 11 | Vampiro | Passivo | Kills restore 2% maxHp | Yes (stacks additively) |
| 12 | Gold Rush | Passivo | Each kill grants +5 gold | Yes |
| 13 | Restaurar HP | Vida | Restores 30% maxHp immediately | No |
| 14 | HP Máximo+ | Vida | +50 HP max for this run | Yes |

**Acceptance Criteria:**
- [ ] All 14 cards defined in card registry
- [ ] Each card's effect correctly modifies GameState or PlayerStats
- [ ] Stackable cards apply effect multiple times
- [ ] Non-stackable cards cannot be drawn again once held
- [ ] Instant-effect cards (Bomba, Restaurar HP) apply immediately, not held

**Test Cases (per card):**
- Disparo Duplo ×1: player fires 2 bullets per cycle
- Disparo Duplo ×3 (max): player fires 4 bullets per cycle
- Tiro Traseiro: 1 bullet fires in opposite direction
- Ricochete: bullet changes direction on wall contact
- Míssil: homing bullet tracks nearest enemy
- Velocidade+ ×1: speed × 1.2
- Bala Rápida: bullet.speed × 1.3
- Escudo: next hit deals 0 damage, shield removed
- Invencibilidade+ ×1: invincibilityDuration + 500ms
- Bomba: all alive enemies set to alive=false immediately
- Raio: single beam, all enemies in path take damage
- Vampiro ×1: kill → hp += maxHp × 0.02
- Gold Rush: kill → gold += 5
- Restaurar HP: hp = min(hp + maxHp × 0.3, maxHp)
- HP Máximo+: maxHp += 50 (hp also increases by 50)

**Edge Cases:**
- Bomba with no enemies alive → no effect, no error
- Vampiro heal at full HP → capped at maxHp
- Shield + invincibility active simultaneously → both work independently

---

## PARA-1: Parallax Scrolling

**Sprint:** 8 | **Domain:** PARA | **Dependencies:** IRenderer, SkiaRenderer, CanvasRenderer

**Description:**
Multi-layer background that scrolls at different speeds to create depth illusion. Configurable per planet. Boss level pauses the parallax.

**Details:**
- IRenderer gains `drawScrollingBackground(layers: ParallaxLayer[])`
- Both SkiaRenderer and CanvasRenderer implement it
- Each layer: image/color, scroll speed multiplier, current offsetY
- Layer speeds: slowest (background stars) → fastest (debris)
- Boss level entry: parallax pauses; boss death → resumes

**Acceptance Criteria:**
- [ ] Background layers scroll at different speeds
- [ ] Layer count configurable (1–N) per planet
- [ ] Faster layers appear closer to player (depth illusion)
- [ ] Boss level pauses scrolling on entry
- [ ] Parallax resumes after boss death
- [ ] Both renderers behave identically

**Test Cases:**
- 3-layer parallax: layer 0 speed < layer 1 speed < layer 2 speed
- Planet with 1 layer: single scrolling background
- GameLoop enters boss level → scrollOffset stops updating
- Boss dies → scrollOffset resumes updating

**Edge Cases:**
- Planet with 0 parallax layers → black background, no error
- ScrollOffset wraps correctly for seamless loop

---

## GL-1: 2D Free Movement

**Sprint:** 8 | **Domain:** GL | **Dependencies:** GameLoop, GameScreen

**Description:**
Joystick controls both X and Y axes. Player moves freely in 2D. Speed is higher than original.

**Details:**
- Currently: only `dx` (horizontal) used from joystick
- New: `dy` (vertical) also applied
- Speed constant increased
- Bounds: player stays within canvas on both axes

**Acceptance Criteria:**
- [ ] Joystick vertical drag moves player up/down
- [ ] Joystick horizontal drag moves player left/right
- [ ] Player cannot leave canvas boundaries (X or Y)
- [ ] Diagonal movement works (both axes simultaneously)
- [ ] Speed feels faster than Sprint 5a

**Test Cases:**
- dy < -DEADZONE → loop.moveUp(delta) called
- dy > DEADZONE → loop.moveDown(delta) called
- Player at y=0 attempting moveUp → position unchanged
- Player at y=CANVAS_HEIGHT-ENTITY_SIZE attempting moveDown → unchanged

**Edge Cases:**
- Joystick at exact boundary of deadzone → no movement

---

## PLANET-1: Planet/Phase/Level Structure

**Sprint:** 9 | **Domain:** PLANET | **Dependencies:** LevelEngine, Firestore

**Description:**
Full planet/phase/level progression. 1 planet MVP, 10 phases, 10 levels each. Phase unlocks sequentially. Checkpoint at exact level where player died.

**Acceptance Criteria:**
- [ ] LevelRequest accepts planetIndex, phaseIndex, levelIndex
- [ ] Phase N+1 locked until phase N level 10 is cleared
- [ ] Checkpoint: on death, save {planet, phase, level} to Firestore
- [ ] On continue: load from checkpoint (same level, not same phase)
- [ ] Completed phases can be replayed (gold = 20% of first-clear value)

**Test Cases:**
- New player: phase 1 level 1 unlocked, all others locked
- Clear phase 1 level 10: phase 2 level 1 becomes available
- Die at phase 3 level 7: checkpoint = {phase: 3, level: 7}
- Replay phase 1: gold reward = 20% of original
- Clear all 10 phases of planet 1: planet complete

**Edge Cases:**
- Player clears phase 10 level 10 → planet complete → hub shows completion state

---

## PLANET-2: Planet Hub Screen

**Sprint:** 9 | **Domain:** PLANET | **Dependencies:** PLANET-1

**Description:**
Hub screen showing the planet name, theme art, and a phase progress grid (10×10 levels). Player can tap any unlocked phase to start.

**Acceptance Criteria:**
- [ ] Shows planet name and background art
- [ ] 10×10 grid shows completion state per level
- [ ] Completed levels visually distinct from locked/incomplete
- [ ] Boss levels (phase 5/10 level 10) visually distinct
- [ ] Tapping unlocked level → start run at that level
- [ ] Progress % shown (e.g. "42/100 levels")

**Test Cases:**
- Planet with 0 levels cleared: all locked except phase 1 level 1
- Phase 3 fully cleared: all 10 cells in phase 3 marked complete
- Boss level cell styled differently from regular level cell

**Edge Cases:**
- Player taps locked level → no action (or locked indicator feedback)

---

## GL-3: Pause/Revive System

**Sprint:** 9 | **Domain:** GL | **Dependencies:** HP-1, MON-2, MON-3

**Description:**
Player death pauses the game and shows a revive screen. Player can revive once per run (ad or 50 diamonds). Second death → game over.

**Acceptance Criteria:**
- [ ] hp = 0 → game pauses → ReviveScreen shown
- [ ] ReviveScreen options: Watch Ad / 50 Diamonds / Give Up
- [ ] Revive restores 50% HP and resumes same level
- [ ] Only 1 revive allowed per run
- [ ] Second death skips revive screen → game over directly
- [ ] "Give Up" → game over screen

**Test Cases:**
- First death: ReviveScreen shown with all 3 options
- Watch Ad chosen: ad plays → hp = maxHp × 0.5 → game resumes
- 50 Diamonds chosen: diamonds -= 50 → hp = maxHp × 0.5 → game resumes
- Second death in same run: directly to game over (no revive option)
- Give Up chosen: game over, no revival

**Edge Cases:**
- Ad fails to load → "Watch Ad" button disabled or shows error
- Insufficient diamonds: "50 Diamonds" button disabled
- App backgrounded during ReviveScreen → state preserved on return

---

## BOSS-1: Basic Boss

**Sprint:** 10 | **Domain:** BOSS | **Dependencies:** GL-2, BossConfig, INV-4

**Description:**
Standard boss appears at phase 5 level 10 and phase 10 level 5. Multi-phase behavior as HP decreases. Chest drops immediately on death.

**Acceptance Criteria:**
- [ ] Boss spawns at correct level positions (phase 5/L10, phase 10/L5)
- [ ] Boss has HP bar visible in HUD
- [ ] Boss behavior changes at HP thresholds (e.g. 75%, 50%, 25%)
- [ ] Parallax pauses on boss arena entry
- [ ] Boss death → chest drops → phase complete
- [ ] difficultyScore (0–100) configurable in calibrator

**Test Cases:**
- Phase 5 level 10: boss spawns, regular enemy does not
- Boss HP bar decreases correctly with each hit
- Boss at 75% HP: enters phase 2 behavior
- Boss at 0 HP: chest drops, no card screen, phase ends

**Edge Cases:**
- Boss killed in single hit (very high damage card) → chest still drops
- Player dies during boss fight → revive screen (boss HP state preserved)

---

## BOSS-2: Fast Boss

**Sprint:** 10 | **Domain:** BOSS | **Dependencies:** BOSS-1

**Description:**
High-speed boss corresponding to the fast enemy type. Fast movement, burst fire patterns.

**Acceptance Criteria:**
- [ ] Moves faster than basic boss
- [ ] Fires burst shot patterns
- [ ] Higher XP reward than basic boss
- [ ] Configurable as boss type in calibrator

**Test Cases:**
- Fast boss speed > basic boss speed
- Burst fire: 3+ bullets fired in rapid succession per cycle

---

## BOSS-3: Strong Boss

**Sprint:** 10 | **Domain:** BOSS | **Dependencies:** BOSS-1

**Description:**
High-HP boss corresponding to the strong enemy type. Very high HP, slow, heavy damage.

**Acceptance Criteria:**
- [ ] Significantly more HP than basic boss
- [ ] Moves slower than basic boss
- [ ] Single shot with high damage value
- [ ] Requires sustained combat to defeat

**Test Cases:**
- Strong boss HP > basic boss HP × 2
- Heavy shot damage > basic boss bullet damage × 1.5

---

## BOSS-4: Dual Boss

**Sprint:** 10 | **Domain:** BOSS | **Dependencies:** BOSS-1

**Description:**
Two simultaneous bosses at phase 10 level 10. Same type by default, configurable to different types. Both must die to complete level.

**Acceptance Criteria:**
- [ ] Two boss entities spawn simultaneously
- [ ] Both bosses functional independently (HP, fire, movement)
- [ ] Level completes only when both are dead
- [ ] Each boss drops its own chest
- [ ] Type configurable per boss slot in calibrator

**Test Cases:**
- Both bosses active simultaneously: independent HP bars
- Boss A killed, Boss B alive: level not complete
- Both bosses killed: level complete, 2 chests drop

**Edge Cases:**
- Player dies when one boss is dead, one alive → revive with correct boss state preserved

---

## META-1: Permanent Upgrades

**Sprint:** 11 | **Domain:** META | **Dependencies:** DB-1, PlayerStats

**Description:**
8 permanent upgrades, 10 levels each. Bought with gold. L1–5 available from start; L6–10 locked until planet progression.

**Details — Upgrade costs:**
- L1: 200 | L2: 400 | L3: 800 | L4: 1.600 | L5: 3.200
- L6–10: locked, unlocked per planet, +50% curve

**Details — 8 upgrades:**

| # | Name | Effect per level |
|---|------|-----------------|
| 1 | HP Máximo | +50 HP base |
| 2 | Velocidade | +5% movement speed |
| 3 | Dano Base | +5% bullet damage |
| 4 | Velocidade de Tiro | +8% fire rate |
| 5 | Tanque de Combustível | +10% fuel capacity |
| 6 | Inteligência | +10% XP per kill |
| 7 | Chance de Crítico | +3% critical hit chance |
| 8 | Esquiva Base | +2% dodge chance |

**Acceptance Criteria:**
- [ ] All 8 upgrades visible in Hangar
- [ ] Correct cost shown per current level
- [ ] Purchase deducts gold, increments upgrade level
- [ ] Cannot purchase if insufficient gold
- [ ] L6–10 show as locked with unlock requirement
- [ ] Stats applied to PlayerStats at run start

**Test Cases:**
- Gold = 200, upgrade at L0: purchase succeeds, gold = 0, upgrade = L1
- Gold = 100, upgrade costs 200: purchase fails, gold unchanged
- Upgrade at L5: L6 shows as locked
- HP Máximo L1 purchased: run starts with maxHp = 550 (not 500)

**Edge Cases:**
- Concurrent purchase attempt (double-tap) → only one charge
- Gold deducted but save fails → rollback and retry

---

## INV-1: Equipment System

**Sprint:** 11 | **Domain:** INV | **Dependencies:** DB-1, INV-4

**Description:**
2 equipment slots (Cannon + Armor). 5 rarities. Equipped items apply passive stats and abilities to the player.

**Details:**
- Slot 1 — Cannon: Canhão / Laser / Metralhadora
- Slot 2 — Armor: Casco Leve / Casco Pesado
- Drop rates: Comum 64.9% / Incomum 25% / Raro 8% / Épico 2% / Lendário 0.1%
- Abilities unlock at Incomum+

**Acceptance Criteria:**
- [ ] 2 slots shown in Hangar with equipped items
- [ ] Each item type has defined base behavior
- [ ] Equipping an item replaces previous slot item
- [ ] Stats and abilities apply at run start
- [ ] Item rarity visually indicated (color coding)

**Test Cases:**
- Equip Canhão: player fires single powerful shots
- Equip Laser: player fires continuous beam
- Equip Metralhadora: player fires rapid low-damage bursts
- Rarity Incomum item: ability triggered at configured %
- Unequip item → slot empty → base behavior applied

**Edge Cases:**
- No item equipped → slot uses default base stats
- Item ability triggers simultaneously with card effect → both apply

---

## INV-2: Merge System

**Sprint:** 11 | **Domain:** INV | **Dependencies:** INV-1, INV-3

**Description:**
3 items of same type and rarity merge into 1 item of next rarity. Costs gold (configurable).

**Acceptance Criteria:**
- [ ] Selecting 3 matching items shows merge option
- [ ] Confirm merge: 3 items removed, 1 next-rarity item added
- [ ] Merge costs gold (deducted on confirm)
- [ ] Cannot merge if < 3 matching items
- [ ] Lendário items cannot be merged further

**Test Cases:**
- 3 Canhão Comum → 1 Canhão Incomum
- 3 Canhão Lendário → merge option not available
- Gold insufficient for merge → merge button disabled

**Edge Cases:**
- Mid-merge app crash → items not consumed, no new item (atomic operation)

---

## INV-4: Reward Chests

**Sprint:** 11 | **Domain:** INV | **Dependencies:** INV-1, BOSS-1

**Description:**
Phase completion drops 1 guaranteed chest. Boss death drops 1 chest with higher rarity weight. Chest animation → item revealed.

**Acceptance Criteria:**
- [ ] Phase complete → chest animation plays → 1 item added to inventory
- [ ] Boss death → chest drops immediately with Raro+ weight
- [ ] Item rarity follows configured drop rates (with difficulty bonus)
- [ ] Item added to inventory and visible in Hangar

**Test Cases:**
- Complete phase 1: chest drops with standard Comum-weighted rates
- Boss defeated: chest drops with Raro+ rate boost
- Item from chest appears in inventory

**Edge Cases:**
- Inventory full (if max size defined) → oldest Comum item auto-discarded with warning

---

## AUTH-1: Firebase Anonymous Auth

**Sprint:** 12 | **Domain:** AUTH | **Dependencies:** Firebase SDK

**Description:**
Auto login with Firebase anonymous auth on first launch. UID persists across sessions. No user interaction required.

**Acceptance Criteria:**
- [ ] App opens → anonymous auth completes silently
- [ ] UID persists across app restarts
- [ ] Auth failure shows retry option (not crash)
- [ ] FreeMonetization + NullAnalytics used in test mode

**Test Cases:**
- Fresh install: new UID generated
- App restart: same UID loaded
- Offline launch: last UID used, sync queued

---

## DB-1: Firebase Firestore

**Sprint:** 12 | **Domain:** DB | **Dependencies:** AUTH-1

**Description:**
Player data (gold, diamonds, upgrades, inventory, progress) persisted offline-first using Firestore.

**Acceptance Criteria:**
- [ ] All player data reads from local Firestore cache
- [ ] Writes happen locally first, sync when online
- [ ] Data survives app kill and restart
- [ ] Schema: uid, gold, diamonds, energy, upgrades{}, inventory[], progress{}

**Test Cases:**
- Buy upgrade: gold deducted and persisted after app restart
- Offline purchase: local state updated, sync on reconnect
- Corrupted cache: fallback to server state

---

## MON-1: Energy System

**Sprint:** 14 | **Domain:** MON | **Dependencies:** DB-1

**Description:**
Energy gates runs. Max 150, costs 10 per run, recharges 1/minute passively. Runs blocked when energy = 0.

**Acceptance Criteria:**
- [ ] Energy displayed in home screen
- [ ] Starting a run deducts 10 energy
- [ ] Energy = 0 → "No Energy" screen blocks run start
- [ ] Energy recharges 1/min passively (background timer)
- [ ] Energy cannot exceed 150
- [ ] Energy state persisted in Firestore

**Test Cases:**
- energy = 150, start run: energy = 140
- energy = 0, attempt run: blocked
- Energy recharge: 30 min offline → +30 energy on return
- Energy = 145, 10 minutes pass: energy = 150 (capped, not 155)

**Edge Cases:**
- Time manipulation (device clock changed): use server timestamp for recharge
- App offline → energy still recharges based on elapsed time since last sync

---

## MON-2: AdMob Rewarded Ads

**Sprint:** 14 | **Domain:** MON | **Dependencies:** AUTH-1, DB-1

**Description:**
Rewarded ads for revive, energy, and diamonds. Max 10 ads/day, resets at local midnight.

**Acceptance Criteria:**
- [ ] Ad available: Watch Ad buttons active
- [ ] Ad watched: reward granted (revive/energy/diamonds)
- [ ] Daily counter increments on each ad watched
- [ ] Counter = 10: all Watch Ad buttons disabled until midnight
- [ ] Counter resets at midnight local time
- [ ] FreeMonetization replaces AdMob in dev/test

**Test Cases:**
- Watch revive ad: hp = maxHp × 0.5, revive count used
- Watch energy ad: energy += 10
- 10th ad watched: counter = 10, buttons disabled
- Midnight passes: counter = 0, buttons re-enabled

---

## ANA-1: Firebase Analytics

**Sprint:** 16 | **Domain:** ANA | **Dependencies:** AUTH-1

**Description:**
Core gameplay events tracked in Firebase Analytics. NullAnalytics in dev.

**Events to track:**

| Event | Properties |
|-------|-----------|
| level_start | planet, phase, level |
| level_complete | planet, phase, level, time_ms, cards_picked |
| level_fail | planet, phase, level, hp_remaining, cause |
| boss_defeated | boss_type, difficulty_percent, planet |
| card_picked | card_id, player_level, phase |
| equipment_merged | item_type, new_rarity |
| ad_watched | ad_type, daily_count |

**Acceptance Criteria:**
- [ ] All events fire at correct moments
- [ ] Event properties match schema
- [ ] NullAnalytics used in test environment (no real events fired)
- [ ] No events fired in tests

**Test Cases:**
- Level start: event fires with correct planet/phase/level
- Level complete: time_ms reflects actual elapsed time
- NullAnalytics: no events reach Firebase

---

## BONUS-1: Bonus Missions

**Sprint:** 17 | **Domain:** BONUS | **Dependencies:** DB-1, DB-4

**Description:**
Daily missions (gold reward) and weekly missions (chest when all complete). Pool fixed in Supabase, rotates on schedule.

**Acceptance Criteria:**
- [ ] Daily missions refresh at midnight local time
- [ ] Weekly missions refresh Monday midnight
- [ ] Completing a daily mission credits gold
- [ ] Completing all weekly missions grants 1 chest
- [ ] Mission pool configurable in Supabase

**Test Cases:**
- Daily mission completed: gold credited, mission marked done
- All 3 weekly missions done: chest drops to inventory
- Midnight passes: new daily missions loaded
- Monday midnight: new weekly missions loaded

**Edge Cases:**
- Player offline when missions reset: new missions load on next app open
- Mission completed offline: syncs on reconnect

---

## SURV-1: Survival Mode (Backlog)

**Sprint:** 18 (Backlog) | **Domain:** SURV

**Description:**
Infinite procedural mode. Phases chain seamlessly with no pause. Reuses Contratos phase layouts as building blocks. Difficulty scales with score/time.

> Full spec to be defined in a dedicated design session before implementation.

**High-level Acceptance Criteria:**
- [ ] Mode accessible from home screen
- [ ] Phases transition without pause
- [ ] Contratos phase layouts used as procedural building blocks
- [ ] Difficulty increases over time
- [ ] Run ends on player death (no revive in Survival)
- [ ] Score tracked and displayed

---

*Last updated: 2026-04-28*
